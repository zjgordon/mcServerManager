"""
Production Testing and Validation for Minecraft Server Manager

This module provides comprehensive testing and validation capabilities for production
deployment of the Minecraft Server Manager application.
"""

import os
import sys
import time
import json
import requests
import subprocess
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

# Add the parent directory to the path to import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class TestStatus(Enum):
    """Test status enumeration."""
    PASS = "pass"
    FAIL = "fail"
    SKIP = "skip"
    ERROR = "error"


class TestCategory(Enum):
    """Test category enumeration."""
    FUNCTIONAL = "functional"
    PERFORMANCE = "performance"
    SECURITY = "security"
    INTEGRATION = "integration"
    LOAD = "load"
    STRESS = "stress"


@dataclass
class TestResult:
    """Test result data class."""
    test_name: str
    category: TestCategory
    status: TestStatus
    duration_ms: float
    message: str
    details: Dict[str, Any]
    timestamp: datetime


class ProductionValidator:
    """Production testing and validation utility."""
    
    def __init__(self, base_url: str = "http://localhost:5000", api_base: str = "http://localhost:5000/api/v1"):
        self.base_url = base_url
        self.api_base = api_base
        self.test_results: List[TestResult] = []
        self.session = requests.Session()
        
    def run_all_tests(self) -> List[TestResult]:
        """Run all production validation tests."""
        self.test_results = []
        
        # Functional tests
        self.test_application_startup()
        self.test_health_endpoint()
        self.test_database_connectivity()
        self.test_authentication_flow()
        self.test_server_management()
        self.test_user_management()
        self.test_admin_functions()
        
        # Performance tests
        self.test_response_times()
        self.test_concurrent_requests()
        self.test_memory_usage()
        self.test_database_performance()
        
        # Security tests
        self.test_authentication_security()
        self.test_authorization_security()
        self.test_input_validation()
        self.test_rate_limiting()
        self.test_ssl_configuration()
        
        # Integration tests
        self.test_frontend_backend_integration()
        self.test_websocket_connectivity()
        self.test_file_operations()
        self.test_backup_restore()
        
        # Load tests
        self.test_load_capacity()
        self.test_memory_under_load()
        self.test_database_under_load()
        
        # Stress tests
        self.test_stress_conditions()
        self.test_error_recovery()
        self.test_system_resilience()
        
        return self.test_results
    
    def _run_test(self, test_name: str, category: TestCategory, test_func) -> TestResult:
        """Run a single test and record the result."""
        start_time = time.time()
        timestamp = datetime.now()
        
        try:
            result = test_func()
            duration_ms = (time.time() - start_time) * 1000
            
            if result is True:
                status = TestStatus.PASS
                message = f"{test_name} passed"
                details = {"duration_ms": duration_ms}
            elif result is False:
                status = TestStatus.FAIL
                message = f"{test_name} failed"
                details = {"duration_ms": duration_ms}
            elif isinstance(result, dict):
                status = result.get("status", TestStatus.PASS)
                message = result.get("message", f"{test_name} completed")
                details = result.get("details", {"duration_ms": duration_ms})
                details["duration_ms"] = duration_ms
            else:
                status = TestStatus.ERROR
                message = f"{test_name} returned unexpected result"
                details = {"duration_ms": duration_ms, "result": str(result)}
            
        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000
            status = TestStatus.ERROR
            message = f"{test_name} error: {str(e)}"
            details = {"duration_ms": duration_ms, "error": str(e)}
        
        test_result = TestResult(
            test_name=test_name,
            category=category,
            status=status,
            duration_ms=duration_ms,
            message=message,
            details=details,
            timestamp=timestamp
        )
        
        self.test_results.append(test_result)
        return test_result
    
    # Functional Tests
    
    def test_application_startup(self):
        """Test if the application starts up correctly."""
        def _test():
            try:
                # Check if the application is running
                response = self.session.get(f"{self.base_url}/health", timeout=10)
                if response.status_code == 200:
                    return True
                else:
                    return {"status": TestStatus.FAIL, "message": f"Health check returned status {response.status_code}"}
            except requests.exceptions.RequestException as e:
                return {"status": TestStatus.FAIL, "message": f"Application not responding: {str(e)}"}
        
        return self._run_test("application_startup", TestCategory.FUNCTIONAL, _test)
    
    def test_health_endpoint(self):
        """Test the health endpoint."""
        def _test():
            try:
                response = self.session.get(f"{self.base_url}/health", timeout=5)
                if response.status_code == 200:
                    data = response.json()
                    return {
                        "status": TestStatus.PASS,
                        "message": "Health endpoint responding correctly",
                        "details": {"response_data": data}
                    }
                else:
                    return {"status": TestStatus.FAIL, "message": f"Health endpoint returned status {response.status_code}"}
            except Exception as e:
                return {"status": TestStatus.FAIL, "message": f"Health endpoint error: {str(e)}"}
        
        return self._run_test("health_endpoint", TestCategory.FUNCTIONAL, _test)
    
    def test_database_connectivity(self):
        """Test database connectivity."""
        def _test():
            try:
                response = self.session.get(f"{self.api_base}/auth/status", timeout=5)
                if response.status_code in [200, 401]:  # 401 is expected if not authenticated
                    return True
                else:
                    return {"status": TestStatus.FAIL, "message": f"Database connectivity test failed with status {response.status_code}"}
            except Exception as e:
                return {"status": TestStatus.FAIL, "message": f"Database connectivity error: {str(e)}"}
        
        return self._run_test("database_connectivity", TestCategory.FUNCTIONAL, _test)
    
    def test_authentication_flow(self):
        """Test authentication flow."""
        def _test():
            try:
                # Test login endpoint
                login_data = {"username": "test", "password": "test"}
                response = self.session.post(f"{self.api_base}/auth/login", json=login_data, timeout=5)
                
                # We expect this to fail with invalid credentials, but the endpoint should be accessible
                if response.status_code in [200, 401, 400]:
                    return True
                else:
                    return {"status": TestStatus.FAIL, "message": f"Authentication endpoint returned unexpected status {response.status_code}"}
            except Exception as e:
                return {"status": TestStatus.FAIL, "message": f"Authentication flow error: {str(e)}"}
        
        return self._run_test("authentication_flow", TestCategory.FUNCTIONAL, _test)
    
    def test_server_management(self):
        """Test server management endpoints."""
        def _test():
            try:
                # Test servers endpoint (should return 401 without authentication)
                response = self.session.get(f"{self.api_base}/servers/", timeout=5)
                if response.status_code == 401:
                    return True
                else:
                    return {"status": TestStatus.FAIL, "message": f"Server management endpoint returned unexpected status {response.status_code}"}
            except Exception as e:
                return {"status": TestStatus.FAIL, "message": f"Server management error: {str(e)}"}
        
        return self._run_test("server_management", TestCategory.FUNCTIONAL, _test)
    
    def test_user_management(self):
        """Test user management endpoints."""
        def _test():
            try:
                # Test users endpoint (should return 401 without authentication)
                response = self.session.get(f"{self.api_base}/admin/users", timeout=5)
                if response.status_code == 401:
                    return True
                else:
                    return {"status": TestStatus.FAIL, "message": f"User management endpoint returned unexpected status {response.status_code}"}
            except Exception as e:
                return {"status": TestStatus.FAIL, "message": f"User management error: {str(e)}"}
        
        return self._run_test("user_management", TestCategory.FUNCTIONAL, _test)
    
    def test_admin_functions(self):
        """Test admin functions."""
        def _test():
            try:
                # Test admin config endpoint (should return 401 without authentication)
                response = self.session.get(f"{self.api_base}/admin/config", timeout=5)
                if response.status_code == 401:
                    return True
                else:
                    return {"status": TestStatus.FAIL, "message": f"Admin functions endpoint returned unexpected status {response.status_code}"}
            except Exception as e:
                return {"status": TestStatus.FAIL, "message": f"Admin functions error: {str(e)}"}
        
        return self._run_test("admin_functions", TestCategory.FUNCTIONAL, _test)
    
    # Performance Tests
    
    def test_response_times(self):
        """Test response times for key endpoints."""
        def _test():
            endpoints = [
                f"{self.base_url}/health",
                f"{self.api_base}/auth/status",
                f"{self.api_base}/servers/versions"
            ]
            
            results = {}
            all_passed = True
            
            for endpoint in endpoints:
                try:
                    start_time = time.time()
                    response = self.session.get(endpoint, timeout=10)
                    duration_ms = (time.time() - start_time) * 1000
                    
                    results[endpoint] = {
                        "status_code": response.status_code,
                        "duration_ms": duration_ms,
                        "passed": duration_ms < 1000  # 1 second threshold
                    }
                    
                    if duration_ms >= 1000:
                        all_passed = False
                        
                except Exception as e:
                    results[endpoint] = {"error": str(e), "passed": False}
                    all_passed = False
            
            return {
                "status": TestStatus.PASS if all_passed else TestStatus.FAIL,
                "message": "Response time test completed",
                "details": {"endpoints": results}
            }
        
        return self._run_test("response_times", TestCategory.PERFORMANCE, _test)
    
    def test_concurrent_requests(self):
        """Test concurrent request handling."""
        def _test():
            import threading
            import queue
            
            results = queue.Queue()
            threads = []
            
            def make_request():
                try:
                    start_time = time.time()
                    response = self.session.get(f"{self.base_url}/health", timeout=5)
                    duration_ms = (time.time() - start_time) * 1000
                    results.put({
                        "status_code": response.status_code,
                        "duration_ms": duration_ms,
                        "success": response.status_code == 200
                    })
                except Exception as e:
                    results.put({"error": str(e), "success": False})
            
            # Create 10 concurrent requests
            for _ in range(10):
                thread = threading.Thread(target=make_request)
                threads.append(thread)
                thread.start()
            
            # Wait for all threads to complete
            for thread in threads:
                thread.join()
            
            # Collect results
            request_results = []
            while not results.empty():
                request_results.append(results.get())
            
            successful_requests = len([r for r in request_results if r.get("success", False)])
            success_rate = successful_requests / len(request_results) * 100
            
            return {
                "status": TestStatus.PASS if success_rate >= 90 else TestStatus.FAIL,
                "message": f"Concurrent requests test: {success_rate:.1f}% success rate",
                "details": {
                    "total_requests": len(request_results),
                    "successful_requests": successful_requests,
                    "success_rate": success_rate,
                    "results": request_results
                }
            }
        
        return self._run_test("concurrent_requests", TestCategory.PERFORMANCE, _test)
    
    def test_memory_usage(self):
        """Test memory usage under normal conditions."""
        def _test():
            try:
                import psutil
                
                # Get current memory usage
                memory = psutil.virtual_memory()
                memory_percent = memory.percent
                
                # Test memory usage threshold (should be under 80%)
                if memory_percent < 80:
                    status = TestStatus.PASS
                    message = f"Memory usage is acceptable: {memory_percent:.1f}%"
                else:
                    status = TestStatus.FAIL
                    message = f"Memory usage is high: {memory_percent:.1f}%"
                
                return {
                    "status": status,
                    "message": message,
                    "details": {
                        "memory_percent": memory_percent,
                        "available_mb": memory.available / 1024 / 1024,
                        "total_mb": memory.total / 1024 / 1024
                    }
                }
            except Exception as e:
                return {"status": TestStatus.ERROR, "message": f"Memory usage test error: {str(e)}"}
        
        return self._run_test("memory_usage", TestCategory.PERFORMANCE, _test)
    
    def test_database_performance(self):
        """Test database performance."""
        def _test():
            try:
                # Test database query performance
                start_time = time.time()
                response = self.session.get(f"{self.api_base}/auth/status", timeout=5)
                duration_ms = (time.time() - start_time) * 1000
                
                if duration_ms < 100:  # 100ms threshold for database queries
                    status = TestStatus.PASS
                    message = f"Database performance is good: {duration_ms:.1f}ms"
                else:
                    status = TestStatus.FAIL
                    message = f"Database performance is slow: {duration_ms:.1f}ms"
                
                return {
                    "status": status,
                    "message": message,
                    "details": {
                        "query_duration_ms": duration_ms,
                        "status_code": response.status_code
                    }
                }
            except Exception as e:
                return {"status": TestStatus.ERROR, "message": f"Database performance test error: {str(e)}"}
        
        return self._run_test("database_performance", TestCategory.PERFORMANCE, _test)
    
    # Security Tests
    
    def test_authentication_security(self):
        """Test authentication security."""
        def _test():
            try:
                # Test with invalid credentials
                invalid_data = {"username": "invalid", "password": "invalid"}
                response = self.session.post(f"{self.api_base}/auth/login", json=invalid_data, timeout=5)
                
                if response.status_code == 401:
                    return True
                else:
                    return {"status": TestStatus.FAIL, "message": f"Invalid credentials should return 401, got {response.status_code}"}
            except Exception as e:
                return {"status": TestStatus.FAIL, "message": f"Authentication security test error: {str(e)}"}
        
        return self._run_test("authentication_security", TestCategory.SECURITY, _test)
    
    def test_authorization_security(self):
        """Test authorization security."""
        def _test():
            try:
                # Test accessing protected endpoint without authentication
                response = self.session.get(f"{self.api_base}/admin/users", timeout=5)
                
                if response.status_code == 401:
                    return True
                else:
                    return {"status": TestStatus.FAIL, "message": f"Protected endpoint should return 401, got {response.status_code}"}
            except Exception as e:
                return {"status": TestStatus.FAIL, "message": f"Authorization security test error: {str(e)}"}
        
        return self._run_test("authorization_security", TestCategory.SECURITY, _test)
    
    def test_input_validation(self):
        """Test input validation."""
        def _test():
            try:
                # Test with malformed JSON
                response = self.session.post(
                    f"{self.api_base}/auth/login",
                    data="invalid json",
                    headers={"Content-Type": "application/json"},
                    timeout=5
                )
                
                if response.status_code in [400, 415]:  # Bad request or unsupported media type
                    return True
                else:
                    return {"status": TestStatus.FAIL, "message": f"Malformed input should return 400/415, got {response.status_code}"}
            except Exception as e:
                return {"status": TestStatus.FAIL, "message": f"Input validation test error: {str(e)}"}
        
        return self._run_test("input_validation", TestCategory.SECURITY, _test)
    
    def test_rate_limiting(self):
        """Test rate limiting."""
        def _test():
            try:
                # Make multiple requests quickly to test rate limiting
                responses = []
                for _ in range(5):
                    response = self.session.get(f"{self.api_base}/auth/status", timeout=5)
                    responses.append(response.status_code)
                    time.sleep(0.1)  # Small delay between requests
                
                # Check if any requests were rate limited (429)
                rate_limited = any(status == 429 for status in responses)
                
                if rate_limited:
                    return {
                        "status": TestStatus.PASS,
                        "message": "Rate limiting is working",
                        "details": {"responses": responses}
                    }
                else:
                    return {
                        "status": TestStatus.FAIL,
                        "message": "Rate limiting not detected",
                        "details": {"responses": responses}
                    }
            except Exception as e:
                return {"status": TestStatus.ERROR, "message": f"Rate limiting test error: {str(e)}"}
        
        return self._run_test("rate_limiting", TestCategory.SECURITY, _test)
    
    def test_ssl_configuration(self):
        """Test SSL configuration."""
        def _test():
            try:
                # Test HTTPS if available
                https_url = self.base_url.replace("http://", "https://")
                response = self.session.get(f"{https_url}/health", timeout=5, verify=False)
                
                if response.status_code == 200:
                    return {
                        "status": TestStatus.PASS,
                        "message": "HTTPS is configured and working",
                        "details": {"https_url": https_url}
                    }
                else:
                    return {
                        "status": TestStatus.FAIL,
                        "message": f"HTTPS not working, status: {response.status_code}",
                        "details": {"https_url": https_url}
                    }
            except requests.exceptions.SSLError:
                return {
                    "status": TestStatus.FAIL,
                    "message": "SSL certificate error",
                    "details": {"error": "SSL certificate validation failed"}
                }
            except requests.exceptions.ConnectionError:
                return {
                    "status": TestStatus.FAIL,
                    "message": "HTTPS not available",
                    "details": {"error": "Connection refused"}
                }
            except Exception as e:
                return {"status": TestStatus.ERROR, "message": f"SSL configuration test error: {str(e)}"}
        
        return self._run_test("ssl_configuration", TestCategory.SECURITY, _test)
    
    # Integration Tests
    
    def test_frontend_backend_integration(self):
        """Test frontend-backend integration."""
        def _test():
            try:
                # Test if frontend is accessible
                response = self.session.get(f"{self.base_url}/", timeout=5)
                
                if response.status_code == 200:
                    return {
                        "status": TestStatus.PASS,
                        "message": "Frontend is accessible",
                        "details": {"status_code": response.status_code}
                    }
                else:
                    return {
                        "status": TestStatus.FAIL,
                        "message": f"Frontend not accessible, status: {response.status_code}",
                        "details": {"status_code": response.status_code}
                    }
            except Exception as e:
                return {"status": TestStatus.FAIL, "message": f"Frontend-backend integration error: {str(e)}"}
        
        return self._run_test("frontend_backend_integration", TestCategory.INTEGRATION, _test)
    
    def test_websocket_connectivity(self):
        """Test WebSocket connectivity."""
        def _test():
            try:
                # Test WebSocket endpoint (if available)
                ws_url = self.base_url.replace("http://", "ws://") + "/ws"
                
                # This is a simplified test - in a real implementation, you'd use a WebSocket client
                response = self.session.get(f"{self.base_url}/ws", timeout=5)
                
                if response.status_code in [200, 101, 426]:  # 101 = switching protocols, 426 = upgrade required
                    return {
                        "status": TestStatus.PASS,
                        "message": "WebSocket endpoint is accessible",
                        "details": {"status_code": response.status_code}
                    }
                else:
                    return {
                        "status": TestStatus.FAIL,
                        "message": f"WebSocket endpoint not accessible, status: {response.status_code}",
                        "details": {"status_code": response.status_code}
                    }
            except Exception as e:
                return {"status": TestStatus.FAIL, "message": f"WebSocket connectivity error: {str(e)}"}
        
        return self._run_test("websocket_connectivity", TestCategory.INTEGRATION, _test)
    
    def test_file_operations(self):
        """Test file operations."""
        def _test():
            try:
                # Test if server files directory is accessible
                servers_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'servers')
                
                if os.path.exists(servers_dir) and os.path.isdir(servers_dir):
                    return {
                        "status": TestStatus.PASS,
                        "message": "Server files directory is accessible",
                        "details": {"servers_dir": servers_dir}
                    }
                else:
                    return {
                        "status": TestStatus.FAIL,
                        "message": "Server files directory not accessible",
                        "details": {"servers_dir": servers_dir}
                    }
            except Exception as e:
                return {"status": TestStatus.ERROR, "message": f"File operations test error: {str(e)}"}
        
        return self._run_test("file_operations", TestCategory.INTEGRATION, _test)
    
    def test_backup_restore(self):
        """Test backup and restore functionality."""
        def _test():
            try:
                # Test if backup directory exists and is writable
                backup_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backups')
                
                if os.path.exists(backup_dir) and os.access(backup_dir, os.W_OK):
                    return {
                        "status": TestStatus.PASS,
                        "message": "Backup directory is accessible and writable",
                        "details": {"backup_dir": backup_dir}
                    }
                else:
                    return {
                        "status": TestStatus.FAIL,
                        "message": "Backup directory not accessible or writable",
                        "details": {"backup_dir": backup_dir}
                    }
            except Exception as e:
                return {"status": TestStatus.ERROR, "message": f"Backup restore test error: {str(e)}"}
        
        return self._run_test("backup_restore", TestCategory.INTEGRATION, _test)
    
    # Load Tests
    
    def test_load_capacity(self):
        """Test load capacity."""
        def _test():
            try:
                import threading
                import queue
                
                results = queue.Queue()
                threads = []
                
                def make_request():
                    try:
                        start_time = time.time()
                        response = self.session.get(f"{self.base_url}/health", timeout=10)
                        duration_ms = (time.time() - start_time) * 1000
                        results.put({
                            "status_code": response.status_code,
                            "duration_ms": duration_ms,
                            "success": response.status_code == 200
                        })
                    except Exception as e:
                        results.put({"error": str(e), "success": False})
                
                # Create 50 concurrent requests
                for _ in range(50):
                    thread = threading.Thread(target=make_request)
                    threads.append(thread)
                    thread.start()
                
                # Wait for all threads to complete
                for thread in threads:
                    thread.join()
                
                # Collect results
                request_results = []
                while not results.empty():
                    request_results.append(results.get())
                
                successful_requests = len([r for r in request_results if r.get("success", False)])
                success_rate = successful_requests / len(request_results) * 100
                
                return {
                    "status": TestStatus.PASS if success_rate >= 95 else TestStatus.FAIL,
                    "message": f"Load capacity test: {success_rate:.1f}% success rate",
                    "details": {
                        "total_requests": len(request_results),
                        "successful_requests": successful_requests,
                        "success_rate": success_rate
                    }
                }
            except Exception as e:
                return {"status": TestStatus.ERROR, "message": f"Load capacity test error: {str(e)}"}
        
        return self._run_test("load_capacity", TestCategory.LOAD, _test)
    
    def test_memory_under_load(self):
        """Test memory usage under load."""
        def _test():
            try:
                import psutil
                import threading
                
                # Get initial memory usage
                initial_memory = psutil.virtual_memory().percent
                
                # Create load
                def create_load():
                    for _ in range(100):
                        try:
                            self.session.get(f"{self.base_url}/health", timeout=5)
                        except:
                            pass
                
                threads = []
                for _ in range(5):
                    thread = threading.Thread(target=create_load)
                    threads.append(thread)
                    thread.start()
                
                # Wait for load to complete
                for thread in threads:
                    thread.join()
                
                # Get final memory usage
                final_memory = psutil.virtual_memory().percent
                memory_increase = final_memory - initial_memory
                
                if memory_increase < 10:  # Less than 10% increase
                    status = TestStatus.PASS
                    message = f"Memory usage under load is acceptable: {memory_increase:.1f}% increase"
                else:
                    status = TestStatus.FAIL
                    message = f"Memory usage under load is high: {memory_increase:.1f}% increase"
                
                return {
                    "status": status,
                    "message": message,
                    "details": {
                        "initial_memory": initial_memory,
                        "final_memory": final_memory,
                        "memory_increase": memory_increase
                    }
                }
            except Exception as e:
                return {"status": TestStatus.ERROR, "message": f"Memory under load test error: {str(e)}"}
        
        return self._run_test("memory_under_load", TestCategory.LOAD, _test)
    
    def test_database_under_load(self):
        """Test database performance under load."""
        def _test():
            try:
                import threading
                import queue
                
                results = queue.Queue()
                threads = []
                
                def make_db_request():
                    try:
                        start_time = time.time()
                        response = self.session.get(f"{self.api_base}/auth/status", timeout=5)
                        duration_ms = (time.time() - start_time) * 1000
                        results.put({
                            "status_code": response.status_code,
                            "duration_ms": duration_ms,
                            "success": response.status_code in [200, 401]
                        })
                    except Exception as e:
                        results.put({"error": str(e), "success": False})
                
                # Create 20 concurrent database requests
                for _ in range(20):
                    thread = threading.Thread(target=make_db_request)
                    threads.append(thread)
                    thread.start()
                
                # Wait for all threads to complete
                for thread in threads:
                    thread.join()
                
                # Collect results
                request_results = []
                while not results.empty():
                    request_results.append(results.get())
                
                successful_requests = len([r for r in request_results if r.get("success", False)])
                success_rate = successful_requests / len(request_results) * 100
                
                avg_duration = sum(r.get("duration_ms", 0) for r in request_results if r.get("success", False)) / max(successful_requests, 1)
                
                return {
                    "status": TestStatus.PASS if success_rate >= 95 and avg_duration < 200 else TestStatus.FAIL,
                    "message": f"Database under load: {success_rate:.1f}% success, {avg_duration:.1f}ms avg",
                    "details": {
                        "total_requests": len(request_results),
                        "successful_requests": successful_requests,
                        "success_rate": success_rate,
                        "average_duration_ms": avg_duration
                    }
                }
            except Exception as e:
                return {"status": TestStatus.ERROR, "message": f"Database under load test error: {str(e)}"}
        
        return self._run_test("database_under_load", TestCategory.LOAD, _test)
    
    # Stress Tests
    
    def test_stress_conditions(self):
        """Test system under stress conditions."""
        def _test():
            try:
                import threading
                import queue
                
                results = queue.Queue()
                threads = []
                
                def stress_request():
                    try:
                        start_time = time.time()
                        response = self.session.get(f"{self.base_url}/health", timeout=15)
                        duration_ms = (time.time() - start_time) * 1000
                        results.put({
                            "status_code": response.status_code,
                            "duration_ms": duration_ms,
                            "success": response.status_code == 200
                        })
                    except Exception as e:
                        results.put({"error": str(e), "success": False})
                
                # Create 100 concurrent requests (stress test)
                for _ in range(100):
                    thread = threading.Thread(target=stress_request)
                    threads.append(thread)
                    thread.start()
                
                # Wait for all threads to complete
                for thread in threads:
                    thread.join()
                
                # Collect results
                request_results = []
                while not results.empty():
                    request_results.append(results.get())
                
                successful_requests = len([r for r in request_results if r.get("success", False)])
                success_rate = successful_requests / len(request_results) * 100
                
                return {
                    "status": TestStatus.PASS if success_rate >= 80 else TestStatus.FAIL,
                    "message": f"Stress test: {success_rate:.1f}% success rate",
                    "details": {
                        "total_requests": len(request_results),
                        "successful_requests": successful_requests,
                        "success_rate": success_rate
                    }
                }
            except Exception as e:
                return {"status": TestStatus.ERROR, "message": f"Stress test error: {str(e)}"}
        
        return self._run_test("stress_conditions", TestCategory.STRESS, _test)
    
    def test_error_recovery(self):
        """Test error recovery capabilities."""
        def _test():
            try:
                # Test with invalid endpoint
                response = self.session.get(f"{self.base_url}/invalid-endpoint", timeout=5)
                
                if response.status_code == 404:
                    return {
                        "status": TestStatus.PASS,
                        "message": "Error handling is working correctly",
                        "details": {"status_code": response.status_code}
                    }
                else:
                    return {
                        "status": TestStatus.FAIL,
                        "message": f"Error handling not working, got status {response.status_code}",
                        "details": {"status_code": response.status_code}
                    }
            except Exception as e:
                return {"status": TestStatus.ERROR, "message": f"Error recovery test error: {str(e)}"}
        
        return self._run_test("error_recovery", TestCategory.STRESS, _test)
    
    def test_system_resilience(self):
        """Test system resilience."""
        def _test():
            try:
                # Test multiple rapid requests to test resilience
                responses = []
                for _ in range(10):
                    try:
                        response = self.session.get(f"{self.base_url}/health", timeout=5)
                        responses.append(response.status_code)
                    except Exception as e:
                        responses.append(f"error: {str(e)}")
                    time.sleep(0.1)
                
                successful_responses = len([r for r in responses if r == 200])
                success_rate = successful_responses / len(responses) * 100
                
                return {
                    "status": TestStatus.PASS if success_rate >= 90 else TestStatus.FAIL,
                    "message": f"System resilience: {success_rate:.1f}% success rate",
                    "details": {"responses": responses, "success_rate": success_rate}
                }
            except Exception as e:
                return {"status": TestStatus.ERROR, "message": f"System resilience test error: {str(e)}"}
        
        return self._run_test("system_resilience", TestCategory.STRESS, _test)
    
    def generate_validation_report(self) -> Dict[str, Any]:
        """Generate a comprehensive validation report."""
        # Count tests by status and category
        status_counts = {}
        category_counts = {}
        
        for result in self.test_results:
            status_counts[result.status] = status_counts.get(result.status, 0) + 1
            category_counts[result.category] = category_counts.get(result.category, 0) + 1
        
        # Determine overall validation status
        if status_counts.get(TestStatus.FAIL, 0) > 0 or status_counts.get(TestStatus.ERROR, 0) > 0:
            overall_status = 'FAILED'
        else:
            overall_status = 'PASSED'
        
        return {
            "overall_status": overall_status,
            "timestamp": datetime.now().isoformat(),
            "total_tests": len(self.test_results),
            "status_counts": {status.value: count for status, count in status_counts.items()},
            "category_counts": {category.value: count for category, count in category_counts.items()},
            "test_results": [
                {
                    "test_name": result.test_name,
                    "category": result.category.value,
                    "status": result.status.value,
                    "duration_ms": result.duration_ms,
                    "message": result.message,
                    "details": result.details,
                    "timestamp": result.timestamp.isoformat()
                }
                for result in self.test_results
            ],
            "summary": {
                "passed": status_counts.get(TestStatus.PASS, 0),
                "failed": status_counts.get(TestStatus.FAIL, 0),
                "errors": status_counts.get(TestStatus.ERROR, 0),
                "skipped": status_counts.get(TestStatus.SKIP, 0)
            }
        }


