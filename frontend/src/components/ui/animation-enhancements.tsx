import React from 'react'
import { cn } from '../../utils/cn'

// Animation Variants
export const animationVariants = {
  // Fade animations
  fadeIn: 'animate-fade-in',
  fadeOut: 'animate-fade-out',
  fadeInUp: 'animate-fade-in-up',
  fadeInDown: 'animate-fade-in-down',
  fadeInLeft: 'animate-fade-in-left',
  fadeInRight: 'animate-fade-in-right',
  
  // Scale animations
  scaleIn: 'animate-scale-in',
  scaleOut: 'animate-scale-out',
  scaleInUp: 'animate-scale-in-up',
  scaleInDown: 'animate-scale-in-down',
  
  // Slide animations
  slideInUp: 'animate-slide-in-up',
  slideInDown: 'animate-slide-in-down',
  slideInLeft: 'animate-slide-in-left',
  slideInRight: 'animate-slide-in-right',
  
  // Bounce animations
  bounce: 'animate-bounce',
  bounceIn: 'animate-bounce-in',
  bounceOut: 'animate-bounce-out',
  
  // Rotate animations
  rotate: 'animate-spin',
  rotateIn: 'animate-rotate-in',
  rotateOut: 'animate-rotate-out',
  
  // Pulse animations
  pulse: 'animate-pulse',
  ping: 'animate-ping',
  
  // Custom animations
  wiggle: 'animate-wiggle',
  shake: 'animate-shake',
  glow: 'animate-glow',
  float: 'animate-float',
}

// Animation Durations
export const animationDurations = {
  fast: 'duration-150',
  normal: 'duration-300',
  slow: 'duration-500',
  slower: 'duration-700',
  slowest: 'duration-1000',
}

// Animation Delays
export const animationDelays = {
  none: 'delay-0',
  fast: 'delay-75',
  normal: 'delay-150',
  slow: 'delay-300',
  slower: 'delay-500',
}

// Animation Easing
export const animationEasing = {
  linear: 'ease-linear',
  in: 'ease-in',
  out: 'ease-out',
  inOut: 'ease-in-out',
  bounce: 'ease-bounce',
  elastic: 'ease-elastic',
}

