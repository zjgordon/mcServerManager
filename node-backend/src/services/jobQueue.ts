import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import { config } from '../config';
import { logger } from '../config/logger';
import { REDIS_NAMESPACES } from '../config/redis';

// Job types and interfaces
export interface JobData {
  [key: string]: any;
}

export interface JobResult {
  success: boolean;
  data?: any;
  error?: string;
  duration?: number;
}

// Job queue names
export const JOB_QUEUES = {
  SERVER_MANAGEMENT: 'server-management',
  BACKUP: 'backup',
  CLEANUP: 'cleanup',
  NOTIFICATION: 'notification',
  DATA_SYNC: 'data-sync',
} as const;

// Job types
export const JOB_TYPES = {
  START_SERVER: 'start-server',
  STOP_SERVER: 'stop-server',
  RESTART_SERVER: 'restart-server',
  BACKUP_SERVER: 'backup-server',
  CLEANUP_LOGS: 'cleanup-logs',
  CLEANUP_TEMP: 'cleanup-temp',
  SEND_NOTIFICATION: 'send-notification',
  SYNC_DATA: 'sync-data',
} as const;

// Redis connection for BullMQ
const redisConnection = new IORedis(config.redisUrl, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: false,
});

// Job queue manager
export class JobQueueManager {
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker> = new Map();
  private queueEvents: Map<string, QueueEvents> = new Map();

  constructor() {
    this.setupEventHandlers();
  }

  // Create a job queue
  createQueue(name: string): Queue {
    if (this.queues.has(name)) {
      return this.queues.get(name)!;
    }

    const queue = new Queue(name, {
      connection: redisConnection,
      prefix: `${REDIS_NAMESPACES.JOBS}${name}`,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    });

    this.queues.set(name, queue);
    logger.info(`✅ Job queue '${name}' created`);

    return queue;
  }

  // Create a worker for a queue
  createWorker(
    queueName: string,
    processor: (job: Job) => Promise<JobResult>,
    options?: any,
  ): Worker {
    if (this.workers.has(queueName)) {
      return this.workers.get(queueName)!;
    }

    const worker = new Worker(
      queueName,
      async (job: Job) => {
        const startTime = Date.now();
        logger.info(`🔄 Processing job ${job.id} of type ${job.name}`);

        try {
          const result = await processor(job);
          const duration = Date.now() - startTime;

          logger.info(`✅ Job ${job.id} completed in ${duration}ms`);
          return { ...result, duration };
        } catch (error) {
          const duration = Date.now() - startTime;
          logger.error(`❌ Job ${job.id} failed after ${duration}ms:`, error);
          throw error;
        }
      },
      {
        connection: redisConnection,
        prefix: `${REDIS_NAMESPACES.JOBS}${queueName}`,
        ...options,
      },
    );

    this.workers.set(queueName, worker);
    logger.info(`✅ Worker for queue '${queueName}' created`);

    return worker;
  }

  // Add a job to a queue
  async addJob(
    queueName: string,
    jobName: string,
    data: JobData,
    options?: any,
  ): Promise<Job> {
    const queue = this.getQueue(queueName);
    const job = await queue.add(jobName, data, options);

    logger.info(`📝 Job ${job.id} added to queue '${queueName}'`);
    return job;
  }

  // Get a queue
  getQueue(name: string): Queue {
    const queue = this.queues.get(name);
    if (!queue) {
      throw new Error(`Queue '${name}' not found. Create it first.`);
    }
    return queue;
  }

  // Get a worker
  getWorker(name: string): Worker {
    const worker = this.workers.get(name);
    if (!worker) {
      throw new Error(`Worker '${name}' not found. Create it first.`);
    }
    return worker;
  }

