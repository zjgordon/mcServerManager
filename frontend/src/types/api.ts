// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

// User Types
export interface User {
  id: number;
  username: string;
  email?: string;
  is_admin: boolean;
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

export interface UserCreateRequest {
  username: string;
  password: string;
  email?: string;
  is_admin?: boolean;
}

export interface UserUpdateRequest {
  username?: string;
  email?: string;
  is_admin?: boolean;
  is_active?: boolean;
}

// Server Types
export interface Server {
  id: number;
  server_name: string;
  version: string;
  port: number;
  status: 'Stopped' | 'Running' | 'Starting' | 'Stopping';
  pid?: number;
  memory_mb: number;
  owner_id: number;
  level_seed?: string;
  gamemode: 'survival' | 'creative' | 'adventure' | 'spectator';
  difficulty: 'peaceful' | 'easy' | 'normal' | 'hard';
  hardcore: boolean;
  pvp: boolean;
  spawn_monsters: boolean;
  motd?: string;
  created_at: string;
  updated_at: string;
}

export interface ServerCreateRequest {
  server_name: string;
  version: string;
  memory_mb?: number;
  level_seed?: string;
  gamemode?: 'survival' | 'creative' | 'adventure' | 'spectator';
  difficulty?: 'peaceful' | 'easy' | 'normal' | 'hard';
  hardcore?: boolean;
  pvp?: boolean;
  spawn_monsters?: boolean;
  motd?: string;
}

export interface ServerUpdateRequest {
  server_name?: string;
  memory_mb?: number;
  gamemode?: 'survival' | 'creative' | 'adventure' | 'spectator';
  difficulty?: 'peaceful' | 'easy' | 'normal' | 'hard';
  motd?: string;
}

export interface ServerStatus {
  status: 'Stopped' | 'Running' | 'Starting' | 'Stopping';
  pid?: number;
  process_info?: {
    cpu_percent: number;
    memory_mb: number;
    create_time: string;
  };
}

// Authentication Types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  user: User;
}

export interface AuthStatus {
  authenticated: boolean;
  user?: {
    id: number;
    username: string;
    is_admin: boolean;
  };
}

export interface SetupRequest {
  username: string;
  password: string;
  confirm_password: string;
  email?: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export interface ResetPasswordRequest {
  user_id?: number;
  new_password: string;
  confirm_password: string;
}

// System Types
export interface SystemConfig {
  app_title: string;
  server_hostname: string;
  max_total_mb: number;
  max_server_mb: number;
  default_server_mb: number;
}

export interface SystemStats {
  total_servers: number;
  running_servers: number;
  total_users: number;
  total_memory_allocated: number;
  system_memory_usage: number;
  disk_usage: {
    total_gb: number;
    used_gb: number;
    free_gb: number;
  };
}

export interface MemoryUsage {
  total_allocated: number;
  total_available: number;
  utilization_percentage: number;
  servers: Array<{
    id: number;
    server_name: string;
    memory_mb: number;
    status: string;
  }>;
}

export interface Versions {
  latest_release: string;
  latest_snapshot: string;
  releases: string[];
  snapshots: string[];
}

// Error Types
export interface ApiError {
  success: false;
  message: string;
  error?: string;
}
