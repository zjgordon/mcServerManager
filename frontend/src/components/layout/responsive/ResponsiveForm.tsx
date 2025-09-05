import React from 'react';
import { cn } from '../../../lib/utils';

interface ResponsiveFormProps {
  children: React.ReactNode;
  className?: string;
  columns?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
  };
  gap?: 'sm' | 'md' | 'lg';
  spacing?: 'sm' | 'md' | 'lg';
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  centered?: boolean;
}

const ResponsiveForm: React.FC<ResponsiveFormProps> = ({
  children,
  className,
  columns = { default: 1, sm: 1, md: 2 },
  gap = 'md',
  spacing = 'md',
  maxWidth = 'lg',
  centered = true
}) => {
  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6'
  };

  const spacingClasses = {
    sm: 'space-y-2',
    md: 'space-y-4',
    lg: 'space-y-6'
  };

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-full'
  };

  const getColumnClasses = () => {
    const colClasses = [];
    
    if (columns.default) {
      colClasses.push(`grid-cols-${columns.default}`);
    }
    if (columns.sm) {
      colClasses.push(`sm:grid-cols-${columns.sm}`);
    }
    if (columns.md) {
      colClasses.push(`md:grid-cols-${columns.md}`);
    }
    if (columns.lg) {
      colClasses.push(`lg:grid-cols-${columns.lg}`);
    }

    return `grid ${colClasses.join(' ')}`;
  };

  return (
    <div 
      className={cn(
        'w-full',
        maxWidthClasses[maxWidth],
        centered && 'mx-auto',
        className
      )}
    >
      <div className={cn(spacingClasses[spacing])}>
        <div className={cn(getColumnClasses(), gapClasses[gap])}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default ResponsiveForm;
