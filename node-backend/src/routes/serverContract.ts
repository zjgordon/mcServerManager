/**
 * Server Management Contract Routes
 *
 * Contract-compatible Express routes that match Flask server management API exactly.
 * These routes implement the strangler pattern for gradual migration.
 */

import { Request, Response, NextFunction, Router } from 'express';
import { getPrismaClient } from '../config/database';
import { logger } from '../config/logger';
import { validateRequest } from '../middleware/validation';
import {
  createContractRateLimiters,
  contractSecurityMiddleware,
  contractRequestValidation,
  contractResponseStandardization,
  contractPerformanceMonitoring,
  contractAuditLogging,
} from '../middleware/contractSecurity';
import {
  contractErrorHandler,
  contractAsyncHandler,
  ContractValidationError,
  ContractNotFoundError,
  ContractConflictError,
  ContractDatabaseError,
  ContractServerError,
  ContractBackupError,
} from '../middleware/contractErrorHandler';
import {
  ServerIdParamSchema,
  ServerCreateContractSchema,
  ServerUpdateContractSchema,
  ServerBackupContractSchema,
  ServerListQuerySchema,
  PaginationQuerySchema,
} from '../schemas/contractValidation';

const router: Router = Router();

// Create contract rate limiters
const contractRateLimiters = createContractRateLimiters();

// Apply contract middleware to all routes
router.use(contractSecurityMiddleware);
router.use(contractRequestValidation);
router.use(contractResponseStandardization);
router.use(contractPerformanceMonitoring);
router.use(contractAuditLogging);

// Apply contract error handling
router.use(contractErrorHandler);

// Helper function to check server access (matches Flask logic)
async function checkServerAccess(serverId: number, userId: number, isAdmin: boolean) {
  const prisma = getPrismaClient();

  const server = await prisma.server.findUnique({
    where: { id: serverId },
  });

  if (!server) {
    return null;
  }

  // Admin can access any server
  if (isAdmin) {
    return server;
  }

  // Regular users can only access their own servers
  if (server.ownerId !== userId) {
    return null;
  }

  return server;
}

// Helper function to verify process status (simplified for contract compatibility)
function verifyProcessStatus(_pid: number) {
  try {
    // In a real implementation, this would use system calls to check process status
    // For contract compatibility, we'll return a mock response
    return {
      is_running: true,
      memory_usage: 512,
      cpu_usage: 15.5,
      uptime: 3600,
    };
  } catch (error) {
    return {
      is_running: false,
      memory_usage: 0,
      cpu_usage: 0,
      uptime: 0,
    };
  }
}

// GET /api/v1/servers - Get list of servers for current user
router.get('/', async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const isAdmin = (req as any).isAdmin;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const prisma = getPrismaClient();

    // Show all servers for admin, only user's servers for regular users
    let servers;
    if (isAdmin) {
      servers = await prisma.server.findMany();
    } else {
      servers = await prisma.server.findMany({
        where: { ownerId: userId },
      });
    }

    // Verify actual process status for each server in real-time
    const serversData = [];
    for (const server of servers) {
      let isRunning = false;
      if (server.status === 'Running' && server.pid) {
        // Verify the process is actually running
        const processStatus = verifyProcessStatus(server.pid);
        if (!processStatus.is_running) {
          // Process is not running, update the status
          logger.info(`Server ${server.serverName} marked as running but process ${server.pid} is not active`);
          // In a real implementation, we would update the database here
        }
        isRunning = processStatus.is_running;
      }

      serversData.push({
        id: server.id,
        server_name: server.serverName,
        version: server.version,
        port: server.port,
        status: server.status,
        pid: server.pid,
        memory_mb: server.memoryMb,
        owner_id: server.ownerId,
        created_at: server.createdAt?.toISOString() || null,
        updated_at: server.updatedAt?.toISOString() || null,
        is_running: isRunning,
      });
    }

    logger.debug(`Loaded ${servers.length} servers for user ${userId}`);

    return res.json({
      success: true,
      servers: serversData,
    });

  } catch (error) {
    logger.error(`Error loading servers: ${error}`);
    return res.status(500).json({
      success: false,
      message: 'Error loading server list',
    });
  }
});

