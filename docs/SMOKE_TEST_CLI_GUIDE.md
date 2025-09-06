# Enhanced Smoke Test CLI Guide

## Overview

The Enhanced Smoke Test CLI provides comprehensive testing capabilities for the dual-backend environment, supporting both Flask and Express backends. This guide covers all available testing tools and their usage.

## Available Test Scripts

### 1. Enhanced Smoke Test CLI (`enhanced_smoke_test_cli.py`)

**Purpose**: Test both Flask and Express backends with comprehensive health checks and comparison.

**Usage**:
```bash
# Test both backends comprehensively
python scripts/enhanced_smoke_test_cli.py --test-all

# Test Flask backend only
python scripts/enhanced_smoke_test_cli.py --test-flask

# Test Express backend only
python scripts/enhanced_smoke_test_cli.py --test-express

# Test both backends
python scripts/enhanced_smoke_test_cli.py --test-both

# Compare responses between backends
python scripts/enhanced_smoke_test_cli.py --test-comparison
```

**Features**:
- Backend health checks
- Connectivity testing
- API endpoint validation
- Readiness checks
- Backend comparison
- Concurrent access testing
- Performance monitoring

### 2. Server Lifecycle Validator (`server_lifecycle_validator.py`)

**Purpose**: Validate complete server lifecycle operations including creation, configuration, startup, monitoring, and cleanup.

**Usage**:
```bash
# Test both backends with full lifecycle
python scripts/server_lifecycle_validator.py --backend both --full-test

# Test Flask backend only
python scripts/server_lifecycle_validator.py --backend flask --full-test

# Test Express backend only
python scripts/server_lifecycle_validator.py --backend express --full-test
```

**Features**:
- Authentication testing
- Server creation and configuration
- Server startup and shutdown
- Status monitoring
- Log access
- Backup operations
- Server deletion and cleanup

### 3. Comprehensive Test Runner (`run_comprehensive_tests.py`)

**Purpose**: Orchestrate all smoke tests and validations for the dual-backend environment.

**Usage**:
```bash
# Run all comprehensive tests
python scripts/run_comprehensive_tests.py --all

# Run quick tests only
python scripts/run_comprehensive_tests.py --quick

# Run full test suite
python scripts/run_comprehensive_tests.py --full

# Run server lifecycle tests
python scripts/run_comprehensive_tests.py --lifecycle

# Run backend comparison tests
python scripts/run_comprehensive_tests.py --comparison
```

**Features**:
- Backend health checks
- Enhanced smoke tests
- Server lifecycle validation
- Backend comparison
- Performance testing
- Reliability testing

## Test Categories

### 1. Health Checks
- **Purpose**: Verify both backends are running and responsive
- **Tests**: Health endpoints, connectivity, API accessibility
- **Expected Results**: Both Flask (port 5000) and Express (port 5001) should be healthy

### 2. Backend Comparison
- **Purpose**: Compare responses between Flask and Express backends
- **Tests**: Health endpoint comparison, API response comparison
- **Expected Results**: Responses should be compatible or clearly documented differences

### 3. Server Lifecycle
- **Purpose**: Validate complete server management operations
- **Tests**: Creation, configuration, startup, monitoring, shutdown, deletion
- **Expected Results**: All lifecycle operations should work correctly

### 4. Performance Testing
- **Purpose**: Measure response times and performance characteristics
- **Tests**: Response time measurement, concurrent request handling
- **Expected Results**: Acceptable response times and reliable concurrent access

### 5. Reliability Testing
- **Purpose**: Test system reliability under various conditions
- **Tests**: Concurrent requests, error handling, recovery
- **Expected Results**: High success rates and graceful error handling

## Test Results

### Output Files
All test scripts generate detailed JSON results files:

- `enhanced_smoke_test_results.json` - Enhanced smoke test results
- `server_lifecycle_results.json` - Server lifecycle validation results
- `comprehensive_test_results.json` - Comprehensive test suite results

### Result Structure
```json
{
  "timestamp": "2025-09-06T02:45:00.000Z",
  "tests": {
    "health_checks": {
      "status": "PASS",
      "tests": [...],
      "errors": []
    },
    "backend_comparison": {
      "status": "PASS",
      "tests": [...],
      "errors": []
    }
  },
  "summary": {
    "total_tests": 10,
    "passed_tests": 9,
    "failed_tests": 1,
    "success_rate": 90.0,
    "overall_status": "PASS"
  }
}
```

## Prerequisites

### Backend Services
Before running tests, ensure both backends are running:

```bash
# Start dual-backend environment
./scripts/start-dev-environment.sh

# Verify both backends are running
./scripts/validate-dev-environment.py
```

### Dependencies
Required Python packages:
- `requests` - HTTP client for API testing
- `json` - JSON handling
- `argparse` - Command line argument parsing
- `pathlib` - Path handling
- `datetime` - Timestamp generation

## Troubleshooting

### Common Issues

1. **Backend Not Running**
   - Error: `Connection refused`
   - Solution: Start both backends using `./scripts/start-dev-environment.sh`

2. **Port Conflicts**
   - Error: `Address already in use`
   - Solution: Stop existing processes using `./scripts/stop-dev-environment.sh`

3. **Authentication Failures**
   - Error: `CSRF token not found`
   - Solution: Ensure Flask backend is properly configured and running

4. **Express Backend Not Implemented**
   - Error: `404 Not Found` for Express endpoints
   - Solution: This is expected - Express backend is still being developed

### Debug Mode
For detailed debugging, check the test output and result files:

```bash
# Run with verbose output
python scripts/enhanced_smoke_test_cli.py --test-all 2>&1 | tee test_output.log

# Check result files
cat docs/contracts/enhanced_smoke_test_results.json | jq .
```

## Integration with CI/CD

### GitHub Actions
Add to your workflow:

```yaml
- name: Run Smoke Tests
  run: |
    ./scripts/start-dev-environment.sh
    sleep 10
    python scripts/run_comprehensive_tests.py --all
    ./scripts/stop-dev-environment.sh
```

### Docker
For containerized testing:

```dockerfile
# Add to Dockerfile
COPY scripts/ /app/scripts/
RUN chmod +x /app/scripts/*.py

# Run tests
CMD ["python", "scripts/run_comprehensive_tests.py", "--all"]
```

## Best Practices

### 1. Test Order
Run tests in this order for best results:
1. Health checks
2. Backend comparison
3. Server lifecycle (if applicable)
4. Performance tests
5. Reliability tests

### 2. Environment Setup
Always ensure:
- Both backends are running
- Database is accessible
- Redis is running
- No port conflicts

### 3. Test Data
- Use unique test server names with timestamps
- Clean up test data after tests
- Use appropriate test configurations

### 4. Monitoring
- Monitor test execution times
- Check for memory leaks
- Verify resource cleanup

## Future Enhancements

### Planned Features
- [ ] WebSocket testing
- [ ] Database migration testing
- [ ] Load testing capabilities
- [ ] Automated test report generation
- [ ] Integration with monitoring systems

### Express Backend Support
As the Express backend is developed, the test suite will be updated to include:
- Full API endpoint testing
- Authentication flow testing
- Server management operations
- Database operations
- Redis operations

## Support

For issues or questions:
1. Check the test output and result files
2. Verify backend services are running
3. Review the troubleshooting section
4. Check the project documentation

## Contributing

To add new tests:
1. Follow the existing test structure
2. Add appropriate error handling
3. Include comprehensive logging
4. Update this documentation
5. Add test results to the summary generation
