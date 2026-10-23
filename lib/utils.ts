import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizeIsoCurrency(rawCurrency?: string | null): string {
  if (!rawCurrency) return 'USD';
  const trimmed = rawCurrency.trim().toUpperCase();
  if (trimmed === 'DH') return 'USD';
  if (/^[A-Z]{3}$/.test(trimmed)) return trimmed;
  return 'USD';
}

export function truncateSchemaName(name: string, maxLen = 75): string {
  const clean = (name || '').trim().replace(/\s+/g, ' ');
  if (!clean) return 'AQURIVO Curated Pick';
  if (clean.length <= maxLen) return clean;
  const sub = clean.slice(0, maxLen);
  const lastSpace = sub.lastIndexOf(' ');
  return (lastSpace > 30 ? sub.slice(0, lastSpace) : sub).trim();
}