def main():
    """Main function for production validation."""
    if len(sys.argv) > 1:
        base_url = sys.argv[1]
    else:
        base_url = "http://localhost:5000"
    
    api_base = base_url + "/api/v1"
    
    print(f"Running production validation tests against: {base_url}")
    print("=" * 60)
    
    validator = ProductionValidator(base_url, api_base)
    
    # Run all tests
    results = validator.run_all_tests()
    
    # Generate report
    report = validator.generate_validation_report()
    
    # Print summary
    print(f"\nValidation Report - {report['timestamp']}")
    print(f"Overall Status: {report['overall_status']}")
    print(f"Total Tests: {report['total_tests']}")
    print(f"Passed: {report['summary']['passed']}")
    print(f"Failed: {report['summary']['failed']}")
    print(f"Errors: {report['summary']['errors']}")
    print(f"Skipped: {report['summary']['skipped']}")
    
    # Print detailed results
    print("\nDetailed Results:")
    for result in report['test_results']:
        status_emoji = {
            'pass': '✅',
            'fail': '❌',
            'error': '💥',
            'skip': '⏭️'
        }
        print(f"  {status_emoji.get(result['status'], '❓')} {result['test_name']} ({result['category']}): {result['message']}")
        if result['status'] in ['fail', 'error']:
            print(f"    Details: {result['details']}")
    
    # Exit with appropriate code
    if report['overall_status'] == 'FAILED':
        sys.exit(1)
    else:
        sys.exit(0)


if __name__ == '__main__':
    main()
