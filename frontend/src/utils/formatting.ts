// Formatting utilities for displaying data

export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatMemory = (memoryMB: number): string => {
  if (memoryMB < 1024) {
    return `${memoryMB} MB`;
  }
  return `${(memoryMB / 1024).toFixed(1)} GB`;
};

export const formatDuration = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
};

export const formatUptime = (startTime: string): string => {
  const start = new Date(startTime);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - start.getTime()) / 1000);
  return formatDuration(diffInSeconds);
};

export const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatDateTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatRelativeTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else {
    return formatDate(d);
  }
};

export const formatPercentage = (value: number, total: number): string => {
  if (total === 0) return '0%';
  const percentage = (value / total) * 100;
  return `${percentage.toFixed(1)}%`;
};

export const formatServerStatus = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'running':
      return 'Running';
    case 'stopped':
      return 'Stopped';
    case 'starting':
      return 'Starting';
    case 'stopping':
      return 'Stopping';
    case 'error':
      return 'Error';
    default:
      return status;
  }
};

export const formatGameMode = (gamemode: string): string => {
  switch (gamemode.toLowerCase()) {
    case 'survival':
      return 'Survival';
    case 'creative':
      return 'Creative';
    case 'adventure':
      return 'Adventure';
    case 'spectator':
      return 'Spectator';
    default:
      return gamemode;
  }
};

export const formatDifficulty = (difficulty: string): string => {
  switch (difficulty.toLowerCase()) {
    case 'peaceful':
      return 'Peaceful';
    case 'easy':
      return 'Easy';
    case 'normal':
      return 'Normal';
    case 'hard':
      return 'Hard';
    default:
      return difficulty;
  }
};

export const formatVersion = (version: string): string => {
  // Remove any prefixes like "minecraft-" or "server-"
  return version.replace(/^(minecraft-|server-)/i, '');
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const capitalizeFirst = (text: string): string => {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

export const formatPlayerCount = (current: number, max: number): string => {
  return `${current}/${max}`;
};

export const formatPort = (port: number): string => {
  return port.toString();
};

export const formatMOTD = (motd: string): string => {
  // Remove Minecraft color codes
  return motd.replace(/§[0-9a-fk-or]/gi, '');
};

// Color utilities for status indicators
export const getStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'running':
      return 'text-green-600';
    case 'stopped':
      return 'text-gray-600';
    case 'starting':
      return 'text-yellow-600';
    case 'stopping':
      return 'text-orange-600';
    case 'error':
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
};

export const getStatusBgColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'running':
      return 'bg-green-100';
    case 'stopped':
      return 'bg-gray-100';
    case 'starting':
      return 'bg-yellow-100';
    case 'stopping':
      return 'bg-orange-100';
    case 'error':
      return 'bg-red-100';
    default:
      return 'bg-gray-100';
  }
};

// Progress bar utilities
export const getProgressPercentage = (current: number, max: number): number => {
  if (max === 0) return 0;
  return Math.min((current / max) * 100, 100);
};

export const getProgressColor = (percentage: number): string => {
  if (percentage >= 90) return 'bg-red-500';
  if (percentage >= 75) return 'bg-yellow-500';
  return 'bg-green-500';
};
