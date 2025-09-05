import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import type { ServerCreateRequest, ServerUpdateRequest } from '@/types/api';

export const useServers = () => {
  return useQuery({
    queryKey: ['servers'],
    queryFn: async () => {
      const response = await apiService.getServers();
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to fetch servers');
    },
  });
};

export const useServer = (id: number) => {
  return useQuery({
    queryKey: ['server', id],
    queryFn: async () => {
      const response = await apiService.getServer(id);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to fetch server');
    },
    enabled: !!id,
  });
};

export const useCreateServer = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: ServerCreateRequest) => {
      const response = await apiService.createServer(data);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to create server');
    },
    onSuccess: (newServer) => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      toast({
        title: 'Server Created',
        description: `${newServer.server_name} has been created successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateServer = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ServerUpdateRequest }) => {
      const response = await apiService.updateServer(id, data);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to update server');
    },
    onSuccess: (updatedServer) => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      queryClient.invalidateQueries({ queryKey: ['server', updatedServer.id] });
      toast({
        title: 'Server Updated',
        description: `${updatedServer.server_name} has been updated successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteServer = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await apiService.deleteServer(id);
      if (response.success) {
        return id;
      }
      throw new Error(response.message || 'Failed to delete server');
    },
    onSuccess: (deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      queryClient.removeQueries({ queryKey: ['server', deletedId] });
      toast({
        title: 'Server Deleted',
        description: 'Server has been deleted successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useStartServer = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await apiService.startServer(id);
      if (response.success) {
        return id;
      }
      throw new Error(response.message || 'Failed to start server');
    },
    onSuccess: (serverId) => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      queryClient.invalidateQueries({ queryKey: ['server', serverId] });
      toast({
        title: 'Server Starting',
        description: 'Server is starting up. This may take a few moments.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useStopServer = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await apiService.stopServer(id);
      if (response.success) {
        return id;
      }
      throw new Error(response.message || 'Failed to stop server');
    },
    onSuccess: (serverId) => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      queryClient.invalidateQueries({ queryKey: ['server', serverId] });
      toast({
        title: 'Server Stopping',
        description: 'Server is shutting down.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useBackupServer = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await apiService.backupServer(id);
      if (response.success) {
        return id;
      }
      throw new Error(response.message || 'Failed to backup server');
    },
    onSuccess: () => {
      toast({
        title: 'Backup Created',
        description: 'Server backup has been created successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};
