import { useState, useEffect } from 'react';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

export interface ResponsiveState {
  breakpoint: Breakpoint;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  width: number;
  height: number;
}

export const useResponsive = (): ResponsiveState => {
  const [state, setState] = useState<ResponsiveState>({
    breakpoint: 'desktop',
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    width: 1024,
    height: 768,
  });

  useEffect(() => {
    const updateState = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      let breakpoint: Breakpoint;
      let isMobile = false;
      let isTablet = false;
      let isDesktop = false;

      if (width < 768) {
        breakpoint = 'mobile';
        isMobile = true;
      } else if (width < 1024) {
        breakpoint = 'tablet';
        isTablet = true;
      } else {
        breakpoint = 'desktop';
        isDesktop = true;
      }

      setState({
        breakpoint,
        isMobile,
        isTablet,
        isDesktop,
        width,
        height,
      });
    };

    updateState();
    window.addEventListener('resize', updateState);
    return () => window.removeEventListener('resize', updateState);
  }, []);

  return state;
};

export const useBreakpoint = (breakpoint: Breakpoint): boolean => {
  const { breakpoint: currentBreakpoint } = useResponsive();
  return currentBreakpoint === breakpoint;
};

export const useIsMobile = (): boolean => {
  const { isMobile } = useResponsive();
  return isMobile;
};

export const useIsTablet = (): boolean => {
  const { isTablet } = useResponsive();
  return isTablet;
};

export const useIsDesktop = (): boolean => {
  const { isDesktop } = useResponsive();
  return isDesktop;
};