  // Get queue statistics
  async getQueueStats(queueName: string): Promise<any> {
    const queue = this.getQueue(queueName);
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getCompleted(),
      queue.getFailed(),
      queue.getDelayed(),
    ]);

    return {
      name: queueName,
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
    };
  }

  // Get all queue statistics
  async getAllStats(): Promise<any[]> {
    const stats = [];
    for (const queueName of this.queues.keys()) {
      stats.push(await this.getQueueStats(queueName));
    }
    return stats;
  }

  // Pause a queue
  async pauseQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.pause();
    logger.info(`⏸️ Queue '${queueName}' paused`);
  }

  // Resume a queue
  async resumeQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.resume();
    logger.info(`▶️ Queue '${queueName}' resumed`);
  }

  // Clean a queue
  async cleanQueue(queueName: string, grace: number = 5000): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.clean(grace, 100, 'completed');
    await queue.clean(grace, 100, 'failed');
    logger.info(`🧹 Queue '${queueName}' cleaned`);
  }

  // Setup event handlers
  private setupEventHandlers(): void {
    // Global error handler
    process.on('SIGTERM', async () => {
      logger.info('🛑 SIGTERM received, shutting down job queues...');
      await this.shutdown();
    });

    process.on('SIGINT', async () => {
      logger.info('🛑 SIGINT received, shutting down job queues...');
      await this.shutdown();
    });
  }

  // Shutdown all queues and workers
  async shutdown(): Promise<void> {
    logger.info('🔄 Shutting down job queue manager...');

    // Close all workers
    for (const [name, worker] of this.workers) {
      logger.info(`🔄 Closing worker '${name}'...`);
      await worker.close();
    }

    // Close all queues
    for (const [name, queue] of this.queues) {
      logger.info(`🔄 Closing queue '${name}'...`);
      await queue.close();
    }

    // Close Redis connection
    await redisConnection.quit();

    logger.info('✅ Job queue manager shutdown complete');
  }
}

// Job processors
export const jobProcessors = {
  // Server management jobs
  async startServer(job: Job): Promise<JobResult> {
    const { serverId, userId } = job.data;
    logger.info(`🚀 Starting server ${serverId} for user ${userId}`);

    // TODO: Implement actual server start logic
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate work

    return {
      success: true,
      data: { serverId, status: 'started' },
    };
  },

  async stopServer(job: Job): Promise<JobResult> {
    const { serverId, userId } = job.data;
    logger.info(`🛑 Stopping server ${serverId} for user ${userId}`);

    // TODO: Implement actual server stop logic
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate work

    return {
      success: true,
      data: { serverId, status: 'stopped' },
    };
  },

  async restartServer(job: Job): Promise<JobResult> {
    const { serverId, userId } = job.data;
    logger.info(`🔄 Restarting server ${serverId} for user ${userId}`);

    // TODO: Implement actual server restart logic
    await new Promise(resolve => setTimeout(resolve, 3000)); // Simulate work

    return {
      success: true,
      data: { serverId, status: 'restarted' },
    };
  },

  // Backup jobs
  async backupServer(job: Job): Promise<JobResult> {
    const { serverId, backupType } = job.data;
    logger.info(`💾 Creating ${backupType} backup for server ${serverId}`);

    // TODO: Implement actual backup logic
    await new Promise(resolve => setTimeout(resolve, 5000)); // Simulate work

    return {
      success: true,
      data: { serverId, backupType, backupId: `backup_${Date.now()}` },
    };
  },

  // Cleanup jobs
  async cleanupLogs(job: Job): Promise<JobResult> {
    const { serverId, olderThanDays } = job.data;
    logger.info(`🧹 Cleaning up logs older than ${olderThanDays} days for server ${serverId}`);

    // TODO: Implement actual log cleanup logic
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate work

    return {
      success: true,
      data: { serverId, cleanedFiles: Math.floor(Math.random() * 10) },
    };
  },

  async cleanupTemp(job: Job): Promise<JobResult> {
    const { serverId } = job.data;
    logger.info(`🧹 Cleaning up temporary files for server ${serverId}`);

    // TODO: Implement actual temp cleanup logic
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate work

    return {
      success: true,
      data: { serverId, cleanedFiles: Math.floor(Math.random() * 5) },
    };
  },

  // Notification jobs
  async sendNotification(job: Job): Promise<JobResult> {
    const { userId, type, message } = job.data;
    logger.info(`📧 Sending ${type} notification to user ${userId}`);

    // TODO: Implement actual notification logic
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate work

    return {
      success: true,
      data: { userId, type, messageId: `msg_${Date.now()}` },
    };
  },

  // Data sync jobs
  async syncData(job: Job): Promise<JobResult> {
    const { source, target } = job.data;
    logger.info(`🔄 Syncing data from ${source} to ${target}`);

    // TODO: Implement actual data sync logic
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate work

    return {
      success: true,
      data: { source, target, syncedRecords: Math.floor(Math.random() * 100) },
    };
  },
};

