import React, { useRef, useCallback, useEffect, useState } from 'react';

// Asset optimization utilities
export interface ImageOptimizationConfig {
  quality?: number;
  format?: 'webp' | 'avif' | 'jpeg' | 'png';
  width?: number;
  height?: number;
  lazy?: boolean;
  placeholder?: string;
  blur?: boolean;
}

export interface AssetPreloadConfig {
  priority?: 'high' | 'low' | 'auto';
  as?: 'image' | 'script' | 'style' | 'font';
  crossorigin?: 'anonymous' | 'use-credentials';
}

// Image optimization utilities
export const imageUtils = {
  // Generate responsive image srcset
  generateSrcSet: (baseUrl: string, widths: number[], format?: string): string => {
    return widths
      .map(width => {
        const url = format 
          ? `${baseUrl}?w=${width}&f=${format}`
          : `${baseUrl}?w=${width}`;
        return `${url} ${width}w`;
      })
      .join(', ');
  },

  // Generate WebP srcset with fallback
  generateWebPSrcSet: (baseUrl: string, widths: number[]): { webp: string; fallback: string } => {
    return {
      webp: imageUtils.generateSrcSet(baseUrl, widths, 'webp'),
      fallback: imageUtils.generateSrcSet(baseUrl, widths),
    };
  },

  // Check WebP support
  supportsWebP: (): Promise<boolean> => {
    return new Promise((resolve) => {
      const webP = new Image();
      webP.onload = webP.onerror = () => {
        resolve(webP.height === 2);
      };
      webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
    });
  },

  // Check AVIF support
  supportsAVIF: (): Promise<boolean> => {
    return new Promise((resolve) => {
      const avif = new Image();
      avif.onload = avif.onerror = () => {
        resolve(avif.height === 2);
      };
      avif.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAABcAAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAEAAAABAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQAMAAAAABNjb2xybmNseAACAAIABoAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAAB9tZGF0EgAKCBgABogQEAwgMgkfAAAADHEAAAAA';
    });
  },

  // Get optimal image format
  getOptimalFormat: async (): Promise<'avif' | 'webp' | 'jpeg'> => {
    if (await imageUtils.supportsAVIF()) return 'avif';
    if (await imageUtils.supportsWebP()) return 'webp';
    return 'jpeg';
  },

  // Compress image data URL
  compressImage: (dataUrl: string, quality: number = 0.8): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };

      img.src = dataUrl;
    });
  },

  // Resize image
  resizeImage: (dataUrl: string, maxWidth: number, maxHeight: number): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        let { width, height } = img;

        // Calculate new dimensions
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL());
      };

      img.src = dataUrl;
    });
  },
};

