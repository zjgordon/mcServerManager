import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import type { UserCreateRequest, UserUpdateRequest, SystemConfig } from '@/types/api';

export const useSystemStats = () => {
  return useQuery({
    queryKey: ['system-stats'],
    queryFn: async () => {
      const response = await apiService.getSystemStats();
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to fetch system stats');
    },
  });
};

export const useSystemConfig = () => {
  return useQuery({
    queryKey: ['system-config'],
    queryFn: async () => {
      const response = await apiService.getSystemConfig();
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to fetch system config');
    },
  });
};

export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await apiService.getUsers();
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to fetch users');
    },
  });
};

export const useUser = (id: number) => {
  return useQuery({
    queryKey: ['user', id],
    queryFn: async () => {
      // For now, we'll get all users and filter by ID
      // This should be replaced with a proper getUser endpoint
      const response = await apiService.getUsers();
      if (response.success && response.data) {
        const user = response.data.find(u => u.id === id);
        if (user) {
          return user;
        }
        throw new Error('User not found');
      }
      throw new Error(response.message || 'Failed to fetch user');
    },
    enabled: !!id,
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: UserCreateRequest) => {
      const response = await apiService.createUser(data);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to create user');
    },
    onSuccess: (newUser) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: 'User Created',
        description: `User ${newUser.username} has been created successfully.`,
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

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UserUpdateRequest }) => {
      const response = await apiService.updateUser(id, data);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to update user');
    },
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user', updatedUser.id] });
      toast({
        title: 'User Updated',
        description: `User ${updatedUser.username} has been updated successfully.`,
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

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await apiService.deleteUser(id);
      if (response.success) {
        return id;
      }
      throw new Error(response.message || 'Failed to delete user');
    },
    onSuccess: (deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.removeQueries({ queryKey: ['user', deletedId] });
      toast({
        title: 'User Deleted',
        description: 'User has been deleted successfully.',
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

export const useUpdateSystemConfig = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: Partial<SystemConfig>) => {
      const response = await apiService.updateSystemConfig(data);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to update system config');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-config'] });
      toast({
        title: 'Configuration Updated',
        description: 'System configuration has been updated successfully.',
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
