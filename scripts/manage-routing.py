#!/usr/bin/env python3

"""
Routing Management Script for Minecraft Server Manager Strangler Pattern
This script manages the gradual migration from Flask to Express.js by updating
Nginx/Caddy configurations to route specific endpoints to the new backend.
"""

import os
import sys
import argparse
import yaml
import json
from pathlib import Path
from typing import Dict, List, Optional
from datetime import datetime

class RoutingManager:
    def __init__(self, config_dir: str = "nginx"):
        self.config_dir = Path(config_dir)
        self.routing_state_file = self.config_dir / "routing-state.json"
        self.routing_state = self.load_routing_state()
        
    def load_routing_state(self) -> Dict:
        """Load current routing state from file"""
        if self.routing_state_file.exists():
            with open(self.routing_state_file, 'r') as f:
                return json.load(f)
        return {
            "phase": 0,
            "migrated_endpoints": [],
            "last_updated": None,
            "migration_history": []
        }
    
    def save_routing_state(self):
        """Save current routing state to file"""
        self.routing_state["last_updated"] = datetime.now().isoformat()
        with open(self.routing_state_file, 'w') as f:
            json.dump(self.routing_state, f, indent=2)
    
    def get_available_phases(self) -> Dict[int, Dict]:
        """Get available migration phases and their endpoints"""
        return {
            0: {
                "name": "Contract Testing & Infrastructure",
                "description": "All endpoints routed to Flask",
                "endpoints": []
            },
            1: {
                "name": "Foundation & Setup",
                "description": "All endpoints routed to Flask",
                "endpoints": []
            },
            2: {
                "name": "API Migration with Contract Testing",
                "description": "Critical endpoints migrated to Express",
                "endpoints": [
                    "/api/v1/auth/*",
                    "/api/v1/servers/*",
                    "/api/v1/admin/*"
                ]
            },
            3: {
                "name": "Process Management & System Integration",
                "description": "Server management endpoints migrated",
                "endpoints": [
                    "/api/v1/auth/*",
                    "/api/v1/servers/*",
                    "/api/v1/admin/*"
                ]
            },
            4: {
                "name": "Real-time & Background Processing",
                "description": "Real-time endpoints added",
                "endpoints": [
                    "/api/v1/auth/*",
                    "/api/v1/servers/*",
                    "/api/v1/admin/*",
                    "/api/v1/servers/*/logs",
                    "/socket.io/*"
                ]
            },
            5: {
                "name": "Production Readiness & Cutover",
                "description": "All endpoints migrated to Express",
                "endpoints": [
                    "/api/v1/*"
                ]
            }
        }
    
    def update_nginx_config(self, phase: int, endpoints: List[str]):
        """Update Nginx configuration for the specified phase"""
        nginx_conf = self.config_dir / "nginx.conf"
        nginx_dev_conf = self.config_dir / "nginx.dev.conf"
        
        for config_file in [nginx_conf, nginx_dev_conf]:
            if not config_file.exists():
                print(f"Warning: {config_file} not found, skipping")
                continue
                
            self._update_nginx_config_file(config_file, phase, endpoints)
    
    def _update_nginx_config_file(self, config_file: Path, phase: int, endpoints: List[str]):
        """Update a specific Nginx configuration file"""
        with open(config_file, 'r') as f:
            content = f.read()
        
        # Update authentication endpoints
        if "/api/v1/auth/*" in endpoints:
            content = self._update_nginx_location_block(
                content, "/api/v1/auth/", "express_backend", "express-dev:5001"
            )
        else:
            content = self._update_nginx_location_block(
                content, "/api/v1/auth/", "flask_backend", "flask-dev:5000"
            )
        
        # Update server management endpoints
        if "/api/v1/servers/*" in endpoints:
            content = self._update_nginx_location_block(
                content, "/api/v1/servers/", "express_backend", "express-dev:5001"
            )
        else:
            content = self._update_nginx_location_block(
                content, "/api/v1/servers/", "flask_backend", "flask-dev:5000"
            )
        
        # Update admin endpoints
        if "/api/v1/admin/*" in endpoints:
            content = self._update_nginx_location_block(
                content, "/api/v1/admin/", "express_backend", "express-dev:5001"
            )
        else:
            content = self._update_nginx_location_block(
                content, "/api/v1/admin/", "flask_backend", "flask-dev:5000"
            )
        
        # Write updated content
        with open(config_file, 'w') as f:
            f.write(content)
        
        print(f"Updated {config_file}")
    
    def _update_nginx_location_block(self, content: str, location: str, 
                                   target_backend: str, target_server: str) -> str:
        """Update a specific location block in Nginx configuration"""
        # Find the location block
        start_marker = f"location {location} {{"
        end_marker = "}"
        
        start_idx = content.find(start_marker)
        if start_idx == -1:
            return content
        
        # Find the end of the location block
        brace_count = 0
        end_idx = start_idx
        for i, char in enumerate(content[start_idx:], start_idx):
            if char == '{':
                brace_count += 1
            elif char == '}':
                brace_count -= 1
                if brace_count == 0:
                    end_idx = i + 1
                    break
        
        # Extract the location block
        location_block = content[start_idx:end_idx]
        
        # Update the proxy_pass directive
        if "proxy_pass http://flask_backend" in location_block:
            location_block = location_block.replace(
                "proxy_pass http://flask_backend",
                f"proxy_pass http://{target_backend}"
            )
        elif "proxy_pass http://express_backend" in location_block:
            location_block = location_block.replace(
                "proxy_pass http://express_backend",
                f"proxy_pass http://{target_backend}"
            )
        
        # Replace the location block in the content
        updated_content = content[:start_idx] + location_block + content[end_idx:]
        return updated_content
    
    def update_caddy_config(self, phase: int, endpoints: List[str]):
        """Update Caddy configuration for the specified phase"""
        caddyfile = self.config_dir.parent / "caddy" / "Caddyfile"
        caddyfile_dev = self.config_dir.parent / "caddy" / "Caddyfile.dev"
        
        for config_file in [caddyfile, caddyfile_dev]:
            if not config_file.exists():
                print(f"Warning: {config_file} not found, skipping")
                continue
                
            self._update_caddy_config_file(config_file, phase, endpoints)
    
    def _update_caddy_config_file(self, config_file: Path, phase: int, endpoints: List[str]):
        """Update a specific Caddy configuration file"""
        with open(config_file, 'r') as f:
            content = f.read()
        
        # Update authentication endpoints
        if "/api/v1/auth/*" in endpoints:
            content = self._update_caddy_handle_block(
                content, "/api/v1/auth/*", "express:5001", "express-dev:5001"
            )
        else:
            content = self._update_caddy_handle_block(
                content, "/api/v1/auth/*", "flask:5000", "flask-dev:5000"
            )
        
        # Update server management endpoints
        if "/api/v1/servers/*" in endpoints:
            content = self._update_caddy_handle_block(
                content, "/api/v1/servers/*", "express:5001", "express-dev:5001"
            )
        else:
            content = self._update_caddy_handle_block(
                content, "/api/v1/servers/*", "flask:5000", "flask-dev:5000"
            )
        
        # Update admin endpoints
        if "/api/v1/admin/*" in endpoints:
            content = self._update_caddy_handle_block(
                content, "/api/v1/admin/*", "express:5001", "express-dev:5001"
            )
        else:
            content = self._update_caddy_handle_block(
                content, "/api/v1/admin/*", "flask:5000", "flask-dev:5000"
            )
        
        # Write updated content
        with open(config_file, 'w') as f:
            f.write(content)
        
        print(f"Updated {config_file}")
    
    def _update_caddy_handle_block(self, content: str, handle_path: str, 
                                 target_server: str, target_server_dev: str) -> str:
        """Update a specific handle block in Caddy configuration"""
        # Find the handle block
        start_marker = f"handle {handle_path} {{"
        end_marker = "}"
        
        start_idx = content.find(start_marker)
        if start_idx == -1:
            return content
        
        # Find the end of the handle block
        brace_count = 0
        end_idx = start_idx
        for i, char in enumerate(content[start_idx:], start_idx):
            if char == '{':
                brace_count += 1
            elif char == '}':
                brace_count -= 1
                if brace_count == 0:
                    end_idx = i + 1
                    break
        
        # Extract the handle block
        handle_block = content[start_idx:end_idx]
        
        # Update the reverse_proxy directive
        if "reverse_proxy flask:" in handle_block:
            handle_block = handle_block.replace(
                "reverse_proxy flask:5000",
                f"reverse_proxy {target_server}"
            )
        elif "reverse_proxy express:" in handle_block:
            handle_block = handle_block.replace(
                "reverse_proxy express:5001",
                f"reverse_proxy {target_server}"
            )
        
        # Replace the handle block in the content
        updated_content = content[:start_idx] + handle_block + content[end_idx:]
        return updated_content
    
    def migrate_to_phase(self, phase: int):
        """Migrate to the specified phase"""
        phases = self.get_available_phases()
        
        if phase not in phases:
            print(f"Error: Phase {phase} not found. Available phases: {list(phases.keys())}")
            return False
        
        phase_info = phases[phase]
        endpoints = phase_info["endpoints"]
        
        print(f"Migrating to Phase {phase}: {phase_info['name']}")
        print(f"Description: {phase_info['description']}")
        print(f"Endpoints to migrate: {endpoints}")
        
        # Update configurations
        self.update_nginx_config(phase, endpoints)
        self.update_caddy_config(phase, endpoints)
        
        # Update routing state
        self.routing_state["phase"] = phase
        self.routing_state["migrated_endpoints"] = endpoints
        self.routing_state["migration_history"].append({
            "phase": phase,
            "endpoints": endpoints,
            "timestamp": datetime.now().isoformat()
        })
        
        self.save_routing_state()
        
        print(f"Successfully migrated to Phase {phase}")
        return True
    
    def rollback_to_phase(self, phase: int):
        """Rollback to the specified phase"""
        phases = self.get_available_phases()
        
        if phase not in phases:
            print(f"Error: Phase {phase} not found. Available phases: {list(phases.keys())}")
            return False
        
        phase_info = phases[phase]
        endpoints = phase_info["endpoints"]
        
        print(f"Rolling back to Phase {phase}: {phase_info['name']}")
        print(f"Description: {phase_info['description']}")
        print(f"Endpoints to rollback: {endpoints}")
        
        # Update configurations
        self.update_nginx_config(phase, endpoints)
        self.update_caddy_config(phase, endpoints)
        
        # Update routing state
        self.routing_state["phase"] = phase
        self.routing_state["migrated_endpoints"] = endpoints
        self.routing_state["migration_history"].append({
            "phase": phase,
            "endpoints": endpoints,
            "timestamp": datetime.now().isoformat(),
            "action": "rollback"
        })
        
        self.save_routing_state()
        
        print(f"Successfully rolled back to Phase {phase}")
        return True
    
    def show_status(self):
        """Show current routing status"""
        phases = self.get_available_phases()
        current_phase = self.routing_state["phase"]
        
        print("=== Routing Status ===")
        print(f"Current Phase: {current_phase}")
        print(f"Phase Name: {phases[current_phase]['name']}")
        print(f"Description: {phases[current_phase]['description']}")
        print(f"Migrated Endpoints: {self.routing_state['migrated_endpoints']}")
        print(f"Last Updated: {self.routing_state['last_updated']}")
        
        print("\n=== Available Phases ===")
        for phase_num, phase_info in phases.items():
            status = "✓" if phase_num == current_phase else " "
            print(f"{status} Phase {phase_num}: {phase_info['name']}")
            print(f"    {phase_info['description']}")
            if phase_info['endpoints']:
                print(f"    Endpoints: {', '.join(phase_info['endpoints'])}")
            print()
    
    def show_history(self):
        """Show migration history"""
        print("=== Migration History ===")
        for entry in self.routing_state["migration_history"]:
            action = entry.get("action", "migrate")
            print(f"{entry['timestamp']}: {action} to Phase {entry['phase']}")
            if entry['endpoints']:
                print(f"  Endpoints: {', '.join(entry['endpoints'])}")
            print()

def main():
    parser = argparse.ArgumentParser(description="Manage routing for strangler pattern migration")
    parser.add_argument("--config-dir", default="nginx", help="Configuration directory")
    
    subparsers = parser.add_subparsers(dest="command", help="Available commands")
    
    # Status command
    subparsers.add_parser("status", help="Show current routing status")
    
    # Migrate command
    migrate_parser = subparsers.add_parser("migrate", help="Migrate to a specific phase")
    migrate_parser.add_argument("phase", type=int, help="Phase number to migrate to")
    
    # Rollback command
    rollback_parser = subparsers.add_parser("rollback", help="Rollback to a specific phase")
    rollback_parser.add_argument("phase", type=int, help="Phase number to rollback to")
    
    # History command
    subparsers.add_parser("history", help="Show migration history")
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    manager = RoutingManager(args.config_dir)
    
    if args.command == "status":
        manager.show_status()
    elif args.command == "migrate":
        manager.migrate_to_phase(args.phase)
    elif args.command == "rollback":
        manager.rollback_to_phase(args.phase)
    elif args.command == "history":
        manager.show_history()

if __name__ == "__main__":
    main()

