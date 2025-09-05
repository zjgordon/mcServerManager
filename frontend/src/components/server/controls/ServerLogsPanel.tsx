import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Alert, AlertDescription } from '../../ui/alert';
import { 
  FileText, 
  Download, 
  RefreshCw, 
  Search, 
  Filter,
  AlertTriangle, 
  Info, 
  Loader2,
  Eye,
  EyeOff,
  Trash2
} from 'lucide-react';
import type { Server as ServerType } from '../../../types/api';

interface ServerLogsPanelProps {
  server: ServerType;
  onLogsUpdate?: (logs: string[]) => void;
}

interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
  raw: string;
}

const ServerLogsPanel: React.FC<ServerLogsPanelProps> = ({
  server,
  onLogsUpdate
}) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [logLevel, setLogLevel] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [showTimestamps, setShowTimestamps] = useState(true);
  const [showLogLevels, setShowLogLevels] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Mock log data - in a real implementation, this would fetch from the API
  const mockLogs = [
    { timestamp: '2024-12-19 10:30:15', level: 'INFO', message: 'Starting minecraft server version 1.21.8', raw: '[10:30:15] [Server thread/INFO]: Starting minecraft server version 1.21.8' },
    { timestamp: '2024-12-19 10:30:16', level: 'INFO', message: 'Loading properties', raw: '[10:30:16] [Server thread/INFO]: Loading properties' },
    { timestamp: '2024-12-19 10:30:17', level: 'INFO', message: 'Default game type: SURVIVAL', raw: '[10:30:17] [Server thread/INFO]: Default game type: SURVIVAL' },
    { timestamp: '2024-12-19 10:30:18', level: 'INFO', message: 'Generating keypair', raw: '[10:30:18] [Server thread/INFO]: Generating keypair' },
    { timestamp: '2024-12-19 10:30:19', level: 'INFO', message: 'Starting Minecraft server on *:25565', raw: '[10:30:19] [Server thread/INFO]: Starting Minecraft server on *:25565' },
    { timestamp: '2024-12-19 10:30:20', level: 'INFO', message: 'Server started', raw: '[10:30:20] [Server thread/INFO]: Server started' },
    { timestamp: '2024-12-19 10:30:21', level: 'INFO', message: 'Done (2.345s)! For help, type "help"', raw: '[10:30:21] [Server thread/INFO]: Done (2.345s)! For help, type "help"' },
    { timestamp: '2024-12-19 10:31:15', level: 'INFO', message: 'Player Steve joined the game', raw: '[10:31:15] [Server thread/INFO]: Player Steve joined the game' },
    { timestamp: '2024-12-19 10:32:30', level: 'WARN', message: 'Player Steve moved too quickly!', raw: '[10:32:30] [Server thread/WARN]: Player Steve moved too quickly!' },
    { timestamp: '2024-12-19 10:33:45', level: 'INFO', message: 'Player Steve left the game', raw: '[10:33:45] [Server thread/INFO]: Player Steve left the game' },
  ];

  useEffect(() => {
    // Simulate loading logs
    setIsLoading(true);
    setTimeout(() => {
      setLogs(mockLogs);
      setIsLoading(false);
    }, 1000);
  }, [server.id]);

  useEffect(() => {
    // Filter logs based on search term and log level
    let filtered = logs;

    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.raw.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (logLevel !== 'all') {
      filtered = filtered.filter(log => log.level === logLevel);
    }

    setFilteredLogs(filtered);
  }, [logs, searchTerm, logLevel]);

  useEffect(() => {
    // Auto-scroll to bottom when new logs arrive
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filteredLogs]);

  useEffect(() => {
    // Auto-refresh functionality
    if (autoRefresh && server.status === 'Running') {
      const interval = setInterval(() => {
        // In a real implementation, this would fetch new logs from the API
        // For now, we'll just simulate new log entries
        if (Math.random() > 0.7) {
          const newLog: LogEntry = {
            timestamp: new Date().toLocaleString(),
            level: 'INFO',
            message: 'Server heartbeat - all systems operational',
            raw: `[${new Date().toLocaleTimeString()}] [Server thread/INFO]: Server heartbeat - all systems operational`
          };
          setLogs(prev => [...prev, newLog]);
        }
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [autoRefresh, server.status]);

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => {
      // In a real implementation, this would fetch fresh logs from the API
      setLogs(mockLogs);
      setIsLoading(false);
    }, 1000);
  };

  const handleClearLogs = () => {
    setLogs([]);
    setFilteredLogs([]);
  };

  const handleDownloadLogs = () => {
    const logContent = filteredLogs.map(log => log.raw).join('\n');
    const blob = new Blob([logContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${server.server_name}_logs_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'WARN':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'INFO':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'DEBUG':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileText className="h-5 w-5" />
          <span>Server Logs</span>
        </CardTitle>
        <CardDescription>
          Monitor your server's log output and activity
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Label htmlFor="search">Search Logs</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Search log messages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="sm:w-48">
            <Label htmlFor="logLevel">Log Level</Label>
            <select
              id="logLevel"
              value={logLevel}
              onChange={(e) => setLogLevel(e.target.value)}
              className="w-full p-2 border border-input bg-background rounded-md"
            >
              <option value="all">All Levels</option>
              <option value="ERROR">Error</option>
              <option value="WARN">Warning</option>
              <option value="INFO">Info</option>
              <option value="DEBUG">Debug</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'bg-green-50 text-green-700 border-green-200' : ''}
          >
            <Eye className="h-4 w-4 mr-2" />
            Auto Refresh
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTimestamps(!showTimestamps)}
          >
            {showTimestamps ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
            Timestamps
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowLogLevels(!showLogLevels)}
          >
            {showLogLevels ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
            Log Levels
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadLogs}
            disabled={filteredLogs.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearLogs}
            disabled={logs.length === 0}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear
          </Button>
        </div>

        {/* Log Display */}
        <div className="border rounded-lg">
          <div className="bg-muted/50 px-4 py-2 border-b">
            <div className="flex justify-between items-center text-sm">
              <span className="font-medium">
                {filteredLogs.length} log entries
                {searchTerm && ` (filtered from ${logs.length})`}
              </span>
              {autoRefresh && (
                <span className="text-green-600 flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Live</span>
                </span>
              )}
            </div>
          </div>
          
          <div className="h-96 overflow-y-auto p-4 font-mono text-sm">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Loading logs...</span>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No logs found</p>
                  {searchTerm && (
                    <p className="text-xs mt-1">Try adjusting your search or filter</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredLogs.map((log, index) => (
                  <div
                    key={index}
                    className="flex items-start space-x-2 py-1 hover:bg-muted/50 rounded px-2 -mx-2"
                  >
                    {showLogLevels && (
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${getLogLevelColor(log.level)}`}>
                        {log.level}
                      </span>
                    )}
                    {showTimestamps && (
                      <span className="text-muted-foreground text-xs whitespace-nowrap">
                        {log.timestamp}
                      </span>
                    )}
                    <span className="flex-1 break-words">
                      {log.message}
                    </span>
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Log Information */}
        <div className="pt-4 border-t">
          <h4 className="font-medium mb-2 flex items-center space-x-2">
            <Info className="h-4 w-4" />
            <span>Log Information</span>
          </h4>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>• Logs are displayed in real-time when the server is running</p>
            <p>• Use the search function to find specific log entries</p>
            <p>• Filter by log level to focus on errors or warnings</p>
            <p>• Auto-refresh updates logs every 5 seconds when enabled</p>
            <p>• Downloaded logs include all filtered entries</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ServerLogsPanel;
