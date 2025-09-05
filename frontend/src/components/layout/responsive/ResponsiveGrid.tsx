import React from 'react';
import { cn } from '../../../lib/utils';

interface ResponsiveGridProps {
  children: React.ReactNode;
  className?: string;
  cols?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    '2xl'?: number;
  };
  gap?: 'sm' | 'md' | 'lg' | 'xl';
  autoFit?: boolean;
  minWidth?: string;
}

const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  className,
  cols = { default: 1, sm: 2, md: 3, lg: 4 },
  gap = 'md',
  autoFit = false,
  minWidth = '280px'
}) => {
  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8'
  };

  const getGridClasses = () => {
    if (autoFit) {
      return `grid grid-cols-[repeat(auto-fit,minmax(${minWidth},1fr))] ${gapClasses[gap]}`;
    }

    const colClasses = [];
    
    if (cols.default) {
      colClasses.push(`grid-cols-${cols.default}`);
    }
    if (cols.sm) {
      colClasses.push(`sm:grid-cols-${cols.sm}`);
    }
    if (cols.md) {
      colClasses.push(`md:grid-cols-${cols.md}`);
    }
    if (cols.lg) {
      colClasses.push(`lg:grid-cols-${cols.lg}`);
    }
    if (cols.xl) {
      colClasses.push(`xl:grid-cols-${cols.xl}`);
    }
    if (cols['2xl']) {
      colClasses.push(`2xl:grid-cols-${cols['2xl']}`);
    }

    return `grid ${colClasses.join(' ')} ${gapClasses[gap]}`;
  };

  return (
    <div className={cn(getGridClasses(), className)}>
      {children}
    </div>
  );
};

export default ResponsiveGrid;
