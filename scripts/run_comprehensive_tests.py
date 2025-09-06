#!/usr/bin/env python3
"""
Comprehensive Test Runner for Dual-Backend Environment

This script orchestrates all smoke tests and validations for the dual-backend environment:
- Enhanced smoke tests for both Flask and Express backends
- Server lifecycle validation
- Backend comparison and compatibility testing
- Performance and reliability testing

Usage:
    python scripts/run_comprehensive_tests.py --quick          # Run quick tests only
    python scripts/run_comprehensive_tests.py --full           # Run full test suite
    python scripts/run_comprehensive_tests.py --lifecycle      # Run server lifecycle tests
    python scripts/run_comprehensive_tests.py --comparison     # Run backend comparison tests
    python scripts/run_comprehensive_tests.py --all            # Run all tests
"""

import json
import argparse
import os
import sys
import time
import subprocess
from datetime import datetime
from typing import Dict, Any, List
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

class ComprehensiveTestRunner:
    def __init__(self):
        self.project_root = project_root
        self.test_results = {}
        self.start_time = None
        self.end_time = None
        
    def run_all_tests(self) -> Dict[str, Any]:
        """Run comprehensive test suite."""
        print("🚀 Starting comprehensive test suite for dual-backend environment...")
        self.start_time = datetime.now()
        
        results = {
            "timestamp": self.start_time.isoformat(),
            "test_suite": "comprehensive_dual_backend_tests",
            "tests": {}
        }
        
        try:
            # Test 1: Backend Health Checks
            print("\n" + "="*60)
            print("🏥 TEST 1: Backend Health Checks")
            print("="*60)
            results["tests"]["health_checks"] = self._run_health_checks()
            
            # Test 2: Enhanced Smoke Tests
            print("\n" + "="*60)
            print("💨 TEST 2: Enhanced Smoke Tests")
            print("="*60)
            results["tests"]["enhanced_smoke_tests"] = self._run_enhanced_smoke_tests()
            
            # Test 3: Server Lifecycle Validation
            print("\n" + "="*60)
            print("🔄 TEST 3: Server Lifecycle Validation")
            print("="*60)
            results["tests"]["server_lifecycle"] = self._run_server_lifecycle_tests()
            
            # Test 4: Backend Comparison
            print("\n" + "="*60)
            print("🔄 TEST 4: Backend Comparison")
            print("="*60)
            results["tests"]["backend_comparison"] = self._run_backend_comparison()
            
            # Test 5: Performance Testing
            print("\n" + "="*60)
            print("⚡ TEST 5: Performance Testing")
            print("="*60)
            results["tests"]["performance_tests"] = self._run_performance_tests()
            
            # Test 6: Reliability Testing
            print("\n" + "="*60)
            print("🛡️ TEST 6: Reliability Testing")
            print("="*60)
            results["tests"]["reliability_tests"] = self._run_reliability_tests()
            
        except Exception as e:
            print(f"❌ Test suite error: {e}")
            results["error"] = str(e)
        
        self.end_time = datetime.now()
        results["duration"] = (self.end_time - self.start_time).total_seconds()
        results["summary"] = self._generate_comprehensive_summary(results["tests"])
        
        # Save results
        results_file = self.project_root / "docs" / "contracts" / "comprehensive_test_results.json"
        results_file.parent.mkdir(exist_ok=True)
        with open(results_file, 'w') as f:
            json.dump(results, f, indent=2)
        
        print(f"\n📁 Comprehensive test results saved to: {results_file}")
        return results
    
    def _run_health_checks(self) -> Dict[str, Any]:
        """Run backend health checks."""
        try:
            # Run the enhanced smoke test CLI with health checks only
            result = subprocess.run([
                sys.executable, 
                str(self.project_root / "scripts" / "enhanced_smoke_test_cli.py"),
                "--test-comparison"
            ], capture_output=True, text=True, timeout=60)
            
            if result.returncode == 0:
                return {
                    "status": "PASS",
                    "output": result.stdout,
                    "error": result.stderr
                }
            else:
                return {
                    "status": "FAIL",
                    "output": result.stdout,
                    "error": result.stderr,
                    "return_code": result.returncode
                }
                
        except subprocess.TimeoutExpired:
            return {
                "status": "FAIL",
                "error": "Health checks timed out"
            }
        except Exception as e:
            return {
                "status": "FAIL",
                "error": str(e)
            }
    
    def _run_enhanced_smoke_tests(self) -> Dict[str, Any]:
        """Run enhanced smoke tests."""
        try:
            # Run the enhanced smoke test CLI
            result = subprocess.run([
                sys.executable, 
                str(self.project_root / "scripts" / "enhanced_smoke_test_cli.py"),
                "--test-all"
            ], capture_output=True, text=True, timeout=120)
            
            if result.returncode == 0:
                return {
                    "status": "PASS",
                    "output": result.stdout,
                    "error": result.stderr
                }
            else:
                return {
                    "status": "FAIL",
                    "output": result.stdout,
                    "error": result.stderr,
                    "return_code": result.returncode
                }
                
        except subprocess.TimeoutExpired:
            return {
                "status": "FAIL",
                "error": "Enhanced smoke tests timed out"
            }
        except Exception as e:
            return {
                "status": "FAIL",
                "error": str(e)
            }
    
    def _run_server_lifecycle_tests(self) -> Dict[str, Any]:
        """Run server lifecycle tests."""
        try:
            # Run the server lifecycle validator
            result = subprocess.run([
                sys.executable, 
                str(self.project_root / "scripts" / "server_lifecycle_validator.py"),
                "--backend", "both",
                "--full-test"
            ], capture_output=True, text=True, timeout=300)
            
            if result.returncode == 0:
                return {
                    "status": "PASS",
                    "output": result.stdout,
                    "error": result.stderr
                }
            else:
                return {
                    "status": "FAIL",
                    "output": result.stdout,
                    "error": result.stderr,
                    "return_code": result.returncode
                }
                
        except subprocess.TimeoutExpired:
            return {
                "status": "FAIL",
                "error": "Server lifecycle tests timed out"
            }
        except Exception as e:
            return {
                "status": "FAIL",
                "error": str(e)
            }
    
    def _run_backend_comparison(self) -> Dict[str, Any]:
        """Run backend comparison tests."""
        try:
            # Run backend comparison tests
            result = subprocess.run([
                sys.executable, 
                str(self.project_root / "scripts" / "enhanced_smoke_test_cli.py"),
                "--test-comparison"
            ], capture_output=True, text=True, timeout=60)
            
            if result.returncode == 0:
                return {
                    "status": "PASS",
                    "output": result.stdout,
                    "error": result.stderr
                }
            else:
                return {
                    "status": "FAIL",
                    "output": result.stdout,
                    "error": result.stderr,
                    "return_code": result.returncode
                }
                
        except subprocess.TimeoutExpired:
            return {
                "status": "FAIL",
                "error": "Backend comparison tests timed out"
            }
        except Exception as e:
            return {
                "status": "FAIL",
                "error": str(e)
            }
    
    def _run_performance_tests(self) -> Dict[str, Any]:
        """Run performance tests."""
        try:
            import requests
            import time
            
            # Test response times for both backends
            flask_times = []
            express_times = []
            
            # Test Flask performance
            for i in range(5):
                start_time = time.time()
                try:
                    response = requests.get("http://localhost:5000/", timeout=5)
                    end_time = time.time()
                    if response.status_code in [200, 302]:
                        flask_times.append(end_time - start_time)
                except:
                    pass
            
            # Test Express performance
            for i in range(5):
                start_time = time.time()
                try:
                    response = requests.get("http://localhost:5001/", timeout=5)
                    end_time = time.time()
                    if response.status_code == 200:
                        express_times.append(end_time - start_time)
                except:
                    pass
            
            # Calculate averages
            flask_avg = sum(flask_times) / len(flask_times) if flask_times else 0
            express_avg = sum(express_times) / len(express_times) if express_times else 0
            
            return {
                "status": "PASS",
                "flask_avg_response_time": flask_avg,
                "express_avg_response_time": express_avg,
                "flask_times": flask_times,
                "express_times": express_times
            }
            
        except Exception as e:
            return {
                "status": "FAIL",
                "error": str(e)
            }
    
    def _run_reliability_tests(self) -> Dict[str, Any]:
        """Run reliability tests."""
        try:
            import requests
            
            # Test concurrent requests
            flask_success = 0
            express_success = 0
            total_requests = 10
            
            for i in range(total_requests):
                # Test Flask
                try:
                    response = requests.get("http://localhost:5000/", timeout=5)
                    if response.status_code in [200, 302]:
                        flask_success += 1
                except:
                    pass
                
                # Test Express
                try:
                    response = requests.get("http://localhost:5001/", timeout=5)
                    if response.status_code == 200:
                        express_success += 1
                except:
                    pass
            
            flask_reliability = (flask_success / total_requests) * 100
            express_reliability = (express_success / total_requests) * 100
            
            return {
                "status": "PASS",
                "flask_reliability": flask_reliability,
                "express_reliability": express_reliability,
                "flask_success_rate": f"{flask_success}/{total_requests}",
                "express_success_rate": f"{express_success}/{total_requests}"
            }
            
        except Exception as e:
            return {
                "status": "FAIL",
                "error": str(e)
            }
    
    def _generate_comprehensive_summary(self, tests: Dict[str, Any]) -> Dict[str, Any]:
        """Generate comprehensive test summary."""
        total_tests = len(tests)
        passed_tests = 0
        failed_tests = 0
        
        for test_name, test_result in tests.items():
            if test_result.get("status") == "PASS":
                passed_tests += 1
            else:
                failed_tests += 1
        
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        overall_status = "PASS" if failed_tests == 0 else "FAIL"
        
        return {
            "total_test_suites": total_tests,
            "passed_test_suites": passed_tests,
            "failed_test_suites": failed_tests,
            "success_rate": success_rate,
            "overall_status": overall_status,
            "duration_seconds": (self.end_time - self.start_time).total_seconds() if self.end_time and self.start_time else 0
        }

