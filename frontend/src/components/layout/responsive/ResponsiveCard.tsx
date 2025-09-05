import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { cn } from '../../../lib/utils';

interface ResponsiveCardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'outline' | 'elevated' | 'flat';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  fullHeight?: boolean;
  hover?: boolean;
}

const ResponsiveCard: React.FC<ResponsiveCardProps> = ({
  children,
  className,
  title,
  description,
  header,
  footer,
  size = 'md',
  variant = 'default',
  padding = 'md',
  fullHeight = false,
  hover = false
}) => {
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl'
  };

  const variantClasses = {
    default: 'bg-card border border-border',
    outline: 'bg-transparent border-2 border-border',
    elevated: 'bg-card border border-border shadow-lg',
    flat: 'bg-card border-0 shadow-none'
  };

  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  };

  const hoverClasses = hover ? 'transition-all duration-200 hover:shadow-md hover:scale-[1.02]' : '';

  return (
    <Card 
      className={cn(
        'w-full',
        sizeClasses[size],
        variantClasses[variant],
        fullHeight && 'h-full',
        hoverClasses,
        className
      )}
    >
      {(title || description || header) && (
        <CardHeader className={cn(paddingClasses[padding], 'pb-3')}>
          {header || (
            <>
              {title && <CardTitle className="text-lg">{title}</CardTitle>}
              {description && <CardDescription>{description}</CardDescription>}
            </>
          )}
        </CardHeader>
      )}
      
      <CardContent className={cn(paddingClasses[padding], 'flex-1')}>
        {children}
      </CardContent>
      
      {footer && (
        <div className={cn(paddingClasses[padding], 'pt-0')}>
          {footer}
        </div>
      )}
    </Card>
  );
};

export default ResponsiveCard;
