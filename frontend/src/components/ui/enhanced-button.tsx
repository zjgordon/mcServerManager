import React, { forwardRef, useState, useRef, useEffect } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import { useAnimation, animationPresets, useReducedMotion } from '../../utils/animations';
import { Loader2, Check, X, AlertTriangle } from 'lucide-react';

// Enhanced button variants with animations
const enhancedButtonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 relative overflow-hidden',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow hover:shadow-md active:scale-95',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow hover:shadow-md active:scale-95',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground shadow-sm hover:shadow-md active:scale-95',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm hover:shadow-md active:scale-95',
        ghost: 'hover:bg-accent hover:text-accent-foreground active:scale-95',
        link: 'text-primary underline-offset-4 hover:underline active:scale-95',
        minecraft: 'bg-minecraft-green text-white hover:bg-minecraft-dark-green shadow-minecraft hover:shadow-minecraft-lg active:shadow-minecraft active:translate-y-1 transition-all duration-150',
        success: 'bg-green-600 text-white hover:bg-green-700 shadow hover:shadow-md active:scale-95',
        warning: 'bg-yellow-600 text-white hover:bg-yellow-700 shadow hover:shadow-md active:scale-95',
        info: 'bg-blue-600 text-white hover:bg-blue-700 shadow hover:shadow-md active:scale-95',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        xl: 'h-12 rounded-lg px-10 text-base',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8',
        'icon-lg': 'h-12 w-12',
      },
      animation: {
        none: '',
        pulse: 'animate-pulse-slow',
        bounce: 'animate-bounce-slow',
        glow: 'animate-glow',
        float: 'animate-float',
        wiggle: 'animate-wiggle',
      },
      loading: {
        true: 'cursor-wait',
        false: '',
      },
      ripple: {
        true: '',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      animation: 'none',
      loading: false,
      ripple: true,
    },
  }
);

export interface EnhancedButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof enhancedButtonVariants> {
  asChild?: boolean;
  loading?: boolean;
  success?: boolean;
  error?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  tooltip?: string;
  ripple?: boolean;
  animation?: 'none' | 'pulse' | 'bounce' | 'glow' | 'float' | 'wiggle';
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

const EnhancedButton = forwardRef<HTMLButtonElement, EnhancedButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      success = false,
      error = false,
      icon,
      iconPosition = 'left',
      tooltip,
      ripple = true,
      animation = 'none',
      children,
      onClick,
      disabled,
      ...props
    },
    ref
  ) => {
    const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);
    const [isPressed, setIsPressed] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const reducedMotion = useReducedMotion();
    
    // Combine refs
    const combinedRef = (node: HTMLButtonElement) => {
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
      buttonRef.current = node;
    };

    // Ripple effect
    const createRipple = (event: React.MouseEvent<HTMLButtonElement>) => {
      if (!ripple || reducedMotion) return;

      const button = buttonRef.current;
      if (!button) return;

      const rect = button.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const id = Date.now();

      setRipples(prev => [...prev, { id, x, y }]);

      // Remove ripple after animation
      setTimeout(() => {
        setRipples(prev => prev.filter(ripple => ripple.id !== id));
      }, 600);
    };

    // Handle click with animations
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      if (loading || disabled) return;

      createRipple(event);
      setIsPressed(true);
      
      // Reset pressed state
      setTimeout(() => setIsPressed(false), 150);
      
      onClick?.(event);
    };

    // Handle keyboard interactions
    const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        setIsPressed(true);
        setTimeout(() => setIsPressed(false), 150);
      }
    };

    // Get status icon
    const getStatusIcon = () => {
      if (loading) return <Loader2 className="h-4 w-4 animate-spin" />;
      if (success) return <Check className="h-4 w-4" />;
      if (error) return <X className="h-4 w-4" />;
      return icon;
    };

    // Get status variant
    const getStatusVariant = () => {
      if (success) return 'success';
      if (error) return 'destructive';
      return variant;
    };

    const Comp = asChild ? Slot : 'button';

    return (
      <Comp
        className={cn(
          enhancedButtonVariants({
            variant: getStatusVariant(),
            size,
            animation: reducedMotion ? 'none' : animation,
            loading,
            ripple,
            className,
          }),
          isPressed && 'scale-95',
          success && 'animate-scale-in',
          error && 'animate-wiggle'
        )}
        ref={combinedRef}
        disabled={disabled || loading}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        title={tooltip}
        {...props}
      >
        {/* Ripple effects */}
        {ripples.map((ripple) => (
          <span
            key={ripple.id}
            className="absolute pointer-events-none animate-ping"
            style={{
              left: ripple.x - 10,
              top: ripple.y - 10,
              width: 20,
              height: 20,
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.6)',
              transform: 'scale(0)',
              animation: 'ping 0.6s ease-out',
            }}
          />
        ))}

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded-md">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        )}

        {/* Content */}
        <div className={cn('flex items-center gap-2', loading && 'opacity-0')}>
          {getStatusIcon() && iconPosition === 'left' && (
            <span className="flex-shrink-0">{getStatusIcon()}</span>
          )}
          {children && <span>{children}</span>}
          {getStatusIcon() && iconPosition === 'right' && (
            <span className="flex-shrink-0">{getStatusIcon()}</span>
          )}
        </div>
      </Comp>
    );
  }
);

EnhancedButton.displayName = 'EnhancedButton';

export { EnhancedButton, enhancedButtonVariants };
