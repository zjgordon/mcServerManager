#!/usr/bin/env python3
"""
Smoke Test CLI for Server Lifecycle Validation

This script validates the complete server lifecycle operations
to ensure the system is working correctly before and after migration.

Usage:
    python scripts/smoke_test_cli.py --test-auth          # Test authentication flow
    python scripts/smoke_test_cli.py --test-server-lifecycle  # Test server operations
    python scripts/smoke_test_cli.py --test-admin         # Test admin operations
    python scripts/smoke_test_cli.py --test-all           # Run all tests
    python scripts/smoke_test_cli.py --test-backup        # Test backup operations
"""

import json
import requests
import argparse
import os
import sys
import time
import tempfile
import shutil
from datetime import datetime
from typing import Dict, Any, Optional, List
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

class SmokeTestCLI:
    def __init__(self, base_url: str = "http://localhost:5000"):
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.test_results = []
        self.csrf_token = None
        self.auth_cookies = None
        
    def run_all_tests(self) -> Dict[str, Any]:
        """Run all smoke tests."""
        print("🚀 Starting comprehensive smoke tests...")
        
        results = {
            "timestamp": datetime.now().isoformat(),
            "base_url": self.base_url,
            "tests": {}
        }
        
        # Test authentication flow
        print("\n🔐 Testing authentication flow...")
        results["tests"]["authentication"] = self.test_authentication_flow()
        
        # Test server lifecycle
        print("\n🖥️ Testing server lifecycle...")
        results["tests"]["server_lifecycle"] = self.test_server_lifecycle()
        
        # Test admin operations
        print("\n👑 Testing admin operations...")
        results["tests"]["admin_operations"] = self.test_admin_operations()
        
        # Test backup operations
        print("\n💾 Testing backup operations...")
        results["tests"]["backup_operations"] = self.test_backup_operations()
        
        # Generate summary
        results["summary"] = self._generate_summary(results["tests"])
        
        # Save results
        results_file = project_root / "docs" / "contracts" / "smoke_test_results.json"
        results_file.parent.mkdir(exist_ok=True)
        with open(results_file, 'w') as f:
            json.dump(results, f, indent=2)
        
        print(f"\n📁 Test results saved to: {results_file}")
        return results
    
    def test_authentication_flow(self) -> Dict[str, Any]:
        """Test complete authentication flow."""
        results = {
            "status": "PASS",
            "tests": [],
            "errors": []
        }
        
        try:
            # 1. Get CSRF token
            print("  📝 Getting CSRF token...")
            response = self.session.get(f"{self.base_url}/api/v1/auth/csrf-token")
            if response.status_code == 200:
                self.csrf_token = response.json().get("csrf_token")
                results["tests"].append({"test": "csrf_token", "status": "PASS"})
                print("    ✅ CSRF token obtained")
            else:
                results["tests"].append({"test": "csrf_token", "status": "FAIL", "error": f"Status {response.status_code}"})
                results["errors"].append("Failed to get CSRF token")
                print(f"    ❌ CSRF token failed: {response.status_code}")
            
            # 2. Check setup status
            print("  🔍 Checking setup status...")
            response = self.session.get(f"{self.base_url}/api/v1/auth/setup/status")
            if response.status_code == 200:
                setup_data = response.json()
                results["tests"].append({"test": "setup_status", "status": "PASS", "data": setup_data})
                print(f"    ✅ Setup status: {setup_data}")
            else:
                results["tests"].append({"test": "setup_status", "status": "FAIL", "error": f"Status {response.status_code}"})
                results["errors"].append("Failed to check setup status")
                print(f"    ❌ Setup status failed: {response.status_code}")
            
            # 3. Check auth status (should be unauthenticated)
            print("  🔍 Checking auth status...")
            response = self.session.get(f"{self.base_url}/api/v1/auth/status")
            if response.status_code == 200:
                auth_data = response.json()
                results["tests"].append({"test": "auth_status_unauthenticated", "status": "PASS", "data": auth_data})
                print(f"    ✅ Auth status: {auth_data}")
            else:
                results["tests"].append({"test": "auth_status_unauthenticated", "status": "FAIL", "error": f"Status {response.status_code}"})
                results["errors"].append("Failed to check auth status")
                print(f"    ❌ Auth status failed: {response.status_code}")
            
        except Exception as e:
            results["status"] = "FAIL"
            results["errors"].append(str(e))
            print(f"    ❌ Authentication flow error: {e}")
        
        return results
    
    def test_server_lifecycle(self) -> Dict[str, Any]:
        """Test complete server lifecycle operations."""
        results = {
            "status": "PASS",
            "tests": [],
            "errors": [],
            "test_server_id": None
        }
        
        try:
            # Create a test server
            print("  🏗️ Creating test server...")
            server_data = {
                "server_name": f"smoke_test_{int(time.time())}",
                "version": "1.21.8",
                "memory_mb": 512,
                "gamemode": "survival",
                "difficulty": "normal",
                "motd": "Smoke Test Server"
            }
            
            response = self.session.post(
                f"{self.base_url}/api/v1/servers/",
                json=server_data,
                headers={"X-CSRFToken": self.csrf_token} if self.csrf_token else {}
            )
            
            if response.status_code == 201:
                server_info = response.json()["server"]
                results["test_server_id"] = server_info["id"]
                results["tests"].append({"test": "create_server", "status": "PASS", "server_id": server_info["id"]})
                print(f"    ✅ Test server created: {server_info['server_name']} (ID: {server_info['id']})")
            else:
                results["tests"].append({"test": "create_server", "status": "FAIL", "error": f"Status {response.status_code}"})
                results["errors"].append("Failed to create test server")
                print(f"    ❌ Server creation failed: {response.status_code}")
                return results
            
            server_id = results["test_server_id"]
            
            # Get server details
            print("  📋 Getting server details...")
            response = self.session.get(f"{self.base_url}/api/v1/servers/{server_id}")
            if response.status_code == 200:
                results["tests"].append({"test": "get_server_details", "status": "PASS"})
                print("    ✅ Server details retrieved")
            else:
                results["tests"].append({"test": "get_server_details", "status": "FAIL", "error": f"Status {response.status_code}"})
                results["errors"].append("Failed to get server details")
                print(f"    ❌ Get server details failed: {response.status_code}")
            
            # Accept EULA
            print("  📝 Accepting EULA...")
            response = self.session.post(
                f"{self.base_url}/api/v1/servers/{server_id}/accept-eula",
                headers={"X-CSRFToken": self.csrf_token} if self.csrf_token else {}
            )
            if response.status_code == 200:
                results["tests"].append({"test": "accept_eula", "status": "PASS"})
                print("    ✅ EULA accepted")
            else:
                results["tests"].append({"test": "accept_eula", "status": "FAIL", "error": f"Status {response.status_code}"})
                results["errors"].append("Failed to accept EULA")
                print(f"    ❌ EULA acceptance failed: {response.status_code}")
            
            # Start server
            print("  🚀 Starting server...")
            response = self.session.post(
                f"{self.base_url}/api/v1/servers/{server_id}/start",
                headers={"X-CSRFToken": self.csrf_token} if self.csrf_token else {}
            )
            if response.status_code == 200:
                results["tests"].append({"test": "start_server", "status": "PASS"})
                print("    ✅ Server started")
                
                # Wait a moment for server to initialize
                time.sleep(2)
                
                # Check server status
                print("  📊 Checking server status...")
                response = self.session.get(f"{self.base_url}/api/v1/servers/{server_id}/status")
                if response.status_code == 200:
                    status_data = response.json()["status"]
                    results["tests"].append({"test": "get_server_status", "status": "PASS", "data": status_data})
                    print(f"    ✅ Server status: {status_data}")
                else:
                    results["tests"].append({"test": "get_server_status", "status": "FAIL", "error": f"Status {response.status_code}"})
                    results["errors"].append("Failed to get server status")
                    print(f"    ❌ Get server status failed: {response.status_code}")
                
                # Stop server
                print("  🛑 Stopping server...")
                response = self.session.post(
                    f"{self.base_url}/api/v1/servers/{server_id}/stop",
                    headers={"X-CSRFToken": self.csrf_token} if self.csrf_token else {}
                )
                if response.status_code == 200:
                    results["tests"].append({"test": "stop_server", "status": "PASS"})
                    print("    ✅ Server stopped")
                else:
                    results["tests"].append({"test": "stop_server", "status": "FAIL", "error": f"Status {response.status_code}"})
                    results["errors"].append("Failed to stop server")
                    print(f"    ❌ Stop server failed: {response.status_code}")
            else:
                results["tests"].append({"test": "start_server", "status": "FAIL", "error": f"Status {response.status_code}"})
                results["errors"].append("Failed to start server")
                print(f"    ❌ Start server failed: {response.status_code}")
            
            # Clean up - delete test server
            print("  🗑️ Cleaning up test server...")
            response = self.session.delete(
                f"{self.base_url}/api/v1/servers/{server_id}",
                headers={"X-CSRFToken": self.csrf_token} if self.csrf_token else {}
            )
            if response.status_code == 200:
                results["tests"].append({"test": "delete_server", "status": "PASS"})
                print("    ✅ Test server deleted")
            else:
                results["tests"].append({"test": "delete_server", "status": "FAIL", "error": f"Status {response.status_code}"})
                results["errors"].append("Failed to delete test server")
                print(f"    ❌ Delete server failed: {response.status_code}")
            
        except Exception as e:
            results["status"] = "FAIL"
            results["errors"].append(str(e))
            print(f"    ❌ Server lifecycle error: {e}")
        
        return results
    
    def test_admin_operations(self) -> Dict[str, Any]:
        """Test admin operations."""
        results = {
            "status": "PASS",
            "tests": [],
            "errors": []
        }
        
        try:
            # Get system config
            print("  ⚙️ Getting system config...")
            response = self.session.get(f"{self.base_url}/api/v1/admin/config")
            if response.status_code == 200:
                config_data = response.json()["config"]
                results["tests"].append({"test": "get_system_config", "status": "PASS", "data": config_data})
                print("    ✅ System config retrieved")
            else:
                results["tests"].append({"test": "get_system_config", "status": "FAIL", "error": f"Status {response.status_code}"})
                results["errors"].append("Failed to get system config")
                print(f"    ❌ Get system config failed: {response.status_code}")
            
            # Get system stats
            print("  📊 Getting system stats...")
            response = self.session.get(f"{self.base_url}/api/v1/admin/stats")
            if response.status_code == 200:
                stats_data = response.json()["stats"]
                results["tests"].append({"test": "get_system_stats", "status": "PASS", "data": stats_data})
                print("    ✅ System stats retrieved")
            else:
                results["tests"].append({"test": "get_system_stats", "status": "FAIL", "error": f"Status {response.status_code}"})
                results["errors"].append("Failed to get system stats")
                print(f"    ❌ Get system stats failed: {response.status_code}")
            
            # Get memory usage
            print("  💾 Getting memory usage...")
            response = self.session.get(f"{self.base_url}/api/v1/servers/memory-usage")
            if response.status_code == 200:
                memory_data = response.json()["memory_summary"]
                results["tests"].append({"test": "get_memory_usage", "status": "PASS", "data": memory_data})
                print("    ✅ Memory usage retrieved")
            else:
                results["tests"].append({"test": "get_memory_usage", "status": "FAIL", "error": f"Status {response.status_code}"})
                results["errors"].append("Failed to get memory usage")
                print(f"    ❌ Get memory usage failed: {response.status_code}")
            
            # Get available versions
            print("  📦 Getting available versions...")
            response = self.session.get(f"{self.base_url}/api/v1/servers/versions")
            if response.status_code == 200:
                versions_data = response.json()["versions"]
                results["tests"].append({"test": "get_versions", "status": "PASS", "count": len(versions_data)})
                print(f"    ✅ Available versions retrieved: {len(versions_data)} versions")
            else:
                results["tests"].append({"test": "get_versions", "status": "FAIL", "error": f"Status {response.status_code}"})
                results["errors"].append("Failed to get available versions")
                print(f"    ❌ Get versions failed: {response.status_code}")
            
        except Exception as e:
            results["status"] = "FAIL"
            results["errors"].append(str(e))
            print(f"    ❌ Admin operations error: {e}")
        
        return results
    
    def test_backup_operations(self) -> Dict[str, Any]:
        """Test backup operations."""
        results = {
            "status": "PASS",
            "tests": [],
            "errors": [],
            "test_server_id": None
        }
        
        try:
            # Create a test server for backup
            print("  🏗️ Creating test server for backup...")
            server_data = {
                "server_name": f"backup_test_{int(time.time())}",
                "version": "1.21.8",
                "memory_mb": 512,
                "gamemode": "survival",
                "difficulty": "normal",
                "motd": "Backup Test Server"
            }
            
            response = self.session.post(
                f"{self.base_url}/api/v1/servers/",
                json=server_data,
                headers={"X-CSRFToken": self.csrf_token} if self.csrf_token else {}
            )
            
            if response.status_code == 201:
                server_info = response.json()["server"]
                results["test_server_id"] = server_info["id"]
                results["tests"].append({"test": "create_backup_server", "status": "PASS", "server_id": server_info["id"]})
                print(f"    ✅ Backup test server created: {server_info['server_name']} (ID: {server_info['id']})")
            else:
                results["tests"].append({"test": "create_backup_server", "status": "FAIL", "error": f"Status {response.status_code}"})
                results["errors"].append("Failed to create backup test server")
                print(f"    ❌ Backup server creation failed: {response.status_code}")
                return results
            
            server_id = results["test_server_id"]
            
            # Accept EULA
            print("  📝 Accepting EULA for backup server...")
            response = self.session.post(
                f"{self.base_url}/api/v1/servers/{server_id}/accept-eula",
                headers={"X-CSRFToken": self.csrf_token} if self.csrf_token else {}
            )
            if response.status_code == 200:
                results["tests"].append({"test": "accept_eula_backup", "status": "PASS"})
                print("    ✅ EULA accepted for backup server")
            else:
                results["tests"].append({"test": "accept_eula_backup", "status": "FAIL", "error": f"Status {response.status_code}"})
                results["errors"].append("Failed to accept EULA for backup server")
                print(f"    ❌ EULA acceptance failed: {response.status_code}")
            
            # Create backup
            print("  💾 Creating server backup...")
            response = self.session.post(
                f"{self.base_url}/api/v1/servers/{server_id}/backup",
                headers={"X-CSRFToken": self.csrf_token} if self.csrf_token else {}
            )
            if response.status_code == 200:
                backup_data = response.json()
                results["tests"].append({"test": "create_backup", "status": "PASS", "backup_file": backup_data.get("backup_file")})
                print(f"    ✅ Backup created: {backup_data.get('backup_file')}")
            else:
                results["tests"].append({"test": "create_backup", "status": "FAIL", "error": f"Status {response.status_code}"})
                results["errors"].append("Failed to create backup")
                print(f"    ❌ Backup creation failed: {response.status_code}")
            
            # Clean up - delete test server
            print("  🗑️ Cleaning up backup test server...")
            response = self.session.delete(
                f"{self.base_url}/api/v1/servers/{server_id}",
                headers={"X-CSRFToken": self.csrf_token} if self.csrf_token else {}
            )
            if response.status_code == 200:
                results["tests"].append({"test": "delete_backup_server", "status": "PASS"})
                print("    ✅ Backup test server deleted")
            else:
                results["tests"].append({"test": "delete_backup_server", "status": "FAIL", "error": f"Status {response.status_code}"})
                results["errors"].append("Failed to delete backup test server")
                print(f"    ❌ Delete backup server failed: {response.status_code}")
            
        except Exception as e:
            results["status"] = "FAIL"
            results["errors"].append(str(e))
            print(f"    ❌ Backup operations error: {e}")
        
        return results
    
    def _generate_summary(self, test_results: Dict[str, Any]) -> Dict[str, Any]:
        """Generate test summary."""
        total_tests = 0
        passed_tests = 0
        failed_tests = 0
        
        for test_suite in test_results.values():
            if isinstance(test_suite, dict) and "tests" in test_suite:
                for test in test_suite["tests"]:
                    total_tests += 1
                    if test["status"] == "PASS":
                        passed_tests += 1
                    else:
                        failed_tests += 1
        
        return {
            "total_tests": total_tests,
            "passed_tests": passed_tests,
            "failed_tests": failed_tests,
            "success_rate": (passed_tests / total_tests * 100) if total_tests > 0 else 0,
            "overall_status": "PASS" if failed_tests == 0 else "FAIL"
        }

