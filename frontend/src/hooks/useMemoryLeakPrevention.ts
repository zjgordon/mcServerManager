import { useEffect, useRef, useCallback } from 'react'
import { memoryLeakDetector } from '../utils/bug-detection'

// Memory Leak Prevention Hook
export const useMemoryLeakPrevention = (componentId: string) => {
  const componentRef = useRef<any>(null)
  const cleanupFunctions = useRef<Set<() => void>>(new Set())
  const intervals = useRef<Set<number>>(new Set())
  const timeouts = useRef<Set<number>>(new Set())
  const eventListeners = useRef<Set<{ element: EventTarget; event: string; handler: EventListener }>>(new Set())

  // Register component
  useEffect(() => {
    memoryLeakDetector.registerComponent(componentId, componentRef.current)
    
    return () => {
      memoryLeakDetector.cleanupComponent(componentId)
    }
  }, [componentId])

  // Cleanup function
  const cleanup = useCallback(() => {
    // Clear intervals
    intervals.current.forEach(id => clearInterval(id))
    intervals.current.clear()
    
    // Clear timeouts
    timeouts.current.forEach(id => clearTimeout(id))
    timeouts.current.clear()
    
    // Remove event listeners
    eventListeners.current.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler)
    })
    eventListeners.current.clear()
    
    // Run cleanup functions
    cleanupFunctions.current.forEach(fn => fn())
    cleanupFunctions.current.clear()
  }, [])

  // Register cleanup function
  const registerCleanup = useCallback((fn: () => void) => {
    cleanupFunctions.current.add(fn)
    memoryLeakDetector.registerEventListener(componentId, fn)
  }, [componentId])

  // Register interval
  const registerInterval = useCallback((callback: () => void, delay: number) => {
    const id = setInterval(callback, delay)
    intervals.current.add(id)
    memoryLeakDetector.registerInterval(componentId, id)
    return id
  }, [componentId])

  // Register timeout
  const registerTimeout = useCallback((callback: () => void, delay: number) => {
    const id = setTimeout(callback, delay)
    timeouts.current.add(id)
    memoryLeakDetector.registerTimeout(componentId, id)
    return id
  }, [componentId])

  // Register event listener
  const registerEventListener = useCallback((
    element: EventTarget,
    event: string,
    handler: EventListener
  ) => {
    element.addEventListener(event, handler)
    eventListeners.current.add({ element, event, handler })
    
    // Register cleanup
    const cleanup = () => element.removeEventListener(event, handler)
    memoryLeakDetector.registerEventListener(componentId, cleanup)
  }, [componentId])

  // Cleanup on unmount
  useEffect(() => {
    return cleanup
  }, [cleanup])

  return {
    registerCleanup,
    registerInterval,
    registerTimeout,
    registerEventListener,
    cleanup,
  }
}

// Safe Interval Hook
export const useSafeInterval = (callback: () => void, delay: number | null, componentId: string) => {
  const { registerInterval } = useMemoryLeakPrevention(componentId)
  const intervalRef = useRef<number | null>(null)

  useEffect(() => {
    if (delay !== null) {
      intervalRef.current = registerInterval(callback, delay)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [callback, delay, registerInterval])
}

// Safe Timeout Hook
export const useSafeTimeout = (callback: () => void, delay: number | null, componentId: string) => {
  const { registerTimeout } = useMemoryLeakPrevention(componentId)
  const timeoutRef = useRef<number | null>(null)

  useEffect(() => {
    if (delay !== null) {
      timeoutRef.current = registerTimeout(callback, delay)
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [callback, delay, registerTimeout])
}

// Safe Event Listener Hook
export const useSafeEventListener = <T extends EventTarget>(
  element: T | null,
  event: string,
  handler: EventListener,
  componentId: string
) => {
  const { registerEventListener } = useMemoryLeakPrevention(componentId)

  useEffect(() => {
    if (element) {
      registerEventListener(element, event, handler)
    }
  }, [element, event, handler, registerEventListener])
}

// Safe Async Effect Hook
export const useSafeAsyncEffect = (
  effect: () => Promise<void | (() => void)>,
  deps: React.DependencyList,
  componentId: string
) => {
  const { registerCleanup } = useMemoryLeakPrevention(componentId)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true

    const runEffect = async () => {
      try {
        const cleanup = await effect()
        if (cleanup && isMountedRef.current) {
          registerCleanup(cleanup)
        }
      } catch (error) {
        if (isMountedRef.current) {
          console.error('Async effect error:', error)
        }
      }
    }

    runEffect()

    return () => {
      isMountedRef.current = false
    }
  }, deps)
}

// Safe Promise Hook
export const useSafePromise = <T>(
  promiseFactory: () => Promise<T>,
  deps: React.DependencyList,
  componentId: string
) => {
  const [data, setData] = React.useState<T | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<Error | null>(null)
  const { registerCleanup } = useMemoryLeakPrevention(componentId)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    setLoading(true)
    setError(null)

    const runPromise = async () => {
      try {
        const result = await promiseFactory()
        if (isMountedRef.current) {
          setData(result)
          setLoading(false)
        }
      } catch (err) {
        if (isMountedRef.current) {
          setError(err as Error)
          setLoading(false)
        }
      }
    }

    runPromise()

    return () => {
      isMountedRef.current = false
    }
  }, deps)

  return { data, loading, error }
}

