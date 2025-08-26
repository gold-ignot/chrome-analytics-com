'use client';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  className?: string;
}

export default function Tooltip({ content, children, className = "" }: TooltipProps) {
  return (
    <div className={`group relative cursor-help ${className}`}>
      {children}
      
      {/* Talk Bubble Tooltip Above */}
      <div className="absolute bottom-full mb-2 left-0 right-0 bg-white border border-gray-200 text-gray-800 text-sm rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-[9999] whitespace-normal shadow-lg">
        <div className="relative">
          {content}
        </div>
      </div>
      
      {/* Separate arrow positioned between tooltip and card */}
      <div className="absolute bottom-full mb-[1px] left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-[9999]">
        {/* Border arrow (outer) */}
        <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-t-[8px] border-transparent border-t-gray-200"></div>
        {/* White arrow (inner) */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 translate-y-[-1px] w-0 h-0 border-l-[9px] border-r-[9px] border-t-[7px] border-transparent border-t-white"></div>
      </div>
    </div>
  );
}