// Optimized image component
export const OptimizedImage: React.FC<{
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  config?: ImageOptimizationConfig;
  onLoad?: () => void;
  onError?: () => void;
}> = ({ 
  src, 
  alt, 
  width, 
  height, 
  className, 
  config = {}, 
  onLoad, 
  onError 
}) => {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [supportsWebP, setSupportsWebP] = useState<boolean | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const {
    quality = 0.8,
    format,
    lazy = true,
    placeholder,
    blur = true,
  } = config;

  // Check format support
  useEffect(() => {
    if (format === 'webp') {
      imageUtils.supportsWebP().then(setSupportsWebP);
    } else if (format === 'avif') {
      imageUtils.supportsAVIF().then(setSupportsWebP);
    } else {
      setSupportsWebP(true);
    }
  }, [format]);

  // Generate optimized src
  useEffect(() => {
    if (supportsWebP === null) return;

    let optimizedSrc = src;
    
    // Add quality parameter
    if (quality < 1) {
      optimizedSrc += `${src.includes('?') ? '&' : '?'}q=${quality}`;
    }

    // Add format parameter
    if (format && supportsWebP) {
      optimizedSrc += `&f=${format}`;
    }

    // Add dimensions
    if (width) optimizedSrc += `&w=${width}`;
    if (height) optimizedSrc += `&h=${height}`;

    setImageSrc(optimizedSrc);
  }, [src, quality, format, supportsWebP, width, height]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setHasError(true);
    onError?.();
  }, [onError]);

  if (hasError) {
    return (
      <div className={`flex items-center justify-center bg-muted text-muted-foreground ${className}`}>
        <span>Failed to load image</span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Placeholder */}
      {!isLoaded && placeholder && (
        <div className="absolute inset-0 bg-muted animate-pulse">
          {blur && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
          )}
        </div>
      )}

      {/* Image */}
      <img
        ref={imgRef}
        src={imageSrc}
        alt={alt}
        width={width}
        height={height}
        loading={lazy ? 'lazy' : 'eager'}
        className={`transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
};

// Asset preloading utilities
export const assetUtils = {
  // Preload image
  preloadImage: (src: string, config: AssetPreloadConfig = {}): Promise<void> => {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = src;
      link.as = config.as || 'image';
      
      if (config.priority) {
        link.setAttribute('fetchpriority', config.priority);
      }
      
      if (config.crossorigin) {
        link.crossOrigin = config.crossorigin;
      }

      link.onload = () => resolve();
      link.onerror = () => reject(new Error(`Failed to preload ${src}`));

      document.head.appendChild(link);
    });
  },

  // Preload multiple images
  preloadImages: async (srcs: string[], config: AssetPreloadConfig = {}): Promise<void[]> => {
    const promises = srcs.map(src => assetUtils.preloadImage(src, config));
    return Promise.all(promises);
  },

  // Preload script
  preloadScript: (src: string, config: AssetPreloadConfig = {}): Promise<void> => {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = src;
      link.as = 'script';
      
      if (config.priority) {
        link.setAttribute('fetchpriority', config.priority);
      }

      link.onload = () => resolve();
      link.onerror = () => reject(new Error(`Failed to preload script ${src}`));

      document.head.appendChild(link);
    });
  },

  // Preload stylesheet
  preloadStylesheet: (href: string, config: AssetPreloadConfig = {}): Promise<void> => {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = href;
      link.as = 'style';
      
      if (config.priority) {
        link.setAttribute('fetchpriority', config.priority);
      }

      link.onload = () => resolve();
      link.onerror = () => reject(new Error(`Failed to preload stylesheet ${href}`));

      document.head.appendChild(link);
    });
  },

  // Preload font
  preloadFont: (href: string, config: AssetPreloadConfig = {}): Promise<void> => {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = href;
      link.as = 'font';
      link.type = 'font/woff2';
      link.crossOrigin = 'anonymous';

      link.onload = () => resolve();
      link.onerror = () => reject(new Error(`Failed to preload font ${href}`));

      document.head.appendChild(link);
    });
  },
};

// Asset preloading hook
export const useAssetPreloader = () => {
  const [isPreloading, setIsPreloading] = useState(false);
  const [preloadedAssets, setPreloadedAssets] = useState<Set<string>>(new Set());

  const preloadAssets = useCallback(async (assets: Array<{
    src: string;
    type: 'image' | 'script' | 'style' | 'font';
    config?: AssetPreloadConfig;
  }>) => {
    setIsPreloading(true);
    
    try {
      const promises = assets.map(async ({ src, type, config }) => {
        if (preloadedAssets.has(src)) return;

        switch (type) {
          case 'image':
            await assetUtils.preloadImage(src, config);
            break;
          case 'script':
            await assetUtils.preloadScript(src, config);
            break;
          case 'style':
            await assetUtils.preloadStylesheet(src, config);
            break;
          case 'font':
            await assetUtils.preloadFont(src, config);
            break;
        }

        setPreloadedAssets(prev => new Set([...prev, src]));
      });

      await Promise.all(promises);
    } catch (error) {
      console.error('Asset preloading failed:', error);
    } finally {
      setIsPreloading(false);
    }
  }, [preloadedAssets]);

  const isAssetPreloaded = useCallback((src: string) => {
    return preloadedAssets.has(src);
  }, [preloadedAssets]);

  return {
    preloadAssets,
    isAssetPreloaded,
    isPreloading,
    preloadedAssets: Array.from(preloadedAssets),
  };
};

// Critical resource hints
export const useResourceHints = () => {
  useEffect(() => {
    // DNS prefetch for external domains
    const dnsPrefetchDomains = [
      'fonts.googleapis.com',
      'fonts.gstatic.com',
      'cdn.jsdelivr.net',
    ];

    dnsPrefetchDomains.forEach(domain => {
      const link = document.createElement('link');
      link.rel = 'dns-prefetch';
      link.href = `//${domain}`;
      document.head.appendChild(link);
    });

    // Preconnect to critical origins
    const preconnectOrigins = [
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com',
    ];

    preconnectOrigins.forEach(origin => {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = origin;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });
  }, []);
};

// Bundle analysis utilities
export const bundleUtils = {
  // Get bundle size information
  getBundleInfo: () => {
    if (typeof window === 'undefined') return null;

    const scripts = Array.from(document.querySelectorAll('script[src]'));
    const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
    
    return {
      scripts: scripts.length,
      stylesheets: stylesheets.length,
      totalAssets: scripts.length + stylesheets.length,
    };
  },

  // Measure resource loading time
  measureResourceLoadTime: (resourceUrl: string): Promise<number> => {
    return new Promise((resolve) => {
      const startTime = performance.now();
      
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resourceUrl;
      link.as = 'script';
      
      link.onload = () => {
        const loadTime = performance.now() - startTime;
        resolve(loadTime);
      };
      
      link.onerror = () => resolve(-1);
      
      document.head.appendChild(link);
    });
  },

  // Get performance timing
  getPerformanceTiming: () => {
    if (typeof window === 'undefined' || !window.performance) return null;

    const navigation = window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (!navigation) return null;

    return {
      dns: navigation.domainLookupEnd - navigation.domainLookupStart,
      tcp: navigation.connectEnd - navigation.connectStart,
      request: navigation.responseEnd - navigation.requestStart,
      response: navigation.responseEnd - navigation.responseStart,
      dom: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      load: navigation.loadEventEnd - navigation.loadEventStart,
    };
  },
};

export default {
  imageUtils,
  assetUtils,
  bundleUtils,
  OptimizedImage,
  useAssetPreloader,
  useResourceHints,
};
