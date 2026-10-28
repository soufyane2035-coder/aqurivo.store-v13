import React from 'react';
import { SiteFooter } from '@/components/sections/SiteFooter';
import { SiteHeader } from '@/components/sections/SiteHeader';
import { LoadingStatus, Skeleton } from './Skeleton';
import styles from './PageLoading.module.css';

export type PageLoadingKind =
  | 'catalog'
  | 'categories'
  | 'guides'
  | 'product'
  | 'guide';

export function PageLoading({ kind }: { kind: PageLoadingKind }) {
  return (
    <div className={styles.pageShell}>
      <SiteHeader />
      <main id="main-content" className={`siteContainer ${styles.main}`}>
        <LoadingStatus>
          {kind === 'product' ? (
            <ProductLoading />
          ) : kind === 'guide' ? (
            <GuideLoading />
          ) : (
            <ListingLoading kind={kind} />
          )}
        </LoadingStatus>
      </main>
      <SiteFooter />
    </div>
  );
}

function ListingLoading({ kind }: { kind: 'catalog' | 'categories' | 'guides' }) {
  return (
    <>
      <header className={styles.pageHeader} aria-hidden="true">
        <Skeleton variant="text" />
        <Skeleton variant="title" />
        <Skeleton variant="text" count={2} />
      </header>
      {kind === 'catalog' && (
        <div className={styles.filters} aria-hidden="true">
          <Skeleton variant="text" />
          <Skeleton variant="pill" count={5} />
        </div>
      )}
      <Skeleton variant={kind === 'catalog' ? 'card' : 'article'} count={kind === 'catalog' ? 8 : 6} />
    </>
  );
}

function ProductLoading() {
  return (
    <>
      <div className={styles.breadcrumb} aria-hidden="true">
        <Skeleton variant="text" />
      </div>
      <div className={styles.productLayout} aria-hidden="true">
        <div className={styles.gallery}>
          <Skeleton variant="media" />
          <Skeleton variant="thumbnail" count={4} />
        </div>
        <div className={styles.productInfo}>
          <Skeleton variant="text" />
          <Skeleton variant="title" count={2} />
          <Skeleton variant="text" count={3} />
          <div className={styles.priceBlock}>
            <Skeleton variant="title" />
            <Skeleton variant="text" />
          </div>
          <Skeleton variant="media" />
        </div>
      </div>
    </>
  );
}

function GuideLoading() {
  return (
    <>
      <div className={styles.breadcrumb} aria-hidden="true">
        <Skeleton variant="text" />
      </div>
      <header className={styles.guideHeader} aria-hidden="true">
        <Skeleton variant="text" />
        <Skeleton variant="title" count={2} />
        <Skeleton variant="text" count={2} />
      </header>
      <div className={styles.guideLayout} aria-hidden="true">
        <div className={styles.toc}>
          <Skeleton variant="text" count={5} />
        </div>
        <div className={styles.prose}>
          <Skeleton variant="title" />
          <Skeleton variant="text" count={5} />
          <Skeleton variant="title" />
          <Skeleton variant="text" count={6} />
        </div>
      </div>
    </>
  );
}
