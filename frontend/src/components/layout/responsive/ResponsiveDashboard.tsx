import React from 'react';
import { cn } from '../../../lib/utils';

interface ResponsiveDashboardProps {
  children: React.ReactNode;
  className?: string;
  sidebar?: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  sidebarCollapsed?: boolean;
  sidebarPosition?: 'left' | 'right';
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  gap?: 'sm' | 'md' | 'lg' | 'xl';
}

const ResponsiveDashboard: React.FC<ResponsiveDashboardProps> = ({
  children,
  className,
  sidebar,
  header,
  footer,
  sidebarCollapsed = false,
  sidebarPosition = 'left',
  maxWidth = 'full',
  padding = 'lg',
  gap = 'lg'
}) => {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-full'
  };

  const paddingClasses = {
    none: '',
    sm: 'p-2',
    md: 'p-4',
    lg: 'p-6',
    xl: 'p-8'
  };

  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8'
  };

  const sidebarWidth = sidebarCollapsed ? 'w-16' : 'w-64';
  const sidebarClasses = cn(
    'hidden lg:block bg-card border-r border-border min-h-screen',
    sidebarWidth,
    sidebarPosition === 'right' && 'order-last'
  );

  return (
    <div className={cn('min-h-screen bg-background', className)}>
      {/* Header */}
      {header && (
        <header className="sticky top-0 z-50 bg-card border-b border-border">
          {header}
        </header>
      )}

      <div className="flex">
        {/* Sidebar */}
        {sidebar && (
          <aside className={sidebarClasses}>
            {sidebar}
          </aside>
        )}

        {/* Main Content */}
        <main className={cn(
          'flex-1 min-h-screen',
          maxWidthClasses[maxWidth],
          paddingClasses[padding]
        )}>
          <div className={cn('w-full', gapClasses[gap])}>
            {children}
          </div>
        </main>
      </div>

      {/* Footer */}
      {footer && (
        <footer className="bg-card border-t border-border">
          {footer}
        </footer>
      )}
    </div>
  );
};

export default ResponsiveDashboard;
