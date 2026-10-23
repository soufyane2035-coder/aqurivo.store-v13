/**
 * Real-Time In-Browser Implicit Signal Engine (0 KB External Dependencies).
 *
 * Captures subtle visitor engagement signals:
 * - Active dwell time on product pages (pauses cleanly when user switches tabs and resumes on return)
 * - Deep engagement with specification & pricing tables (scroll depth >= 45%)
 * - Time-decayed weighted average price target & true weighted median price
 * - Mathematical exponential half-life decay (T_1/2 = 15 minutes)
 * - Calibrated session browsing velocity metrics (skimming, moderate, deep_research)
 * - Automatic signal TTL expiration (45 minutes) & explicit personalization history reset
 */

'use client';

export interface ProductDwellSignal {
  slug: string;
  categorySlug: string;
  priceUsd: number;
  activeSeconds: number;
  deepScroll: boolean;
  timestamp: number;
}

export type SessionBrowsingSpeed = 'skimming' | 'moderate' | 'deep_research';

export interface SessionVelocityMetrics {
  distinctCount: number;
  totalActiveSeconds: number;
  avgDwellSeconds: number;
  productsPerMinute: number;
  speed: SessionBrowsingSpeed;
  explorationRatio: number;
}

export interface SessionIntentVector {
  /** Map of categorySlug -> accumulated dwell weight */
  categoryAffinities: Record<string, number>;
  /** Time-decayed weighted average price target preferred by the visitor */
  preferredPriceTarget: number;
  /** Mathematical weighted median price across engaged products */
  weightedMedianPrice: number;
  /** Price confidence range (min/max based on explored items) */
  priceMin: number;
  priceMax: number;
  /** Total active shopping seconds this session */
  totalActiveSeconds: number;
  /** Top recently engaged product slugs (sorted by engagement weight) */
  topEngagedSlugs: string[];
  /** Inferred browsing velocity classification */
  sessionVelocity: SessionBrowsingSpeed;
  /** Dynamically computed Multi-Armed Bandit exploration epsilon */
  explorationRatio: number;
}

const STORAGE_KEY = 'aqurivo_session_intent_v1';
const MAX_STORED_SIGNALS = 24;

/** Signals older than 45 minutes expire automatically to maintain relevance */
export const SIGNAL_TTL_MS = 45 * 60 * 1000;

/** Exponential decay half-life: 15 minutes (900,000 ms) */
export const DECAY_HALF_LIFE_MS = 15 * 60 * 1000;
const LN2 = Math.LN2; // 0.69314718056...

/** In-memory active tracker state */
interface ActiveTrackerState {
  slug: string;
  categorySlug: string;
  priceUsd: number;
  startedAt: number;
  accumulatedSeconds: number;
  lastTick: number;
  intervalId: number | null;
  deepScroll: boolean;
  isPaused: boolean;
}

let activeTracker: ActiveTrackerState | null = null;

/**
 * Retrieves valid, unexpired dwell signals from sessionStorage.
 * Automatically purges corrupted entries and signals older than SIGNAL_TTL_MS.
 */
export function getStoredSignals(): ProductDwellSignal[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const now = Date.now();
    let hasExpired = false;

    const validSignals = parsed.filter((item): item is ProductDwellSignal => {
      if (!item || typeof item !== 'object') return false;
      if (typeof item.slug !== 'string' || !item.slug.trim()) return false;
      if (typeof item.activeSeconds !== 'number' || item.activeSeconds < 1) return false;
      const ts = typeof item.timestamp === 'number' ? item.timestamp : 0;
      if (now - ts > SIGNAL_TTL_MS) {
        hasExpired = true;
        return false;
      }
      return true;
    });

    if (hasExpired && validSignals.length !== parsed.length) {
      saveStoredSignalsSilently(validSignals);
    }

    return validSignals;
  } catch {
    return [];
  }
}

function saveStoredSignalsSilently(signals: ProductDwellSignal[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(signals.slice(0, MAX_STORED_SIGNALS))
    );
  } catch {
    // Gracefully ignore storage quota or private browsing exceptions
  }
}

function saveStoredSignals(signals: ProductDwellSignal[]): void {
  if (typeof window === 'undefined') return;
  try {
    saveStoredSignalsSilently(signals);
    window.dispatchEvent(new CustomEvent('aqurivo:session-intent-updated'));
  } catch {
    // Gracefully ignore storage quota issues
  }
}

/**
 * Completely clears the in-browser personalization history and cancels any active tracker.
 */
export function clearSessionIntent(): void {
  if (typeof window === 'undefined') return;

  if (activeTracker?.intervalId !== null && activeTracker?.intervalId !== undefined) {
    window.clearInterval(activeTracker.intervalId);
  }
  activeTracker = null;

  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('aqurivo:session-intent-cleared'));
    window.dispatchEvent(new CustomEvent('aqurivo:session-intent-updated'));
  } catch {
    // Ignore in restricted environments
  }
}

