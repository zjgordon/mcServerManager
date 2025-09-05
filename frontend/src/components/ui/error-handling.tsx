import React from 'react'
import { cn } from '../../utils/cn'
import { AlertCircle, RefreshCw, Home, ArrowLeft, Bug, Wifi, WifiOff } from 'lucide-react'
import { useFeedback } from './feedback-system'

// Error Types
export interface AppError {
  code: string
  message: string
  details?: string
  timestamp: Date
  context?: Record<string, any>
  retryable?: boolean
}

// Error Boundary Component
interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

export class ErrorBoundary extends React.Component<
  React.PropsWithChildren<{ fallback?: React.ComponentType<ErrorFallbackProps> }>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{ fallback?: React.ComponentType<ErrorFallbackProps> }>) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorInfo: null }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ error, errorInfo })
    
    // Log error to monitoring service
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || ErrorFallback
      return (
        <FallbackComponent
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          resetError={() => this.setState({ hasError: false, error: null, errorInfo: null })}
        />
      )
    }

    return this.props.children
  }
}

// Error Fallback Props
interface ErrorFallbackProps {
  error: Error | null
  errorInfo: React.ErrorInfo | null
  resetError: () => void
}

// Error Fallback Component
export const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, errorInfo, resetError }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full mx-4">
        <div className="text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
            <p className="text-muted-foreground">
              We're sorry, but something unexpected happened. Please try again.
            </p>
          </div>
          
          {process.env.NODE_ENV === 'development' && error && (
            <details className="text-left bg-muted p-4 rounded-lg">
              <summary className="cursor-pointer font-medium">Error Details</summary>
              <pre className="mt-2 text-xs text-muted-foreground overflow-auto">
                {error.toString()}
                {errorInfo?.componentStack}
              </pre>
            </details>
          )}
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={resetError}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-2 inline" />
              Try Again
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
            >
              <Home className="w-4 h-4 mr-2 inline" />
              Go Home
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Error Display Component
export const ErrorDisplay: React.FC<{
  error: AppError | Error | string
  title?: string
  variant?: 'default' | 'compact' | 'inline'
  showRetry?: boolean
  onRetry?: () => void
  showDetails?: boolean
  className?: string
}> = ({ 
  error, 
  title = 'An error occurred', 
  variant = 'default',
  showRetry = false,
  onRetry,
  showDetails = false,
  className 
}) => {
  const getErrorMessage = () => {
    if (typeof error === 'string') return error
    if (error instanceof Error) return error.message
    return error.message
  }

  const getErrorCode = () => {
    if (typeof error === 'object' && 'code' in error) {
      return error.code
    }
    return null
  }

  const isRetryable = () => {
    if (typeof error === 'object' && 'retryable' in error) {
      return error.retryable
    }
    return false
  }

  if (variant === 'inline') {
    return (
      <div className={cn('flex items-center gap-2 text-sm text-red-600', className)}>
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <span>{getErrorMessage()}</span>
        {showRetry && (isRetryable() || onRetry) && (
          <button
            onClick={onRetry}
            className="text-red-600 hover:text-red-700 underline"
          >
            Retry
          </button>
        )}
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div className={cn('p-3 bg-red-50 border border-red-200 rounded-md', className)}>
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-red-800">{getErrorMessage()}</p>
            {showRetry && (isRetryable() || onRetry) && (
              <button
                onClick={onRetry}
                className="mt-2 text-xs text-red-600 hover:text-red-700 underline"
              >
                Try again
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('p-6 bg-red-50 border border-red-200 rounded-lg', className)}>
      <div className="flex items-start gap-3">
        <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-red-800">{title}</h3>
          <p className="mt-1 text-sm text-red-700">{getErrorMessage()}</p>
          
          {getErrorCode() && (
            <p className="mt-1 text-xs text-red-600">Error Code: {getErrorCode()}</p>
          )}
          
          {showDetails && typeof error === 'object' && 'details' in error && error.details && (
            <details className="mt-3">
              <summary className="cursor-pointer text-sm text-red-600 hover:text-red-700">
                Show Details
              </summary>
              <pre className="mt-2 text-xs text-red-600 bg-red-100 p-2 rounded overflow-auto">
                {error.details}
              </pre>
            </details>
          )}
          
          {showRetry && (isRetryable() || onRetry) && (
            <button
              onClick={onRetry}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
            >
              <RefreshCw className="w-4 h-4 mr-2 inline" />
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Network Error Component
export const NetworkError: React.FC<{
  onRetry?: () => void
  className?: string
}> = ({ onRetry, className }) => {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine)

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return (
    <div className={cn('p-6 bg-yellow-50 border border-yellow-200 rounded-lg', className)}>
      <div className="flex items-start gap-3">
        {isOnline ? (
          <Wifi className="w-6 h-6 text-yellow-600 flex-shrink-0" />
        ) : (
          <WifiOff className="w-6 h-6 text-yellow-600 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-yellow-800">
            {isOnline ? 'Connection Issue' : 'No Internet Connection'}
          </h3>
          <p className="mt-1 text-sm text-yellow-700">
            {isOnline 
              ? 'Unable to connect to the server. Please check your connection and try again.'
              : 'You appear to be offline. Please check your internet connection.'
            }
          </p>
          
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors text-sm"
            >
              <RefreshCw className="w-4 h-4 mr-2 inline" />
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Empty State Component
export const EmptyState: React.FC<{
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}> = ({ icon, title, description, action, className }) => {
  return (
    <div className={cn('text-center py-12', className)}>
      {icon && (
        <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
          {icon}
        </div>
      )}
      
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      
      {description && (
        <p className="text-muted-foreground mb-6 max-w-sm mx-auto">{description}</p>
      )}
      
      {action && <div>{action}</div>}
    </div>
  )
}

// Error Hook
export const useErrorHandler = () => {
  const { addMessage } = useFeedback()

  const handleError = React.useCallback((error: Error | string, context?: string) => {
    const message = typeof error === 'string' ? error : error.message
    
    addMessage({
      type: 'error',
      title: 'Error',
      message: context ? `${context}: ${message}` : message,
      persistent: false,
    })
  }, [addMessage])

  const handleSuccess = React.useCallback((message: string, context?: string) => {
    addMessage({
      type: 'success',
      title: 'Success',
      message: context ? `${context}: ${message}` : message,
    })
  }, [addMessage])

  const handleWarning = React.useCallback((message: string, context?: string) => {
    addMessage({
      type: 'warning',
      title: 'Warning',
      message: context ? `${context}: ${message}` : message,
    })
  }, [addMessage])

  const handleInfo = React.useCallback((message: string, context?: string) => {
    addMessage({
      type: 'info',
      title: 'Info',
      message: context ? `${context}: ${message}` : message,
    })
  }, [addMessage])

  return {
    handleError,
    handleSuccess,
    handleWarning,
    handleInfo,
  }
}

// Error Recovery Component
export const ErrorRecovery: React.FC<{
  error: AppError | Error
  onRetry?: () => void
  onGoBack?: () => void
  onGoHome?: () => void
  className?: string
}> = ({ error, onRetry, onGoBack, onGoHome, className }) => {
  const isRetryable = () => {
    if (typeof error === 'object' && 'retryable' in error) {
      return error.retryable
    }
    return true
  }

  return (
    <div className={cn('space-y-4', className)}>
      <ErrorDisplay error={error} showRetry={false} />
      
      <div className="flex flex-wrap gap-3">
        {isRetryable() && onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2 inline" />
            Try Again
          </button>
        )}
        
        {onGoBack && (
          <button
            onClick={onGoBack}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2 inline" />
            Go Back
          </button>
        )}
        
        {onGoHome && (
          <button
            onClick={onGoHome}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
          >
            <Home className="w-4 h-4 mr-2 inline" />
            Go Home
          </button>
        )}
      </div>
    </div>
  )
}
