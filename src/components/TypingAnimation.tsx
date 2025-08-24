'use client';

import { useState, useEffect } from 'react';

interface TypingAnimationProps {
  suggestions: string[];
  className?: string;
}

export default function TypingAnimation({ suggestions, className = '' }: TypingAnimationProps) {
  const [currentSuggestionIndex, setCurrentSuggestionIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const currentSuggestion = suggestions[currentSuggestionIndex];
    let timeout: NodeJS.Timeout;

    if (isTyping) {
      // Typing phase
      if (currentText.length < currentSuggestion.length) {
        timeout = setTimeout(() => {
          setCurrentText(currentSuggestion.slice(0, currentText.length + 1));
        }, 100); // Typing speed
      } else {
        // Finished typing, wait then start deleting
        timeout = setTimeout(() => {
          setIsTyping(false);
        }, 2000); // Pause after typing
      }
    } else {
      // Deleting phase
      if (currentText.length > 0) {
        timeout = setTimeout(() => {
          setCurrentText(currentText.slice(0, -1));
        }, 50); // Deleting speed (faster than typing)
      } else {
        // Finished deleting, move to next suggestion
        setCurrentSuggestionIndex((prev) => (prev + 1) % suggestions.length);
        setIsTyping(true);
        // Brief pause before starting next word
        timeout = setTimeout(() => {
          setCurrentText('');
        }, 500);
      }
    }

    return () => clearTimeout(timeout);
  }, [currentText, isTyping, currentSuggestionIndex, suggestions]);

  // Cursor blink effect
  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setIsVisible(prev => !prev);
    }, 600);

    return () => clearInterval(cursorInterval);
  }, []);

  return (
    <div className={className}>
      Try "
      <span className="text-blue-600">
        {currentText}
        <span className={`inline-block transition-opacity duration-100 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
          |
        </span>
      </span>
      "
    </div>
  );
}