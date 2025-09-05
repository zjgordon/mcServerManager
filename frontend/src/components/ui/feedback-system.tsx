import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { cn } from '../../utils/cn'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'

// Types
export interface FeedbackMessage {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
  persistent?: boolean
  actions?: Array<{
    label: string
    action: () => void
    variant?: 'primary' | 'secondary' | 'destructive'
  }>
}

interface FeedbackContextType {
  messages: FeedbackMessage[]
  addMessage: (message: Omit<FeedbackMessage, 'id'>) => void
  removeMessage: (id: string) => void
  clearAll: () => void
}

// Context
const FeedbackContext = createContext<FeedbackContextType | undefined>(undefined)

// Hook
export const useFeedback = () => {
  const context = useContext(FeedbackContext)
  if (!context) {
    throw new Error('useFeedback must be used within a FeedbackProvider')
  }
  return context
}

// Provider
export const FeedbackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<FeedbackMessage[]>([])

  const addMessage = useCallback((message: Omit<FeedbackMessage, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newMessage: FeedbackMessage = {
      id,
      duration: 5000,
      ...message,
    }
    
    setMessages(prev => [...prev, newMessage])
    
    // Auto-remove if not persistent
    if (!newMessage.persistent && newMessage.duration) {
      setTimeout(() => {
        removeMessage(id)
      }, newMessage.duration)
    }
  }, [])

  const removeMessage = useCallback((id: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== id))
  }, [])

  const clearAll = useCallback(() => {
    setMessages([])
  }, [])

  return (
    <FeedbackContext.Provider value={{ messages, addMessage, removeMessage, clearAll }}>
      {children}
      <FeedbackContainer />
    </FeedbackContext.Provider>
  )
}

// Feedback Container
const FeedbackContainer: React.FC = () => {
  const { messages } = useFeedback()

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full">
      {messages.map(message => (
        <FeedbackToast key={message.id} message={message} />
      ))}
    </div>
  )
}

// Individual Toast
const FeedbackToast: React.FC<{ message: FeedbackMessage }> = ({ message }) => {
  const { removeMessage } = useFeedback()
  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 10)
    return () => clearTimeout(timer)
  }, [])

  const handleRemove = useCallback(() => {
    setIsLeaving(true)
    setTimeout(() => removeMessage(message.id), 300)
  }, [message.id, removeMessage])

  const getIcon = () => {
    switch (message.type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />
      default:
        return <Info className="h-5 w-5 text-gray-500" />
    }
  }

  const getVariantStyles = () => {
    switch (message.type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800'
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800'
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800'
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800'
    }
  }

  return (
    <div
      className={cn(
        'relative p-4 rounded-lg border shadow-lg backdrop-blur-sm transition-all duration-300',
        getVariantStyles(),
        isVisible && !isLeaving ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0',
        isLeaving && 'translate-x-full opacity-0'
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold">
            {message.title}
          </h4>
          {message.message && (
            <p className="text-sm mt-1 opacity-90">
              {message.message}
            </p>
          )}
          
          {message.actions && message.actions.length > 0 && (
            <div className="flex gap-2 mt-3">
              {message.actions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.action}
                  className={cn(
                    'px-3 py-1 text-xs font-medium rounded-md transition-colors',
                    action.variant === 'primary' && 'bg-primary text-primary-foreground hover:bg-primary/90',
                    action.variant === 'secondary' && 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
                    action.variant === 'destructive' && 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
                    !action.variant && 'bg-white/20 hover:bg-white/30'
                  )}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {!message.persistent && (
          <button
            onClick={handleRemove}
            className="flex-shrink-0 p-1 rounded-md hover:bg-white/20 transition-colors"
            aria-label="Close notification"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}

// Progress Bar for Loading States
export const FeedbackProgress: React.FC<{
  progress: number
  message?: string
  variant?: 'default' | 'success' | 'error' | 'warning'
}> = ({ progress, message, variant = 'default' }) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return 'bg-green-500'
      case 'error':
        return 'bg-red-500'
      case 'warning':
        return 'bg-yellow-500'
      default:
        return 'bg-primary'
    }
  }

  return (
    <div className="w-full">
      {message && (
        <div className="flex justify-between text-sm mb-2">
          <span>{message}</span>
          <span>{Math.round(progress)}%</span>
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          className={cn(
            'h-full transition-all duration-300 ease-out',
            getVariantStyles()
          )}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  )
}

// Loading Spinner
export const FeedbackSpinner: React.FC<{
  size?: 'sm' | 'md' | 'lg'
  message?: string
  variant?: 'default' | 'primary' | 'secondary'
}> = ({ size = 'md', message, variant = 'default' }) => {
  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'h-4 w-4'
      case 'lg':
        return 'h-8 w-8'
      default:
        return 'h-6 w-6'
    }
  }

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'border-primary border-t-transparent'
      case 'secondary':
        return 'border-secondary border-t-transparent'
      default:
        return 'border-current border-t-transparent'
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          'animate-spin rounded-full border-2',
          getSizeStyles(),
          getVariantStyles()
        )}
      />
      {message && <span className="text-sm">{message}</span>}
    </div>
  )
}

// Success/Error States
export const FeedbackState: React.FC<{
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  icon?: React.ReactNode
  actions?: React.ReactNode
}> = ({ type, title, message, icon, actions }) => {
  const getIcon = () => {
    if (icon) return icon
    
    switch (type) {
      case 'success':
        return <CheckCircle className="h-8 w-8 text-green-500" />
      case 'error':
        return <AlertCircle className="h-8 w-8 text-red-500" />
      case 'warning':
        return <AlertTriangle className="h-8 w-8 text-yellow-500" />
      case 'info':
        return <Info className="h-8 w-8 text-blue-500" />
      default:
        return <Info className="h-8 w-8 text-gray-500" />
    }
  }

  const getVariantStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800'
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800'
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800'
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800'
    }
  }

  return (
    <div className={cn(
      'p-6 rounded-lg border text-center',
      getVariantStyles()
    )}>
      <div className="flex justify-center mb-4">
        {getIcon()}
      </div>
      <h3 className="text-lg font-semibold mb-2">
        {title}
      </h3>
      {message && (
        <p className="text-sm opacity-90 mb-4">
          {message}
        </p>
      )}
      {actions && (
        <div className="flex justify-center gap-2">
          {actions}
        </div>
      )}
    </div>
  )
}
