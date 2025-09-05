import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { MainLayout } from './components/layout/MainLayout';
import { AuthLayout } from './components/layout/AuthLayout';
import LoginPage from './pages/LoginPage';
import SetupPage from './pages/SetupPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { ServersPage } from './pages/ServersPage';
import CreateServerPage from './pages/server/CreateServerPage';
import ServerDetailsPage from './pages/server/ServerDetailsPage';
import { SettingsPage } from './pages/SettingsPage';
import { AdminPage } from './pages/AdminPage';
import ProtectedRoute from './components/ProtectedRoute';
import AuthFlow from './components/auth/AuthFlow';
import { Toaster } from './components/ui/toaster';
import './App.css';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WebSocketProvider>
          <Router>
            <div className="App">
              <AuthFlow>
              <Routes>
              {/* Authentication Routes */}
              <Route path="/login" element={
                <AuthLayout>
                  <LoginPage />
                </AuthLayout>
              } />
              
              <Route path="/setup" element={
                <AuthLayout>
                  <SetupPage />
                </AuthLayout>
              } />
              
              {/* Protected Routes with Main Layout */}
              <Route path="/" element={
                <ProtectedRoute>
                  <MainLayout>
                    <DashboardPage />
                  </MainLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/servers" element={
                <ProtectedRoute>
                  <MainLayout>
                    <ServersPage />
                  </MainLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/servers/create" element={
                <ProtectedRoute>
                  <CreateServerPage />
                </ProtectedRoute>
              } />
              
              <Route path="/servers/:id" element={
                <ProtectedRoute>
                  <ServerDetailsPage />
                </ProtectedRoute>
              } />
              
              <Route path="/settings" element={
                <ProtectedRoute>
                  <MainLayout>
                    <SettingsPage />
                  </MainLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/change-password" element={
                <ProtectedRoute>
                  <ChangePasswordPage />
                </ProtectedRoute>
              } />
              
              <Route path="/admin" element={
                <ProtectedRoute>
                  <MainLayout>
                    <AdminPage />
                  </MainLayout>
                </ProtectedRoute>
              } />
              
              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              </AuthFlow>
              <Toaster />
            </div>
          </Router>
        </WebSocketProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