// Initialize job queue manager
export const jobQueueManager = new JobQueueManager();

// Initialize default queues and workers
export async function initializeJobQueues(): Promise<void> {
  try {
    logger.info('🔄 Initializing job queues...');

    // Create server management queue
    const serverQueue = jobQueueManager.createQueue(JOB_QUEUES.SERVER_MANAGEMENT);
    jobQueueManager.createWorker(JOB_QUEUES.SERVER_MANAGEMENT, async (job) => {
      switch (job.name) {
        case JOB_TYPES.START_SERVER:
          return jobProcessors.startServer(job);
        case JOB_TYPES.STOP_SERVER:
          return jobProcessors.stopServer(job);
        case JOB_TYPES.RESTART_SERVER:
          return jobProcessors.restartServer(job);
        default:
          throw new Error(`Unknown job type: ${job.name}`);
      }
    });

    // Create backup queue
    const backupQueue = jobQueueManager.createQueue(JOB_QUEUES.BACKUP);
    jobQueueManager.createWorker(JOB_QUEUES.BACKUP, async (job) => {
      switch (job.name) {
        case JOB_TYPES.BACKUP_SERVER:
          return jobProcessors.backupServer(job);
        default:
          throw new Error(`Unknown job type: ${job.name}`);
      }
    });

    // Create cleanup queue
    const cleanupQueue = jobQueueManager.createQueue(JOB_QUEUES.CLEANUP);
    jobQueueManager.createWorker(JOB_QUEUES.CLEANUP, async (job) => {
      switch (job.name) {
        case JOB_TYPES.CLEANUP_LOGS:
          return jobProcessors.cleanupLogs(job);
        case JOB_TYPES.CLEANUP_TEMP:
          return jobProcessors.cleanupTemp(job);
        default:
          throw new Error(`Unknown job type: ${job.name}`);
      }
    });

    // Create notification queue
    const notificationQueue = jobQueueManager.createQueue(JOB_QUEUES.NOTIFICATION);
    jobQueueManager.createWorker(JOB_QUEUES.NOTIFICATION, async (job) => {
      switch (job.name) {
        case JOB_TYPES.SEND_NOTIFICATION:
          return jobProcessors.sendNotification(job);
        default:
          throw new Error(`Unknown job type: ${job.name}`);
      }
    });

    // Create data sync queue
    const dataSyncQueue = jobQueueManager.createQueue(JOB_QUEUES.DATA_SYNC);
    jobQueueManager.createWorker(JOB_QUEUES.DATA_SYNC, async (job) => {
      switch (job.name) {
        case JOB_TYPES.SYNC_DATA:
          return jobProcessors.syncData(job);
        default:
          throw new Error(`Unknown job type: ${job.name}`);
      }
    });

    logger.info('✅ Job queues initialized successfully');
  } catch (error) {
    logger.error('❌ Failed to initialize job queues:', error);
    throw error;
  }
}

export default jobQueueManager;
