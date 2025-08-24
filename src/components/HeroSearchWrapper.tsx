'use client';

import { useRouter } from 'next/navigation';
import SearchBar from './SearchBar';

interface HeroSearchWrapperProps {
  initialValue?: string;
  placeholder?: string;
  searchPath: string; // e.g., '/popular', '/trending'
}

export default function HeroSearchWrapper({ 
  initialValue = '', 
  placeholder = 'Search extensions...',
  searchPath 
}: HeroSearchWrapperProps) {
  const router = useRouter();

  const handleSearch = (query: string) => {
    const params = new URLSearchParams();
    if (query.trim()) {
      params.set('search', query);
    }
    const queryString = params.toString();
    const newUrl = queryString ? `${searchPath}?${queryString}` : searchPath;
    router.push(newUrl);
  };

  return (
    <div className="max-w-lg mx-auto">
      <SearchBar 
        onSearch={handleSearch}
        initialValue={initialValue}
        placeholder={placeholder}
        variant="hero"
      />
    </div>
  );
}