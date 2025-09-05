import { lazy } from 'react';

// Lazy load main pages
export const LazyDashboardPage = lazy(() => import('../pages/DashboardPage'));
export const LazyServersPage = lazy(() => import('../pages/ServersPage'));
export const LazyCreateServerPage = lazy(() => import('../pages/CreateServerPage'));
export const LazyServerDetailsPage = lazy(() => import('../pages/ServerDetailsPage'));
export const LazySettingsPage = lazy(() => import('../pages/SettingsPage'));
export const LazyChangePasswordPage = lazy(() => import('../pages/ChangePasswordPage'));
export const LazyAdminPage = lazy(() => import('../pages/AdminPage'));

// Lazy load authentication components
export const LazyLoginPage = lazy(() => import('../pages/LoginPage'));
export const LazySetupPage = lazy(() => import('../pages/SetupPage'));

// Lazy load complex components
export const LazyServerManagementDashboard = lazy(() => 
  import('../server/ServerManagementDashboard')
);
export const LazyAdminManagementDashboard = lazy(() => 
  import('../admin/AdminManagementDashboard')
);
export const LazySystemMonitoringPanel = lazy(() => 
  import('../admin/SystemMonitoringPanel')
);
export const LazyRealtimeSystemMonitoringPanel = lazy(() => 
  import('../admin/RealtimeSystemMonitoringPanel')
);

// Lazy load data visualization components
export const LazyDataVisualization = lazy(() => 
  import('../ui/data-visualization')
);

// Lazy load drag and drop components
export const LazyDragDrop = lazy(() => 
  import('../ui/drag-drop')
);

// Lazy load enhanced UI components
export const LazyEnhancedButton = lazy(() => 
  import('../ui/enhanced-button')
);
export const LazyEnhancedCard = lazy(() => 
  import('../ui/enhanced-card')
);
export const LazyEnhancedInput = lazy(() => 
  import('../ui/enhanced-input')
);

// Lazy load keyboard shortcuts help
export const LazyKeyboardShortcutsHelp = lazy(() => 
  import('../ui/keyboard-shortcuts-help')
);
