import React from 'react'
import { cn } from '../../utils/cn'
import { Loader2, Server, Users, Settings, BarChart3 } from 'lucide-react'

// Base Skeleton Component
export const Skeleton: React.FC<{
  className?: string
  variant?: 'default' | 'circular' | 'rectangular'
  animation?: 'pulse' | 'wave' | 'none'
  width?: string | number
  height?: string | number
}> = ({ 
  className, 
  variant = 'rectangular', 
  animation = 'pulse',
  width,
  height 
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'circular':
        return 'rounded-full'
      case 'rectangular':
        return 'rounded-md'
      default:
        return 'rounded'
    }
  }

  const getAnimationStyles = () => {
    switch (animation) {
      case 'pulse':
        return 'animate-pulse'
      case 'wave':
        return 'animate-wave'
      default:
        return ''
    }
  }

  return (
    <div
      className={cn(
        'bg-muted',
        getVariantStyles(),
        getAnimationStyles(),
        className
      )}
      style={{
        width: width || '100%',
        height: height || '1rem',
      }}
    />
  )
}

// Text Skeleton
export const TextSkeleton: React.FC<{
  lines?: number
  className?: string
  lastLineWidth?: string
}> = ({ lines = 1, className, lastLineWidth = '75%' }) => {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          height="1rem"
          width={index === lines - 1 ? lastLineWidth : '100%'}
        />
      ))}
    </div>
  )
}

// Card Skeleton
export const CardSkeleton: React.FC<{
  showHeader?: boolean
  showFooter?: boolean
  className?: string
}> = ({ showHeader = true, showFooter = false, className }) => {
  return (
    <div className={cn('p-6 border rounded-lg space-y-4', className)}>
      {showHeader && (
        <div className="flex items-center space-x-3">
          <Skeleton variant="circular" width={40} height={40} />
          <div className="space-y-2 flex-1">
            <Skeleton height="1rem" width="60%" />
            <Skeleton height="0.75rem" width="40%" />
          </div>
        </div>
      )}
      
      <div className="space-y-3">
        <Skeleton height="1rem" width="100%" />
        <Skeleton height="1rem" width="85%" />
        <Skeleton height="1rem" width="70%" />
      </div>
      
      {showFooter && (
        <div className="flex justify-between items-center pt-4 border-t">
          <Skeleton height="2rem" width="6rem" />
          <Skeleton height="2rem" width="4rem" />
        </div>
      )}
    </div>
  )
}

// Server Card Skeleton
export const ServerCardSkeleton: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn('p-4 border rounded-lg space-y-4', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Skeleton variant="circular" width={12} height={12} />
          <Skeleton height="1.25rem" width="8rem" />
        </div>
        <Skeleton height="1.5rem" width="4rem" />
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between">
          <Skeleton height="0.875rem" width="4rem" />
          <Skeleton height="0.875rem" width="6rem" />
        </div>
        <div className="flex justify-between">
          <Skeleton height="0.875rem" width="5rem" />
          <Skeleton height="0.875rem" width="3rem" />
        </div>
      </div>
      
      <div className="flex justify-between items-center pt-2 border-t">
        <Skeleton height="2rem" width="5rem" />
        <div className="flex space-x-2">
          <Skeleton height="2rem" width="2rem" />
          <Skeleton height="2rem" width="2rem" />
          <Skeleton height="2rem" width="2rem" />
        </div>
      </div>
    </div>
  )
}

// Table Skeleton
export const TableSkeleton: React.FC<{
  rows?: number
  columns?: number
  className?: string
}> = ({ rows = 5, columns = 4, className }) => {
  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={index} height="1.5rem" />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} height="1rem" />
          ))}
        </div>
      ))}
    </div>
  )
}

// Dashboard Skeleton
export const DashboardSkeleton: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <CardSkeleton key={index} showHeader={false} showFooter={false} />
        ))}
      </div>
      
      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CardSkeleton showHeader={true} showFooter={true} />
        <CardSkeleton showHeader={true} showFooter={false} />
      </div>
      
      {/* Table */}
      <CardSkeleton showHeader={true} showFooter={false}>
        <TableSkeleton rows={6} columns={5} />
      </CardSkeleton>
    </div>
  )
}

