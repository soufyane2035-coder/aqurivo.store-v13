'use client';

import React, { useState } from 'react';
import { Check, DownloadCloud, ExternalLink, Plus, Search } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { useSaved } from '@/features/saved/SavedProvider';
import { useToast } from '@/components/ui/Toast';
import { formatProductPrice } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import styles from './AmazonImportSection.module.css';

interface AmazonSearchResultItem {
  asin: string;
  title: string;
  image: string;
  price: number | null;
  currency: string;
  affiliateUrl: string;
  category?: string;
}

const AMAZON_CATEGORIES = [
  { value: 'all', labelAr: 'كل الفئات', labelEn: 'All Categories' },
  { value: 'electronics', labelAr: 'إلكترونيات', labelEn: 'Electronics' },
  { value: 'fashion', labelAr: 'موضة', labelEn: 'Fashion' },
  { value: 'health', labelAr: 'صحة', labelEn: 'Health' },
  { value: 'home', labelAr: 'منزل', labelEn: 'Home' },
  { value: 'sports', labelAr: 'رياضة', labelEn: 'Sports' },
];

export function AmazonImportSection() {
  const { locale } = useI18n();
  const { csrfToken } = useSaved();
  const { showToast } = useToast();
  const isAr = locale === 'ar';

  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('all');
  const [isSearching, setIsSearching] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [addingAsin, setAddingAsin] = useState<string | null>(null);
  const [addedAsins, setAddedAsins] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<AmazonSearchResultItem[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isNotConfigured, setIsNotConfigured] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = keyword.trim();
    if (!trimmed) {
      showToast(
        isAr ? 'يرجى إدخال كلمة مفتاحية للبحث.' : 'Please enter a search keyword.',
        'error'
      );
      return;
    }
    if (!csrfToken) return;

    setIsSearching(true);
    setStatusMessage(null);
    setIsNotConfigured(false);

    try {
      const res = await fetch('/api/amazon/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({ keyword: trimmed, category }),
      });

      const data = (await res.json()) as {
        items?: AmazonSearchResultItem[];
        error?: string;
        notConfigured?: boolean;
      };

      if (!res.ok) {
        if (data.notConfigured) {
          setIsNotConfigured(true);
        }
        setStatusMessage(
          data.error ||
            (isAr
              ? 'تعذر جلب نتائج البحث من Amazon.'
              : 'Unable to fetch search results from Amazon.')
        );
        setResults([]);
        return;
      }

      const fetched = data.items || [];
      setResults(fetched);
      if (fetched.length === 0) {
        setStatusMessage(
          isAr
            ? 'لم يتم العثور على منتجات مطابقة لهذه الكلمة المفتاحية.'
            : 'No products found matching this keyword.'
        );
      }
    } catch {
      setStatusMessage(
        isAr ? 'حدث خطأ أثناء الاتصال بالخادم.' : 'Network error while contacting server.'
      );
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddSingleProduct = async (item: AmazonSearchResultItem) => {
    if (!csrfToken) return;
    setAddingAsin(item.asin);

    try {
      const res = await fetch('/api/amazon/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({
          item,
          category,
          keyword: keyword.trim(),
        }),
      });

      const data = (await res.json()) as {
        saved?: boolean;
        skippedDuplicate?: boolean;
        error?: string;
      };

      if (!res.ok) {
        showToast(
          data.error ||
            (isAr ? 'تعذر حفظ المنتج في المتجر.' : 'Failed to save product to store.'),
          'error'
        );
        return;
      }

      setAddedAsins((prev) => ({ ...prev, [item.asin]: true }));

      if (data.skippedDuplicate) {
        showToast(
          isAr
            ? `المنتج (${item.asin}) موجود مسبقاً في المتجر وتم تجنب التكرار.`
            : `Product (${item.asin}) already exists in the store (duplicate skipped).`,
          'info'
        );
      } else {
        showToast(
          isAr
            ? `تمت إضافة المنتج (${item.asin}) إلى المتجر بنجاح!`
            : `Product (${item.asin}) added to the store!`,
          'success'
        );
      }
    } catch {
      showToast(
        isAr ? 'تعذر حفظ المنتج في المتجر.' : 'Failed to save product to store.',
        'error'
      );
    } finally {
      setAddingAsin(null);
    }
  };

  const handleSyncAll = async () => {
    const trimmed = keyword.trim();
    if (!trimmed || !csrfToken) return;
    setIsSyncingAll(true);

    try {
      const res = await fetch('/api/amazon/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({ keyword: trimmed, category }),
      });

      const data = (await res.json()) as {
        savedCount?: number;
        skippedDuplicates?: number;
        items?: AmazonSearchResultItem[];
        error?: string;
        notConfigured?: boolean;
      };

      if (!res.ok) {
        if (data.notConfigured) setIsNotConfigured(true);
        showToast(
          data.error ||
            (isAr ? 'تعذرت مزامنة المنتجات.' : 'Unable to sync products.'),
          'error'
        );
        return;
      }

      if (data.items) {
        setResults(data.items);
        const map: Record<string, boolean> = {};
        for (const it of data.items) {
          map[it.asin] = true;
        }
        setAddedAsins((prev) => ({ ...prev, ...map }));
      }

      showToast(
        isAr
          ? `تم حفظ ${data.savedCount || 0} منتج وتخطي ${data.skippedDuplicates || 0} مكرر.`
          : `Saved ${data.savedCount || 0} products and skipped ${data.skippedDuplicates || 0} duplicates.`,
        'success'
      );
    } catch {
      showToast(
        isAr ? 'حدث خطأ أثناء المزامنة.' : 'Error while syncing.',
        'error'
      );
    } finally {
      setIsSyncingAll(false);
    }
  };

  return (
    <section className={styles.importCard} aria-labelledby="amazon-import-heading">
      <div className={styles.headerRow}>
        <div>
          <h2 id="amazon-import-heading" className={styles.sectionTitle}>
            {isAr ? 'استيراد Amazon (PA-API 5.0)' : 'Amazon Import (PA-API 5.0)'}
          </h2>
          <p className={styles.sectionSubtitle}>
            {isAr
              ? 'ابحث في منتجات Amazon وأضفها مباشرة إلى المتجر مع رابط العمولة التلقائي (Associates Tag) ومنع تكرار ASIN.'
              : 'Search Amazon products and import them directly to Firestore with your Associates tag and ASIN deduplication.'}
          </p>
        </div>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className={styles.searchBarRow}>
        <div className={styles.keywordInputWrap}>
          <Search size={17} className={styles.searchIcon} aria-hidden="true" />
          <input
            type="search"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            dir="auto"
            placeholder={
              isAr
                ? 'ابحث عن منتج (مثال: Headphones)...'
                : 'Search Amazon products (e.g., Headphones)...'
            }
            className={styles.keywordInput}
            aria-label={isAr ? 'كلمة البحث في Amazon' : 'Amazon search keyword'}
          />
        </div>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={styles.categorySelect}
          aria-label={isAr ? 'الفئة' : 'Category'}
        >
          {AMAZON_CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {isAr ? cat.labelAr : cat.labelEn}
            </option>
          ))}
        </select>

        <Button type="submit" variant="primary" isLoading={isSearching}>
          <Search size={15} aria-hidden="true" />
          <span>{isAr ? 'بحث' : 'Search'}</span>
        </Button>

        {results.length > 0 && (
          <Button
            type="button"
            variant="outline"
            onClick={handleSyncAll}
            isLoading={isSyncingAll}
          >
            <DownloadCloud size={15} aria-hidden="true" />
            <span>{isAr ? 'حفظ الكل في المتجر' : 'Sync All to Store'}</span>
          </Button>
        )}
      </form>

      {/* Honest Server Configuration / Status Notice */}
      {statusMessage && (
        <div
          className={
            isNotConfigured ? styles.configNoticeBox : styles.statusNoticeBox
          }
          role="status"
        >
          <p className={styles.noticeTitle}>{statusMessage}</p>
          {isNotConfigured && (
            <p className={styles.noticeHint}>
              {isAr
                ? 'لتفعيل جلب المنتجات تلقائياً، أضف متغيرات البيئة التالية على الخادم: AMAZON_ACCESS_KEY و AMAZON_SECRET_KEY و AMAZON_ASSOCIATE_TAG و AMAZON_REGION=us-east-1.'
                : 'To enable automatic PA-API 5.0 fetching, configure AMAZON_ACCESS_KEY, AMAZON_SECRET_KEY, AMAZON_ASSOCIATE_TAG, and AMAZON_REGION=us-east-1 in your server environment.'}
            </p>
          )}
        </div>
      )}

      {/* Mini Cards Grid */}
      {results.length > 0 && (
        <div className={styles.miniCardsGrid}>
          {results.map((item) => {
            const isAdded = Boolean(addedAsins[item.asin]);
            const formattedPrice =
              item.price !== null
                ? formatProductPrice(item.price, item.currency || 'USD', locale)
                : isAr
                  ? 'السعر على Amazon'
                  : 'Check on Amazon';

            return (
              <article key={item.asin} className={styles.miniCard}>
                <div className={styles.miniImageWrap}>
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.title}
                      width={180}
                      height={180}
                      className={styles.miniImage}
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className={styles.noImageLabel}>Amazon</span>
                  )}
                  <span className={`${styles.asinBadge} tabularNums`}>
                    {item.asin}
                  </span>
                </div>

                <div className={styles.miniBody}>
                  <h3 className={styles.miniTitle} title={item.title}>
                    {item.title}
                  </h3>

                  <div className={styles.miniPriceRow}>
                    <span dir="ltr" className={`${styles.miniPrice} tabularNums`}>
                      {formattedPrice}
                    </span>
                    <a
                      href={item.affiliateUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.previewLink}
                      title={item.affiliateUrl}
                    >
                      <span>{isAr ? 'معاينة الرابط' : 'Preview Link'}</span>
                      <ExternalLink size={12} aria-hidden="true" />
                    </a>
                  </div>

                  <button
                    type="button"
                    disabled={isAdded || addingAsin === item.asin}
                    onClick={() => handleAddSingleProduct(item)}
                    className={`${styles.addStoreBtn} ${
                      isAdded ? styles.addStoreBtnDone : ''
                    }`}
                  >
                    {isAdded ? (
                      <>
                        <Check size={15} aria-hidden="true" />
                        <span>{isAr ? 'تمت الإضافة للمتجر' : 'Added to Store'}</span>
                      </>
                    ) : (
                      <>
                        <Plus size={15} aria-hidden="true" />
                        <span>
                          {addingAsin === item.asin
                            ? isAr
                              ? 'جارٍ الحفظ...'
                              : 'Saving...'
                            : isAr
                              ? 'إضافة للمتجر'
                              : 'Add to Store'}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