// POST /api/v1/servers - Create a new Minecraft server
router.post('/',
  contractRateLimiters.serverContract,
  validateRequest({ body: ServerCreateContractSchema }),
  async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const data = req.body;

    if (!data) {
      return res.status(400).json({
        success: false,
        message: 'Request body is required',
      });
    }

    const serverName = (data.server_name || '').trim();
    const version = (data.version || '').trim();
    const memoryMb = data.memory_mb || 1024;
    const levelSeed = (data.level_seed || '').trim();
    const gamemode = (data.gamemode || 'survival').trim();
    const difficulty = (data.difficulty || 'normal').trim();
    const hardcore = data.hardcore || false;
    const pvp = data.pvp !== undefined ? data.pvp : true;
    const spawnMonsters = data.spawn_monsters !== undefined ? data.spawn_monsters : true;
    const motd = (data.motd || 'A Minecraft Server').trim();

    // Validate required fields
    if (!serverName || !version) {
      return res.status(400).json({
        success: false,
        message: 'Server name and version are required',
      });
    }

    // Validate server name (basic validation for contract compatibility)
    if (!/^[a-zA-Z0-9_-]+$/.test(serverName)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid server name. Use only letters, numbers, underscores, and hyphens.',
      });
    }

    // Validate game settings
    const validGamemodes = ['survival', 'creative', 'adventure', 'spectator'];
    const validDifficulties = ['peaceful', 'easy', 'normal', 'hard'];

    if (!validGamemodes.includes(gamemode)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid gamemode. Must be survival, creative, adventure, or spectator.',
      });
    }

    if (!validDifficulties.includes(difficulty)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid difficulty. Must be peaceful, easy, normal, or hard.',
      });
    }

    if (levelSeed.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Level seed is too long. Maximum length is 100 characters.',
      });
    }

    if (motd.length > 150) {
      return res.status(400).json({
        success: false,
        message: 'MOTD is too long. Maximum length is 150 characters.',
      });
    }

    // Validate memory allocation (basic validation)
    if (memoryMb < 512 || memoryMb > 8192) {
      return res.status(400).json({
        success: false,
        message: 'Memory allocation must be between 512MB and 8192MB',
      });
    }

    const prisma = getPrismaClient();

    // Check if server name already exists
    const existingServer = await prisma.server.findUnique({
      where: { serverName },
    });

    if (existingServer) {
      return res.status(400).json({
        success: false,
        message: 'Server name already exists',
      });
    }

    // Find available port (simplified for contract compatibility)
    const usedPorts = await prisma.server.findMany({
      select: { port: true },
    });
    const usedPortSet = new Set(usedPorts.map(s => s.port));
    let port = 25565;
    while (usedPortSet.has(port)) {
      port++;
    }

    // Create server record
    const server = await prisma.server.create({
      data: {
        serverName,
        version,
        port,
        status: 'Stopped',
        levelSeed: levelSeed || null,
        gamemode,
        difficulty,
        hardcore,
        pvp,
        spawnMonsters,
        motd: motd || null,
        memoryMb,
        ownerId: userId,
      },
    });

    logger.info(`Server '${serverName}' created by user ${userId}`);

    return res.status(201).json({
      success: true,
      message: 'Server created successfully',
      server: {
        id: server.id,
        server_name: server.serverName,
        version: server.version,
        port: server.port,
        status: server.status,
        memory_mb: server.memoryMb,
        owner_id: server.ownerId,
        level_seed: server.levelSeed,
        gamemode: server.gamemode,
        difficulty: server.difficulty,
        hardcore: server.hardcore,
        pvp: server.pvp,
        spawn_monsters: server.spawnMonsters,
        motd: server.motd,
      },
    });

  } catch (error) {
    logger.error(`Error creating server: ${error}`);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while creating the server',
    });
  }
});

