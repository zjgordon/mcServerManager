"""
Production Backup and Recovery System for Minecraft Server Manager

This module provides comprehensive backup and recovery capabilities for production
deployment of the Minecraft Server Manager application.
"""

import os
import sys
import time
import json
import shutil
import sqlite3
import tarfile
import gzip
import hashlib
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

# Add the parent directory to the path to import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class BackupType(Enum):
    """Backup type enumeration."""
    FULL = "full"
    INCREMENTAL = "incremental"
    DIFFERENTIAL = "differential"
    DATABASE_ONLY = "database_only"
    SERVERS_ONLY = "servers_only"
    CONFIG_ONLY = "config_only"


class BackupStatus(Enum):
    """Backup status enumeration."""
    SUCCESS = "success"
    FAILED = "failed"
    IN_PROGRESS = "in_progress"
    PARTIAL = "partial"


@dataclass
class BackupInfo:
    """Backup information data class."""
    backup_id: str
    backup_type: BackupType
    status: BackupStatus
    timestamp: datetime
    size_bytes: int
    checksum: str
    description: str
    files: List[str]
    metadata: Dict[str, Any]


class ProductionBackupManager:
    """Production backup and recovery manager."""
    
    def __init__(self, app_dir: str = None, backup_dir: str = None):
        self.app_dir = app_dir or os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.backup_dir = backup_dir or os.path.join(self.app_dir, 'backups')
        self.backup_index_file = os.path.join(self.backup_dir, 'backup_index.json')
        self.backup_index = self._load_backup_index()
        
        # Create backup directory if it doesn't exist
        os.makedirs(self.backup_dir, exist_ok=True)
    
    def _load_backup_index(self) -> Dict[str, Any]:
        """Load backup index from file."""
        if os.path.exists(self.backup_index_file):
            try:
                with open(self.backup_index_file, 'r') as f:
                    return json.load(f)
            except Exception:
                pass
        return {"backups": [], "last_full_backup": None, "last_incremental_backup": None}
    
    def _save_backup_index(self):
        """Save backup index to file."""
        try:
            with open(self.backup_index_file, 'w') as f:
                json.dump(self.backup_index, f, indent=2, default=str)
        except Exception as e:
            print(f"Error saving backup index: {e}")
    
    def _generate_backup_id(self) -> str:
        """Generate unique backup ID."""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        return f"backup_{timestamp}"
    
    def _calculate_checksum(self, file_path: str) -> str:
        """Calculate SHA256 checksum of a file."""
        sha256_hash = hashlib.sha256()
        try:
            with open(file_path, "rb") as f:
                for byte_block in iter(lambda: f.read(4096), b""):
                    sha256_hash.update(byte_block)
            return sha256_hash.hexdigest()
        except Exception:
            return ""
    
    def _get_file_size(self, file_path: str) -> int:
        """Get file size in bytes."""
        try:
            return os.path.getsize(file_path)
        except Exception:
            return 0
    
    def _compress_file(self, source_path: str, target_path: str) -> bool:
        """Compress a file using gzip."""
        try:
            with open(source_path, 'rb') as f_in:
                with gzip.open(target_path, 'wb') as f_out:
                    shutil.copyfileobj(f_in, f_out)
            return True
        except Exception as e:
            print(f"Error compressing file {source_path}: {e}")
            return False
    
    def _decompress_file(self, source_path: str, target_path: str) -> bool:
        """Decompress a gzip file."""
        try:
            with gzip.open(source_path, 'rb') as f_in:
                with open(target_path, 'wb') as f_out:
                    shutil.copyfileobj(f_in, f_out)
            return True
        except Exception as e:
            print(f"Error decompressing file {source_path}: {e}")
            return False
    
    def create_full_backup(self, description: str = None) -> BackupInfo:
        """Create a full backup of the entire application."""
        backup_id = self._generate_backup_id()
        backup_path = os.path.join(self.backup_dir, f"{backup_id}.tar.gz")
        
        print(f"Creating full backup: {backup_id}")
        
        try:
            with tarfile.open(backup_path, 'w:gz') as tar:
                # Add database
                db_path = os.path.join(self.app_dir, 'instance', 'minecraft_manager.db')
                if os.path.exists(db_path):
                    tar.add(db_path, arcname='instance/minecraft_manager.db')
                
                # Add configuration files
                config_files = ['config.json', 'requirements.txt', 'run.py']
                for config_file in config_files:
                    config_path = os.path.join(self.app_dir, config_file)
                    if os.path.exists(config_path):
                        tar.add(config_path, arcname=config_file)
                
                # Add server files (without world data to save space)
                servers_dir = os.path.join(self.app_dir, 'servers')
                if os.path.exists(servers_dir):
                    for server_name in os.listdir(servers_dir):
                        server_path = os.path.join(servers_dir, server_name)
                        if os.path.isdir(server_path):
                            # Add server configuration files only
                            config_files = ['server.properties', 'eula.txt', 'ops.json', 'whitelist.json']
                            for config_file in config_files:
                                config_path = os.path.join(server_path, config_file)
                                if os.path.exists(config_path):
                                    tar.add(config_path, arcname=f'servers/{server_name}/{config_file}')
                
                # Add logs (last 7 days only)
                logs_dir = os.path.join(self.app_dir, 'logs')
                if os.path.exists(logs_dir):
                    cutoff_date = datetime.now() - timedelta(days=7)
                    for log_file in os.listdir(logs_dir):
                        log_path = os.path.join(logs_dir, log_file)
                        if os.path.isfile(log_path):
                            file_time = datetime.fromtimestamp(os.path.getmtime(log_path))
                            if file_time > cutoff_date:
                                tar.add(log_path, arcname=f'logs/{log_file}')
            
            # Calculate backup info
            backup_size = self._get_file_size(backup_path)
            backup_checksum = self._calculate_checksum(backup_path)
            
            backup_info = BackupInfo(
                backup_id=backup_id,
                backup_type=BackupType.FULL,
                status=BackupStatus.SUCCESS,
                timestamp=datetime.now(),
                size_bytes=backup_size,
                checksum=backup_checksum,
                description=description or "Full backup",
                files=[backup_path],
                metadata={
                    "compression": "gzip",
                    "format": "tar.gz",
                    "app_dir": self.app_dir
                }
            )
            
            # Update backup index
            self.backup_index["backups"].append(backup_info.__dict__)
            self.backup_index["last_full_backup"] = backup_id
            self._save_backup_index()
            
            print(f"Full backup completed: {backup_id} ({backup_size / 1024 / 1024:.2f} MB)")
            return backup_info
            
        except Exception as e:
            print(f"Error creating full backup: {e}")
            backup_info = BackupInfo(
                backup_id=backup_id,
                backup_type=BackupType.FULL,
                status=BackupStatus.FAILED,
                timestamp=datetime.now(),
                size_bytes=0,
                checksum="",
                description=description or "Full backup (failed)",
                files=[],
                metadata={"error": str(e)}
            )
            return backup_info
    
    def create_database_backup(self, description: str = None) -> BackupInfo:
        """Create a database-only backup."""
        backup_id = self._generate_backup_id()
        backup_path = os.path.join(self.backup_dir, f"{backup_id}_database.db.gz")
        
        print(f"Creating database backup: {backup_id}")
        
        try:
            db_path = os.path.join(self.app_dir, 'instance', 'minecraft_manager.db')
            if not os.path.exists(db_path):
                raise FileNotFoundError("Database file not found")
            
            # Compress database file
            if not self._compress_file(db_path, backup_path):
                raise Exception("Failed to compress database file")
            
            # Calculate backup info
            backup_size = self._get_file_size(backup_path)
            backup_checksum = self._calculate_checksum(backup_path)
            
            backup_info = BackupInfo(
                backup_id=backup_id,
                backup_type=BackupType.DATABASE_ONLY,
                status=BackupStatus.SUCCESS,
                timestamp=datetime.now(),
                size_bytes=backup_size,
                checksum=backup_checksum,
                description=description or "Database backup",
                files=[backup_path],
                metadata={
                    "compression": "gzip",
                    "format": "db.gz",
                    "original_db_path": db_path
                }
            )
            
            # Update backup index
            self.backup_index["backups"].append(backup_info.__dict__)
            self._save_backup_index()
            
            print(f"Database backup completed: {backup_id} ({backup_size / 1024:.2f} KB)")
            return backup_info
            
        except Exception as e:
            print(f"Error creating database backup: {e}")
            backup_info = BackupInfo(
                backup_id=backup_id,
                backup_type=BackupType.DATABASE_ONLY,
                status=BackupStatus.FAILED,
                timestamp=datetime.now(),
                size_bytes=0,
                checksum="",
                description=description or "Database backup (failed)",
                files=[],
                metadata={"error": str(e)}
            )
            return backup_info
    
    def create_servers_backup(self, description: str = None) -> BackupInfo:
        """Create a servers-only backup."""
        backup_id = self._generate_backup_id()
        backup_path = os.path.join(self.backup_dir, f"{backup_id}_servers.tar.gz")
        
        print(f"Creating servers backup: {backup_id}")
        
        try:
            with tarfile.open(backup_path, 'w:gz') as tar:
                servers_dir = os.path.join(self.app_dir, 'servers')
                if os.path.exists(servers_dir):
                    tar.add(servers_dir, arcname='servers')
            
            # Calculate backup info
            backup_size = self._get_file_size(backup_path)
            backup_checksum = self._calculate_checksum(backup_path)
            
            backup_info = BackupInfo(
                backup_id=backup_id,
                backup_type=BackupType.SERVERS_ONLY,
                status=BackupStatus.SUCCESS,
                timestamp=datetime.now(),
                size_bytes=backup_size,
                checksum=backup_checksum,
                description=description or "Servers backup",
                files=[backup_path],
                metadata={
                    "compression": "gzip",
                    "format": "tar.gz",
                    "servers_dir": servers_dir
                }
            )
            
            # Update backup index
            self.backup_index["backups"].append(backup_info.__dict__)
            self._save_backup_index()
            
            print(f"Servers backup completed: {backup_id} ({backup_size / 1024 / 1024:.2f} MB)")
            return backup_info
            
        except Exception as e:
            print(f"Error creating servers backup: {e}")
            backup_info = BackupInfo(
                backup_id=backup_id,
                backup_type=BackupType.SERVERS_ONLY,
                status=BackupStatus.FAILED,
                timestamp=datetime.now(),
                size_bytes=0,
                checksum="",
                description=description or "Servers backup (failed)",
                files=[],
                metadata={"error": str(e)}
            )
            return backup_info
    
    def create_config_backup(self, description: str = None) -> BackupInfo:
        """Create a configuration-only backup."""
        backup_id = self._generate_backup_id()
        backup_path = os.path.join(self.backup_dir, f"{backup_id}_config.tar.gz")
        
        print(f"Creating config backup: {backup_id}")
        
        try:
            with tarfile.open(backup_path, 'w:gz') as tar:
                # Add configuration files
                config_files = [
                    'config.json',
                    'requirements.txt',
                    'run.py',
                    'config/production.py',
                    'scripts/deploy.sh'
                ]
                
                for config_file in config_files:
                    config_path = os.path.join(self.app_dir, config_file)
                    if os.path.exists(config_path):
                        tar.add(config_path, arcname=config_file)
                
                # Add environment files
                env_files = ['.env', '.env.production', '.env.local']
                for env_file in env_files:
                    env_path = os.path.join(self.app_dir, env_file)
                    if os.path.exists(env_path):
                        tar.add(env_path, arcname=env_file)
            
            # Calculate backup info
            backup_size = self._get_file_size(backup_path)
            backup_checksum = self._calculate_checksum(backup_path)
            
            backup_info = BackupInfo(
                backup_id=backup_id,
                backup_type=BackupType.CONFIG_ONLY,
                status=BackupStatus.SUCCESS,
                timestamp=datetime.now(),
                size_bytes=backup_size,
                checksum=backup_checksum,
                description=description or "Configuration backup",
                files=[backup_path],
                metadata={
                    "compression": "gzip",
                    "format": "tar.gz",
                    "config_files": config_files
                }
            )
            
            # Update backup index
            self.backup_index["backups"].append(backup_info.__dict__)
            self._save_backup_index()
            
            print(f"Config backup completed: {backup_id} ({backup_size / 1024:.2f} KB)")
            return backup_info
            
        except Exception as e:
            print(f"Error creating config backup: {e}")
            backup_info = BackupInfo(
                backup_id=backup_id,
                backup_type=BackupType.CONFIG_ONLY,
                status=BackupStatus.FAILED,
                timestamp=datetime.now(),
                size_bytes=0,
                checksum="",
                description=description or "Configuration backup (failed)",
                files=[],
                metadata={"error": str(e)}
            )
            return backup_info
    
    def restore_backup(self, backup_id: str, restore_path: str = None) -> bool:
        """Restore a backup."""
        print(f"Restoring backup: {backup_id}")
        
        # Find backup in index
        backup_info = None
        for backup in self.backup_index["backups"]:
            if backup["backup_id"] == backup_id:
                backup_info = backup
                break
        
        if not backup_info:
            print(f"Backup {backup_id} not found in index")
            return False
        
        if backup_info["status"] != "success":
            print(f"Backup {backup_id} is not in success status")
            return False
        
        try:
            if backup_info["backup_type"] == "full":
                return self._restore_full_backup(backup_info, restore_path)
            elif backup_info["backup_type"] == "database_only":
                return self._restore_database_backup(backup_info, restore_path)
            elif backup_info["backup_type"] == "servers_only":
                return self._restore_servers_backup(backup_info, restore_path)
            elif backup_info["backup_type"] == "config_only":
                return self._restore_config_backup(backup_info, restore_path)
            else:
                print(f"Unknown backup type: {backup_info['backup_type']}")
                return False
                
        except Exception as e:
            print(f"Error restoring backup {backup_id}: {e}")
            return False
    
    def _restore_full_backup(self, backup_info: Dict[str, Any], restore_path: str = None) -> bool:
        """Restore a full backup."""
        backup_file = backup_info["files"][0]
        if not os.path.exists(backup_file):
            print(f"Backup file not found: {backup_file}")
            return False
        
        target_path = restore_path or self.app_dir
        
        try:
            with tarfile.open(backup_file, 'r:gz') as tar:
                tar.extractall(target_path)
            
            print(f"Full backup restored to: {target_path}")
            return True
            
        except Exception as e:
            print(f"Error restoring full backup: {e}")
            return False
    
    def _restore_database_backup(self, backup_info: Dict[str, Any], restore_path: str = None) -> bool:
        """Restore a database backup."""
        backup_file = backup_info["files"][0]
        if not os.path.exists(backup_file):
            print(f"Backup file not found: {backup_file}")
            return False
        
        target_path = restore_path or os.path.join(self.app_dir, 'instance', 'minecraft_manager.db')
        
        try:
            # Create target directory if it doesn't exist
            os.makedirs(os.path.dirname(target_path), exist_ok=True)
            
            # Decompress database file
            if not self._decompress_file(backup_file, target_path):
                return False
            
            print(f"Database backup restored to: {target_path}")
            return True
            
        except Exception as e:
            print(f"Error restoring database backup: {e}")
            return False
    
    def _restore_servers_backup(self, backup_info: Dict[str, Any], restore_path: str = None) -> bool:
        """Restore a servers backup."""
        backup_file = backup_info["files"][0]
        if not os.path.exists(backup_file):
            print(f"Backup file not found: {backup_file}")
            return False
        
        target_path = restore_path or self.app_dir
        
        try:
            with tarfile.open(backup_file, 'r:gz') as tar:
                tar.extractall(target_path)
            
            print(f"Servers backup restored to: {target_path}")
            return True
            
        except Exception as e:
            print(f"Error restoring servers backup: {e}")
            return False
    
    def _restore_config_backup(self, backup_info: Dict[str, Any], restore_path: str = None) -> bool:
        """Restore a configuration backup."""
        backup_file = backup_info["files"][0]
        if not os.path.exists(backup_file):
            print(f"Backup file not found: {backup_file}")
            return False
        
        target_path = restore_path or self.app_dir
        
        try:
            with tarfile.open(backup_file, 'r:gz') as tar:
                tar.extractall(target_path)
            
            print(f"Config backup restored to: {target_path}")
            return True
            
        except Exception as e:
            print(f"Error restoring config backup: {e}")
            return False
    
    def list_backups(self) -> List[Dict[str, Any]]:
        """List all available backups."""
        return self.backup_index["backups"]
    
    def get_backup_info(self, backup_id: str) -> Optional[Dict[str, Any]]:
        """Get information about a specific backup."""
        for backup in self.backup_index["backups"]:
            if backup["backup_id"] == backup_id:
                return backup
        return None
    
    def delete_backup(self, backup_id: str) -> bool:
        """Delete a backup."""
        print(f"Deleting backup: {backup_id}")
        
        # Find backup in index
        backup_info = None
        for i, backup in enumerate(self.backup_index["backups"]):
            if backup["backup_id"] == backup_id:
                backup_info = backup
                del self.backup_index["backups"][i]
                break
        
        if not backup_info:
            print(f"Backup {backup_id} not found in index")
            return False
        
        try:
            # Delete backup files
            for file_path in backup_info["files"]:
                if os.path.exists(file_path):
                    os.remove(file_path)
                    print(f"Deleted file: {file_path}")
            
            # Update backup index
            self._save_backup_index()
            
            print(f"Backup {backup_id} deleted successfully")
            return True
            
        except Exception as e:
            print(f"Error deleting backup {backup_id}: {e}")
            return False
    
    def cleanup_old_backups(self, retention_days: int = 30) -> int:
        """Clean up old backups based on retention policy."""
        print(f"Cleaning up backups older than {retention_days} days")
        
        cutoff_date = datetime.now() - timedelta(days=retention_days)
        deleted_count = 0
        
        backups_to_delete = []
        for backup in self.backup_index["backups"]:
            backup_date = datetime.fromisoformat(backup["timestamp"].replace('Z', '+00:00'))
            if backup_date < cutoff_date:
                backups_to_delete.append(backup["backup_id"])
        
        for backup_id in backups_to_delete:
            if self.delete_backup(backup_id):
                deleted_count += 1
        
        print(f"Deleted {deleted_count} old backups")
        return deleted_count
    
    def verify_backup(self, backup_id: str) -> bool:
        """Verify backup integrity."""
        backup_info = self.get_backup_info(backup_id)
        if not backup_info:
            print(f"Backup {backup_id} not found")
            return False
        
        print(f"Verifying backup: {backup_id}")
        
        try:
            for file_path in backup_info["files"]:
                if not os.path.exists(file_path):
                    print(f"Backup file not found: {file_path}")
                    return False
                
                # Verify checksum
                current_checksum = self._calculate_checksum(file_path)
                if current_checksum != backup_info["checksum"]:
                    print(f"Checksum mismatch for {file_path}")
                    return False
            
            print(f"Backup {backup_id} verification successful")
            return True
            
        except Exception as e:
            print(f"Error verifying backup {backup_id}: {e}")
            return False
    
    def generate_backup_report(self) -> Dict[str, Any]:
        """Generate a comprehensive backup report."""
        total_backups = len(self.backup_index["backups"])
        successful_backups = len([b for b in self.backup_index["backups"] if b["status"] == "success"])
        failed_backups = total_backups - successful_backups
        
        total_size = sum(b["size_bytes"] for b in self.backup_index["backups"] if b["status"] == "success")
        
        backup_types = {}
        for backup in self.backup_index["backups"]:
            backup_type = backup["backup_type"]
            backup_types[backup_type] = backup_types.get(backup_type, 0) + 1
        
        return {
            "total_backups": total_backups,
            "successful_backups": successful_backups,
            "failed_backups": failed_backups,
            "total_size_bytes": total_size,
            "total_size_mb": total_size / 1024 / 1024,
            "backup_types": backup_types,
            "last_full_backup": self.backup_index.get("last_full_backup"),
            "last_incremental_backup": self.backup_index.get("last_incremental_backup"),
            "backup_directory": self.backup_dir,
            "index_file": self.backup_index_file
        }


