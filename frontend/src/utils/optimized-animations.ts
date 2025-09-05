import React, { useRef, useEffect, useCallback, useState } from 'react';

// Performance-optimized animation utilities
export interface OptimizedAnimationConfig {
  duration?: number;
  easing?: string;
  delay?: number;
  iterations?: number;
  direction?: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
  fillMode?: 'none' | 'forwards' | 'backwards' | 'both';
  playState?: 'running' | 'paused';
  willChange?: boolean;
  transform3d?: boolean;
}

// Hardware acceleration utility
export const enableHardwareAcceleration = (element: HTMLElement) => {
  element.style.transform = 'translateZ(0)';
  element.style.willChange = 'transform, opacity';
  element.style.backfaceVisibility = 'hidden';
  element.style.perspective = '1000px';
};

// Disable hardware acceleration
export const disableHardwareAcceleration = (element: HTMLElement) => {
  element.style.willChange = 'auto';
  element.style.transform = '';
  element.style.backfaceVisibility = '';
  element.style.perspective = '';
};

// Optimized animation hook
export const useOptimizedAnimation = (
  config: OptimizedAnimationConfig = {}
) => {
  const elementRef = useRef<HTMLElement>(null);
  const animationRef = useRef<Animation | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const {
    duration = 300,
    easing = 'ease-out',
    delay = 0,
    iterations = 1,
    direction = 'normal',
    fillMode = 'both',
    willChange = true,
    transform3d = true,
  } = config;

  const startAnimation = useCallback((keyframes: Keyframe[], options?: KeyframeAnimationOptions) => {
    const element = elementRef.current;
    if (!element) return;

    // Stop existing animation
    if (animationRef.current) {
      animationRef.current.cancel();
    }

    // Enable hardware acceleration if needed
    if (willChange) {
      enableHardwareAcceleration(element);
    }

    // Create optimized keyframes
    const optimizedKeyframes = keyframes.map(keyframe => ({
      ...keyframe,
      // Ensure transforms use 3D for hardware acceleration
      transform: transform3d && keyframe.transform 
        ? keyframe.transform.replace(/translate\(/g, 'translate3d(')
                          .replace(/translateX\(/g, 'translate3d(')
                          .replace(/translateY\(/g, 'translate3d(')
                          .replace(/scale\(/g, 'scale3d(')
                          .replace(/rotate\(/g, 'rotate3d(')
        : keyframe.transform,
    }));

    // Create animation
    const animation = element.animate(optimizedKeyframes, {
      duration,
      easing,
      delay,
      iterations,
      direction,
      fillMode,
      ...options,
    });

    animationRef.current = animation;
    setIsAnimating(true);

    // Clean up after animation
    animation.addEventListener('finish', () => {
      setIsAnimating(false);
      if (willChange) {
        disableHardwareAcceleration(element);
      }
    });

    animation.addEventListener('cancel', () => {
      setIsAnimating(false);
      if (willChange) {
        disableHardwareAcceleration(element);
      }
    });

    return animation;
  }, [duration, easing, delay, iterations, direction, fillMode, willChange, transform3d]);

  const stopAnimation = useCallback(() => {
    if (animationRef.current) {
      animationRef.current.cancel();
      animationRef.current = null;
    }
    setIsAnimating(false);
    
    const element = elementRef.current;
    if (element && willChange) {
      disableHardwareAcceleration(element);
    }
  }, [willChange]);

  const pauseAnimation = useCallback(() => {
    if (animationRef.current) {
      animationRef.current.pause();
    }
  }, []);

  const resumeAnimation = useCallback(() => {
    if (animationRef.current) {
      animationRef.current.play();
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAnimation();
    };
  }, [stopAnimation]);

  return {
    ref: elementRef,
    startAnimation,
    stopAnimation,
    pauseAnimation,
    resumeAnimation,
    isAnimating,
  };
};

// Optimized fade animation
export const useOptimizedFade = (config: OptimizedAnimationConfig = {}) => {
  const { startAnimation } = useOptimizedAnimation(config);

  const fadeIn = useCallback(() => {
    return startAnimation([
      { opacity: 0 },
      { opacity: 1 },
    ]);
  }, [startAnimation]);

  const fadeOut = useCallback(() => {
    return startAnimation([
      { opacity: 1 },
      { opacity: 0 },
    ]);
  }, [startAnimation]);

  return { fadeIn, fadeOut };
};

// Optimized slide animation
export const useOptimizedSlide = (config: OptimizedAnimationConfig = {}) => {
  const { startAnimation } = useOptimizedAnimation(config);

  const slideInUp = useCallback(() => {
    return startAnimation([
      { transform: 'translate3d(0, 100%, 0)', opacity: 0 },
      { transform: 'translate3d(0, 0, 0)', opacity: 1 },
    ]);
  }, [startAnimation]);

  const slideInDown = useCallback(() => {
    return startAnimation([
      { transform: 'translate3d(0, -100%, 0)', opacity: 0 },
      { transform: 'translate3d(0, 0, 0)', opacity: 1 },
    ]);
  }, [startAnimation]);

  const slideInLeft = useCallback(() => {
    return startAnimation([
      { transform: 'translate3d(-100%, 0, 0)', opacity: 0 },
      { transform: 'translate3d(0, 0, 0)', opacity: 1 },
    ]);
  }, [startAnimation]);

  const slideInRight = useCallback(() => {
    return startAnimation([
      { transform: 'translate3d(100%, 0, 0)', opacity: 0 },
      { transform: 'translate3d(0, 0, 0)', opacity: 1 },
    ]);
  }, [startAnimation]);

  return { slideInUp, slideInDown, slideInLeft, slideInRight };
};

// Optimized scale animation
export const useOptimizedScale = (config: OptimizedAnimationConfig = {}) => {
  const { startAnimation } = useOptimizedAnimation(config);

  const scaleIn = useCallback(() => {
    return startAnimation([
      { transform: 'scale3d(0, 0, 0)', opacity: 0 },
      { transform: 'scale3d(1, 1, 1)', opacity: 1 },
    ]);
  }, [startAnimation]);

  const scaleOut = useCallback(() => {
    return startAnimation([
      { transform: 'scale3d(1, 1, 1)', opacity: 1 },
      { transform: 'scale3d(0, 0, 0)', opacity: 0 },
    ]);
  }, [startAnimation]);

  return { scaleIn, scaleOut };
};

// Optimized rotation animation
export const useOptimizedRotate = (config: OptimizedAnimationConfig = {}) => {
  const { startAnimation } = useOptimizedAnimation(config);

  const rotate = useCallback((degrees: number) => {
    return startAnimation([
      { transform: 'rotate3d(0, 0, 1, 0deg)' },
      { transform: `rotate3d(0, 0, 1, ${degrees}deg)` },
    ]);
  }, [startAnimation]);

  const spin = useCallback(() => {
    return startAnimation([
      { transform: 'rotate3d(0, 0, 1, 0deg)' },
      { transform: 'rotate3d(0, 0, 1, 360deg)' },
    ], { iterations: Infinity });
  }, [startAnimation]);

  return { rotate, spin };
};

// Intersection Observer for performance-optimized animations
export const useIntersectionAnimation = (
  animationFn: () => void,
  options: IntersectionObserverInit = {}
) => {
  const elementRef = useRef<HTMLElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || hasAnimated) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          animationFn();
          setHasAnimated(true);
          observer.unobserve(element);
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options,
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [animationFn, hasAnimated, options]);

  return elementRef;
};

// Reduced motion detection
export const useReducedMotion = () => {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return reducedMotion;
};

// Performance-optimized animation component
export const OptimizedAnimatedComponent: React.FC<{
  children: React.ReactNode;
  animation: 'fade' | 'slide' | 'scale' | 'rotate';
  direction?: 'up' | 'down' | 'left' | 'right' | 'in' | 'out';
  trigger?: 'mount' | 'intersection' | 'hover' | 'click';
  config?: OptimizedAnimationConfig;
  className?: string;
}> = ({ 
  children, 
  animation, 
  direction = 'in', 
  trigger = 'mount',
  config = {},
  className 
}) => {
  const reducedMotion = useReducedMotion();
  const elementRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Get animation function based on type
  const getAnimationFunction = () => {
    if (reducedMotion) return null;

    switch (animation) {
      case 'fade':
        const { fadeIn, fadeOut } = useOptimizedFade(config);
        return direction === 'in' ? fadeIn : fadeOut;
      
      case 'slide':
        const { slideInUp, slideInDown, slideInLeft, slideInRight } = useOptimizedSlide(config);
        switch (direction) {
          case 'up': return slideInUp;
          case 'down': return slideInDown;
          case 'left': return slideInLeft;
          case 'right': return slideInRight;
          default: return slideInUp;
        }
      
      case 'scale':
        const { scaleIn, scaleOut } = useOptimizedScale(config);
        return direction === 'in' ? scaleIn : scaleOut;
      
      case 'rotate':
        const { rotate } = useOptimizedRotate(config);
        return () => rotate(360);
      
      default:
        return null;
    }
  };

  const animationFn = getAnimationFunction();

  // Handle different triggers
  useEffect(() => {
    if (!animationFn || isVisible) return;

    switch (trigger) {
      case 'mount':
        animationFn();
        setIsVisible(true);
        break;
      case 'intersection':
        // Handled by intersection observer
        break;
    }
  }, [animationFn, trigger, isVisible]);

  // Intersection observer for intersection trigger
  const intersectionRef = useIntersectionAnimation(
    () => {
      if (animationFn) {
        animationFn();
        setIsVisible(true);
      }
    },
    { threshold: 0.1 }
  );

  // Event handlers for hover and click triggers
  const handleMouseEnter = () => {
    if (trigger === 'hover' && animationFn && !isVisible) {
      animationFn();
      setIsVisible(true);
    }
  };

  const handleClick = () => {
    if (trigger === 'click' && animationFn) {
      animationFn();
      setIsVisible(true);
    }
  };

  const ref = trigger === 'intersection' ? intersectionRef : elementRef;

  return (
    <div
      ref={ref}
      className={className}
      onMouseEnter={handleMouseEnter}
      onClick={handleClick}
    >
      {children}
    </div>
  );
};

// Animation performance utilities
export const animationUtils = {
  // Check if element is in viewport
  isInViewport: (element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  },

  // Throttle animation frame
  throttleAnimationFrame: (callback: () => void) => {
    let rafId: number | null = null;
    return () => {
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          callback();
          rafId = null;
        });
      }
    };
  },

  // Debounce animation
  debounceAnimation: (callback: () => void, delay: number) => {
    let timeoutId: NodeJS.Timeout;
    return () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(callback, delay);
    };
  },

  // Get optimal animation duration based on distance
  getOptimalDuration: (distance: number, baseDuration: number = 300) => {
    const maxDistance = 1000; // pixels
    const minDuration = 150; // ms
    const maxDuration = 600; // ms
    
    const ratio = Math.min(distance / maxDistance, 1);
    return Math.max(minDuration, baseDuration * (0.5 + ratio * 0.5));
  },

  // Check if animation is supported
  isAnimationSupported: () => {
    return typeof window !== 'undefined' && 
           'animate' in document.createElement('div');
  },

  // Get animation performance metrics
  getAnimationPerformance: (animation: Animation) => {
    return {
      duration: animation.effect?.getTiming().duration || 0,
      playbackRate: animation.playbackRate,
      startTime: animation.startTime,
      currentTime: animation.currentTime,
    };
  },
};

export default {
  useOptimizedAnimation,
  useOptimizedFade,
  useOptimizedSlide,
  useOptimizedScale,
  useOptimizedRotate,
  useIntersectionAnimation,
  useReducedMotion,
  OptimizedAnimatedComponent,
  animationUtils,
  enableHardwareAcceleration,
  disableHardwareAcceleration,
};
