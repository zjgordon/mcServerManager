import { useEffect, useCallback, useRef, useState } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description?: string;
  preventDefault?: boolean;
  stopPropagation?: boolean;
  disabled?: boolean;
}

export interface KeyboardShortcutGroup {
  name: string;
  shortcuts: KeyboardShortcut[];
}

export interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  target?: HTMLElement | Document;
  preventDefault?: boolean;
  stopPropagation?: boolean;
}

// Default keyboard shortcuts for the application
export const defaultShortcuts: KeyboardShortcutGroup[] = [
  {
    name: 'Navigation',
    shortcuts: [
      {
        key: 'h',
        ctrlKey: true,
        action: () => {
          // Navigate to home/dashboard
          window.location.href = '/';
        },
        description: 'Go to Dashboard',
      },
      {
        key: 's',
        ctrlKey: true,
        action: () => {
          // Navigate to servers
          window.location.href = '/servers';
        },
        description: 'Go to Servers',
      },
      {
        key: 'a',
        ctrlKey: true,
        action: () => {
          // Navigate to admin
          window.location.href = '/admin';
        },
        description: 'Go to Admin',
      },
      {
        key: 'u',
        ctrlKey: true,
        action: () => {
          // Navigate to settings
          window.location.href = '/settings';
        },
        description: 'Go to Settings',
      },
    ],
  },
  {
    name: 'Server Management',
    shortcuts: [
      {
        key: 'n',
        ctrlKey: true,
        action: () => {
          // Create new server
          window.location.href = '/servers/create';
        },
        description: 'Create New Server',
      },
      {
        key: 'r',
        ctrlKey: true,
        action: () => {
          // Refresh servers
          window.location.reload();
        },
        description: 'Refresh Servers',
      },
      {
        key: 'f',
        ctrlKey: true,
        action: () => {
          // Focus search
          const searchInput = document.querySelector('input[type="search"], input[placeholder*="search" i]') as HTMLInputElement;
          searchInput?.focus();
        },
        description: 'Focus Search',
      },
    ],
  },
  {
    name: 'General',
    shortcuts: [
      {
        key: 'Escape',
        action: () => {
          // Close modals, dropdowns, etc.
          const modals = document.querySelectorAll('[role="dialog"]');
          modals.forEach(modal => {
            const closeButton = modal.querySelector('[aria-label="Close"], [data-dismiss="modal"]') as HTMLElement;
            closeButton?.click();
          });
        },
        description: 'Close Modal/Dropdown',
      },
      {
        key: '?',
        action: () => {
          // Show keyboard shortcuts help
          const helpModal = document.querySelector('[data-help="shortcuts"]') as HTMLElement;
          helpModal?.click();
        },
        description: 'Show Keyboard Shortcuts',
      },
      {
        key: 'k',
        ctrlKey: true,
        action: () => {
          // Open command palette
          const commandPalette = document.querySelector('[data-command-palette]') as HTMLElement;
          commandPalette?.click();
        },
        description: 'Open Command Palette',
      },
    ],
  },
];

