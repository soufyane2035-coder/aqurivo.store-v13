'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Check,
  ChevronDown,
  Copy,
  Globe,
  Leaf,
  RotateCcw,
  Search,
  TreePine,
  X,
  Zap,
} from 'lucide-react';
import { CarbonFootprintLogo } from './CarbonFootprintLogo';
import {
  CURRENCIES,
   formatCurrencyAmount,
  getCurrencyByCode,
} from '@/lib/globalCostOfLivingData';
import {
  fetchBrowserCatalogSnapshots,
  getBrowserViewedProducts,
} from '@/lib/viewedProductsStorage';
import styles from './CarbonFootprintCalculator.module.css';

export interface CarbonFootprintCalculatorProps {
  locale: 'ar' | 'en';
}

interface ViewedProductItem {
  id: string;
  slug: string;
  titleAr: string;
  titleEn: string;
  categoryAr?: string;
  categoryEn?: string;
  imageUrl?: string;
  priceAmount: number;
  currencyCode: string;
}

const VIEWED_PRODUCTS_STORAGE_KEY = 'aqurivo_viewed_products_v1';

const FALLBACK_CATALOG_PRODUCTS: ViewedProductItem[] = [
  {
    id: 'cat-1',
    slug: 'sony-wh-1000xm5-wireless-noise-canceling-headphones',
    titleAr: 'سماعة سوني WH-1000XM5 العازلة للضوضاء',
    titleEn: 'Sony WH-1000XM5 Wireless Noise-Canceling Headphones',
    categoryAr: 'صوتيات احترافية',
    categoryEn: 'Pro Audio',
    priceAmount: 348,
    currencyCode: 'USD',
  },
  {
    id: 'cat-2',
    slug: 'apple-macbook-air-m3-13-inch-laptop',
    titleAr: 'لابتوب آبل ماك بوك إير M3 شاشة 13 بوصة',
    titleEn: 'Apple MacBook Air M3 13-inch Laptop',
    categoryAr: 'حواسيب محمولة',
    categoryEn: 'Laptops',
    priceAmount: 1099,
    currencyCode: 'USD',
  },
  {
    id: 'cat-3',
    slug: 'keychron-q1-pro-wireless-custom-mechanical-keyboard',
    titleAr: 'لوحة مفاتيح ميكانيكية لاسلكية Keychron Q1 Pro',
    titleEn: 'Keychron Q1 Pro Wireless Mechanical Keyboard',
    categoryAr: 'معدات المكتب',
    categoryEn: 'Desk Setup',
    priceAmount: 199,
    currencyCode: 'USD',
  },
  {
    id: 'cat-4',
    slug: 'garmin-forerunner-265-gps-running-smartwatch',
    titleAr: 'ساعة غارمن Forerunner 265 الرياضية الذكية',
    titleEn: 'Garmin Forerunner 265 GPS Smartwatch',
    categoryAr: 'أجهزة قابلة للارتداء',
    categoryEn: 'Wearables',
    priceAmount: 449,
    currencyCode: 'USD',
  },
];

function normalizeSearchToken(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F]/g, '')
    .replace(/[^a-z0-9\u0621-\u064A\s]/g, ' ');
}

function isSubsequence(small: string, large: string): boolean {
  let i = 0;
  let j = 0;
  while (i < small.length && j < large.length) {
    if (small[i] === large[j]) i++;
    j++;
  }
  return i === small.length;
}

function boundedLevenshtein(a: string, b: string, maxDist = 2): number {
  if (Math.abs(a.length - b.length) > maxDist) return maxDist + 1;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => i);
  for (let j = 1; j <= b.length; j++) {
    let prev = dp[0];
    dp[0] = j;
    let minRow = dp[0];
    for (let i = 1; i <= a.length; i++) {
      const temp = dp[i];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i] = Math.min(dp[i] + 1, dp[i - 1] + 1, prev + cost);
      prev = temp;
      if (dp[i] < minRow) minRow = dp[i];
    }
    if (minRow > maxDist) return maxDist + 1;
  }
  return dp[a.length];
}

function scoreProductSearch(item: ViewedProductItem, rawQuery: string): number {
  const q = normalizeSearchToken(rawQuery);
  if (!q) return 1;
  const tokens = q.split(/\s+/).filter(Boolean);
  const haystack = normalizeSearchToken(
    `${item.titleAr} ${item.titleEn} ${item.categoryAr || ''} ${item.categoryEn || ''} ${item.slug}`
  );
  const hayWords = haystack.split(/\s+/).filter(Boolean);

  let totalScore = 0;
  for (const tok of tokens) {
    if (haystack.includes(tok)) {
      totalScore += 10;
      continue;
    }
    let matchedFuzzy = false;
    for (const hw of hayWords) {
      if (tok.length >= 3 && isSubsequence(tok, hw)) {
        totalScore += 5;
        matchedFuzzy = true;
        break;
      }
      if (tok.length >= 4 && boundedLevenshtein(tok, hw, 2) <= 2) {
        totalScore += 4;
        matchedFuzzy = true;
        break;
      }
    }
    if (!matchedFuzzy) return 0;
  }
  return totalScore;
}

type VehicleMode = 'petrol' | 'hybrid' | 'ev' | 'transit' | 'active';
type DietProfile = 'meat_heavy' | 'balanced' | 'plant_forward';

// Scientific emission factors (kg CO2e per km)
const VEHICLE_CO2_PER_KM: Record<VehicleMode, number> = {
  petrol: 0.192,
  hybrid: 0.108,
  ev: 0.052,
  transit: 0.048,
  active: 0,
};

// Baseline USD operating/fuel cost per km (converted dynamically to user's currency)
const VEHICLE_USD_PER_KM: Record<VehicleMode, number> = {
  petrol: 0.11,
  hybrid: 0.065,
  ev: 0.032,
  transit: 0.04,
  active: 0,
};

