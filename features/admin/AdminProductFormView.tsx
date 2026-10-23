'use client';

import React, { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Copy, ExternalLink, Film, HelpCircle, Image as ImageIcon, Plus, RefreshCw, Send, Trash2, Upload, Wand2, Zap } from 'lucide-react';
import {
  AutoCategoryBadgeIcon,
  SmartAutoDistributeIcon,
} from '@/components/ui/AqurivoContextIcons';
import type {
  Category,
  PartnerSource,
  PriceDisplayPolicy,
  Product,
  ProductComparisonDna,
  ProductImage,
  ProductStatus,
  PromoBadgeType,
} from '@/types';
import { useI18n } from '@/i18n/I18nProvider';
import { useSaved } from '@/features/saved/SavedProvider';
import { useToast } from '@/components/ui/Toast';
import {
  getFirebaseRefreshToken,
  getFreshFirebaseIdToken,
  syncAdminDocumentToFirebaseClient,
} from '@/lib/firebase-client';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { generateSlug } from '@/lib/seoSlug';
import {
  type AgentHandoffBrief,
  type CanopyPromptVerifiedFacts,
  applySmartAltTextsToImages,
  buildDynamicProductAiPrompt,
  classifyMediaUrlsFromText,
  formatAgentHandoffBriefText,
  getCanonicalImageFingerprint,
  parseMagicProductContent,
  sanitizeMediaUrl,
  saveAgentHandoffBrief,
  validateAdminAffiliateUrlGuard,
} from '@/lib/magicContentParser';
import styles from './AdminShell.module.css';

interface AdminProductFormViewProps {
  existingProduct?: Product | null;
  categories: Category[];
  sources: PartnerSource[];
  cloudinaryReady: boolean;
}

