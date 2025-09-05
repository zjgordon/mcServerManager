import React, { useState, useEffect } from 'react';
import { cn } from '../../../lib/utils';

interface ResponsiveBreakpointProps {
  children: React.ReactNode;
  className?: string;
  showOn?: 'mobile' | 'tablet' | 'desktop' | 'mobile-only' | 'tablet-only' | 'desktop-only';
  hideOn?: 'mobile' | 'tablet' | 'desktop' | 'mobile-only' | 'tablet-only' | 'desktop-only';
  as?: keyof JSX.IntrinsicElements;
}

const ResponsiveBreakpoint: React.FC<ResponsiveBreakpointProps> = ({
  children,
  className,
  showOn,
  hideOn,
  as: Component = 'div'
}) => {
  const [screenSize, setScreenSize] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setScreenSize('mobile');
      } else if (width < 1024) {
        setScreenSize('tablet');
      } else {
        setScreenSize('desktop');
      }
    };

    updateScreenSize();
    window.addEventListener('resize', updateScreenSize);
    return () => window.removeEventListener('resize', updateScreenSize);
  }, []);

  const shouldShow = () => {
    if (showOn) {
      switch (showOn) {
        case 'mobile':
          return screenSize === 'mobile';
        case 'tablet':
          return screenSize === 'tablet';
        case 'desktop':
          return screenSize === 'desktop';
        case 'mobile-only':
          return screenSize === 'mobile';
        case 'tablet-only':
          return screenSize === 'tablet';
        case 'desktop-only':
          return screenSize === 'desktop';
        default:
          return true;
      }
    }

    if (hideOn) {
      switch (hideOn) {
        case 'mobile':
          return screenSize !== 'mobile';
        case 'tablet':
          return screenSize !== 'tablet';
        case 'desktop':
          return screenSize !== 'desktop';
        case 'mobile-only':
          return screenSize !== 'mobile';
        case 'tablet-only':
          return screenSize !== 'tablet';
        case 'desktop-only':
          return screenSize !== 'desktop';
        default:
          return true;
      }
    }

    return true;
  };

  if (!shouldShow()) {
    return null;
  }

  return (
    <Component className={cn(className)}>
      {children}
    </Component>
  );
};

export default ResponsiveBreakpoint;
