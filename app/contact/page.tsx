import type { Metadata } from 'next';
import LocalizedContactPage, {
  generateMetadata as baseGenerateMetadata,
} from '@/app/[locale]/contact/page';

export async function generateMetadata(): Promise<Metadata> {
  return baseGenerateMetadata({
    params: Promise.resolve({ locale: 'ar' }),
  });
}

export default async function ContactPage() {
  return LocalizedContactPage({
    params: Promise.resolve({ locale: 'ar' }),
  });
}
