import React from 'react';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';

/**
 * A reusable modern card component with soft shadows and 
 * high-rounded corners matching the RadiExpense design.
 */
const Card = ({ children, className, title, extra }) => {
  return (
    <div className={twMerge(
      "bg-white rounded-4xl p-6 shadow-soft border border-white/50 transition-all duration-300",
      className
    )}>
      {/* Header section if a title is provided */}
      {(title || extra) && (
        <div className="flex justify-between items-center mb-6">
          {title && (
            <h3 className="font-bold text-app-card-dark tracking-tight">
              {title}
            </h3>
          )}
          {extra && (
            <div className="text-xs font-bold text-app-accent px-3 py-1 bg-app-accent/10 rounded-full">
              {extra}
            </div>
          )}
        </div>
      )}

      {/* Main Content */}
      <div className="w-full">
        {children}
      </div>
    </div>
  );
};

export default Card;