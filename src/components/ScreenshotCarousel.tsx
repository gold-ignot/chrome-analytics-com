'use client';

import { useState } from 'react';
import ImagePreviewModal from './ImagePreviewModal';

interface ScreenshotCarouselProps {
  screenshots: string[];
  extensionName: string;
}

export default function ScreenshotCarousel({ screenshots, extensionName }: ScreenshotCarouselProps) {
  const [currentScreenshot, setCurrentScreenshot] = useState(0);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  if (!screenshots || screenshots.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 h-[350px] overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center">
          <svg className="w-5 h-5 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Screenshots
        </h2>
        <span className="text-sm text-gray-500">
          {currentScreenshot + 1} of {screenshots.length}
        </span>
      </div>
      
      <div className="relative">
        {/* Main Screenshot */}
        <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
          <img
            src={screenshots[currentScreenshot]}
            alt={`${extensionName} screenshot ${currentScreenshot + 1}`}
            className="w-full h-full object-contain cursor-pointer"
            onClick={() => setIsPreviewOpen(true)}
          />
          
          {/* Navigation Arrows */}
          {screenshots.length > 1 && (
            <>
              <button
                onClick={() => setCurrentScreenshot(prev => prev === 0 ? screenshots.length - 1 : prev - 1)}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <button
                onClick={() => setCurrentScreenshot(prev => prev === screenshots.length - 1 ? 0 : prev + 1)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}
        </div>
        
        {/* Thumbnail Navigation - Only show if more than 1 screenshot */}
        {screenshots.length > 1 && (
          <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
            {screenshots.map((screenshot, index) => (
              <button
                key={index}
                onClick={() => setCurrentScreenshot(index)}
                className={`flex-shrink-0 w-16 h-12 rounded border-2 overflow-hidden transition-all ${
                  index === currentScreenshot ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <img
                  src={screenshot}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      <ImagePreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        imageSrc={screenshots[currentScreenshot]}
        imageAlt={`${extensionName} screenshot ${currentScreenshot + 1}`}
      />
    </div>
  );
}