def main():
    """Main function for backup management."""
    if len(sys.argv) < 2:
        print("Usage: python production_backup.py <command> [options]")
        print("Commands:")
        print("  create-full [description]     - Create full backup")
        print("  create-database [description] - Create database backup")
        print("  create-servers [description]  - Create servers backup")
        print("  create-config [description]   - Create config backup")
        print("  restore <backup_id> [path]    - Restore backup")
        print("  list                          - List all backups")
        print("  info <backup_id>              - Get backup info")
        print("  delete <backup_id>            - Delete backup")
        print("  verify <backup_id>            - Verify backup")
        print("  cleanup [days]                - Cleanup old backups")
        print("  report                        - Generate backup report")
        return
    
    command = sys.argv[1]
    backup_manager = ProductionBackupManager()
    
    if command == "create-full":
        description = sys.argv[2] if len(sys.argv) > 2 else None
        backup_info = backup_manager.create_full_backup(description)
        print(f"Backup created: {backup_info.backup_id}")
        
    elif command == "create-database":
        description = sys.argv[2] if len(sys.argv) > 2 else None
        backup_info = backup_manager.create_database_backup(description)
        print(f"Backup created: {backup_info.backup_id}")
        
    elif command == "create-servers":
        description = sys.argv[2] if len(sys.argv) > 2 else None
        backup_info = backup_manager.create_servers_backup(description)
        print(f"Backup created: {backup_info.backup_id}")
        
    elif command == "create-config":
        description = sys.argv[2] if len(sys.argv) > 2 else None
        backup_info = backup_manager.create_config_backup(description)
        print(f"Backup created: {backup_info.backup_id}")
        
    elif command == "restore":
        if len(sys.argv) < 3:
            print("Error: backup_id required for restore command")
            return
        backup_id = sys.argv[2]
        restore_path = sys.argv[3] if len(sys.argv) > 3 else None
        success = backup_manager.restore_backup(backup_id, restore_path)
        print(f"Restore {'successful' if success else 'failed'}")
        
    elif command == "list":
        backups = backup_manager.list_backups()
        print(f"Total backups: {len(backups)}")
        for backup in backups:
            status_emoji = "✅" if backup["status"] == "success" else "❌"
            size_mb = backup["size_bytes"] / 1024 / 1024
            print(f"  {status_emoji} {backup['backup_id']} ({backup['backup_type']}) - {size_mb:.2f} MB - {backup['timestamp']}")
        
    elif command == "info":
        if len(sys.argv) < 3:
            print("Error: backup_id required for info command")
            return
        backup_id = sys.argv[2]
        backup_info = backup_manager.get_backup_info(backup_id)
        if backup_info:
            print(f"Backup ID: {backup_info['backup_id']}")
            print(f"Type: {backup_info['backup_type']}")
            print(f"Status: {backup_info['status']}")
            print(f"Timestamp: {backup_info['timestamp']}")
            print(f"Size: {backup_info['size_bytes'] / 1024 / 1024:.2f} MB")
            print(f"Description: {backup_info['description']}")
        else:
            print(f"Backup {backup_id} not found")
        
    elif command == "delete":
        if len(sys.argv) < 3:
            print("Error: backup_id required for delete command")
            return
        backup_id = sys.argv[2]
        success = backup_manager.delete_backup(backup_id)
        print(f"Delete {'successful' if success else 'failed'}")
        
    elif command == "verify":
        if len(sys.argv) < 3:
            print("Error: backup_id required for verify command")
            return
        backup_id = sys.argv[2]
        success = backup_manager.verify_backup(backup_id)
        print(f"Verification {'successful' if success else 'failed'}")
        
    elif command == "cleanup":
        retention_days = int(sys.argv[2]) if len(sys.argv) > 2 else 30
        deleted_count = backup_manager.cleanup_old_backups(retention_days)
        print(f"Cleaned up {deleted_count} old backups")
        
    elif command == "report":
        report = backup_manager.generate_backup_report()
        print("Backup Report:")
        print(f"  Total backups: {report['total_backups']}")
        print(f"  Successful: {report['successful_backups']}")
        print(f"  Failed: {report['failed_backups']}")
        print(f"  Total size: {report['total_size_mb']:.2f} MB")
        print(f"  Last full backup: {report['last_full_backup']}")
        print(f"  Backup directory: {report['backup_directory']}")
        
    else:
        print(f"Unknown command: {command}")


if __name__ == '__main__':
    main()
