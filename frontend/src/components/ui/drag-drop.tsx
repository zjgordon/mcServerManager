import React, { useState, useRef, useCallback, useEffect } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import { useAnimation, animationPresets, useReducedMotion } from '../../utils/animations';
import { 
  GripVertical, 
  Plus, 
  Trash2, 
  Copy, 
  Move,
  Check,
  X,
  AlertTriangle
} from 'lucide-react';

// Drag and drop variants
const dragDropVariants = cva(
  'relative transition-all duration-200',
  {
    variants: {
      variant: {
        default: 'border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50',
        active: 'border-primary bg-primary/5',
        error: 'border-destructive bg-destructive/5',
        success: 'border-green-500 bg-green-50',
        minecraft: 'border-minecraft-brown bg-minecraft-green/10 hover:bg-minecraft-green/20',
      },
      size: {
        sm: 'p-4',
        default: 'p-6',
        lg: 'p-8',
        xl: 'p-12',
      },
      state: {
        idle: '',
        dragging: 'scale-105 shadow-lg',
        dragOver: 'scale-102 bg-primary/10',
        error: 'animate-wiggle',
        success: 'animate-scale-in',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      state: 'idle',
    },
  }
);

export interface DragDropItem {
  id: string;
  content: React.ReactNode;
  data?: any;
  disabled?: boolean;
  draggable?: boolean;
}

export interface DragDropProps extends VariantProps<typeof dragDropVariants> {
  items: DragDropItem[];
  onReorder?: (items: DragDropItem[]) => void;
  onAdd?: (item: DragDropItem) => void;
  onRemove?: (itemId: string) => void;
  onDuplicate?: (item: DragDropItem) => void;
  onMove?: (itemId: string, targetId: string) => void;
  acceptFiles?: boolean;
  acceptedFileTypes?: string[];
  onFileDrop?: (files: File[]) => void;
  maxItems?: number;
  minItems?: number;
  allowReorder?: boolean;
  allowAdd?: boolean;
  allowRemove?: boolean;
  allowDuplicate?: boolean;
  className?: string;
  placeholder?: string;
  emptyMessage?: string;
  loading?: boolean;
  error?: string;
  success?: string;
  animated?: boolean;
  children?: React.ReactNode;
}

const DragDrop: React.FC<DragDropProps> = ({
  items,
  onReorder,
  onAdd,
  onRemove,
  onDuplicate,
  onMove,
  acceptFiles = false,
  acceptedFileTypes = [],
  onFileDrop,
  maxItems,
  minItems = 0,
  allowReorder = true,
  allowAdd = true,
  allowRemove = true,
  allowDuplicate = true,
  className,
  placeholder = 'Drag and drop items here',
  emptyMessage = 'No items to display',
  loading = false,
  error,
  success,
  animated = true,
  children,
  ...props
}) => {
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragState, setDragState] = useState<'idle' | 'dragging' | 'dragOver' | 'error' | 'success'>('idle');
  const [fileDragOver, setFileDragOver] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  // Animation setup
  const { ref: animationRef } = useAnimation(
    animated ? animationPresets.cardEnter : { type: 'fade-in', trigger: 'load' }
  );

  // Handle drag start
  const handleDragStart = useCallback((e: React.DragEvent, itemId: string) => {
    if (!allowReorder) return;
    
    setDraggedItem(itemId);
    setDragState('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', itemId);
    
    // Create custom drag image
    const dragImage = e.currentTarget.cloneNode(true) as HTMLElement;
    dragImage.style.transform = 'rotate(5deg)';
    dragImage.style.opacity = '0.8';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);
    
    // Clean up drag image after a short delay
    setTimeout(() => {
      document.body.removeChild(dragImage);
    }, 0);
  }, [allowReorder]);

  // Handle drag over
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (!draggedItem) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const itemHeight = rect.height / items.length;
    const index = Math.floor(y / itemHeight);
    
    setDragOverIndex(Math.min(index, items.length - 1));
    setDragState('dragOver');
  }, [draggedItem, items.length]);

  // Handle drag leave
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setDragOverIndex(null);
      setDragState('idle');
    }
  }, []);

  // Handle drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    
    const droppedItemId = e.dataTransfer.getData('text/plain');
    const targetIndex = dragOverIndex;
    
    if (!droppedItemId || targetIndex === null || !onReorder) return;
    
    const draggedIndex = items.findIndex(item => item.id === droppedItemId);
    if (draggedIndex === -1 || draggedIndex === targetIndex) return;
    
    const newItems = [...items];
    const [draggedItem] = newItems.splice(draggedIndex, 1);
    newItems.splice(targetIndex, 0, draggedItem);
    
    setDragState('success');
    onReorder(newItems);
    
    // Reset state
    setTimeout(() => {
      setDraggedItem(null);
      setDragOverIndex(null);
      setDragState('idle');
    }, 300);
  }, [items, dragOverIndex, onReorder]);

  // Handle file drag over
  const handleFileDragOver = useCallback((e: React.DragEvent) => {
    if (!acceptFiles) return;
    
    e.preventDefault();
    e.stopPropagation();
    setFileDragOver(true);
    setIsDragOver(true);
  }, [acceptFiles]);

  // Handle file drag leave
  const handleFileDragLeave = useCallback((e: React.DragEvent) => {
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setFileDragOver(false);
      setIsDragOver(false);
    }
  }, []);

  // Handle file drop
  const handleFileDrop = useCallback((e: React.DragEvent) => {
    if (!acceptFiles || !onFileDrop) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter(file => {
      if (acceptedFileTypes.length === 0) return true;
      return acceptedFileTypes.some(type => file.type.includes(type));
    });
    
    if (validFiles.length > 0) {
      setDragState('success');
      onFileDrop(validFiles);
    } else {
      setDragState('error');
    }
    
    setFileDragOver(false);
    setIsDragOver(false);
    
    setTimeout(() => setDragState('idle'), 1000);
  }, [acceptFiles, onFileDrop, acceptedFileTypes]);

  // Handle item actions
  const handleAdd = useCallback(() => {
    if (maxItems && items.length >= maxItems) return;
    if (onAdd) {
      const newItem: DragDropItem = {
        id: `item-${Date.now()}`,
        content: 'New Item',
      };
      onAdd(newItem);
    }
  }, [items.length, maxItems, onAdd]);

  const handleRemove = useCallback((itemId: string) => {
    if (items.length <= minItems) return;
    if (onRemove) {
      onRemove(itemId);
    }
  }, [items.length, minItems, onRemove]);

  const handleDuplicate = useCallback((item: DragDropItem) => {
    if (maxItems && items.length >= maxItems) return;
    if (onDuplicate) {
      onDuplicate(item);
    }
  }, [items.length, maxItems, onDuplicate]);

  // Get current variant
  const getCurrentVariant = () => {
    if (error) return 'error';
    if (success) return 'success';
    if (fileDragOver) return 'active';
    return 'default';
  };

  return (
    <div
      ref={(node) => {
        containerRef.current = node;
        if (animated) {
          animationRef(node);
        }
      }}
      className={cn(
        dragDropVariants({
          variant: getCurrentVariant(),
          state: dragState,
          className,
        }),
        'rounded-lg'
      )}
      onDragOver={acceptFiles ? handleFileDragOver : handleDragOver}
      onDragLeave={acceptFiles ? handleFileDragLeave : handleDragLeave}
      onDrop={acceptFiles ? handleFileDrop : handleDrop}
      {...props}
    >
      {/* File drop overlay */}
      {fileDragOver && (
        <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-lg flex items-center justify-center z-10">
          <div className="text-center">
            <Plus className="h-8 w-8 text-primary mx-auto mb-2" />
            <p className="text-primary font-medium">Drop files here</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Items ({items.length})</span>
          {maxItems && (
            <span className="text-xs text-muted-foreground">
              / {maxItems}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {allowAdd && (!maxItems || items.length < maxItems) && (
            <button
              onClick={handleAdd}
              className="p-1 hover:bg-muted rounded transition-colors"
              title="Add item"
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Status messages */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md mb-4">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span className="text-sm text-destructive">{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md mb-4">
          <Check className="h-4 w-4 text-green-600" />
          <span className="text-sm text-green-600">{success}</span>
        </div>
      )}

      {/* Items list */}
      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Move className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{emptyMessage}</p>
            {allowAdd && (
              <button
                onClick={handleAdd}
                className="mt-2 text-primary hover:text-primary/80 text-sm font-medium"
              >
                Add your first item
              </button>
            )}
          </div>
        ) : (
          items.map((item, index) => (
            <div
              key={item.id}
              className={cn(
                'flex items-center gap-3 p-3 bg-background border border-border rounded-md transition-all duration-200',
                draggedItem === item.id && 'opacity-50 scale-95',
                dragOverIndex === index && 'border-primary bg-primary/5',
                item.disabled && 'opacity-50 cursor-not-allowed',
                reducedMotion && 'transition-none'
              )}
              draggable={allowReorder && !item.disabled && (item.draggable !== false)}
              onDragStart={(e) => handleDragStart(e, item.id)}
            >
              {/* Drag handle */}
              {allowReorder && !item.disabled && (
                <div className="cursor-grab active:cursor-grabbing">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                </div>
              )}

              {/* Item content */}
              <div className="flex-1 min-w-0">
                {item.content}
              </div>

              {/* Item actions */}
              <div className="flex items-center gap-1">
                {allowDuplicate && (!maxItems || items.length < maxItems) && (
                  <button
                    onClick={() => handleDuplicate(item)}
                    className="p-1 hover:bg-muted rounded transition-colors"
                    title="Duplicate item"
                  >
                    <Copy className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </button>
                )}

                {allowRemove && items.length > minItems && (
                  <button
                    onClick={() => handleRemove(item.id)}
                    className="p-1 hover:bg-muted rounded transition-colors"
                    title="Remove item"
                  >
                    <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}

      {/* Custom content */}
      {children}
    </div>
  );
};

export { DragDrop, dragDropVariants };
