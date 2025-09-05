import React from 'react'
import { cn } from '../../utils/cn'

// Responsive Container
export const ResponsiveContainer: React.FC<{
  children: React.ReactNode
  className?: string
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  center?: boolean
}> = ({ 
  children, 
  className, 
  maxWidth = 'xl', 
  padding = 'md',
  center = true 
}) => {
  const getMaxWidthStyles = () => {
    switch (maxWidth) {
      case 'sm':
        return 'max-w-sm'
      case 'md':
        return 'max-w-md'
      case 'lg':
        return 'max-w-lg'
      case 'xl':
        return 'max-w-xl'
      case '2xl':
        return 'max-w-2xl'
      case 'full':
        return 'max-w-full'
      default:
        return 'max-w-xl'
    }
  }

  const getPaddingStyles = () => {
    switch (padding) {
      case 'none':
        return 'px-0'
      case 'sm':
        return 'px-2 sm:px-4'
      case 'md':
        return 'px-4 sm:px-6 lg:px-8'
      case 'lg':
        return 'px-6 sm:px-8 lg:px-12'
      default:
        return 'px-4 sm:px-6 lg:px-8'
    }
  }

  return (
    <div
      className={cn(
        'w-full',
        getMaxWidthStyles(),
        getPaddingStyles(),
        center && 'mx-auto',
        className
      )}
    >
      {children}
    </div>
  )
}

// Responsive Grid
export const ResponsiveGrid: React.FC<{
  children: React.ReactNode
  className?: string
  cols?: {
    default: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
  }
  gap?: 'sm' | 'md' | 'lg' | 'xl'
  autoFit?: boolean
  minWidth?: string
}> = ({ 
  children, 
  className, 
  cols = { default: 1, sm: 2, md: 3, lg: 4 },
  gap = 'md',
  autoFit = false,
  minWidth = '250px'
}) => {
  const getGapStyles = () => {
    switch (gap) {
      case 'sm':
        return 'gap-2'
      case 'md':
        return 'gap-4'
      case 'lg':
        return 'gap-6'
      case 'xl':
        return 'gap-8'
      default:
        return 'gap-4'
    }
  }

  const getGridStyles = () => {
    if (autoFit) {
      return {
        gridTemplateColumns: `repeat(auto-fit, minmax(${minWidth}, 1fr))`
      }
    }

    const baseCols = cols.default
    const smCols = cols.sm || baseCols
    const mdCols = cols.md || smCols
    const lgCols = cols.lg || mdCols
    const xlCols = cols.xl || lgCols

    return {
      gridTemplateColumns: `repeat(${baseCols}, 1fr)`,
      '@media (min-width: 640px)': {
        gridTemplateColumns: `repeat(${smCols}, 1fr)`
      },
      '@media (min-width: 768px)': {
        gridTemplateColumns: `repeat(${mdCols}, 1fr)`
      },
      '@media (min-width: 1024px)': {
        gridTemplateColumns: `repeat(${lgCols}, 1fr)`
      },
      '@media (min-width: 1280px)': {
        gridTemplateColumns: `repeat(${xlCols}, 1fr)`
      }
    }
  }

  return (
    <div
      className={cn(
        'grid',
        getGapStyles(),
        autoFit ? 'grid-cols-[repeat(auto-fit,minmax(250px,1fr))]' : 'grid-cols-1',
        cols.sm && 'sm:grid-cols-2',
        cols.md && 'md:grid-cols-3',
        cols.lg && 'lg:grid-cols-4',
        cols.xl && 'xl:grid-cols-5',
        className
      )}
      style={autoFit ? getGridStyles() : undefined}
    >
      {children}
    </div>
  )
}

