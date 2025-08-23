import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { Suspense } from 'react';
import { 
  metadataGenerators, 
  CATEGORIES, 
  CATEGORY_DESCRIPTIONS,
  CategoryKey 
} from '@/lib/seoHelpers';
import CategoryPageClient from './CategoryPageClient';

interface CategoryPageProps {
  params: Promise<{
    category: string;
  }>;
}

// Generate static metadata
export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { category } = await params;
  const categoryName = CATEGORIES[category as CategoryKey];
  
  if (!categoryName) {
    return {
      title: 'Category Not Found',
      description: 'The requested category does not exist.',
    };
  }
  
  return metadataGenerators.category(category, categoryName);
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category } = await params;
  const categoryName = CATEGORIES[category as CategoryKey];
  
  if (!categoryName) {
    notFound();
  }

  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Loading...</div>}>
      <CategoryPageClient category={category} categoryName={categoryName} />
    </Suspense>
  );
}

export async function generateStaticParams() {
  return Object.keys(CATEGORIES).map((category) => ({
    category,
  }));
}