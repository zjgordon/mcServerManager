#!/usr/bin/env python3
"""
Contract Testing Framework for Flask API Baseline

This script validates API responses against the established baseline
to ensure contract stability during Node.js/Express migration.

Usage:
    python scripts/contract_testing.py --baseline-capture    # Capture current Flask responses
    python scripts/contract_testing.py --validate           # Validate against baseline
    python scripts/contract_testing.py --compare <express_url>  # Compare Flask vs Express
"""

import json
import requests
import argparse
import os
import sys
from datetime import datetime
from typing import Dict, Any, Optional, List
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

class ContractTester:
    def __init__(self, base_url: str = "http://localhost:5000"):
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.baseline_file = project_root / "docs" / "contracts" / "api_responses_baseline.json"
        self.results_file = project_root / "docs" / "contracts" / "contract_test_results.json"
        
    def capture_baseline(self) -> Dict[str, Any]:
        """Capture current Flask API responses as baseline."""
        print("🔍 Capturing Flask API baseline responses...")
        
        baseline = {
            "timestamp": datetime.now().isoformat(),
            "base_url": self.base_url,
            "responses": {}
        }
        
        # Test endpoints that don't require authentication
        public_endpoints = [
            ("GET", "/api/v1/"),
            ("GET", "/api/v1/health"),
            ("GET", "/api/v1/auth/csrf-token"),
            ("GET", "/api/v1/auth/status"),
            ("GET", "/api/v1/auth/setup/status"),
        ]
        
        for method, endpoint in public_endpoints:
            try:
                response = self._make_request(method, endpoint)
                baseline["responses"][f"{method} {endpoint}"] = {
                    "status_code": response.status_code,
                    "headers": dict(response.headers),
                    "body": response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text
                }
                print(f"✅ {method} {endpoint} - {response.status_code}")
            except Exception as e:
                print(f"❌ {method} {endpoint} - Error: {e}")
                baseline["responses"][f"{method} {endpoint}"] = {
                    "error": str(e)
                }
        
        # Save baseline
        self.baseline_file.parent.mkdir(exist_ok=True)
        with open(self.baseline_file, 'w') as f:
            json.dump(baseline, f, indent=2)
        
        print(f"📁 Baseline saved to: {self.baseline_file}")
        return baseline
    
    def validate_against_baseline(self) -> Dict[str, Any]:
        """Validate current API responses against baseline."""
        print("🔍 Validating current API responses against baseline...")
        
        if not self.baseline_file.exists():
            print("❌ No baseline file found. Run with --baseline-capture first.")
            return {}
        
        with open(self.baseline_file, 'r') as f:
            baseline = json.load(f)
        
        results = {
            "timestamp": datetime.now().isoformat(),
            "base_url": self.base_url,
            "validation_results": {}
        }
        
        for endpoint_key, baseline_response in baseline["responses"].items():
            method, endpoint = endpoint_key.split(' ', 1)
            
            try:
                current_response = self._make_request(method, endpoint)
                
                # Compare responses
                comparison = self._compare_responses(
                    baseline_response, 
                    {
                        "status_code": current_response.status_code,
                        "headers": dict(current_response.headers),
                        "body": current_response.json() if current_response.headers.get('content-type', '').startswith('application/json') else current_response.text
                    }
                )
                
                results["validation_results"][endpoint_key] = comparison
                
                if comparison["status"] == "PASS":
                    print(f"✅ {endpoint_key} - PASS")
                else:
                    print(f"❌ {endpoint_key} - FAIL: {comparison['message']}")
                    
            except Exception as e:
                results["validation_results"][endpoint_key] = {
                    "status": "ERROR",
                    "message": str(e)
                }
                print(f"❌ {endpoint_key} - ERROR: {e}")
        
        # Save results
        with open(self.results_file, 'w') as f:
            json.dump(results, f, indent=2)
        
        print(f"📁 Validation results saved to: {self.results_file}")
        return results
    
    def compare_with_express(self, express_url: str) -> Dict[str, Any]:
        """Compare Flask responses with Express responses."""
        print(f"🔍 Comparing Flask ({self.base_url}) vs Express ({express_url})...")
        
        if not self.baseline_file.exists():
            print("❌ No baseline file found. Run with --baseline-capture first.")
            return {}
        
        with open(self.baseline_file, 'r') as f:
            baseline = json.load(f)
        
        results = {
            "timestamp": datetime.now().isoformat(),
            "flask_url": self.base_url,
            "express_url": express_url,
            "comparison_results": {}
        }
        
        for endpoint_key, flask_response in baseline["responses"].items():
            method, endpoint = endpoint_key.split(' ', 1)
            
            try:
                # Get Express response
                express_response = requests.request(
                    method, 
                    f"{express_url.rstrip('/')}{endpoint}",
                    timeout=10
                )
                
                # Compare responses
                comparison = self._compare_responses(
                    flask_response,
                    {
                        "status_code": express_response.status_code,
                        "headers": dict(express_response.headers),
                        "body": express_response.json() if express_response.headers.get('content-type', '').startswith('application/json') else express_response.text
                    }
                )
                
                results["comparison_results"][endpoint_key] = comparison
                
                if comparison["status"] == "PASS":
                    print(f"✅ {endpoint_key} - PASS")
                else:
                    print(f"❌ {endpoint_key} - FAIL: {comparison['message']}")
                    
            except Exception as e:
                results["comparison_results"][endpoint_key] = {
                    "status": "ERROR",
                    "message": str(e)
                }
                print(f"❌ {endpoint_key} - ERROR: {e}")
        
        # Save results
        comparison_file = project_root / "docs" / "contracts" / "flask_vs_express_comparison.json"
        with open(comparison_file, 'w') as f:
            json.dump(results, f, indent=2)
        
        print(f"📁 Comparison results saved to: {comparison_file}")
        return results
    
    def _make_request(self, method: str, endpoint: str) -> requests.Response:
        """Make HTTP request with proper error handling."""
        url = f"{self.base_url}{endpoint}"
        
        try:
            response = self.session.request(method, url, timeout=10)
            return response
        except requests.exceptions.RequestException as e:
            raise Exception(f"Request failed: {e}")
    
    def _compare_responses(self, baseline: Dict[str, Any], current: Dict[str, Any]) -> Dict[str, Any]:
        """Compare two API responses."""
        result = {
            "status": "PASS",
            "message": "Responses match",
            "differences": []
        }
        
        # Compare status codes
        if baseline.get("status_code") != current.get("status_code"):
            result["status"] = "FAIL"
            result["differences"].append({
                "field": "status_code",
                "baseline": baseline.get("status_code"),
                "current": current.get("status_code")
            })
        
        # Compare response bodies (for JSON responses)
        if isinstance(baseline.get("body"), dict) and isinstance(current.get("body"), dict):
            body_diff = self._compare_json_objects(baseline["body"], current["body"])
            if body_diff:
                result["status"] = "FAIL"
                result["differences"].append({
                    "field": "body",
                    "differences": body_diff
                })
        elif baseline.get("body") != current.get("body"):
            result["status"] = "FAIL"
            result["differences"].append({
                "field": "body",
                "baseline": baseline.get("body"),
                "current": current.get("body")
            })
        
        # Update message if there are differences
        if result["differences"]:
            result["message"] = f"Found {len(result['differences'])} differences"
        
        return result
    
    def _compare_json_objects(self, obj1: Dict[str, Any], obj2: Dict[str, Any], path: str = "") -> List[Dict[str, Any]]:
        """Recursively compare JSON objects."""
        differences = []
        
        # Check for missing keys
        for key in obj1:
            current_path = f"{path}.{key}" if path else key
            if key not in obj2:
                differences.append({
                    "path": current_path,
                    "type": "missing_key",
                    "baseline": obj1[key],
                    "current": None
                })
            elif isinstance(obj1[key], dict) and isinstance(obj2[key], dict):
                differences.extend(self._compare_json_objects(obj1[key], obj2[key], current_path))
            elif obj1[key] != obj2[key]:
                differences.append({
                    "path": current_path,
                    "type": "value_mismatch",
                    "baseline": obj1[key],
                    "current": obj2[key]
                })
        
        # Check for extra keys
        for key in obj2:
            if key not in obj1:
                current_path = f"{path}.{key}" if path else key
                differences.append({
                    "path": current_path,
                    "type": "extra_key",
                    "baseline": None,
                    "current": obj2[key]
                })
        
        return differences
    
    def generate_report(self) -> str:
        """Generate a human-readable test report."""
        if not self.results_file.exists():
            return "No test results found. Run validation first."
        
        with open(self.results_file, 'r') as f:
            results = json.load(f)
        
        report = []
        report.append("# Contract Testing Report")
        report.append(f"**Generated:** {results['timestamp']}")
        report.append(f"**Base URL:** {results['base_url']}")
        report.append("")
        
        # Summary
        total_tests = len(results["validation_results"])
        passed_tests = sum(1 for r in results["validation_results"].values() if r["status"] == "PASS")
        failed_tests = total_tests - passed_tests
        
        report.append("## Summary")
        report.append(f"- **Total Tests:** {total_tests}")
        report.append(f"- **Passed:** {passed_tests}")
        report.append(f"- **Failed:** {failed_tests}")
        report.append(f"- **Success Rate:** {(passed_tests/total_tests*100):.1f}%")
        report.append("")
        
        # Detailed results
        report.append("## Detailed Results")
        for endpoint, result in results["validation_results"].items():
            status_emoji = "✅" if result["status"] == "PASS" else "❌"
            report.append(f"### {status_emoji} {endpoint}")
            report.append(f"- **Status:** {result['status']}")
            report.append(f"- **Message:** {result['message']}")
            
            if result.get("differences"):
                report.append("- **Differences:**")
                for diff in result["differences"]:
                    report.append(f"  - {diff['field']}: {diff}")
            report.append("")
        
        return "\n".join(report)

