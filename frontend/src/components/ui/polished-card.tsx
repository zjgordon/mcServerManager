import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../utils/cn'

const polishedCardVariants = cva(
  'rounded-lg border bg-card text-card-foreground shadow-sm transition-all duration-200',
  {
    variants: {
      variant: {
        default: 'border-border hover:shadow-md',
        elevated: 'shadow-lg hover:shadow-xl border-0',
        outlined: 'border-2 border-primary/20 hover:border-primary/40',
        glass: 'bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/20',
        gradient: 'bg-gradient-to-br from-card to-card/80 border-0 shadow-lg',
        neon: 'border-primary/50 shadow-[0_0_20px_rgba(59,130,246,0.1)] hover:shadow-[0_0_30px_rgba(59,130,246,0.2)]',
        flat: 'border-0 shadow-none hover:shadow-sm',
      },
      size: {
        sm: 'p-3',
        default: 'p-6',
        lg: 'p-8',
        xl: 'p-10',
      },
      interactive: {
        true: 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]',
        false: '',
      },
      glow: {
        true: 'shadow-lg hover:shadow-xl',
        false: '',
      },
      border: {
        true: 'border',
        false: 'border-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      interactive: false,
      glow: false,
      border: true,
    },
  }
)

export interface PolishedCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof polishedCardVariants> {
  loading?: boolean
  header?: React.ReactNode
  footer?: React.ReactNode
  actions?: React.ReactNode
  badge?: React.ReactNode
  hover?: boolean
  clickable?: boolean
  onCardClick?: () => void
}

const PolishedCard = React.forwardRef<HTMLDivElement, PolishedCardProps>(
  ({ 
    className, 
    variant, 
    size, 
    interactive, 
    glow, 
    border,
    loading = false,
    header,
    footer,
    actions,
    badge,
    hover = false,
    clickable = false,
    onCardClick,
    children, 
    ...props 
  }, ref) => {
    const [isHovered, setIsHovered] = React.useState(false)

    const handleClick = () => {
      if (clickable && onCardClick) {
        onCardClick()
      }
    }

    const handleMouseEnter = () => {
      if (hover) {
        setIsHovered(true)
      }
    }

    const handleMouseLeave = () => {
      if (hover) {
        setIsHovered(false)
      }
    }

    return (
      <div
        ref={ref}
        className={cn(
          polishedCardVariants({ 
            variant, 
            size, 
            interactive: interactive || clickable, 
            glow, 
            border,
            className 
          }),
          hover && 'transition-all duration-300',
          isHovered && hover && 'scale-105 shadow-xl'
        )}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        role={clickable ? 'button' : undefined}
        tabIndex={clickable ? 0 : undefined}
        onKeyDown={clickable ? (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleClick()
          }
        } : undefined}
        {...props}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
        
        {badge && (
          <div className="absolute -top-2 -right-2 z-10">
            {badge}
          </div>
        )}
        
        {header && (
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">{header}</div>
            {actions && (
              <div className="flex items-center gap-2 ml-4">
                {actions}
              </div>
            )}
          </div>
        )}
        
        <div className={cn(
          'relative',
          loading && 'opacity-50 pointer-events-none'
        )}>
          {children}
        </div>
        
        {footer && (
          <div className="mt-4 pt-4 border-t border-border/50">
            {footer}
          </div>
        )}
      </div>
    )
  }
)

PolishedCard.displayName = 'PolishedCard'

const PolishedCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 p-6', className)}
    {...props}
  />
))
PolishedCardHeader.displayName = 'PolishedCardHeader'

const PolishedCardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('text-2xl font-semibold leading-none tracking-tight', className)}
    {...props}
  />
))
PolishedCardTitle.displayName = 'PolishedCardTitle'

const PolishedCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
))
PolishedCardDescription.displayName = 'PolishedCardDescription'

const PolishedCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
))
PolishedCardContent.displayName = 'PolishedCardContent'

const PolishedCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center p-6 pt-0', className)}
    {...props}
  />
))
PolishedCardFooter.displayName = 'PolishedCardFooter'

export { 
  PolishedCard, 
  PolishedCardHeader, 
  PolishedCardTitle, 
  PolishedCardDescription, 
  PolishedCardContent, 
  PolishedCardFooter,
  polishedCardVariants 
}