def main():
    parser = argparse.ArgumentParser(description="Smoke Test CLI for Server Lifecycle Validation")
    parser.add_argument("--test-auth", action="store_true", help="Test authentication flow")
    parser.add_argument("--test-server-lifecycle", action="store_true", help="Test server lifecycle operations")
    parser.add_argument("--test-admin", action="store_true", help="Test admin operations")
    parser.add_argument("--test-backup", action="store_true", help="Test backup operations")
    parser.add_argument("--test-all", action="store_true", help="Run all tests")
    parser.add_argument("--base-url", type=str, default="http://localhost:5000", help="Base URL for API")
    
    args = parser.parse_args()
    
    if not any([args.test_auth, args.test_server_lifecycle, args.test_admin, args.test_backup, args.test_all]):
        parser.print_help()
        return
    
    cli = SmokeTestCLI(args.base_url)
    
    if args.test_all:
        results = cli.run_all_tests()
    else:
        results = {
            "timestamp": datetime.now().isoformat(),
            "base_url": args.base_url,
            "tests": {}
        }
        
        if args.test_auth:
            results["tests"]["authentication"] = cli.test_authentication_flow()
        
        if args.test_server_lifecycle:
            results["tests"]["server_lifecycle"] = cli.test_server_lifecycle()
        
        if args.test_admin:
            results["tests"]["admin_operations"] = cli.test_admin_operations()
        
        if args.test_backup:
            results["tests"]["backup_operations"] = cli.test_backup_operations()
        
        results["summary"] = cli._generate_summary(results["tests"])
    
    # Print summary
    print("\n" + "="*60)
    print("📊 SMOKE TEST SUMMARY")
    print("="*60)
    summary = results["summary"]
    print(f"Total Tests: {summary['total_tests']}")
    print(f"Passed: {summary['passed_tests']}")
    print(f"Failed: {summary['failed_tests']}")
    print(f"Success Rate: {summary['success_rate']:.1f}%")
    print(f"Overall Status: {summary['overall_status']}")
    
    if summary["overall_status"] == "PASS":
        print("\n🎉 All smoke tests passed!")
    else:
        print("\n❌ Some smoke tests failed. Check the detailed results.")
        sys.exit(1)

if __name__ == "__main__":
    main()

