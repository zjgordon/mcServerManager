// Application constants

export const APP_CONFIG = {
  name: 'Minecraft Server Manager',
  version: '0.1.0-alpha',
  description: 'Modern React frontend for Minecraft Server Manager',
  author: 'Minecraft Server Manager Team',
  repository: 'https://github.com/your-org/minecraft-server-manager',
} as const;

export const API_CONFIG = {
  baseURL: '/api/v1',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
} as const;

export const ROUTES = {
  // Public routes
  LOGIN: '/login',
  
  // Protected routes
  DASHBOARD: '/',
  SERVERS: '/servers',
  SERVERS_CREATE: '/servers/create',
  SERVERS_EDIT: '/servers/:id/edit',
  SERVERS_VIEW: '/servers/:id',
  SETTINGS: '/settings',
  ADMIN: '/admin',
  ADMIN_USERS: '/admin/users',
  ADMIN_SYSTEM: '/admin/system',
  ACTIVITY: '/activity',
  ANALYTICS: '/analytics',
  SECURITY: '/security',
} as const;

export const SERVER_STATUS = {
  RUNNING: 'Running',
  STOPPED: 'Stopped',
  STARTING: 'Starting',
  STOPPING: 'Stopping',
  ERROR: 'Error',
} as const;

export const GAME_MODES = {
  SURVIVAL: 'survival',
  CREATIVE: 'creative',
  ADVENTURE: 'adventure',
  SPECTATOR: 'spectator',
} as const;

export const DIFFICULTIES = {
  PEACEFUL: 'peaceful',
  EASY: 'easy',
  NORMAL: 'normal',
  HARD: 'hard',
} as const;

export const MINECRAFT_VERSIONS = [
  '1.21.8',
  '1.21.7',
  '1.21.6',
  '1.21.5',
  '1.21.4',
  '1.21.3',
  '1.21.2',
  '1.21.1',
  '1.21',
  '1.20.6',
  '1.20.5',
  '1.20.4',
  '1.20.3',
  '1.20.2',
  '1.20.1',
  '1.20',
] as const;

export const SERVER_LIMITS = {
  MIN_MEMORY: 512,
  MAX_MEMORY: 8192,
  DEFAULT_MEMORY: 2048,
  MIN_PORT: 1024,
  MAX_PORT: 65535,
  DEFAULT_PORT: 25565,
  MAX_PLAYERS: 100,
  DEFAULT_PLAYERS: 20,
  MAX_MOTD_LENGTH: 100,
  MAX_SERVER_NAME_LENGTH: 50,
  MIN_SERVER_NAME_LENGTH: 3,
} as const;

export const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
} as const;

export const THEME_COLORS = {
  MINECRAFT_GREEN: '#7CB342',
  MINECRAFT_DARK_GREEN: '#558B2F',
  MINECRAFT_BROWN: '#8D6E63',
  MINECRAFT_DARK_BROWN: '#5D4037',
  MINECRAFT_STONE: '#9E9E9E',
  MINECRAFT_DARK_STONE: '#616161',
  MINECRAFT_RED: '#F44336',
  MINECRAFT_DARK_RED: '#D32F2F',
  MINECRAFT_BLUE: '#2196F3',
  MINECRAFT_DARK_BLUE: '#1976D2',
  MINECRAFT_YELLOW: '#FFEB3B',
  MINECRAFT_DARK_YELLOW: '#FBC02D',
} as const;

export const STATUS_COLORS = {
  [SERVER_STATUS.RUNNING]: {
    text: 'text-green-600',
    bg: 'bg-green-100',
    border: 'border-green-200',
  },
  [SERVER_STATUS.STOPPED]: {
    text: 'text-gray-600',
    bg: 'bg-gray-100',
    border: 'border-gray-200',
  },
  [SERVER_STATUS.STARTING]: {
    text: 'text-yellow-600',
    bg: 'bg-yellow-100',
    border: 'border-yellow-200',
  },
  [SERVER_STATUS.STOPPING]: {
    text: 'text-orange-600',
    bg: 'bg-orange-100',
    border: 'border-orange-200',
  },
  [SERVER_STATUS.ERROR]: {
    text: 'text-red-600',
    bg: 'bg-red-100',
    border: 'border-red-200',
  },
} as const;

export const QUERY_KEYS = {
  SERVERS: ['servers'],
  SERVER: (id: number) => ['server', id],
  USERS: ['users'],
  USER: (id: number) => ['user', id],
  SYSTEM_STATS: ['system-stats'],
  SYSTEM_CONFIG: ['system-config'],
  AUTH_USER: ['auth-user'],
} as const;

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_PREFERENCES: 'user_preferences',
  THEME: 'theme',
  LANGUAGE: 'language',
  TIMEZONE: 'timezone',
} as const;

export const TOAST_DURATION = {
  SUCCESS: 3000,
  ERROR: 5000,
  WARNING: 4000,
  INFO: 3000,
} as const;

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [10, 25, 50, 100],
  MAX_PAGE_SIZE: 100,
} as const;

export const ANIMATION_DURATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
} as const;

export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  '2XL': 1536,
} as const;

export const VALIDATION_RULES = {
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 20,
    PATTERN: /^[a-zA-Z0-9_-]+$/,
  },
  PASSWORD: {
    MIN_LENGTH: 8,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBER: true,
    REQUIRE_SPECIAL: true,
  },
  EMAIL: {
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  SERVER_NAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 50,
    PATTERN: /^[a-zA-Z0-9\s_-]+$/,
  },
  MOTD: {
    MAX_LENGTH: 100,
  },
} as const;
