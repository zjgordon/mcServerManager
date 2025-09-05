import React, { forwardRef, useState, useRef, useEffect } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import { useAnimation, animationPresets, useReducedMotion } from '../../utils/animations';
import { 
  Eye, 
  EyeOff, 
  Search, 
  X, 
  Check, 
  AlertTriangle, 
  Info,
  Loader2,
  Copy,
  CheckCircle
} from 'lucide-react';

// Enhanced input variants
const enhancedInputVariants = cva(
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200',
  {
    variants: {
      variant: {
        default: 'hover:border-primary/50 focus:border-primary',
        filled: 'bg-muted border-muted hover:bg-muted/80 focus:bg-background',
        outlined: 'border-2 hover:border-primary/50 focus:border-primary',
        ghost: 'border-transparent bg-transparent hover:bg-muted focus:bg-background focus:border-primary',
        minecraft: 'border-minecraft-brown bg-minecraft-green/10 hover:bg-minecraft-green/20 focus:bg-minecraft-green/30 focus:border-minecraft-green',
      },
      size: {
        sm: 'h-8 px-2 text-xs',
        default: 'h-10 px-3 text-sm',
        lg: 'h-12 px-4 text-base',
      },
      state: {
        default: '',
        error: 'border-destructive focus-visible:ring-destructive',
        success: 'border-green-500 focus-visible:ring-green-500',
        warning: 'border-yellow-500 focus-visible:ring-yellow-500',
        loading: 'border-primary/50',
      },
      animated: {
        true: 'animate-fade-in',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      state: 'default',
      animated: false,
    },
  }
);

export interface EnhancedInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof enhancedInputVariants> {
  label?: string;
  description?: string;
  error?: string;
  success?: string;
  warning?: string;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  clearable?: boolean;
  onClear?: () => void;
  copyable?: boolean;
  onCopy?: (value: string) => void;
  showPasswordToggle?: boolean;
  searchable?: boolean;
  onSearch?: (value: string) => void;
  suggestions?: string[];
  onSuggestionSelect?: (suggestion: string) => void;
  animated?: boolean;
  floatingLabel?: boolean;
  characterCount?: boolean;
  maxLength?: number;
  tooltip?: string;
  prefix?: string;
  suffix?: string;
}

const EnhancedInput = forwardRef<HTMLInputElement, EnhancedInputProps>(
  (
    {
      className,
      variant,
      size,
      state,
      animated,
      label,
      description,
      error,
      success,
      warning,
      loading = false,
      icon,
      iconPosition = 'left',
      clearable = false,
      onClear,
      copyable = false,
      onCopy,
      showPasswordToggle = false,
      searchable = false,
      onSearch,
      suggestions = [],
      onSuggestionSelect,
      floatingLabel = false,
      characterCount = false,
      maxLength,
      tooltip,
      prefix,
      suffix,
      type = 'text',
      value,
      onChange,
      onFocus,
      onBlur,
      ...props
    },
    ref
  ) => {
    const [inputType, setInputType] = useState(type);
    const [isFocused, setIsFocused] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [copied, setCopied] = useState(false);
    const [inputValue, setInputValue] = useState(value || '');
    const inputRef = useRef<HTMLInputElement>(null);
    const suggestionsRef = useRef<HTMLDivElement>(null);
    const reducedMotion = useReducedMotion();

    // Combine refs
    const combinedRef = (node: HTMLInputElement) => {
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
      inputRef.current = node;
    };

    // Animation setup
    const { ref: animationRef } = useAnimation(
      animated ? animationPresets.formError : { type: 'fade-in', trigger: 'load' }
    );

    // Determine current state
    const currentState = error ? 'error' : success ? 'success' : warning ? 'warning' : loading ? 'loading' : state;

    // Handle input changes
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);
      onChange?.(e);
      
      if (searchable && onSearch) {
        onSearch(newValue);
      }
    };

    // Handle focus
    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      setShowSuggestions(suggestions.length > 0);
      onFocus?.(e);
    };

    // Handle blur
    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      // Delay hiding suggestions to allow clicking on them
      setTimeout(() => setShowSuggestions(false), 200);
      onBlur?.(e);
    };

    // Handle clear
    const handleClear = () => {
      setInputValue('');
      onClear?.();
      inputRef.current?.focus();
    };

    // Handle copy
    const handleCopy = async () => {
      if (inputValue && onCopy) {
        await navigator.clipboard.writeText(inputValue);
        setCopied(true);
        onCopy(inputValue);
        setTimeout(() => setCopied(false), 2000);
      }
    };

    // Handle password toggle
    const togglePasswordVisibility = () => {
      setInputType(inputType === 'password' ? 'text' : 'password');
    };

    // Handle suggestion select
    const handleSuggestionSelect = (suggestion: string) => {
      setInputValue(suggestion);
      onSuggestionSelect?.(suggestion);
      setShowSuggestions(false);
      inputRef.current?.focus();
    };

    // Get status icon
    const getStatusIcon = () => {
      if (loading) return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      if (error) return <AlertTriangle className="h-4 w-4 text-destructive" />;
      if (success) return <CheckCircle className="h-4 w-4 text-green-500" />;
      if (warning) return <Info className="h-4 w-4 text-yellow-500" />;
      return null;
    };

    // Get status message
    const getStatusMessage = () => {
      if (error) return error;
      if (success) return success;
      if (warning) return warning;
      return description;
    };

    const currentLength = inputValue.toString().length;
    const isOverLimit = maxLength && currentLength > maxLength;

    return (
      <div className="space-y-2">
        {/* Label */}
        {label && (
          <label className={cn(
            'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
            floatingLabel && 'absolute left-3 top-2 text-xs text-muted-foreground transition-all duration-200',
            floatingLabel && (isFocused || inputValue) && 'top-0 left-2 bg-background px-1 text-primary'
          )}>
            {label}
          </label>
        )}

        {/* Input container */}
        <div className="relative">
          {/* Prefix */}
          {prefix && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
              {prefix}
            </div>
          )}

          {/* Left icon */}
          {icon && iconPosition === 'left' && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {icon}
            </div>
          )}

          {/* Search icon */}
          {searchable && !icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <Search className="h-4 w-4" />
            </div>
          )}

          {/* Input */}
          <input
            ref={(node) => {
              combinedRef(node);
              if (animated) {
                animationRef(node);
              }
            }}
            type={inputType}
            value={inputValue}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className={cn(
              enhancedInputVariants({
                variant,
                size,
                state: currentState,
                animated: false, // Handled separately
                className,
              }),
              prefix && 'pl-8',
              suffix && 'pr-8',
              icon && iconPosition === 'left' && 'pl-10',
              icon && iconPosition === 'right' && 'pr-10',
              searchable && !icon && 'pl-10',
              (clearable || copyable || showPasswordToggle || getStatusIcon()) && 'pr-20',
              floatingLabel && 'pt-6',
              isOverLimit && 'border-destructive focus-visible:ring-destructive'
            )}
            maxLength={maxLength}
            title={tooltip}
            {...props}
          />

          {/* Right side icons */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {/* Status icon */}
            {getStatusIcon()}

            {/* Clear button */}
            {clearable && inputValue && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 hover:bg-muted rounded-full transition-colors"
              >
                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
              </button>
            )}

            {/* Copy button */}
            {copyable && inputValue && (
              <button
                type="button"
                onClick={handleCopy}
                className="p-1 hover:bg-muted rounded-full transition-colors"
                title={copied ? 'Copied!' : 'Copy to clipboard'}
              >
                {copied ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                )}
              </button>
            )}

            {/* Password toggle */}
            {showPasswordToggle && (
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="p-1 hover:bg-muted rounded-full transition-colors"
              >
                {inputType === 'password' ? (
                  <Eye className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                ) : (
                  <EyeOff className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                )}
              </button>
            )}

            {/* Right icon */}
            {icon && iconPosition === 'right' && (
              <div className="text-muted-foreground">
                {icon}
              </div>
            )}
          </div>

          {/* Suffix */}
          {suffix && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
              {suffix}
            </div>
          )}

          {/* Suggestions dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto"
            >
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSuggestionSelect(suggestion)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors first:rounded-t-md last:rounded-b-md"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Status message and character count */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            {getStatusMessage() && (
              <span className={cn(
                'transition-colors duration-200',
                error && 'text-destructive',
                success && 'text-green-600',
                warning && 'text-yellow-600',
                !error && !success && !warning && 'text-muted-foreground'
              )}>
                {getStatusMessage()}
              </span>
            )}
          </div>

          {characterCount && maxLength && (
            <span className={cn(
              'text-muted-foreground',
              isOverLimit && 'text-destructive'
            )}>
              {currentLength}/{maxLength}
            </span>
          )}
        </div>
      </div>
    );
  }
);

EnhancedInput.displayName = 'EnhancedInput';

export { EnhancedInput, enhancedInputVariants };
