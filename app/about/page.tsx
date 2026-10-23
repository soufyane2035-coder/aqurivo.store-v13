import type { Metadata } from 'next';
import LocalizedAboutPage, {
  generateMetadata as baseGenerateMetadata,
} from '@/app/[locale]/about/page';

export async function generateMetadata(): Promise<Metadata> {
  return baseGenerateMetadata({
    params: Promise.resolve({ locale: 'ar' }),
  });
}

export default async function AboutPage() {
  return LocalizedAboutPage({
    params: Promise.resolve({ locale: 'ar' }),
  });
}