export function AdminProductFormView({
  existingProduct,
  categories,
  sources,
  cloudinaryReady,
}: AdminProductFormViewProps) {
  const { locale, t } = useI18n();
  const { csrfToken } = useSaved();
  const { showToast } = useToast();
  const router = useRouter();
  const isAr = locale === 'ar';

  const [localCategories, setLocalCategories] = useState<Category[]>(categories);

  // Smart Magic Paste & Agent Grounding State
  const [magicRawText, setMagicRawText] = useState('');
  const [showPromptTemplate, setShowPromptTemplate] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedHandoff, setCopiedHandoff] = useState(false);
  const [agentSourceProductUrl, setAgentSourceProductUrl] = useState('');
  const [agentRawMediaUrls, setAgentRawMediaUrls] = useState('');
  const affiliateFieldWrapRef = useRef<HTMLDivElement | null>(null);
  const priceFieldWrapRef = useRef<HTMLDivElement | null>(null);
  const [handoffNotes, setHandoffNotes] = useState('');
  const [generatedHandoffBrief, setGeneratedHandoffBrief] = useState<AgentHandoffBrief | null>(
    null
  );

  const [aiAltTextsAr, setAiAltTextsAr] = useState<string[]>(
    existingProduct?.images?.map((img) => img.alt?.ar || '').filter(Boolean) || []
  );
  const [aiAltTextsEn, setAiAltTextsEn] = useState<string[]>(
    existingProduct?.images?.map((img) => img.alt?.en || '').filter(Boolean) || []
  );
  const [aiCreatedCategoryInfo, setAiCreatedCategoryInfo] = useState<{
    slug: string;
    nameAr: string;
    nameEn: string;
    icon: string;
  } | null>(null);
  const [smartFillSummary, setSmartFillSummary] = useState<{
    fieldsCount: number;
    categoryLabel: string;
    isNewCategory: boolean;
    altReadyCount: number;
    videoCount: number;
  } | null>(null);

  // Form Fields State
  const [slug, setSlug] = useState(existingProduct?.slug || '');
  const [titleEn, setTitleEn] = useState(existingProduct?.title.en || '');
  const [titleAr, setTitleAr] = useState(existingProduct?.title.ar || '');
  const [summaryEn, setSummaryEn] = useState(existingProduct?.shortSummary.en || '');
  const [summaryAr, setSummaryAr] = useState(existingProduct?.shortSummary.ar || '');
  const [whyEn, setWhyEn] = useState(existingProduct?.whyWePickedIt.en || '');
  const [whyAr, setWhyAr] = useState(existingProduct?.whyWePickedIt.ar || '');
  const [considerEn, setConsiderEn] = useState(existingProduct?.whatToConsider.en || '');
  const [considerAr, setConsiderAr] = useState(existingProduct?.whatToConsider.ar || '');
  const [descEn, setDescEn] = useState(existingProduct?.description.en || '');
  const [descAr, setDescAr] = useState(existingProduct?.description.ar || '');

  // Algorithmic Comparison DNA State
  const [bestForAr, setBestForAr] = useState(
    existingProduct?.comparisonDna?.bestFor?.ar || ''
  );
  const [bestForEn, setBestForEn] = useState(
    existingProduct?.comparisonDna?.bestFor?.en || ''
  );
  const [keySpecsArText, setKeySpecsArText] = useState(
    existingProduct?.comparisonDna?.keySpecs?.ar?.join(' | ') || ''
  );
  const [keySpecsEnText, setKeySpecsEnText] = useState(
    existingProduct?.comparisonDna?.keySpecs?.en?.join(' | ') || ''
  );
  const [performanceScore, setPerformanceScore] = useState<string>(
    existingProduct?.comparisonDna?.performanceScore !== undefined
      ? String(existingProduct.comparisonDna.performanceScore)
      : ''
  );
  const [valueScore, setValueScore] = useState<string>(
    existingProduct?.comparisonDna?.valueScore !== undefined
      ? String(existingProduct.comparisonDna.valueScore)
      : ''
  );
  const [reliabilityScore, setReliabilityScore] = useState<string>(
    existingProduct?.comparisonDna?.reliabilityScore !== undefined
      ? String(existingProduct.comparisonDna.reliabilityScore)
      : ''
  );

  const [sourceId, setSourceId] = useState(
    existingProduct?.sourceId || sources[0]?.id || 'amazon'
  );
  const [categoryId, setCategoryId] = useState(
    existingProduct?.categorySlug ||
      existingProduct?.categoryId ||
      categories[0]?.slug ||
      categories[0]?.id ||
      ''
  );
  const [affiliateUrl, setAffiliateUrl] = useState(existingProduct?.affiliateUrl || '');
  const [priceDisplayPolicy, setPriceDisplayPolicy] = useState<PriceDisplayPolicy>(
    existingProduct?.priceDisplayPolicy || 'show_with_timestamp'
  );
  const [priceAmount, setPriceAmount] = useState<string>(
    existingProduct?.priceAmount !== null && existingProduct?.priceAmount !== undefined
      ? String(existingProduct.priceAmount)
      : ''
  );
  const [oldPrice, setOldPrice] = useState<string>(
    existingProduct?.oldPrice !== null && existingProduct?.oldPrice !== undefined
      ? String(existingProduct.oldPrice)
      : ''
  );
  const [discount, setDiscount] = useState<string>(
    existingProduct?.discount !== null && existingProduct?.discount !== undefined
      ? String(existingProduct.discount)
      : ''
  );
  const [stars, setStars] = useState<string>(
    existingProduct?.stars !== null && existingProduct?.stars !== undefined
      ? String(existingProduct.stars)
      : ''
  );
  const [soldCount, setSoldCount] = useState<string>(
    existingProduct?.soldCount !== null && existingProduct?.soldCount !== undefined
      ? String(existingProduct.soldCount)
      : ''
  );
  const [badge, setBadge] = useState<PromoBadgeType>(
    existingProduct?.badge ?? null
  );
  const [priceCurrency, setPriceCurrency] = useState(
    existingProduct?.priceCurrency || 'USD'
  );
  const [tagsText, setTagsText] = useState(existingProduct?.tags.join(', ') || '');
  const [isFeatured, setIsFeatured] = useState(Boolean(existingProduct?.isFeatured));
  const [status, setStatus] = useState<ProductStatus>(
    existingProduct?.status || 'published'
  );

  // Unified Media State (Images + Multi-Video URLs) — auto-sanitized & repaired on init
  const [images, setImages] = useState<ProductImage[]>(() => {
    const rawList = existingProduct?.images || [];
    const seenFp = new Set<string>();
    const cleaned: ProductImage[] = [];
    for (const img of rawList) {
      const cleanUrl = sanitizeMediaUrl(img?.url || '');
      if (!cleanUrl) continue;
      const fp = getCanonicalImageFingerprint(cleanUrl) || cleanUrl;
      if (!seenFp.has(fp)) {
        seenFp.add(fp);
        cleaned.push({ ...img, url: cleanUrl });
      }
    }
    return cleaned;
  });
  const [videoUrls, setVideoUrls] = useState<string[]>(() => {
    const initial: string[] = [];
    if (Array.isArray(existingProduct?.videoUrls)) {
      for (const v of existingProduct.videoUrls) {
        const cleanV = v ? sanitizeMediaUrl(v) : '';
        if (cleanV && !initial.includes(cleanV)) initial.push(cleanV);
      }
    }
    if (Array.isArray(existingProduct?.videos)) {
      for (const vObj of existingProduct.videos) {
        const cleanV = vObj?.url ? sanitizeMediaUrl(vObj.url) : '';
        if (cleanV && !initial.includes(cleanV)) {
          initial.push(cleanV);
        }
      }
    }
    if (existingProduct?.videoUrl && existingProduct.videoUrl.trim()) {
      const legacy = sanitizeMediaUrl(existingProduct.videoUrl);
      if (legacy && !initial.includes(legacy)) initial.unshift(legacy);
    }
    return initial;
  });
  const [videoThumbnails, setVideoThumbnails] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    if (Array.isArray(existingProduct?.videos)) {
      for (const vObj of existingProduct.videos) {
        const cleanV = vObj?.url ? sanitizeMediaUrl(vObj.url) : '';
        const cleanThumb = vObj?.thumbnailUrl ? sanitizeMediaUrl(vObj.thumbnailUrl) : '';
        if (cleanV && cleanThumb) {
          map[cleanV] = cleanThumb;
        }
      }
    }
    return map;
  });
  const [manualMediaUrl, setManualMediaUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Canopy API Auto-Fetcher & Key Failover State
  const [fetchingCanopy, setFetchingCanopy] = useState(false);
  const [canopyVerifiedFacts, setCanopyVerifiedFacts] =
    useState<CanopyPromptVerifiedFacts | null>(null);
  const [canopyFetchSummary, setCanopyFetchSummary] = useState<{
    asin: string;
    title: string;
    brand: string;
    priceDisplay: string;
    imagesCount: number;
    videosCount: number;
    specsCount: number;
    usedKeyLabel: string;
    usedKeyMasked: string;
    failoverOccurred: boolean;
    skippedKeysCount: number;
  } | null>(null);

  const dynamicPromptText = buildDynamicProductAiPrompt(localCategories, sources, {
    sourceProductUrl: agentSourceProductUrl,
    rawMediaUrlsInput: agentRawMediaUrls,
    existingImages: images,
    existingVideoUrls: videoUrls,
    canopyVerifiedFacts,
  });

  const handleFetchViaCanopy = async () => {
    const targetInput = (agentSourceProductUrl || affiliateUrl).trim();
    if (!targetInput) {
      showToast(
        isAr
          ? 'يرجى لصق رابط المنتج من Amazon أو رقم ASIN في خانة الرابط أولاً.'
          : 'Please paste the Amazon product URL or ASIN first.',
        'error'
      );
      return;
    }

    setFetchingCanopy(true);
    setErrorMessage('');
    try {
      const fbIdToken = await getFreshFirebaseIdToken();
      const res = await fetch('/api/admin/canopy/fetch-product', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
          ...(fbIdToken ? { 'x-firebase-id-token': fbIdToken } : {}),
        },
        body: JSON.stringify({ urlOrAsin: targetInput }),
      });

      const data = (await res.json()) as {
        error?: string;
        product?: {
          asin: string;
          domain: string;
          title: string;
          subtitle: string;
          brand: string;
          url: string;
          affiliateUrl: string;
          priceAmount: number | null;
          oldPrice: number | null;
          discountPercent: number | null;
          currency: string;
          rating: number | null;
          ratingsTotal: number | null;
          reviewsTotal: number | null;
          imageUrls: string[];
          videoUrls: string[];
          videos?: Array<{ url: string; title?: string; thumbnailUrl?: string }>;
          featureBullets: string[];
          technicalSpecifications: Array<{ name: string; value: string }>;
          categories: Array<{ id: string; name: string; breadcrumbPath: string }>;
          suggestedCategorySlug: string;
          suggestedKeySpecsEn: string[];
          suggestedTags: string[];
          itemWeight: string;
        };
        rotationMeta?: {
          usedKeyLabel: string;
          usedKeyMasked: string;
          failoverOccurred: boolean;
          skippedKeys: Array<{ label: string; reason: string }>;
        };
      };

      if (!res.ok || !data.product) {
        showToast(
          data.error ||
            (isAr
              ? 'تعذر جلب بيانات المنتج عبر Canopy API.'
              : 'Could not fetch product via Canopy API.'),
          'error'
        );
        return;
      }

      const prod = data.product;
      const meta = data.rotationMeta;

      // 1. Update Source Inspection URL ONLY — NEVER auto-fill affiliateUrl with the plain product link!
      const resolvedInspectionUrl = prod.url || targetInput;
      setAgentSourceProductUrl(resolvedInspectionUrl);
      setSourceId('amazon');

      // 2. Populate Title & Slug if empty
      const nextTitleEn = titleEn.trim() || prod.title.slice(0, 120);
      if (!titleEn.trim() && prod.title) {
        setTitleEn(prod.title.slice(0, 120));
      }
      const nextSlug =
        slug.trim() ||
        generateSlug(prod.title || prod.asin || 'amazon-product', 'amazon');
      if (!slug.trim()) {
        setSlug(nextSlug);
      }

      // 3. Populate Price, Old Price, Discount, Currency, Rating, Reviews Count
      const nextPrice =
        prod.priceAmount !== null ? String(prod.priceAmount) : priceAmount;
      const nextOldPrice =
        prod.oldPrice !== null ? String(prod.oldPrice) : oldPrice;
      const nextDiscount =
        prod.discountPercent !== null ? String(prod.discountPercent) : discount;
      const nextStars = prod.rating !== null ? String(prod.rating) : stars;
      const nextSold =
        prod.ratingsTotal !== null ? String(prod.ratingsTotal) : soldCount;

      if (prod.priceAmount !== null) setPriceAmount(String(prod.priceAmount));
      if (prod.oldPrice !== null) setOldPrice(String(prod.oldPrice));
      if (prod.discountPercent !== null) {
        setDiscount(String(prod.discountPercent));
        setBadge('توفير');
      }
      if (prod.currency) setPriceCurrency(prod.currency);
      if (prod.rating !== null) setStars(String(prod.rating));
      if (prod.ratingsTotal !== null) setSoldCount(String(prod.ratingsTotal));

      // 4. Match Category
      let nextCatSlug = categoryId;
      if (prod.suggestedCategorySlug) {
        const matchedCat = localCategories.find(
          (c) =>
            c.slug.toLowerCase() === prod.suggestedCategorySlug.toLowerCase() ||
            c.id.toLowerCase() === prod.suggestedCategorySlug.toLowerCase()
        );
        if (matchedCat) {
          nextCatSlug = matchedCat.slug || matchedCat.id;
          setCategoryId(nextCatSlug);
        }
      }

      // 5. Populate Key Specs & Tags if empty
      if (!keySpecsEnText.trim() && prod.suggestedKeySpecsEn.length > 0) {
        setKeySpecsEnText(prod.suggestedKeySpecsEn.join(' | '));
      }
      const nextTags =
        tagsText.trim() || prod.suggestedTags.join(', ');
      if (!tagsText.trim() && prod.suggestedTags.length > 0) {
        setTagsText(prod.suggestedTags.join(', '));
      }

      // 6. Merge all fetched Images & Videos into Gallery AND Pre-Prompt Media Input
      const allMediaLines = [...prod.imageUrls, ...prod.videoUrls];
      setAgentRawMediaUrls(allMediaLines.join('\n'));

      const mergedVids = Array.from(new Set([...videoUrls, ...prod.videoUrls]));
      setVideoUrls(mergedVids);
      if (Array.isArray(prod.videos) && prod.videos.length > 0) {
        setVideoThumbnails((prev) => {
          const nextMap = { ...prev };
          for (const vItem of prod.videos!) {
            if (vItem?.url && vItem?.thumbnailUrl) {
              nextMap[vItem.url.trim()] = vItem.thumbnailUrl.trim();
            }
          }
          return nextMap;
        });
      }

      const currentCatObj = localCategories.find(
        (c) => c.slug === nextCatSlug || c.id === nextCatSlug
      );

      const mergedImgs: ProductImage[] = [...images];
      for (const imgUrl of prod.imageUrls) {
        if (!mergedImgs.some((existing) => existing.url === imgUrl)) {
          mergedImgs.push({
            url: imgUrl,
            alt: {
              ar: titleAr || prod.title || 'صورة المنتج',
              en: nextTitleEn || prod.title || 'Product image',
            },
            width: 800,
            height: 800,
          });
        }
      }

      const finalImgsWithAlt = applySmartAltTextsToImages(
        mergedImgs,
        aiAltTextsAr,
        aiAltTextsEn,
        {
          titleAr: titleAr || prod.title,
          titleEn: nextTitleEn || prod.title,
          categoryNameAr: currentCatObj?.name?.ar,
          categoryNameEn: currentCatObj?.name?.en,
          tags: nextTags,
        }
      );
      setImages(finalImgsWithAlt);

      // 7. Store Canopy Verified Facts so the AI Agent Prompt includes 100% of official specs
      setCanopyVerifiedFacts({
        asin: prod.asin,
        title: prod.title,
        brand: prod.brand,
        priceAmount: prod.priceAmount,
        oldPrice: prod.oldPrice,
        discountPercent: prod.discountPercent,
        currency: prod.currency,
        rating: prod.rating,
        ratingsTotal: prod.ratingsTotal,
        featureBullets: prod.featureBullets,
        technicalSpecifications: prod.technicalSpecifications,
        categories: prod.categories,
        itemWeight: prod.itemWeight,
      });

      // 8. Sync Handoff Brief immediately
      syncHandoffBrief({
        nextSlug,
        nextTitleAr: titleAr || prod.title,
        nextTitleEn,
        nextCatSlug,
        nextCatNameAr: currentCatObj?.name?.ar,
        nextCatNameEn: currentCatObj?.name?.en,
        nextSourceId: 'amazon',
        nextPrice,
        nextOldPrice,
        nextDiscount,
        nextStars,
        nextAffiliateUrl: affiliateUrl.trim() || resolvedInspectionUrl,
        nextImages: finalImgsWithAlt,
        nextVideoUrls: mergedVids,
        nextTags,
      });

      setCanopyFetchSummary({
        asin: prod.asin,
        title: prod.title,
        brand: prod.brand,
        priceDisplay:
          prod.priceAmount !== null
            ? `${prod.priceAmount} ${prod.currency || 'USD'}`
            : isAr
              ? 'غير معلن'
              : 'N/A',
        imagesCount: prod.imageUrls.length,
        videosCount: prod.videoUrls.length,
        specsCount:
          prod.technicalSpecifications.length + prod.featureBullets.length,
        usedKeyLabel: meta?.usedKeyLabel || 'Canopy Key',
        usedKeyMasked: meta?.usedKeyMasked || '',
        failoverOccurred: Boolean(meta?.failoverOccurred),
        skippedKeysCount: meta?.skippedKeys?.length || 0,
      });

      showToast(
        isAr
          ? `⚡ تم جلب (${prod.imageUrls.length}) صور و(${prod.videoUrls.length}) فيديو وبيانات المنتج تلقائياً عبر ${meta?.usedKeyLabel || 'Canopy API'}!`
          : `⚡ Fetched (${prod.imageUrls.length}) images, (${prod.videoUrls.length}) videos & specs via ${meta?.usedKeyLabel || 'Canopy API'}!`,
        'success'
      );
    } catch {
      showToast(
        isAr
          ? 'حدث خطأ أثناء الاتصال بـ Canopy API.'
          : 'Error connecting to Canopy API.',
        'error'
      );
    } finally {
      setFetchingCanopy(false);
    }
  };

  // Helper to build and persist the Agent Handoff Brief for the Article Agent
  const syncHandoffBrief = (params: {
    nextSlug: string;
    nextTitleAr: string;
    nextTitleEn: string;
    nextCatSlug: string;
    nextCatNameAr?: string;
    nextCatNameEn?: string;
    nextSourceId?: string;
    nextPrice?: string;
    nextOldPrice?: string;
    nextDiscount?: string;
    nextStars?: string;
    nextAffiliateUrl?: string;
    nextImages: ProductImage[];
    nextVideoUrls: string[];
    nextBestForAr?: string;
    nextBestForEn?: string;
    nextSpecsAr?: string[];
    nextSpecsEn?: string[];
    nextPerformanceScore?: number;
    nextValueScore?: number;
    nextReliabilityScore?: number;
    nextWhyAr?: string;
    nextWhyEn?: string;
    nextConsiderAr?: string;
    nextConsiderEn?: string;
    nextSummaryAr?: string;
    nextSummaryEn?: string;
    nextDescAr?: string;
    nextDescEn?: string;
    nextTags?: string;
    nextNotes?: string;
  }) => {
    const resolvedSource = params.nextSourceId || sourceId;
    const resolvedSlug =
      params.nextSlug ||
      generateSlug(params.nextTitleEn || params.nextTitleAr || 'product', resolvedSource);
    const parsedPerf =
      params.nextPerformanceScore !== undefined
        ? params.nextPerformanceScore
        : performanceScore.trim() !== '' && !Number.isNaN(Number(performanceScore))
          ? Number(performanceScore)
          : undefined;
    const parsedVal =
      params.nextValueScore !== undefined
        ? params.nextValueScore
        : valueScore.trim() !== '' && !Number.isNaN(Number(valueScore))
          ? Number(valueScore)
          : undefined;
    const parsedRel =
      params.nextReliabilityScore !== undefined
        ? params.nextReliabilityScore
        : reliabilityScore.trim() !== '' && !Number.isNaN(Number(reliabilityScore))
          ? Number(reliabilityScore)
          : undefined;

    const brief: AgentHandoffBrief = {
      productSlug: resolvedSlug,
      titleAr: params.nextTitleAr || params.nextTitleEn || resolvedSlug,
      titleEn: params.nextTitleEn || params.nextTitleAr || resolvedSlug,
      categorySlug: params.nextCatSlug || categoryId || 'general',
      categoryNameAr: params.nextCatNameAr,
      categoryNameEn: params.nextCatNameEn,
      sourceId: resolvedSource || undefined,
      priceUsd: params.nextPrice,
      oldPriceUsd: params.nextOldPrice,
      discount: params.nextDiscount,
      stars: params.nextStars,
      summaryAr: params.nextSummaryAr || summaryAr || undefined,
      summaryEn: params.nextSummaryEn || summaryEn || undefined,
      descriptionAr: params.nextDescAr || descAr || undefined,
      descriptionEn: params.nextDescEn || descEn || undefined,
      sourceProductUrl:
        params.nextAffiliateUrl?.trim() ||
        affiliateUrl.trim() ||
        agentSourceProductUrl.trim() ||
        undefined,
      storePathAr: `/ar/products/${resolvedSlug}`,
      storePathEn: `/en/products/${resolvedSlug}`,
      images: params.nextImages.map((img) => ({
        url: img.url,
        altAr: img.alt?.ar || params.nextTitleAr || 'صورة المنتج',
        altEn: img.alt?.en || params.nextTitleEn || 'Product image',
      })),
      videoUrls: params.nextVideoUrls,
      bestForAr: params.nextBestForAr,
      bestForEn: params.nextBestForEn,
      keySpecsAr: params.nextSpecsAr,
      keySpecsEn: params.nextSpecsEn,
      performanceScore: parsedPerf,
      valueScore: parsedVal,
      reliabilityScore: parsedRel,
      whyAr: params.nextWhyAr,
      whyEn: params.nextWhyEn,
      considerAr: params.nextConsiderAr,
      considerEn: params.nextConsiderEn,
      tags: params.nextTags || tagsText || undefined,
      handoffNotes: params.nextNotes,
      updatedAt: new Date().toISOString(),
    };
    saveAgentHandoffBrief(brief);
    setGeneratedHandoffBrief(brief);
    return brief;
  };

  // Handle Magic Auto-Fill
  const handleApplyMagicFill = async () => {
    if (!magicRawText.trim()) {
      showToast(
        isAr ? 'الرجاء لصق نص المحتوى أولاً.' : 'Please paste content text first.',
        'error'
      );
      return;
    }

    const { draft, fieldsFoundCount } = parseMagicProductContent(magicRawText);

    if (fieldsFoundCount === 0) {
      showToast(
        isAr
          ? 'لم نتمكن من استخراج حقول مطابقة. تأكد من استخدام القالب أو صيغة JSON.'
          : 'No matching fields found. Please verify the format or use the template.',
        'error'
      );
      return;
    }

    const nextTitleAr = draft.titleAr !== undefined ? draft.titleAr : titleAr;
    const nextTitleEn = draft.titleEn !== undefined ? draft.titleEn : titleEn;
    const nextTags = draft.tags !== undefined ? draft.tags : tagsText;

    if (draft.titleAr !== undefined) setTitleAr(draft.titleAr);
    if (draft.titleEn !== undefined) setTitleEn(draft.titleEn);

    // Smart source matching
    let nextSourceId = sourceId;
    if (draft.sourceId) {
      const sq = draft.sourceId.toLowerCase().trim();
      const matchedSource = sources.find(
        (s) =>
          s.id.toLowerCase() === sq ||
          s.slug.toLowerCase() === sq ||
          (s.name?.en && s.name.en.toLowerCase().includes(sq)) ||
          (s.name?.ar && s.name.ar.toLowerCase().includes(sq))
      );
      if (matchedSource) {
        nextSourceId = matchedSource.id;
        setSourceId(matchedSource.id);
      }
    }

    // Smart slug generation if not explicitly provided
    let nextSlug = slug;
    if (draft.slug !== undefined && draft.slug.trim()) {
      nextSlug = generateSlug(draft.slug.trim(), nextSourceId);
      setSlug(nextSlug);
    } else if (nextTitleEn || nextTitleAr) {
      nextSlug = generateSlug(nextTitleEn || nextTitleAr, nextSourceId);
      setSlug(nextSlug);
    }

    if (draft.summaryAr !== undefined) setSummaryAr(draft.summaryAr);
    if (draft.summaryEn !== undefined) setSummaryEn(draft.summaryEn);
    if (draft.whyAr !== undefined) setWhyAr(draft.whyAr);
    if (draft.whyEn !== undefined) setWhyEn(draft.whyEn);
    if (draft.considerAr !== undefined) setConsiderAr(draft.considerAr);
    if (draft.considerEn !== undefined) setConsiderEn(draft.considerEn);
    if (draft.descAr !== undefined) setDescAr(draft.descAr);
    if (draft.descEn !== undefined) setDescEn(draft.descEn);

    // Algorithmic Comparison DNA auto-fill
    const nextBestForAr = draft.bestForAr !== undefined ? draft.bestForAr : bestForAr;
    const nextBestForEn = draft.bestForEn !== undefined ? draft.bestForEn : bestForEn;
    if (draft.bestForAr !== undefined) setBestForAr(draft.bestForAr);
    if (draft.bestForEn !== undefined) setBestForEn(draft.bestForEn);

    const nextSpecsArList =
      draft.keySpecsAr && draft.keySpecsAr.length > 0
        ? draft.keySpecsAr
        : keySpecsArText
            .split('|')
            .map((s) => s.trim())
            .filter(Boolean);
    const nextSpecsEnList =
      draft.keySpecsEn && draft.keySpecsEn.length > 0
        ? draft.keySpecsEn
        : keySpecsEnText
            .split('|')
            .map((s) => s.trim())
            .filter(Boolean);

    if (draft.keySpecsAr && draft.keySpecsAr.length > 0) {
      setKeySpecsArText(draft.keySpecsAr.join(' | '));
    }
    if (draft.keySpecsEn && draft.keySpecsEn.length > 0) {
      setKeySpecsEnText(draft.keySpecsEn.join(' | '));
    }
    if (draft.performanceScore !== undefined) {
      setPerformanceScore(String(draft.performanceScore));
    }
    if (draft.valueScore !== undefined) {
      setValueScore(String(draft.valueScore));
    }
    if (draft.reliabilityScore !== undefined) {
      setReliabilityScore(String(draft.reliabilityScore));
    }
    if (draft.handoffSummary !== undefined) {
      setHandoffNotes(draft.handoffSummary);
    }

    // Smart Pricing, Discount, Stars, Sold Count, Badge, Currency (defaults to USD)
    const nextPrice = draft.priceAmount !== undefined ? draft.priceAmount : priceAmount;
    const nextOldPrice = draft.oldPrice !== undefined ? draft.oldPrice : oldPrice;
    let nextDiscount = discount;
    if (draft.priceAmount !== undefined) setPriceAmount(draft.priceAmount);
    if (draft.oldPrice !== undefined) setOldPrice(draft.oldPrice);

    if (draft.discount !== undefined) {
      nextDiscount = draft.discount;
      setDiscount(draft.discount);
    } else if (nextPrice && nextOldPrice && Number(nextOldPrice) > Number(nextPrice)) {
      const calcDisc = Math.round(
        ((Number(nextOldPrice) - Number(nextPrice)) / Number(nextOldPrice)) * 100
      );
      if (calcDisc > 0 && calcDisc < 99) {
        nextDiscount = String(calcDisc);
        setDiscount(String(calcDisc));
      }
    }

    const nextStars = draft.stars !== undefined ? draft.stars : stars;
    if (draft.stars !== undefined) {
      setStars(draft.stars);
    }

    if (draft.soldCount !== undefined) {
      setSoldCount(draft.soldCount);
    }

    if (draft.badge) {
      if (draft.badge.includes('توفير') || draft.badge.toLowerCase().includes('sav')) {
        setBadge('توفير');
      } else if (draft.badge.includes('الأخير') || draft.badge.toLowerCase().includes('last')) {
        setBadge('اليوم الأخير');
      }
    } else if (!badge) {
      setBadge('توفير');
    }

    setPriceCurrency(draft.priceCurrency ? draft.priceCurrency.toUpperCase() : 'USD');

    if (draft.isFeatured !== undefined) {
      setIsFeatured(draft.isFeatured);
    }

    // Keep plain product URL strictly in agentSourceProductUrl — NEVER copy it into affiliateUrl!
    const incomingSourceUrl = draft.sourceProductUrl?.trim() || '';
    if (incomingSourceUrl && !agentSourceProductUrl.trim()) {
      setAgentSourceProductUrl(incomingSourceUrl);
    }

    // Only populate affiliateUrl if the draft explicitly included a valid affiliate link (not a plain product URL)
    if (draft.affiliateUrl?.trim()) {
      const candidateAff = draft.affiliateUrl.trim();
      const guardResult = validateAdminAffiliateUrlGuard(
        candidateAff,
        incomingSourceUrl || agentSourceProductUrl
      );
      if (!guardResult.isInvalid) {
        setAffiliateUrl(candidateAff);
      }
    }

    const resolvedProductLink =
      affiliateUrl.trim() ||
      incomingSourceUrl ||
      agentSourceProductUrl.trim() ||
      '';
    if (draft.tags) setTagsText(draft.tags);

    // Auto-match or Auto-Create Category!
    let resolvedCatLabel = '';
    let resolvedCatSlug = categoryId;
    let createdNewCat = false;
    let nextCategoryNameAr = draft.categoryNameAr || '';
    let nextCategoryNameEn = draft.categoryNameEn || '';

    if (draft.categoryId || draft.categoryNameEn || draft.categoryNameAr) {
      const rawCatInput = (draft.categoryId || draft.categoryNameEn || draft.categoryNameAr || '')
        .toLowerCase()
        .trim();
      const normalizedCatSlug = rawCatInput
        .replace(/[\s_]+/g, '-')
        .replace(/[^a-z0-9\u0600-\u06FF-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      const matchedCat = localCategories.find(
        (c) =>
          c.slug.toLowerCase() === rawCatInput ||
          c.slug.toLowerCase() === normalizedCatSlug ||
          c.id.toLowerCase() === rawCatInput ||
          (c.name?.ar && draft.categoryNameAr && c.name.ar.trim() === draft.categoryNameAr.trim()) ||
          (c.name?.en &&
            draft.categoryNameEn &&
            c.name.en.toLowerCase().trim() === draft.categoryNameEn.toLowerCase().trim()) ||
          (c.name?.ar && c.name.ar.toLowerCase().includes(rawCatInput)) ||
          (c.name?.en && c.name.en.toLowerCase().includes(rawCatInput))
      );

      if (matchedCat) {
        resolvedCatSlug = matchedCat.slug || matchedCat.id;
        setCategoryId(resolvedCatSlug);
        setAiCreatedCategoryInfo(null);
        resolvedCatLabel = isAr
          ? matchedCat.name?.ar || matchedCat.name?.en || matchedCat.slug
          : matchedCat.name?.en || matchedCat.name?.ar || matchedCat.slug;
        nextCategoryNameAr = matchedCat.name?.ar || nextCategoryNameAr;
        nextCategoryNameEn = matchedCat.name?.en || nextCategoryNameEn;
      } else if (normalizedCatSlug) {
        // AI invented a brand-new category! Create it dynamically
        const newCatNameEn =
          draft.categoryNameEn ||
          normalizedCatSlug
            .split('-')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');
        const newCatNameAr = draft.categoryNameAr || newCatNameEn;
        const newCatIcon = draft.categoryIcon || '📦';

        const newCategoryObj: Category = {
          id: normalizedCatSlug,
          slug: normalizedCatSlug,
          name: { ar: newCatNameAr, en: newCatNameEn },
          description: {
            ar: `منتجات مختارة بعناية في قسم ${newCatNameAr}`,
            en: `Carefully curated picks in ${newCatNameEn}`,
          },
          icon: newCatIcon,
          order: localCategories.length + 1,
          isActive: true,
        };

        setLocalCategories((prev) => [...prev, newCategoryObj]);
        resolvedCatSlug = normalizedCatSlug;
        setCategoryId(normalizedCatSlug);
        setAiCreatedCategoryInfo({
          slug: normalizedCatSlug,
          nameAr: newCatNameAr,
          nameEn: newCatNameEn,
          icon: newCatIcon,
        });
        createdNewCat = true;
        resolvedCatLabel = `${newCatIcon} ${isAr ? newCatNameAr : newCatNameEn} (${normalizedCatSlug})`;
        nextCategoryNameAr = newCatNameAr;
        nextCategoryNameEn = newCatNameEn;

        try {
          const fbToken = await getFreshFirebaseIdToken();
          const fbRefresh = getFirebaseRefreshToken();
          const catHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
          };
          if (csrfToken) catHeaders['x-csrf-token'] = csrfToken;
          if (fbToken) catHeaders['x-firebase-id-token'] = fbToken;
          if (fbRefresh) catHeaders['x-firebase-refresh-token'] = fbRefresh;

          const res = await fetch('/api/admin/categories', {
            method: 'POST',
            headers: catHeaders,
            body: JSON.stringify(newCategoryObj),
          });
          if (res.ok) {
            const data = (await res.json()) as { category?: Category };
            if (data.category?.id) {
              await syncAdminDocumentToFirebaseClient(
                'categories',
                data.category.id,
                data.category
              );
            }
          }
        } catch {
          // Will also be auto-created on product save by the server
        }
      }
    }

    // Also classify any media URLs pasted in the pre-prompt box or returned by the AI
    const prePromptMedia = classifyMediaUrlsFromText(agentRawMediaUrls);
    const mergedVideoList = Array.from(
      new Set(
        [
          ...videoUrls,
          ...prePromptMedia.videoUrls,
          ...(draft.videoUrls || []),
          ...(draft.videoUrl ? [draft.videoUrl] : []),
        ]
          .map((u) => sanitizeMediaUrl(u))
          .filter(Boolean)
      )
    );
    setVideoUrls(mergedVideoList);

    const nextAltAr =
      draft.altTextsAr && draft.altTextsAr.length > 0 ? draft.altTextsAr : aiAltTextsAr;
    const nextAltEn =
      draft.altTextsEn && draft.altTextsEn.length > 0 ? draft.altTextsEn : aiAltTextsEn;

    if (draft.altTextsAr && draft.altTextsAr.length > 0) setAiAltTextsAr(draft.altTextsAr);
    if (draft.altTextsEn && draft.altTextsEn.length > 0) setAiAltTextsEn(draft.altTextsEn);

    const incomingImageUrls = Array.from(
      new Set(
        [...prePromptMedia.imageUrls, ...(draft.images || [])]
          .map((u) => sanitizeMediaUrl(u))
          .filter(Boolean)
      )
    );

    const mergedImages: ProductImage[] = [];
    const seenFingerprints = new Set<string>();

    for (const existing of images) {
      const cleanExisting = sanitizeMediaUrl(existing.url);
      if (!cleanExisting) continue;
      const fp = getCanonicalImageFingerprint(cleanExisting) || cleanExisting;
      if (!seenFingerprints.has(fp)) {
        seenFingerprints.add(fp);
        mergedImages.push({ ...existing, url: cleanExisting });
      }
    }

    for (const url of incomingImageUrls) {
      const fp = getCanonicalImageFingerprint(url) || url;
      if (!seenFingerprints.has(fp)) {
        seenFingerprints.add(fp);
        mergedImages.push({
          url,
          alt: {
            en: nextTitleEn || 'Product image',
            ar: nextTitleAr || 'صورة المنتج',
          },
          width: 800,
          height: 800,
        });
      }
    }

    const updatedImagesWithAlt = applySmartAltTextsToImages(
      mergedImages,
      nextAltAr,
      nextAltEn,
      {
        titleAr: nextTitleAr,
        titleEn: nextTitleEn,
        categoryNameAr: nextCategoryNameAr,
        categoryNameEn: nextCategoryNameEn,
        tags: nextTags,
      }
    );
    setImages(updatedImagesWithAlt);

    // Build and save the Handoff Card for the Article Agent!
    syncHandoffBrief({
      nextSlug,
      nextTitleAr,
      nextTitleEn,
      nextCatSlug: resolvedCatSlug,
      nextCatNameAr: nextCategoryNameAr,
      nextCatNameEn: nextCategoryNameEn,
      nextSourceId,
      nextPrice,
      nextOldPrice,
      nextDiscount,
      nextStars,
      nextAffiliateUrl: resolvedProductLink,
      nextImages: updatedImagesWithAlt,
      nextVideoUrls: mergedVideoList,
      nextBestForAr,
      nextBestForEn,
      nextSpecsAr: nextSpecsArList,
      nextSpecsEn: nextSpecsEnList,
      nextPerformanceScore: draft.performanceScore,
      nextValueScore: draft.valueScore,
      nextReliabilityScore: draft.reliabilityScore,
      nextWhyAr: draft.whyAr !== undefined ? draft.whyAr : whyAr,
      nextWhyEn: draft.whyEn !== undefined ? draft.whyEn : whyEn,
      nextConsiderAr: draft.considerAr !== undefined ? draft.considerAr : considerAr,
      nextConsiderEn: draft.considerEn !== undefined ? draft.considerEn : considerEn,
      nextSummaryAr: draft.summaryAr !== undefined ? draft.summaryAr : summaryAr,
      nextSummaryEn: draft.summaryEn !== undefined ? draft.summaryEn : summaryEn,
      nextDescAr: draft.descAr !== undefined ? draft.descAr : descAr,
      nextDescEn: draft.descEn !== undefined ? draft.descEn : descEn,
      nextTags,
      nextNotes: draft.handoffSummary || handoffNotes,
    });

    setSmartFillSummary({
      fieldsCount: fieldsFoundCount,
      categoryLabel: resolvedCatLabel || resolvedCatSlug,
      isNewCategory: createdNewCat,
      altReadyCount: updatedImagesWithAlt.length || nextAltAr.length,
      videoCount: mergedVideoList.length,
    });

    showToast(
      isAr
        ? `⚡ تم تعبئة (${fieldsFoundCount}) خانة، وتجهيز البصمة الخوارزمية وبطاقة تسليم وكيل المقالات!`
        : `⚡ Smart-filled (${fieldsFoundCount}) fields, Algorithmic DNA & Article Agent Handoff Brief!`,
      'success'
    );
  };

  const handleCopyPromptTemplate = () => {
    navigator.clipboard.writeText(dynamicPromptText);
    setCopiedPrompt(true);
    showToast(
      isAr ? 'تم نسخ نموذج التعليمات الذكي للحافظة!' : 'Smart prompt template copied to clipboard!',
      'success'
    );
    setTimeout(() => setCopiedPrompt(false), 2500);
  };

  const compressImageFileToDataUrl = (
    file: File
  ): Promise<{ url: string; width: number; height: number }> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Unable to read image file.'));
      reader.onload = () => {
        const img = new window.Image();
        img.onerror = () => reject(new Error('Invalid image file.'));
        img.onload = () => {
          const maxDim = 960;
          let width = img.naturalWidth || 800;
          let height = img.naturalHeight || 600;
          if (width > maxDim || height > maxDim) {
            if (width >= height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve({ url: String(reader.result), width, height });
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
          resolve({ url: dataUrl, width, height });
        };
        img.src = String(reader.result);
      };
      reader.readAsDataURL(file);
    });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setErrorMessage('');
    try {
      let uploadedImage: ProductImage | null = null;

      if (csrfToken) {
        try {
          const sigRes = await fetch('/api/admin/upload-signature', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-csrf-token': csrfToken,
            },
            body: JSON.stringify({
              mimeType: file.type || 'image/jpeg',
              fileSizeBytes: file.size,
            }),
          });

          const sigData = (await sigRes.json()) as {
            cloudName?: string;
            apiKey?: string;
            timestamp?: number;
            signature?: string;
            folder?: string;
          };

          if (sigRes.ok && sigData.signature && sigData.cloudName && sigData.apiKey) {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('api_key', sigData.apiKey);
            formData.append('timestamp', String(sigData.timestamp));
            formData.append('signature', sigData.signature);
            formData.append('folder', sigData.folder || 'soufshop/products');

            const uploadRes = await fetch(
              `https://api.cloudinary.com/v1_1/${encodeURIComponent(sigData.cloudName)}/image/upload`,
              {
                method: 'POST',
                body: formData,
              }
            );

            if (uploadRes.ok) {
              const uploaded = (await uploadRes.json()) as {
                secure_url: string;
                public_id: string;
                width: number;
                height: number;
              };
              uploadedImage = {
                url: uploaded.secure_url,
                publicId: uploaded.public_id,
                alt: { en: titleEn || 'Product image', ar: titleAr || 'صورة المنتج' },
                width: uploaded.width || 800,
                height: uploaded.height || 600,
              };
            }
          }
        } catch {
          // Fallback to direct compressed image below
        }
      }

      if (!uploadedImage) {
        const compressed = await compressImageFileToDataUrl(file);
        uploadedImage = {
          url: compressed.url,
          alt: { en: titleEn || 'Product image', ar: titleAr || 'صورة المنتج' },
          width: compressed.width,
          height: compressed.height,
        };
      }

      const currentCat = localCategories.find(
        (c) => c.slug === categoryId || c.id === categoryId
      );

      setImages((prev) =>
        applySmartAltTextsToImages([...prev, uploadedImage!], aiAltTextsAr, aiAltTextsEn, {
          titleAr,
          titleEn,
          categoryNameAr: currentCat?.name?.ar || aiCreatedCategoryInfo?.nameAr,
          categoryNameEn: currentCat?.name?.en || aiCreatedCategoryInfo?.nameEn,
          tags: tagsText,
        })
      );
      showToast(
        isAr
          ? 'تم رفع الصورة وتطبيق الوصف البديل (Alt SEO) تلقائياً!'
          : 'Image uploaded and Smart SEO Alt text applied automatically!',
        'success'
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setErrorMessage(msg);
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleAddManualMedia = () => {
    const trimmed = manualMediaUrl.trim();
    if (!trimmed) return;

    const classified = classifyMediaUrlsFromText(trimmed);
    const currentCat = localCategories.find(
      (c) => c.slug === categoryId || c.id === categoryId
    );

    if (classified.imageUrls.length > 0) {
      setImages((prev) => {
        const nextList = [...prev];
        for (const imgUrl of classified.imageUrls) {
          if (!nextList.some((item) => item.url === imgUrl)) {
            nextList.push({
              url: imgUrl,
              alt: { en: titleEn || 'Product image', ar: titleAr || 'صورة المنتج' },
              width: 800,
              height: 600,
            });
          }
        }
        return applySmartAltTextsToImages(nextList, aiAltTextsAr, aiAltTextsEn, {
          titleAr,
          titleEn,
          categoryNameAr: currentCat?.name?.ar || aiCreatedCategoryInfo?.nameAr,
          categoryNameEn: currentCat?.name?.en || aiCreatedCategoryInfo?.nameEn,
          tags: tagsText,
        });
      });
    }

    if (classified.videoUrls.length > 0) {
      setVideoUrls((prev) => {
        const nextVids = [...prev];
        for (const vidUrl of classified.videoUrls) {
          if (!nextVids.includes(vidUrl)) {
            nextVids.push(vidUrl);
          }
        }
        return nextVids;
      });
    }

    setManualMediaUrl('');
    setErrorMessage('');
  };

  const handleCopyHandoffBrief = () => {
    const currentCat = localCategories.find(
      (c) => c.slug === categoryId || c.id === categoryId
    );
    const brief =
      generatedHandoffBrief ||
      syncHandoffBrief({
        nextSlug: slug,
        nextTitleAr: titleAr,
        nextTitleEn: titleEn,
        nextCatSlug: categoryId,
        nextCatNameAr: currentCat?.name?.ar || aiCreatedCategoryInfo?.nameAr,
        nextCatNameEn: currentCat?.name?.en || aiCreatedCategoryInfo?.nameEn,
        nextPrice: priceAmount,
        nextOldPrice: oldPrice,
        nextDiscount: discount,
        nextStars: stars,
        nextImages: images,
        nextVideoUrls: videoUrls,
        nextBestForAr: bestForAr,
        nextBestForEn: bestForEn,
        nextSpecsAr: keySpecsArText
          .split('|')
          .map((s) => s.trim())
          .filter(Boolean),
        nextSpecsEn: keySpecsEnText
          .split('|')
          .map((s) => s.trim())
          .filter(Boolean),
        nextWhyAr: whyAr,
        nextWhyEn: whyEn,
        nextConsiderAr: considerAr,
        nextConsiderEn: considerEn,
        nextNotes: handoffNotes,
      });

    navigator.clipboard.writeText(formatAgentHandoffBriefText(brief));
    setCopiedHandoff(true);
    showToast(
      isAr
        ? 'تم نسخ بطاقة تسليم المنتج وحفظها تلقائياً لوكيل المقالات!'
        : 'Product Handoff Card copied & saved for the Article Agent!',
      'success'
    );
    setTimeout(() => setCopiedHandoff(false), 2500);
  };

  const handleRefreshSmartAltTexts = () => {
    const currentCat = localCategories.find(
      (c) => c.slug === categoryId || c.id === categoryId
    );
    setImages((prev) =>
      applySmartAltTextsToImages(prev, aiAltTextsAr, aiAltTextsEn, {
        titleAr,
        titleEn,
        categoryNameAr: currentCat?.name?.ar || aiCreatedCategoryInfo?.nameAr,
        categoryNameEn: currentCat?.name?.en || aiCreatedCategoryInfo?.nameEn,
        tags: tagsText,
      })
    );
    showToast(
      isAr
        ? `⚡ تم تطبيق وتوليد الأوصاف البديلة الذكية لـ (${images.length}) صور!`
        : `⚡ Smart SEO Alt texts applied to (${images.length}) images!`,
      'success'
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // Strict Affiliate Guard: prevent saving if affiliateUrl is empty or is a plain product link
    const affiliateGuard = validateAdminAffiliateUrlGuard(affiliateUrl, agentSourceProductUrl);
    if (affiliateGuard.isInvalid) {
      const warnMsg = isAr ? affiliateGuard.reasonAr : affiliateGuard.reasonEn;
      setErrorMessage(warnMsg);
      showToast(warnMsg, 'error');
      if (affiliateFieldWrapRef.current) {
        affiliateFieldWrapRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const inputEl = affiliateFieldWrapRef.current.querySelector('input');
        inputEl?.focus();
      }
      return;
    }

    // Strict Price Guard: prevent saving if price field is empty or non-positive
    const cleanPrice = (priceAmount || '').trim();
    if (!cleanPrice) {
      const warnMsg = isAr
        ? '⚠️ تنبيه: خانة سعر المنتج فارغة! يرجى إدخال سعر المنتج أولاً قبل الحفظ.'
        : '⚠️ Alert: Product price is empty! Please enter a product price before saving.';
      setErrorMessage(warnMsg);
      showToast(warnMsg, 'error');
      if (priceFieldWrapRef.current) {
        priceFieldWrapRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const inputEl = priceFieldWrapRef.current.querySelector('input');
        inputEl?.focus();
      }
      return;
    }

    const parsedPriceNum = Number(cleanPrice);
    if (Number.isNaN(parsedPriceNum) || parsedPriceNum <= 0) {
      const warnMsg = isAr
        ? '⚠️ تنبيه: يرجى إدخال سعر صالح أكبر من الصفر قبل حفظ المنتج.'
        : '⚠️ Alert: Please enter a valid price greater than zero before saving.';
      setErrorMessage(warnMsg);
      showToast(warnMsg, 'error');
      if (priceFieldWrapRef.current) {
        priceFieldWrapRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const inputEl = priceFieldWrapRef.current.querySelector('input');
        inputEl?.focus();
      }
      return;
    }

    setSaving(true);

    try {
      const rawImagesList = [...images];
      const finalVideoUrls = [...videoUrls];

      const pendingMediaInput = manualMediaUrl.trim();
      if (pendingMediaInput) {
        const classifiedPending = classifyMediaUrlsFromText(pendingMediaInput);
        for (const imgUrl of classifiedPending.imageUrls) {
          if (!rawImagesList.some((item) => item.url === imgUrl)) {
            rawImagesList.push({
              url: imgUrl,
              alt: { en: titleEn || 'Product image', ar: titleAr || 'صورة المنتج' },
              width: 800,
              height: 600,
            });
          }
        }
        for (const vidUrl of classifiedPending.videoUrls) {
          if (!finalVideoUrls.includes(vidUrl)) {
            finalVideoUrls.push(vidUrl);
          }
        }
      }

      const currentCat = localCategories.find(
        (c) => c.slug === categoryId || c.id === categoryId
      );

      // Run Smart Image Alt Engine before saving so all N images have accurate SEO Alt tags
      const finalImages = applySmartAltTextsToImages(
        rawImagesList,
        aiAltTextsAr,
        aiAltTextsEn,
        {
          titleAr,
          titleEn,
          categoryNameAr: currentCat?.name?.ar || aiCreatedCategoryInfo?.nameAr,
          categoryNameEn: currentCat?.name?.en || aiCreatedCategoryInfo?.nameEn,
          tags: tagsText,
        }
      );

      const autoSlug = slug.trim()
        ? generateSlug(slug.trim(), sourceId)
        : generateSlug(titleEn || titleAr, sourceId);

      const parsedSpecsAr = keySpecsArText
        .split('|')
        .map((s) => s.trim())
        .filter(Boolean);
      const parsedSpecsEn = keySpecsEnText
        .split('|')
        .map((s) => s.trim())
        .filter(Boolean);

      const comparisonDna: ProductComparisonDna | undefined =
        bestForAr.trim() ||
        bestForEn.trim() ||
        parsedSpecsAr.length > 0 ||
        parsedSpecsEn.length > 0 ||
        performanceScore.trim() !== '' ||
        valueScore.trim() !== '' ||
        reliabilityScore.trim() !== ''
          ? {
              ...(bestForAr.trim() || bestForEn.trim()
                ? {
                    bestFor: {
                      ar: bestForAr.trim() || bestForEn.trim(),
                      en: bestForEn.trim() || bestForAr.trim(),
                    },
                  }
                : {}),
              ...(parsedSpecsAr.length > 0 || parsedSpecsEn.length > 0
                ? {
                    keySpecs: {
                      ar: parsedSpecsAr.length > 0 ? parsedSpecsAr : parsedSpecsEn,
                      en: parsedSpecsEn.length > 0 ? parsedSpecsEn : parsedSpecsAr,
                    },
                  }
                : {}),
              ...(performanceScore.trim() !== '' && !Number.isNaN(Number(performanceScore))
                ? { performanceScore: Number(performanceScore) }
                : {}),
              ...(valueScore.trim() !== '' && !Number.isNaN(Number(valueScore))
                ? { valueScore: Number(valueScore) }
                : {}),
              ...(reliabilityScore.trim() !== '' && !Number.isNaN(Number(reliabilityScore))
                ? { reliabilityScore: Number(reliabilityScore) }
                : {}),
            }
          : undefined;

      // Save latest handoff brief for the Article Agent
      syncHandoffBrief({
        nextSlug: autoSlug,
        nextTitleAr: titleAr,
        nextTitleEn: titleEn,
        nextCatSlug: categoryId,
        nextCatNameAr: currentCat?.name?.ar || aiCreatedCategoryInfo?.nameAr,
        nextCatNameEn: currentCat?.name?.en || aiCreatedCategoryInfo?.nameEn,
        nextPrice: priceAmount,
        nextOldPrice: oldPrice,
        nextDiscount: discount,
        nextStars: stars,
        nextImages: finalImages,
        nextVideoUrls: finalVideoUrls,
        nextBestForAr: bestForAr,
        nextBestForEn: bestForEn,
        nextSpecsAr: parsedSpecsAr,
        nextSpecsEn: parsedSpecsEn,
        nextWhyAr: whyAr,
        nextWhyEn: whyEn,
        nextConsiderAr: considerAr,
        nextConsiderEn: considerEn,
        nextNotes: handoffNotes,
      });

      const payload = {
        slug: autoSlug,
        title: { en: titleEn, ar: titleAr },
        shortSummary: { en: summaryEn, ar: summaryAr },
        whyWePickedIt: { en: whyEn, ar: whyAr },
        whatToConsider: { en: considerEn, ar: considerAr },
        description: { en: descEn, ar: descAr },
        priceAmount: priceAmount.trim() !== '' ? Number(priceAmount) : null,
        oldPrice: oldPrice.trim() !== '' ? Number(oldPrice) : null,
        discount: discount.trim() !== '' ? Number(discount) : null,
        stars: stars.trim() !== '' ? Number(stars) : null,
        soldCount: soldCount.trim() !== '' ? Number(soldCount) : null,
        badge,
        priceCurrency,
        priceDisplayPolicy,
        affiliateUrl: affiliateUrl.trim(),
        sourceId,
        categoryId,
        newCategoryName: aiCreatedCategoryInfo
          ? { ar: aiCreatedCategoryInfo.nameAr, en: aiCreatedCategoryInfo.nameEn }
          : currentCat?.name,
        newCategoryIcon: aiCreatedCategoryInfo?.icon || currentCat?.icon,
        images: finalImages,
        videoUrls: finalVideoUrls,
        videoUrl: finalVideoUrls[0] || undefined,
        videos: finalVideoUrls.map((vUrl) => ({
          url: vUrl,
          title: {
            ar: titleAr || titleEn || 'فيديو المنتج',
            en: titleEn || titleAr || 'Product video',
          },
          ...(videoThumbnails[vUrl] ? { thumbnailUrl: videoThumbnails[vUrl] } : {}),
        })),
        comparisonDna,
        tags: tagsText
          .split(/[،,]/)
          .map((x) => x.trim())
          .filter(Boolean),
        isFeatured,
        status,
      };

      const fbToken = await getFreshFirebaseIdToken();
      const fbRefresh = getFirebaseRefreshToken();
      let effectiveCsrf = csrfToken || '';
      if (!effectiveCsrf && typeof window !== 'undefined') {
        try {
          effectiveCsrf = window.sessionStorage.getItem('soufshop_session_token') || '';
        } catch {
          // Ignore storage error
        }
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (effectiveCsrf) {
        headers['x-csrf-token'] = effectiveCsrf;
      }
      if (fbToken) {
        headers['x-firebase-id-token'] = fbToken;
      }
      if (fbRefresh) {
        headers['x-firebase-refresh-token'] = fbRefresh;
      }

      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          existingId: existingProduct?.id,
          payload,
        }),
      });

      const data = (await res.json()) as { error?: string; product?: Product };
      if (!res.ok) {
        setErrorMessage(data.error || 'Unable to save product.');
        showToast(data.error || (isAr ? 'تعذر حفظ المنتج.' : 'Unable to save product.'), 'error');
        return;
      }

      if (data.product && data.product.id) {
        await syncAdminDocumentToFirebaseClient('products', data.product.id, data.product);
      }

      showToast(
        isAr
          ? 'تم حفظ المنتج وبصمته الخوارزمية، وتجهيز بطاقة التسليم لوكيل المقالات!'
          : 'Product, Algorithmic DNA & Article Handoff saved successfully!',
        'success'
      );
      router.refresh();
      router.push('/admin/products');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to save product.';
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>
            {existingProduct
              ? isAr
                ? 'تعديل المنتج'
                : 'Edit Product'
              : isAr
                ? 'إضافة منتج جديد'
                : 'Add New Curated Product'}
          </h1>
          <p className={styles.pageSubtitle}>
            {isAr
              ? 'أدخل رابط المنتج الحقيقي وروابط صوره وفيديوهاته ليقوم وكيل المنتج بفحصها وبناء المحتوى والبصمة الخوارزمية وبطاقة التسليم لوكيل المقالات.'
              : 'Provide the real product URL and media links so the Product Agent can inspect them, generate content, algorithmic comparison DNA, and the Article Handoff Brief.'}
          </p>
        </div>
      </div>

      {/* ⚡ Smart Product Agent & Auto-Fill Container */}
      <div className={styles.magicBox}>
        <div className={styles.magicHeader}>
          <div className={styles.magicTitleGroup}>
            <SmartAutoDistributeIcon size={19} />
            <h2 className={styles.magicTitle}>
              {isAr
                ? 'وكيل استقصاء المنتج وبناء البصمة الخوارزمية'
                : 'Product Intelligence & Algorithmic DNA Agent'}
            </h2>
            <span className={styles.magicBadge}>
              {isAr ? 'الوكيل 1 ⚡' : 'Agent 1 ⚡'}
            </span>
          </div>

          <div className={styles.actionRow}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowPromptTemplate((prev) => !prev)}
            >
              <HelpCircle size={14} aria-hidden="true" />
              <span>
                {isAr ? 'معاينة برومبت وكيل المنتج' : 'Preview Product Agent Prompt'}
              </span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyPromptTemplate}
            >
              {copiedPrompt ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
              <span>
                {copiedPrompt
                  ? isAr
                    ? 'تم نسخ برومبت الوكيل!'
                    : 'Agent Prompt Copied!'
                  : isAr
                    ? 'نسخ برومبت وكيل المنتج الذكي'
                    : 'Copy Smart Product Agent Prompt'}
              </span>
            </Button>
          </div>
        </div>

        <p className={styles.magicDesc}>
          {isAr
            ? '1) ضع رابط المنتج الحقيقي وروابط الصور/الفيديوهات في الخانتين أدناه ليتم تضمينها تلقائياً داخل برومبت الوكيل. 2) انسخ البرومبت وأعطه للوكيل ليفتح الصفحة والصور فعلياً في الويب. 3) الصق مخرجات الوكيل واضغط «توزيع المحتوى الذكي».'
            : '1) Enter the real product URL and image/video links below to embed them in the agent prompt. 2) Copy the prompt so the agent inspects the real page and images. 3) Paste the output and click Smart Auto-Fill.'}
        </p>

        {/* Pre-Prompt Inputs for Real Product URL & Unified Media URLs + 1-Click Canopy API Fetcher */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '12px',
            marginBottom: '12px',
            padding: '12px 14px',
            borderRadius: '12px',
            background: 'rgba(15, 23, 42, 0.35)',
            border: '1px solid rgba(45, 212, 191, 0.22)',
          }}
        >
          <div className={styles.fieldGroup} style={{ margin: 0 }}>
            <label className={styles.fieldLabel} style={{ fontSize: '12px', color: '#2DD4BF' }}>
              {isAr
                ? '🔗 الرابط الحقيقي للمنتج أو ASIN (أدخله واضغط جلب تلقائي عبر Canopy API)'
                : '🔗 Real Product URL or ASIN (Enter & click Auto-Fetch via Canopy API)'}
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <input
                type="text"
                value={agentSourceProductUrl}
                onChange={(e) => setAgentSourceProductUrl(e.target.value)}
                placeholder="https://www.amazon.com/dp/B09V3KXJPB أو رقم ASIN"
                className={styles.selectInput}
                style={{ fontSize: '12px', flex: '1 1 200px' }}
              />
              <Button
                type="button"
                size="sm"
                isLoading={fetchingCanopy}
                onClick={handleFetchViaCanopy}
                style={{
                  backgroundColor: '#0F766E',
                  color: '#ffffff',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                }}
              >
                <Zap size={14} />
                <span>
                  {isAr
                    ? 'جلب الصور والفيديوهات والبيانات تلقائياً (Canopy)'
                    : 'Auto-Fetch Media & Specs (Canopy)'}
                </span>
              </Button>
            </div>
          </div>

          <div className={styles.fieldGroup} style={{ margin: 0 }}>
            <label className={styles.fieldLabel} style={{ fontSize: '12px', color: '#2DD4BF' }}>
              {isAr
                ? '🖼️🎬 روابط الصور والفيديوهات (تُملأ تلقائياً بضغطة Canopy أو الصقها يدوياً)'
                : '🖼️🎬 Image & Video URLs (Auto-filled via Canopy or paste manually)'}
            </label>
            <textarea
              rows={2}
              value={agentRawMediaUrls}
              onChange={(e) => setAgentRawMediaUrls(e.target.value)}
              placeholder={
                isAr
                  ? 'تُجلب هنا تلقائياً جميع صور وفيديوهات المنتج عند الضغط على زر Canopy أعلاه...'
                  : 'Automatically populated by Canopy API or paste URLs here...'
              }
              className={styles.textareaInput}
              style={{ fontSize: '12px', minHeight: '56px' }}
            />
          </div>
        </div>

        {canopyFetchSummary && (
          <div
            style={{
              marginBottom: '12px',
              padding: '12px 14px',
              borderRadius: '12px',
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.32)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#10B981' }}>
                {isAr
                  ? `⚡ تم سحب بيانات المنتج والوسائط تلقائياً عبر Canopy API (${canopyFetchSummary.usedKeyLabel})`
                  : `⚡ Auto-Extracted Product & Media via Canopy API (${canopyFetchSummary.usedKeyLabel})`}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyPromptTemplate}
              >
                {copiedPrompt ? <Check size={13} color="#10B981" /> : <Copy size={13} />}
                <span>
                  {isAr
                    ? 'نسخ برومبت الوكيل المشبع ببيانات وصور Canopy 📋'
                    : 'Copy Agent Prompt with Canopy Data 📋'}
                </span>
              </Button>
            </div>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '10px',
                fontSize: '12px',
                color: 'var(--color-text-secondary)',
              }}
            >
              <span>
                🏷️ <strong>ASIN:</strong> {canopyFetchSummary.asin || '—'}
              </span>
              <span>•</span>
              <span>
                💵 <strong>{isAr ? 'السعر الفعلي:' : 'Price:'}</strong>{' '}
                {canopyFetchSummary.priceDisplay}
              </span>
              <span>•</span>
              <span>
                🖼️ <strong>{isAr ? 'الصور المسحوبة:' : 'Images:'}</strong>{' '}
                {canopyFetchSummary.imagesCount}
              </span>
              <span>•</span>
              <span>
                🎬 <strong>{isAr ? 'الفيديوهات المسحوبة:' : 'Videos:'}</strong>{' '}
                {canopyFetchSummary.videosCount}
              </span>
              <span>•</span>
              <span>
                📊 <strong>{isAr ? 'المواصفات الرسمية المدمجة في البرومبت:' : 'Specs Embedded:'}</strong>{' '}
                {canopyFetchSummary.specsCount}
              </span>
              {canopyFetchSummary.failoverOccurred && (
                <>
                  <span>•</span>
                  <span style={{ color: '#F59E0B', fontWeight: 700 }}>
                    🔄{' '}
                    {isAr
                      ? `تم الانتقال التلقائي بعد تخطي (${canopyFetchSummary.skippedKeysCount}) مفتاح منتهي الرصيد`
                      : `Auto-rotated after skipping (${canopyFetchSummary.skippedKeysCount}) exhausted key(s)`}
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        {showPromptTemplate && (
          <div className={styles.promptCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                {isAr
                  ? '📋 برومبت وكيل المنتج المخصص (مُدمج معه رابط المنتج وروابط الصور والفيديوهات أعلاه):'
                  : '📋 Dynamic Product Agent Prompt (with your product URL & media links embedded):'}
              </span>
              <Button type="button" variant="outline" size="sm" onClick={handleCopyPromptTemplate}>
                {copiedPrompt ? <Check size={13} color="#10B981" /> : <Copy size={13} />}
                <span>{isAr ? 'نسخ' : 'Copy'}</span>
              </Button>
            </div>
            <div className={styles.promptCode}>
              {dynamicPromptText}
            </div>
          </div>
        )}

        <textarea
          value={magicRawText}
          onChange={(e) => setMagicRawText(e.target.value)}
          placeholder={
            isAr
              ? 'الصق مخرجات وكيل المنتج هنا (سيقوم النظام بتعبئة العنوان، المواصفات، البصمة الخوارزمية للمقارنة، الصور مع أوصافها الدقيقة، الفيديوهات، وتجهيز بطاقة التسليم لوكيل المقالات)...'
              : 'Paste your Product Agent output here...'
          }
          className={styles.magicTextarea}
        />

        <div className={styles.actionRow}>
          <Button
            type="button"
            onClick={handleApplyMagicFill}
            style={{
              backgroundColor: '#0F766E',
              color: '#ffffff',
              fontWeight: 700,
            }}
          >
            <Wand2 size={16} aria-hidden="true" />
            <span>{isAr ? 'توزيع المحتوى الذكي على جميع الخانات ⚡' : 'Smart Auto-Fill All Fields ⚡'}</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyHandoffBrief}
          >
            {copiedHandoff ? <Check size={14} color="#10B981" /> : <Send size={14} />}
            <span>
              {copiedHandoff
                ? isAr
                  ? 'تم نسخ وحفظ بطاقة التسليم!'
                  : 'Handoff Card Copied!'
                : isAr
                  ? 'نسخ بطاقة التسليم لوكيل المقالات 📋'
                  : 'Copy Article Agent Handoff Card 📋'}
            </span>
          </Button>

          {magicRawText && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setMagicRawText('');
                setSmartFillSummary(null);
              }}
            >
              {isAr ? 'مسح النص' : 'Clear'}
            </Button>
          )}
        </div>

        {smartFillSummary && (
          <div
            style={{
              marginTop: '14px',
              padding: '14px 16px',
              borderRadius: '12px',
              background: 'rgba(45, 212, 191, 0.08)',
              border: '1px solid rgba(45, 212, 191, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '13px', color: '#2DD4BF' }}>
              {isAr
                ? `✅ تقرير وكيل المنتج: تم ملء (${smartFillSummary.fieldsCount}) خانة + بناء البصمة الخوارزمية + حفظ بطاقة التسليم لوكيل المقالات!`
                : `✅ Product Agent Report: Filled (${smartFillSummary.fieldsCount}) fields + Algorithmic DNA + Saved Article Handoff Card!`}
            </div>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '10px',
                fontSize: '12px',
                color: 'var(--color-text-secondary)',
              }}
            >
              <span>
                📂 {isAr ? 'الفئة:' : 'Category:'}{' '}
                <strong style={{ color: 'var(--color-text-primary)' }}>
                  {smartFillSummary.categoryLabel}
                </strong>{' '}
                {smartFillSummary.isNewCategory && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: '#10B981',
                      color: '#06281E',
                      padding: '2px 7px',
                      borderRadius: '99px',
                      fontWeight: 700,
                      fontSize: '11px',
                    }}
                  >
                    <AutoCategoryBadgeIcon size={13} />
                    <span>
                      {isAr ? 'فئة جديدة صُنعت تلقائياً' : 'New Category Auto-Created'}
                    </span>
                  </span>
                )}
              </span>
              <span>•</span>
              <span>
                🖼️ {isAr ? 'الصور وأوصافها الحقيقية:' : 'Images & Real Alt:'}{' '}
                <strong style={{ color: 'var(--color-text-primary)' }}>
                  {isAr
                    ? `${images.length} صور معتمدة مع أوصافها الدقيقة`
                    : `${images.length} verified images with exact alt descriptions`}
                </strong>
              </span>
              <span>•</span>
              <span>
                🎬 {isAr ? 'الفيديوهات المدمجة:' : 'Videos:'}{' '}
                <strong style={{ color: '#2DD4BF' }}>
                  {isAr ? `${videoUrls.length} فيديو` : `${videoUrls.length} video(s)`}
                </strong>
              </span>
            </div>

            {generatedHandoffBrief && (
              <div
                style={{
                  marginTop: '4px',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  background: 'rgba(15, 23, 42, 0.55)',
                  border: '1px solid rgba(45, 212, 191, 0.25)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}
              >
                <div style={{ fontSize: '12px', color: 'var(--color-text-primary)' }}>
                  <strong>
                    {isAr
                      ? '🤝 الترابط مع وكيل المقالات جاهز:'
                      : '🤝 Connected to Article Agent:'}
                  </strong>{' '}
                  {isAr
                    ? `تم حفظ بطاقة تسليم المنتج (${generatedHandoffBrief.productSlug}) في ذاكرة المتصفح لتنتقل معك تلقائياً إلى صفحة كتابة المقال.`
                    : `Handoff card for (${generatedHandoffBrief.productSlug}) saved in memory for the Article Agent.`}
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyHandoffBrief}
                  >
                    <Copy size={13} />
                    <span>
                      {isAr ? 'نسخ بطاقة التسليم' : 'Copy Handoff Brief'}
                    </span>
                  </Button>
                  <a
                    href="/admin/articles/new"
                    target="_blank"
                    rel="noreferrer"
                    className={styles.storefrontLink}
                    style={{ fontSize: '12px', padding: '5px 10px' }}
                  >
                    <ExternalLink size={13} />
                    <span>
                      {isAr
                        ? 'فتح وكيل المقالات لكتابة مقال لهذا المنتج'
                        : 'Open Article Agent for this Product'}
                    </span>
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} noValidate className={styles.card}>
        <div className={styles.formGrid}>
          <Input
            label={isAr ? 'المعرّف في الرابط (Slug - يُولّد تلقائياً)' : 'URL Slug (Auto-generated)'}
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="ergonomic-desk-lamp"
          />

          <div
            ref={affiliateFieldWrapRef}
            style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
          >
            <Input
              label={
                isAr
                  ? '🔗 رابط العمولة الخارجي (أدخله يدوياً — محمي ضد الروابط العادية)'
                  : '🔗 Partner Affiliate URL (Manual Only — Protected against plain links)'
              }
              value={affiliateUrl}
              onChange={(e) => {
                setAffiliateUrl(e.target.value);
                if (errorMessage) setErrorMessage('');
              }}
              placeholder="https://amzn.to/... أو رابط عمولتك الخاص"
              required
            />
            {!affiliateUrl.trim() ? (
              <span
                style={{
                  fontSize: '11.5px',
                  fontWeight: 600,
                  color: '#F59E0B',
                  lineHeight: 1.4,
                }}
              >
                {isAr
                  ? '⚠️ تذكير: هذه الخانة لا تُملأ تلقائياً لحماية عمولاتك — يرجى لصق رابط العمولة الخاص بك هنا قبل الحفظ.'
                  : '⚠️ Reminder: Never auto-filled to protect your commissions — paste your affiliate link here before saving.'}
              </span>
            ) : validateAdminAffiliateUrlGuard(affiliateUrl, agentSourceProductUrl).isInvalid ? (
              <span
                style={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  color: '#EF4444',
                  lineHeight: 1.4,
                }}
              >
                {isAr
                  ? validateAdminAffiliateUrlGuard(affiliateUrl, agentSourceProductUrl).reasonAr
                  : validateAdminAffiliateUrlGuard(affiliateUrl, agentSourceProductUrl).reasonEn}
              </span>
            ) : (
              <span
                style={{
                  fontSize: '11.5px',
                  fontWeight: 600,
                  color: '#10B981',
                  lineHeight: 1.4,
                }}
              >
                {isAr
                  ? '✓ رابط عمولة صالح وجاهز للحفظ'
                  : '✓ Valid affiliate link ready to save'}
              </span>
            )}
          </div>

          <Input
            label={isAr ? 'اسم المنتج (بالإنجليزية)' : 'Product Title (English)'}
            value={titleEn}
            onChange={(e) => setTitleEn(e.target.value)}
          />

          <Input
            label={isAr ? 'اسم المنتج (بالعربية)' : 'Product Title (Arabic)'}
            value={titleAr}
            onChange={(e) => setTitleAr(e.target.value)}
          />

          <Input
            label={isAr ? 'ملخص قصير (بالإنجليزية - اختياري)' : 'Short Summary (English - Optional)'}
            value={summaryEn}
            onChange={(e) => setSummaryEn(e.target.value)}
          />

          <Input
            label={isAr ? 'ملخص قصير (بالعربية - اختياري)' : 'Short Summary (Arabic - Optional)'}
            value={summaryAr}
            onChange={(e) => setSummaryAr(e.target.value)}
          />
        </div>

        <div className={styles.formGrid}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              {isAr ? 'لماذا اخترناه (بالإنجليزية - اختياري)' : 'Why We Picked It (English - Optional)'}
            </label>
            <textarea
              rows={3}
              value={whyEn}
              onChange={(e) => setWhyEn(e.target.value)}
              className={styles.textareaInput}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              {isAr ? 'لماذا اخترناه (بالعربية - اختياري)' : 'Why We Picked It (Arabic - Optional)'}
            </label>
            <textarea
              rows={3}
              value={whyAr}
              onChange={(e) => setWhyAr(e.target.value)}
              className={styles.textareaInput}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              {isAr ? 'ما يجب الانتباه له (بالإنجليزية - اختياري)' : 'What to Consider (English - Optional)'}
            </label>
            <textarea
              rows={3}
              value={considerEn}
              onChange={(e) => setConsiderEn(e.target.value)}
              className={styles.textareaInput}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              {isAr ? 'ما يجب الانتباه له (بالعربية - اختياري)' : 'What to Consider (Arabic - Optional)'}
            </label>
            <textarea
              rows={3}
              value={considerAr}
              onChange={(e) => setConsiderAr(e.target.value)}
              className={styles.textareaInput}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              {isAr ? 'الوصف التفصيلي (بالإنجليزية - اختياري)' : 'Detailed Description (English - Optional)'}
            </label>
            <textarea
              rows={4}
              value={descEn}
              onChange={(e) => setDescEn(e.target.value)}
              className={styles.textareaInput}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              {isAr ? 'الوصف التفصيلي (بالعربية - اختياري)' : 'Detailed Description (Arabic - Optional)'}
            </label>
            <textarea
              rows={4}
              value={descAr}
              onChange={(e) => setDescAr(e.target.value)}
              className={styles.textareaInput}
            />
          </div>
        </div>

        {/* Algorithmic Comparison DNA Card */}
        <div
          style={{
            padding: '16px',
            borderRadius: '14px',
            background: 'rgba(45, 212, 191, 0.04)',
            border: '1px solid rgba(45, 212, 191, 0.22)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div>
            <h3 className={styles.cardTitle} style={{ margin: 0, fontSize: '15px' }}>
              {isAr
                ? '🧬 البصمة الخوارزمية للمقارنة الذكية (Algorithmic Comparison DNA)'
                : '🧬 Algorithmic Comparison DNA'}
            </h3>
            <p className={styles.pageSubtitle} style={{ marginTop: '4px', fontSize: '12px' }}>
              {isAr
                ? 'تُعبأ هذه البيانات تلقائياً بواسطة وكيل المنتج لتغذية خوارزمية المقارنة الحية في الموقع، بحيث تظل المقارنة عادلة ومتجددة بين أي منتج قديم أو جديد دون الحاجة لـ "منتج فائز وهمي".'
                : 'Auto-populated by the Product Agent to power the live algorithmic comparison engine across old and new products without fake static winners.'}
            </p>
          </div>

          <div className={styles.formGrid}>
            <Input
              label={isAr ? 'الاستخدام الأنسب (بالعربية)' : 'Best For Use-Case (Arabic)'}
              value={bestForAr}
              onChange={(e) => setBestForAr(e.target.value)}
              placeholder="مثال: للعمل المكتبي المكثف والسفر"
            />
            <Input
              label={isAr ? 'الاستخدام الأنسب (بالإنجليزية)' : 'Best For Use-Case (English)'}
              value={bestForEn}
              onChange={(e) => setBestForEn(e.target.value)}
              placeholder="e.g. Heavy remote work & travel"
            />
            <Input
              label={
                isAr
                  ? 'المواصفات الثلاث للمقارنة (بالعربية — مفصولة بـ |)'
                  : '3 Key Comparison Specs (Arabic — separated by |)'
              }
              value={keySpecsArText}
              onChange={(e) => setKeySpecsArText(e.target.value)}
              placeholder="قدرة 200 واط | بطارية 27650mAh | شاشة ذكية"
            />
            <Input
              label={
                isAr
                  ? 'المواصفات الثلاث للمقارنة (بالإنجليزية — مفصولة بـ |)'
                  : '3 Key Comparison Specs (English — separated by |)'
              }
              value={keySpecsEnText}
              onChange={(e) => setKeySpecsEnText(e.target.value)}
              placeholder="200W Output | 27650mAh Capacity | Smart Display"
            />
          </div>

          <div className={styles.actionRow}>
            <Input
              type="number"
              min="50"
              max="99"
              label={isAr ? 'مؤشر الأداء (50–99)' : 'Performance Score (50–99)'}
              value={performanceScore}
              onChange={(e) => setPerformanceScore(e.target.value)}
              placeholder="92"
            />
            <Input
              type="number"
              min="50"
              max="99"
              label={isAr ? 'مؤشر القيمة مقابل السعر (50–99)' : 'Value Score (50–99)'}
              value={valueScore}
              onChange={(e) => setValueScore(e.target.value)}
              placeholder="94"
            />
            <Input
              type="number"
              min="50"
              max="99"
              label={isAr ? 'مؤشر الاعتمادية والجودة (50–99)' : 'Reliability Score (50–99)'}
              value={reliabilityScore}
              onChange={(e) => setReliabilityScore(e.target.value)}
              placeholder="91"
            />
          </div>
        </div>

        {/* Store, Category & Pricing */}
        <div className={styles.formGrid}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              {isAr ? 'المتجر الشريك (Source)' : 'Partner Store'}
            </label>
            <select
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
              className={styles.selectInput}
            >
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {t(s.name)}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.fieldGroup}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className={styles.fieldLabel}>
                {isAr ? 'فئة المنتج (Category)' : 'Product Category'}
              </label>
              <a
                href="/admin/categories"
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: '12px', color: 'var(--color-primary, #2DD4BF)', textDecoration: 'underline' }}
              >
                {isAr ? '+ إدارة الفئات' : '+ Manage Categories'}
              </a>
            </div>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={styles.selectInput}
              required
            >
              {localCategories.length === 0 ? (
                <option value="">
                  {isAr ? 'لا توجد فئات بعد (أضف فئة من صفحة الفئات)' : 'No categories yet (Add in Categories page)'}
                </option>
              ) : (
                localCategories.map((c) => (
                  <option key={c.id || c.slug} value={c.slug || c.id}>
                    {c.icon ? `${c.icon} ` : ''}
                    {isAr ? c.name?.ar || c.name?.en : c.name?.en || c.name?.ar} ({c.slug})
                  </option>
                ))
              )}
            </select>
            {aiCreatedCategoryInfo && categoryId === aiCreatedCategoryInfo.slug && (
              <span
                style={{
                  fontSize: '11px',
                  color: '#10B981',
                  marginTop: '4px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <AutoCategoryBadgeIcon size={14} />
                <span>
                  {isAr
                    ? `فئة جديدة ابتكرها الوكيل (${aiCreatedCategoryInfo.icon} ${aiCreatedCategoryInfo.nameAr}) وتمت إضافتها للمتجر تلقائياً.`
                    : `New category created by AI (${aiCreatedCategoryInfo.icon} ${aiCreatedCategoryInfo.nameEn}).`}
                </span>
              </span>
            )}
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              {isAr ? 'سياسة عرض السعر' : 'Price Display Policy'}
            </label>
            <select
              value={priceDisplayPolicy}
              onChange={(e) => setPriceDisplayPolicy(e.target.value as PriceDisplayPolicy)}
              className={styles.selectInput}
            >
              <option value="show_with_timestamp">
                {isAr
                  ? 'عرض السعر مع تاريخ التحقق'
                  : 'Show Price With Checked Timestamp'}
              </option>
              <option value="hide_price_check_store">
                {isAr
                  ? 'إخفاء السعر وتوجيه الزائر لفحص السعر الحي (موصى به لـ Amazon)'
                  : 'Hide Static Price — Check Live on Store (Recommended for Amazon)'}
              </option>
            </select>
          </div>

          <div className={styles.actionRow}>
            <div ref={priceFieldWrapRef} style={{ flex: 1, minWidth: '180px' }}>
              <Input
                type="number"
                step="0.01"
                min="0"
                label={isAr ? 'السعر الجديد (الحالي) * إجباري' : 'Current Price * Required'}
                value={priceAmount}
                onChange={(e) => setPriceAmount(e.target.value)}
                placeholder="49.99"
                required
              />
            </div>

            <Input
              type="number"
              step="0.01"
              min="0"
              label={isAr ? 'السعر القديم (قبل الخصم - اختياري)' : 'Old Price (Optional)'}
              value={oldPrice}
              onChange={(e) => setOldPrice(e.target.value)}
              placeholder="79.99"
            />

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>
                {isAr ? 'عملة الإدخال الأساسية (تحويل ذكي حسب دولة الزائر)' : 'Base Currency (Auto-converts by visitor country)'}
              </label>
              <select
                value={priceCurrency}
                onChange={(e) => setPriceCurrency(e.target.value)}
                className={styles.selectInput}
              >
                <option value="USD">USD ($) — افتراضي ذكي (يتحول لعملة دولة الزائر)</option>
                <option value="MAD">MAD (د.م. — درهم مغربي)</option>
                <option value="DH">DH (درهم)</option>
                <option value="SAR">SAR (ر.س — ريال سعودي)</option>
                <option value="AED">AED (د.إ — درهم إماراتي)</option>
                <option value="EUR">EUR (€ — يورو)</option>
                <option value="GBP">GBP (£ — جنيه إسترليني)</option>
                <option value="KWD">KWD (د.ك — دينار كويتي)</option>
                <option value="QAR">QAR (ر.ق — ريال قطري)</option>
                <option value="EGP">EGP (ج.م — جنيه مصري)</option>
              </select>
            </div>
          </div>

          <div className={styles.actionRow}>
            <Input
              type="number"
              min="1"
              max="99"
              label={isAr ? 'نسبة الخصم % (اختياري أو يُحسب تلقائياً)' : 'Discount % (Optional)'}
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              placeholder="44"
            />

            <Input
              type="number"
              step="0.1"
              min="1"
              max="5"
              label={isAr ? 'النجوم (1 إلى 5 - اختياري)' : 'Stars Rating (1–5)'}
              value={stars}
              onChange={(e) => setStars(e.target.value)}
              placeholder="4.5"
            />

            <Input
              type="number"
              min="0"
              label={isAr ? 'عدد المبيعات (اختياري)' : 'Sold Count (Optional)'}
              value={soldCount}
              onChange={(e) => setSoldCount(e.target.value)}
              placeholder="546"
            />

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>
                {isAr ? 'شارة العرض (اختياري)' : 'Promo Badge (Optional)'}
              </label>
              <select
                value={badge || ''}
                onChange={(e) =>
                  setBadge(
                    e.target.value === 'توفير' || e.target.value === 'اليوم الأخير'
                      ? e.target.value
                      : null
                  )
                }
                className={styles.selectInput}
              >
                <option value="">{isAr ? 'بدون شارة' : 'None'}</option>
                <option value="توفير">{isAr ? 'توفير (أخضر)' : 'Savings (توفير)'}</option>
                <option value="اليوم الأخير">
                  {isAr ? 'اليوم الأخير (برتقالي)' : 'Last Day (اليوم الأخير)'}
                </option>
              </select>
            </div>
          </div>

          <Input
            label={isAr ? 'الوسوم (مفصولة بفواصل)' : 'Tags (comma-separated)'}
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            placeholder="workspace, lighting, minimal"
          />

          <div className={styles.actionRow}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>
                {isAr ? 'حالة النشر' : 'Status'}
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProductStatus)}
                className={styles.selectInput}
              >
                <option value="published">{isAr ? 'منشور' : 'Published'}</option>
                <option value="draft">{isAr ? 'مسودة' : 'Draft'}</option>
                <option value="archived">{isAr ? 'مؤرشف' : 'Archived'}</option>
              </select>
            </div>

            <label className={styles.actionRow}>
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
              />
              <span className={styles.fieldLabel}>
                {isAr ? 'منتج مميز في الرئيسية' : 'Featured on Home Page'}
              </span>
            </label>
          </div>
        </div>

        {/* Unified Product Media Section (Images + Multiple Videos) */}
        <div className={styles.fieldGroup}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <h2 className={styles.cardTitle} style={{ margin: 0 }}>
              {isAr
                ? `وسائط المنتج الموحدة: الصور (${images.length}) + الفيديوهات (${videoUrls.length})`
                : `Unified Product Media: Images (${images.length}) + Videos (${videoUrls.length})`}
            </h2>
            {images.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRefreshSmartAltTexts}
              >
                <Wand2 size={14} aria-hidden="true" />
                <span>
                  {isAr
                    ? '⚡ تحديث أوصاف Alt الذكية للصور'
                    : '⚡ Refresh Smart Image Alt Tags'}
                </span>
              </Button>
            )}
          </div>

          <p className={styles.pageSubtitle} style={{ marginTop: '4px' }}>
            {isAr
              ? 'خانة موحدة تدعم إضافة روابط الصور وروابط الفيديوهات معاً (YouTube, Shorts, TikTok, Vimeo, MP4...). يمكنك لصق رابط واحد أو عدة روابط دفعة واحدة وسيقوم النظام بفرز الصور عن الفيديوهات تلقائياً ودعم أكثر من فيديو في معرض المنتج.'
              : 'Unified media input supporting both image URLs and multiple video URLs (YouTube, Shorts, TikTok, Vimeo, MP4...). Paste one or multiple links and the system will classify them automatically.'}
          </p>

          {cloudinaryReady ? (
            <div className={styles.actionRow}>
              <label className={styles.storefrontLink}>
                <Upload size={15} aria-hidden="true" />
                <span>
                  {uploadingImage
                    ? isAr
                      ? 'جاري الرفع...'
                      : 'Uploading...'
                    : isAr
                      ? 'رفع صورة عبر Cloudinary الموقّع'
                      : 'Upload via Signed Cloudinary'}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  onChange={handleFileUpload}
                  disabled={uploadingImage}
                  hidden
                />
              </label>
            </div>
          ) : (
            <p className={styles.pageSubtitle}>
              {isAr
                ? 'يمكنك لصق روابط صور وفيديوهات HTTPS مباشرة في الخانة الموحدة أدناه.'
                : 'Paste direct HTTPS image and video URLs in the unified input below.'}
            </p>
          )}

          <div className={styles.actionRow}>
            <input
              type="text"
              value={manualMediaUrl}
              onChange={(e) => setManualMediaUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddManualMedia();
                }
              }}
              placeholder={
                isAr
                  ? 'الصق رابط صورة أو رابط فيديو (أو عدة روابط مفصولة بفاصلة)...'
                  : 'Paste an image URL or video URL (or multiple comma-separated URLs)...'
              }
              className={styles.selectInput}
            />
            <Button type="button" variant="outline" onClick={handleAddManualMedia}>
              <Plus size={15} aria-hidden="true" />
              <span>{isAr ? 'إضافة صورة / فيديو' : 'Add Image / Video'}</span>
            </Button>
          </div>

          {(images.length > 0 || videoUrls.length > 0) && (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{isAr ? 'الوسائط (صورة / فيديو)' : 'Media (Image / Video)'}</th>
                    <th>
                      {isAr
                        ? 'النص البديل للصورة (Google Images Alt) / رابط الفيديو'
                        : 'Bilingual SEO Alt Text / Video URL'}
                    </th>
                    <th>{isAr ? 'حذف' : 'Remove'}</th>
                  </tr>
                </thead>
                <tbody>
                  {images.map((img, idx) => {
                    const hasAiSlot = Boolean(aiAltTextsAr[idx] || aiAltTextsEn[idx]);
                    return (
                      <tr key={`img-${img.url.slice(0, 40)}-${idx}`}>
                        <td style={{ verticalAlign: 'top', width: '150px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <img
                              src={img.url}
                              alt={img.alt?.ar || img.alt?.en || 'Preview'}
                              width={84}
                              height={64}
                              style={{ borderRadius: '8px', objectFit: 'cover' }}
                              referrerPolicy="no-referrer"
                            />
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                color: '#2DD4BF',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <ImageIcon size={12} />
                              <span>
                                {hasAiSlot
                                  ? isAr
                                    ? `صورة #${idx + 1} (فحص الوكيل)`
                                    : `Image #${idx + 1} (Agent Verified)`
                                  : isAr
                                    ? `صورة #${idx + 1}`
                                    : `Image #${idx + 1}`}
                              </span>
                            </span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <input
                              type="text"
                              value={img.alt?.ar || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setImages((prev) =>
                                  prev.map((item, i) =>
                                    i === idx
                                      ? { ...item, alt: { ...item.alt, ar: val } }
                                      : item
                                  )
                                );
                              }}
                              placeholder={
                                isAr
                                  ? `وصف Alt بالعربية للصورة #${idx + 1}`
                                  : `Arabic Alt text #${idx + 1}`
                              }
                              className={styles.selectInput}
                              style={{ fontSize: '12px' }}
                            />
                            <input
                              type="text"
                              value={img.alt?.en || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setImages((prev) =>
                                  prev.map((item, i) =>
                                    i === idx
                                      ? { ...item, alt: { ...item.alt, en: val } }
                                      : item
                                  )
                                );
                              }}
                              placeholder={
                                isAr
                                  ? `وصف Alt بالإنجليزية للصورة #${idx + 1}`
                                  : `English Alt text #${idx + 1}`
                              }
                              className={styles.selectInput}
                              style={{ fontSize: '12px' }}
                            />
                          </div>
                        </td>
                        <td style={{ verticalAlign: 'top', width: '60px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              const currentCat = localCategories.find(
                                (c) => c.slug === categoryId || c.id === categoryId
                              );
                              setImages((prev) =>
                                applySmartAltTextsToImages(
                                  prev.filter((_, i) => i !== idx),
                                  aiAltTextsAr,
                                  aiAltTextsEn,
                                  {
                                    titleAr,
                                    titleEn,
                                    categoryNameAr:
                                      currentCat?.name?.ar || aiCreatedCategoryInfo?.nameAr,
                                    categoryNameEn:
                                      currentCat?.name?.en || aiCreatedCategoryInfo?.nameEn,
                                    tags: tagsText,
                                  }
                                )
                              );
                            }}
                            className={styles.topBarBtn}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {videoUrls.map((vUrl, vIdx) => {
                    const isDirectMp4 = /\.(mp4|webm|mov|m4v|ogv)(\b|$)/i.test(
                      vUrl.split(/[?#]/)[0] || ''
                    );
                    const thumbUrl =
                      videoThumbnails[vUrl] || (!isDirectMp4 && images[0]?.url ? images[0].url : '');
                    return (
                      <tr key={`vid-${vUrl.slice(0, 40)}-${vIdx}`}>
                        <td style={{ verticalAlign: 'top', width: '150px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div
                              style={{
                                position: 'relative',
                                width: '84px',
                                height: '64px',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                background: '#111827',
                                border: '1px solid rgba(45, 212, 191, 0.45)',
                              }}
                            >
                              {thumbUrl ? (
                                <img
                                  src={thumbUrl}
                                  alt={`Video #${vIdx + 1}`}
                                  width={84}
                                  height={64}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  referrerPolicy="no-referrer"
                                />
                              ) : isDirectMp4 ? (
                                <video
                                  src={`${vUrl}#t=0.8`}
                                  muted
                                  playsInline
                                  preload="metadata"
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  onLoadedMetadata={(e) => {
                                    try {
                                      const dur = e.currentTarget.duration;
                                      e.currentTarget.currentTime =
                                        Number.isFinite(dur) && dur > 1 ? 0.8 : 0.1;
                                    } catch {
                                      // Ignore seek errors
                                    }
                                  }}
                                />
                              ) : null}
                              <span
                                style={{
                                  position: 'absolute',
                                  inset: 0,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  background: 'rgba(0,0,0,0.28)',
                                  color: '#2DD4BF',
                                  fontSize: '14px',
                                }}
                                aria-hidden="true"
                              >
                                ▶
                              </span>
                            </div>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                color: '#F59E0B',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <Film size={12} />
                              <span>
                                {isAr ? `فيديو #${vIdx + 1}` : `Video #${vIdx + 1}`}
                              </span>
                            </span>
                          </div>
                        </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <input
                            type="text"
                            value={vUrl}
                            onChange={(e) => {
                              const val = e.target.value;
                              setVideoUrls((prev) =>
                                prev.map((item, i) => (i === vIdx ? val : item))
                              );
                            }}
                            placeholder="https://www.youtube.com/watch?v=... أو رابط الفيديو"
                            className={styles.selectInput}
                            style={{ fontSize: '12px' }}
                          />
                        </div>
                      </td>
                        <td style={{ verticalAlign: 'top', width: '60px' }}>
                          <button
                            type="button"
                            onClick={() =>
                              setVideoUrls((prev) => prev.filter((_, i) => i !== vIdx))
                            }
                            className={styles.topBarBtn}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {errorMessage && (
          <div className={styles.alertBanner} role="alert">
            {errorMessage}
          </div>
        )}

        <div className={styles.actionRow}>
          <Button type="submit" size="lg" isLoading={saving}>
            {isAr ? 'حفظ المنتج' : 'Save Product'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push('/admin/products')}
          >
            {isAr ? 'إلغاء' : 'Cancel'}
          </Button>
        </div>
      </form>
    </>
  );
}
