import type { Metadata } from 'next';
import LocalizedGuidesPage, {
  generateMetadata as baseGenerateMetadata,
} from '@/app/[locale]/guides/page';

export const revalidate = 86400;

export async function generateMetadata(): Promise<Metadata> {
  return baseGenerateMetadata({
    params: Promise.resolve({ locale: 'ar' }),
  });
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string; cursor?: string }>;
}) {
  return LocalizedGuidesPage({
    params: Promise.resolve({ locale: 'ar' }),
    searchParams,
  });
}