def main():
    parser = argparse.ArgumentParser(description="Contract Testing Framework for Flask API")
    parser.add_argument("--baseline-capture", action="store_true", 
                       help="Capture current Flask API responses as baseline")
    parser.add_argument("--validate", action="store_true",
                       help="Validate current API responses against baseline")
    parser.add_argument("--compare", type=str, metavar="EXPRESS_URL",
                       help="Compare Flask responses with Express API")
    parser.add_argument("--flask-url", type=str, default="http://localhost:5000",
                       help="Flask API base URL (default: http://localhost:5000)")
    parser.add_argument("--report", action="store_true",
                       help="Generate human-readable test report")
    
    args = parser.parse_args()
    
    if not any([args.baseline_capture, args.validate, args.compare, args.report]):
        parser.print_help()
        return
    
    tester = ContractTester(args.flask_url)
    
    if args.baseline_capture:
        tester.capture_baseline()
    
    if args.validate:
        tester.validate_against_baseline()
    
    if args.compare:
        tester.compare_with_express(args.compare)
    
    if args.report:
        report = tester.generate_report()
        print(report)
        
        # Save report to file
        report_file = project_root / "docs" / "contracts" / "contract_test_report.md"
        with open(report_file, 'w') as f:
            f.write(report)
        print(f"\n📁 Report saved to: {report_file}")

if __name__ == "__main__":
    main()

