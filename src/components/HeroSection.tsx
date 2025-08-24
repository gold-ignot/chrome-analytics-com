import { ReactNode } from 'react';
import HeroSearchWrapper from './HeroSearchWrapper';

interface HeroSectionProps {
  title: string;
  description: string;
  variant?: 'primary' | 'secondary';
  children?: ReactNode;
  icon?: ReactNode;
  searchable?: boolean;
  searchPath?: string;
  searchPlaceholder?: string;
  searchInitialValue?: string;
}

export default function HeroSection({ 
  title, 
  description, 
  variant = 'secondary',
  children,
  icon,
  searchable,
  searchPath,
  searchPlaceholder,
  searchInitialValue
}: HeroSectionProps) {
  const isPrimary = variant === 'primary';
  
  return (
    <section className="bg-gradient-to-br from-white to-slate-50 border-b border-slate-200 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-gradient-to-br from-blue-100/20 to-purple-100/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-gradient-to-br from-emerald-100/20 to-blue-100/20 rounded-full blur-3xl"></div>
      </div>
      
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        {icon && (
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              {icon}
            </div>
          </div>
        )}
        
        <h1 className={`font-bold mb-4 ${
          isPrimary 
            ? 'text-4xl lg:text-5xl gradient-text' 
            : 'text-3xl lg:text-4xl text-slate-900'
        }`}>
          {title}
        </h1>
        
        <p className={`text-slate-600 mb-8 max-w-2xl mx-auto leading-relaxed ${
          isPrimary ? 'text-xl' : 'text-lg'
        }`}>
          {description}
        </p>
        
        {searchable && searchPath && (
          <HeroSearchWrapper
            initialValue={searchInitialValue || ''}
            placeholder={searchPlaceholder || 'Search extensions...'}
            searchPath={searchPath}
          />
        )}
        
        {children && (
          <div className="max-w-lg mx-auto">
            {children}
          </div>
        )}
        
        {/* Subtle bottom gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent"></div>
      </div>
    </section>
  );
}