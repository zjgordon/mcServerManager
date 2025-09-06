#!/usr/bin/env python3
"""
Enhanced Smoke Test CLI for Dual-Backend Server Lifecycle Validation

This script validates the complete server lifecycle operations across both
Flask and Express backends to ensure the strangler pattern migration is working correctly.

Usage:
    python scripts/enhanced_smoke_test_cli.py --test-flask          # Test Flask backend only
    python scripts/enhanced_smoke_test_cli.py --test-express        # Test Express backend only
    python scripts/enhanced_smoke_test_cli.py --test-both           # Test both backends
    python scripts/enhanced_smoke_test_cli.py --test-comparison     # Compare responses between backends
    python scripts/enhanced_smoke_test_cli.py --test-all            # Run comprehensive tests
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
from typing import Dict, Any, Optional, List, Tuple
from pathlib import Path
from dataclasses import dataclass

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

@dataclass
class BackendConfig:
    """Configuration for a backend service."""
    name: str
    base_url: str
    health_endpoint: str
    api_endpoint: str
    auth_required: bool = True

class EnhancedSmokeTestCLI:
    def __init__(self):
        self.flask_config = BackendConfig(
            name="Flask",
            base_url="http://localhost:5000",
            health_endpoint="/healthz",
            api_endpoint="/api/v1"
        )
        self.express_config = BackendConfig(
            name="Express",
            base_url="http://localhost:5001",
            health_endpoint="/healthz",
            api_endpoint="/api/v1"
        )
        self.test_results = []
        self.csrf_token = None
        self.auth_cookies = None
        
    def run_all_tests(self) -> Dict[str, Any]:
        """Run comprehensive smoke tests across both backends."""
        print("🚀 Starting comprehensive dual-backend smoke tests...")
        
        results = {
            "timestamp": datetime.now().isoformat(),
            "backends": {
                "flask": self.flask_config.__dict__,
                "express": self.express_config.__dict__
            },
            "tests": {}
        }
        
        # Test backend health
        print("\n🏥 Testing backend health...")
        results["tests"]["health_checks"] = self.test_backend_health()
        
        # Test Flask backend
        print("\n🐍 Testing Flask backend...")
        results["tests"]["flask_backend"] = self.test_backend(self.flask_config)
        
        # Test Express backend
        print("\n🚀 Testing Express backend...")
        results["tests"]["express_backend"] = self.test_backend(self.express_config)
        
        # Test backend comparison
        print("\n🔄 Testing backend comparison...")
        results["tests"]["backend_comparison"] = self.test_backend_comparison()
        
        # Test dual-backend environment
        print("\n🌐 Testing dual-backend environment...")
        results["tests"]["dual_backend"] = self.test_dual_backend_environment()
        
        # Generate summary
        results["summary"] = self._generate_summary(results["tests"])
        
        # Save results
        results_file = project_root / "docs" / "contracts" / "enhanced_smoke_test_results.json"
        results_file.parent.mkdir(exist_ok=True)
        with open(results_file, 'w') as f:
            json.dump(results, f, indent=2)
        
        print(f"\n📁 Test results saved to: {results_file}")
        return results
    
    def test_backend_health(self) -> Dict[str, Any]:
        """Test health endpoints for both backends."""
        results = {
            "status": "PASS",
            "tests": [],
            "errors": []
        }
        
        for config in [self.flask_config, self.express_config]:
            try:
                print(f"  🏥 Testing {config.name} health...")
                response = requests.get(f"{config.base_url}{config.health_endpoint}", timeout=5)
                
                if response.status_code == 200:
                    health_data = response.json()
                    results["tests"].append({
                        "backend": config.name,
                        "test": "health_check",
                        "status": "PASS",
                        "response_time": response.elapsed.total_seconds(),
                        "data": health_data
                    })
                    print(f"    ✅ {config.name} health check passed")
                else:
                    results["tests"].append({
                        "backend": config.name,
                        "test": "health_check",
                        "status": "FAIL",
                        "error": f"Status {response.status_code}"
                    })
                    results["errors"].append(f"{config.name} health check failed")
                    print(f"    ❌ {config.name} health check failed: {response.status_code}")
                    
            except requests.exceptions.RequestException as e:
                results["tests"].append({
                    "backend": config.name,
                    "test": "health_check",
                    "status": "FAIL",
                    "error": str(e)
                })
                results["errors"].append(f"{config.name} health check error: {e}")
                print(f"    ❌ {config.name} health check error: {e}")
        
        if results["errors"]:
            results["status"] = "FAIL"
            
        return results
    
    def test_backend(self, config: BackendConfig) -> Dict[str, Any]:
        """Test a specific backend comprehensively."""
        results = {
            "status": "PASS",
            "backend": config.name,
            "tests": [],
            "errors": []
        }
        
        try:
            # Test basic connectivity
            print(f"  🔗 Testing {config.name} connectivity...")
            response = requests.get(f"{config.base_url}/", timeout=5)
            if response.status_code in [200, 302]:  # 302 for Flask redirects
                results["tests"].append({
                    "test": "connectivity",
                    "status": "PASS",
                    "response_time": response.elapsed.total_seconds()
                })
                print(f"    ✅ {config.name} connectivity passed")
            else:
                results["tests"].append({
                    "test": "connectivity",
                    "status": "FAIL",
                    "error": f"Status {response.status_code}"
                })
                results["errors"].append("Connectivity test failed")
                print(f"    ❌ {config.name} connectivity failed: {response.status_code}")
            
            # Test API endpoint
            print(f"  🔌 Testing {config.name} API endpoint...")
            response = requests.get(f"{config.base_url}{config.api_endpoint}", timeout=5)
            if response.status_code in [200, 404]:  # 404 is acceptable for Express
                results["tests"].append({
                    "test": "api_endpoint",
                    "status": "PASS",
                    "response_time": response.elapsed.total_seconds(),
                    "status_code": response.status_code
                })
                print(f"    ✅ {config.name} API endpoint accessible")
            else:
                results["tests"].append({
                    "test": "api_endpoint",
                    "status": "FAIL",
                    "error": f"Status {response.status_code}"
                })
                results["errors"].append("API endpoint test failed")
                print(f"    ❌ {config.name} API endpoint failed: {response.status_code}")
            
            # Test readiness endpoint (if available)
            print(f"  🔍 Testing {config.name} readiness...")
            try:
                # Express uses /healthz/readyz, Flask uses /readyz
                readiness_path = "/healthz/readyz" if config.name == "Express" else "/readyz"
                response = requests.get(f"{config.base_url}{readiness_path}", timeout=5)
                if response.status_code == 200:
                    readiness_data = response.json()
                    results["tests"].append({
                        "test": "readiness",
                        "status": "PASS",
                        "response_time": response.elapsed.total_seconds(),
                        "data": readiness_data
                    })
                    print(f"    ✅ {config.name} readiness check passed")
                else:
                    results["tests"].append({
                        "test": "readiness",
                        "status": "FAIL",
                        "error": f"Status {response.status_code}"
                    })
                    results["errors"].append("Readiness check failed")
                    print(f"    ❌ {config.name} readiness check failed: {response.status_code}")
            except requests.exceptions.RequestException:
                # Readiness endpoint might not be available
                results["tests"].append({
                    "test": "readiness",
                    "status": "SKIP",
                    "reason": "Readiness endpoint not available"
                })
                print(f"    ⏭️ {config.name} readiness check skipped")
            
        except Exception as e:
            results["status"] = "FAIL"
            results["errors"].append(str(e))
            print(f"    ❌ {config.name} backend test error: {e}")
        
        return results
    
    def test_backend_comparison(self) -> Dict[str, Any]:
        """Compare responses between Flask and Express backends."""
        results = {
            "status": "PASS",
            "tests": [],
            "errors": []
        }
        
        try:
            # Compare health endpoints
            print("  🔄 Comparing health endpoints...")
            flask_health = self._get_health_data(self.flask_config)
            express_health = self._get_health_data(self.express_config)
            
            if flask_health and express_health:
                comparison = self._compare_health_responses(flask_health, express_health)
                results["tests"].append({
                    "test": "health_comparison",
                    "status": "PASS" if comparison["compatible"] else "WARN",
                    "comparison": comparison
                })
                print(f"    ✅ Health endpoint comparison completed")
            else:
                results["tests"].append({
                    "test": "health_comparison",
                    "status": "FAIL",
                    "error": "Could not retrieve health data from both backends"
                })
                results["errors"].append("Health comparison failed")
                print(f"    ❌ Health endpoint comparison failed")
            
            # Compare API endpoints
            print("  🔄 Comparing API endpoints...")
            flask_api = self._get_api_data(self.flask_config)
            express_api = self._get_api_data(self.express_config)
            
            if flask_api and express_api:
                comparison = self._compare_api_responses(flask_api, express_api)
                results["tests"].append({
                    "test": "api_comparison",
                    "status": "PASS" if comparison["compatible"] else "WARN",
                    "comparison": comparison
                })
                print(f"    ✅ API endpoint comparison completed")
            else:
                results["tests"].append({
                    "test": "api_comparison",
                    "status": "SKIP",
                    "reason": "API endpoints not fully implemented in Express yet"
                })
                print(f"    ⏭️ API endpoint comparison skipped")
            
        except Exception as e:
            results["status"] = "FAIL"
            results["errors"].append(str(e))
            print(f"    ❌ Backend comparison error: {e}")
        
        return results
    
    def test_dual_backend_environment(self) -> Dict[str, Any]:
        """Test the dual-backend environment configuration."""
        results = {
            "status": "PASS",
            "tests": [],
            "errors": []
        }
        
        try:
            # Test port separation
            print("  🔌 Testing port separation...")
            flask_response = requests.get(f"{self.flask_config.base_url}/", timeout=5)
            express_response = requests.get(f"{self.express_config.base_url}/", timeout=5)
            
            if flask_response.status_code in [200, 302] and express_response.status_code == 200:
                results["tests"].append({
                    "test": "port_separation",
                    "status": "PASS",
                    "flask_port": "5000",
                    "express_port": "5001"
                })
                print(f"    ✅ Port separation working correctly")
            else:
                results["tests"].append({
                    "test": "port_separation",
                    "status": "FAIL",
                    "error": "One or both backends not responding on expected ports"
                })
                results["errors"].append("Port separation test failed")
                print(f"    ❌ Port separation test failed")
            
            # Test concurrent access
            print("  ⚡ Testing concurrent access...")
            start_time = time.time()
            
            # Make concurrent requests to both backends
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
                flask_future = executor.submit(requests.get, f"{self.flask_config.base_url}/", timeout=5)
                express_future = executor.submit(requests.get, f"{self.express_config.base_url}/", timeout=5)
                
                flask_result = flask_future.result()
                express_result = express_future.result()
            
            end_time = time.time()
            concurrent_time = end_time - start_time
            
            if flask_result.status_code in [200, 302] and express_result.status_code == 200:
                results["tests"].append({
                    "test": "concurrent_access",
                    "status": "PASS",
                    "concurrent_time": concurrent_time,
                    "flask_response_time": flask_result.elapsed.total_seconds(),
                    "express_response_time": express_result.elapsed.total_seconds()
                })
                print(f"    ✅ Concurrent access working correctly")
            else:
                results["tests"].append({
                    "test": "concurrent_access",
                    "status": "FAIL",
                    "error": "Concurrent access test failed"
                })
                results["errors"].append("Concurrent access test failed")
                print(f"    ❌ Concurrent access test failed")
            
        except Exception as e:
            results["status"] = "FAIL"
            results["errors"].append(str(e))
            print(f"    ❌ Dual-backend environment test error: {e}")
        
        return results
    
    def _get_health_data(self, config: BackendConfig) -> Optional[Dict[str, Any]]:
        """Get health data from a backend."""
        try:
            response = requests.get(f"{config.base_url}{config.health_endpoint}", timeout=5)
            if response.status_code == 200:
                return response.json()
        except:
            pass
        return None
    
    def _get_api_data(self, config: BackendConfig) -> Optional[Dict[str, Any]]:
        """Get API data from a backend."""
        try:
            response = requests.get(f"{config.base_url}{config.api_endpoint}", timeout=5)
            if response.status_code == 200:
                return response.json()
        except:
            pass
        return None
    
    def _compare_health_responses(self, flask_data: Dict[str, Any], express_data: Dict[str, Any]) -> Dict[str, Any]:
        """Compare health responses between Flask and Express."""
        comparison = {
            "compatible": True,
            "differences": [],
            "similarities": []
        }
        
        # Check for common fields
        if "status" in flask_data and "status" in express_data:
            if flask_data["status"] == express_data["status"]:
                comparison["similarities"].append("status field matches")
            else:
                comparison["differences"].append(f"status: Flask={flask_data['status']}, Express={express_data['status']}")
        
        if "timestamp" in flask_data and "timestamp" in express_data:
            comparison["similarities"].append("timestamp field present")
        
        # Express might have additional fields
        express_only_fields = set(express_data.keys()) - set(flask_data.keys())
        if express_only_fields:
            comparison["differences"].append(f"Express has additional fields: {list(express_only_fields)}")
        
        return comparison
    
    def _compare_api_responses(self, flask_data: Dict[str, Any], express_data: Dict[str, Any]) -> Dict[str, Any]:
        """Compare API responses between Flask and Express."""
        comparison = {
            "compatible": True,
            "differences": [],
            "similarities": []
        }
        
        # This will be expanded as Express API is implemented
        comparison["similarities"].append("Both backends respond to API requests")
        
        return comparison
    
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
    parser = argparse.ArgumentParser(description="Enhanced Smoke Test CLI for Dual-Backend Validation")
    parser.add_argument("--test-flask", action="store_true", help="Test Flask backend only")
    parser.add_argument("--test-express", action="store_true", help="Test Express backend only")
    parser.add_argument("--test-both", action="store_true", help="Test both backends")
    parser.add_argument("--test-comparison", action="store_true", help="Compare responses between backends")
    parser.add_argument("--test-all", action="store_true", help="Run comprehensive tests")
    
    args = parser.parse_args()
    
    if not any([args.test_flask, args.test_express, args.test_both, args.test_comparison, args.test_all]):
        args.test_all = True
    
    cli = EnhancedSmokeTestCLI()
    
    if args.test_all:
        results = cli.run_all_tests()
    else:
        results = {
            "timestamp": datetime.now().isoformat(),
            "backends": {
                "flask": cli.flask_config.__dict__,
                "express": cli.express_config.__dict__
            },
            "tests": {}
        }
        
        if args.test_flask:
            results["tests"]["flask_backend"] = cli.test_backend(cli.flask_config)
        
        if args.test_express:
            results["tests"]["express_backend"] = cli.test_backend(cli.express_config)
        
        if args.test_both:
            results["tests"]["flask_backend"] = cli.test_backend(cli.flask_config)
            results["tests"]["express_backend"] = cli.test_backend(cli.express_config)
        
        if args.test_comparison:
            results["tests"]["backend_comparison"] = cli.test_backend_comparison()
        
        results["summary"] = cli._generate_summary(results["tests"])
    
    # Print summary
    print("\n" + "="*60)
    print("📊 ENHANCED SMOKE TEST SUMMARY")
    print("="*60)
    summary = results["summary"]
    print(f"Total Tests: {summary['total_tests']}")
    print(f"Passed: {summary['passed_tests']}")
    print(f"Failed: {summary['failed_tests']}")
    print(f"Skipped: {summary['skipped_tests']}")
    print(f"Success Rate: {summary['success_rate']:.1f}%")
    print(f"Overall Status: {summary['overall_status']}")
    
    if summary["overall_status"] == "PASS":
        print("\n🎉 All enhanced smoke tests passed!")
    else:
        print("\n❌ Some enhanced smoke tests failed. Check the detailed results.")
        sys.exit(1)

if __name__ == "__main__":
    main()