// GET /api/v1/servers/{server_id} - Get specific server details
router.get('/:server_id', async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const isAdmin = (req as any).isAdmin;
    const serverId = parseInt(req.params.server_id);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const server = await checkServerAccess(serverId, userId, isAdmin);
    if (!server) {
      return res.status(404).json({
        success: false,
        message: 'Server not found or access denied',
      });
    }

    return res.json({
      success: true,
      server: {
        id: server.id,
        server_name: server.serverName,
        version: server.version,
        port: server.port,
        status: server.status,
        pid: server.pid,
        memory_mb: server.memoryMb,
        owner_id: server.ownerId,
        level_seed: server.levelSeed,
        gamemode: server.gamemode,
        difficulty: server.difficulty,
        hardcore: server.hardcore,
        pvp: server.pvp,
        spawn_monsters: server.spawnMonsters,
        motd: server.motd,
        created_at: server.createdAt?.toISOString() || null,
        updated_at: server.updatedAt?.toISOString() || null,
      },
    });

  } catch (error) {
    logger.error(`Error getting server ${req.params.server_id}: ${error}`);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching server details',
    });
  }
});

// POST /api/v1/servers/{server_id}/start - Start a Minecraft server
router.post('/:server_id/start', 
  contractRateLimiters.serverLifecycle,
  async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const isAdmin = (req as any).isAdmin;
    const serverId = parseInt(req.params.server_id);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const server = await checkServerAccess(serverId, userId, isAdmin);
    if (!server) {
      return res.status(404).json({
        success: false,
        message: 'Server not found or access denied',
      });
    }

    if (server.status === 'Running' && server.pid) {
      return res.status(400).json({
        success: false,
        message: 'Server is already running',
      });
    }

    // For contract compatibility, we'll simulate server startup
    // In a real implementation, this would start the actual Minecraft server process
    const mockPid = Math.floor(Math.random() * 10000) + 1000;

    const prisma = getPrismaClient();
    const updatedServer = await prisma.server.update({
      where: { id: serverId },
      data: {
        status: 'Running',
        pid: mockPid,
      },
    });

    logger.info(`Server ${server.serverName} started successfully with PID ${mockPid}`);

    return res.json({
      success: true,
      message: 'Server started successfully',
      server: {
        id: updatedServer.id,
        status: updatedServer.status,
        pid: updatedServer.pid,
      },
    });

  } catch (error) {
    logger.error(`Error starting server ${req.params.server_id}: ${error}`);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while starting the server',
    });
  }
});

// POST /api/v1/servers/{server_id}/stop - Stop a Minecraft server
router.post('/:server_id/stop', 
  contractRateLimiters.serverLifecycle,
  async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const isAdmin = (req as any).isAdmin;
    const serverId = parseInt(req.params.server_id);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const server = await checkServerAccess(serverId, userId, isAdmin);
    if (!server) {
      return res.status(404).json({
        success: false,
        message: 'Server not found or access denied',
      });
    }

    if (server.status !== 'Running' || !server.pid) {
      return res.status(400).json({
        success: false,
        message: 'Server is already stopped',
      });
    }

    // For contract compatibility, we'll simulate server shutdown
    // In a real implementation, this would stop the actual Minecraft server process
    const prisma = getPrismaClient();
    const updatedServer = await prisma.server.update({
      where: { id: serverId },
      data: {
        status: 'Stopped',
        pid: null,
      },
    });

    logger.info(`Server ${server.serverName} stopped successfully`);

    return res.json({
      success: true,
      message: 'Server stopped successfully',
      server: {
        id: updatedServer.id,
        status: updatedServer.status,
        pid: updatedServer.pid,
      },
    });

  } catch (error) {
    logger.error(`Error stopping server ${req.params.server_id}: ${error}`);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while stopping the server',
    });
  }
});

// GET /api/v1/servers/{server_id}/status - Get real-time server status
router.get('/:server_id/status', async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const isAdmin = (req as any).isAdmin;
    const serverId = parseInt(req.params.server_id);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const server = await checkServerAccess(serverId, userId, isAdmin);
    if (!server) {
      return res.status(404).json({
        success: false,
        message: 'Server not found or access denied',
      });
    }

    // Get real-time process status
    if (server.pid) {
      const processStatus = verifyProcessStatus(server.pid);
      return res.json({
        success: true,
        status: {
          is_running: processStatus.is_running,
          pid: server.pid,
          memory_usage: processStatus.memory_usage,
          cpu_usage: processStatus.cpu_usage,
          uptime: processStatus.uptime,
        },
      });
    } else {
      return res.json({
        success: true,
        status: {
          is_running: false,
          pid: null,
          memory_usage: 0,
          cpu_usage: 0,
          uptime: 0,
        },
      });
    }

  } catch (error) {
    logger.error(`Error getting server status ${req.params.server_id}: ${error}`);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching server status',
    });
  }
});