/**
 * Calculates in-depth session velocity metrics based on traversal speed,
 * dwell duration, and interaction depth.
 *
 * Mathematical properties:
 * - Handles empty sessions cleanly with zero division guards.
 * - Restricts elapsed window to active session bounds (max 45 min) to prevent
 *   stale sessions from distorting productsPerMinute.
 */
export function getSessionVelocityMetrics(): SessionVelocityMetrics {
  const fallback: SessionVelocityMetrics = {
    distinctCount: 0,
    totalActiveSeconds: 0,
    avgDwellSeconds: 0,
    productsPerMinute: 0,
    speed: 'moderate',
    explorationRatio: 0.20,
  };

  if (typeof window === 'undefined') return fallback;
  const signals = getStoredSignals();
  if (signals.length === 0) return fallback;

  const distinctCount = signals.length;
  const totalActiveSeconds = signals.reduce((sum, s) => sum + s.activeSeconds, 0);
  const avgDwellSeconds = totalActiveSeconds / Math.max(1, distinctCount);

  // Measure elapsed session browsing window strictly within recent active bounds
  const timestamps = signals.map((s) => s.timestamp).filter((t) => typeof t === 'number' && t > 0);
  const now = Date.now();
  const minTimestamp = timestamps.length > 0 ? Math.min(...timestamps) : now;
  const maxTimestamp = timestamps.length > 0 ? Math.max(...timestamps) : now;

  // Active span between first recorded interaction and latest activity + active dwell
  const rawSpanMinutes = (maxTimestamp - minTimestamp) / 60000;
  const dwellMinutes = totalActiveSeconds / 60;
  const elapsedMinutes = Math.min(45, Math.max(0.5, Math.max(rawSpanMinutes, dwellMinutes)));
  const productsPerMinute = Math.round((distinctCount / elapsedMinutes) * 10) / 10;

  const hasDeepScroll = signals.some((s) => s.deepScroll);

  // 1. Fast Skimming Behavior:
  // Rapid traversal across 3+ items with low dwell (< 14s) or high velocity (>= 2.0 items/min)
  if ((distinctCount >= 3 && avgDwellSeconds < 14) || (distinctCount >= 4 && productsPerMinute >= 2.0)) {
    const velocityBoost = Math.min(0.08, productsPerMinute * 0.02);
    const dwellBoost = Math.min(0.07, (14 - Math.min(14, avgDwellSeconds)) * 0.01);
    const explorationRatio = Math.round(Math.min(0.35, 0.20 + velocityBoost + dwellBoost) * 100) / 100;
    return {
      distinctCount,
      totalActiveSeconds: Math.round(totalActiveSeconds),
      avgDwellSeconds: Math.round(avgDwellSeconds),
      productsPerMinute,
      speed: 'skimming',
      explorationRatio,
    };
  }

  // 2. Deep Research Behavior:
  // Patient, thorough study (average dwell >= 24s, or deep scroll with steady pace)
  if (avgDwellSeconds >= 24 || (distinctCount >= 2 && hasDeepScroll && productsPerMinute < 1.4)) {
    const dwellReduction = Math.min(0.10, (avgDwellSeconds - 20) * 0.005);
    const scrollBonus = hasDeepScroll ? 0.02 : 0;
    const explorationRatio = Math.round(Math.max(0.08, 0.20 - dwellReduction - scrollBonus) * 100) / 100;
    return {
      distinctCount,
      totalActiveSeconds: Math.round(totalActiveSeconds),
      avgDwellSeconds: Math.round(avgDwellSeconds),
      productsPerMinute,
      speed: 'deep_research',
      explorationRatio,
    };
  }

  // 3. Moderate Baseline:
  return {
    distinctCount,
    totalActiveSeconds: Math.round(totalActiveSeconds),
    avgDwellSeconds: Math.round(avgDwellSeconds),
    productsPerMinute,
    speed: 'moderate',
    explorationRatio: 0.20,
  };
}

/**
 * Calculates a dynamic Multi-Armed Bandit exploration ratio (epsilon)
 * based strictly on visitor session browsing speed and engagement depth.
 */
export function calculateDynamicExplorationRatio(): number {
  return getSessionVelocityMetrics().explorationRatio;
}

/**
 * Computes the mathematical weighted median price given an array of { price, weight }.
 */
function computeWeightedMedian(items: Array<{ price: number; weight: number }>, totalWeight: number): number {
  if (items.length === 0 || totalWeight <= 0) return 0;
  if (items.length === 1) return items[0].price;

  const sorted = [...items].sort((a, b) => a.price - b.price);
  const halfWeight = totalWeight / 2;
  let cumulative = 0;

  for (let i = 0; i < sorted.length; i++) {
    cumulative += sorted[i].weight;
    if (cumulative >= halfWeight) {
      return sorted[i].price;
    }
  }

  return sorted[sorted.length - 1].price;
}

