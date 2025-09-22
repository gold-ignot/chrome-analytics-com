/**
 * Utility functions for generating SEO-friendly slugs and URLs
 */

import { Extension } from './api';

/**
 * Convert a string to a URL-friendly slug
 */
export function createSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    // Replace spaces and special characters with hyphens
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Limit length for better URLs
    .substring(0, 60)
    // Remove trailing hyphen if truncated
    .replace(/-+$/, '');
}

/**
 * Generate slug from extension name
 */
export function createExtensionSlug(extension: Extension): string {
  // Always use extension's slug from backend if available
  if (extension.slug && extension.slug.trim()) {
    return extension.slug.trim();
  }

  // Fallback only if backend doesn't provide a slug
  const slug = createSlug(extension.name);

  // Final fallback to a generic slug if name produces empty slug
  if (!slug) {
    return 'chrome-extension';
  }

  return slug;
}

/**
 * Generate the full URL path for an extension
 */
export function createExtensionUrl(extension: Extension): string {
  const slug = createExtensionSlug(extension);
  return `/extension/${slug}/${extension.extension_id}`;
}

/**
 * Parse extension URL to extract slug and ID
 */
export function parseExtensionUrl(slug: string, id: string): { slug: string; id: string } {
  return { slug, id };
}

/**
 * Generate extension URLs for different contexts
 */
export const extensionUrls = {
  /**
   * Main extension page URL
   */
  main: (extension: Extension) => createExtensionUrl(extension),
  
  /**
   * Extension analytics/stats URL
   */
  analytics: (extension: Extension) => `${createExtensionUrl(extension)}/analytics`,
  
  /**
   * Extension reviews URL  
   */
  reviews: (extension: Extension) => `${createExtensionUrl(extension)}/reviews`,
  
  /**
   * Chrome Web Store URL (external)
   */
  store: (extensionId: string) => `https://chrome.google.com/webstore/detail/${extensionId}`,
};

/**
 * Validate extension slug format
 */
export function isValidExtensionSlug(slug: string): boolean {
  // Check if slug matches expected format - allow regular hyphens and em dashes
  return /^[a-z0-9]+(?:[-—][a-z0-9]+)*$/.test(slug) && slug.length > 0 && slug.length <= 60;
}

/**
 * Generate breadcrumb-friendly title from slug
 */
export function slugToTitle(slug: string): string {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}