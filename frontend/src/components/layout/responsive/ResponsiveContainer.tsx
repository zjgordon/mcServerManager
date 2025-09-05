import React from 'react';
import { cn } from '../../../lib/utils';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  centered?: boolean;
  fluid?: boolean;
  as?: 'div' | 'section' | 'article' | 'main' | 'aside' | 'header' | 'footer';
}

const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  className,
  size = 'xl',
  padding = 'md',
  centered = true,
  fluid = false,
  as: Component = 'div'
}) => {
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-full'
  };

  const paddingClasses = {
    none: '',
    sm: 'px-2 py-1',
    md: 'px-4 py-2',
    lg: 'px-6 py-4',
    xl: 'px-8 py-6'
  };

  const containerClasses = cn(
    'w-full',
    !fluid && sizeClasses[size],
    paddingClasses[padding],
    centered && !fluid && 'mx-auto',
    className
  );

  return (
    <Component className={containerClasses}>
      {children}
    </Component>
  );
};

export default ResponsiveContainer;