/**
 * Computes the synthesized intent vector from raw dwell signals.
 *
 * Mathematical Foundations:
 * 1. Exponential Half-life Decay:
 *    Formula: decay = exp(-ln(2) * age / T_half) = 2^(-age / T_half)
 *    Ensures interactions from 15 minutes ago retain exactly 50% weight,
 *    interactions from 30 minutes ago retain 25% weight, etc.
 *
 * 2. Log-scaled Dwell Engagement:
 *    Formula: dwellBonus = min(3.0, ln(1 + activeSeconds / 5))
 *    Prevents open unattended tabs from infinitely dominating the profile.
 *
 * 3. Price Target:
 *    Calculates both time-decayed weighted average and true weighted median.
 */
export function computeSessionIntentVector(): SessionIntentVector {
  const velocityMetrics = getSessionVelocityMetrics();
  const signals = getStoredSignals();

  if (signals.length === 0) {
    return {
      categoryAffinities: {},
      preferredPriceTarget: 0,
      weightedMedianPrice: 0,
      priceMin: 0,
      priceMax: 0,
      totalActiveSeconds: 0,
      topEngagedSlugs: [],
      sessionVelocity: velocityMetrics.speed,
      explorationRatio: velocityMetrics.explorationRatio,
    };
  }

  const now = Date.now();
  const categoryScores: Record<string, number> = {};
  const productWeights: Array<{ slug: string; weight: number }> = [];
  const priceEntries: Array<{ price: number; weight: number }> = [];
  let weightedPriceSum = 0;
  let totalWeight = 0;
  let minPrice = Infinity;
  let maxPrice = 0;
  let totalSeconds = 0;

  for (const sig of signals) {
    const ageMs = Math.max(0, now - sig.timestamp);
    // True exponential half-life decay: decay = 2^(-ageMs / 900000)
    const decay = Math.exp((-LN2 * ageMs) / DECAY_HALF_LIFE_MS);

    // Engagement weight: baseline + log-scale dwell time bonus + scroll bonus
    const dwellBonus = Math.min(3.0, Math.log1p(sig.activeSeconds / 5));
    const scrollBonus = sig.deepScroll ? 1.5 : 1.0;
    const weight = (1.0 + dwellBonus) * scrollBonus * decay;

    totalSeconds += sig.activeSeconds;

    // Category accumulation
    const cat = sig.categorySlug || 'general';
    categoryScores[cat] = (categoryScores[cat] || 0) + weight;

    // Price bounds & weighted accumulation
    if (sig.priceUsd > 0) {
      weightedPriceSum += sig.priceUsd * weight;
      totalWeight += weight;
      minPrice = Math.min(minPrice, sig.priceUsd);
      maxPrice = Math.max(maxPrice, sig.priceUsd);
      priceEntries.push({ price: sig.priceUsd, weight });
    }

    productWeights.push({ slug: sig.slug, weight });
  }

  // Sort products by engagement weight descending
  productWeights.sort((a, b) => b.weight - a.weight);
  const topEngagedSlugs = Array.from(new Set(productWeights.map((p) => p.slug))).slice(0, 8);

  // Time-decayed weighted average price target
  const preferredPriceTarget = totalWeight > 0
    ? Math.round((weightedPriceSum / totalWeight) * 100) / 100
    : 0;

  // Mathematically accurate weighted median price
  const weightedMedianPrice = computeWeightedMedian(priceEntries, totalWeight);

  return {
    categoryAffinities: categoryScores,
    preferredPriceTarget,
    weightedMedianPrice,
    priceMin: Number.isFinite(minPrice) ? minPrice : 0,
    priceMax: maxPrice,
    totalActiveSeconds: Math.round(totalSeconds),
    topEngagedSlugs,
    sessionVelocity: velocityMetrics.speed,
    explorationRatio: velocityMetrics.explorationRatio,
  };
}

/**
 * Saves current tracker progress to storage without destroying the in-memory tracker.
 * Called when tab visibility changes or before page changes.
 */
function persistCurrentTrackerDwell(): void {
  if (!activeTracker) return;

  const seconds = Math.round(activeTracker.accumulatedSeconds);
  if (seconds >= 2) {
    const existing = getStoredSignals().filter((s) => s.slug !== activeTracker!.slug);
    const updated: ProductDwellSignal[] = [
      {
        slug: activeTracker.slug,
        categorySlug: activeTracker.categorySlug,
        priceUsd: activeTracker.priceUsd,
        activeSeconds: seconds,
        deepScroll: activeTracker.deepScroll,
        timestamp: Date.now(),
      },
      ...existing,
    ].slice(0, MAX_STORED_SIGNALS);

    saveStoredSignals(updated);
  }
}