// Responsive Stack
export const ResponsiveStack: React.FC<{
  children: React.ReactNode
  className?: string
  direction?: 'vertical' | 'horizontal'
  spacing?: 'sm' | 'md' | 'lg' | 'xl'
  responsive?: boolean
  breakpoint?: 'sm' | 'md' | 'lg' | 'xl'
}> = ({ 
  children, 
  className, 
  direction = 'vertical',
  spacing = 'md',
  responsive = true,
  breakpoint = 'md'
}) => {
  const getSpacingStyles = () => {
    switch (spacing) {
      case 'sm':
        return 'space-y-2 sm:space-y-0 sm:space-x-2'
      case 'md':
        return 'space-y-4 sm:space-y-0 sm:space-x-4'
      case 'lg':
        return 'space-y-6 sm:space-y-0 sm:space-x-6'
      case 'xl':
        return 'space-y-8 sm:space-y-0 sm:space-x-8'
      default:
        return 'space-y-4 sm:space-y-0 sm:space-x-4'
    }
  }

  const getDirectionStyles = () => {
    if (!responsive) {
      return direction === 'horizontal' ? 'flex-row' : 'flex-col'
    }

    const baseDirection = direction === 'horizontal' ? 'flex-col' : 'flex-col'
    const responsiveDirection = direction === 'horizontal' ? 'sm:flex-row' : 'sm:flex-col'

    return `${baseDirection} ${responsiveDirection}`
  }

  return (
    <div
      className={cn(
        'flex',
        getDirectionStyles(),
        responsive && getSpacingStyles(),
        !responsive && (direction === 'horizontal' ? 'space-x-4' : 'space-y-4'),
        className
      )}
    >
      {children}
    </div>
  )
}

// Responsive Text
export const ResponsiveText: React.FC<{
  children: React.ReactNode
  className?: string
  size?: {
    default: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl'
    sm?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl'
    md?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl'
    lg?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl'
  }
  weight?: 'normal' | 'medium' | 'semibold' | 'bold'
  align?: 'left' | 'center' | 'right' | 'justify'
  responsive?: boolean
}> = ({ 
  children, 
  className, 
  size = { default: 'base' },
  weight = 'normal',
  align = 'left',
  responsive = true
}) => {
  const getSizeStyles = () => {
    const baseSize = `text-${size.default}`
    const smSize = size.sm ? `sm:text-${size.sm}` : ''
    const mdSize = size.md ? `md:text-${size.md}` : ''
    const lgSize = size.lg ? `lg:text-${size.lg}` : ''

    return `${baseSize} ${smSize} ${mdSize} ${lgSize}`.trim()
  }

  const getWeightStyles = () => {
    switch (weight) {
      case 'medium':
        return 'font-medium'
      case 'semibold':
        return 'font-semibold'
      case 'bold':
        return 'font-bold'
      default:
        return 'font-normal'
    }
  }

  const getAlignStyles = () => {
    switch (align) {
      case 'center':
        return 'text-center'
      case 'right':
        return 'text-right'
      case 'justify':
        return 'text-justify'
      default:
        return 'text-left'
    }
  }

  return (
    <div
      className={cn(
        getSizeStyles(),
        getWeightStyles(),
        getAlignStyles(),
        className
      )}
    >
      {children}
    </div>
  )
}

// Responsive Image
export const ResponsiveImage: React.FC<{
  src: string
  alt: string
  className?: string
  sizes?: string
  loading?: 'lazy' | 'eager'
  priority?: boolean
  fill?: boolean
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down'
  aspectRatio?: 'square' | 'video' | 'wide' | 'tall' | 'auto'
}> = ({ 
  src, 
  alt, 
  className,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  loading = 'lazy',
  priority = false,
  fill = false,
  objectFit = 'cover',
  aspectRatio = 'auto'
}) => {
  const getObjectFitStyles = () => {
    switch (objectFit) {
      case 'cover':
        return 'object-cover'
      case 'contain':
        return 'object-contain'
      case 'fill':
        return 'object-fill'
      case 'none':
        return 'object-none'
      case 'scale-down':
        return 'object-scale-down'
      default:
        return 'object-cover'
    }
  }

  const getAspectRatioStyles = () => {
    switch (aspectRatio) {
      case 'square':
        return 'aspect-square'
      case 'video':
        return 'aspect-video'
      case 'wide':
        return 'aspect-[16/9]'
      case 'tall':
        return 'aspect-[3/4]'
      default:
        return ''
    }
  }

  return (
    <div className={cn('relative overflow-hidden', getAspectRatioStyles(), className)}>
      <img
        src={src}
        alt={alt}
        loading={loading}
        priority={priority}
        sizes={sizes}
        className={cn(
          'w-full h-full',
          getObjectFitStyles(),
          fill && 'absolute inset-0'
        )}
      />
    </div>
  )
}

