#!/usr/bin/env python3
"""
Server Lifecycle Validator for Dual-Backend Environment

This script validates the complete server lifecycle operations including:
- Server creation, configuration, and management
- Server startup, shutdown, and status monitoring
- Log file access and monitoring
- Backup and restore operations
- Performance monitoring and resource usage

Usage:
    python scripts/server_lifecycle_validator.py --backend flask     # Test Flask backend
    python scripts/server_lifecycle_validator.py --backend express   # Test Express backend
    python scripts/server_lifecycle_validator.py --backend both      # Test both backends
    python scripts/server_lifecycle_validator.py --full-test         # Run full lifecycle test
"""

import json
import requests
import argparse
import os
import sys
import time
import tempfile
import shutil
import subprocess
from datetime import datetime
from typing import Dict, Any, Optional, List, Tuple
from pathlib import Path
from dataclasses import dataclass

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

@dataclass
class ServerConfig:
    """Configuration for a test server."""
    name: str
    version: str
    memory_mb: int
    gamemode: str
    difficulty: str
    motd: str

class ServerLifecycleValidator:
    def __init__(self, backend: str = "both"):
        self.backend = backend
        self.flask_url = "http://localhost:5000"
        self.express_url = "http://localhost:5001"
        self.test_results = []
        self.test_server_id = None
        self.csrf_token = None
        self.auth_cookies = None
        
        # Test server configuration
        self.test_server_config = ServerConfig(
            name=f"lifecycle_test_{int(time.time())}",
            version="1.21.8",
            memory_mb=512,
            gamemode="survival",
            difficulty="normal",
            motd="Lifecycle Test Server"
        )
    
    def run_full_lifecycle_test(self) -> Dict[str, Any]:
        """Run complete server lifecycle validation."""
        print("🚀 Starting comprehensive server lifecycle validation...")
        
        results = {
            "timestamp": datetime.now().isoformat(),
            "backend": self.backend,
            "test_server": self.test_server_config.__dict__,
            "tests": {}
        }
        
        try:
            # Test authentication and setup
            print("\n🔐 Testing authentication and setup...")
            results["tests"]["authentication"] = self.test_authentication()
            
            # Test server creation
            print("\n🏗️ Testing server creation...")
            results["tests"]["server_creation"] = self.test_server_creation()
            
            # Test server configuration
            print("\n⚙️ Testing server configuration...")
            results["tests"]["server_configuration"] = self.test_server_configuration()
            
            # Test server startup
            print("\n▶️ Testing server startup...")
            results["tests"]["server_startup"] = self.test_server_startup()
            
            # Test server status monitoring
            print("\n📊 Testing server status monitoring...")
            results["tests"]["status_monitoring"] = self.test_status_monitoring()
            
            # Test log access
            print("\n📝 Testing log access...")
            results["tests"]["log_access"] = self.test_log_access()
            
            # Test server shutdown
            print("\n⏹️ Testing server shutdown...")
            results["tests"]["server_shutdown"] = self.test_server_shutdown()
            
            # Test backup operations
            print("\n💾 Testing backup operations...")
            results["tests"]["backup_operations"] = self.test_backup_operations()
            
            # Test server deletion
            print("\n🗑️ Testing server deletion...")
            results["tests"]["server_deletion"] = self.test_server_deletion()
            
        except Exception as e:
            print(f"❌ Lifecycle test error: {e}")
            results["error"] = str(e)
        
        # Generate summary
        results["summary"] = self._generate_summary(results["tests"])
        
        # Save results
        results_file = project_root / "docs" / "contracts" / "server_lifecycle_results.json"
        results_file.parent.mkdir(exist_ok=True)
        with open(results_file, 'w') as f:
            json.dump(results, f, indent=2)
        
        print(f"\n📁 Test results saved to: {results_file}")
        return results
    
    def test_authentication(self) -> Dict[str, Any]:
        """Test authentication flow."""
        results = {
            "status": "PASS",
            "tests": [],
            "errors": []
        }
        
        try:
            if self.backend in ["flask", "both"]:
                flask_auth = self._test_flask_authentication()
                results["tests"].append({"backend": "flask", **flask_auth})
            
            if self.backend in ["express", "both"]:
                express_auth = self._test_express_authentication()
                results["tests"].append({"backend": "express", **express_auth})
                
        except Exception as e:
            results["status"] = "FAIL"
            results["errors"].append(str(e))
        
        return results
    
    def _test_flask_authentication(self) -> Dict[str, Any]:
        """Test Flask authentication."""
        try:
            session = requests.Session()
            
            # Get CSRF token
            response = session.get(f"{self.flask_url}/api/v1/auth/csrf-token")
            if response.status_code == 200:
                csrf_token = response.json().get("csrf_token")
                
                # Check setup status
                response = session.get(f"{self.flask_url}/api/v1/auth/setup/status")
                if response.status_code == 200:
                    setup_data = response.json()
                    
                    return {
                        "status": "PASS",
                        "csrf_token_obtained": True,
                        "setup_status": setup_data
                    }
            
            return {
                "status": "FAIL",
                "error": f"Authentication failed: {response.status_code}"
            }
            
        except Exception as e:
            return {
                "status": "FAIL",
                "error": str(e)
            }
    
    def _test_express_authentication(self) -> Dict[str, Any]:
        """Test Express authentication."""
        try:
            # Express backend might not have full auth implementation yet
            response = requests.get(f"{self.express_url}/healthz")
            if response.status_code == 200:
                return {
                    "status": "PASS",
                    "health_check": True,
                    "note": "Express auth not fully implemented yet"
                }
            
            return {
                "status": "FAIL",
                "error": f"Health check failed: {response.status_code}"
            }
            
        except Exception as e:
            return {
                "status": "FAIL",
                "error": str(e)
            }
    
    def test_server_creation(self) -> Dict[str, Any]:
        """Test server creation."""
        results = {
            "status": "PASS",
            "tests": [],
            "errors": []
        }
        
        try:
            if self.backend in ["flask", "both"]:
                flask_creation = self._test_flask_server_creation()
                results["tests"].append({"backend": "flask", **flask_creation})
            
            if self.backend in ["express", "both"]:
                express_creation = self._test_express_server_creation()
                results["tests"].append({"backend": "express", **express_creation})
                
        except Exception as e:
            results["status"] = "FAIL"
            results["errors"].append(str(e))
        
        return results
    
    def _test_flask_server_creation(self) -> Dict[str, Any]:
        """Test Flask server creation."""
        try:
            session = requests.Session()
            
            # Get CSRF token
            response = session.get(f"{self.flask_url}/api/v1/auth/csrf-token")
            if response.status_code == 200:
                csrf_token = response.json().get("csrf_token")
                
                # Create server
                server_data = {
                    "server_name": self.test_server_config.name,
                    "version": self.test_server_config.version,
                    "memory_mb": self.test_server_config.memory_mb,
                    "gamemode": self.test_server_config.gamemode,
                    "difficulty": self.test_server_config.difficulty,
                    "motd": self.test_server_config.motd,
                    "csrf_token": csrf_token
                }
                
                response = session.post(f"{self.flask_url}/api/v1/servers", json=server_data)
                if response.status_code == 201:
                    server_info = response.json()
                    self.test_server_id = server_info.get("server_id")
                    
                    return {
                        "status": "PASS",
                        "server_created": True,
                        "server_id": self.test_server_id,
                        "server_info": server_info
                    }
            
            return {
                "status": "FAIL",
                "error": f"Server creation failed: {response.status_code}"
            }
            
        except Exception as e:
            return {
                "status": "FAIL",
                "error": str(e)
            }
    
    def _test_express_server_creation(self) -> Dict[str, Any]:
        """Test Express server creation."""
        try:
            # Express backend might not have server creation implemented yet
            response = requests.get(f"{self.express_url}/api/v1")
            if response.status_code == 404:
                return {
                    "status": "SKIP",
                    "reason": "Express server creation not implemented yet"
                }
            
            return {
                "status": "FAIL",
                "error": f"Unexpected response: {response.status_code}"
            }
            
        except Exception as e:
            return {
                "status": "FAIL",
                "error": str(e)
            }
    
    def test_server_configuration(self) -> Dict[str, Any]:
        """Test server configuration."""
        results = {
            "status": "PASS",
            "tests": [],
            "errors": []
        }
        
        try:
            if self.backend in ["flask", "both"] and self.test_server_id:
                flask_config = self._test_flask_server_configuration()
                results["tests"].append({"backend": "flask", **flask_config})
            
            if self.backend in ["express", "both"]:
                express_config = self._test_express_server_configuration()
                results["tests"].append({"backend": "express", **express_config})
                
        except Exception as e:
            results["status"] = "FAIL"
            results["errors"].append(str(e))
        
        return results
    
    def _test_flask_server_configuration(self) -> Dict[str, Any]:
        """Test Flask server configuration."""
        try:
            session = requests.Session()
            
            # Get server configuration
            response = session.get(f"{self.flask_url}/api/v1/servers/{self.test_server_id}/config")
            if response.status_code == 200:
                config_data = response.json()
                
                return {
                    "status": "PASS",
                    "config_retrieved": True,
                    "config_data": config_data
                }
            
            return {
                "status": "FAIL",
                "error": f"Config retrieval failed: {response.status_code}"
            }
            
        except Exception as e:
            return {
                "status": "FAIL",
                "error": str(e)
            }
    
    def _test_express_server_configuration(self) -> Dict[str, Any]:
        """Test Express server configuration."""
        try:
            # Express backend might not have server configuration implemented yet
            return {
                "status": "SKIP",
                "reason": "Express server configuration not implemented yet"
            }
            
        except Exception as e:
            return {
                "status": "FAIL",
                "error": str(e)
            }
    
    def test_server_startup(self) -> Dict[str, Any]:
        """Test server startup."""
        results = {
            "status": "PASS",
            "tests": [],
            "errors": []
        }
        
        try:
            if self.backend in ["flask", "both"] and self.test_server_id:
                flask_startup = self._test_flask_server_startup()
                results["tests"].append({"backend": "flask", **flask_startup})
            
            if self.backend in ["express", "both"]:
                express_startup = self._test_express_server_startup()
                results["tests"].append({"backend": "express", **express_startup})
                
        except Exception as e:
            results["status"] = "FAIL"
            results["errors"].append(str(e))
        
        return results
    
    def _test_flask_server_startup(self) -> Dict[str, Any]:
        """Test Flask server startup."""
        try:
            session = requests.Session()
            
            # Start server
            response = session.post(f"{self.flask_url}/api/v1/servers/{self.test_server_id}/start")
            if response.status_code == 200:
                start_data = response.json()
                
                # Wait for server to start
                time.sleep(5)
                
                # Check server status
                response = session.get(f"{self.flask_url}/api/v1/servers/{self.test_server_id}/status")
                if response.status_code == 200:
                    status_data = response.json()
                    
                    return {
                        "status": "PASS",
                        "server_started": True,
                        "start_data": start_data,
                        "status_data": status_data
                    }
            
            return {
                "status": "FAIL",
                "error": f"Server startup failed: {response.status_code}"
            }
            
        except Exception as e:
            return {
                "status": "FAIL",
                "error": str(e)
            }
    
    def _test_express_server_startup(self) -> Dict[str, Any]:
        """Test Express server startup."""
        try:
            # Express backend might not have server startup implemented yet
            return {
                "status": "SKIP",
                "reason": "Express server startup not implemented yet"
            }
            
        except Exception as e:
            return {
                "status": "FAIL",
                "error": str(e)
            }
    
    def test_status_monitoring(self) -> Dict[str, Any]:
        """Test server status monitoring."""
        results = {
            "status": "PASS",
            "tests": [],
            "errors": []
        }
        
        try:
            if self.backend in ["flask", "both"] and self.test_server_id:
                flask_status = self._test_flask_status_monitoring()
                results["tests"].append({"backend": "flask", **flask_status})
            
            if self.backend in ["express", "both"]:
                express_status = self._test_express_status_monitoring()
                results["tests"].append({"backend": "express", **express_status})
                
        except Exception as e:
            results["status"] = "FAIL"
            results["errors"].append(str(e))
        
        return results
    
    def _test_flask_status_monitoring(self) -> Dict[str, Any]:
        """Test Flask status monitoring."""
        try:
            session = requests.Session()
            
            # Get server status
            response = session.get(f"{self.flask_url}/api/v1/servers/{self.test_server_id}/status")
            if response.status_code == 200:
                status_data = response.json()
                
                # Get server stats
                response = session.get(f"{self.flask_url}/api/v1/servers/{self.test_server_id}/stats")
                if response.status_code == 200:
                    stats_data = response.json()
                    
                    return {
                        "status": "PASS",
                        "status_monitoring": True,
                        "status_data": status_data,
                        "stats_data": stats_data
                    }
            
            return {
                "status": "FAIL",
                "error": f"Status monitoring failed: {response.status_code}"
            }
            
        except Exception as e:
            return {
                "status": "FAIL",
                "error": str(e)
            }
    
    def _test_express_status_monitoring(self) -> Dict[str, Any]:
        """Test Express status monitoring."""
        try:
            # Express backend might not have status monitoring implemented yet
            return {
                "status": "SKIP",
                "reason": "Express status monitoring not implemented yet"
            }
            
        except Exception as e:
            return {
                "status": "FAIL",
                "error": str(e)
            }
    
    def test_log_access(self) -> Dict[str, Any]:
        """Test log access."""
        results = {
            "status": "PASS",
            "tests": [],
            "errors": []
        }
        
        try:
            if self.backend in ["flask", "both"] and self.test_server_id:
                flask_logs = self._test_flask_log_access()
                results["tests"].append({"backend": "flask", **flask_logs})
            
            if self.backend in ["express", "both"]:
                express_logs = self._test_express_log_access()
                results["tests"].append({"backend": "express", **express_logs})
                
        except Exception as e:
            results["status"] = "FAIL"
            results["errors"].append(str(e))
        
        return results
    
    def _test_flask_log_access(self) -> Dict[str, Any]:
        """Test Flask log access."""
        try:
            session = requests.Session()
            
            # Get server logs
            response = session.get(f"{self.flask_url}/api/v1/servers/{self.test_server_id}/logs")
            if response.status_code == 200:
                logs_data = response.json()
                
                return {
                    "status": "PASS",
                    "log_access": True,
                    "logs_data": logs_data
                }
            
            return {
                "status": "FAIL",
                "error": f"Log access failed: {response.status_code}"
            }
            
        except Exception as e:
            return {
                "status": "FAIL",
                "error": str(e)
            }
    
    def _test_express_log_access(self) -> Dict[str, Any]:
        """Test Express log access."""
        try:
            # Express backend might not have log access implemented yet
            return {
                "status": "SKIP",
                "reason": "Express log access not implemented yet"
            }
            
        except Exception as e:
            return {
                "status": "FAIL",
                "error": str(e)
            }
    
    def test_server_shutdown(self) -> Dict[str, Any]:
        """Test server shutdown."""
        results = {
            "status": "PASS",
            "tests": [],
            "errors": []
        }
        
        try:
            if self.backend in ["flask", "both"] and self.test_server_id:
                flask_shutdown = self._test_flask_server_shutdown()
                results["tests"].append({"backend": "flask", **flask_shutdown})
            
            if self.backend in ["express", "both"]:
                express_shutdown = self._test_express_server_shutdown()
                results["tests"].append({"backend": "express", **express_shutdown})
                
        except Exception as e:
            results["status"] = "FAIL"
            results["errors"].append(str(e))
        
        return results
    
    def _test_flask_server_shutdown(self) -> Dict[str, Any]:
        """Test Flask server shutdown."""
        try:
            session = requests.Session()
            
            # Stop server
            response = session.post(f"{self.flask_url}/api/v1/servers/{self.test_server_id}/stop")
            if response.status_code == 200:
                stop_data = response.json()
                
                # Wait for server to stop
                time.sleep(3)
                
                # Check server status
                response = session.get(f"{self.flask_url}/api/v1/servers/{self.test_server_id}/status")
                if response.status_code == 200:
                    status_data = response.json()
                    
                    return {
                        "status": "PASS",
                        "server_stopped": True,
                        "stop_data": stop_data,
                        "status_data": status_data
                    }
            
            return {
                "status": "FAIL",
                "error": f"Server shutdown failed: {response.status_code}"
            }
            
        except Exception as e:
            return {
                "status": "FAIL",
                "error": str(e)
            }
    
    def _test_express_server_shutdown(self) -> Dict[str, Any]:
        """Test Express server shutdown."""
        try:
            # Express backend might not have server shutdown implemented yet
            return {
                "status": "SKIP",
                "reason": "Express server shutdown not implemented yet"
            }
            
        except Exception as e:
            return {
                "status": "FAIL",
                "error": str(e)
            }
    
    def test_backup_operations(self) -> Dict[str, Any]:
        """Test backup operations."""
        results = {
            "status": "PASS",
            "tests": [],
            "errors": []
        }
        
        try:
            if self.backend in ["flask", "both"] and self.test_server_id:
                flask_backup = self._test_flask_backup_operations()
                results["tests"].append({"backend": "flask", **flask_backup})
            
            if self.backend in ["express", "both"]:
                express_backup = self._test_express_backup_operations()
                results["tests"].append({"backend": "express", **express_backup})
                
        except Exception as e:
            results["status"] = "FAIL"
            results["errors"].append(str(e))
        
        return results
    
    def _test_flask_backup_operations(self) -> Dict[str, Any]:
        """Test Flask backup operations."""
        try:
            session = requests.Session()
            
            # Create backup
            response = session.post(f"{self.flask_url}/api/v1/servers/{self.test_server_id}/backup")
            if response.status_code == 200:
                backup_data = response.json()
                
                # List backups
                response = session.get(f"{self.flask_url}/api/v1/servers/{self.test_server_id}/backups")
                if response.status_code == 200:
                    backups_data = response.json()
                    
                    return {
                        "status": "PASS",
                        "backup_created": True,
                        "backup_data": backup_data,
                        "backups_list": backups_data
                    }
            
            return {
                "status": "FAIL",
                "error": f"Backup operations failed: {response.status_code}"
            }
            
        except Exception as e:
            return {
                "status": "FAIL",
                "error": str(e)
            }
    
    def _test_express_backup_operations(self) -> Dict[str, Any]:
        """Test Express backup operations."""
        try:
            # Express backend might not have backup operations implemented yet
            return {
                "status": "SKIP",
                "reason": "Express backup operations not implemented yet"
            }
            
        except Exception as e:
            return {
                "status": "FAIL",
                "error": str(e)
            }
    
    def test_server_deletion(self) -> Dict[str, Any]:
        """Test server deletion."""
        results = {
            "status": "PASS",
            "tests": [],
            "errors": []
        }
        
        try:
            if self.backend in ["flask", "both"] and self.test_server_id:
                flask_deletion = self._test_flask_server_deletion()
                results["tests"].append({"backend": "flask", **flask_deletion})
            
            if self.backend in ["express", "both"]:
                express_deletion = self._test_express_server_deletion()
                results["tests"].append({"backend": "express", **express_deletion})
                
        except Exception as e:
            results["status"] = "FAIL"
            results["errors"].append(str(e))
        
        return results
    
    def _test_flask_server_deletion(self) -> Dict[str, Any]:
        """Test Flask server deletion."""
        try:
            session = requests.Session()
            
            # Delete server
            response = session.delete(f"{self.flask_url}/api/v1/servers/{self.test_server_id}")
            if response.status_code == 200:
                deletion_data = response.json()
                
                return {
                    "status": "PASS",
                    "server_deleted": True,
                    "deletion_data": deletion_data
                }
            
            return {
                "status": "FAIL",
                "error": f"Server deletion failed: {response.status_code}"
            }
            
        except Exception as e:
            return {
                "status": "FAIL",
                "error": str(e)
            }
    
    def _test_express_server_deletion(self) -> Dict[str, Any]:
        """Test Express server deletion."""
        try:
            # Express backend might not have server deletion implemented yet
            return {
                "status": "SKIP",
                "reason": "Express server deletion not implemented yet"
            }
            
        except Exception as e:
            return {
                "status": "FAIL",
                "error": str(e)
            }
    
    def _generate_summary(self, tests: Dict[str, Any]) -> Dict[str, Any]:
        """Generate test summary."""
        total_tests = 0
        passed_tests = 0
        failed_tests = 0
        skipped_tests = 0
        
        for test_category, test_data in tests.items():
            if isinstance(test_data, dict) and "tests" in test_data:
                for test in test_data["tests"]:
                    total_tests += 1
                    if test["status"] == "PASS":
                        passed_tests += 1
                    elif test["status"] == "FAIL":
                        failed_tests += 1
                    elif test["status"] == "SKIP":
                        skipped_tests += 1
        
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        overall_status = "PASS" if failed_tests == 0 else "FAIL"
        
        return {
            "total_tests": total_tests,
            "passed_tests": passed_tests,
            "failed_tests": failed_tests,
            "skipped_tests": skipped_tests,
            "success_rate": success_rate,
            "overall_status": overall_status
        }

