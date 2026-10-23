import type { Metadata } from 'next';
import LocalizedProductsPage, {
  generateMetadata as baseGenerateMetadata,
} from '@/app/[locale]/products/page';

export const revalidate = 86400;

export async function generateMetadata(): Promise<Metadata> {
  return baseGenerateMetadata({
    params: Promise.resolve({ locale: 'ar' }),
  });
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; source?: string; q?: string }>;
}) {
  return LocalizedProductsPage({
    params: Promise.resolve({ locale: 'ar' }),
    searchParams,
  });
}