// Safe WebSocket Hook
export const useSafeWebSocket = (
  url: string | null,
  componentId: string
) => {
  const [socket, setSocket] = React.useState<WebSocket | null>(null)
  const [readyState, setReadyState] = React.useState<number>(WebSocket.CLOSED)
  const { registerCleanup, registerEventListener } = useMemoryLeakPrevention(componentId)

  useEffect(() => {
    if (url) {
      const ws = new WebSocket(url)
      setSocket(ws)
      setReadyState(ws.readyState)

      const handleOpen = () => setReadyState(ws.readyState)
      const handleClose = () => setReadyState(ws.readyState)
      const handleError = () => setReadyState(ws.readyState)

      registerEventListener(ws, 'open', handleOpen)
      registerEventListener(ws, 'close', handleClose)
      registerEventListener(ws, 'error', handleError)

      registerCleanup(() => {
        ws.close()
      })

      return () => {
        ws.close()
      }
    }
  }, [url, registerCleanup, registerEventListener])

  const send = useCallback((data: string | ArrayBufferLike | Blob | ArrayBufferView) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(data)
    }
  }, [socket])

  return { socket, readyState, send }
}

// Safe Intersection Observer Hook
export const useSafeIntersectionObserver = (
  element: Element | null,
  options: IntersectionObserverInit,
  componentId: string
) => {
  const [isIntersecting, setIsIntersecting] = React.useState(false)
  const { registerCleanup } = useMemoryLeakPrevention(componentId)

  useEffect(() => {
    if (element && 'IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          setIsIntersecting(entry.isIntersecting)
        },
        options
      )

      observer.observe(element)

      registerCleanup(() => {
        observer.disconnect()
      })

      return () => {
        observer.disconnect()
      }
    }
  }, [element, options, registerCleanup])

  return isIntersecting
}

// Safe Resize Observer Hook
export const useSafeResizeObserver = (
  element: Element | null,
  componentId: string
) => {
  const [size, setSize] = React.useState<{ width: number; height: number } | null>(null)
  const { registerCleanup } = useMemoryLeakPrevention(componentId)

  useEffect(() => {
    if (element && 'ResizeObserver' in window) {
      const observer = new ResizeObserver(([entry]) => {
        const { width, height } = entry.contentRect
        setSize({ width, height })
      })

      observer.observe(element)

      registerCleanup(() => {
        observer.disconnect()
      })

      return () => {
        observer.disconnect()
      }
    }
  }, [element, registerCleanup])

  return size
}

// Safe Mutation Observer Hook
export const useSafeMutationObserver = (
  element: Element | null,
  options: MutationObserverInit,
  componentId: string
) => {
  const [mutations, setMutations] = React.useState<MutationRecord[]>([])
  const { registerCleanup } = useMemoryLeakPrevention(componentId)

  useEffect(() => {
    if (element && 'MutationObserver' in window) {
      const observer = new MutationObserver((records) => {
        setMutations(records)
      })

      observer.observe(element, options)

      registerCleanup(() => {
        observer.disconnect()
      })

      return () => {
        observer.disconnect()
      }
    }
  }, [element, options, registerCleanup])

  return mutations
}

// Safe Storage Hook
export const useSafeStorage = (key: string, defaultValue: any, componentId: string) => {
  const [value, setValue] = React.useState(() => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch {
      return defaultValue
    }
  })

  const setStoredValue = useCallback((newValue: any) => {
    try {
      setValue(newValue)
      localStorage.setItem(key, JSON.stringify(newValue))
    } catch (error) {
      console.error('Failed to save to localStorage:', error)
    }
  }, [key])

  const { registerCleanup } = useMemoryLeakPrevention(componentId)

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setValue(JSON.parse(e.newValue))
        } catch {
          setValue(defaultValue)
        }
      }
    }

    registerCleanup(() => {
      window.removeEventListener('storage', handleStorageChange)
    })

    window.addEventListener('storage', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [key, defaultValue, registerCleanup])

  return [value, setStoredValue]
}

// Memory Usage Monitor Hook
export const useMemoryUsage = (componentId: string) => {
  const [memoryUsage, setMemoryUsage] = React.useState<{
    used: number
    total: number
    limit: number
  } | null>(null)

  const { registerInterval } = useMemoryLeakPrevention(componentId)

  useEffect(() => {
    if ('memory' in performance) {
      const updateMemoryUsage = () => {
        const memory = (performance as any).memory
        setMemoryUsage({
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit,
        })
      }

      updateMemoryUsage()
      registerInterval(updateMemoryUsage, 5000) // Update every 5 seconds
    }
  }, [registerInterval])

  return memoryUsage
}
