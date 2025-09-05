import React, { forwardRef, useState, useRef, useEffect } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import { useAnimation, animationPresets, useReducedMotion } from '../../utils/animations';
import { 
  ChevronDown, 
  ChevronUp, 
  MoreHorizontal, 
  Star, 
  Heart,
  Share2,
  Bookmark,
  Eye,
  EyeOff
} from 'lucide-react';

// Enhanced card variants
const enhancedCardVariants = cva(
  'rounded-lg border bg-card text-card-foreground shadow-sm transition-all duration-300 relative overflow-hidden',
  {
    variants: {
      variant: {
        default: 'hover:shadow-md hover:shadow-black/5',
        elevated: 'shadow-lg hover:shadow-xl hover:shadow-black/10',
        outlined: 'border-2 hover:border-primary/50',
        filled: 'bg-muted/50 hover:bg-muted',
        minecraft: 'border-minecraft-brown bg-gradient-to-br from-minecraft-green/10 to-minecraft-blue/10 shadow-minecraft hover:shadow-minecraft-lg',
        glass: 'bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/20',
        gradient: 'bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 hover:from-primary/20 hover:via-secondary/20 hover:to-accent/20',
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
      animated: {
        true: 'animate-fade-in',
        false: '',
      },
      glow: {
        true: 'hover:shadow-lg hover:shadow-primary/25',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      interactive: false,
      animated: false,
      glow: false,
    },
  }
);

export interface EnhancedCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof enhancedCardVariants> {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  onToggle?: (collapsed: boolean) => void;
  onClick?: () => void;
  onDoubleClick?: () => void;
  favorite?: boolean;
  onFavorite?: (favorited: boolean) => void;
  bookmarked?: boolean;
  onBookmark?: (bookmarked: boolean) => void;
  visible?: boolean;
  onVisibilityToggle?: (visible: boolean) => void;
  loading?: boolean;
  error?: boolean;
  success?: boolean;
  tooltip?: string;
  badge?: string;
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';
  shimmer?: boolean;
  gradient?: string;
  children?: React.ReactNode;
}

const EnhancedCard = forwardRef<HTMLDivElement, EnhancedCardProps>(
  (
    {
      className,
      variant,
      size,
      interactive,
      animated,
      glow,
      title,
      description,
      icon,
      actions,
      collapsible = false,
      defaultCollapsed = false,
      onToggle,
      onClick,
      onDoubleClick,
      favorite = false,
      onFavorite,
      bookmarked = false,
      onBookmark,
      visible = true,
      onVisibilityToggle,
      loading = false,
      error = false,
      success = false,
      tooltip,
      badge,
      badgeVariant = 'default',
      shimmer = false,
      gradient,
      children,
      ...props
    },
    ref
  ) => {
    const [collapsed, setCollapsed] = useState(defaultCollapsed);
    const [isHovered, setIsHovered] = useState(false);
    const [isPressed, setIsPressed] = useState(false);
    const [isFavorited, setIsFavorited] = useState(favorite);
    const [isBookmarked, setIsBookmarked] = useState(bookmarked);
    const [isVisible, setIsVisible] = useState(visible);
    const cardRef = useRef<HTMLDivElement>(null);
    const reducedMotion = useReducedMotion();

    // Combine refs
    const combinedRef = (node: HTMLDivElement) => {
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
      cardRef.current = node;
    };

    // Animation setup
    const { ref: animationRef, isVisible: isInView } = useAnimation(
      animated ? animationPresets.cardEnter : { type: 'fade-in', trigger: 'load' }
    );

    // Handle interactions
    const handleClick = () => {
      if (collapsible) {
        const newCollapsed = !collapsed;
        setCollapsed(newCollapsed);
        onToggle?.(newCollapsed);
      }
      onClick?.();
    };

    const handleDoubleClick = () => {
      onDoubleClick?.();
    };

    const handleMouseDown = () => {
      if (interactive) {
        setIsPressed(true);
      }
    };

    const handleMouseUp = () => {
      setIsPressed(false);
    };

    const handleMouseEnter = () => {
      setIsHovered(true);
    };

    const handleMouseLeave = () => {
      setIsHovered(false);
      setIsPressed(false);
    };

    const handleFavorite = (e: React.MouseEvent) => {
      e.stopPropagation();
      const newFavorited = !isFavorited;
      setIsFavorited(newFavorited);
      onFavorite?.(newFavorited);
    };

    const handleBookmark = (e: React.MouseEvent) => {
      e.stopPropagation();
      const newBookmarked = !isBookmarked;
      setIsBookmarked(newBookmarked);
      onBookmark?.(newBookmarked);
    };

    const handleVisibilityToggle = (e: React.MouseEvent) => {
      e.stopPropagation();
      const newVisible = !isVisible;
      setIsVisible(newVisible);
      onVisibilityToggle?.(newVisible);
    };

    // Get status classes
    const getStatusClasses = () => {
      if (error) return 'border-destructive/50 bg-destructive/5';
      if (success) return 'border-green-500/50 bg-green-50';
      if (loading) return 'opacity-75';
      return '';
    };

    // Get badge classes
    const getBadgeClasses = () => {
      const baseClasses = 'absolute top-2 right-2 px-2 py-1 text-xs font-medium rounded-full';
      switch (badgeVariant) {
        case 'secondary':
          return `${baseClasses} bg-secondary text-secondary-foreground`;
        case 'destructive':
          return `${baseClasses} bg-destructive text-destructive-foreground`;
        case 'outline':
          return `${baseClasses} border border-input bg-background`;
        case 'success':
          return `${baseClasses} bg-green-500 text-white`;
        case 'warning':
          return `${baseClasses} bg-yellow-500 text-white`;
        default:
          return `${baseClasses} bg-primary text-primary-foreground`;
      }
    };

    return (
      <div
        ref={(node) => {
          combinedRef(node);
          if (animated) {
            animationRef(node);
          }
        }}
        className={cn(
          enhancedCardVariants({
            variant,
            size,
            interactive,
            animated: false, // Handled separately
            glow,
            className,
          }),
          getStatusClasses(),
          isPressed && interactive && 'scale-[0.98]',
          isHovered && interactive && 'shadow-lg',
          shimmer && 'animate-shimmer',
          reducedMotion && 'transition-none'
        )}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        title={tooltip}
        style={{
          background: gradient,
        }}
        {...props}
      >
        {/* Shimmer effect */}
        {shimmer && (
          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
        )}

        {/* Badge */}
        {badge && <div className={getBadgeClasses()}>{badge}</div>}

        {/* Header */}
        {(title || icon || collapsible || actions) && (
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {icon && <div className="flex-shrink-0">{icon}</div>}
              <div className="flex-1 min-w-0">
                {title && (
                  <h3 className="text-lg font-semibold text-foreground truncate">
                    {title}
                  </h3>
                )}
                {description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {description}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Action buttons */}
              {onFavorite && (
                <button
                  onClick={handleFavorite}
                  className={cn(
                    'p-1 rounded-full transition-colors',
                    isFavorited
                      ? 'text-red-500 hover:text-red-600'
                      : 'text-muted-foreground hover:text-red-500'
                  )}
                >
                  <Heart className={cn('h-4 w-4', isFavorited && 'fill-current')} />
                </button>
              )}

              {onBookmark && (
                <button
                  onClick={handleBookmark}
                  className={cn(
                    'p-1 rounded-full transition-colors',
                    isBookmarked
                      ? 'text-blue-500 hover:text-blue-600'
                      : 'text-muted-foreground hover:text-blue-500'
                  )}
                >
                  <Bookmark className={cn('h-4 w-4', isBookmarked && 'fill-current')} />
                </button>
              )}

              {onVisibilityToggle && (
                <button
                  onClick={handleVisibilityToggle}
                  className={cn(
                    'p-1 rounded-full transition-colors',
                    isVisible
                      ? 'text-green-500 hover:text-green-600'
                      : 'text-muted-foreground hover:text-green-500'
                  )}
                >
                  {isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
              )}

              {collapsible && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const newCollapsed = !collapsed;
                    setCollapsed(newCollapsed);
                    onToggle?.(newCollapsed);
                  }}
                  className="p-1 rounded-full hover:bg-muted transition-colors"
                >
                  {collapsed ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronUp className="h-4 w-4" />
                  )}
                </button>
              )}

              {actions}
            </div>
          </div>
        )}

        {/* Content */}
        {!collapsed && (
          <div className={cn('space-y-4', animated && 'animate-slide-in-up')}>
            {children}
          </div>
        )}

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        )}
      </div>
    );
  }
);

EnhancedCard.displayName = 'EnhancedCard';

export { EnhancedCard, enhancedCardVariants };
