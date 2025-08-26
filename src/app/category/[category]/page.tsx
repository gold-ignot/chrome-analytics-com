import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { Suspense } from 'react';
import { metadataGenerators } from '@/lib/seoHelpers';
import { apiClient } from '@/lib/api';
import CategoryPageClient from './CategoryPageClient';

interface CategoryPageProps {
  params: Promise<{
    category: string;
  }>;
}

// Generate static metadata
export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { category } = await params;
  
  try {
    const categoriesResponse = await apiClient.getCategories();
    const categoryData = categoriesResponse.categories.find(cat => cat.slug === category);
    
    if (!categoryData) {
      return {
        title: 'Category Not Found',
        description: 'The requested category does not exist.',
      };
    }
    
    return metadataGenerators.category(category, categoryData.name);
  } catch (error) {
    console.error('Failed to fetch categories for metadata:', error);
    return {
      title: 'Category Not Found',
      description: 'The requested category does not exist.',
    };
  }
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category } = await params;
  
  try {
    const categoriesResponse = await apiClient.getCategories();
    const categoryData = categoriesResponse.categories.find(cat => cat.slug === category);
    
    if (!categoryData) {
      notFound();
    }

    return (
      <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Loading...</div>}>
        <CategoryPageClient category={category} categoryName={categoryData.name} />
      </Suspense>
    );
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    notFound();
  }
}

export async function generateStaticParams() {
  try {
    const categoriesResponse = await apiClient.getCategories();
    return categoriesResponse.categories.map((category) => ({
      category: category.slug,
    }));
  } catch (error) {
    console.error('Failed to fetch categories for static params:', error);
    return [];
  }
}