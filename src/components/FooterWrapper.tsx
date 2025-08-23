import { getTopCategories } from '@/lib/categories';
import FooterClient from './FooterClient';

export default async function FooterWrapper() {
  const categories = await getTopCategories(6);
  return <FooterClient categories={categories} />;
}