// Annual diet emissions (kg CO2e / year)
const DIET_ANNUAL_CO2_KG: Record<DietProfile, number> = {
  meat_heavy: 2550,
  balanced: 1720,
  plant_forward: 1050,
};

const SUSTAINABLE_TARGET_TONS = 2.0;
const GLOBAL_AVG_TONS = 4.7;
const KG_PER_MATURE_TREE = 22;

export function CarbonFootprintCalculator({
  locale,
}: CarbonFootprintCalculatorProps) {
  const isAr = locale === 'ar';

  // Currency State
  const [currencyCode, setCurrencyCode] = useState<string>('SAR');
  const [currencySearch, setCurrencySearch] = useState<string>('');
  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState<boolean>(false);
  const currencyDropdownRef = useRef<HTMLDivElement | null>(null);

  const activeCurrency = useMemo(
    () => getCurrencyByCode(currencyCode),
    [currencyCode]
  );

  // 4-Pillar Inputs (all numeric fields min="0" step="1")
  const [vehicleMode, setVehicleMode] = useState<VehicleMode>('petrol');
  const [dailyKm, setDailyKm] = useState<string>('32');
  const [shortFlights, setShortFlights] = useState<string>('2');
  const [medFlights, setMedFlights] = useState<string>('1');
  const [longFlights, setLongFlights] = useState<string>('0');
  const [monthlyKwh, setMonthlyKwh] = useState<string>('480');
  const [cleanEnergyPct, setCleanEnergyPct] = useState<string>('15');
  const [dietProfile, setDietProfile] = useState<DietProfile>('balanced');
  const [activePreset, setActivePreset] = useState<string>('commuter');

  // Interactive Eco-Savings Action Toggles
  const [selectedActions, setSelectedActions] = useState<Record<string, boolean>>({
    smartCommute: true,
    acAndLed: true,
    ecoDietShift: false,
    flightOptimize: false,
  });

  // Copy feedback
  const [copiedReport, setCopiedReport] = useState<boolean>(false);

  // Store Viewed Products & Search
  const [viewedProducts, setViewedProducts] = useState<ViewedProductItem[]>(
    FALLBACK_CATALOG_PRODUCTS
  );
  const [productSearchQuery, setProductSearchQuery] = useState<string>('');
  const ribbonRef = useRef<HTMLDivElement | null>(null);
  const [isDraggingRibbon, setIsDraggingRibbon] = useState<boolean>(false);
  const dragStartXRef = useRef<number>(0);
  const scrollLeftStartRef = useRef<number>(0);

  useEffect(() => {
    let active = true;

    const mapSnapshotToItem = (
      s: {
        id: string;
        slug: string;
        titleAr: string;
        titleEn: string;
        categorySlug?: string;
        imageUrl?: string;
        priceUsd: number;
      }
    ): ViewedProductItem => ({
      id: s.id || s.slug,
      slug: s.slug,
      titleAr: s.titleAr,
      titleEn: s.titleEn,
      categoryAr: s.categorySlug || 'منتجات المتجر',
      categoryEn: s.categorySlug || 'Store Pick',
      imageUrl: s.imageUrl,
      priceAmount: s.priceUsd,
      currencyCode: 'USD',
    });

    const localViewed = getBrowserViewedProducts();
    if (localViewed.length > 0) {
      setViewedProducts(localViewed.map(mapSnapshotToItem));
    }

    fetchBrowserCatalogSnapshots()
      .then((catalogSnaps) => {
        if (!active || catalogSnaps.length === 0) return;
        const map = new Map<string, ViewedProductItem>();
        for (const v of getBrowserViewedProducts()) {
          map.set(v.slug, mapSnapshotToItem(v));
        }
        for (const c of catalogSnaps) {
          if (!map.has(c.slug)) {
            map.set(c.slug, mapSnapshotToItem(c));
          }
        }
        const combined = Array.from(map.values());
        if (combined.length > 0) {
          setViewedProducts(combined);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (
        currencyDropdownRef.current &&
        !currencyDropdownRef.current.contains(e.target as Node)
      ) {
        setCurrencyDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const filteredCurrencies = useMemo(() => {
    const q = currencySearch.trim().toLowerCase();
    if (!q) return CURRENCIES;
    return CURRENCIES.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.nameAr.includes(q) ||
        c.nameEn.toLowerCase().includes(q)
    );
  }, [currencySearch]);

  const filteredProducts = useMemo(() => {
    if (!productSearchQuery.trim()) return viewedProducts;
    return viewedProducts
      .map((item) => ({
        item,
        score: scoreProductSearch(item, productSearchQuery),
      }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.item);
  }, [viewedProducts, productSearchQuery]);

  // Apply Lifestyle Preset
  const applyPreset = (presetKey: string) => {
    setActivePreset(presetKey);
    if (presetKey === 'remote_eco') {
      setVehicleMode('hybrid');
      setDailyKm('10');
      setShortFlights('1');
      setMedFlights('0');
      setLongFlights('0');
      setMonthlyKwh('310');
      setCleanEnergyPct('30');
      setDietProfile('plant_forward');
    } else if (presetKey === 'commuter') {
      setVehicleMode('petrol');
      setDailyKm('32');
      setShortFlights('2');
      setMedFlights('1');
      setLongFlights('0');
      setMonthlyKwh('480');
      setCleanEnergyPct('15');
      setDietProfile('balanced');
    } else if (presetKey === 'frequent_flyer') {
      setVehicleMode('petrol');
      setDailyKm('55');
      setShortFlights('5');
      setMedFlights('3');
      setLongFlights('2');
      setMonthlyKwh('820');
      setCleanEnergyPct('5');
      setDietProfile('meat_heavy');
    } else if (presetKey === 'zero') {
      setVehicleMode('active');
      setDailyKm('0');
      setShortFlights('0');
      setMedFlights('0');
      setLongFlights('0');
      setMonthlyKwh('0');
      setCleanEnergyPct('0');
      setDietProfile('plant_forward');
    }
  };

  // Core Calculations
  const calc = useMemo(() => {
    const km = Math.max(0, Number(dailyKm) || 0);
    const sFlights = Math.max(0, Number(shortFlights) || 0);
    const mFlights = Math.max(0, Number(medFlights) || 0);
    const lFlights = Math.max(0, Number(longFlights) || 0);
    const kwh = Math.max(0, Number(monthlyKwh) || 0);
    const cleanPct = Math.min(100, Math.max(0, Number(cleanEnergyPct) || 0));

    // 1. Mobility Emissions & Annual Cost
    const annualKm = km * 365;
    const mobilityCo2Kg = annualKm * VEHICLE_CO2_PER_KM[vehicleMode];
    const annualMobilityCostLocal =
      annualKm * VEHICLE_USD_PER_KM[vehicleMode] * activeCurrency.usdRate;

    // 2. Aviation Emissions (Short ~260kg, Medium ~680kg, Long ~1520kg round-trip/segment equivalent)
    const aviationCo2Kg = sFlights * 260 + mFlights * 680 + lFlights * 1520;
    const annualFlightHours = sFlights * 2 + mFlights * 4.5 + lFlights * 9;

    // 3. Home & Office Electricity Emissions & Cost
    // Grid emission factor ~0.46 kg CO2/kWh reduced by clean energy / efficiency share
    const effectiveGridFactor = 0.46 * (1 - cleanPct / 100);
    const annualKwh = kwh * 12;
    const energyCo2Kg = annualKwh * effectiveGridFactor;
    // Avg electricity tariff ~$0.095 USD/kWh converted to user's currency
    const annualEnergyCostLocal = annualKwh * 0.095 * activeCurrency.usdRate;

    // 4. Diet & Daily Consumption Emissions
    const dietCo2Kg =
      km === 0 && sFlights === 0 && mFlights === 0 && lFlights === 0 && kwh === 0
        ? 0
        : DIET_ANNUAL_CO2_KG[dietProfile];

    const totalCo2Kg = mobilityCo2Kg + aviationCo2Kg + energyCo2Kg + dietCo2Kg;
    const totalTons = totalCo2Kg / 1000;

    const safeTotal = totalCo2Kg > 0 ? totalCo2Kg : 1;
    const mobilityShare = (mobilityCo2Kg / safeTotal) * 100;
    const aviationShare = (aviationCo2Kg / safeTotal) * 100;
    const energyShare = (energyCo2Kg / safeTotal) * 100;
    const dietShare = (dietCo2Kg / safeTotal) * 100;

    // Mature trees needed
    const treesRequired = Math.ceil(totalCo2Kg / KG_PER_MATURE_TREE);

    // Benchmark Comparison
    const diffFromGlobalPct =
      GLOBAL_AVG_TONS > 0
        ? ((totalTons - GLOBAL_AVG_TONS) / GLOBAL_AVG_TONS) * 100
        : 0;

    // Gauge position (0 to 10 Tons scale)
    const gaugePct = Math.min(98, Math.max(2, (totalTons / 10) * 100));

    // Actionable Eco-Financial Recommendations
    const actionsList = [
      {
        id: 'smartCommute',
        titleAr: 'ترشيد مشاوير السيارة بنسبة 25% أو التحول الجزئي للنقل الذكي',
        titleEn: 'Cut Car Commutes by 25% or Hybrid/Carpool 2 Days/Wk',
        descAr:
          'دمج المشاوير اليومية أو العمل عن بُعد يومين أسبوعياً يختصر ربع استهلاك الوقود وصيانة المركبة.',
        descEn:
          'Batching errands or working remotely 2 days a week cuts fuel burn and vehicle wear by 25%.',
        co2SavedKg: Math.round(Math.max(180, mobilityCo2Kg * 0.25)),
        moneySavedLocal: Math.round(
          Math.max(120 * activeCurrency.usdRate, annualMobilityCostLocal * 0.25)
        ),
      },
      {
        id: 'acAndLed',
        titleAr: 'ضبط التكييف على 24°C والتحول لإضاءة وأجهزة موفرة للطاقة',
        titleEn: 'Set AC to 24°C & Upgrade to Smart Energy-Star Appliances',
        descAr:
          'رفع درجة التكييف درجتين فقط وفصل الأجهزة في وضع الاستعداد يخفض فاتورة الكهرباء بنسبة 22%.',
        descEn:
          'Raising thermostat by 2°C and eliminating vampire standby loads cuts electricity bills by 22%.',
        co2SavedKg: Math.round(Math.max(210, energyCo2Kg * 0.22)),
        moneySavedLocal: Math.round(
          Math.max(95 * activeCurrency.usdRate, annualEnergyCostLocal * 0.22)
        ),
      },
      {
        id: 'ecoDietShift',
        titleAr: 'موازنة النظام الغذائي وتقليل هدر الطعام المنزلي',
        titleEn: 'Shift 2 Meals/Week to Plant-Based & Cut Food Waste',
        descAr:
          'تخفيف الهدر الغذائي واستبدال وجبتين من اللحوم الحمراء أسبوعياً يوفر في ميزانية البقالة ويخفض الانبعاثات.',
        descEn:
          'Eliminating kitchen food waste and swapping 2 red-meat meals weekly lowers grocery spend and methane.',
        co2SavedKg: Math.round(Math.max(320, dietCo2Kg * 0.24)),
        moneySavedLocal: Math.round(310 * activeCurrency.usdRate),
      },
      {
        id: 'flightOptimize',
        titleAr: 'اختيار الرحلات المباشرة أو استبدال رحلة قصيرة باجتماع رقمي',
        titleEn: 'Fly Direct Routes or Replace 1 Short Flight with Virtual/Rail',
        descAr:
          'الإقلاع والهبوط يستهلكان النسبة الأكبر من وقود الطائرات؛ الرحلات المباشرة توفر الوقت والمال والكربون.',
        descEn:
          'Takeoff and climb burn the most jet fuel; choosing non-stop routes saves ticket cost and aviation CO₂.',
        co2SavedKg: Math.round(Math.max(260, aviationCo2Kg * 0.28)),
        moneySavedLocal: Math.round(280 * activeCurrency.usdRate),
      },
    ];

    const activeCo2SavedKg = actionsList.reduce(
      (acc, act) => (selectedActions[act.id] ? acc + act.co2SavedKg : acc),
      0
    );
    const activeMoneySavedLocal = actionsList.reduce(
      (acc, act) => (selectedActions[act.id] ? acc + act.moneySavedLocal : acc),
      0
    );

    const optimizedTons = Math.max(0, (totalCo2Kg - activeCo2SavedKg) / 1000);

    // Dominant sector
    const sectors = [
      {
        key: 'mobility',
        nameAr: 'التنقل اليومي والمركبة',
        nameEn: 'Daily Mobility & Vehicle',
        share: mobilityShare,
      },
      {
        key: 'aviation',
        nameAr: 'السفر الجوي',
        nameEn: 'Aviation & Flights',
        share: aviationShare,
      },
      {
        key: 'energy',
        nameAr: 'طاقة المنزل والكهرباء',
        nameEn: 'Home & Office Electricity',
        share: energyShare,
      },
      {
        key: 'diet',
        nameAr: 'الغذاء والاستهلاك اليومي',
        nameEn: 'Diet & Daily Consumption',
        share: dietShare,
      },
    ].sort((a, b) => b.share - a.share);

    return {
      mobilityCo2Kg,
      aviationCo2Kg,
      energyCo2Kg,
      dietCo2Kg,
      totalCo2Kg,
      totalTons,
      mobilityShare,
      aviationShare,
      energyShare,
      dietShare,
      treesRequired,
      diffFromGlobalPct,
      gaugePct,
      annualFlightHours,
      annualMobilityCostLocal,
      annualEnergyCostLocal,
      actionsList,
      activeCo2SavedKg,
      activeMoneySavedLocal,
      optimizedTons,
      dominantSector: sectors[0],
    };
  }, [
    dailyKm,
    vehicleMode,
    shortFlights,
    medFlights,
    longFlights,
    monthlyKwh,
    cleanEnergyPct,
    dietProfile,
    activeCurrency,
    selectedActions,
  ]);

  const toggleAction = (id: string) => {
    setSelectedActions((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleCopyReport = async () => {
    const lines = isAr
      ? [
          `🌱 تقرير البصمة الكربونية والوفر المالي — AQURIVO`,
          `• إجمالي البصمة السنوية: ${calc.totalTons.toFixed(2)} طن CO₂e (${Math.round(calc.totalCo2Kg).toLocaleString('en-US')} كجم)`,
          `• المقارنة العالمية: المتوسط العالمي 4.7 طن | الهدف المستدام 2.0 طن`,
          `• المعادل الطبيعي: تحتاج الطبيعة إلى ${calc.treesRequired} شجرة ناضجة سنوياً لامتصاص هذه الانبعاثات`,
          `• الوفر السنوي المتوقع عند تطبيق خطة الترشيد: ${formatCurrencyAmount(calc.activeMoneySavedLocal, activeCurrency, 'ar')} سنوياً + خفض ${calc.activeCo2SavedKg} كجم CO₂`,
        ]
      : [
          `🌱 AQURIVO Carbon Footprint & Eco-Savings Report`,
          `• Annual Carbon Footprint: ${calc.totalTons.toFixed(2)} Tons CO₂e (${Math.round(calc.totalCo2Kg).toLocaleString('en-US')} kg)`,
          `• Global Benchmark: 4.7t Global Avg | 2.0t Sustainable Target`,
          `• Nature Equivalence: Requires ${calc.treesRequired} mature trees/year to absorb`,
          `• Projected Annual Eco-Savings: ${formatCurrencyAmount(calc.activeMoneySavedLocal, activeCurrency, 'en')}/yr + ${calc.activeCo2SavedKg} kg CO₂ saved`,
        ];

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 2600);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <div className={styles.studioShell} dir={isAr ? 'rtl' : 'ltr'}>
      {/* 2. STUDIO COMMAND HEADER BAR */}
      <header className={styles.studioHeaderBar}>
        <CarbonFootprintLogo size="md" showWordmark locale={locale} />

        <div className={styles.headerControls}>
          {/* Lifestyle Presets */}
          <div className={styles.presetGroup} role="group">
            <button
              type="button"
              onClick={() => applyPreset('remote_eco')}
              className={`${styles.presetBtn} ${
                activePreset === 'remote_eco' ? styles.presetBtnActive : ''
              }`}
            >
              {isAr ? 'عمل عن بُعد وتنقل خفيف' : 'Remote & Low Commute'}
            </button>
            <button
              type="button"
              onClick={() => applyPreset('commuter')}
              className={`${styles.presetBtn} ${
                activePreset === 'commuter' ? styles.presetBtnActive : ''
              }`}
            >
              {isAr ? 'تنقل يومي وسفر متوسط' : 'Daily Car & Avg Travel'}
            </button>
            <button
              type="button"
              onClick={() => applyPreset('frequent_flyer')}
              className={`${styles.presetBtn} ${
                activePreset === 'frequent_flyer' ? styles.presetBtnActive : ''
              }`}
            >
              {isAr ? 'سفر جوي وطاقة مرتفعة' : 'Frequent Flyer & High AC'}
            </button>
            <button
              type="button"
              onClick={() => applyPreset('zero')}
              className={styles.resetBtn}
              title={isAr ? 'تصفير جميع الحقول' : 'Reset all fields to 0'}
            >
              <RotateCcw size={14} />
              <span>{isAr ? 'تصفير (0)' : 'Reset (0)'}</span>
            </button>
          </div>

          {/* Global Currency Selector */}
          <div className={styles.currencySelectorWrap} ref={currencyDropdownRef}>
            <button
              type="button"
              onClick={() => setCurrencyDropdownOpen((o) => !o)}
              className={styles.currencyTriggerBtn}
              aria-expanded={currencyDropdownOpen}
            >
              <Globe size={14} className={styles.currencyGlobeIcon} />
              <span className={styles.currencyCodeText}>
                {activeCurrency.code}
              </span>
              <span className={styles.currencyNameText}>
                {isAr ? activeCurrency.nameAr : activeCurrency.nameEn}
              </span>
              <ChevronDown size={14} />
            </button>

            {currencyDropdownOpen && (
              <div className={styles.currencyDropdownMenu}>
                <div className={styles.currencySearchWrap}>
                  <Search size={13} />
                  <input
                    type="text"
                    value={currencySearch}
                    onChange={(e) => setCurrencySearch(e.target.value)}
                    placeholder={
                      isAr ? 'ابحث عن العملة...' : 'Search currency...'
                    }
                    className={styles.currencySearchInput}
                  />
                </div>
                <div className={styles.currencyListScroll}>
                  {filteredCurrencies.map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => {
                        setCurrencyCode(c.code);
                        setCurrencyDropdownOpen(false);
                        setCurrencySearch('');
                      }}
                      className={`${styles.currencyOptionBtn} ${
                        c.code === currencyCode
                          ? styles.currencyOptionActive
                          : ''
                      }`}
                    >
                      <span className={styles.currencyOptionCode}>{c.code}</span>
                      <span className={styles.currencyOptionName}>
                        {isAr ? c.nameAr : c.nameEn}
                      </span>
                      <span className={styles.currencyOptionSymbol}>
                        {c.symbol}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 3. MAIN WORKBENCH: 4-PILLAR INPUT DECK + LIVE ANALYTICAL REPORT */}
      <div className={styles.workbenchGrid}>
        {/* LEFT COLUMN: 4-PILLAR INPUT DECK */}
        <section className={styles.inputDeckCard}>
          <div className={styles.deckHeader}>
            <div className={styles.deckHeaderTitleRow}>
              <Leaf size={18} className={styles.deckIconEmerald} />
              <h2 className={styles.deckTitle}>
                {isAr
                  ? 'قطاعات الحياة والطاقة الأربعة'
                  : '4-Pillar Lifestyle & Energy Deck'}
              </h2>
            </div>
            <p className={styles.deckSubtitle}>
              {isAr
                ? 'جميع الحقول تبدأ من 0 وتقبل الزيادة بـ 1 لحساب بصمتك الكربونية والوفر المالي بدقة.'
                : 'All inputs start at 0 with step 1 to compute your exact carbon footprint and annual savings.'}
            </p>
          </div>

          {/* PILLAR 1: DAILY MOBILITY & VEHICLE TYPE */}
          <div className={styles.pillarSection}>
            <div className={styles.pillarHeaderRow}>
              <span className={styles.pillarIndexBadge}>01</span>
              <h3 className={styles.pillarHeading}>
                {isAr
                  ? 'التنقل اليومي ونوع المركبة'
                  : 'Daily Mobility & Vehicle Type'}
              </h3>
              <span className={styles.pillarLiveTag}>
                {Math.round(calc.mobilityCo2Kg).toLocaleString('en-US')} kg CO₂/yr
              </span>
            </div>

            <div className={styles.vehicleModeGrid}>
              {(
                [
                  {
                    key: 'petrol',
                    labelAr: 'بنزين / ديزل',
                    labelEn: 'Petrol / Diesel',
                    subAr: '192 جم/كم',
                    subEn: '192g/km',
                  },
                  {
                    key: 'hybrid',
                    labelAr: 'سيارة هجينة Hybrid',
                    labelEn: 'Hybrid Car',
                    subAr: '108 جم/كم',
                    subEn: '108g/km',
                  },
                  {
                    key: 'ev',
                    labelAr: 'كهربائية EV',
                    labelEn: 'Electric EV',
                    subAr: '52 جم/كم',
                    subEn: '52g/km',
                  },
                  {
                    key: 'transit',
                    labelAr: 'مترو / حافلة',
                    labelEn: 'Metro / Bus',
                    subAr: '48 جم/كم',
                    subEn: '48g/km',
                  },
                  {
                    key: 'active',
                    labelAr: 'مشي / دراجة',
                    labelEn: 'Walk / Bike',
                    subAr: '0 جم/كم',
                    subEn: '0g/km',
                  },
                ] as const
              ).map((vm) => (
                <button
                  key={vm.key}
                  type="button"
                  onClick={() => {
                    setVehicleMode(vm.key);
                    setActivePreset('custom');
                  }}
                  className={`${styles.vehiclePill} ${
                    vehicleMode === vm.key ? styles.vehiclePillActive : ''
                  }`}
                >
                  <span className={styles.vehiclePillTitle}>
                    {isAr ? vm.labelAr : vm.labelEn}
                  </span>
                  <span className={styles.vehiclePillSub}>
                    {isAr ? vm.subAr : vm.subEn}
                  </span>
                </button>
              ))}
            </div>

            <div className={styles.fieldBlock}>
              <div className={styles.fieldLabelRow}>
                <label htmlFor="cf-daily-km" className={styles.fieldLabel}>
                  {isAr
                    ? 'المسافة اليومية المقطوعة ذهاباً وإياباً (كم / يوم)'
                    : 'Daily Round-Trip Distance (km / day)'}
                </label>
                <span className={styles.fieldHint}>
                  {isAr
                    ? `${(Math.max(0, Number(dailyKm) || 0) * 365).toLocaleString('en-US')} كم سنوياً`
                    : `${(Math.max(0, Number(dailyKm) || 0) * 365).toLocaleString('en-US')} km/yr`}
                </span>
              </div>
              <div className={styles.inputWithUnit}>
                <input
                  id="cf-daily-km"
                  type="number"
                  min="0"
                  step="1"
                  value={dailyKm}
                  onChange={(e) => {
                    setDailyKm(e.target.value);
                    setActivePreset('custom');
                  }}
                  className={styles.numInput}
                />
                <span className={styles.unitBadge}>{isAr ? 'كم/يوم' : 'km/day'}</span>
              </div>
            </div>
          </div>

          {/* PILLAR 2: ANNUAL AVIATION */}
          <div className={styles.pillarSection}>
            <div className={styles.pillarHeaderRow}>
              <span className={styles.pillarIndexBadge}>02</span>
              <h3 className={styles.pillarHeading}>
                {isAr
                  ? 'السفر الجوي السنوي (رحلات الطيران)'
                  : 'Annual Aviation & Flights'}
              </h3>
              <span className={styles.pillarLiveTagSky}>
                {Math.round(calc.aviationCo2Kg).toLocaleString('en-US')} kg CO₂/yr
              </span>
            </div>

            <div className={styles.flightsTripleGrid}>
              <div className={styles.fieldBlock}>
                <label htmlFor="cf-flight-short" className={styles.fieldLabel}>
                  {isAr ? 'رحلات قصيرة (<3 ساعات)' : 'Short Flights (<3h)'}
                </label>
                <input
                  id="cf-flight-short"
                  type="number"
                  min="0"
                  step="1"
                  value={shortFlights}
                  onChange={(e) => {
                    setShortFlights(e.target.value);
                    setActivePreset('custom');
                  }}
                  className={styles.numInput}
                />
              </div>

              <div className={styles.fieldBlock}>
                <label htmlFor="cf-flight-med" className={styles.fieldLabel}>
                  {isAr ? 'رحلات متوسطة (3–6 ساعات)' : 'Medium Flights (3–6h)'}
                </label>
                <input
                  id="cf-flight-med"
                  type="number"
                  min="0"
                  step="1"
                  value={medFlights}
                  onChange={(e) => {
                    setMedFlights(e.target.value);
                    setActivePreset('custom');
                  }}
                  className={styles.numInput}
                />
              </div>

              <div className={styles.fieldBlock}>
                <label htmlFor="cf-flight-long" className={styles.fieldLabel}>
                  {isAr ? 'رحلات طويلة (>6 ساعات)' : 'Long Flights (>6h)'}
                </label>
                <input
                  id="cf-flight-long"
                  type="number"
                  min="0"
                  step="1"
                  value={longFlights}
                  onChange={(e) => {
                    setLongFlights(e.target.value);
                    setActivePreset('custom');
                  }}
                  className={styles.numInput}
                />
              </div>
            </div>
          </div>

          {/* PILLAR 3: HOME & OFFICE ELECTRICITY */}
          <div className={styles.pillarSection}>
            <div className={styles.pillarHeaderRow}>
              <span className={styles.pillarIndexBadge}>03</span>
              <h3 className={styles.pillarHeading}>
                {isAr
                  ? 'طاقة المنزل والمكتب (الكهرباء والتكييف)'
                  : 'Home & Office Energy (Electricity & AC)'}
              </h3>
              <span className={styles.pillarLiveTagAmber}>
                {Math.round(calc.energyCo2Kg).toLocaleString('en-US')} kg CO₂/yr
              </span>
            </div>

            <div className={styles.twoColFields}>
              <div className={styles.fieldBlock}>
                <label htmlFor="cf-monthly-kwh" className={styles.fieldLabel}>
                  {isAr
                    ? 'استهلاك الكهرباء الشهري (kWh)'
                    : 'Monthly Electricity Usage (kWh)'}
                </label>
                <div className={styles.inputWithUnit}>
                  <input
                    id="cf-monthly-kwh"
                    type="number"
                    min="0"
                    step="1"
                    value={monthlyKwh}
                    onChange={(e) => {
                      setMonthlyKwh(e.target.value);
                      setActivePreset('custom');
                    }}
                    className={styles.numInput}
                  />
                  <span className={styles.unitBadge}>kWh</span>
                </div>
              </div>

              <div className={styles.fieldBlock}>
                <label htmlFor="cf-clean-pct" className={styles.fieldLabel}>
                  {isAr
                    ? 'نسبة الطاقة المتجددة أو ترشيد التكييف (%)'
                    : 'Clean Energy / AC Efficiency Share (%)'}
                </label>
                <div className={styles.inputWithUnit}>
                  <input
                    id="cf-clean-pct"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={cleanEnergyPct}
                    onChange={(e) => {
                      setCleanEnergyPct(e.target.value);
                      setActivePreset('custom');
                    }}
                    className={styles.numInput}
                  />
                  <span className={styles.unitBadge}>%</span>
                </div>
              </div>
            </div>
          </div>

          {/* PILLAR 4: DIET & DAILY CONSUMPTION */}
          <div className={styles.pillarSection}>
            <div className={styles.pillarHeaderRow}>
              <span className={styles.pillarIndexBadge}>04</span>
              <h3 className={styles.pillarHeading}>
                {isAr
                  ? 'نمط الغذاء والاستهلاك اليومي'
                  : 'Diet & Daily Consumption Profile'}
              </h3>
              <span className={styles.pillarLiveTag}>
                {Math.round(calc.dietCo2Kg).toLocaleString('en-US')} kg CO₂/yr
              </span>
            </div>

            <div className={styles.dietGrid}>
              {(
                [
                  {
                    key: 'meat_heavy',
                    titleAr: 'اعتماد مرتفع على اللحوم الحمراء',
                    titleEn: 'High Red-Meat Diet',
                    subAr: '~2.55 طن سنوياً',
                    subEn: '~2.55t CO₂/yr',
                  },
                  {
                    key: 'balanced',
                    titleAr: 'متوازن متوسط',
                    titleEn: 'Balanced Omnivore',
                    subAr: '~1.72 طن سنوياً',
                    subEn: '~1.72t CO₂/yr',
                  },
                  {
                    key: 'plant_forward',
                    titleAr: 'نباتي / خفيف البصمة',
                    titleEn: 'Plant-Forward / Low Carbon',
                    subAr: '~1.05 طن سنوياً',
                    subEn: '~1.05t CO₂/yr',
                  },
                ] as const
              ).map((d) => (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => {
                    setDietProfile(d.key);
                    setActivePreset('custom');
                  }}
                  className={`${styles.dietCardBtn} ${
                    dietProfile === d.key ? styles.dietCardBtnActive : ''
                  }`}
                >
                  <span className={styles.dietCardTitle}>
                    {isAr ? d.titleAr : d.titleEn}
                  </span>
                  <span className={styles.dietCardSub}>
                    {isAr ? d.subAr : d.subEn}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: LIVE ANALYTICAL REPORT */}
        <section className={styles.reportColumn}>
          {/* CARD 1: GLOBAL BENCHMARK HERO CARD */}
          <div className={styles.heroBenchmarkCard}>
            <div className={styles.heroCardTopRow}>
              <span className={styles.heroEyebrow}>
                {isAr
                  ? 'إجمالي بصمتك الكربونية السنوية'
                  : 'YOUR ANNUAL CARBON FOOTPRINT'}
              </span>
              <span
                className={
                  calc.totalTons <= SUSTAINABLE_TARGET_TONS
                    ? styles.statusBadgeSustainable
                    : calc.totalTons <= GLOBAL_AVG_TONS
                      ? styles.statusBadgeModerate
                      : styles.statusBadgeHigh
                }
              >
                {calc.totalTons <= SUSTAINABLE_TARGET_TONS
                  ? isAr
                    ? 'ضمن الهدف المناخي المستدام ✓'
                    : 'Within 2.0t Sustainable Target ✓'
                  : calc.totalTons <= GLOBAL_AVG_TONS
                    ? isAr
                      ? 'أقل من المتوسط العالمي (4.7 طن)'
                      : 'Below Global Average (4.7t)'
                    : isAr
                      ? 'أعلى من المتوسط العالمي — فرصة توفير كبيرة'
                      : 'Above Global Average — High Savings Potential'}
              </span>
            </div>

            <div className={styles.heroNumbersRow}>
              <div className={styles.heroPrimaryMetric}>
                <strong className={styles.heroTonsValue}>
                  {calc.totalTons.toFixed(2)}
                </strong>
                <span className={styles.heroTonsUnit}>
                  {isAr ? 'طن CO₂e / سنوياً' : 'Tons CO₂e / Year'}
                </span>
              </div>

              <div className={styles.heroSecondaryMetric}>
                <span className={styles.heroSecondaryLabel}>
                  {isAr ? 'بالكيلوغرام سنوياً' : 'In Kilograms / Year'}
                </span>
                <strong className={styles.heroSecondaryVal}>
                  {Math.round(calc.totalCo2Kg).toLocaleString('en-US')} kg CO₂
                </strong>
              </div>
            </div>

            {/* Eco Gauge Bar */}
            <div className={styles.ecoGaugeBlock}>
              <div className={styles.ecoGaugeTrack}>
                <div
                  className={styles.ecoGaugeMarker}
                  style={{ insetInlineStart: `${calc.gaugePct}%` }}
                />
              </div>
              <div className={styles.ecoGaugeLegend}>
                <span className={styles.legendTarget}>
                  {isAr
                    ? 'الهدف المستدام: 2.0 طن'
                    : 'Sustainable Target: 2.0t'}
                </span>
                <span className={styles.legendGlobal}>
                  {isAr ? 'المتوسط العالمي: 4.7 طن' : 'Global Average: 4.7t'}
                </span>
                <span className={styles.legendHigh}>
                  {isAr ? 'مرتفع: +8.0 طن' : 'High Impact: 8.0t+'}
                </span>
              </div>
            </div>

            <p className={styles.diagnosticCopy}>
              {isAr
                ? `المصدر الأكبر لبصمتك الكربونية حالياً هو [${
                    calc.dominantSector.nameAr
                  } بنسبة ${Math.round(
                    calc.dominantSector.share
                  )}%]. بتطبيق خطوات الترشيد المحددة بالأسفل ستخفض بصمتك إلى ${calc.optimizedTons.toFixed(
                    2
                  )} طن وتوفر ${formatCurrencyAmount(
                    calc.activeMoneySavedLocal,
                    activeCurrency,
                    'ar'
                  )} سنوياً.`
                : `Your primary emission driver is [${
                    calc.dominantSector.nameEn
                  } at ${Math.round(
                    calc.dominantSector.share
                  )}%]. Activating the selected habits below lowers your footprint to ${calc.optimizedTons.toFixed(
                    2
                  )}t and saves ${formatCurrencyAmount(
                    calc.activeMoneySavedLocal,
                    activeCurrency,
                    'en'
                  )} annually.`}
            </p>
          </div>

          {/* CARD 2: NATURE & TREE EQUIVALENCE + 4-SECTOR ANATOMY */}
          <div className={styles.natureCard}>
            <div className={styles.natureCardHeader}>
              <div className={styles.natureIconTitle}>
                <TreePine size={18} className={styles.deckIconEmerald} />
                <h3 className={styles.cardSectionTitle}>
                  {isAr
                    ? 'المعادل الطبيعي وتشريح القطاعات الأربعة'
                    : 'Nature Equivalence & 4-Sector Anatomy'}
                </h3>
              </div>
              <span className={styles.treeCountPill}>
                {isAr
                  ? `${calc.treesRequired.toLocaleString('en-US')} شجرة ناضجة / سنة`
                  : `${calc.treesRequired.toLocaleString('en-US')} Mature Trees / Yr`}
              </span>
            </div>

            <p className={styles.natureSubtext}>
              {isAr
                ? `تمتص الشجرة الناضجة الواحدة نحو 22 كجم من الكربون سنوياً؛ أي أن انبعاثاتك السنوية تحتاج إلى ${calc.treesRequired.toLocaleString(
                    'en-US'
                  )} شجرة لمعادلتها طبيعياً.`
                : `One mature tree absorbs ~22 kg of CO₂ annually. Offsetting your annual footprint requires ${calc.treesRequired.toLocaleString(
                    'en-US'
                  )} mature trees working year-round.`}
            </p>

            {/* 4-Sector Stacked Anatomy Bar */}
            <div className={styles.anatomyStackedBar}>
              <div
                className={styles.segMobility}
                style={{ width: `${Math.max(4, calc.mobilityShare)}%` }}
                title={isAr ? 'التنقل اليومي' : 'Mobility'}
              />
              <div
                className={styles.segAviation}
                style={{ width: `${Math.max(4, calc.aviationShare)}%` }}
                title={isAr ? 'الطيران' : 'Aviation'}
              />
              <div
                className={styles.segEnergy}
                style={{ width: `${Math.max(4, calc.energyShare)}%` }}
                title={isAr ? 'كهرباء المنزل' : 'Home Energy'}
              />
              <div
                className={styles.segDiet}
                style={{ width: `${Math.max(4, calc.dietShare)}%` }}
                title={isAr ? 'الغذاء' : 'Diet'}
              />
            </div>

            <div className={styles.sectorBreakdownGrid}>
              <div className={styles.sectorStatItem}>
                <span className={styles.dotMobility} />
                <span className={styles.sectorStatLabel}>
                  {isAr ? 'التنقل والمركبة' : 'Mobility'}
                </span>
                <strong className={styles.sectorStatVal}>
                  {Math.round(calc.mobilityShare)}%
                </strong>
              </div>
              <div className={styles.sectorStatItem}>
                <span className={styles.dotAviation} />
                <span className={styles.sectorStatLabel}>
                  {isAr ? 'السفر الجوي' : 'Aviation'}
                </span>
                <strong className={styles.sectorStatVal}>
                  {Math.round(calc.aviationShare)}%
                </strong>
              </div>
              <div className={styles.sectorStatItem}>
                <span className={styles.dotEnergy} />
                <span className={styles.sectorStatLabel}>
                  {isAr ? 'الكهرباء والطاقة' : 'Home Energy'}
                </span>
                <strong className={styles.sectorStatVal}>
                  {Math.round(calc.energyShare)}%
                </strong>
              </div>
              <div className={styles.sectorStatItem}>
                <span className={styles.dotDiet} />
                <span className={styles.sectorStatLabel}>
                  {isAr ? 'الغذاء والاستهلاك' : 'Diet & Goods'}
                </span>
                <strong className={styles.sectorStatVal}>
                  {Math.round(calc.dietShare)}%
                </strong>
              </div>
            </div>
          </div>

          {/* CARD 3: INTERACTIVE ECO-SAVINGS SIMULATOR (DUAL IMPACT) */}
          <div className={styles.simulatorCard}>
            <div className={styles.simulatorHeader}>
              <div className={styles.natureIconTitle}>
                <Zap size={18} className={styles.iconGold} />
                <h3 className={styles.cardSectionTitle}>
                  {isAr
                    ? 'محاكي التوفير البيئي والمالي المزدوج'
                    : 'Interactive Eco-Financial Savings Simulator'}
                </h3>
              </div>

              <div className={styles.dualSavingsSummaryPill}>
                <span className={styles.moneySavedHighlight}>
                  {formatCurrencyAmount(
                    calc.activeMoneySavedLocal,
                    activeCurrency,
                    locale
                  )}
                  {isAr ? ' / سنة' : ' / yr'}
                </span>
                <span className={styles.co2SavedHighlight}>
                  −{calc.activeCo2SavedKg.toLocaleString('en-US')} kg CO₂
                </span>
              </div>
            </div>

            <div className={styles.actionsChecklist}>
              {calc.actionsList.map((act) => {
                const isChecked = !!selectedActions[act.id];
                return (
                  <button
                    key={act.id}
                    type="button"
                    onClick={() => toggleAction(act.id)}
                    className={`${styles.actionRowBtn} ${
                      isChecked ? styles.actionRowBtnActive : ''
                    }`}
                  >
                    <div className={styles.actionCheckCircle}>
                      {isChecked && <Check size={13} />}
                    </div>
                    <div className={styles.actionBody}>
                      <div className={styles.actionTitleLine}>
                        <span className={styles.actionTitleText}>
                          {isAr ? act.titleAr : act.titleEn}
                        </span>
                        <div className={styles.actionBadgesWrap}>
                          <span className={styles.actionMoneyBadge}>
                            +
                            {formatCurrencyAmount(
                              act.moneySavedLocal,
                              activeCurrency,
                              locale
                            )}
                          </span>
                          <span className={styles.actionCo2Badge}>
                            −{act.co2SavedKg} kg CO₂
                          </span>
                        </div>
                      </div>
                      <p className={styles.actionDescText}>
                        {isAr ? act.descAr : act.descEn}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className={styles.reportFooterBar}>
              <button
                type="button"
                onClick={handleCopyReport}
                className={styles.copyReportBtn}
              >
                {copiedReport ? <Check size={16} /> : <Copy size={16} />}
                <span>
                  {copiedReport
                    ? isAr
                      ? 'تم نسخ التقرير البيئي والمالي بنجاح ✓'
                      : 'Eco-Financial Report Copied ✓'
                    : isAr
                      ? 'نسخ التقرير البيئي والوفر المالي'
                      : 'Copy Personal Eco-Savings Report'}
                </span>
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default CarbonFootprintCalculator;
