#!/usr/bin/env python3
"""
Test runner script for the Minecraft Server Manager.
This script provides various testing options and configurations.
"""

import os
import sys
import subprocess
import argparse
from pathlib import Path


def run_command(cmd, description):
    """Run a command and return the result."""
    print(f"\n{'='*60}")
    print(f"Running: {description}")
    print(f"Command: {' '.join(cmd)}")
    print(f"{'='*60}")
    
    result = subprocess.run(cmd, capture_output=False)
    return result.returncode == 0


def install_test_requirements():
    """Install test requirements."""
    return run_command(
        [sys.executable, '-m', 'pip', 'install', '-r', 'requirements-test.txt'],
        "Installing test requirements"
    )


def run_unit_tests(coverage=False, verbose=False):
    """Run unit tests."""
    cmd = [sys.executable, '-m', 'pytest', 'tests/']
    
    if coverage:
        cmd.extend(['--cov=app', '--cov-report=html', '--cov-report=term'])
    
    if verbose:
        cmd.append('-v')
    
    # Add specific test markers
    cmd.extend(['-m', 'not integration'])
    
    return run_command(cmd, "Running unit tests")


def run_integration_tests(verbose=False):
    """Run integration tests."""
    cmd = [sys.executable, '-m', 'pytest', 'tests/test_integration.py']
    
    if verbose:
        cmd.append('-v')
    
    return run_command(cmd, "Running integration tests")


def run_security_tests(verbose=False):
    """Run security tests."""
    cmd = [sys.executable, '-m', 'pytest', 'tests/test_security.py']
    
    if verbose:
        cmd.append('-v')
    
    return run_command(cmd, "Running security tests")


def run_all_tests(coverage=False, verbose=False):
    """Run all tests."""
    cmd = [sys.executable, '-m', 'pytest', 'tests/']
    
    if coverage:
        cmd.extend(['--cov=app', '--cov-report=html', '--cov-report=term'])
    
    if verbose:
        cmd.append('-v')
    
    return run_command(cmd, "Running all tests")


def run_linting():
    """Run code linting and formatting checks."""
    success = True
    
    # Run flake8
    if not run_command([sys.executable, '-m', 'flake8', 'app/', 'tests/'], "Running flake8 linting"):
        success = False
    
    # Run black check
    if not run_command([sys.executable, '-m', 'black', '--check', 'app/', 'tests/'], "Checking code formatting with black"):
        success = False
    
    # Run isort check
    if not run_command([sys.executable, '-m', 'isort', '--check-only', 'app/', 'tests/'], "Checking import sorting with isort"):
        success = False
    
    return success


def run_security_scan():
    """Run security scans."""
    success = True
    
    # Run bandit
    if not run_command([sys.executable, '-m', 'bandit', '-r', 'app/'], "Running bandit security scan"):
        success = False
    
    # Run safety check
    if not run_command([sys.executable, '-m', 'safety', 'check'], "Running safety dependency check"):
        success = False
    
    return success


def generate_coverage_report():
    """Generate a detailed coverage report."""
    success = run_command([
        sys.executable, '-m', 'pytest', 'tests/',
        '--cov=app',
        '--cov-report=html',
        '--cov-report=term-missing',
        '--cov-report=xml'
    ], "Generating coverage report")
    
    if success:
        print("\nCoverage report generated:")
        print("  - HTML report: htmlcov/index.html")
        print("  - XML report: coverage.xml")
        print("  - Terminal report shown above")
    
    return success


def fix_formatting():
    """Auto-fix code formatting issues."""
    success = True
    
    # Run black
    if not run_command([sys.executable, '-m', 'black', 'app/', 'tests/'], "Formatting code with black"):
        success = False
    
    # Run isort
    if not run_command([sys.executable, '-m', 'isort', 'app/', 'tests/'], "Sorting imports with isort"):
        success = False
    
    return success


def main():
    """Main test runner function."""
    parser = argparse.ArgumentParser(description='Test runner for Minecraft Server Manager')
    parser.add_argument('--install', action='store_true', help='Install test requirements')
    parser.add_argument('--unit', action='store_true', help='Run unit tests')
    parser.add_argument('--integration', action='store_true', help='Run integration tests')
    parser.add_argument('--security', action='store_true', help='Run security tests')
    parser.add_argument('--all', action='store_true', help='Run all tests')
    parser.add_argument('--lint', action='store_true', help='Run linting checks')
    parser.add_argument('--security-scan', action='store_true', help='Run security scans')
    parser.add_argument('--coverage', action='store_true', help='Generate coverage report')
    parser.add_argument('--fix', action='store_true', help='Auto-fix formatting issues')
    parser.add_argument('--verbose', '-v', action='store_true', help='Verbose output')
    parser.add_argument('--with-coverage', action='store_true', help='Include coverage in test runs')
    
    args = parser.parse_args()
    
    # Change to script directory
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    
    success = True
    
    if args.install:
        success &= install_test_requirements()
    
    if args.fix:
        success &= fix_formatting()
    
    if args.unit:
        success &= run_unit_tests(coverage=args.with_coverage, verbose=args.verbose)
    
    if args.integration:
        success &= run_integration_tests(verbose=args.verbose)
    
    if args.security:
        success &= run_security_tests(verbose=args.verbose)
    
    if args.all:
        success &= run_all_tests(coverage=args.with_coverage, verbose=args.verbose)
    
    if args.lint:
        success &= run_linting()
    
    if args.security_scan:
        success &= run_security_scan()
    
    if args.coverage:
        success &= generate_coverage_report()
    
    # If no specific action was requested, run a default test suite
    if not any([args.install, args.unit, args.integration, args.security, args.all, 
                args.lint, args.security_scan, args.coverage, args.fix]):
        print("No specific test action specified. Running default test suite...")
        success &= run_unit_tests(verbose=args.verbose)
        success &= run_linting()
    
    if success:
        print("\n" + "="*60)
        print("✅ All tests and checks passed successfully!")
        print("="*60)
        sys.exit(0)
    else:
        print("\n" + "="*60)
        print("❌ Some tests or checks failed!")
        print("="*60)
        sys.exit(1)


if __name__ == '__main__':
    main()