// Loading Spinner with Text
export const LoadingSpinner: React.FC<{
  size?: 'sm' | 'md' | 'lg' | 'xl'
  text?: string
  className?: string
  variant?: 'default' | 'primary' | 'secondary'
}> = ({ size = 'md', text, className, variant = 'default' }) => {
  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'h-4 w-4'
      case 'lg':
        return 'h-8 w-8'
      case 'xl':
        return 'h-12 w-12'
      default:
        return 'h-6 w-6'
    }
  }

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'text-primary'
      case 'secondary':
        return 'text-secondary'
      default:
        return 'text-muted-foreground'
    }
  }

  return (
    <div className={cn('flex items-center justify-center gap-3', className)}>
      <Loader2 className={cn('animate-spin', getSizeStyles(), getVariantStyles())} />
      {text && <span className="text-sm text-muted-foreground">{text}</span>}
    </div>
  )
}

// Page Loading State
export const PageLoading: React.FC<{
  title?: string
  description?: string
  className?: string
}> = ({ title = 'Loading...', description, className }) => {
  return (
    <div className={cn('flex flex-col items-center justify-center min-h-[400px] space-y-4', className)}>
      <LoadingSpinner size="xl" />
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold">{title}</h2>
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  )
}

// Inline Loading State
export const InlineLoading: React.FC<{
  text?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}> = ({ text = 'Loading...', size = 'sm', className }) => {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <LoadingSpinner size={size} />
      <span className="text-sm text-muted-foreground">{text}</span>
    </div>
  )
}

// Button Loading State
export const ButtonLoading: React.FC<{
  loading?: boolean
  children: React.ReactNode
  loadingText?: string
  className?: string
}> = ({ loading = false, children, loadingText, className }) => {
  return (
    <div className={cn('relative', className)}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-md">
          <LoadingSpinner size="sm" text={loadingText} />
        </div>
      )}
      <div className={loading ? 'opacity-50 pointer-events-none' : ''}>
        {children}
      </div>
    </div>
  )
}

// Progress Loading
export const ProgressLoading: React.FC<{
  progress: number
  text?: string
  className?: string
  showPercentage?: boolean
}> = ({ progress, text, className, showPercentage = true }) => {
  return (
    <div className={cn('space-y-2', className)}>
      {text && (
        <div className="flex justify-between text-sm">
          <span>{text}</span>
          {showPercentage && <span>{Math.round(progress)}%</span>}
        </div>
      )}
      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  )
}

// Icon Loading States
export const IconLoading: React.FC<{
  icon: React.ComponentType<{ className?: string }>
  loading?: boolean
  className?: string
}> = ({ icon: Icon, loading = false, className }) => {
  return (
    <div className={cn('relative', className)}>
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <Icon className="h-5 w-5" />
      )}
    </div>
  )
}

// Specific Loading States for App Components
export const ServerListLoading: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <ServerCardSkeleton key={index} />
      ))}
    </div>
  )
}

export const UserListLoading: React.FC<{ count?: number }> = ({ count = 5 }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg">
          <Skeleton variant="circular" width={40} height={40} />
          <div className="space-y-2 flex-1">
            <Skeleton height="1rem" width="60%" />
            <Skeleton height="0.75rem" width="40%" />
          </div>
          <Skeleton height="2rem" width="4rem" />
        </div>
      ))}
    </div>
  )
}

export const StatsLoading: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="p-4 border rounded-lg space-y-3">
          <div className="flex items-center space-x-2">
            <Skeleton variant="circular" width={20} height={20} />
            <Skeleton height="1rem" width="6rem" />
          </div>
          <Skeleton height="2rem" width="4rem" />
          <Skeleton height="0.75rem" width="8rem" />
        </div>
      ))}
    </div>
  )
}