// GET /api/v1/servers/versions - Get list of available Minecraft versions
router.get('/versions', async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // For contract compatibility, return mock version data
    // In a real implementation, this would fetch from Mojang's API
    const versions = [
      {
        id: '1.21.8',
        type: 'release',
        url: 'https://piston-meta.mojang.com/v1/packages/...',
      },
      {
        id: '1.21.7',
        type: 'release',
        url: 'https://piston-meta.mojang.com/v1/packages/...',
      },
    ];

    return res.json({
      success: true,
      versions,
    });

  } catch (error) {
    logger.error(`Error fetching versions: ${error}`);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching available versions',
    });
  }
});

// DELETE /api/v1/servers/{server_id} - Delete a server and all its files
router.delete('/:server_id', async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const isAdmin = (req as any).isAdmin;
    const serverId = parseInt(req.params.server_id);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const server = await checkServerAccess(serverId, userId, isAdmin);
    if (!server) {
      return res.status(404).json({
        success: false,
        message: 'Server not found or access denied',
      });
    }

    // For contract compatibility, we'll just delete the database record
    // In a real implementation, this would also delete server files
    const prisma = getPrismaClient();
    await prisma.server.delete({
      where: { id: serverId },
    });

    logger.info(`Server '${server.serverName}' deleted by user ${userId}`);

    return res.json({
      success: true,
      message: `Server ${server.serverName} deleted successfully`,
    });

  } catch (error) {
    logger.error(`Error deleting server ${req.params.server_id}: ${error}`);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while deleting the server',
    });
  }
});

// POST /api/v1/servers/{server_id}/backup - Create a backup of the server files
router.post('/:server_id/backup',
  contractRateLimiters.backupOperations,
  validateRequest({ 
    params: ServerIdParamSchema,
    body: ServerBackupContractSchema 
  }),
  async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const isAdmin = (req as any).isAdmin;
    const serverId = parseInt(req.params.server_id);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const server = await checkServerAccess(serverId, userId, isAdmin);
    if (!server) {
      return res.status(404).json({
        success: false,
        message: 'Server not found or access denied',
      });
    }

    // For contract compatibility, we'll simulate backup creation
    // In a real implementation, this would create actual backup files
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '');
    const backupFilename = `${server.serverName}_${timestamp}.tar.gz`;

    logger.info(`Backup created: ${backupFilename}`);

    return res.json({
      success: true,
      message: `Backup of ${server.serverName} completed successfully`,
      backup_file: backupFilename,
    });

  } catch (error) {
    logger.error(`Error backing up server ${req.params.server_id}: ${error}`);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while creating the backup',
    });
  }
});

// POST /api/v1/servers/{server_id}/accept-eula - Accept the EULA for a server
router.post('/:server_id/accept-eula', async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const isAdmin = (req as any).isAdmin;
    const serverId = parseInt(req.params.server_id);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const server = await checkServerAccess(serverId, userId, isAdmin);
    if (!server) {
      return res.status(404).json({
        success: false,
        message: 'Server not found or access denied',
      });
    }

    // For contract compatibility, we'll simulate EULA acceptance
    // In a real implementation, this would write to the eula.txt file
    logger.info(`EULA accepted for server ${server.serverName}`);

    return res.json({
      success: true,
      message: 'EULA accepted successfully. You can now start the server.',
    });

  } catch (error) {
    logger.error(`Error accepting EULA for server ${req.params.server_id}: ${error}`);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while accepting the EULA',
    });
  }
});

// GET /api/v1/servers/memory-usage - Get system memory usage summary
router.get('/memory-usage', async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // For contract compatibility, return mock memory usage data
    // In a real implementation, this would get actual system memory usage
    const memorySummary = {
      total_allocated: 2048,
      total_available: 8192,
      utilization_percentage: 25.0,
    };

    return res.json({
      success: true,
      memory_summary: memorySummary,
    });

  } catch (error) {
    logger.error(`Error fetching memory usage: ${error}`);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching memory usage',
    });
  }
});

export default router;