// Animated Container
export const AnimatedContainer: React.FC<{
  children: React.ReactNode
  animation?: keyof typeof animationVariants
  duration?: keyof typeof animationDurations
  delay?: keyof typeof animationDelays
  easing?: keyof typeof animationEasing
  trigger?: 'hover' | 'focus' | 'click' | 'always'
  className?: string
  onAnimationStart?: () => void
  onAnimationEnd?: () => void
}> = ({ 
  children, 
  animation = 'fadeIn',
  duration = 'normal',
  delay = 'none',
  easing = 'ease-out',
  trigger = 'always',
  className,
  onAnimationStart,
  onAnimationEnd
}) => {
  const [isAnimated, setIsAnimated] = React.useState(trigger === 'always')

  const handleMouseEnter = () => {
    if (trigger === 'hover') {
      setIsAnimated(true)
      onAnimationStart?.()
    }
  }

  const handleMouseLeave = () => {
    if (trigger === 'hover') {
      setIsAnimated(false)
      onAnimationEnd?.()
    }
  }

  const handleFocus = () => {
    if (trigger === 'focus') {
      setIsAnimated(true)
      onAnimationStart?.()
    }
  }

  const handleBlur = () => {
    if (trigger === 'focus') {
      setIsAnimated(false)
      onAnimationEnd?.()
    }
  }

  const handleClick = () => {
    if (trigger === 'click') {
      setIsAnimated(!isAnimated)
      if (isAnimated) {
        onAnimationEnd?.()
      } else {
        onAnimationStart?.()
      }
    }
  }

  React.useEffect(() => {
    if (trigger === 'always') {
      onAnimationStart?.()
    }
  }, [trigger, onAnimationStart])

  return (
    <div
      className={cn(
        'transition-all',
        animationDurations[duration],
        animationDelays[delay],
        animationEasing[easing],
        isAnimated && animationVariants[animation],
        className
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onClick={handleClick}
    >
      {children}
    </div>
  )
}

// Staggered Animation Container
export const StaggeredContainer: React.FC<{
  children: React.ReactNode
  staggerDelay?: number
  animation?: keyof typeof animationVariants
  duration?: keyof typeof animationDurations
  className?: string
}> = ({ 
  children, 
  staggerDelay = 100,
  animation = 'fadeInUp',
  duration = 'normal',
  className 
}) => {
  const childrenArray = React.Children.toArray(children)

  return (
    <div className={cn('space-y-4', className)}>
      {childrenArray.map((child, index) => (
        <AnimatedContainer
          key={index}
          animation={animation}
          duration={duration}
          delay={index * staggerDelay < 1000 ? 'none' : 'none'}
          className="transition-all"
          style={{
            animationDelay: `${index * staggerDelay}ms`
          }}
        >
          {child}
        </AnimatedContainer>
      ))}
    </div>
  )
}

// Hover Animation
export const HoverAnimation: React.FC<{
  children: React.ReactNode
  effect?: 'lift' | 'scale' | 'rotate' | 'glow' | 'shrink' | 'grow'
  intensity?: 'subtle' | 'normal' | 'strong'
  className?: string
}> = ({ 
  children, 
  effect = 'lift',
  intensity = 'normal',
  className 
}) => {
  const getEffectStyles = () => {
    const intensityMap = {
      subtle: {
        lift: 'hover:-translate-y-0.5',
        scale: 'hover:scale-102',
        rotate: 'hover:rotate-1',
        glow: 'hover:shadow-md',
        shrink: 'hover:scale-98',
        grow: 'hover:scale-102',
      },
      normal: {
        lift: 'hover:-translate-y-1',
        scale: 'hover:scale-105',
        rotate: 'hover:rotate-3',
        glow: 'hover:shadow-lg',
        shrink: 'hover:scale-95',
        grow: 'hover:scale-105',
      },
      strong: {
        lift: 'hover:-translate-y-2',
        scale: 'hover:scale-110',
        rotate: 'hover:rotate-6',
        glow: 'hover:shadow-xl',
        shrink: 'hover:scale-90',
        grow: 'hover:scale-110',
      },
    }

    return intensityMap[intensity][effect]
  }

  return (
    <div
      className={cn(
        'transition-all duration-200 ease-out',
        getEffectStyles(),
        className
      )}
    >
      {children}
    </div>
  )
}

// Loading Animation
export const LoadingAnimation: React.FC<{
  type?: 'spinner' | 'dots' | 'pulse' | 'wave' | 'bounce'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  color?: 'primary' | 'secondary' | 'muted' | 'accent'
  className?: string
}> = ({ 
  type = 'spinner',
  size = 'md',
  color = 'primary',
  className 
}) => {
  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'h-4 w-4'
      case 'md':
        return 'h-6 w-6'
      case 'lg':
        return 'h-8 w-8'
      case 'xl':
        return 'h-12 w-12'
      default:
        return 'h-6 w-6'
    }
  }

  const getColorStyles = () => {
    switch (color) {
      case 'primary':
        return 'text-primary'
      case 'secondary':
        return 'text-secondary'
      case 'muted':
        return 'text-muted-foreground'
      case 'accent':
        return 'text-accent'
      default:
        return 'text-primary'
    }
  }

  const renderSpinner = () => (
    <div className={cn('animate-spin rounded-full border-2 border-current border-t-transparent', getSizeStyles(), getColorStyles())} />
  )

  const renderDots = () => (
    <div className="flex space-x-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn(
            'rounded-full animate-bounce',
            getColorStyles(),
            size === 'sm' ? 'h-1 w-1' : size === 'md' ? 'h-2 w-2' : size === 'lg' ? 'h-3 w-3' : 'h-4 w-4'
          )}
          style={{ animationDelay: `${i * 0.1}s` }}
        />
      ))}
    </div>
  )

  const renderPulse = () => (
    <div className={cn('rounded-full animate-pulse bg-current', getSizeStyles(), getColorStyles())} />
  )

  const renderWave = () => (
    <div className="flex space-x-1">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={cn(
            'bg-current animate-pulse',
            getColorStyles(),
            size === 'sm' ? 'h-2 w-0.5' : size === 'md' ? 'h-3 w-1' : size === 'lg' ? 'h-4 w-1' : 'h-6 w-2'
          )}
          style={{ animationDelay: `${i * 0.1}s` }}
        />
      ))}
    </div>
  )

  const renderBounce = () => (
    <div className={cn('animate-bounce', getSizeStyles(), getColorStyles())}>
      <div className="w-full h-full bg-current rounded-full" />
    </div>
  )

  const renderAnimation = () => {
    switch (type) {
      case 'spinner':
        return renderSpinner()
      case 'dots':
        return renderDots()
      case 'pulse':
        return renderPulse()
      case 'wave':
        return renderWave()
      case 'bounce':
        return renderBounce()
      default:
        return renderSpinner()
    }
  }

  return (
    <div className={cn('flex items-center justify-center', className)}>
      {renderAnimation()}
    </div>
  )
}

