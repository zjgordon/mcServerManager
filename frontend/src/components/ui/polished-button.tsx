import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../utils/cn'

const polishedButtonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 relative overflow-hidden group',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md active:scale-95',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm hover:shadow-md active:scale-95',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground shadow-sm hover:shadow-md active:scale-95',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm hover:shadow-md active:scale-95',
        ghost: 'hover:bg-accent hover:text-accent-foreground active:scale-95',
        link: 'text-primary underline-offset-4 hover:underline active:scale-95',
        gradient: 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl active:scale-95',
        glass: 'bg-white/10 backdrop-blur-sm border border-white/20 text-foreground hover:bg-white/20 shadow-lg hover:shadow-xl active:scale-95',
        neon: 'bg-primary text-primary-foreground shadow-[0_0_20px_rgba(59,130,246,0.5)] hover:shadow-[0_0_30px_rgba(59,130,246,0.8)] active:scale-95',
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
        pulse: 'animate-pulse',
        bounce: 'animate-bounce',
        spin: 'animate-spin',
        ping: 'animate-ping',
        wiggle: 'animate-wiggle',
      },
      effect: {
        none: '',
        ripple: 'relative overflow-hidden',
        glow: 'shadow-lg hover:shadow-xl',
        lift: 'hover:-translate-y-1 transition-transform',
        scale: 'hover:scale-105 transition-transform',
        rotate: 'hover:rotate-3 transition-transform',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      animation: 'none',
      effect: 'none',
    },
  }
)

export interface PolishedButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof polishedButtonVariants> {
  loading?: boolean
  loadingText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  tooltip?: string
  ripple?: boolean
}

const PolishedButton = React.forwardRef<HTMLButtonElement, PolishedButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    animation, 
    effect, 
    loading = false, 
    loadingText, 
    leftIcon, 
    rightIcon, 
    tooltip,
    ripple = false,
    children, 
    disabled,
    ...props 
  }, ref) => {
    const [rippleEffect, setRippleEffect] = React.useState<{ x: number; y: number } | null>(null)

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (ripple) {
        const rect = e.currentTarget.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        setRippleEffect({ x, y })
        
        setTimeout(() => setRippleEffect(null), 600)
      }
      
      if (!loading && !disabled) {
        props.onClick?.(e)
      }
    }

    const buttonContent = (
      <>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            {loadingText && <span className="ml-2 text-sm">{loadingText}</span>}
          </div>
        )}
        
        {ripple && rippleEffect && (
          <div
            className="absolute h-2 w-2 animate-ping rounded-full bg-white/30"
            style={{
              left: rippleEffect.x - 4,
              top: rippleEffect.y - 4,
            }}
          />
        )}
        
        <div className="flex items-center gap-2">
          {leftIcon && !loading && <span className="flex-shrink-0">{leftIcon}</span>}
          {children && <span className={loading ? 'opacity-0' : 'opacity-100'}>{children}</span>}
          {rightIcon && !loading && <span className="flex-shrink-0">{rightIcon}</span>}
        </div>
      </>
    )

    return (
      <button
        className={cn(
          polishedButtonVariants({ variant, size, animation, effect, className }),
          loading && 'cursor-not-allowed',
          ripple && 'relative overflow-hidden'
        )}
        ref={ref}
        disabled={disabled || loading}
        onClick={handleClick}
        aria-label={tooltip}
        title={tooltip}
        {...props}
      >
        {buttonContent}
      </button>
    )
  }
)

PolishedButton.displayName = 'PolishedButton'

export { PolishedButton, polishedButtonVariants }
