import type { Metadata } from 'next';
import LocalizedCategoryPage, {
  generateMetadata as baseGenerateMetadata,
} from '@/app/[locale]/categories/[slug]/page';

export const revalidate = 86400;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return baseGenerateMetadata({
    params: Promise.resolve({ locale: 'ar', slug }),
  });
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return LocalizedCategoryPage({
    params: Promise.resolve({ locale: 'ar', slug }),
  });
}
