'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowUpRight, ExternalLink, ShoppingBag, Trash2 } from 'lucide-react';
import type { Product } from '@/types';
import { useI18n } from '@/i18n/I18nProvider';
import { useSaved } from '@/features/saved/SavedProvider';
import { formatProductPrice } from '@/lib/format';
import { SiteHeader } from '@/components/sections/SiteHeader';
import { SiteFooter } from '@/components/sections/SiteFooter';
import { ProductArtwork } from '@/components/ui/ProductArtwork';
import styles from './ShoppingListView.module.css';

interface ShoppingListViewProps {
  allProducts: Product[];
}

export function ShoppingListView({ allProducts }: ShoppingListViewProps) {
  const { locale, messages, t } = useI18n();
  const { savedIds, toggleSave } = useSaved();
  const isAr = locale === 'ar';
  const savedProducts = savedIds
    .map((id) => allProducts.find((product) => product.id === id))
    .filter((product): product is Product => Boolean(product));
  const itemCount = savedProducts.length;
  const itemCountCategory = new Intl.PluralRules(locale).select(itemCount);
  const itemCountMessage =
    itemCountCategory === 'one'
      ? messages.shoppingList.itemCountOne
      : itemCountCategory === 'two'
        ? messages.shoppingList.itemCountTwo
        : itemCountCategory === 'few'
          ? messages.shoppingList.itemCountFew
          : itemCountCategory === 'many'
            ? messages.shoppingList.itemCountMany
            : messages.shoppingList.itemCountOther;

  return (
    <div className={styles.pageShell}>
      <SiteHeader />

      <main id="main-content" className={`siteContainer ${styles.main}`}>
        <header className={styles.pageHeader}>
          <span className={styles.eyebrow}>
            <ShoppingBag size={16} aria-hidden="true" />
            {messages.nav.shoppingList}
          </span>
          <h1 className={styles.title}>{messages.shoppingList.title}</h1>
          <p className={styles.description}>{messages.shoppingList.description}</p>
          <p className={styles.partnerNotice}>{messages.shoppingList.partnerNotice}</p>
        </header>

        {savedProducts.length > 0 ? (
          <section className={styles.listSection} aria-label={messages.shoppingList.title}>
            <div className={styles.listHeading}>
              <h2>
                {itemCountMessage.replace(
                  '{count}',
                  new Intl.NumberFormat(locale).format(itemCount)
                )}
              </h2>
              <Link href={`/${locale}/products`} className={styles.browseLink}>
                {messages.shoppingList.continueBrowsing}
                <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
            </div>

            <ul className={styles.productList}>
              {savedProducts.map((product) => {
                const title = t(product.title);
                const image = product.images.find((item) => Boolean(item.url?.trim()));
                const showPrice =
                  product.priceDisplayPolicy === 'show_with_timestamp' &&
                  product.priceAmount !== null &&
                  product.priceAmount > 0;
                const storeName = t(product.sourceName);

                return (
                  <li className={styles.productRow} key={product.id}>
                    <Link
                      href={`/${locale}/products/${encodeURIComponent(product.slug)}`}
                      className={styles.imageLink}
                      aria-label={title}
                    >
                      {image ? (
                        <img
                          className={styles.productImage}
                          src={image.url}
                          alt={t(image.alt) || title}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <ProductArtwork
                          title={title}
                          categoryLabel={t(product.categoryName)}
                          noteText={messages.product.temporaryArtworkNote}
                        />
                      )}
                    </Link>

                    <div className={styles.productInfo}>
                      <Link
                        href={`/${locale}/products/${encodeURIComponent(product.slug)}`}
                        className={styles.productTitle}
                      >
                        {title}
                      </Link>
                      <span className={styles.storeName}>{storeName}</span>
                      <span className={styles.price}>
                        {showPrice
                          ? formatProductPrice(
                              product.priceAmount,
                              product.priceCurrency,
                              locale
                            )
                          : messages.product.priceMayVary}
                      </span>
                    </div>

                    <div className={styles.rowActions}>
                      <a
                        className={styles.storeLink}
                        href={`/go/${encodeURIComponent(product.slug)}?ref=shopping_list`}
                        target="_blank"
                        rel="sponsored noopener noreferrer"
                      >
                        <span>
                          {messages.shoppingList.openStore.replace(
                            '{source}',
                            storeName
                          )}
                        </span>
                        <ExternalLink size={15} aria-hidden="true" />
                      </a>
                      <button
                        type="button"
                        className={styles.removeButton}
                        onClick={() => toggleSave(product.id)}
                        aria-label={
                          isAr
                            ? `إزالة ${title} من القائمة`
                            : `Remove ${title} from the list`
                        }
                      >
                        <Trash2 size={16} aria-hidden="true" />
                        <span>{isAr ? 'إزالة' : 'Remove'}</span>
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : (
          <section className={styles.emptyState}>
            <ShoppingBag size={30} aria-hidden="true" />
            <h2>{messages.shoppingList.emptyTitle}</h2>
            <p>{messages.shoppingList.emptyDescription}</p>
            <Link href={`/${locale}/products`} className={styles.storeLink}>
              {messages.shoppingList.continueBrowsing}
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </section>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
