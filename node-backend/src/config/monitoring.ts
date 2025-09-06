import { config } from './index';

export interface MonitoringConfig {
  enabled: boolean;
  metrics: {
    enabled: boolean;
    port: number;
    path: string;
  };
  logging: {
    level: string;
    format: 'json' | 'simple' | 'combined';
    file: {
      enabled: boolean;
      path: string;
      maxSize: string;
      maxFiles: number;
    };
    console: {
      enabled: boolean;
      colorize: boolean;
    };
  };
  healthChecks: {
    enabled: boolean;
    interval: number;
    timeout: number;
    endpoints: string[];
  };
  alerts: {
    enabled: boolean;
    webhook: string;
    channels: string[];
  };
}

export const monitoringConfig: MonitoringConfig = {
  enabled: process.env.MONITORING_ENABLED !== 'false',
  metrics: {
    enabled: process.env.METRICS_ENABLED !== 'false',
    port: parseInt(process.env.METRICS_PORT || '9090'),
    path: process.env.METRICS_PATH || '/metrics',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: (process.env.LOG_FORMAT as 'json' | 'simple' | 'combined') || 'json',
    file: {
      enabled: process.env.LOG_FILE_ENABLED !== 'false',
      path: process.env.LOG_FILE_PATH || './logs/app.log',
      maxSize: process.env.LOG_FILE_MAX_SIZE || '10m',
      maxFiles: parseInt(process.env.LOG_FILE_MAX_FILES || '5'),
    },
    console: {
      enabled: process.env.LOG_CONSOLE_ENABLED !== 'false',
      colorize: process.env.LOG_CONSOLE_COLORIZE !== 'false',
    },
  },
  healthChecks: {
    enabled: process.env.HEALTH_CHECKS_ENABLED !== 'false',
    interval: parseInt(process.env.HEALTH_CHECKS_INTERVAL || '30000'),
    timeout: parseInt(process.env.HEALTH_CHECKS_TIMEOUT || '5000'),
    endpoints: [
      '/healthz',
      '/readyz',
      '/live',
    ],
  },
  alerts: {
    enabled: process.env.ALERTS_ENABLED === 'true',
    webhook: process.env.ALERT_WEBHOOK_URL || '',
    channels: (process.env.ALERT_CHANNELS || '').split(',').filter(Boolean),
  },
};

export default monitoringConfig;
