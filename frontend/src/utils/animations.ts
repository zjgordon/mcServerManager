import { useEffect, useRef, useState } from 'react';

// Animation utility types
export type AnimationType = 
  | 'fade-in' 
  | 'fade-out' 
  | 'slide-in-up' 
  | 'slide-in-down' 
  | 'slide-in-left' 
  | 'slide-in-right' 
  | 'scale-in' 
  | 'scale-out'
  | 'wiggle'
  | 'float'
  | 'glow'
  | 'shimmer'
  | 'pulse-slow'
  | 'bounce-slow'
  | 'spin-slow';

export type AnimationDirection = 'in' | 'out' | 'infinite';
export type AnimationEasing = 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear';

// Animation configuration interface
export interface AnimationConfig {
  type: AnimationType;
  duration?: number;
  delay?: number;
  direction?: AnimationDirection;
  easing?: AnimationEasing;
  trigger?: 'hover' | 'click' | 'focus' | 'load' | 'scroll';
  threshold?: number; // For scroll-triggered animations
}

// Hook for managing animations
export const useAnimation = (config: AnimationConfig) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const elementRef = useRef<HTMLElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleAnimation = () => {
      setIsAnimating(true);
      element.style.animationDuration = `${config.duration || 300}ms`;
      element.style.animationDelay = `${config.delay || 0}ms`;
      element.style.animationFillMode = 'both';
      
      if (config.direction === 'infinite') {
        element.style.animationIterationCount = 'infinite';
      }

      // Add animation class
      element.classList.add(`animate-${config.type}`);

      // Handle animation end
      const handleAnimationEnd = () => {
        setIsAnimating(false);
        if (config.direction !== 'infinite') {
          element.classList.remove(`animate-${config.type}`);
        }
        element.removeEventListener('animationend', handleAnimationEnd);
      };

      element.addEventListener('animationend', handleAnimationEnd);
    };

    // Set up trigger-based animations
    switch (config.trigger) {
      case 'hover':
        element.addEventListener('mouseenter', handleAnimation);
        element.addEventListener('mouseleave', () => {
          if (config.direction !== 'infinite') {
            element.classList.remove(`animate-${config.type}`);
          }
        });
        break;

      case 'click':
        element.addEventListener('click', handleAnimation);
        break;

      case 'focus':
        element.addEventListener('focus', handleAnimation);
        element.addEventListener('blur', () => {
          if (config.direction !== 'infinite') {
            element.classList.remove(`animate-${config.type}`);
          }
        });
        break;

      case 'load':
        handleAnimation();
        break;

      case 'scroll':
        observerRef.current = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                setIsVisible(true);
                handleAnimation();
                observerRef.current?.unobserve(entry.target);
              }
            });
          },
          { threshold: config.threshold || 0.1 }
        );
        observerRef.current.observe(element);
        break;

      default:
        handleAnimation();
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      element.removeEventListener('mouseenter', handleAnimation);
      element.removeEventListener('mouseleave', handleAnimation);
      element.removeEventListener('click', handleAnimation);
      element.removeEventListener('focus', handleAnimation);
      element.removeEventListener('blur', handleAnimation);
    };
  }, [config]);

  return {
    ref: elementRef,
    isVisible,
    isAnimating,
    trigger: () => {
      const element = elementRef.current;
      if (element) {
        element.classList.add(`animate-${config.type}`);
      }
    },
    stop: () => {
      const element = elementRef.current;
      if (element) {
        element.classList.remove(`animate-${config.type}`);
        setIsAnimating(false);
      }
    },
  };
};

// Staggered animation hook for multiple elements
export const useStaggeredAnimation = (
  config: AnimationConfig,
  staggerDelay: number = 100
) => {
  const [visibleItems, setVisibleItems] = useState<Set<number>>(new Set());
  const itemRefs = useRef<(HTMLElement | null)[]>([]);

  const observeItems = () => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, index) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              setVisibleItems(prev => new Set([...prev, index]));
              entry.target.classList.add(`animate-${config.type}`);
            }, index * staggerDelay);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: config.threshold || 0.1 }
    );

    itemRefs.current.forEach((item) => {
      if (item) observer.observe(item);
    });

    return observer;
  };

  useEffect(() => {
    const observer = observeItems();
    return () => observer.disconnect();
  }, []);

  const setItemRef = (index: number) => (el: HTMLElement | null) => {
    itemRefs.current[index] = el;
  };

  return {
    setItemRef,
    visibleItems,
    isItemVisible: (index: number) => visibleItems.has(index),
  };
};