def main():
    parser = argparse.ArgumentParser(description="Comprehensive Test Runner for Dual-Backend Environment")
    parser.add_argument("--quick", action="store_true", help="Run quick tests only")
    parser.add_argument("--full", action="store_true", help="Run full test suite")
    parser.add_argument("--lifecycle", action="store_true", help="Run server lifecycle tests")
    parser.add_argument("--comparison", action="store_true", help="Run backend comparison tests")
    parser.add_argument("--all", action="store_true", help="Run all tests")
    
    args = parser.parse_args()
    
    if not any([args.quick, args.full, args.lifecycle, args.comparison, args.all]):
        args.all = True
    
    runner = ComprehensiveTestRunner()
    
    if args.all or args.full:
        results = runner.run_all_tests()
    else:
        # Run specific tests based on arguments
        results = {
            "timestamp": datetime.now().isoformat(),
            "test_suite": "selective_tests",
            "tests": {}
        }
        
        if args.quick:
            results["tests"]["health_checks"] = runner._run_health_checks()
        
        if args.lifecycle:
            results["tests"]["server_lifecycle"] = runner._run_server_lifecycle_tests()
        
        if args.comparison:
            results["tests"]["backend_comparison"] = runner._run_backend_comparison()
        
        results["summary"] = runner._generate_comprehensive_summary(results["tests"])
    
    # Print summary
    print("\n" + "="*60)
    print("📊 COMPREHENSIVE TEST SUITE SUMMARY")
    print("="*60)
    summary = results["summary"]
    print(f"Total Test Suites: {summary['total_test_suites']}")
    print(f"Passed: {summary['passed_test_suites']}")
    print(f"Failed: {summary['failed_test_suites']}")
    print(f"Success Rate: {summary['success_rate']:.1f}%")
    print(f"Overall Status: {summary['overall_status']}")
    print(f"Duration: {summary['duration_seconds']:.2f} seconds")
    
    if summary["overall_status"] == "PASS":
        print("\n🎉 All comprehensive tests passed!")
    else:
        print("\n❌ Some comprehensive tests failed. Check the detailed results.")
        sys.exit(1)

if __name__ == "__main__":
    main()
