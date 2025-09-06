#!/usr/bin/env python3
"""
Development Environment Validation Script
Validates that both Flask and Express backends are running correctly
"""

import requests
import json
import sys
import time
from typing import Dict, Any, Optional

class DevEnvironmentValidator:
    def __init__(self):
        self.flask_url = "http://localhost:5000"
        self.express_url = "http://localhost:5001"
        self.timeout = 5
        
    def check_service(self, url: str, service_name: str) -> Dict[str, Any]:
        """Check if a service is running and healthy"""
        result = {
            "service": service_name,
            "url": url,
            "running": False,
            "healthy": False,
            "response_time": None,
            "error": None,
            "details": {}
        }
        
        try:
            start_time = time.time()
            response = requests.get(f"{url}/healthz", timeout=self.timeout)
            response_time = time.time() - start_time
            
            result["running"] = True
            result["response_time"] = round(response_time * 1000, 2)  # Convert to ms
            
            if response.status_code == 200:
                result["healthy"] = True
                try:
                    result["details"] = response.json()
                except:
                    result["details"] = {"raw_response": response.text}
            else:
                result["error"] = f"HTTP {response.status_code}"
                
        except requests.exceptions.ConnectionError:
            result["error"] = "Connection refused - service not running"
        except requests.exceptions.Timeout:
            result["error"] = "Request timeout"
        except Exception as e:
            result["error"] = str(e)
            
        return result
    
    def check_api_endpoints(self, url: str, service_name: str) -> Dict[str, Any]:
        """Check API endpoints availability"""
        endpoints = {
            "root": "/",
            "api_root": "/api/v1",
            "health": "/healthz",
        }
        
        results = {}
        for name, endpoint in endpoints.items():
            try:
                response = requests.get(f"{url}{endpoint}", timeout=self.timeout)
                results[name] = {
                    "status_code": response.status_code,
                    "available": response.status_code < 500,
                    "content_type": response.headers.get("content-type", ""),
                }
                
                # Try to parse JSON response
                try:
                    results[name]["json"] = response.json()
                except:
                    results[name]["text"] = response.text[:200]  # First 200 chars
                    
            except Exception as e:
                results[name] = {
                    "status_code": None,
                    "available": False,
                    "error": str(e)
                }
                
        return results
    
    def validate_environment(self) -> Dict[str, Any]:
        """Validate the entire development environment"""
        print("🔍 Validating Development Environment...")
        print("=" * 50)
        
        # Check Flask backend
        print("📊 Checking Flask Backend (Port 5000)...")
        flask_health = self.check_service(self.flask_url, "Flask")
        flask_endpoints = self.check_api_endpoints(self.flask_url, "Flask")
        
        # Check Express backend
        print("📊 Checking Express Backend (Port 5001)...")
        express_health = self.check_service(self.express_url, "Express")
        express_endpoints = self.check_api_endpoints(self.express_url, "Express")
        
        # Compile results
        results = {
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "flask": {
                "health": flask_health,
                "endpoints": flask_endpoints
            },
            "express": {
                "health": express_health,
                "endpoints": express_endpoints
            },
            "summary": {
                "flask_running": flask_health["running"],
                "flask_healthy": flask_health["healthy"],
                "express_running": express_health["running"],
                "express_healthy": express_health["healthy"],
                "both_running": flask_health["running"] and express_health["running"],
                "both_healthy": flask_health["healthy"] and express_health["healthy"]
            }
        }
        
        return results
    
    def print_results(self, results: Dict[str, Any]):
        """Print validation results in a readable format"""
        print("\n📋 Validation Results")
        print("=" * 50)
        
        # Flask results
        flask = results["flask"]
        print(f"\n🐍 Flask Backend (Port 5000):")
        print(f"  Status: {'✅ Running' if flask['health']['running'] else '❌ Not Running'}")
        print(f"  Health: {'✅ Healthy' if flask['health']['healthy'] else '❌ Unhealthy'}")
        if flask['health']['response_time']:
            print(f"  Response Time: {flask['health']['response_time']}ms")
        if flask['health']['error']:
            print(f"  Error: {flask['health']['error']}")
            
        # Express results
        express = results["express"]
        print(f"\n🚀 Express Backend (Port 5001):")
        print(f"  Status: {'✅ Running' if express['health']['running'] else '❌ Not Running'}")
        print(f"  Health: {'✅ Healthy' if express['health']['healthy'] else '❌ Unhealthy'}")
        if express['health']['response_time']:
            print(f"  Response Time: {express['health']['response_time']}ms")
        if express['health']['error']:
            print(f"  Error: {express['health']['error']}")
        
        # Summary
        summary = results["summary"]
        print(f"\n📊 Summary:")
        print(f"  Both Backends Running: {'✅ Yes' if summary['both_running'] else '❌ No'}")
        print(f"  Both Backends Healthy: {'✅ Yes' if summary['both_healthy'] else '❌ No'}")
        
        # Detailed endpoint information
        print(f"\n🔗 Endpoint Details:")
        for service_name, service_data in [("Flask", flask), ("Express", express)]:
            print(f"\n  {service_name} Endpoints:")
            for endpoint_name, endpoint_data in service_data["endpoints"].items():
                status = "✅" if endpoint_data.get("available", False) else "❌"
                status_code = endpoint_data.get("status_code", "N/A")
                print(f"    {endpoint_name}: {status} (HTTP {status_code})")
        
        return summary["both_running"] and summary["both_healthy"]

def main():
    """Main function"""
    validator = DevEnvironmentValidator()
    
    try:
        results = validator.validate_environment()
        success = validator.print_results(results)
        
        # Save results to file
        with open("dev-environment-validation.json", "w") as f:
            json.dump(results, f, indent=2)
        print(f"\n💾 Results saved to: dev-environment-validation.json")
        
        if success:
            print(f"\n🎉 Development environment validation PASSED!")
            print(f"Both backends are running and healthy.")
            sys.exit(0)
        else:
            print(f"\n❌ Development environment validation FAILED!")
            print(f"One or more backends are not running or healthy.")
            sys.exit(1)
            
    except KeyboardInterrupt:
        print(f"\n⏹️  Validation interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Validation failed with error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
