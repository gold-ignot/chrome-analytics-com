'use client';

import SearchBar from '@/components/SearchBar';

export default function HomePageClient() {
  const handleSearch = (query: string) => {
    window.location.href = `/extensions?search=${encodeURIComponent(query)}`;
  };

  return (
    <SearchBar 
      onSearch={handleSearch} 
      placeholder="Search Chrome extensions..." 
      variant="hero"
      showTypingAnimation={true}
    />
  );
}