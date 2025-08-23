import { notFound } from 'next/navigation';
import { Metadata } from 'next';
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

  return <BestPageClient type={type} typeInfo={typeInfo} />;
}

export async function generateStaticParams() {
  return Object.keys(BEST_TYPES).map((type) => ({
    type,
  }));
}