// Responsive Modal
export const ResponsiveModal: React.FC<{
  children: React.ReactNode
  isOpen: boolean
  onClose: () => void
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  className?: string
}> = ({ 
  children, 
  isOpen, 
  onClose, 
  title,
  size = 'md',
  className 
}) => {
  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'max-w-sm'
      case 'md':
        return 'max-w-md'
      case 'lg':
        return 'max-w-lg'
      case 'xl':
        return 'max-w-xl'
      case 'full':
        return 'max-w-full mx-4'
      default:
        return 'max-w-md'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative bg-background rounded-lg shadow-xl w-full',
          getSizeStyles(),
          className
        )}
      >
        {title && (
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-muted rounded-md transition-colors"
            >
              ×
            </button>
          </div>
        )}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  )
}

// Responsive Navigation
export const ResponsiveNavigation: React.FC<{
  children: React.ReactNode
  className?: string
  mobileMenu?: React.ReactNode
  breakpoint?: 'sm' | 'md' | 'lg'
}> = ({ 
  children, 
  className,
  mobileMenu,
  breakpoint = 'md'
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)

  return (
    <nav className={cn('relative', className)}>
      {/* Desktop Navigation */}
      <div className={cn('hidden', `md:block`)}>
        {children}
      </div>

      {/* Mobile Navigation */}
      <div className={cn('block', `md:hidden`)}>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 hover:bg-muted rounded-md transition-colors"
        >
          ☰
        </button>
        
        {isMobileMenuOpen && (
          <div className="absolute top-full left-0 right-0 bg-background border rounded-md shadow-lg mt-1">
            {mobileMenu || children}
          </div>
        )}
      </div>
    </nav>
  )
}

// Responsive Table
export const ResponsiveTable: React.FC<{
  children: React.ReactNode
  className?: string
  scrollable?: boolean
  stickyHeader?: boolean
}> = ({ 
  children, 
  className,
  scrollable = true,
  stickyHeader = false
}) => {
  return (
    <div className={cn(
      'relative',
      scrollable && 'overflow-x-auto'
    )}>
      <table className={cn(
        'w-full border-collapse',
        stickyHeader && 'sticky top-0',
        className
      )}>
        {children}
      </table>
    </div>
  )
}

// Responsive Form
export const ResponsiveForm: React.FC<{
  children: React.ReactNode
  className?: string
  columns?: {
    default: number
    sm?: number
    md?: number
    lg?: number
  }
  spacing?: 'sm' | 'md' | 'lg'
}> = ({ 
  children, 
  className,
  columns = { default: 1, md: 2 },
  spacing = 'md'
}) => {
  const getSpacingStyles = () => {
    switch (spacing) {
      case 'sm':
        return 'space-y-2'
      case 'md':
        return 'space-y-4'
      case 'lg':
        return 'space-y-6'
      default:
        return 'space-y-4'
    }
  }

  return (
    <form className={cn(
      'grid',
      `grid-cols-${columns.default}`,
      columns.sm && `sm:grid-cols-${columns.sm}`,
      columns.md && `md:grid-cols-${columns.md}`,
      columns.lg && `lg:grid-cols-${columns.lg}`,
      getSpacingStyles(),
      className
    )}>
      {children}
    </form>
  )
}