// Animation presets for common use cases
export const animationPresets = {
  // Page transitions
  pageEnter: {
    type: 'fade-in' as AnimationType,
    duration: 500,
    trigger: 'load' as const,
  },
  pageExit: {
    type: 'fade-out' as AnimationType,
    duration: 300,
    trigger: 'click' as const,
  },

  // Card animations
  cardHover: {
    type: 'scale-in' as AnimationType,
    duration: 200,
    trigger: 'hover' as const,
  },
  cardEnter: {
    type: 'slide-in-up' as AnimationType,
    duration: 400,
    trigger: 'scroll' as const,
    threshold: 0.1,
  },

  // Button animations
  buttonPress: {
    type: 'scale-out' as AnimationType,
    duration: 100,
    trigger: 'click' as const,
  },
  buttonHover: {
    type: 'glow' as AnimationType,
    duration: 300,
    trigger: 'hover' as const,
  },

  // Loading animations
  loading: {
    type: 'pulse-slow' as AnimationType,
    direction: 'infinite' as AnimationDirection,
    trigger: 'load' as const,
  },
  spinner: {
    type: 'spin-slow' as AnimationType,
    direction: 'infinite' as AnimationDirection,
    trigger: 'load' as const,
  },

  // Notification animations
  notificationEnter: {
    type: 'slide-in-right' as AnimationType,
    duration: 300,
    trigger: 'load' as const,
  },
  notificationExit: {
    type: 'slide-in-left' as AnimationType,
    duration: 300,
    trigger: 'click' as const,
  },

  // Form animations
  formError: {
    type: 'wiggle' as AnimationType,
    duration: 500,
    trigger: 'load' as const,
  },
  formSuccess: {
    type: 'scale-in' as AnimationType,
    duration: 300,
    trigger: 'load' as const,
  },

  // Server status animations
  serverOnline: {
    type: 'glow' as AnimationType,
    duration: 2000,
    direction: 'infinite' as AnimationDirection,
    trigger: 'load' as const,
  },
  serverOffline: {
    type: 'fade-out' as AnimationType,
    duration: 500,
    trigger: 'load' as const,
  },
};

// Utility function to create custom animations
export const createAnimation = (
  type: AnimationType,
  options: Partial<AnimationConfig> = {}
): AnimationConfig => ({
  type,
  duration: 300,
  delay: 0,
  direction: 'in',
  easing: 'ease-out',
  trigger: 'load',
  threshold: 0.1,
  ...options,
});

// Utility function to combine multiple animations
export const combineAnimations = (...configs: AnimationConfig[]): AnimationConfig[] => {
  return configs;
};

// Utility function for conditional animations
export const conditionalAnimation = (
  condition: boolean,
  trueConfig: AnimationConfig,
  falseConfig: AnimationConfig
): AnimationConfig => {
  return condition ? trueConfig : falseConfig;
};

// Animation timing functions
export const timingFunctions = {
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  linear: 'linear',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  elastic: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
};

// Performance-optimized animation utilities
export const optimizeAnimation = (element: HTMLElement) => {
  // Enable hardware acceleration
  element.style.transform = 'translateZ(0)';
  element.style.willChange = 'transform, opacity';
  
  // Clean up after animation
  const cleanup = () => {
    element.style.willChange = 'auto';
  };
  
  element.addEventListener('animationend', cleanup, { once: true });
  element.addEventListener('animationcancel', cleanup, { once: true });
};

// Reduced motion support
export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// Hook for reduced motion support
export const useReducedMotion = () => {
  const [reducedMotion, setReducedMotion] = useState(prefersReducedMotion());

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return reducedMotion;
};
