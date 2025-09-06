#!/usr/bin/env python3

"""
Routing Test Script for Minecraft Server Manager
This script tests the routing configuration to ensure endpoints are correctly
routed to the appropriate backend during the strangler pattern migration.
"""

import requests
import json
import time
import argparse
from typing import Dict, List, Optional
from urllib.parse import urljoin

class RoutingTester:
    def __init__(self, base_url: str = "http://localhost"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Minecraft-Server-Manager-Routing-Test/1.0'
        })
        
    def test_endpoint(self, endpoint: str, expected_backend: str = None) -> Dict:
        """Test a single endpoint and return results"""
        url = urljoin(self.base_url, endpoint)
        
        try:
            start_time = time.time()
            response = self.session.get(url, timeout=10)
            response_time = time.time() - start_time
            
            # Try to determine which backend responded
            backend = self._detect_backend(response)
            
            return {
                'endpoint': endpoint,
                'url': url,
                'status_code': response.status_code,
                'response_time': round(response_time, 3),
                'backend': backend,
                'expected_backend': expected_backend,
                'correct': backend == expected_backend if expected_backend else True,
                'headers': dict(response.headers),
                'error': None
            }
        except requests.exceptions.RequestException as e:
            return {
                'endpoint': endpoint,
                'url': url,
                'status_code': None,
                'response_time': None,
                'backend': None,
                'expected_backend': expected_backend,
                'correct': False,
                'headers': {},
                'error': str(e)
            }
    
    def _detect_backend(self, response: requests.Response) -> Optional[str]:
        """Detect which backend responded based on response characteristics"""
        headers = response.headers
        
        # Check for Flask-specific headers
        if 'Server' in headers and 'Werkzeug' in headers['Server']:
            return 'flask'
        
        # Check for Express-specific headers
        if 'X-Powered-By' in headers and 'Express' in headers['X-Powered-By']:
            return 'express'
        
        # Check for Nginx/Caddy headers
        if 'Server' in headers:
            if 'nginx' in headers['Server'].lower():
                return 'nginx'
            elif 'caddy' in headers['Server'].lower():
                return 'caddy'
        
        # Check response content for backend indicators
        try:
            content = response.text.lower()
            if 'flask' in content or 'werkzeug' in content:
                return 'flask'
            elif 'express' in content or 'node' in content:
                return 'express'
        except:
            pass
        
        return 'unknown'
    
    def test_phase_routing(self, phase: int) -> Dict:
        """Test routing for a specific phase"""
        phase_configs = {
            0: {
                'name': 'Contract Testing & Infrastructure',
                'endpoints': {
                    '/api/v1/auth/login': 'flask',
                    '/api/v1/servers': 'flask',
                    '/api/v1/admin/users': 'flask',
                    '/healthz': 'nginx',  # Nginx health check
                }
            },
            1: {
                'name': 'Foundation & Setup',
                'endpoints': {
                    '/api/v1/auth/login': 'flask',
                    '/api/v1/servers': 'flask',
                    '/api/v1/admin/users': 'flask',
                    '/healthz': 'nginx',
                }
            },
            2: {
                'name': 'API Migration with Contract Testing',
                'endpoints': {
                    '/api/v1/auth/login': 'express',
                    '/api/v1/servers': 'express',
                    '/api/v1/admin/users': 'express',
                    '/healthz': 'nginx',
                }
            },
            3: {
                'name': 'Process Management & System Integration',
                'endpoints': {
                    '/api/v1/auth/login': 'express',
                    '/api/v1/servers': 'express',
                    '/api/v1/admin/users': 'express',
                    '/healthz': 'nginx',
                }
            },
            4: {
                'name': 'Real-time & Background Processing',
                'endpoints': {
                    '/api/v1/auth/login': 'express',
                    '/api/v1/servers': 'express',
                    '/api/v1/admin/users': 'express',
                    '/api/v1/servers/1/logs': 'express',  # SSE endpoint
                    '/socket.io/': 'express',  # WebSocket endpoint
                    '/healthz': 'nginx',
                }
            },
            5: {
                'name': 'Production Readiness & Cutover',
                'endpoints': {
                    '/api/v1/auth/login': 'express',
                    '/api/v1/servers': 'express',
                    '/api/v1/admin/users': 'express',
                    '/api/v1/servers/1/logs': 'express',
                    '/socket.io/': 'express',
                    '/healthz': 'nginx',
                }
            }
        }
        
        if phase not in phase_configs:
            return {
                'phase': phase,
                'error': f'Phase {phase} not found',
                'results': []
            }
        
        config = phase_configs[phase]
        results = []
        
        print(f"Testing Phase {phase}: {config['name']}")
        print("=" * 50)
        
        for endpoint, expected_backend in config['endpoints'].items():
            print(f"Testing {endpoint}...", end=' ')
            result = self.test_endpoint(endpoint, expected_backend)
            results.append(result)
            
            if result['correct']:
                print(f"✓ {result['status_code']} ({result['backend']})")
            else:
                print(f"✗ {result['status_code']} ({result['backend']}, expected {expected_backend})")
                if result['error']:
                    print(f"  Error: {result['error']}")
        
        return {
            'phase': phase,
            'name': config['name'],
            'results': results,
            'summary': self._generate_summary(results)
        }
    
    def _generate_summary(self, results: List[Dict]) -> Dict:
        """Generate test summary"""
        total = len(results)
        correct = sum(1 for r in results if r['correct'])
        errors = sum(1 for r in results if r['error'])
        
        avg_response_time = None
        response_times = [r['response_time'] for r in results if r['response_time'] is not None]
        if response_times:
            avg_response_time = round(sum(response_times) / len(response_times), 3)
        
        return {
            'total': total,
            'correct': correct,
            'incorrect': total - correct,
            'errors': errors,
            'success_rate': round((correct / total) * 100, 1) if total > 0 else 0,
            'avg_response_time': avg_response_time
        }
    
    def test_all_phases(self) -> Dict:
        """Test all phases"""
        all_results = {}
        
        for phase in range(6):
            print(f"\n{'='*60}")
            print(f"Testing Phase {phase}")
            print('='*60)
            
            phase_result = self.test_phase_routing(phase)
            all_results[phase] = phase_result
            
            # Wait between phases
            time.sleep(1)
        
        return all_results
    
    def test_health_checks(self) -> Dict:
        """Test health check endpoints"""
        health_endpoints = [
            '/healthz',
            '/readyz',
            '/api/v1/auth/status',
            '/api/v1/servers/status'
        ]
        
        results = []
        
        print("Testing Health Checks")
        print("=" * 30)
        
        for endpoint in health_endpoints:
            print(f"Testing {endpoint}...", end=' ')
            result = self.test_endpoint(endpoint)
            results.append(result)
            
            if result['status_code'] == 200:
                print(f"✓ {result['status_code']}")
            else:
                print(f"✗ {result['status_code']}")
                if result['error']:
                    print(f"  Error: {result['error']}")
        
        return {
            'health_checks': results,
            'summary': self._generate_summary(results)
        }
    
    def test_performance(self, endpoint: str, iterations: int = 10) -> Dict:
        """Test performance of a specific endpoint"""
        results = []
        
        print(f"Performance testing {endpoint} ({iterations} iterations)")
        print("=" * 50)
        
        for i in range(iterations):
            result = self.test_endpoint(endpoint)
            results.append(result)
            print(f"  {i+1:2d}: {result['response_time']:6.3f}s ({result['status_code']})")
            time.sleep(0.1)
        
        response_times = [r['response_time'] for r in results if r['response_time'] is not None]
        
        if response_times:
            return {
                'endpoint': endpoint,
                'iterations': iterations,
                'min_time': min(response_times),
                'max_time': max(response_times),
                'avg_time': sum(response_times) / len(response_times),
                'success_rate': len(response_times) / iterations * 100,
                'results': results
            }
        else:
            return {
                'endpoint': endpoint,
                'iterations': iterations,
                'error': 'No successful requests',
                'results': results
            }

