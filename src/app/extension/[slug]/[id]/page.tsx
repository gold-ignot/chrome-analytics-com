import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { apiClient } from '@/lib/api';
import { parseExtensionUrl, isValidExtensionSlug } from '@/lib/slugs';
import { metadataGenerators } from '@/lib/seoHelpers';
import ExtensionPageClient from './ExtensionPageClient';

interface ExtensionPageProps {
  params: Promise<{
    slug: string;
    id: string;
  }>;
}

// Generate static metadata
export async function generateMetadata({ params }: ExtensionPageProps): Promise<Metadata> {
  const { slug, id } = await params;
  const parsedParams = parseExtensionUrl(slug, id);
  
  // Validate slug format
  if (!isValidExtensionSlug(parsedParams.slug)) {
    return {
      title: 'Extension Not Found',
      description: 'The requested extension could not be found.',
    };
  }
  
  try {
    // Fetch extension data for metadata generation
    const extension = await apiClient.getExtension(parsedParams.id);
    
    if (!extension) {
      return {
        title: 'Extension Not Found',
        description: 'The requested extension could not be found.',
      };
    }
    
    return metadataGenerators.extension(extension);
  } catch (error) {
    console.error('Error generating metadata for extension:', error);
    return {
      title: 'Extension Not Found',
      description: 'The requested extension could not be found.',
    };
  }
}

export default async function ExtensionPage({ params }: ExtensionPageProps) {
  const { slug, id } = await params;
  const parsedParams = parseExtensionUrl(slug, id);
  
  // Validate slug format
  if (!isValidExtensionSlug(parsedParams.slug)) {
    notFound();
  }
  
  try {
    // Fetch extension data server-side
    const extension = await apiClient.getExtension(parsedParams.id);
    
    if (!extension) {
      notFound();
    }
    
    // Fetch related extensions server-side
    let relatedExtensions = [];
    try {
      const relatedResponse = await apiClient.getExtensions(1, 3, 'users', 'desc', extension.category, [extension.extension_id]);
      relatedExtensions = relatedResponse.extensions;
    } catch (error) {
      console.error('Error fetching related extensions:', error);
    }
    
    return (
      <ExtensionPageClient 
        extension={extension}
        relatedExtensions={relatedExtensions}
      />
    );
  } catch (error) {
    console.error('Error fetching extension data:', error);
    notFound();
  }
}