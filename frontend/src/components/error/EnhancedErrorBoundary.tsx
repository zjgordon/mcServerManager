import React, { Component, ErrorInfo, ReactNode } from 'react'
import { bugDetector } from '../../utils/bug-detection'
import { AppError } from '../../types/error'

interface Props {
  children: ReactNode
  fallback?: React.ComponentType<ErrorFallbackProps>
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  resetOnPropsChange?: boolean
  resetKeys?: Array<string | number>
  level?: 'page' | 'component' | 'feature'
  showDetails?: boolean
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorId: string | null
  retryCount: number
  lastResetTime: number
}

interface ErrorFallbackProps {
  error: Error
  errorInfo: ErrorInfo
  resetError: () => void
  retryCount: number
  level: string
}

export class EnhancedErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: number | null = null

  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
      lastResetTime: 0,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: Math.random().toString(36).substr(2, 9),
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, level = 'component' } = this.props
    
    // Create app error object
    const appError: AppError = {
      code: 'REACT_ERROR_BOUNDARY',
      message: error.message,
      details: error.stack || 'No stack trace available',
      timestamp: new Date(),
      context: {
        type: 'react_error_boundary',
        level,
        componentStack: errorInfo.componentStack,
        errorBoundary: this.constructor.name,
        props: this.props,
        state: this.state,
        userAgent: navigator.userAgent,
        url: window.location.href,
      },
      retryable: true,
    }

    // Capture error in bug detection system
    bugDetector.captureError(appError)

    // Update state
    this.setState({
      error,
      errorInfo,
    })

    // Call custom error handler
    onError?.(error, errorInfo)

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by boundary:', error, errorInfo)
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { resetOnPropsChange, resetKeys } = this.props
    const { hasError } = this.state

    // Reset error boundary if props changed and resetOnPropsChange is true
    if (hasError && resetOnPropsChange) {
      if (resetKeys) {
        const hasResetKeyChanged = resetKeys.some(
          (key, index) => prevProps.resetKeys?.[index] !== key
        )
        if (hasResetKeyChanged) {
          this.resetErrorBoundary()
        }
      } else {
        // Reset if any prop changed
        const hasPropsChanged = Object.keys(prevProps).some(
          (key) => prevProps[key as keyof Props] !== this.props[key as keyof Props]
        )
        if (hasPropsChanged) {
          this.resetErrorBoundary()
        }
      }
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId)
    }
  }

  resetErrorBoundary = () => {
    const { retryCount } = this.state
    const now = Date.now()

    // Prevent rapid resets
    if (now - this.state.lastResetTime < 1000) {
      return
    }

    // Limit retry attempts
    if (retryCount >= 3) {
      console.warn('Maximum retry attempts reached for error boundary')
      return
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: retryCount + 1,
      lastResetTime: now,
    })
  }

  render() {
    const { hasError, error, errorInfo, retryCount, level } = this.state
    const { children, fallback: FallbackComponent, showDetails = false } = this.props

    if (hasError && error && errorInfo) {
      if (FallbackComponent) {
        return (
          <FallbackComponent
            error={error}
            errorInfo={errorInfo}
            resetError={this.resetErrorBoundary}
            retryCount={retryCount}
            level={this.props.level || 'component'}
          />
        )
      }

      return (
        <DefaultErrorFallback
          error={error}
          errorInfo={errorInfo}
          resetError={this.resetErrorBoundary}
          retryCount={retryCount}
          level={this.props.level || 'component'}
          showDetails={showDetails}
        />
      )
    }

    return children
  }
}

