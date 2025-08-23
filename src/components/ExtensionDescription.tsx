'use client';

import { useState } from 'react';

interface ExtensionDescriptionProps {
  description?: string;
  fullDescription?: string;
  maxLength?: number;
}

export default function ExtensionDescription({ 
  description, 
  fullDescription, 
  maxLength = 650 
}: ExtensionDescriptionProps) {
  const [showFullDescription, setShowFullDescription] = useState(false);

  // Use full_description if available, otherwise fall back to description
  const content = fullDescription || description;
  
  if (!content) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 h-[350px]">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <svg className="w-5 h-5 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          About This Extension
        </h2>
        <p className="text-gray-500">No description available.</p>
      </div>
    );
  }

  const shouldTruncate = content.length > maxLength;
  const displayContent = shouldTruncate && !showFullDescription 
    ? content.substring(0, maxLength) + '...'
    : content;

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 flex flex-col ${showFullDescription ? 'h-auto' : 'h-[350px]'}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center">
          <svg className="w-5 h-5 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          About This Extension
        </h2>
        {shouldTruncate && (
          <button
            onClick={() => setShowFullDescription(!showFullDescription)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium flex-shrink-0 cursor-pointer"
          >
            {showFullDescription ? 'Show less' : 'Show more'}
          </button>
        )}
      </div>
      <div className={`prose max-w-none ${!showFullDescription ? 'overflow-y-auto flex-1' : ''}`}>
        <div className="text-gray-700 leading-relaxed whitespace-pre-line">
          {displayContent}
        </div>
      </div>
    </div>
  );
}