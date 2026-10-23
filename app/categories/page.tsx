import type { Metadata } from 'next';
import CategoriesIndexPage, {
  generateMetadata as baseGenerateMetadata,
} from '@/app/[locale]/categories/page';

export const revalidate = 86400;

export async function generateMetadata(): Promise<Metadata> {
  return baseGenerateMetadata({
    params: Promise.resolve({ locale: 'ar' }),
  });
}

export default async function RootCategoriesPage() {
  return CategoriesIndexPage({
    params: Promise.resolve({ locale: 'ar' }),
  });
}
