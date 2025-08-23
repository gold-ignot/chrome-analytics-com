import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { Suspense } from 'react';
import { 
  metadataGenerators, 
  BEST_TYPES,
  BestTypeKey 
} from '@/lib/seoHelpers';
import BestPageClient from './BestPageClient';

interface BestPageProps {
  params: Promise<{
    type: string;
  }>;
}

// Generate static metadata
export async function generateMetadata({ params }: BestPageProps): Promise<Metadata> {
  const { type } = await params;
  const typeInfo = BEST_TYPES[type as BestTypeKey];
  
  if (!typeInfo) {
    return {
      title: 'Page Not Found',
      description: 'The requested page does not exist.',
    };
  }
  
  return metadataGenerators.best(type, typeInfo);
}

export default async function BestPage({ params }: BestPageProps) {
  const { type } = await params;
  const typeInfo = BEST_TYPES[type as BestTypeKey];
  
  if (!typeInfo) {
    notFound();
  }

  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Loading...</div>}>
      <BestPageClient type={type} typeInfo={typeInfo} />
    </Suspense>
  );
}

export async function generateStaticParams() {
  return Object.keys(BEST_TYPES).map((type) => ({
    type,
  }));
}