import React, { useState } from 'react';
import { ServerManagementDashboard } from '../components/server';
import type { Server as ServerType } from '../types/api';

export const ServersPage: React.FC = () => {
  const [selectedServer, setSelectedServer] = useState<ServerType | undefined>();

  const handleServerSelect = (server: ServerType) => {
    setSelectedServer(server);
  };

  return (
    <ServerManagementDashboard
      selectedServerId={selectedServer?.id}
      onServerSelect={handleServerSelect}
    />
  );
};
