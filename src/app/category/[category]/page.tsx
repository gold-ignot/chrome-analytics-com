import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { 
  metadataGenerators, 
  CATEGORIES, 
  CATEGORY_DESCRIPTIONS,
  CategoryKey 
} from '@/lib/seoHelpers';
import CategoryPageClient from './CategoryPageClient';

interface CategoryPageProps {
  params: {
    category: string;
  };
}

// Generate static metadata
export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { category } = params;
  const categoryName = CATEGORIES[category as CategoryKey];
  
  if (!categoryName) {
    return {
      title: 'Category Not Found',
      description: 'The requested category does not exist.',
    };
  }
  
  return metadataGenerators.category(category, categoryName);
}

export default function CategoryPage({ params }: CategoryPageProps) {
  const { category } = params;
  const categoryName = CATEGORIES[category as CategoryKey];
  
  if (!categoryName) {
    notFound();
  }

  return <CategoryPageClient category={category} categoryName={categoryName} />;
}

export async function generateStaticParams() {
  return Object.keys(CATEGORIES).map((category) => ({
    category,
  }));
}