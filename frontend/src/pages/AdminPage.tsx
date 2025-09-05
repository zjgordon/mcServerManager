import React from 'react';
import { AdminManagementDashboard } from '../components/admin';

export const AdminPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-minecraft-green/5 to-minecraft-blue/5 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <AdminManagementDashboard />
      </div>
    </div>
  );
};
