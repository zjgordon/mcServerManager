import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import type {
  ApiResponse,
  User,
  Server,
  ServerCreateRequest,
  ServerUpdateRequest,
  LoginRequest,
  LoginResponse,
  AuthStatus,
  SetupRequest,
  ChangePasswordRequest,
  ResetPasswordRequest,
  SystemConfig,
  SystemStats,
  MemoryUsage,
  Versions,
  UserCreateRequest,
  UserUpdateRequest,
} from '../types/api';

class ApiService {
  private api: AxiosInstance;
  private csrfToken: string | null = null;

  constructor() {
    this.api = axios.create({
      baseURL: '/api/v1',
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000, // 10 second timeout
    });

    // Add request interceptor for CSRF token
    this.api.interceptors.request.use(async (config) => {
      // Skip CSRF token for the CSRF token endpoint itself
      if (config.url?.includes('/csrf-token')) {
        return config;
      }
      
      // Get CSRF token if we don't have it
      if (!this.csrfToken) {
        try {
          const response = await this.api.get('/auth/csrf-token');
          this.csrfToken = response.data.csrf_token;
        } catch (error) {
          console.warn('Failed to get CSRF token:', error);
        }
      }
      
      if (this.csrfToken) {
        config.headers['X-CSRFToken'] = this.csrfToken;
      }
      return config;
    });

    // Add response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Handle unauthorized access
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Authentication API
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response: AxiosResponse<LoginResponse> = await this.api.post('/auth/login', credentials);
    return response.data;
  }

  async logout(): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.api.post('/auth/logout');
    return response.data;
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    const response: AxiosResponse<ApiResponse<User>> = await this.api.get('/auth/me');
    return response.data;
  }

  async getAuthStatus(): Promise<AuthStatus> {
    const response: AxiosResponse<AuthStatus> = await this.api.get('/auth/status');
    return response.data;
  }

  async changePassword(data: ChangePasswordRequest): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.api.post('/auth/change-password', data);
    return response.data;
  }

  async setupAdmin(data: SetupRequest): Promise<ApiResponse<User>> {
    const response: AxiosResponse<ApiResponse<User>> = await this.api.post('/auth/setup', data);
    return response.data;
  }

  async getSetupStatus(): Promise<{ setup_required: boolean; has_admin: boolean }> {
    const response: AxiosResponse<{ setup_required: boolean; has_admin: boolean }> = 
      await this.api.get('/auth/setup/status');
    return response.data;
  }

  async resetPassword(data: ResetPasswordRequest): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.api.post('/auth/reset-password', data);
    return response.data;
  }

  // Server Management API
  async getServers(): Promise<ApiResponse<Server[]>> {
    const response: AxiosResponse<ApiResponse<Server[]>> = await this.api.get('/servers/');
    return response.data;
  }

  async getServer(id: number): Promise<ApiResponse<Server>> {
    const response: AxiosResponse<ApiResponse<Server>> = await this.api.get(`/servers/${id}`);
    return response.data;
  }

  async createServer(data: ServerCreateRequest): Promise<ApiResponse<Server>> {
    const response: AxiosResponse<ApiResponse<Server>> = await this.api.post('/servers/', data);
    return response.data;
  }

  async updateServer(id: number, data: ServerUpdateRequest): Promise<ApiResponse<Server>> {
    const response: AxiosResponse<ApiResponse<Server>> = await this.api.put(`/servers/${id}`, data);
    return response.data;
  }

  async deleteServer(id: number): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.api.delete(`/servers/${id}`);
    return response.data;
  }

  async startServer(id: number): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.api.post(`/servers/${id}/start`);
    return response.data;
  }

  async stopServer(id: number): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.api.post(`/servers/${id}/stop`);
    return response.data;
  }

  async getServerStatus(id: number): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.api.get(`/servers/${id}/status`);
    return response.data;
  }

  async backupServer(id: number): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.api.post(`/servers/${id}/backup`);
    return response.data;
  }

  async acceptEula(id: number): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.api.post(`/servers/${id}/accept-eula`);
    return response.data;
  }

  async getAvailableVersions(): Promise<ApiResponse<Versions>> {
    const response: AxiosResponse<ApiResponse<Versions>> = await this.api.get('/servers/versions');
    return response.data;
  }

  async getMemoryUsage(): Promise<ApiResponse<MemoryUsage>> {
    const response: AxiosResponse<ApiResponse<MemoryUsage>> = await this.api.get('/servers/memory-usage');
    return response.data;
  }

  // Admin API
  async getSystemConfig(): Promise<ApiResponse<SystemConfig>> {
    const response: AxiosResponse<ApiResponse<SystemConfig>> = await this.api.get('/admin/config');
    return response.data;
  }

  async updateSystemConfig(data: Partial<SystemConfig>): Promise<ApiResponse<SystemConfig>> {
    const response: AxiosResponse<ApiResponse<SystemConfig>> = await this.api.put('/admin/config', data);
    return response.data;
  }

  async getSystemStats(): Promise<ApiResponse<SystemStats>> {
    const response: AxiosResponse<ApiResponse<SystemStats>> = await this.api.get('/admin/stats');
    return response.data;
  }

  async getUsers(): Promise<ApiResponse<User[]>> {
    const response: AxiosResponse<ApiResponse<User[]>> = await this.api.get('/admin/users');
    return response.data;
  }

  async createUser(data: UserCreateRequest): Promise<ApiResponse<User>> {
    const response: AxiosResponse<ApiResponse<User>> = await this.api.post('/admin/users', data);
    return response.data;
  }

  async updateUser(id: number, data: UserUpdateRequest): Promise<ApiResponse<User>> {
    const response: AxiosResponse<ApiResponse<User>> = await this.api.put(`/admin/users/${id}`, data);
    return response.data;
  }

  async deleteUser(id: number): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.api.delete(`/admin/users/${id}`);
    return response.data;
  }

  // Health check
  async healthCheck(): Promise<ApiResponse> {
    const response: AxiosResponse<ApiResponse> = await this.api.get('/health');
    return response.data;
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;
