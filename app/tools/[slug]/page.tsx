import { redirect } from 'next/navigation';

export default async function RootToolSlugRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/ar/tools/${encodeURIComponent(slug)}`);
}