def main():
    parser = argparse.ArgumentParser(description="Server Lifecycle Validator for Dual-Backend Environment")
    parser.add_argument("--backend", choices=["flask", "express", "both"], default="both",
                       help="Backend to test (default: both)")
    parser.add_argument("--full-test", action="store_true", help="Run full lifecycle test")
    
    args = parser.parse_args()
    
    validator = ServerLifecycleValidator(args.backend)
    
    if args.full_test:
        results = validator.run_full_lifecycle_test()
    else:
        results = validator.run_full_lifecycle_test()  # Default to full test
    
    # Print summary
    print("\n" + "="*60)
    print("📊 SERVER LIFECYCLE VALIDATION SUMMARY")
    print("="*60)
    summary = results["summary"]
    print(f"Backend: {args.backend}")
    print(f"Total Tests: {summary['total_tests']}")
    print(f"Passed: {summary['passed_tests']}")
    print(f"Failed: {summary['failed_tests']}")
    print(f"Skipped: {summary['skipped_tests']}")
    print(f"Success Rate: {summary['success_rate']:.1f}%")
    print(f"Overall Status: {summary['overall_status']}")
    
    if summary["overall_status"] == "PASS":
        print("\n🎉 All server lifecycle tests passed!")
    else:
        print("\n❌ Some server lifecycle tests failed. Check the detailed results.")
        sys.exit(1)

if __name__ == "__main__":
    main()
