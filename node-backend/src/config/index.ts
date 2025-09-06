import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

export interface Config {
  // Environment
  nodeEnv: string;
  port: number;

  // Database
  databaseUrl: string;

  // Redis
  redisUrl: string;
  redisHost: string;
  redisPort: number;

  // Session & Security
  sessionSecret: string;
  csrfSecret: string;

  // CORS
  frontendUrl: string;

  // WebSocket
  wsUseRedisAdapter: boolean;

  // Logging
  logLevel: string;

  // Memory Management
  maxTotalMemoryMb: number;
  defaultServerMemoryMb: number;
  minServerMemoryMb: number;
  maxServerMemoryMb: number;

  // Application
  appTitle: string;
  serverHostname: string;
}

// Validate required environment variables
const requiredEnvVars = ['DATABASE_URL', 'SESSION_SECRET', 'CSRF_SECRET'];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Configuration object
export const config: Config = {
  // Environment
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5001', 10),

  // Database
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',

  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  redisHost: process.env.REDIS_HOST || 'localhost',
  redisPort: parseInt(process.env.REDIS_PORT || '6379', 10),

  // Session & Security
  sessionSecret: process.env.SESSION_SECRET || 'dev-session-secret',
  csrfSecret: process.env.CSRF_SECRET || 'dev-csrf-secret',

  // CORS
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

  // WebSocket
  wsUseRedisAdapter: process.env.WS_USE_REDIS_ADAPTER === 'true',

  // Logging
  logLevel: process.env.LOG_LEVEL || 'debug',

  // Memory Management
  maxTotalMemoryMb: parseInt(process.env.MAX_TOTAL_MEMORY_MB || '8192', 10),
  defaultServerMemoryMb: parseInt(process.env.DEFAULT_SERVER_MEMORY_MB || '1024', 10),
  minServerMemoryMb: parseInt(process.env.MIN_SERVER_MEMORY_MB || '512', 10),
  maxServerMemoryMb: parseInt(process.env.MAX_SERVER_MEMORY_MB || '4096', 10),

  // Application
  appTitle: process.env.APP_TITLE || 'Minecraft Server Manager',
  serverHostname: process.env.SERVER_HOSTNAME || 'localhost',
};

// Validate configuration
export function validateConfig(): void {
  if (config.port < 1 || config.port > 65535) {
    throw new Error('PORT must be between 1 and 65535');
  }

  if (config.minServerMemoryMb >= config.maxServerMemoryMb) {
    throw new Error('MIN_SERVER_MEMORY_MB must be less than MAX_SERVER_MEMORY_MB');
  }

  if (
    config.defaultServerMemoryMb < config.minServerMemoryMb ||
    config.defaultServerMemoryMb > config.maxServerMemoryMb
  ) {
    throw new Error('DEFAULT_SERVER_MEMORY_MB must be between MIN and MAX values');
  }
}

// Initialize configuration
validateConfig();

export default config;
