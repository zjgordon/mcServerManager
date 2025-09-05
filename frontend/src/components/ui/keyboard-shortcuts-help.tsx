import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './dialog';
import { Button } from './button';
import { Input } from './input';
import { Badge } from './badge';
import { 
  Keyboard, 
  Search, 
  X, 
  Command, 
  Ctrl, 
  Alt, 
  Shift,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import { useKeyboardShortcuts, defaultShortcuts, formatShortcut } from '../../hooks/useKeyboardShortcuts';
import { cn } from '../../lib/utils';

interface KeyboardShortcutsHelpProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  shortcuts?: typeof defaultShortcuts;
  className?: string;
}

const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({
  open = false,
  onOpenChange,
  shortcuts = defaultShortcuts,
  className
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredShortcuts, setFilteredShortcuts] = useState(shortcuts);

  // Filter shortcuts based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredShortcuts(shortcuts);
      return;
    }

    const filtered = shortcuts.map(group => ({
      ...group,
      shortcuts: group.shortcuts.filter(shortcut =>
        shortcut.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shortcut.key.toLowerCase().includes(searchTerm.toLowerCase())
      )
    })).filter(group => group.shortcuts.length > 0);

    setFilteredShortcuts(filtered);
  }, [searchTerm, shortcuts]);

  // Keyboard shortcut to open/close help
  useKeyboardShortcuts([
    {
      key: '?',
      action: () => onOpenChange?.(!open),
      description: 'Toggle keyboard shortcuts help',
    },
    {
      key: 'Escape',
      action: () => onOpenChange?.(false),
      description: 'Close keyboard shortcuts help',
    }
  ]);

  // Get key icon
  const getKeyIcon = (key: string) => {
    switch (key.toLowerCase()) {
      case 'ctrl':
        return <Ctrl className="h-3 w-3" />;
      case 'alt':
        return <Alt className="h-3 w-3" />;
      case 'shift':
        return <Shift className="h-3 w-3" />;
      case 'meta':
      case 'cmd':
        return <Command className="h-3 w-3" />;
      case 'arrowup':
        return <ArrowUp className="h-3 w-3" />;
      case 'arrowdown':
        return <ArrowDown className="h-3 w-3" />;
      case 'arrowleft':
        return <ArrowLeft className="h-3 w-3" />;
      case 'arrowright':
        return <ArrowRight className="h-3 w-3" />;
      default:
        return null;
    }
  };

  // Render key
  const renderKey = (key: string) => {
    const icon = getKeyIcon(key);
    return (
      <kbd className={cn(
        'inline-flex items-center gap-1 px-2 py-1 text-xs font-mono bg-muted border border-border rounded',
        'shadow-sm'
      )}>
        {icon}
        <span>{key}</span>
      </kbd>
    );
  };

  // Render keyboard shortcut
  const renderShortcut = (shortcut: any) => {
    const parts = [];
    
    if (shortcut.ctrlKey) parts.push(renderKey('Ctrl'));
    if (shortcut.altKey) parts.push(renderKey('Alt'));
    if (shortcut.shiftKey) parts.push(renderKey('Shift'));
    if (shortcut.metaKey) parts.push(renderKey('Cmd'));
    
    parts.push(renderKey(shortcut.key));
    
    return (
      <div className="flex items-center gap-1">
        {parts.map((part, index) => (
          <React.Fragment key={index}>
            {part}
            {index < parts.length - 1 && (
              <span className="text-muted-foreground text-xs">+</span>
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('max-w-2xl max-h-[80vh] overflow-hidden', className)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Use these keyboard shortcuts to navigate and interact with the application more efficiently.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search shortcuts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* Shortcuts list */}
          <div className="overflow-y-auto max-h-96 space-y-6">
            {filteredShortcuts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Keyboard className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No shortcuts found matching "{searchTerm}"</p>
              </div>
            ) : (
              filteredShortcuts.map((group) => (
                <div key={group.name} className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground border-b pb-1">
                    {group.name}
                  </h3>
                  
                  <div className="space-y-2">
                    {group.shortcuts.map((shortcut, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted/80 transition-colors"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">
                            {shortcut.description}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {renderShortcut(shortcut)}
                          {shortcut.disabled && (
                            <Badge variant="secondary" className="text-xs">
                              Disabled
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-xs text-muted-foreground">
              Press <kbd className="px-1 py-0.5 text-xs font-mono bg-muted border border-border rounded">?</kbd> to toggle this help
            </div>
            
            <Button variant="outline" onClick={() => onOpenChange?.(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export { KeyboardShortcutsHelp };