// Progress Animation
export const ProgressAnimation: React.FC<{
  progress: number
  animated?: boolean
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}> = ({ 
  progress, 
  animated = true,
  color = 'primary',
  size = 'md',
  className 
}) => {
  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'h-1'
      case 'md':
        return 'h-2'
      case 'lg':
        return 'h-3'
      default:
        return 'h-2'
    }
  }

  const getColorStyles = () => {
    switch (color) {
      case 'primary':
        return 'bg-primary'
      case 'secondary':
        return 'bg-secondary'
      case 'success':
        return 'bg-green-500'
      case 'warning':
        return 'bg-yellow-500'
      case 'error':
        return 'bg-red-500'
      default:
        return 'bg-primary'
    }
  }

  return (
    <div className={cn('w-full bg-muted rounded-full overflow-hidden', getSizeStyles(), className)}>
      <div
        className={cn(
          'h-full transition-all duration-500 ease-out',
          getColorStyles(),
          animated && 'animate-pulse'
        )}
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>
  )
}

// Ripple Effect
export const RippleEffect: React.FC<{
  children: React.ReactNode
  color?: 'primary' | 'secondary' | 'accent'
  duration?: number
  className?: string
}> = ({ 
  children, 
  color = 'primary',
  duration = 600,
  className 
}) => {
  const [ripples, setRipples] = React.useState<Array<{ id: number; x: number; y: number }>>([])

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    const newRipple = {
      id: Date.now(),
      x,
      y,
    }
    
    setRipples(prev => [...prev, newRipple])
    
    setTimeout(() => {
      setRipples(prev => prev.filter(ripple => ripple.id !== newRipple.id))
    }, duration)
  }

  const getColorStyles = () => {
    switch (color) {
      case 'primary':
        return 'bg-primary/30'
      case 'secondary':
        return 'bg-secondary/30'
      case 'accent':
        return 'bg-accent/30'
      default:
        return 'bg-primary/30'
    }
  }

  return (
    <div
      className={cn('relative overflow-hidden', className)}
      onClick={handleClick}
    >
      {children}
      {ripples.map(ripple => (
        <div
          key={ripple.id}
          className={cn(
            'absolute rounded-full animate-ping pointer-events-none',
            getColorStyles()
          )}
          style={{
            left: ripple.x - 4,
            top: ripple.y - 4,
            width: 8,
            height: 8,
            animationDuration: `${duration}ms`,
          }}
        />
      ))}
    </div>
  )
}

// Parallax Effect
export const ParallaxEffect: React.FC<{
  children: React.ReactNode
  speed?: number
  direction?: 'up' | 'down' | 'left' | 'right'
  className?: string
}> = ({ 
  children, 
  speed = 0.5,
  direction = 'up',
  className 
}) => {
  const [offset, setOffset] = React.useState(0)

  React.useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.pageYOffset
      setOffset(scrolled * speed)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [speed])

  const getTransform = () => {
    switch (direction) {
      case 'up':
        return `translateY(${offset}px)`
      case 'down':
        return `translateY(${-offset}px)`
      case 'left':
        return `translateX(${offset}px)`
      case 'right':
        return `translateX(${-offset}px)`
      default:
        return `translateY(${offset}px)`
    }
  }

  return (
    <div
      className={cn('transition-transform duration-100', className)}
      style={{ transform: getTransform() }}
    >
      {children}
    </div>
  )
}

// Typewriter Effect
export const TypewriterEffect: React.FC<{
  text: string
  speed?: number
  delay?: number
  className?: string
  onComplete?: () => void
}> = ({ 
  text, 
  speed = 100,
  delay = 0,
  className,
  onComplete 
}) => {
  const [displayedText, setDisplayedText] = React.useState('')
  const [currentIndex, setCurrentIndex] = React.useState(0)

  React.useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex])
        setCurrentIndex(prev => prev + 1)
      }, currentIndex === 0 ? delay : speed)

      return () => clearTimeout(timeout)
    } else {
      onComplete?.()
    }
  }, [currentIndex, text, speed, delay, onComplete])

  return (
    <span className={cn('inline-block', className)}>
      {displayedText}
      <span className="animate-pulse">|</span>
    </span>
  )
}