def main():
    parser = argparse.ArgumentParser(description="Test routing configuration")
    parser.add_argument("--base-url", default="http://localhost", help="Base URL to test")
    parser.add_argument("--phase", type=int, help="Test specific phase (0-5)")
    parser.add_argument("--all-phases", action="store_true", help="Test all phases")
    parser.add_argument("--health", action="store_true", help="Test health checks")
    parser.add_argument("--performance", help="Test performance of specific endpoint")
    parser.add_argument("--iterations", type=int, default=10, help="Number of iterations for performance test")
    parser.add_argument("--output", help="Output file for results (JSON)")
    
    args = parser.parse_args()
    
    tester = RoutingTester(args.base_url)
    results = {}
    
    if args.phase is not None:
        results['phase_test'] = tester.test_phase_routing(args.phase)
    elif args.all_phases:
        results['all_phases'] = tester.test_all_phases()
    elif args.health:
        results['health_checks'] = tester.test_health_checks()
    elif args.performance:
        results['performance'] = tester.test_performance(args.performance, args.iterations)
    else:
        # Default: test current phase (assume Phase 0)
        results['phase_test'] = tester.test_phase_routing(0)
    
    # Print summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    if 'phase_test' in results:
        summary = results['phase_test']['summary']
        print(f"Phase: {results['phase_test']['phase']}")
        print(f"Success Rate: {summary['success_rate']}%")
        print(f"Total Tests: {summary['total']}")
        print(f"Correct: {summary['correct']}")
        print(f"Errors: {summary['errors']}")
        if summary['avg_response_time']:
            print(f"Avg Response Time: {summary['avg_response_time']}s")
    
    elif 'all_phases' in results:
        for phase, phase_result in results['all_phases'].items():
            summary = phase_result['summary']
            print(f"Phase {phase}: {summary['success_rate']}% success rate")
    
    elif 'health_checks' in results:
        summary = results['health_checks']['summary']
        print(f"Health Checks: {summary['success_rate']}% success rate")
        print(f"Total Tests: {summary['total']}")
        print(f"Errors: {summary['errors']}")
    
    elif 'performance' in results:
        perf = results['performance']
        if 'error' not in perf:
            print(f"Endpoint: {perf['endpoint']}")
            print(f"Success Rate: {perf['success_rate']}%")
            print(f"Min Time: {perf['min_time']:.3f}s")
            print(f"Max Time: {perf['max_time']:.3f}s")
            print(f"Avg Time: {perf['avg_time']:.3f}s")
        else:
            print(f"Error: {perf['error']}")
    
    # Save results to file if requested
    if args.output:
        with open(args.output, 'w') as f:
            json.dump(results, f, indent=2)
        print(f"\nResults saved to {args.output}")

if __name__ == "__main__":
    main()

