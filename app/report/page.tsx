import type { Metadata } from 'next';
import ReportPage, {
  generateMetadata as baseGenerateMetadata,
} from '@/app/[locale]/report/page';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return baseGenerateMetadata({
    params: Promise.resolve({ locale: 'ar' }),
  });
}

export default async function RootReportPage({
  searchParams,
}: {
  searchParams: Promise<{
    productSlug?: string;
    productName?: string;
  }>;
}) {
  return ReportPage({
    params: Promise.resolve({ locale: 'ar' }),
    searchParams,
  });
}