/**
 * Starts recording active dwell time on a product page.
 *
 * Lifecycle & Tab Visibility Architecture:
 * - Tracks active elapsed seconds via requestAnimationFrame / interval.
 * - When tab is hidden: pauses accumulation, saves progress to storage so no
 *   data is lost if the window closes, but preserves the tracker in memory.
 * - When tab is revealed: resumes active tracking seamlessly on the same product.
 * - When user navigates to another product or leaves: flushes and finalizes.
 */
export function startProductDwellTracking(
  slug: string,
  categorySlug: string,
  priceUsd: number
): () => void {
  if (typeof window === 'undefined' || !slug) {
    return () => {};
  }

  // If already tracking this exact product, ensure it is unpaused
  if (activeTracker && activeTracker.slug === slug) {
    activeTracker.isPaused = false;
    activeTracker.lastTick = Date.now();
    return () => {
      flushActiveDwellTracker(slug);
    };
  }

  // Flush previous tracker if tracking a different product
  flushActiveDwellTracker();

  const now = Date.now();
  activeTracker = {
    slug,
    categorySlug,
    priceUsd: Math.max(0, priceUsd),
    startedAt: now,
    accumulatedSeconds: 0,
    lastTick: now,
    intervalId: null,
    deepScroll: false,
    isPaused: document.visibilityState === 'hidden',
  };

  const tick = () => {
    if (!activeTracker || activeTracker.isPaused) return;
    const currentNow = Date.now();
    if (document.visibilityState === 'visible') {
      const deltaSec = Math.min(5, Math.max(0, (currentNow - activeTracker.lastTick) / 1000));
      activeTracker.accumulatedSeconds += deltaSec;
    }
    activeTracker.lastTick = currentNow;
  };

  activeTracker.intervalId = window.setInterval(tick, 1000);

  // Scroll listener for deep engagement
  const scrollListener = () => {
    if (!activeTracker) return;
    try {
      const scrollPercent =
        (window.scrollY + window.innerHeight) /
        Math.max(1, document.documentElement.scrollHeight);
      if (scrollPercent > 0.45) {
        activeTracker.deepScroll = true;
      }
    } catch {
      // Ignore scroll geometry exceptions
    }
  };

  // Visibility listener: pause accumulation when hidden and snapshot progress;
  // resume active tick without loss when user returns to tab.
  const visibilityListener = () => {
    if (!activeTracker) return;

    if (document.visibilityState === 'hidden') {
      // Accumulate final visible slice before pause
      const currentNow = Date.now();
      if (!activeTracker.isPaused) {
        const deltaSec = Math.min(5, Math.max(0, (currentNow - activeTracker.lastTick) / 1000));
        activeTracker.accumulatedSeconds += deltaSec;
      }
      activeTracker.isPaused = true;
      activeTracker.lastTick = currentNow;
      // Persist snapshot to storage without resetting activeTracker
      persistCurrentTrackerDwell();
    } else if (document.visibilityState === 'visible') {
      // User returned to tab: resume tracking
      activeTracker.isPaused = false;
      activeTracker.lastTick = Date.now();
    }
  };

  // Page hide / beforeunload listener: final snapshot
  const pageHideListener = () => {
    persistCurrentTrackerDwell();
  };

  window.addEventListener('scroll', scrollListener, { passive: true });
  document.addEventListener('visibilitychange', visibilityListener);
  window.addEventListener('pagehide', pageHideListener);
  window.addEventListener('beforeunload', pageHideListener);

  // Cleanup handler called when component unmounts or slug changes
  return () => {
    window.removeEventListener('scroll', scrollListener);
    document.removeEventListener('visibilitychange', visibilityListener);
    window.removeEventListener('pagehide', pageHideListener);
    window.removeEventListener('beforeunload', pageHideListener);
    flushActiveDwellTracker(slug);
  };
}

/**
 * Commits and finalizes the active dwell tracker into storage.
 * If targetSlug is provided, only flushes if it matches the current active tracker.
 */
export function flushActiveDwellTracker(targetSlug?: string): void {
  if (!activeTracker) return;
  if (targetSlug && activeTracker.slug !== targetSlug) return;

  if (activeTracker.intervalId !== null) {
    window.clearInterval(activeTracker.intervalId);
    activeTracker.intervalId = null;
  }

  // Accumulate final slice if not paused
  if (!activeTracker.isPaused && document.visibilityState === 'visible') {
    const deltaSec = Math.min(5, Math.max(0, (Date.now() - activeTracker.lastTick) / 1000));
    activeTracker.accumulatedSeconds += deltaSec;
  }

  persistCurrentTrackerDwell();
  activeTracker = null;
}
