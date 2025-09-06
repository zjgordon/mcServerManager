# Contract Testing Framework

This directory contains the contract testing framework for the Flask to Node.js/Express migration using the strangler pattern.

## Overview

The contract testing framework ensures API contract stability during the migration by:

1. **Capturing Flask API baseline** - Recording current API responses
2. **Validating against baseline** - Ensuring no regressions in Flask API
3. **Comparing Flask vs Express** - Validating Express API matches Flask exactly
4. **Smoke testing** - End-to-end validation of critical paths

## Files

### Documentation
- `flask_api_baseline.md` - Complete API documentation with request/response examples
- `README.md` - This file

### Test Scripts
- `../scripts/contract_testing.py` - Contract testing framework
- `../scripts/smoke_test_cli.py` - Smoke test CLI for server lifecycle validation

### Generated Files (during testing)
- `api_responses_baseline.json` - Captured Flask API responses
- `contract_test_results.json` - Contract validation results
- `flask_vs_express_comparison.json` - Flask vs Express comparison results
- `smoke_test_results.json` - Smoke test results
- `contract_test_report.md` - Human-readable test report

## Usage

### 1. Capture Flask API Baseline

First, capture the current Flask API responses as a baseline:

```bash
# Start Flask server
python run.py

# In another terminal, capture baseline
python scripts/contract_testing.py --baseline-capture
```

### 2. Validate Current Flask API

Ensure the current Flask API hasn't regressed:

```bash
python scripts/contract_testing.py --validate
```

### 3. Run Smoke Tests

Test critical server lifecycle operations:

```bash
# Test all operations
python scripts/smoke_test_cli.py --test-all

# Test specific operations
python scripts/smoke_test_cli.py --test-auth
python scripts/smoke_test_cli.py --test-server-lifecycle
python scripts/smoke_test_cli.py --test-admin
python scripts/smoke_test_cli.py --test-backup
```

### 4. Compare Flask vs Express

Once Express API is running, compare responses:

```bash
# Start Express server on port 5001
# Then compare
python scripts/contract_testing.py --compare http://localhost:5001
```

### 5. Generate Reports

Generate human-readable test reports:

```bash
python scripts/contract_testing.py --report
```

## Critical Paths Tested

### Authentication Flow
- CSRF token retrieval
- User login/logout
- Session management
- Password operations
- Admin setup

### Server Lifecycle
- Server creation
- EULA acceptance
- Server start/stop
- Status monitoring
- Server deletion

### Admin Operations
- System configuration
- User management
- System statistics
- Memory usage monitoring

### Backup Operations
- Server backup creation
- Backup file management

## Contract Testing Principles

1. **API Contract Stability** - No breaking changes to request/response formats
2. **Response Structure Validation** - Exact match of JSON structure and types
3. **Status Code Consistency** - HTTP status codes must match exactly
4. **Error Response Format** - Error messages and formats must be consistent
5. **Performance Baseline** - Response times should not degrade significantly

## Integration with CI/CD

The contract testing framework can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run Contract Tests
  run: |
    python scripts/contract_testing.py --validate
    python scripts/smoke_test_cli.py --test-all
    
- name: Compare with Express
  run: |
    python scripts/contract_testing.py --compare http://localhost:5001
```

## Troubleshooting

### Common Issues

1. **CSRF Token Errors**
   - Ensure Flask server is running
   - Check CORS configuration
   - Verify session cookies are enabled

2. **Authentication Failures**
   - Check if admin user exists
   - Verify password requirements
   - Ensure session management is working

3. **Server Lifecycle Failures**
   - Check Java installation
   - Verify server directory permissions
   - Ensure EULA acceptance

4. **Network Errors**
   - Verify server URLs are correct
   - Check firewall settings
   - Ensure ports are accessible

### Debug Mode

Enable debug logging:

```bash
export FLASK_DEBUG=1
python scripts/contract_testing.py --validate --flask-url http://localhost:5000
```

## Best Practices

1. **Run tests frequently** - Before and after each migration phase
2. **Maintain baseline** - Update baseline when intentional API changes are made
3. **Test in isolation** - Use dedicated test servers and databases
4. **Monitor performance** - Track response times and resource usage
5. **Document changes** - Update baseline documentation when APIs evolve

## Migration Phases

### Phase 0: Contract Testing Setup ✅
- [x] Create Flask API baseline documentation
- [x] Implement contract testing framework
- [x] Create smoke test CLI
- [x] Set up test infrastructure

### Phase 1: Foundation Setup
- [ ] Set up Node.js/Express project
- [ ] Implement core middleware
- [ ] Set up database with Prisma
- [ ] Configure Redis

### Phase 2: API Migration
- [ ] Migrate authentication endpoints
- [ ] Migrate server management endpoints
- [ ] Migrate admin endpoints
- [ ] Run contract tests

### Phase 3: Process Management
- [ ] Implement server process management
- [ ] Add system monitoring
- [ ] Implement backup operations
- [ ] Run smoke tests

### Phase 4: Real-time Features
- [ ] Implement WebSocket support
- [ ] Add background task processing
- [ ] Implement real-time monitoring
- [ ] Validate performance

### Phase 5: Production Cutover
- [ ] Set up production environment
- [ ] Execute strangler pattern cutover
- [ ] Monitor migration
- [ ] Validate all systems

---

**Last Updated:** December 20, 2024  
**Status:** Phase 0 Complete - Contract Testing Framework Ready

