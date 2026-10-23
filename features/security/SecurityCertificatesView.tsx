'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  BadgeCheck,
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  Globe2,
  HelpCircle,
  Lock,
  Scale,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { SiteHeader } from '@/components/sections/SiteHeader';
import { SiteFooter } from '@/components/sections/SiteFooter';
import { SignatureMotif } from '@/components/ui/SignatureMotif';
import styles from './SecurityCertificatesView.module.css';

const TRUSTEDSITE_VERIFY_URL = 'https://www.trustedsite.com/site/aqurivo.store';

type MerchantId = 'amazon' | 'noon' | 'temu';

export function SecurityCertificatesView() {
  const { locale } = useI18n();
  const isAr = locale === 'ar';
  const [activeMerchant, setActiveMerchant] = useState<MerchantId>('amazon');

  useEffect(() => {
    // Strictly suppress and remove any third-party floating badge injected into body
    const cleanupFloatingElements = () => {
      try {
        const floatingCandidates = document.querySelectorAll<HTMLElement>(
          '#mcafeesecure-body-chat, #trustedsite-tm-image, div[id^="mcafeesecure"]:not(.trustedsite-trustmark), div[class*="trustedsite-floating"], div[class*="trustedorigin-floating"], div[id*="trustedorigin-floating"]'
        );
        floatingCandidates.forEach((el) => {
          el.style.setProperty('display', 'none', 'important');
          el.style.setProperty('visibility', 'hidden', 'important');
          el.style.setProperty('pointer-events', 'none', 'important');
        });

        // Also sweep direct children of body with fixed positioning at bottom
        Array.from(document.body.children).forEach((child) => {
          if (
            child instanceof HTMLElement &&
            child.id !== 'main-content' &&
            !child.classList.contains('siteContainer') &&
            !child.classList.contains('toastContainer') &&
            !child.querySelector?.('#main-content')
          ) {
            const computed = window.getComputedStyle(child);
            if (
              computed.position === 'fixed' &&
              (computed.bottom === '0px' || parseInt(computed.bottom, 10) < 60)
            ) {
              child.style.setProperty('display', 'none', 'important');
            }
          }
        });
      } catch {
        // Safe fail-through
      }
    };

    cleanupFloatingElements();

    let observer: MutationObserver | null = null;
    if (typeof MutationObserver !== 'undefined' && document.body) {
      observer = new MutationObserver(() => {
        cleanupFloatingElements();
      });
      observer.observe(document.body, { childList: true, subtree: false });
    }

    // Initialize inline TrustedSite if available
    const win = window as unknown as { TrustedSite?: { load?: () => void } };
    if (win.TrustedSite && typeof win.TrustedSite.load === 'function') {
      try {
        win.TrustedSite.load();
      } catch {
        // Ignore load errors
      }
    }

    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  }, []);

  const merchantDetails = {
    amazon: {
      name: isAr ? 'متجر أمازون (Amazon)' : 'Amazon Official Store',
      domain: 'amazon.com / amazon.sa / amazon.ae',
      routingGuarantee: isAr
        ? 'توجيه مباشر وآمن نحو صفحة المنتج الأصلية لدى البائع المعتمد دون أي روابط وسيطة.'
        : 'Direct, clean routing straight to the authentic manufacturer or verified merchant page.',
      pricePolicy: isAr
        ? 'شفافية كاملة: السعر المعروض هو السعر الفعلي دون أي زيادة أو رسوم إضافية على المتسوق.'
        : 'Zero markup guarantee: You pay the exact official price listed on Amazon.',
    },
    noon: {
      name: isAr ? 'متجر نون (Noon)' : 'Noon Official Store',
      domain: 'noon.com (SA, AE, EG)',
      routingGuarantee: isAr
        ? 'فحص دوري لروابط المنتجات في نون للتأكد من توفرها وتوافق العروض مع مصلحة القارئ.'
        : 'Automated live verification ensuring you reach the verified product listing directly.',
      pricePolicy: isAr
        ? 'نفس سعر المتجر المباشر مع استعراض الخصومات وكوبونات التوفير الرسمية المتاحة.'
        : 'Identical store pricing with verified discount alerts and official coupons.',
    },
    temu: {
      name: isAr ? 'متجر تيمو (Temu)' : 'Temu Global Store',
      domain: 'temu.com',
      routingGuarantee: isAr
        ? 'حماية مسار التصفح من أي نوافذ منبثقة أو صفحات تتبع معقدة، ونقلك للمنتج مباشرة.'
        : 'Isolated and verified outbound link bypassing interstitial clutter directly to the product.',
      pricePolicy: isAr
        ? 'إفصاح صريح عن العروض الخاصة وتحديث منتظم لأسعار الشحن والتوفر.'
        : 'Clear disclosure of current promotional pricing and actual shipping terms.',
    },
  };

  const ledgerPrinciples = isAr
    ? [
        {
          index: 'SECTION 01',
          title: 'مسار الروابط الخارجية الآمنة',
          headline: 'توجيه نقي ومباشر نحو المتاجر الرسمية',
          icon: ExternalLink,
          prose:
            'في AQURIVO، تخضع كافة روابط الشراء الصادرة نحو المتاجر العالمية المعتمدة (مثل Amazon وNoon وTemu) لفحص برمجي دقيق. نضمن لك انتقالاً مباشراً وخالياً تماماً من أي صفحات وسيطة خادعة، أو نوافذ إعلانية منبثقة، أو روابط إعادة توجيه مشبوهة.',
        },
        {
          index: 'SECTION 02',
          title: 'الدرع التحريري والنزاهة المستقلة',
          headline: 'فحص حقيقي وإبراز العيوب قبل المزايا',
          icon: Scale,
          prose:
            'نلتزم بأعلى معايير الاستقلالية الصحفية؛ لا نتقاضى أي مقابل مالي أو رعاية مدفوعة لتفضيل منتج أو تلميع عيوبه. فريقنا يفحص المنتجات بصدق تام، ونوضح نقاط الضعف بكل شجاعة حتى يكون قرارك مبنياً على حقيقة مجردة.',
        },
        {
          index: 'SECTION 03',
          title: 'حماية الخصوصية وتجربة التصفح الصافية',
          headline: 'لا بيع للبيانات الشخصية ولا تتبع متطفل',
          icon: Lock,
          prose:
            'جلسة قراءتك وتصفحك مشفرة ومحمية بالكامل. نرفض بشكل قاطع بيع أو مشاركة بياناتك مع سماسرة الإعلانات، ونحافظ على صفحات الموقع نظيفة وخالية من البرمجيات الثقيلة التي تلاحقك عبر الإنترنت.',
        },
        {
          index: 'SECTION 04',
          title: 'الشفافية الصريحة في نموذج العمل',
          headline: 'شراكة تسويقية واضحة دون أي كلفة إضافية عليك',
          icon: Sparkles,
          prose:
            'نفصح بوضوح تام عن مشاركتنا في برامج الشركاء الرسمية. شراؤنا عبر روابطنا لا يضيف عليك أي هللة أو سنت إضافي، ونحثك دائماً على مطابقة السعر اللحظي في صفحة المتجر الرسمي قبل إتمام الشراء.',
        },
      ]
    : [
        {
          index: 'SECTION 01',
          title: 'Verified Outbound Merchant Routing',
          headline: 'Clean, Direct Routing to Authorized Retailers',
          icon: ExternalLink,
          prose:
            'Every outbound purchase link on AQURIVO to global retailers (such as Amazon, Noon, and Temu) undergoes programmatic verification. We guarantee direct, uninterrupted transit to official product listings, free of deceptive intermediaries, ad walls, or redirect traps.',
        },
        {
          index: 'SECTION 02',
          title: 'Uncompromised Editorial Independence',
          headline: 'Rigorous Independent Testing — Flaws Disclosed First',
          icon: Scale,
          prose:
            'We maintain absolute editorial separation from commercial pressures. We never accept compensation to bias a rating, artificially rank a brand, or conceal shortcomings. Our evaluations candidly highlight real-world drawbacks before praise.',
        },
        {
          index: 'SECTION 03',
          title: 'Reader Privacy & Clean Browsing Sanctuary',
          headline: 'Zero Personal Data Brokerage & No Tracking Clutter',
          icon: Lock,
          prose:
            'Your reading sessions are guarded by full transport security. We explicitly refuse to sell or monetize visitor browsing history, keeping our editorial environment calm, fast, and free of predatory behavioral ad trackers.',
        },
        {
          index: 'SECTION 04',
          title: 'Total Transparency & Zero Added Markup',
          headline: 'Clear Affiliate Disclosures with No Extra Cost to You',
          icon: Sparkles,
          prose:
            'We openly state our participation in official retailer partner programs. Purchasing through our curated links never adds a penny to your checkout total, and we always guide you to confirm live price and stock on the store’s page.',
        },
      ];

  const faqs = isAr
    ? [
        {
          question: 'هل يترتب على الشراء عبر روابط AQURIVO أي مبالغ أو رسوم إضافية؟',
          answer:
            'كلا على الإطلاق. السعر الذي تدفعه في المتجر الشريك هو نفس السعر الأصلي تماماً، بل نساعدك في العثور على أفضل الأسعار والخصومات الحقيقية دون أي زيادة أو عمولة خفية.',
        },
        {
          question: 'كيف أتيقن من أنني أتصفح المقر الرسمي المعتمد لـ AQURIVO؟',
          answer:
            'نطاقنا الرسمي والوحيد هو aqurivo.store، وهو موثق ومسجل بسجلات رقمية رسمية تمنع أي تزييف أو انتحال لعلامتنا، ويمكنك التأكد من شهادة النطاق عبر قسم الأختام المحفورة أعلاه.',
        },
        {
          question: 'هل يطلب موقع AQURIVO أي بيانات لبطاقتي الائتمانية أو حسابي البنكي؟',
          answer:
            'مطلقاً. موقع AQURIVO هو دليل تحريري واستشاري للمراجعات والمقارنات؛ وتتم كافة مراحل الشراء والدفع بأمان تام حصرياً داخل الأنظمة المصرفية المعتمدة للمتاجر الأصلية.',
        },
        {
          question: 'ما هو الإجراء المتبع عند مصادفة رابط لا يعمل بالشكل المطلوب؟',
          answer:
            'يقوم فريقنا بفحص وتحديث الروابط بشكل دوري. وفي حال لاحظت أي رابط غير دقيق أو منتهي الصلاحية، يمكنك إبلاغنا مباشرة عبر زر التواصل بالأسفل لنقوم بتدقيقه وتصحيحه فوراً.',
        },
      ]
    : [
        {
          question: 'Does buying through AQURIVO links cost me any extra fees?',
          answer:
            'Absolutely not. You pay the exact same price as visiting the merchant directly. Our editorial curation simply points you to authentic bargains without adding any surcharges or hidden costs.',
        },
        {
          question: 'How do I know I am viewing the official, authentic AQURIVO domain?',
          answer:
            'Our sole official web address is aqurivo.store, formally recorded in verified registries to prevent counterfeit spoofing. You can inspect our live domain credentials in the engraved chambers above.',
        },
        {
          question: 'Does AQURIVO ever request my payment card or banking details?',
          answer:
            'Never. AQURIVO is strictly an independent review and buying guide. All transactions, cart checkouts, and billing steps occur exclusively within the certified payment environments of the partner merchants.',
        },
        {
          question: 'What should I do if a store link appears broken or outdated?',
          answer:
            'Our technical checks continuously refresh outbound URLs. If you ever notice an expired link or price variation, please notify our team via the contact button below and we will audit it promptly.',
        },
      ];

  return (
    <div className={styles.pageContainer}>
      <SiteHeader />

      <main id="main-content" className={`siteContainer ${styles.mainContent}`}>
        {/* The Master Dossier Architecture (Unified High-End Document) */}
        <article className={styles.dossierWrapper}>
          {/* Archival Header Bar */}
          <header className={styles.dossierArchivalBar}>
            <div className={styles.archivalMetaGroup}>
              <span className={styles.archivalSerial}>REG: AQ-TR-2026 // MASTER-DOSSIER</span>
              <span className={styles.archivalDivider}>/</span>
              <span>{isAr ? 'وثيقة موثقة رسمياً' : 'Official Registered Record'}</span>
            </div>

            <div className={styles.liveAuditBadge}>
              <span className={styles.livePulseDot} aria-hidden="true" />
              <span>{isAr ? 'فحص الأمان نشط ومستمر' : 'Continuous Perimeter Audit'}</span>
            </div>
          </header>

          {/* Dossier Preamble / Hero */}
          <div className={styles.dossierPreamble}>
            <SignatureMotif
              index="01"
              label={isAr ? 'ميثاق الأمان والنزاهة المؤسسية' : 'Institutional Trust Charter'}
            />
            <h1 className={styles.dossierTitle}>
              {isAr
                ? 'وثيقة الأمان ومعايير الموثوقية التحريرية'
                : 'Security & Editorial Trust Dossier'}
            </h1>
            <p className={styles.dossierLead}>
              {isAr
                ? 'في AQURIVO، نعتبر أمانك وراحة بالك الأساس المتين لكل توصية نكتبها. صممنا هذه الوثيقة الموحدة لنكشف لك بشفافية تامة كيف نحمي تصفحك، وكيف نفحص سلامة روابط المتاجر الكبرى، وما هي الضمانات التي نلتزم بها لحماية خصوصيتك واستقلالية اختياراتنا.'
                : 'At AQURIVO, your safety and confidence form the architectural foundation of every recommendation we publish. This master dossier details our verified domain credentials, safe link routing protocols, and uncompromising editorial integrity.'}
            </p>
          </div>

          {/* Engraved Seal Chambers (Mechanical Recessed Alcoves) */}
          <section
            className={styles.sealSection}
            aria-label={isAr ? 'غرف الأختام والشهادات الرسمية' : 'Engraved Seal Chambers'}
          >
            <div>
              <span className={styles.sectionEyebrow}>
                {isAr ? 'الشهادات والاعتمادات الرسمية' : 'Official Credentials'}
              </span>
              <h2 className={styles.sectionHeaderTitle}>
                {isAr ? 'غرف الأختام المحفورة والتحقق الحي' : 'Engraved Seal Chambers'}
              </h2>
              <p className={styles.sectionHeaderDesc}>
                {isAr
                  ? 'شواهد أمان رسمية مثبتة في حجر محفورة ومستقرة، تتيح لك التدقيق الفوري لحالة الموقع النظيفة وأصالة النطاق.'
                  : 'Permanently anchored verification chambers providing live proof of active perimeter defense and verified web property origin.'}
              </p>
            </div>

            <div className={styles.chambersGrid}>
              {/* Chamber I: TrustedSite Certified Secure */}
              <div className={styles.engravedChamber}>
                <div className={styles.chamberTopBar}>
                  <span className={styles.chamberAuthority}>TrustedSite</span>
                  <div className={styles.chamberStatusBadge}>
                    <CheckCircle2 size={13} aria-hidden="true" />
                    <span>{isAr ? 'فحص دوري نشط' : 'Active Daily Audit'}</span>
                  </div>
                </div>

                <div className={styles.chamberPedestal}>
                  <div className={styles.medalInsigniaFrame}>
                    <ShieldCheck size={36} aria-hidden="true" />
                  </div>
                  <h3 className={styles.chamberHeading}>
                    {isAr
                      ? 'اعتماد الأمان اليومي وسلامة التصفح'
                      : 'TrustedSite Certified Safe Browsing'}
                  </h3>
                  <p className={styles.chamberSummary}>
                    {isAr
                      ? 'فحص أمني آلي يومي عبر منظومة TrustedSite العالمية يؤكد خلو منصة AQURIVO تماماً من أي برمجيات ضارة وسلامة التشفير.'
                      : 'Automated daily perimeter scans by TrustedSite verifying zero malware, healthy SSL encryption, and verified safety.'}
                  </p>

                  {/* Inline official trustmark slot (strictly non-floating) */}
                  <div className={styles.inlineTrustmarkSlot}>
                    <div
                      className="trustedsite-trustmark"
                      data-type="202"
                      data-width="120"
                      data-height="50"
                    />
                  </div>
                </div>

                <div className={styles.chamberSpecs}>
                  <div className={styles.specItem}>
                    <span className={styles.specKey}>{isAr ? 'نوع الفحص الأمني:' : 'Audit Protocol:'}</span>
                    <span className={styles.specVal}>{isAr ? 'فحص دوري شامل' : 'Comprehensive Perimeter Scan'}</span>
                  </div>
                  <div className={styles.specItem}>
                    <span className={styles.specKey}>{isAr ? 'حالة الحماية:' : 'Threat Status:'}</span>
                    <span className={styles.specPass}>
                      <CheckCircle2 size={12} aria-hidden="true" />
                      <span>{isAr ? 'آمن وخالٍ من التهديدات' : 'Verified Safe (Zero Threats)'}</span>
                    </span>
                  </div>
                  <div className={styles.specItem}>
                    <span className={styles.specKey}>{isAr ? 'حماية الاتصال:' : 'Transport Security:'}</span>
                    <span className={styles.specVal}>{isAr ? 'تشفير كامل وخاص' : 'Encrypted & Private'}</span>
                  </div>
                </div>

                <div className={styles.chamberFooter}>
                  <a
                    href={TRUSTEDSITE_VERIFY_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.inspectButton}
                  >
                    <span>{isAr ? 'الاطلاع على تقرير الفحص في TrustedSite' : 'Inspect Live TrustedSite Record'}</span>
                    <ArrowUpRight size={15} aria-hidden="true" />
                  </a>
                </div>
              </div>


            </div>
          </section>

          {/* Master Verification Ledger (Tabular Editorial Principles) */}
          <section
            className={styles.ledgerSection}
            aria-label={isAr ? 'سجل النزاهة والموثوقية الموحد' : 'Master Verification Ledger'}
          >
            <div>
              <span className={styles.sectionEyebrow}>
                {isAr ? 'سجل المبادئ الأربعة' : 'The Four Commitments'}
              </span>
              <h2 className={styles.sectionHeaderTitle}>
                {isAr ? 'سجل التدقيق والنزاهة لحماية المتسوق' : 'Master Buyer Integrity Ledger'}
              </h2>
              <p className={styles.sectionHeaderDesc}>
                {isAr
                  ? 'أربعة بنود رئيسية تضمن راحة بالك عند قراءة أي مراجعة أو النقر على أي رابط شراء على منصتنا.'
                  : 'Four foundational commitments ensuring total peace of mind whenever you read a review or follow an outbound link.'}
              </p>
            </div>

            <div className={styles.ledgerFlow}>
              {ledgerPrinciples.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.index} className={styles.ledgerRow}>
                    <div className={styles.ledgerIndexColumn}>
                      <span className={styles.ledgerNumber}>{item.index}</span>
                      <h3 className={styles.ledgerPrincipleTitle}>{item.title}</h3>
                    </div>

                    <div className={styles.ledgerContentColumn}>
                      <div className={styles.ledgerHeadline}>
                        <Icon size={16} className={styles.ledgerHeadlineIcon} aria-hidden="true" />
                        <span>{item.headline}</span>
                      </div>
                      <p className={styles.ledgerProse}>{item.prose}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Interactive Safe Outbound Link Inspector */}
          <section
            className={styles.inspectorSection}
            aria-label={isAr ? 'فاحص شفافية الروابط التفاعلي' : 'Interactive Store Link Inspector'}
          >
            <div>
              <span className={styles.sectionEyebrow}>
                {isAr ? 'أداة تفاعلية حية' : 'Live Interactive Inspection'}
              </span>
              <h2 className={styles.sectionHeaderTitle}>
                {isAr ? 'فاحص شفافية وسلامة روابط المتاجر' : 'Outbound Store Link Safety Inspector'}
              </h2>
              <p className={styles.sectionHeaderDesc}>
                {isAr
                  ? 'اختر المتجر الشريك لتكتشف عملياً كيف يضمن AQURIVO مسار التوجيه الآمن والخالي من أي تلاعب.'
                  : 'Select an authorized store below to observe how AQURIVO audits outbound links to guarantee direct, safe transit.'}
              </p>
            </div>

            <div className={styles.inspectorBox}>
              <div className={styles.inspectorControls}>
                <button
                  type="button"
                  onClick={() => setActiveMerchant('amazon')}
                  className={`${styles.inspectorTab} ${
                    activeMerchant === 'amazon' ? styles.inspectorTabActive : ''
                  }`}
                >
                  Amazon (أمازون)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMerchant('noon')}
                  className={`${styles.inspectorTab} ${
                    activeMerchant === 'noon' ? styles.inspectorTabActive : ''
                  }`}
                >
                  Noon (نون)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMerchant('temu')}
                  className={`${styles.inspectorTab} ${
                    activeMerchant === 'temu' ? styles.inspectorTabActive : ''
                  }`}
                >
                  Temu (تيمو)
                </button>
              </div>

              <div className={styles.inspectorAuditGrid}>
                <div className={styles.auditItem}>
                  <CheckCircle2 size={18} className={styles.auditItemIcon} aria-hidden="true" />
                  <div className={styles.auditItemText}>
                    <span className={styles.auditItemTitle}>
                      {isAr ? 'الوجهة المعتمدة:' : 'Verified Destination:'}
                    </span>
                    <span className={styles.auditItemDesc} dir="ltr">
                      {merchantDetails[activeMerchant].domain}
                    </span>
                  </div>
                </div>

                <div className={styles.auditItem}>
                  <CheckCircle2 size={18} className={styles.auditItemIcon} aria-hidden="true" />
                  <div className={styles.auditItemText}>
                    <span className={styles.auditItemTitle}>
                      {isAr ? 'ضمان مسار التوجيه:' : 'Routing Guarantee:'}
                    </span>
                    <span className={styles.auditItemDesc}>
                      {merchantDetails[activeMerchant].routingGuarantee}
                    </span>
                  </div>
                </div>

                <div className={styles.auditItem}>
                  <CheckCircle2 size={18} className={styles.auditItemIcon} aria-hidden="true" />
                  <div className={styles.auditItemText}>
                    <span className={styles.auditItemTitle}>
                      {isAr ? 'سياسة الأسعار والشفافية:' : 'Pricing & Transparency:'}
                    </span>
                    <span className={styles.auditItemDesc}>
                      {merchantDetails[activeMerchant].pricePolicy}
                    </span>
                  </div>
                </div>

                <div className={styles.auditItem}>
                  <CheckCircle2 size={18} className={styles.auditItemIcon} aria-hidden="true" />
                  <div className={styles.auditItemText}>
                    <span className={styles.auditItemTitle}>
                      {isAr ? 'حظر النوافذ الإعلانية:' : 'Zero Interstitial Ads:'}
                    </span>
                    <span className={styles.auditItemDesc}>
                      {isAr
                        ? 'توجيه فوري مباشر دون أي صفحات تأخير أو إعلانات تطلب بياناتك.'
                        : 'Zero interstitial detour; you are routed cleanly to the seller detail page.'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Dossier Inquiries / FAQ Section */}
          <section
            className={styles.faqSection}
            aria-label={isAr ? 'سجل الإيضاحات والأسئلة الشائعة' : 'Dossier Inquiries & FAQs'}
          >
            <div>
              <span className={styles.sectionEyebrow}>
                {isAr ? 'إيضاحات موثقة' : 'Verified Clarifications'}
              </span>
              <h2 className={styles.sectionHeaderTitle}>
                {isAr ? 'أسئلة شائعة تهم كل قارئ ومتسوق' : 'Common Buyer Questions Answered'}
              </h2>
              <p className={styles.sectionHeaderDesc}>
                {isAr
                  ? 'إجابات صريحة ومباشرة تزيل أي لبس حول الشراء عبر روابطنا وحماية خصوصيتك.'
                  : 'Candid, transparent answers addressing how outbound purchases work and how your data is protected.'}
              </p>
            </div>

            <div className={styles.faqList}>
              {faqs.map((faq, index) => (
                <div key={index} className={styles.faqItem}>
                  <h3 className={styles.faqQuestion}>
                    <HelpCircle size={17} className={styles.faqQuestionIcon} aria-hidden="true" />
                    <span>{faq.question}</span>
                  </h3>
                  <p className={styles.faqAnswer}>{faq.answer}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Dossier Signatures & Direct Channels */}
          <footer className={styles.signatureSection}>
            <div className={styles.signatureInner}>
              <div className={styles.signatureTextGroup}>
                <h2 className={styles.signatureHeading}>
                  {isAr
                    ? 'تسوق بارتياح — فريقنا جاهز للإجابة عن كل استفسار'
                    : 'Shop with Complete Confidence — We Are Always Available'}
                </h2>
                <p className={styles.signatureBody}>
                  {isAr
                    ? 'إذا واجهت أي رابط متجر لا يعمل بالمعايير المذكورة، أو كانت لديك رغبة في الاستفسار عن أي بند يخص أمان وخصوصية الموقع، يسعدنا تواصلك المباشر مع فريقنا وسنرد عليك بكل رحابة صدر.'
                    : 'If you ever encounter an outbound link that fails our strict criteria, or have an inquiry regarding our safety standards, reach our team directly. We are always glad to assist.'}
                </p>
              </div>

              <div className={styles.signatureActions}>
                <Link href={`/${locale}/privacy-policy`} className={styles.ghostActionLink}>
                  <FileCheck2 size={15} aria-hidden="true" />
                  <span>{isAr ? 'سياسة الخصوصية' : 'Privacy Policy'}</span>
                </Link>
                <Link href="/affiliate-disclosure" className={styles.ghostActionLink}>
                  <Scale size={15} aria-hidden="true" />
                  <span>{isAr ? 'إفصاح الشفافية والعمولة' : 'Affiliate Disclosure'}</span>
                </Link>
                <Link href={`/${locale}/contact`} className={styles.primaryActionLink}>
                  <ShieldCheck size={16} aria-hidden="true" />
                  <span>{isAr ? 'تواصل معنا مباشرة' : 'Contact Us Directly'}</span>
                </Link>
              </div>
            </div>
          </footer>
        </article>
      </main>

      <SiteFooter />
    </div>
  );
}
