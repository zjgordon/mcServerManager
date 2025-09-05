import React, { useState, useMemo } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { 
  Search, 
  Grid, 
  List, 
  Filter, 
  SortAsc, 
  SortDesc,
  Server,
  Plus
} from 'lucide-react';
import ServerCard from './ServerCard';
import type { Server as ServerType } from '../../types/api';

interface ServerListProps {
  servers: ServerType[];
  onStart: (serverId: number) => void;
  onStop: (serverId: number) => void;
  onDelete: (serverId: number) => void;
  onBackup?: (serverId: number) => void;
  isLoading?: boolean;
  onCreateServer?: () => void;
  onServerSelect?: (server: ServerType) => void;
}

type SortField = 'name' | 'status' | 'version' | 'created_at' | 'memory_mb';
type SortOrder = 'asc' | 'desc';
type ViewMode = 'grid' | 'list';
type StatusFilter = 'all' | 'running' | 'stopped' | 'starting' | 'stopping';

const ServerList: React.FC<ServerListProps> = ({
  servers,
  onStart,
  onStop,
  onDelete,
  onBackup,
  isLoading = false,
  onCreateServer,
  onServerSelect
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const filteredAndSortedServers = useMemo(() => {
    let filtered = servers;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(server =>
        server.server_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        server.version.toLowerCase().includes(searchTerm.toLowerCase()) ||
        server.gamemode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (server.motd && server.motd.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(server => 
        server.status.toLowerCase() === statusFilter.toLowerCase()
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'name':
          aValue = a.server_name.toLowerCase();
          bValue = b.server_name.toLowerCase();
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'version':
          aValue = a.version;
          bValue = b.version;
          break;
        case 'created_at':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        case 'memory_mb':
          aValue = a.memory_mb;
          bValue = b.memory_mb;
          break;
        default:
          aValue = a.server_name.toLowerCase();
          bValue = b.server_name.toLowerCase();
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [servers, searchTerm, sortField, sortOrder, statusFilter]);

  const getStatusCounts = () => {
    const counts = {
      all: servers.length,
      running: 0,
      stopped: 0,
      starting: 0,
      stopping: 0
    };

    servers.forEach(server => {
      counts[server.status.toLowerCase() as keyof typeof counts]++;
    });

    return counts;
  };

  const statusCounts = getStatusCounts();

  const handleSortChange = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  if (servers.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="mx-auto h-24 w-24 bg-muted/50 rounded-full flex items-center justify-center mb-6">
          <Server className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">
          No servers found
        </h3>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          {searchTerm 
            ? `No servers match "${searchTerm}". Try adjusting your search or filters.`
            : 'Get started by creating your first Minecraft server. You can configure all the settings and start playing right away.'
          }
        </p>
        {!searchTerm && onCreateServer && (
          <Button onClick={onCreateServer}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Server
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Servers</h2>
          <p className="text-muted-foreground">
            {filteredAndSortedServers.length} of {servers.length} servers
          </p>
        </div>
        
        {onCreateServer && (
          <Button onClick={onCreateServer}>
            <Plus className="h-4 w-4 mr-2" />
            Create Server
          </Button>
        )}
      </div>

      {/* Filters and Controls */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search servers by name, version, or gamemode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={(value: StatusFilter) => setStatusFilter(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              All Servers ({statusCounts.all})
            </SelectItem>
            <SelectItem value="running">
              Running ({statusCounts.running})
            </SelectItem>
            <SelectItem value="stopped">
              Stopped ({statusCounts.stopped})
            </SelectItem>
            <SelectItem value="starting">
              Starting ({statusCounts.starting})
            </SelectItem>
            <SelectItem value="stopping">
              Stopping ({statusCounts.stopping})
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select value={`${sortField}-${sortOrder}`} onValueChange={(value) => {
          const [field, order] = value.split('-') as [SortField, SortOrder];
          setSortField(field);
          setSortOrder(order);
        }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name-asc">Name (A-Z)</SelectItem>
            <SelectItem value="name-desc">Name (Z-A)</SelectItem>
            <SelectItem value="status-asc">Status</SelectItem>
            <SelectItem value="version-asc">Version</SelectItem>
            <SelectItem value="created_at-desc">Newest First</SelectItem>
            <SelectItem value="created_at-asc">Oldest First</SelectItem>
            <SelectItem value="memory_mb-desc">Memory (High-Low)</SelectItem>
            <SelectItem value="memory_mb-asc">Memory (Low-High)</SelectItem>
          </SelectContent>
        </Select>

        {/* View Mode */}
        <div className="flex items-center space-x-1">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Status Badges */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(statusCounts).map(([status, count]) => {
          if (status === 'all' || count === 0) return null;
          
          const isActive = statusFilter === status;
          return (
            <Badge
              key={status}
              variant={isActive ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setStatusFilter(status as StatusFilter)}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)} ({count})
            </Badge>
          );
        })}
      </div>

      {/* Servers Grid/List */}
      {filteredAndSortedServers.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto h-16 w-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No servers match your criteria
          </h3>
          <p className="text-muted-foreground">
            Try adjusting your search terms or filters to find what you're looking for.
          </p>
        </div>
      ) : (
        <div className={
          viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
            : 'space-y-4'
        }>
          {filteredAndSortedServers.map((server) => (
            <ServerCard
              key={server.id}
              server={server}
              onStart={onStart}
              onStop={onStop}
              onDelete={onDelete}
              onBackup={onBackup}
              isLoading={isLoading}
              viewMode={viewMode}
              onServerSelect={onServerSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ServerList;
