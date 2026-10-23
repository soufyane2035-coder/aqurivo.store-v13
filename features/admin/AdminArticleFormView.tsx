'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  HelpCircle,
  Link2,
  Package,
  Palette,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { SmartAutoDistributeIcon } from '@/components/ui/AqurivoContextIcons';
import type { Article, ArticleFaqItem, Category, Product } from '@/types';
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
import {
  AFFILIATE_CTA_COLOR_PRESETS,
  type AgentHandoffBrief,
  applyAffiliateCtaStylingToHtml,
  buildDynamicArticleAiPrompt,
  clearSavedAgentHandoffBrief,
  formatAgentHandoffBriefText,
  getSavedAgentHandoffBrief,
  normalizeHexColor,
  parseMagicArticleContent,
  saveAgentHandoffBrief,
} from '@/lib/magicContentParser';
import styles from './AdminShell.module.css';

interface AdminArticleFormViewProps {
  existingArticle?: Article | null;
  categories: Category[];
  products: Product[];
  allArticles?: Article[];
}

function findMatchingProduct(query: string, products: Product[]): Product | undefined {
  const raw = query.trim();
  if (!raw) return undefined;

  const ignoreTokens = ['لا يوجد', 'none', 'n/a', 'null', 'تلقائي', 'auto', '-'];
  if (ignoreTokens.includes(raw.toLowerCase())) return undefined;

  // Extract slug if the AI pasted a full product URL like https://aqurivo.store/ar/products/my-slug
  const urlSlugMatch = raw.match(/\/products\/([^/?#\s"']+)/i);
  const cleaned = (urlSlugMatch ? urlSlugMatch[1] : raw)
    .replace(/^\[slug:\s*|\s*\]$/gi, '')
    .trim()
    .toLowerCase();

  if (!cleaned) return undefined;

  // 1. Exact ID, slug, or title match
  const exact = products.find(
    (p) =>
      p.id.toLowerCase() === cleaned ||
      p.slug.toLowerCase() === cleaned ||
      p.title.ar?.trim().toLowerCase() === cleaned ||
      p.title.en?.trim().toLowerCase() === cleaned
  );
  if (exact) return exact;

  // 2. Partial slug or title inclusion match
  return products.find(
    (p) =>
      p.slug.toLowerCase().includes(cleaned) ||
      cleaned.includes(p.slug.toLowerCase()) ||
      (p.title.ar && p.title.ar.toLowerCase().includes(cleaned)) ||
      (p.title.en && p.title.en.toLowerCase().includes(cleaned)) ||
      (p.title.ar && cleaned.includes(p.title.ar.toLowerCase())) ||
      (p.title.en && cleaned.includes(p.title.en.toLowerCase()))
  );
}

export function AdminArticleFormView({
  existingArticle,
  categories,
  products,
  allArticles = [],
}: AdminArticleFormViewProps) {
  const { locale, t } = useI18n();
  const { csrfToken } = useSaved();
  const { showToast } = useToast();
  const router = useRouter();
  const isAr = locale === 'ar';

  const [magicRawText, setMagicRawText] = useState('');
  const [slug, setSlug] = useState(existingArticle?.slug || '');
  const [titleEn, setTitleEn] = useState(existingArticle?.title.en || '');
  const [titleAr, setTitleAr] = useState(existingArticle?.title.ar || '');
  const [excerptEn, setExcerptEn] = useState(existingArticle?.excerpt.en || '');
  const [excerptAr, setExcerptAr] = useState(existingArticle?.excerpt.ar || '');
  const [contentEn, setContentEn] = useState(existingArticle?.contentHtml.en || '');
  const [contentAr, setContentAr] = useState(existingArticle?.contentHtml.ar || '');
  const [editorVerdictAr, setEditorVerdictAr] = useState(
    existingArticle?.editorVerdict?.ar || ''
  );
  const [editorVerdictEn, setEditorVerdictEn] = useState(
    existingArticle?.editorVerdict?.en || ''
  );
  const [authorName, setAuthorName] = useState(
    existingArticle?.authorName || 'AQURIVO Editorial Team'
  );
  const [seoTitleAr, setSeoTitleAr] = useState(existingArticle?.seoTitle?.ar || '');
  const [seoTitleEn, setSeoTitleEn] = useState(existingArticle?.seoTitle?.en || '');
  const [seoDescriptionAr, setSeoDescriptionAr] = useState(
    existingArticle?.seoDescription?.ar || ''
  );
  const [seoDescriptionEn, setSeoDescriptionEn] = useState(
    existingArticle?.seoDescription?.en || ''
  );
  const [seoKeywords, setSeoKeywords] = useState(
    (existingArticle?.seoKeywords || []).join(', ')
  );
  const [faqItems, setFaqItems] = useState<ArticleFaqItem[]>(
    existingArticle?.faqItems || []
  );

  const [coverImage, setCoverImage] = useState(existingArticle?.coverImage || '');
  const [categoryId, setCategoryId] = useState(
    existingArticle?.categoryId || categories[0]?.id || 'general'
  );
  const [readingTimeMinutes, setReadingTimeMinutes] = useState(
    String(existingArticle?.readingTimeMinutes || 5)
  );
  const [status, setStatus] = useState<'published' | 'draft'>(
    existingArticle?.status || 'published'
  );
  const [relatedProductIds, setRelatedProductIds] = useState<string[]>(
    existingArticle?.relatedProductIds || []
  );

  // Connected Product Agent Handoff Brief state
  const [activeHandoffBrief, setActiveHandoffBrief] = useState<AgentHandoffBrief | null>(
    null
  );
  const [affiliateCtaUrl, setAffiliateCtaUrl] = useState<string>(() => {
    const initialAr = existingArticle?.contentHtml?.ar || '';
    const hrefMatch = initialAr.match(
      /<a\b[^>]*data-affiliate-cta\s*=\s*(['"]?)true\1[^>]*href\s*=\s*(['"])(.*?)\2/i
    ) || initialAr.match(
      /<a\b[^>]*href\s*=\s*(['"])(.*?)\1[^>]*data-affiliate-cta\s*=\s*(['"]?)true\3/i
    );
    return hrefMatch ? (hrefMatch[3] || hrefMatch[2] || '').trim() : '';
  });
  const [affiliateCtaColor, setAffiliateCtaColor] = useState<string>(() => {
    const initialAr = existingArticle?.contentHtml?.ar || '';
    const colorMatch = initialAr.match(/data-cta-color\s*=\s*(['"])(#[0-9a-fA-F]{3,6})\1/i);
    return colorMatch ? normalizeHexColor(colorMatch[2], '#EA580C') : '#EA580C';
  });
  const [showPromptPreview, setShowPromptPreview] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // Articles tracking for product badges & filters
  const [articlesList, setArticlesList] = useState<Article[]>(allArticles || []);

  useEffect(() => {
    if (allArticles && allArticles.length > 0) {
      setArticlesList(allArticles);
    } else {
      fetch('/api/admin/articles')
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
          const list = Array.isArray(data) ? data : data?.articles;
          if (Array.isArray(list) && list.length > 0) {
            setArticlesList(list);
          }
        })
        .catch(() => {});
    }
  }, [allArticles]);

  // Searchable Visual Product Picker state (Handoff Brief)
  const [isHandoffPickerOpen, setIsHandoffPickerOpen] = useState(false);
  const [handoffSearchQuery, setHandoffSearchQuery] = useState('');
  const [handoffCategoryFilter, setHandoffCategoryFilter] = useState('all');
  const [handoffArticleStatusFilter, setHandoffArticleStatusFilter] = useState<
    'all' | 'without' | 'with'
  >('all');

  // Searchable Visual Product Picker state (Bottom Recommended Products)
  const [linkedSearchQuery, setLinkedSearchQuery] = useState('');
  const [linkedCategoryFilter, setLinkedCategoryFilter] = useState('all');
  const [linkedArticleStatusFilter, setLinkedArticleStatusFilter] = useState<
    'all' | 'without' | 'with'
  >('all');

  // Map of product ID and product Slug to the articles covering it
  const productArticlesMap = useMemo(() => {
    const map = new Map<
      string,
      { hasArticle: boolean; count: number; articleTitles: string }
    >();

    for (const prod of products) {
      const prodId = (prod.id || '').toLowerCase();
      const prodSlug = (prod.slug || '').toLowerCase();

      const matchingArticles = articlesList.filter((art) => {
        const topPick = (art.topPickProductId || '').toLowerCase();
        if (topPick && (topPick === prodId || topPick === prodSlug)) return true;

        if (Array.isArray(art.relatedProductIds) && art.relatedProductIds.length > 0) {
          const matchRelated = art.relatedProductIds.some((rId) => {
            const low = (rId || '').toLowerCase();
            return low === prodId || low === prodSlug;
          });
          if (matchRelated) return true;
        }

        const artSlug = (art.slug || '').toLowerCase();
        if (artSlug && (artSlug === prodSlug || artSlug.includes(prodSlug))) return true;

        const bodyAr = art.contentHtml?.ar || '';
        const bodyEn = art.contentHtml?.en || '';
        if (
          (prodSlug &&
            (bodyAr.includes(`/products/${prod.slug}`) ||
              bodyEn.includes(`/products/${prod.slug}`))) ||
          (prodId && (bodyAr.includes(prod.id) || bodyEn.includes(prod.id)))
        ) {
          return true;
        }

        return false;
      });

      const titleList = matchingArticles
        .map((a) => (isAr ? a.title?.ar || a.title?.en : a.title?.en || a.title?.ar))
        .filter(Boolean)
        .join(' • ');

      const info = {
        hasArticle: matchingArticles.length > 0,
        count: matchingArticles.length,
        articleTitles: titleList,
      };

      map.set(prod.id, info);
      map.set(prod.slug, info);
    }

    return map;
  }, [products, articlesList, isAr]);

  const { handoffTotalWithout, handoffTotalWith } = useMemo(() => {
    let withoutCount = 0;
    let withCount = 0;
    for (const p of products) {
      const info = productArticlesMap.get(p.id) || productArticlesMap.get(p.slug);
      if (info?.hasArticle) {
        withCount++;
      } else {
        withoutCount++;
      }
    }
    return { handoffTotalWithout: withoutCount, handoffTotalWith: withCount };
  }, [products, productArticlesMap]);

  const { linkedTotalWithout, linkedTotalWith } = useMemo(() => {
    let withoutCount = 0;
    let withCount = 0;
    for (const p of products) {
      const info = productArticlesMap.get(p.id) || productArticlesMap.get(p.slug);
      if (info?.hasArticle) {
        withCount++;
      } else {
        withoutCount++;
      }
    }
    return { linkedTotalWithout: withoutCount, linkedTotalWith: withCount };
  }, [products, productArticlesMap]);

  const filteredHandoffProducts = useMemo(() => {
    const q = handoffSearchQuery.trim().toLowerCase();
    const filtered = products.filter((p) => {
      if (
        handoffCategoryFilter !== 'all' &&
        p.categoryId !== handoffCategoryFilter &&
        p.categorySlug !== handoffCategoryFilter
      ) {
        return false;
      }

      const statusInfo =
        productArticlesMap.get(p.id) || productArticlesMap.get(p.slug);
      const hasArticle = statusInfo?.hasArticle ?? false;

      if (handoffArticleStatusFilter === 'without' && hasArticle) {
        return false;
      }
      if (handoffArticleStatusFilter === 'with' && !hasArticle) {
        return false;
      }

      if (q) {
        const hay = `${p.title.ar || ''} ${p.title.en || ''} ${p.slug} ${
          p.sourceName?.ar || ''
        } ${p.sourceName?.en || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    // Sort: products WITHOUT article first at top; products WITH article at the bottom!
    return [...filtered].sort((a, b) => {
      const aHas =
        productArticlesMap.get(a.id)?.hasArticle ||
        productArticlesMap.get(a.slug)?.hasArticle
          ? 1
          : 0;
      const bHas =
        productArticlesMap.get(b.id)?.hasArticle ||
        productArticlesMap.get(b.slug)?.hasArticle
          ? 1
          : 0;
      if (aHas !== bHas) {
        return aHas - bHas;
      }
      return 0;
    });
  }, [
    products,
    handoffSearchQuery,
    handoffCategoryFilter,
    handoffArticleStatusFilter,
    productArticlesMap,
  ]);

  const filteredLinkedProducts = useMemo(() => {
    const q = linkedSearchQuery.trim().toLowerCase();
    const filtered = products.filter((p) => {
      if (
        linkedCategoryFilter !== 'all' &&
        p.categoryId !== linkedCategoryFilter &&
        p.categorySlug !== linkedCategoryFilter
      ) {
        return false;
      }

      const statusInfo =
        productArticlesMap.get(p.id) || productArticlesMap.get(p.slug);
      const hasArticle = statusInfo?.hasArticle ?? false;

      if (linkedArticleStatusFilter === 'without' && hasArticle) {
        return false;
      }
      if (linkedArticleStatusFilter === 'with' && !hasArticle) {
        return false;
      }

      if (q) {
        const hay = `${p.title.ar || ''} ${p.title.en || ''} ${p.slug} ${
          p.sourceName?.ar || ''
        } ${p.sourceName?.en || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    // Sort: products WITHOUT article first at top; products WITH article at the bottom!
    return [...filtered].sort((a, b) => {
      const aHas =
        productArticlesMap.get(a.id)?.hasArticle ||
        productArticlesMap.get(a.slug)?.hasArticle
          ? 1
          : 0;
      const bHas =
        productArticlesMap.get(b.id)?.hasArticle ||
        productArticlesMap.get(b.slug)?.hasArticle
          ? 1
          : 0;
      if (aHas !== bHas) {
        return aHas - bHas;
      }
      return 0;
    });
  }, [
    products,
    linkedSearchQuery,
    linkedCategoryFilter,
    linkedArticleStatusFilter,
    productArticlesMap,
  ]);

  const selectedHandoffProduct = useMemo(() => {
    if (!activeHandoffBrief?.productSlug) return undefined;
    return products.find((p) => p.slug === activeHandoffBrief.productSlug);
  }, [products, activeHandoffBrief]);

  useEffect(() => {
    const saved = getSavedAgentHandoffBrief();
    if (saved) {
      setActiveHandoffBrief(saved);
      if (saved.sourceProductUrl) {
        setAffiliateCtaUrl((prev) => prev || saved.sourceProductUrl || '');
      }
      if (!existingArticle) {
        if (saved.images?.[0]?.url) {
          setCoverImage((prev) => prev || saved.images[0].url);
        }
        if (saved.categorySlug) {
          const matchedCat = categories.find(
            (c) =>
              c.slug.toLowerCase() === saved.categorySlug.toLowerCase() ||
              c.id.toLowerCase() === saved.categorySlug.toLowerCase()
          );
          if (matchedCat) {
            setCategoryId(matchedCat.id);
          }
        }
        if (saved.productSlug) {
          const matchedProd = findMatchingProduct(saved.productSlug, products);
          if (matchedProd) {
            setRelatedProductIds((prev) =>
              prev.includes(matchedProd.id) ? prev : [matchedProd.id, ...prev]
            );
          }
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectProductForHandoff = (productIdOrSlug: string) => {
    if (!productIdOrSlug) {
      setActiveHandoffBrief(null);
      return;
    }
    const found = products.find(
      (p) => p.id === productIdOrSlug || p.slug === productIdOrSlug
    );
    if (!found) return;

    const matchedCat = categories.find(
      (c) => c.id === found.categoryId || c.slug === found.categorySlug
    );
    const preservedNotes =
      activeHandoffBrief?.productSlug === found.slug
        ? activeHandoffBrief.handoffNotes
        : undefined;

    const brief: AgentHandoffBrief = {
      productSlug: found.slug,
      titleAr: found.title.ar || found.title.en || found.slug,
      titleEn: found.title.en || found.title.ar || found.slug,
      categorySlug: found.categorySlug || found.categoryId || 'general',
      categoryNameAr: matchedCat?.name?.ar,
      categoryNameEn: matchedCat?.name?.en,
      sourceId: found.sourceId || undefined,
      priceUsd:
        found.priceAmount !== null && found.priceAmount !== undefined
          ? String(found.priceAmount)
          : undefined,
      oldPriceUsd:
        found.oldPrice !== null && found.oldPrice !== undefined
          ? String(found.oldPrice)
          : undefined,
      discount:
        found.discount !== null && found.discount !== undefined
          ? String(found.discount)
          : undefined,
      stars:
        found.stars !== null && found.stars !== undefined
          ? String(found.stars)
          : undefined,
      sourceProductUrl: found.affiliateUrl || undefined,
      storePathAr: `/ar/products/${found.slug}`,
      storePathEn: `/en/products/${found.slug}`,
      images: (found.images || []).map((img) => ({
        url: img.url,
        altAr: img.alt?.ar || found.title.ar || 'صورة المنتج',
        altEn: img.alt?.en || found.title.en || 'Product image',
      })),
      videoUrls:
        Array.isArray(found.videoUrls) && found.videoUrls.length > 0
          ? found.videoUrls
          : found.videoUrl
            ? [found.videoUrl]
            : [],
      bestForAr: found.comparisonDna?.bestFor?.ar,
      bestForEn: found.comparisonDna?.bestFor?.en,
      keySpecsAr: found.comparisonDna?.keySpecs?.ar,
      keySpecsEn: found.comparisonDna?.keySpecs?.en,
      performanceScore: found.comparisonDna?.performanceScore,
      valueScore: found.comparisonDna?.valueScore,
      reliabilityScore: found.comparisonDna?.reliabilityScore,
      whyAr: found.whyWePickedIt?.ar,
      whyEn: found.whyWePickedIt?.en,
      considerAr: found.whatToConsider?.ar,
      considerEn: found.whatToConsider?.en,
      summaryAr: found.shortSummary?.ar || undefined,
      summaryEn: found.shortSummary?.en || undefined,
      descriptionAr: found.description?.ar || undefined,
      descriptionEn: found.description?.en || undefined,
      tags: Array.isArray(found.tags) ? found.tags.join(', ') : undefined,
      handoffNotes: preservedNotes,
      updatedAt: new Date().toISOString(),
    };
    saveAgentHandoffBrief(brief);
    setActiveHandoffBrief(brief);
    if (found.affiliateUrl) {
      setAffiliateCtaUrl(found.affiliateUrl);
    }

    // Link only the selected primary product (and any already explicitly selected products) without forcing random category items
    const nextLinkedIds = Array.from(
      new Set([found.id, ...relatedProductIds])
    );
    setRelatedProductIds(nextLinkedIds);
    if (!coverImage && found.images?.[0]?.url) {
      setCoverImage(found.images[0].url);
    }
    if (matchedCat) {
      setCategoryId(matchedCat.id);
    }
  };

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [discoveryReport, setDiscoveryReport] = useState<{
    categoryLabel: string;
    primaryProduct?: Product;
    linkedProducts: Product[];
    coverStatus: string;
    agentNotes?: string;
  } | null>(null);

  const dynamicArticlePromptText = buildDynamicArticleAiPrompt(
    products,
    categories,
    activeHandoffBrief,
    {
      affiliateUrl: affiliateCtaUrl,
      highlightColor: affiliateCtaColor,
    }
  );

  const handleApplyAffiliateCtaToCurrentContent = (customColor?: string) => {
    const colorToUse = normalizeHexColor(customColor || affiliateCtaColor, '#EA580C');
    const urlToUse =
      affiliateCtaUrl.trim() || activeHandoffBrief?.sourceProductUrl?.trim() || '';
    let updatedAny = false;
    if (contentAr.trim()) {
      setContentAr(applyAffiliateCtaStylingToHtml(contentAr, urlToUse, colorToUse));
      updatedAny = true;
    }
    if (contentEn.trim()) {
      setContentEn(applyAffiliateCtaStylingToHtml(contentEn, urlToUse, colorToUse));
      updatedAny = true;
    }
    if (updatedAny) {
      showToast(
        isAr
          ? `تم تحديث لون ورابط الكلمات التحفيزية (${colorToUse}) في محتوى المقال فوراً!`
          : `Updated affiliate CTA highlight color (${colorToUse}) & link in article content!`,
        'success'
      );
    }
  };

  const handleCopyAiPrompt = async () => {
    try {
      await navigator.clipboard.writeText(dynamicArticlePromptText);
      setCopiedPrompt(true);
      showToast(
        isAr
          ? 'تم نسخ برومبت وكيل المقالات (مُدمج معه رابط العمولة واللون المميز وبطاقة المنتج)!'
          : 'Article Agent prompt copied (with Affiliate CTA link, highlight color & Handoff Brief)!',
        'success'
      );
      setTimeout(() => setCopiedPrompt(false), 2500);
    } catch {
      showToast(
        isAr ? 'تعذر النسخ التلقائي.' : 'Unable to copy automatically.',
        'error'
      );
    }
  };

  const handleMagicParse = () => {
    const { draft, fieldsFoundCount } = parseMagicArticleContent(magicRawText, {
      affiliateUrl: affiliateCtaUrl,
      highlightColor: affiliateCtaColor,
    });
    if (fieldsFoundCount === 0) {
      showToast(
        isAr
          ? 'لم يتم العثور على حقول مطابقة في النص الملصق.'
          : 'No matching fields found in pasted text.',
        'error'
      );
      return;
    }

    if (draft.affiliateCtaUrl && !affiliateCtaUrl.trim()) {
      setAffiliateCtaUrl(draft.affiliateCtaUrl);
    }
    if (draft.affiliateCtaColor) {
      setAffiliateCtaColor(normalizeHexColor(draft.affiliateCtaColor, affiliateCtaColor));
    }

    if (draft.slug) setSlug(draft.slug);
    if (draft.titleAr) setTitleAr(draft.titleAr);
    if (draft.titleEn) setTitleEn(draft.titleEn);
    if (draft.excerptAr) setExcerptAr(draft.excerptAr);
    if (draft.excerptEn) setExcerptEn(draft.excerptEn);
    if (draft.contentAr) setContentAr(draft.contentAr);
    if (draft.contentEn) setContentEn(draft.contentEn);
    if (draft.editorVerdictAr) setEditorVerdictAr(draft.editorVerdictAr);
    if (draft.editorVerdictEn) setEditorVerdictEn(draft.editorVerdictEn);
    if (draft.seoTitleAr) setSeoTitleAr(draft.seoTitleAr);
    if (draft.seoTitleEn) setSeoTitleEn(draft.seoTitleEn);
    if (draft.seoDescriptionAr) setSeoDescriptionAr(draft.seoDescriptionAr);
    if (draft.seoDescriptionEn) setSeoDescriptionEn(draft.seoDescriptionEn);
    if (draft.seoKeywords) setSeoKeywords(draft.seoKeywords);
    if (draft.authorName) setAuthorName(draft.authorName);
    if (draft.readingTimeMinutes) setReadingTimeMinutes(draft.readingTimeMinutes);

    // 1. Resolve Category
    let resolvedCategoryId = categoryId;
    if (draft.categoryId) {
      const matchedCat = categories.find(
        (c) =>
          c.id.toLowerCase() === draft.categoryId?.toLowerCase() ||
          c.slug.toLowerCase() === draft.categoryId?.toLowerCase() ||
          c.name.ar?.toLowerCase() === draft.categoryId?.toLowerCase() ||
          c.name.en?.toLowerCase() === draft.categoryId?.toLowerCase()
      );
      if (matchedCat) {
        resolvedCategoryId = matchedCat.id;
        setCategoryId(matchedCat.id);
      }
    }

    // 2. Resolve Related Products (from Handoff Brief, [المنتجات المقترحة], AND /products/slug links inside contentHtml)
    const matchedRelatedSet = new Set<string>();
    if (activeHandoffBrief?.productSlug) {
      const fromBrief = findMatchingProduct(activeHandoffBrief.productSlug, products);
      if (fromBrief) matchedRelatedSet.add(fromBrief.id);
    }

    if (draft.relatedProductsQuery && draft.relatedProductsQuery.length > 0) {
      for (const q of draft.relatedProductsQuery) {
        const found = findMatchingProduct(q, products);
        if (found) matchedRelatedSet.add(found.id);
      }
    }

    // Also scan contentAr and contentEn for internal product links (/products/<slug>)
    const combinedHtml = `${draft.contentAr || ''} ${draft.contentEn || ''}`;
    const linkMatches = Array.from(combinedHtml.matchAll(/\/products\/([^/?#\s"'<>]+)/gi));
    for (const m of linkMatches) {
      if (m[1]) {
        const foundByLink = findMatchingProduct(m[1], products);
        if (foundByLink) matchedRelatedSet.add(foundByLink.id);
      }
    }

    let primaryProduct: Product | undefined;
    if (matchedRelatedSet.size > 0) {
      const firstId = Array.from(matchedRelatedSet)[0];
      primaryProduct = products.find((p) => p.id === firstId);
      if (primaryProduct && !draft.categoryId && primaryProduct.categoryId) {
        resolvedCategoryId = primaryProduct.categoryId;
        setCategoryId(primaryProduct.categoryId);
      }
    }

    // Fallback to same-category products ONLY if no specific product was identified in the article or handoff brief
    if (resolvedCategoryId && matchedRelatedSet.size === 0) {
      const categoryProducts = products
        .filter(
          (p) =>
            p.categoryId === resolvedCategoryId ||
            p.categorySlug === resolvedCategoryId
        )
        .slice(0, 3);
      for (const cp of categoryProducts) {
        matchedRelatedSet.add(cp.id);
      }
      if (!primaryProduct && categoryProducts[0]) {
        primaryProduct = categoryProducts[0];
      }
    }

    if (matchedRelatedSet.size > 0) {
      setRelatedProductIds(Array.from(matchedRelatedSet));
    }

    // 3. Smart Cover Image Resolution (by URL, Handoff Brief image, or primary product image)
    let resolvedCoverStatus = isAr ? 'لم يتم تحديد صورة غلاف بعد' : 'No cover image set yet';
    if (draft.coverImage) {
      const rawCover = draft.coverImage.trim();
      const isDirectUrl =
        rawCover.startsWith('http://') ||
        rawCover.startsWith('https://') ||
        rawCover.startsWith('/');
      if (isDirectUrl) {
        setCoverImage(rawCover);
        resolvedCoverStatus = isAr
          ? 'تم تعيين رابط صورة الغلاف المباشر بنجاح'
          : 'Direct cover image URL applied';
      } else {
        const coverMatchedProduct = findMatchingProduct(rawCover, products) || primaryProduct;
        const productImg =
          coverMatchedProduct?.images?.[0]?.url || activeHandoffBrief?.images?.[0]?.url;
        if (productImg) {
          setCoverImage(productImg);
          resolvedCoverStatus = isAr
            ? `تم سحب صورة الغلاف تلقائياً من المنتج`
            : `Auto-pulled cover image from product`;
        }
      }
    } else if (!coverImage && activeHandoffBrief?.images?.[0]?.url) {
      setCoverImage(activeHandoffBrief.images[0].url);
      resolvedCoverStatus = isAr
        ? `تم اعتماد الصورة الرئيسية من بطاقة تسليم المنتج كغلاف تلقائياً`
        : `Auto-assigned primary image from Product Handoff Brief`;
    } else if (!coverImage && primaryProduct?.images?.[0]?.url) {
      setCoverImage(primaryProduct.images[0].url);
      resolvedCoverStatus = isAr
        ? `تم اعتماد صورة المنتج الأساسي كغلاف تلقائياً: ${t(primaryProduct.title)}`
        : `Auto-assigned primary product image as cover: ${t(primaryProduct.title)}`;
    }

    if (draft.faqItems && draft.faqItems.length > 0) {
      setFaqItems(draft.faqItems);
    }

    const matchedCatObj = categories.find(
      (c) => c.id === resolvedCategoryId || c.slug === resolvedCategoryId
    );
    const linkedProductObjects = Array.from(matchedRelatedSet)
      .map((id) => products.find((p) => p.id === id))
      .filter((p): p is Product => Boolean(p));

    setDiscoveryReport({
      categoryLabel: matchedCatObj ? t(matchedCatObj.name) : resolvedCategoryId,
      primaryProduct,
      linkedProducts: linkedProductObjects,
      coverStatus: resolvedCoverStatus,
      agentNotes: draft.agentReport,
    });

    showToast(
      isAr
        ? `تم استخراج وتعبئة ${fieldsFoundCount} حقل وربط ${matchedRelatedSet.size} منتجات للمقارنة الخوارزمية الحية!`
        : `Extracted ${fieldsFoundCount} fields and linked ${matchedRelatedSet.size} products for live algorithmic comparison!`,
      'success'
    );
  };

  const toggleProductSelection = (id: string) => {
    setRelatedProductIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const addFaqRow = () => {
    setFaqItems((prev) => [
      ...prev,
      {
        question: { ar: '', en: '' },
        answer: { ar: '', en: '' },
      },
    ]);
  };

  const updateFaqRow = (
    idx: number,
    field: 'question' | 'answer',
    lang: 'ar' | 'en',
    val: string
  ) => {
    setFaqItems((prev) =>
      prev.map((item, i) =>
        i === idx
          ? {
              ...item,
              [field]: {
                ...item[field],
                [lang]: val,
              },
            }
          : item
      )
    );
  };

  const removeFaqRow = (idx: number) => {
    setFaqItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage('');

    try {
      // Smart Cover Image resolution if the user typed a product name/slug or left it blank
      let finalCoverImage = coverImage.trim();
      if (
        finalCoverImage &&
        !finalCoverImage.startsWith('http://') &&
        !finalCoverImage.startsWith('https://') &&
        !finalCoverImage.startsWith('/')
      ) {
        const matchedProd = findMatchingProduct(finalCoverImage, products);
        if (matchedProd?.images?.[0]?.url) {
          finalCoverImage = matchedProd.images[0].url;
          setCoverImage(finalCoverImage);
        }
      }
      if (!finalCoverImage) {
        const fallbackPrimary =
          (activeHandoffBrief?.productSlug &&
            findMatchingProduct(activeHandoffBrief.productSlug, products)) ||
          products.find((p) => relatedProductIds.includes(p.id));
        if (fallbackPrimary?.images?.[0]?.url) {
          finalCoverImage = fallbackPrimary.images[0].url;
          setCoverImage(finalCoverImage);
        } else if (activeHandoffBrief?.images?.[0]?.url) {
          finalCoverImage = activeHandoffBrief.images[0].url;
          setCoverImage(finalCoverImage);
        }
      }

      const payload = {
        slug: slug.trim().toLowerCase(),
        title: { en: titleEn, ar: titleAr },
        excerpt: { en: excerptEn, ar: excerptAr },
        contentHtml: { en: contentEn, ar: contentAr },
        editorVerdict: { en: editorVerdictEn, ar: editorVerdictAr },
        authorName: authorName.trim() || 'AQURIVO Editorial Team',
        seoTitle: { en: seoTitleEn, ar: seoTitleAr },
        seoDescription: { en: seoDescriptionEn, ar: seoDescriptionAr },
        seoKeywords: seoKeywords
          .split(/[،,]/)
          .map((k) => k.trim())
          .filter(Boolean),
        faqItems,
        coverImage: finalCoverImage || undefined,
        categoryId,
        readingTimeMinutes: Number(readingTimeMinutes) || 5,
        status,
        relatedProductIds,
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
      if (effectiveCsrf) headers['x-csrf-token'] = effectiveCsrf;
      if (fbToken) headers['x-firebase-id-token'] = fbToken;
      if (fbRefresh) headers['x-firebase-refresh-token'] = fbRefresh;

      const res = await fetch('/api/admin/articles', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          existingId: existingArticle?.id,
          payload,
        }),
      });
      const data = (await res.json()) as { error?: string; article?: Article };
      if (!res.ok) {
        const errText = data.error || (isAr ? 'تعذر حفظ دليل الشراء والمراجعة.' : 'Error saving article');
        setErrorMessage(errText);
        showToast(errText, 'error');
        return;
      }

      if (data.article && data.article.id) {
        try {
          await syncAdminDocumentToFirebaseClient('articles', data.article.id, data.article);
        } catch {
          // Server has already saved to local mirror and cloud
        }
      }

      showToast(
        isAr ? 'تم حفظ دليل الشراء والمراجعة بنجاح.' : 'Buying guide & review saved.',
        'success'
      );
      router.refresh();
      router.push('/admin/articles');
    } catch (err) {
      const msg = err instanceof Error ? err.message : (isAr ? 'حدث خطأ غير متوقع أثناء الحفظ.' : 'Unexpected error during save.');
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
            {existingArticle
              ? isAr
                ? 'تعديل المقال والمراجعة التحريرية'
                : 'Edit Editorial Guide & Review'
              : isAr
                ? 'كتابة مقال ومراجعة منتج جديدة'
                : 'Write New Product Review & Guide'}
          </h1>
          <p className={styles.pageSubtitle}>
            {isAr
              ? 'يرتبط وكيل المقالات ببطاقة تسليم وكيل المنتج لكتابة مراجعة خاصة بالمنتج ودمج منتجات الفئة من المتجر في خوارزمية المقارنة الحية.'
              : 'Connected to the Product Agent Handoff Brief to write a dedicated product review and integrate same-category store options into the live comparison engine.'}
          </p>
        </div>
      </div>

      {/* Smart Article & Review Agent Box */}
      <section className={styles.card} style={{ marginBlockEnd: '1.5rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
            marginBlockEnd: '0.75rem',
          }}
        >
          <div>
            <h2
              className={styles.sectionTitle}
              style={{
                marginBlockEnd: '0.25rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
              }}
            >
              <SmartAutoDistributeIcon size={18} />
              <span>
                {isAr
                  ? 'وكيل كتابة المقالات والمراجعات المتعمقة (Connected Article Agent — الوكيل 2)'
                  : 'Connected Editorial Guide & Review Agent (Agent 2)'}
              </span>
            </h2>
            <p className={styles.pageSubtitle}>
              {isAr
                ? 'يقرأ بطاقة تسليم المنتج (الصور المعتمدة، الفيديوهات، الرابط الحقيقي، والبصمة الخوارزمية) + فهرس المتجر لكتابة مقال احترافي خاص بالمنتج بدون أسلوب الذكاء الاصطناعي المبتذل.'
                : 'Uses the Product Handoff Brief (verified images, videos, real link & DNA) + live store catalog to write an authoritative product review.'}
            </p>
          </div>

          <div className={styles.actionRow}>
            <button
              type="button"
              onClick={() => setShowPromptPreview((prev) => !prev)}
              className={styles.topBarBtn}
            >
              <HelpCircle size={14} />
              <span>{isAr ? 'معاينة برومبت الوكيل' : 'Preview Agent Prompt'}</span>
            </button>
            <button
              type="button"
              onClick={handleCopyAiPrompt}
              className={styles.topBarBtn}
            >
              {copiedPrompt ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
              <span>
                {copiedPrompt
                  ? isAr
                    ? 'تم نسخ برومبت وكيل المقالات!'
                    : 'Article Agent Prompt Copied!'
                  : isAr
                    ? 'نسخ برومبت وكيل المقالات والمراجعات'
                    : 'Copy Article & Review Agent Prompt'}
              </span>
            </button>
          </div>
        </div>

        {/* Connected Product Agent Handoff Panel */}
        <div className={styles.agentSubPanel}>
          <div className={styles.agentSubPanelHeader}>
            <div className={styles.agentSubPanelTitle}>
              <Link2 size={16} />
              <span>
                {isAr
                  ? '🤝 الترابط مع وكيل المنتج (بطاقة تسليم المنتج للمقال):'
                  : '🤝 Product Agent Handoff Connection:'}
              </span>
            </div>

            {activeHandoffBrief && (
              <div className={styles.actionRow}>
                <button
                  type="button"
                  onClick={() => setIsHandoffPickerOpen((prev) => !prev)}
                  className={styles.topBarBtn}
                  style={{ fontSize: '11.5px', padding: '4px 10px' }}
                >
                  <Search size={13} />
                  <span>
                    {isHandoffPickerOpen
                      ? isAr
                        ? 'إغلاق القائمة'
                        : 'Close Picker'
                      : isAr
                        ? 'تغيير المنتج'
                        : 'Change Product'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clearSavedAgentHandoffBrief();
                    setActiveHandoffBrief(null);
                  }}
                  className={styles.topBarBtn}
                  style={{ fontSize: '11.5px', padding: '4px 10px' }}
                >
                  <X size={13} />
                  <span>{isAr ? 'إلغاء الربط' : 'Clear Handoff'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Selected Product Card OR Search Trigger Button */}
          {activeHandoffBrief ? (
            <div className={styles.selectedHandoffCard}>
              <div className={styles.selectedHandoffMain}>
                {selectedHandoffProduct?.primaryImage ||
                activeHandoffBrief.images?.[0]?.url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={
                      selectedHandoffProduct?.primaryImage ||
                      activeHandoffBrief.images[0].url
                    }
                    alt={
                      isAr
                        ? activeHandoffBrief.titleAr
                        : activeHandoffBrief.titleEn
                    }
                    className={styles.pickerThumb}
                    loading="lazy"
                  />
                ) : (
                  <div className={styles.pickerThumbPlaceholder}>
                    <Package size={20} />
                  </div>
                )}

                <div className={styles.pickerItemDetails}>
                  <div className={styles.pickerItemTitle}>
                    {isAr ? activeHandoffBrief.titleAr : activeHandoffBrief.titleEn}
                  </div>
                  <div className={styles.pickerItemSubRow}>
                    {selectedHandoffProduct?.sourceName && (
                      <span className={styles.pickerStoreBadge}>
                        {t(selectedHandoffProduct.sourceName)}
                      </span>
                    )}
                    <span>
                      🖼️{' '}
                      {isAr
                        ? `${activeHandoffBrief.images.length} صور معتمدة`
                        : `${activeHandoffBrief.images.length} images`}
                    </span>
                    <span>•</span>
                    <span>
                      🎬{' '}
                      {isAr
                        ? `${activeHandoffBrief.videoUrls.length} فيديو`
                        : `${activeHandoffBrief.videoUrls.length} video(s)`}
                    </span>
                    <span className={styles.pickerItemSlug}>
                      /{activeHandoffBrief.productSlug}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsHandoffPickerOpen((prev) => !prev)}
              className={`${styles.pickerTriggerBtn} ${
                isHandoffPickerOpen ? styles.pickerTriggerBtnActive : ''
              }`}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <Search size={16} color="var(--color-accent-primary)" />
                <span>
                  {isAr
                    ? 'ابحث واختر منتجاً من المتجر لتوليد بطاقة تسليمه للمقال...'
                    : 'Search & select a store product to generate its Handoff Brief...'}
                </span>
              </span>
              {isHandoffPickerOpen ? (
                <ChevronUp size={18} />
              ) : (
                <ChevronDown size={18} />
              )}
            </button>
          )}

          {/* Custom Searchable Visual Dropdown Panel */}
          {isHandoffPickerOpen && (
            <div className={styles.pickerDropdownPanel}>
              <div className={styles.pickerSearchBox}>
                <Search size={16} className={styles.pickerSearchIcon} />
                <input
                  type="search"
                  value={handoffSearchQuery}
                  onChange={(e) => setHandoffSearchQuery(e.target.value)}
                  placeholder={
                    isAr
                      ? 'ابحث باسم المنتج أو المتجر أو المعرّف (Slug)...'
                      : 'Search by product title, store, or slug...'
                  }
                  className={styles.pickerSearchInput}
                  autoFocus
                />
                {handoffSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setHandoffSearchQuery('')}
                    className={styles.pickerSearchClearBtn}
                    aria-label={isAr ? 'مسح البحث' : 'Clear search'}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              <div className={styles.pickerArticleFilterBar}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--color-text-muted)',
                  }}
                >
                  {isAr ? 'حالة المقال:' : 'Article Status:'}
                </span>
                <button
                  type="button"
                  onClick={() => setHandoffArticleStatusFilter('all')}
                  className={`${styles.pickerArticleFilterPill} ${
                    handoffArticleStatusFilter === 'all'
                      ? styles.pickerArticleFilterPillActive
                      : ''
                  }`}
                >
                  {isAr ? `الكل (${products.length})` : `All (${products.length})`}
                </button>
                <button
                  type="button"
                  onClick={() => setHandoffArticleStatusFilter('without')}
                  className={`${styles.pickerArticleFilterPill} ${
                    handoffArticleStatusFilter === 'without'
                      ? styles.pickerArticleFilterPillActive
                      : ''
                  }`}
                >
                  <span className={styles.badgeDotGray} />
                  {isAr
                    ? `ليس لها مقال (${handoffTotalWithout})`
                    : `No Article (${handoffTotalWithout})`}
                </button>
                <button
                  type="button"
                  onClick={() => setHandoffArticleStatusFilter('with')}
                  className={`${styles.pickerArticleFilterPill} ${
                    handoffArticleStatusFilter === 'with'
                      ? styles.pickerArticleFilterPillActive
                      : ''
                  }`}
                >
                  <span className={styles.badgeDotGreen} />
                  {isAr
                    ? `لها مقال (${handoffTotalWith})`
                    : `Has Article (${handoffTotalWith})`}
                </button>
              </div>

              {categories.length > 0 && (
                <div className={styles.pickerCategoryPills}>
                  <button
                    type="button"
                    onClick={() => setHandoffCategoryFilter('all')}
                    className={`${styles.pickerCategoryPill} ${
                      handoffCategoryFilter === 'all'
                        ? styles.pickerCategoryPillActive
                        : ''
                    }`}
                  >
                    {isAr
                      ? `جميع الأقسام (${products.length})`
                      : `All Depts (${products.length})`}
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setHandoffCategoryFilter(cat.id)}
                      className={`${styles.pickerCategoryPill} ${
                        handoffCategoryFilter === cat.id
                          ? styles.pickerCategoryPillActive
                          : ''
                      }`}
                    >
                      {t(cat.name)}
                    </button>
                  ))}
                </div>
              )}

              <div className={styles.pickerListScroll}>
                {filteredHandoffProducts.length === 0 ? (
                  <div
                    style={{
                      padding: '16px',
                      textAlign: 'center',
                      fontSize: '12.5px',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    {isAr
                      ? 'لا توجد منتجات مطابقة لبحثك حالياً.'
                      : 'No matching products found.'}
                  </div>
                ) : (
                  filteredHandoffProducts.map((p) => {
                    const isSelected = activeHandoffBrief?.productSlug === p.slug;
                    const statusInfo =
                      productArticlesMap.get(p.id) || productArticlesMap.get(p.slug);
                    const hasArticle = statusInfo?.hasArticle ?? false;

                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          handleSelectProductForHandoff(p.slug);
                          setIsHandoffPickerOpen(false);
                        }}
                        className={`${styles.pickerOptionRow} ${
                          isSelected ? styles.pickerOptionRowSelected : ''
                        }`}
                      >
                        <div className={styles.selectedHandoffMain}>
                          {p.primaryImage || p.images?.[0]?.url ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={p.primaryImage || p.images[0].url}
                              alt={t(p.title)}
                              className={styles.pickerThumb}
                              loading="lazy"
                            />
                          ) : (
                            <div className={styles.pickerThumbPlaceholder}>
                              <Package size={18} />
                            </div>
                          )}

                          <div className={styles.pickerItemDetails}>
                            <div className={styles.pickerItemTitle}>{t(p.title)}</div>
                            <div className={styles.pickerItemSubRow}>
                              {p.sourceName && (
                                <span className={styles.pickerStoreBadge}>
                                  {t(p.sourceName)}
                                </span>
                              )}
                              <span className={styles.pickerItemSlug}>/{p.slug}</span>

                              {hasArticle ? (
                                <span
                                  className={styles.pickerArticleBadgeHas}
                                  title={
                                    statusInfo?.articleTitles
                                      ? isAr
                                        ? `مرتبط بمقال: ${statusInfo.articleTitles}`
                                        : `Linked to: ${statusInfo.articleTitles}`
                                      : undefined
                                  }
                                >
                                  <span className={styles.badgeDotGreen} />
                                  <span>{isAr ? 'لها مقال' : 'Has Article'}</span>
                                </span>
                              ) : (
                                <span className={styles.pickerArticleBadgeNone}>
                                  <span className={styles.badgeDotGray} />
                                  <span>{isAr ? 'ليس لها مقال' : 'No Article'}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <span
                          className={`${styles.pickerCheckCircle} ${
                            isSelected ? styles.pickerCheckCircleSelected : ''
                          }`}
                        >
                          <Check size={13} />
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {!activeHandoffBrief && !isHandoffPickerOpen && (
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              {isAr
                ? 'اضغط على زر البحث أعلاه لاختيار أي منتج بالصورة والاسم، أو أضف منتجاً جديداً في صفحة المنتجات ليتم إرسال بطاقة تسليمه إلى هنا تلقائياً.'
                : 'Click the search button above to pick a product visually, or add a product first in the Product Agent to auto-receive its Handoff Brief here.'}
            </div>
          )}
        </div>

        {/* Contextual Affiliate CTA Link & Highlight Color Panel */}
        <div
          className={styles.agentSubPanel}
          style={{
            borderColor: `${affiliateCtaColor}66`,
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
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: 700,
                color: affiliateCtaColor,
              }}
            >
              <Palette size={15} />
              <span>
                {isAr
                  ? '🎨 دمج رابط العمولة وتلوين الكلمات التحفيزية للشراء (Contextual Affiliate CTA):'
                  : '🎨 Contextual Affiliate Link & Buying-Phrase Highlight Color:'}
              </span>
            </div>

            {(contentAr.trim() || contentEn.trim()) && (
              <button
                type="button"
                onClick={() => handleApplyAffiliateCtaToCurrentContent()}
                className={styles.topBarBtn}
                style={{
                  fontSize: '11.5px',
                  padding: '4px 10px',
                  borderColor: affiliateCtaColor,
                  color: affiliateCtaColor,
                }}
              >
                {isAr
                  ? 'تطبيق اللون والرابط على المقال الحالي ⚡'
                  : 'Apply Color & Link to Current Article ⚡'}
              </button>
            )}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '12px',
              alignItems: 'end',
            }}
          >
            {/* Affiliate URL Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                {isAr
                  ? 'رابط العمولة المراد دمجه داخل العبارات المحفزة للشراء:'
                  : 'Affiliate URL to embed inside motivating buying phrases:'}
              </label>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <input
                  type="url"
                  dir="ltr"
                  value={affiliateCtaUrl}
                  onChange={(e) => setAffiliateCtaUrl(e.target.value)}
                  className={styles.textInput}
                  style={{ flex: 1, fontSize: '12.5px', padding: '7px 10px' }}
                  placeholder={
                    activeHandoffBrief?.sourceProductUrl ||
                    (activeHandoffBrief?.productSlug
                      ? `/go/${activeHandoffBrief.productSlug}?ref=article_cta`
                      : 'https://...')
                  }
                />
                {activeHandoffBrief?.sourceProductUrl &&
                  affiliateCtaUrl !== activeHandoffBrief.sourceProductUrl && (
                    <button
                      type="button"
                      onClick={() => setAffiliateCtaUrl(activeHandoffBrief.sourceProductUrl || '')}
                      className={styles.topBarBtn}
                      style={{ fontSize: '11px', padding: '6px 9px', whiteSpace: 'nowrap' }}
                    >
                      {isAr ? 'سحب رابط المنتج' : 'Use Product URL'}
                    </button>
                  )}
              </div>
            </div>

            {/* Highlight Color Presets + Custom Picker */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                {isAr
                  ? 'اللون المميز للكلمات التحفيزية داخل المقال:'
                  : 'Highlight color for motivating phrases:'}
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {AFFILIATE_CTA_COLOR_PRESETS.map((preset) => {
                  const isSelected =
                    affiliateCtaColor.toUpperCase() === preset.hex.toUpperCase();
                  return (
                    <button
                      key={preset.hex}
                      type="button"
                      title={isAr ? preset.nameAr : preset.nameEn}
                      onClick={() => {
                        setAffiliateCtaColor(preset.hex);
                        if (contentAr.trim() || contentEn.trim()) {
                          handleApplyAffiliateCtaToCurrentContent(preset.hex);
                        }
                      }}
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '9999px',
                        backgroundColor: preset.hex,
                        border: isSelected
                          ? '2.5px solid var(--color-text-primary)'
                          : '1px solid rgba(255,255,255,0.25)',
                        boxShadow: isSelected ? `0 0 0 3px ${preset.hex}44` : 'none',
                        cursor: 'pointer',
                        transition: 'transform 0.15s ease',
                        transform: isSelected ? 'scale(1.12)' : 'scale(1)',
                      }}
                      aria-label={isAr ? preset.nameAr : preset.nameEn}
                    />
                  );
                })}

                <label
                  title={isAr ? 'اختيار لون مخصص' : 'Custom color'}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '3px 8px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg-subtle)',
                    cursor: 'pointer',
                    fontSize: '11.5px',
                    fontFamily: 'monospace',
                  }}
                >
                  <input
                    type="color"
                    value={normalizeHexColor(affiliateCtaColor, '#EA580C')}
                    onChange={(e) => {
                      const nextHex = normalizeHexColor(e.target.value, '#EA580C');
                      setAffiliateCtaColor(nextHex);
                    }}
                    style={{
                      width: '18px',
                      height: '18px',
                      border: 'none',
                      padding: 0,
                      background: 'transparent',
                      cursor: 'pointer',
                    }}
                  />
                  <span>{affiliateCtaColor}</span>
                </label>
              </div>
            </div>
          </div>

          {/* Live Preview of how the motivating phrase will appear to readers */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px',
              padding: '8px 12px',
              borderRadius: '8px',
              background: 'var(--color-bg-elevated)',
              border: '1px dashed var(--color-border)',
              fontSize: '12.5px',
              color: 'var(--color-text-secondary)',
            }}
          >
            <span>
              {isAr ? '👁️ معاينة ظهور الكلمة المحفزة للقارئ داخل الفقرة: ' : '👁️ Live in-article reader preview: '}
              {isAr ? '...ويمكنك ' : '...and you can '}
              <span
                style={{
                  color: affiliateCtaColor,
                  fontWeight: 700,
                }}
              >
                {isAr
                  ? 'التحقق من السعر الحالي وتوفر النسخة الأصلية'
                  : 'check live official pricing and availability'}
              </span>{' '}
              {isAr ? 'مباشرة من المتجر المعتمد.' : 'directly from the official store.'}
            </span>
            <span style={{ fontSize: '11px', opacity: 0.8 }}>
              {isAr
                ? '✓ تدمج 2 إلى 3 مرات فقط في المقال بتناسق تام ودون مبالغة'
                : '✓ Embedded 2–3 times naturally without spam'}
            </span>
          </div>
        </div>

        {showPromptPreview && (
          <div className={styles.promptCard} style={{ marginBlockEnd: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 600 }}>
                {isAr
                  ? '📋 برومبت وكيل المقالات والمراجعات (مُدمج معه بطاقة تسليم المنتج + فهرس المتجر):'
                  : '📋 Connected Article Agent Prompt:'}
              </span>
              <Button type="button" variant="outline" size="sm" onClick={handleCopyAiPrompt}>
                <Copy size={13} />
                <span>{isAr ? 'نسخ' : 'Copy'}</span>
              </Button>
            </div>
            <div className={styles.promptCode}>{dynamicArticlePromptText}</div>
          </div>
        )}

        <textarea
          rows={4}
          value={magicRawText}
          onChange={(e) => setMagicRawText(e.target.value)}
          className={styles.textareaInput}
          placeholder={
            isAr
              ? 'الصق هنا مخرج وكيل المقالات والمراجعات ([العنوان بالعربية]: ... [المحتوى بالعربية]: ...)'
              : 'Paste Article & Review Agent output here...'
          }
        />

        <div className={styles.actionRow} style={{ marginBlockStart: '0.75rem' }}>
          <Button
            type="button"
            size="sm"
            onClick={handleMagicParse}
            disabled={!magicRawText.trim()}
          >
            {isAr
              ? 'تحليل وتعبئة المقال وربط منتجات المقارنة تلقائياً ⚡'
              : 'Parse & Auto-Fill Article + Comparison Products ⚡'}
          </Button>
          {magicRawText && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setMagicRawText('');
                setDiscoveryReport(null);
              }}
            >
              {isAr ? 'مسح النص' : 'Clear'}
            </Button>
          )}
        </div>

        {discoveryReport && (
          <div
            style={{
              marginBlockStart: '1rem',
              padding: '1rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-accent-primary)',
              backgroundColor: 'var(--color-bg-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.6rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <strong style={{ color: 'var(--color-accent-primary)', fontSize: '0.95rem' }}>
                {isAr
                  ? '📊 تقرير وكيل المقالات والربط الخوارزمي من متجر AQURIVO'
                  : '📊 Article Agent & Algorithmic Store Linking Report'}
              </strong>
              <button
                type="button"
                onClick={() => setDiscoveryReport(null)}
                className={styles.topBarBtn}
                style={{ padding: '2px 8px', fontSize: '0.75rem' }}
              >
                {isAr ? 'إخفاء' : 'Dismiss'}
              </button>
            </div>

            <ul
              style={{
                margin: 0,
                paddingInlineStart: '1.2rem',
                fontSize: '0.88rem',
                lineHeight: 1.65,
                color: 'var(--color-text-secondary)',
              }}
            >
              <li>
                <strong>{isAr ? 'الفئة المكتشفة:' : 'Matched Category:'}</strong>{' '}
                {discoveryReport.categoryLabel}
              </li>
              <li>
                <strong>
                  {isAr
                    ? `المنتجات المدمجة للمقارنة الخوارزمية الحية (${discoveryReport.linkedProducts.length}):`
                    : `Integrated Products for Live Algorithmic Comparison (${discoveryReport.linkedProducts.length}):`}
                </strong>{' '}
                {discoveryReport.linkedProducts.length > 0
                  ? discoveryReport.linkedProducts.map((p) => t(p.title)).join(' ، ')
                  : isAr
                    ? 'لم يتم العثور على منتجات مطابقة في المتجر بعد'
                    : 'No store products matched yet'}
              </li>
              <li>
                <strong>{isAr ? 'حالة صورة الغلاف:' : 'Cover Image Status:'}</strong>{' '}
                {discoveryReport.coverStatus}
              </li>
            </ul>

            {discoveryReport.agentNotes && (
              <div
                style={{
                  marginBlockStart: '0.25rem',
                  paddingTop: '0.5rem',
                  borderBlockStart: '1px solid var(--color-border-hairline)',
                  fontSize: '0.82rem',
                  whiteSpace: 'pre-wrap',
                  color: 'var(--color-text-secondary)',
                }}
              >
                {discoveryReport.agentNotes}
              </div>
            )}
          </div>
        )}
      </section>

      <form onSubmit={handleSubmit} className={styles.card}>
        <div className={styles.formGrid}>
          <Input
            label={isAr ? 'المعرف (Slug)' : 'URL Slug'}
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="e.g. anker-prime-power-bank-in-depth-review-2026"
            required
          />

          <Input
            label={isAr ? 'اسم الكاتب / الفريق التحريري' : 'Author Name'}
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder="AQURIVO Editorial Team"
            required
          />
        </div>

        <div className={styles.formGrid}>
          <Input
            label={isAr ? 'العنوان باللغة العربية' : 'Title (Arabic)'}
            value={titleAr}
            onChange={(e) => setTitleAr(e.target.value)}
            placeholder="مثال: مراجعة شاحن Anker Prime 200W ودليل المقارنة مع بدائل الفئة"
            required
          />

          <Input
            label={isAr ? 'العنوان باللغة الإنجليزية' : 'Title (English)'}
            value={titleEn}
            onChange={(e) => setTitleEn(e.target.value)}
            placeholder="e.g. Anker Prime 200W Hands-On Review & Category Buying Guide"
            required
          />
        </div>

        <div className={styles.fieldGroup}>
          <Input
            label={
              isAr
                ? 'صورة الغلاف (رابط مباشر أو اكتب اسم/slug المنتج لسحب صورته)'
                : 'Cover Image (Direct URL or type product name/slug)'
            }
            value={coverImage}
            onChange={(e) => setCoverImage(e.target.value)}
            placeholder={
              isAr
                ? 'ضع رابط صورة أو اكتب اسم المنتج'
                : '/images/hero-bg.jpg or product name/slug'
            }
          />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              flexWrap: 'wrap',
              marginBlockStart: '0.4rem',
            }}
          >
            <button
              type="button"
              className={styles.topBarBtn}
              style={{ fontSize: '0.78rem', padding: '0.25rem 0.6rem' }}
              onClick={() => {
                const candidate =
                  (coverImage &&
                    !coverImage.startsWith('http') &&
                    !coverImage.startsWith('/') &&
                    findMatchingProduct(coverImage, products)) ||
                  (activeHandoffBrief?.productSlug &&
                    findMatchingProduct(activeHandoffBrief.productSlug, products)) ||
                  products.find((p) => relatedProductIds.includes(p.id));
                if (candidate?.images?.[0]?.url) {
                  setCoverImage(candidate.images[0].url);
                  showToast(
                    isAr
                      ? `تم سحب صورة المنتج: ${t(candidate.title)}`
                      : `Pulled image from: ${t(candidate.title)}`,
                    'success'
                  );
                } else if (activeHandoffBrief?.images?.[0]?.url) {
                  setCoverImage(activeHandoffBrief.images[0].url);
                  showToast(
                    isAr
                      ? 'تم سحب الصورة الرئيسية من بطاقة تسليم المنتج!'
                      : 'Pulled primary image from Product Handoff Brief!',
                    'success'
                  );
                } else {
                  showToast(
                    isAr
                      ? 'اختر منتجاً مرتبطاً أولاً أو اكتب اسم منتج متوفر.'
                      : 'Select a linked product or type a valid product name first.',
                    'error'
                  );
                }
              }}
            >
              {isAr
                ? 'سحب صورة المنتج الأساسي تلقائياً'
                : 'Auto-Pull Primary Product Cover Image'}
            </button>
            {(coverImage.startsWith('http://') ||
              coverImage.startsWith('https://') ||
              coverImage.startsWith('/')) && (
              <img
                src={coverImage}
                alt="Cover preview"
                referrerPolicy="no-referrer"
                style={{
                  width: '42px',
                  height: '42px',
                  objectFit: 'cover',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border-hairline)',
                }}
              />
            )}
          </div>
        </div>

        <div className={styles.formGrid}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              {isAr ? 'المقتطف / النبذة (عربي)' : 'Excerpt (Arabic)'}
            </label>
            <textarea
              rows={3}
              value={excerptAr}
              onChange={(e) => setExcerptAr(e.target.value)}
              className={styles.textareaInput}
              required
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              {isAr ? 'المقتطف / النبذة (إنجليزي)' : 'Excerpt (English)'}
            </label>
            <textarea
              rows={3}
              value={excerptEn}
              onChange={(e) => setExcerptEn(e.target.value)}
              className={styles.textareaInput}
              required
            />
          </div>
        </div>

        <div className={styles.formGrid}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              {isAr ? 'محتوى الدليل (عربي - HTML)' : 'Content HTML (Arabic)'}
            </label>
            <textarea
              rows={10}
              value={contentAr}
              onChange={(e) => setContentAr(e.target.value)}
              className={styles.textareaInput}
              placeholder="<h2>مقدمة</h2><p>...</p><h2>أبرز المعايير</h2><p>...</p>"
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              {isAr ? 'محتوى الدليل (إنجليزي - HTML)' : 'Content HTML (English)'}
            </label>
            <textarea
              rows={10}
              value={contentEn}
              onChange={(e) => setContentEn(e.target.value)}
              className={styles.textareaInput}
              placeholder="<h2>Introduction</h2><p>...</p><h2>Key Criteria</h2><p>...</p>"
            />
          </div>
        </div>

        {/* Editor's Verdict Fields */}
        <div className={styles.formGrid}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              {isAr
                ? 'خلاصة وتوصية المحرر (عربي)'
                : "Editor's Verdict & Recommendation (Arabic)"}
            </label>
            <textarea
              rows={3}
              value={editorVerdictAr}
              onChange={(e) => setEditorVerdictAr(e.target.value)}
              className={styles.textareaInput}
              placeholder="توصية ختامية توجه المشتري للخيار الأنسب لميزانيته..."
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              {isAr
                ? 'خلاصة وتوصية المحرر (إنجليزي)'
                : "Editor's Verdict & Recommendation (English)"}
            </label>
            <textarea
              rows={3}
              value={editorVerdictEn}
              onChange={(e) => setEditorVerdictEn(e.target.value)}
              className={styles.textareaInput}
              placeholder="Final recommendation guiding the shopper by budget and needs..."
            />
          </div>
        </div>

        {/* Advanced SEO Section */}
        <div
          style={{
            marginBlock: '1.25rem',
            paddingBlockStart: '1.25rem',
            borderBlockStart: '1px solid var(--color-border-hairline)',
          }}
        >
          <h2 className={styles.sectionTitle} style={{ marginBlockEnd: '0.75rem' }}>
            {isAr
              ? 'إعدادات محركات البحث المتقدمة (Advanced SEO)'
              : 'Advanced Search Engine Optimization (SEO)'}
          </h2>

          <div className={styles.formGrid}>
            <Input
              label={
                isAr
                  ? 'عنوان محركات البحث (SEO Title - عربي)'
                  : 'SEO Meta Title (Arabic)'
              }
              value={seoTitleAr}
              onChange={(e) => setSeoTitleAr(e.target.value)}
              placeholder={titleAr || 'أفضل 5 سماعات لاسلكية 2026 | AQURIVO'}
            />

            <Input
              label={
                isAr
                  ? 'عنوان محركات البحث (SEO Title - إنجليزي)'
                  : 'SEO Meta Title (English)'
              }
              value={seoTitleEn}
              onChange={(e) => setSeoTitleEn(e.target.value)}
              placeholder={titleEn || 'Top 5 Wireless Headphones 2026 | AQURIVO'}
            />
          </div>

          <div className={styles.formGrid}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>
                {isAr
                  ? 'الوصف التعريفي لمحركات البحث (Meta Description - عربي)'
                  : 'SEO Meta Description (Arabic)'}
              </label>
              <textarea
                rows={2}
                value={seoDescriptionAr}
                onChange={(e) => setSeoDescriptionAr(e.target.value)}
                className={styles.textareaInput}
                placeholder="وصف مركز من 120-155 حرفاً يظهر في نتائج بحث Google..."
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>
                {isAr
                  ? 'الوصف التعريفي لمحركات البحث (Meta Description - إنجليزي)'
                  : 'SEO Meta Description (English)'}
              </label>
              <textarea
                rows={2}
                value={seoDescriptionEn}
                onChange={(e) => setSeoDescriptionEn(e.target.value)}
                className={styles.textareaInput}
                placeholder="120-155 chars summary for Google search snippets..."
              />
            </div>
          </div>

          <div className={styles.formGrid}>
            <Input
              label={
                isAr
                  ? 'الكلمات المفتاحية (Long-tail Keywords مفصولة بفواصل)'
                  : 'Target SEO Keywords (Comma-separated)'
              }
              value={seoKeywords}
              onChange={(e) => setSeoKeywords(e.target.value)}
              placeholder="أفضل سماعات لاسلكية، مقارنة سماعات، best wireless headphones"
            />

            <Input
              label={isAr ? 'وقت القراءة المقدر (بالدقائق)' : 'Reading Time (Minutes)'}
              type="number"
              min={1}
              max={60}
              value={readingTimeMinutes}
              onChange={(e) => setReadingTimeMinutes(e.target.value)}
              required
            />
          </div>
        </div>

        {/* FAQ Schema Builder */}
        <div
          style={{
            marginBlock: '1.25rem',
            paddingBlockStart: '1.25rem',
            borderBlockStart: '1px solid var(--color-border-hairline)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBlockEnd: '0.75rem',
            }}
          >
            <div>
              <h2 className={styles.sectionTitle}>
                {isAr
                  ? 'الأسئلة الشائعة (FAQPage Schema لنتائج Google)'
                  : 'FAQ Items (FAQPage Rich Schema)'}
              </h2>
              <p className={styles.pageSubtitle}>
                {isAr
                  ? 'تُعرض في نهاية المقال وتُضمّن تلقائياً كـ FAQPage JSON-LD في محرك بحث Google.'
                  : 'Displayed at the end of the guide and embedded as FAQPage JSON-LD schema.'}
              </p>
            </div>
            <button type="button" onClick={addFaqRow} className={styles.topBarBtn}>
              <Plus size={14} />
              <span>{isAr ? 'إضافة سؤال شائع' : 'Add FAQ Item'}</span>
            </button>
          </div>

          {faqItems.map((faq, idx) => (
            <div
              key={idx}
              style={{
                padding: '1rem',
                border: '1px solid var(--color-border-hairline)',
                borderRadius: 'var(--radius-md)',
                marginBlockEnd: '0.75rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBlockEnd: '0.5rem',
                }}
              >
                <strong>
                  {isAr ? `سؤال #${idx + 1}` : `FAQ #${idx + 1}`}
                </strong>
                <button
                  type="button"
                  onClick={() => removeFaqRow(idx)}
                  className={styles.topBarBtn}
                >
                  <Trash2 size={13} />
                  <span>{isAr ? 'حذف' : 'Remove'}</span>
                </button>
              </div>
              <div className={styles.formGrid}>
                <Input
                  label={isAr ? 'السؤال (عربي)' : 'Question (Arabic)'}
                  value={faq.question.ar}
                  onChange={(e) =>
                    updateFaqRow(idx, 'question', 'ar', e.target.value)
                  }
                />
                <Input
                  label={isAr ? 'السؤال (إنجليزي)' : 'Question (English)'}
                  value={faq.question.en}
                  onChange={(e) =>
                    updateFaqRow(idx, 'question', 'en', e.target.value)
                  }
                />
              </div>
              <div className={styles.formGrid}>
                <Input
                  label={isAr ? 'الإجابة (عربي)' : 'Answer (Arabic)'}
                  value={faq.answer.ar}
                  onChange={(e) => updateFaqRow(idx, 'answer', 'ar', e.target.value)}
                />
                <Input
                  label={isAr ? 'الإجابة (إنجليزي)' : 'Answer (English)'}
                  value={faq.answer.en}
                  onChange={(e) => updateFaqRow(idx, 'answer', 'en', e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>

        <div className={styles.formGrid}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              {isAr ? 'الفئة' : 'Category'}
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={styles.selectInput}
            >
              <option value="general">{isAr ? 'عام' : 'General'}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {t(c.name)}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              {isAr ? 'حالة النشر' : 'Status'}
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'published' | 'draft')}
              className={styles.selectInput}
            >
              <option value="published">{isAr ? 'منشور' : 'Published'}</option>
              <option value="draft">{isAr ? 'مسودة' : 'Draft'}</option>
            </select>
          </div>
        </div>

        {products.length > 0 && (
          <div className={styles.fieldGroup}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <label className={styles.fieldLabel}>
                {isAr
                  ? 'المنتجات الموصى بها داخل هذا الدليل (تظهر في جدول المقارنة وبين الفقرات وفي أسفل المقال)'
                  : 'Recommended Products Linked to This Guide (Shown in comparison table, inline cards & footer)'}
              </label>
              <span className={styles.badgeSuccess}>
                {isAr
                  ? `تم اختيار ${relatedProductIds.length} منتج`
                  : `${relatedProductIds.length} selected`}
              </span>
            </div>

            <div className={styles.pickerDropdownPanel}>
              <div className={styles.pickerSearchBox}>
                <Search size={16} className={styles.pickerSearchIcon} />
                <input
                  type="search"
                  value={linkedSearchQuery}
                  onChange={(e) => setLinkedSearchQuery(e.target.value)}
                  placeholder={
                    isAr
                      ? 'ابحث لإضافة أو إزالة منتجات المقارنة داخل الدليل...'
                      : 'Search to add or remove comparison products...'
                  }
                  className={styles.pickerSearchInput}
                />
                {linkedSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setLinkedSearchQuery('')}
                    className={styles.pickerSearchClearBtn}
                    aria-label={isAr ? 'مسح البحث' : 'Clear search'}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              <div className={styles.pickerArticleFilterBar}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--color-text-muted)',
                  }}
                >
                  {isAr ? 'حالة المقال:' : 'Article Status:'}
                </span>
                <button
                  type="button"
                  onClick={() => setLinkedArticleStatusFilter('all')}
                  className={`${styles.pickerArticleFilterPill} ${
                    linkedArticleStatusFilter === 'all'
                      ? styles.pickerArticleFilterPillActive
                      : ''
                  }`}
                >
                  {isAr ? `الكل (${products.length})` : `All (${products.length})`}
                </button>
                <button
                  type="button"
                  onClick={() => setLinkedArticleStatusFilter('without')}
                  className={`${styles.pickerArticleFilterPill} ${
                    linkedArticleStatusFilter === 'without'
                      ? styles.pickerArticleFilterPillActive
                      : ''
                  }`}
                >
                  <span className={styles.badgeDotGray} />
                  {isAr
                    ? `ليس لها مقال (${linkedTotalWithout})`
                    : `No Article (${linkedTotalWithout})`}
                </button>
                <button
                  type="button"
                  onClick={() => setLinkedArticleStatusFilter('with')}
                  className={`${styles.pickerArticleFilterPill} ${
                    linkedArticleStatusFilter === 'with'
                      ? styles.pickerArticleFilterPillActive
                      : ''
                  }`}
                >
                  <span className={styles.badgeDotGreen} />
                  {isAr
                    ? `لها مقال (${linkedTotalWith})`
                    : `Has Article (${linkedTotalWith})`}
                </button>
              </div>

              {categories.length > 0 && (
                <div className={styles.pickerCategoryPills}>
                  <button
                    type="button"
                    onClick={() => setLinkedCategoryFilter('all')}
                    className={`${styles.pickerCategoryPill} ${
                      linkedCategoryFilter === 'all'
                        ? styles.pickerCategoryPillActive
                        : ''
                    }`}
                  >
                    {isAr
                      ? `جميع الأقسام (${products.length})`
                      : `All Depts (${products.length})`}
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setLinkedCategoryFilter(cat.id)}
                      className={`${styles.pickerCategoryPill} ${
                        linkedCategoryFilter === cat.id
                          ? styles.pickerCategoryPillActive
                          : ''
                      }`}
                    >
                      {t(cat.name)}
                    </button>
                  ))}
                </div>
              )}

              <div className={styles.pickerListScroll}>
                {filteredLinkedProducts.map((p) => {
                  const isChecked = relatedProductIds.includes(p.id);
                  const statusInfo =
                    productArticlesMap.get(p.id) || productArticlesMap.get(p.slug);
                  const hasArticle = statusInfo?.hasArticle ?? false;

                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggleProductSelection(p.id)}
                      className={`${styles.pickerOptionRow} ${
                        isChecked ? styles.pickerOptionRowSelected : ''
                      }`}
                    >
                      <div className={styles.selectedHandoffMain}>
                        {p.primaryImage || p.images?.[0]?.url ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={p.primaryImage || p.images[0].url}
                            alt={t(p.title)}
                            className={styles.pickerThumb}
                            loading="lazy"
                          />
                        ) : (
                          <div className={styles.pickerThumbPlaceholder}>
                            <Package size={18} />
                          </div>
                        )}

                        <div className={styles.pickerItemDetails}>
                          <div className={styles.pickerItemTitle}>{t(p.title)}</div>
                          <div className={styles.pickerItemSubRow}>
                            {p.sourceName && (
                              <span className={styles.pickerStoreBadge}>
                                {t(p.sourceName)}
                              </span>
                            )}
                            <span className={styles.pickerItemSlug}>/{p.slug}</span>

                            {hasArticle ? (
                              <span
                                className={styles.pickerArticleBadgeHas}
                                title={
                                  statusInfo?.articleTitles
                                    ? isAr
                                      ? `مرتبط بمقال: ${statusInfo.articleTitles}`
                                      : `Linked to: ${statusInfo.articleTitles}`
                                    : undefined
                                }
                              >
                                <span className={styles.badgeDotGreen} />
                                <span>{isAr ? 'لها مقال' : 'Has Article'}</span>
                              </span>
                            ) : (
                              <span className={styles.pickerArticleBadgeNone}>
                                <span className={styles.badgeDotGray} />
                                <span>{isAr ? 'ليس لها مقال' : 'No Article'}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <span
                        className={`${styles.pickerCheckCircle} ${
                          isChecked ? styles.pickerCheckCircleSelected : ''
                        }`}
                      >
                        <Check size={13} />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className={styles.alertBanner} role="alert">
            {errorMessage}
          </div>
        )}

        <div className={styles.actionRow}>
          <Button type="submit" size="lg" isLoading={saving}>
            {isAr ? 'حفظ الدليل' : 'Save Guide'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push('/admin/articles')}
          >
            {isAr ? 'إلغاء' : 'Cancel'}
          </Button>
        </div>
      </form>
    </>
  );
}
