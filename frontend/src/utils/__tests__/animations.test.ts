import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { 
  useAnimation, 
  useStaggeredAnimation, 
  animationPresets, 
  createAnimation,
  combineAnimations,
  conditionalAnimation,
  timingFunctions,
  optimizeAnimation,
  prefersReducedMotion,
  useReducedMotion
} from '../animations';

// Mock IntersectionObserver
const mockIntersectionObserver = vi.fn();
mockIntersectionObserver.mockReturnValue({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
});
window.IntersectionObserver = mockIntersectionObserver;

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe('Animation Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useAnimation', () => {
    it('should return animation controls', () => {
      const { result } = renderHook(() => useAnimation({
        type: 'fade-in',
        trigger: 'load'
      }));

      expect(result.current.ref).toBeDefined();
      expect(result.current.isVisible).toBe(false);
      expect(result.current.isAnimating).toBe(false);
      expect(typeof result.current.trigger).toBe('function');
      expect(typeof result.current.stop).toBe('function');
    });

    it('should handle different animation types', () => {
      const animationTypes = ['fade-in', 'slide-in-up', 'scale-in', 'wiggle'];
      
      animationTypes.forEach(type => {
        const { result } = renderHook(() => useAnimation({
          type: type as any,
          trigger: 'load'
        }));

        expect(result.current.ref).toBeDefined();
      });
    });

    it('should handle different triggers', () => {
      const triggers = ['hover', 'click', 'focus', 'load', 'scroll'];
      
      triggers.forEach(trigger => {
        const { result } = renderHook(() => useAnimation({
          type: 'fade-in',
          trigger: trigger as any
        }));

        expect(result.current.ref).toBeDefined();
      });
    });
  });

  describe('useStaggeredAnimation', () => {
    it('should return staggered animation controls', () => {
      const { result } = renderHook(() => useStaggeredAnimation({
        type: 'fade-in',
        trigger: 'scroll'
      }));

      expect(typeof result.current.setItemRef).toBe('function');
      expect(Array.isArray(result.current.visibleItems)).toBe(true);
      expect(typeof result.current.isItemVisible).toBe('function');
    });
  });

  describe('animationPresets', () => {
    it('should have all required presets', () => {
      const requiredPresets = [
        'pageEnter',
        'pageExit',
        'cardHover',
        'cardEnter',
        'buttonPress',
        'buttonHover',
        'loading',
        'spinner',
        'notificationEnter',
        'notificationExit',
        'formError',
        'formSuccess',
        'serverOnline',
        'serverOffline'
      ];

      requiredPresets.forEach(preset => {
        expect(animationPresets[preset as keyof typeof animationPresets]).toBeDefined();
      });
    });

    it('should have correct structure for presets', () => {
      Object.values(animationPresets).forEach(preset => {
        expect(preset).toHaveProperty('type');
        expect(preset).toHaveProperty('trigger');
        expect(typeof preset.type).toBe('string');
        expect(typeof preset.trigger).toBe('string');
      });
    });
  });

  describe('createAnimation', () => {
    it('should create animation with default options', () => {
      const animation = createAnimation('fade-in');
      
      expect(animation.type).toBe('fade-in');
      expect(animation.duration).toBe(300);
      expect(animation.delay).toBe(0);
      expect(animation.direction).toBe('in');
      expect(animation.easing).toBe('ease-out');
      expect(animation.trigger).toBe('load');
    });

    it('should override default options', () => {
      const animation = createAnimation('fade-in', {
        duration: 500,
        delay: 100,
        direction: 'out'
      });
      
      expect(animation.duration).toBe(500);
      expect(animation.delay).toBe(100);
      expect(animation.direction).toBe('out');
    });
  });

  describe('combineAnimations', () => {
    it('should combine multiple animations', () => {
      const animation1 = createAnimation('fade-in');
      const animation2 = createAnimation('slide-in-up');
      
      const combined = combineAnimations(animation1, animation2);
      
      expect(combined).toHaveLength(2);
      expect(combined[0]).toBe(animation1);
      expect(combined[1]).toBe(animation2);
    });
  });

  describe('conditionalAnimation', () => {
    it('should return true config when condition is true', () => {
      const trueConfig = createAnimation('fade-in');
      const falseConfig = createAnimation('fade-out');
      
      const result = conditionalAnimation(true, trueConfig, falseConfig);
      
      expect(result).toBe(trueConfig);
    });

    it('should return false config when condition is false', () => {
      const trueConfig = createAnimation('fade-in');
      const falseConfig = createAnimation('fade-out');
      
      const result = conditionalAnimation(false, trueConfig, falseConfig);
      
      expect(result).toBe(falseConfig);
    });
  });

  describe('timingFunctions', () => {
    it('should have all required timing functions', () => {
      const requiredFunctions = [
        'easeIn',
        'easeOut',
        'easeInOut',
        'linear',
        'bounce',
        'elastic'
      ];

      requiredFunctions.forEach(func => {
        expect(timingFunctions[func as keyof typeof timingFunctions]).toBeDefined();
        expect(typeof timingFunctions[func as keyof typeof timingFunctions]).toBe('string');
      });
    });
  });

  describe('optimizeAnimation', () => {
    it('should optimize element for animation', () => {
      const element = document.createElement('div');
      const addEventListenerSpy = vi.spyOn(element, 'addEventListener');
      
      optimizeAnimation(element);
      
      expect(element.style.transform).toBe('translateZ(0)');
      expect(element.style.willChange).toBe('transform, opacity');
      expect(addEventListenerSpy).toHaveBeenCalledWith('animationend', expect.any(Function), { once: true });
      expect(addEventListenerSpy).toHaveBeenCalledWith('animationcancel', expect.any(Function), { once: true });
    });
  });

  describe('prefersReducedMotion', () => {
    it('should return false when window is undefined', () => {
      const originalWindow = global.window;
      // @ts-ignore
      delete global.window;
      
      const result = prefersReducedMotion();
      
      expect(result).toBe(false);
      
      global.window = originalWindow;
    });

    it('should return matchMedia result', () => {
      const mockMatchMedia = vi.fn().mockReturnValue({
        matches: true
      });
      window.matchMedia = mockMatchMedia;
      
      const result = prefersReducedMotion();
      
      expect(result).toBe(true);
      expect(mockMatchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
    });
  });

  describe('useReducedMotion', () => {
    it('should return reduced motion state', () => {
      const { result } = renderHook(() => useReducedMotion());
      
      expect(typeof result.current).toBe('boolean');
    });

    it('should update when media query changes', () => {
      const mockMatchMedia = vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      });
      window.matchMedia = mockMatchMedia;
      
      const { result } = renderHook(() => useReducedMotion());
      
      expect(result.current).toBe(false);
      expect(mockMatchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
    });
  });
});