// Default Error Fallback Component
const DefaultErrorFallback: React.FC<ErrorFallbackProps & { showDetails: boolean }> = ({
  error,
  errorInfo,
  resetError,
  retryCount,
  level,
  showDetails,
}) => {
  const [showErrorDetails, setShowErrorDetails] = React.useState(false)

  const getLevelStyles = () => {
    switch (level) {
      case 'page':
        return 'min-h-screen flex items-center justify-center bg-background'
      case 'feature':
        return 'p-8 bg-muted rounded-lg border'
      default:
        return 'p-4 bg-red-50 border border-red-200 rounded-md'
    }
  }

  const getLevelIcon = () => {
    switch (level) {
      case 'page':
        return '🔧'
      case 'feature':
        return '⚠️'
      default:
        return '❌'
    }
  }

  const getLevelTitle = () => {
    switch (level) {
      case 'page':
        return 'Application Error'
      case 'feature':
        return 'Feature Error'
      default:
        return 'Component Error'
    }
  }

  return (
    <div className={getLevelStyles()}>
      <div className="max-w-md w-full mx-4">
        <div className="text-center space-y-4">
          <div className="text-4xl">{getLevelIcon()}</div>
          
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">
              {getLevelTitle()}
            </h2>
            <p className="text-muted-foreground">
              Something went wrong. We're working to fix it.
            </p>
          </div>

          {retryCount > 0 && (
            <div className="text-sm text-muted-foreground">
              Retry attempt: {retryCount}/3
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={resetError}
              disabled={retryCount >= 3}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Try Again
            </button>
            
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
            >
              Reload Page
            </button>
          </div>

          {(showDetails || process.env.NODE_ENV === 'development') && (
            <div className="mt-6">
              <button
                onClick={() => setShowErrorDetails(!showErrorDetails)}
                className="text-sm text-muted-foreground hover:text-foreground underline"
              >
                {showErrorDetails ? 'Hide' : 'Show'} Error Details
              </button>
              
              {showErrorDetails && (
                <div className="mt-4 text-left bg-muted p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Error Details:</h4>
                  <pre className="text-xs text-muted-foreground overflow-auto">
                    {error.message}
                    {error.stack && `\n\nStack Trace:\n${error.stack}`}
                    {errorInfo.componentStack && `\n\nComponent Stack:\n${errorInfo.componentStack}`}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Feature-level Error Boundary
export const FeatureErrorBoundary: React.FC<{
  children: ReactNode
  feature: string
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}> = ({ children, feature, onError }) => {
  return (
    <EnhancedErrorBoundary
      level="feature"
      onError={(error, errorInfo) => {
        // Add feature context to error
        const appError: AppError = {
          code: 'FEATURE_ERROR',
          message: `Error in ${feature} feature: ${error.message}`,
          details: error.stack || 'No stack trace available',
          timestamp: new Date(),
          context: {
            type: 'feature_error',
            feature,
            originalError: error.message,
            componentStack: errorInfo.componentStack,
          },
          retryable: true,
        }
        
        bugDetector.captureError(appError)
        onError?.(error, errorInfo)
      }}
    >
      {children}
    </EnhancedErrorBoundary>
  )
}

// Page-level Error Boundary
export const PageErrorBoundary: React.FC<{
  children: ReactNode
  page: string
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}> = ({ children, page, onError }) => {
  return (
    <EnhancedErrorBoundary
      level="page"
      onError={(error, errorInfo) => {
        // Add page context to error
        const appError: AppError = {
          code: 'PAGE_ERROR',
          message: `Error on ${page} page: ${error.message}`,
          details: error.stack || 'No stack trace available',
          timestamp: new Date(),
          context: {
            type: 'page_error',
            page,
            originalError: error.message,
            componentStack: errorInfo.componentStack,
          },
          retryable: true,
        }
        
        bugDetector.captureError(appError)
        onError?.(error, errorInfo)
      }}
    >
      {children}
    </EnhancedErrorBoundary>
  )
}

// Component-level Error Boundary
export const ComponentErrorBoundary: React.FC<{
  children: ReactNode
  component: string
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}> = ({ children, component, onError }) => {
  return (
    <EnhancedErrorBoundary
      level="component"
      onError={(error, errorInfo) => {
        // Add component context to error
        const appError: AppError = {
          code: 'COMPONENT_ERROR',
          message: `Error in ${component} component: ${error.message}`,
          details: error.stack || 'No stack trace available',
          timestamp: new Date(),
          context: {
            type: 'component_error',
            component,
            originalError: error.message,
            componentStack: errorInfo.componentStack,
          },
          retryable: true,
        }
        
        bugDetector.captureError(appError)
        onError?.(error, errorInfo)
      }}
    >
      {children}
    </EnhancedErrorBoundary>
  )
}

// Error Recovery Hook
export const useErrorRecovery = () => {
  const [error, setError] = React.useState<Error | null>(null)
  const [retryCount, setRetryCount] = React.useState(0)

  const recover = React.useCallback((recoveryFn: () => void) => {
    try {
      recoveryFn()
      setError(null)
      setRetryCount(0)
    } catch (err) {
      setError(err as Error)
      setRetryCount(prev => prev + 1)
    }
  }, [])

  const reset = React.useCallback(() => {
    setError(null)
    setRetryCount(0)
  }, [])

  return {
    error,
    retryCount,
    recover,
    reset,
    hasError: error !== null,
  }
}

// Error Reporting Hook
export const useErrorReporting = () => {
  const reportError = React.useCallback((error: Error, context?: Record<string, any>) => {
    const appError: AppError = {
      code: 'MANUAL_ERROR_REPORT',
      message: error.message,
      details: error.stack || 'No stack trace available',
      timestamp: new Date(),
      context: {
        type: 'manual_error_report',
        ...context,
      },
      retryable: true,
    }
    
    bugDetector.captureError(appError)
  }, [])

  return { reportError }
}