// Hook for managing keyboard shortcuts
export const useKeyboardShortcuts = (
  shortcuts: KeyboardShortcut[] = [],
  options: UseKeyboardShortcutsOptions = {}
) => {
  const {
    enabled = true,
    target = document,
    preventDefault = true,
    stopPropagation = false,
  } = options;

  const shortcutsRef = useRef<KeyboardShortcut[]>(shortcuts);
  const targetRef = useRef<HTMLElement | Document>(target);

  // Update shortcuts ref when shortcuts change
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  // Update target ref when target changes
  useEffect(() => {
    targetRef.current = target;
  }, [target]);

  // Handle keydown events
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    const { key, ctrlKey, altKey, shiftKey, metaKey } = event;

    // Find matching shortcut
    const matchingShortcut = shortcutsRef.current.find(shortcut => {
      if (shortcut.disabled) return false;
      if (shortcut.key.toLowerCase() !== key.toLowerCase()) return false;
      if (!!shortcut.ctrlKey !== ctrlKey) return false;
      if (!!shortcut.altKey !== altKey) return false;
      if (!!shortcut.shiftKey !== shiftKey) return false;
      if (!!shortcut.metaKey !== metaKey) return false;
      return true;
    });

    if (matchingShortcut) {
      if (matchingShortcut.preventDefault ?? preventDefault) {
        event.preventDefault();
      }
      if (matchingShortcut.stopPropagation ?? stopPropagation) {
        event.stopPropagation();
      }
      matchingShortcut.action();
    }
  }, [enabled, preventDefault, stopPropagation]);

  // Add event listener
  useEffect(() => {
    const currentTarget = targetRef.current;
    if (!currentTarget) return;

    currentTarget.addEventListener('keydown', handleKeyDown);
    return () => {
      currentTarget.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return {
    shortcuts: shortcutsRef.current,
    addShortcut: (shortcut: KeyboardShortcut) => {
      shortcutsRef.current = [...shortcutsRef.current, shortcut];
    },
    removeShortcut: (key: string) => {
      shortcutsRef.current = shortcutsRef.current.filter(s => s.key !== key);
    },
    updateShortcut: (key: string, updates: Partial<KeyboardShortcut>) => {
      shortcutsRef.current = shortcutsRef.current.map(s =>
        s.key === key ? { ...s, ...updates } : s
      );
    },
  };
};

// Hook for global keyboard shortcuts
export const useGlobalKeyboardShortcuts = (options: UseKeyboardShortcutsOptions = {}) => {
  return useKeyboardShortcuts([], options);
};

// Hook for component-specific keyboard shortcuts
export const useComponentKeyboardShortcuts = (
  shortcuts: KeyboardShortcut[],
  options: UseKeyboardShortcutsOptions = {}
) => {
  return useKeyboardShortcuts(shortcuts, options);
};

// Utility function to create keyboard shortcut
export const createShortcut = (
  key: string,
  action: () => void,
  options: Partial<KeyboardShortcut> = {}
): KeyboardShortcut => ({
  key,
  action,
  preventDefault: true,
  stopPropagation: false,
  disabled: false,
  ...options,
});

// Utility function to format keyboard shortcut for display
export const formatShortcut = (shortcut: KeyboardShortcut): string => {
  const parts: string[] = [];
  
  if (shortcut.ctrlKey) parts.push('Ctrl');
  if (shortcut.altKey) parts.push('Alt');
  if (shortcut.shiftKey) parts.push('Shift');
  if (shortcut.metaKey) parts.push('Cmd');
  
  parts.push(shortcut.key);
  
  return parts.join(' + ');
};

// Utility function to check if a key combination is available
export const isShortcutAvailable = (
  key: string,
  ctrlKey = false,
  altKey = false,
  shiftKey = false,
  metaKey = false
): boolean => {
  // Check for common browser shortcuts
  const browserShortcuts = [
    { key: 'f', ctrlKey: true }, // Find
    { key: 'r', ctrlKey: true }, // Refresh
    { key: 't', ctrlKey: true }, // New tab
    { key: 'w', ctrlKey: true }, // Close tab
    { key: 'n', ctrlKey: true }, // New window
    { key: 's', ctrlKey: true }, // Save
    { key: 'o', ctrlKey: true }, // Open
    { key: 'p', ctrlKey: true }, // Print
    { key: 'z', ctrlKey: true }, // Undo
    { key: 'y', ctrlKey: true }, // Redo
    { key: 'c', ctrlKey: true }, // Copy
    { key: 'v', ctrlKey: true }, // Paste
    { key: 'x', ctrlKey: true }, // Cut
    { key: 'a', ctrlKey: true }, // Select all
  ];

  return !browserShortcuts.some(shortcut =>
    shortcut.key === key &&
    shortcut.ctrlKey === ctrlKey &&
    shortcut.altKey === altKey &&
    shortcut.shiftKey === shiftKey &&
    shortcut.metaKey === metaKey
  );
};

// Hook for focus management
export const useFocusManagement = () => {
  const focusableElements = useRef<HTMLElement[]>([]);
  const currentIndex = useRef<number>(-1);

  const updateFocusableElements = useCallback(() => {
    const elements = document.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>;
    
    focusableElements.current = Array.from(elements).filter(
      element => !element.disabled && element.offsetParent !== null
    );
  }, []);

  const focusNext = useCallback(() => {
    updateFocusableElements();
    currentIndex.current = Math.min(
      currentIndex.current + 1,
      focusableElements.current.length - 1
    );
    focusableElements.current[currentIndex.current]?.focus();
  }, [updateFocusableElements]);

  const focusPrevious = useCallback(() => {
    updateFocusableElements();
    currentIndex.current = Math.max(currentIndex.current - 1, 0);
    focusableElements.current[currentIndex.current]?.focus();
  }, [updateFocusableElements]);

  const focusFirst = useCallback(() => {
    updateFocusableElements();
    currentIndex.current = 0;
    focusableElements.current[0]?.focus();
  }, [updateFocusableElements]);

  const focusLast = useCallback(() => {
    updateFocusableElements();
    currentIndex.current = focusableElements.current.length - 1;
    focusableElements.current[currentIndex.current]?.focus();
  }, [updateFocusableElements]);

  return {
    focusNext,
    focusPrevious,
    focusFirst,
    focusLast,
    updateFocusableElements,
  };
};

// Hook for ARIA live regions
export const useAriaLiveRegion = () => {
  const createLiveRegion = useCallback((id: string, politeness: 'polite' | 'assertive' = 'polite') => {
    let region = document.getElementById(id) as HTMLElement;
    
    if (!region) {
      region = document.createElement('div');
      region.id = id;
      region.setAttribute('aria-live', politeness);
      region.setAttribute('aria-atomic', 'true');
      region.className = 'sr-only';
      document.body.appendChild(region);
    }
    
    return region;
  }, []);

  const announce = useCallback((message: string, id = 'aria-live-region', politeness: 'polite' | 'assertive' = 'polite') => {
    const region = createLiveRegion(id, politeness);
    region.textContent = message;
    
    // Clear after announcement
    setTimeout(() => {
      region.textContent = '';
    }, 1000);
  }, [createLiveRegion]);

  return {
    announce,
    createLiveRegion,
  };
};

// Hook for reduced motion detection
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

// Hook for high contrast detection
export const useHighContrast = () => {
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    setHighContrast(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setHighContrast(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return highContrast;
};

// Hook for color scheme detection
export const useColorScheme = () => {
  const [colorScheme, setColorScheme] = useState<'light' | 'dark' | 'no-preference'>('no-preference');

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setColorScheme(mediaQuery.matches ? 'dark' : 'light');

    const handleChange = (e: MediaQueryListEvent) => {
      setColorScheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return colorScheme;
};
