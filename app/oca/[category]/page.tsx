import { OcaBrowse } from '@/app/oca/page';
import { OCA_CATEGORIES } from '@/db/schema';
import type { OcaCategory } from '@/db/schema';
import { notFound } from 'next/navigation';

// Normalize URL slug → OcaCategory (e.g. "email" → "Email")
function slugToCategory(slug: string): OcaCategory | null {
  const match = OCA_CATEGORIES.find(
    (cat) => cat.toLowerCase() === slug.toLowerCase(),
  );
  return match ?? null;
}

export default async function OcaCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: slug } = await params;
  const category = slugToCategory(slug);
  if (!category) notFound();
  return <OcaBrowse initialCategory={category} />;
}

export function generateStaticParams() {
  return OCA_CATEGORIES.map((cat) => ({ category: cat.toLowerCase() }));
}
