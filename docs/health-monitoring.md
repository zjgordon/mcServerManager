# Health Monitoring and Metrics

This document describes the health monitoring and metrics capabilities of the
mcServerManager application.

## Overview

The mcServerManager application provides comprehensive health monitoring
endpoints that can be used for:

- Application health checks
- Load balancer health probes
- Container orchestration (Kubernetes) readiness/liveness checks
- System resource monitoring
- Application performance metrics
- Database connectivity monitoring

## Health Check Endpoints

### Basic Health Check Endpoint

**Endpoint:** `GET /health/`

Returns basic health status including database connectivity.

**Response Format:**

```json
{
  "status": "healthy|unhealthy",
  "timestamp": "2025-01-09T10:30:00.000Z",
  "service": "mcServerManager",
  "version": "1.0.0",
  "checks": {
    "database": {
      "status": "healthy|unhealthy",
      "message": "Database connection successful",
      "response_time_ms": 15.23
    }
  }
}
```

**HTTP Status Codes:**

- `200 OK`: Service is healthy
- `503 Service Unavailable`: Service is unhealthy

### Detailed Health Check Endpoint

**Endpoint:** `GET /health/detailed`

Returns comprehensive health status including system metrics, application
metrics, and external dependencies.

**Response Format:**

```json
{
  "status": "healthy|unhealthy",
  "timestamp": "2025-01-09T10:30:00.000Z",
  "service": "mcServerManager",
  "version": "1.0.0",
  "response_time_ms": 45.67,
  "checks": {
    "database": {
      "status": "healthy|unhealthy",
      "message": "Database connection successful",
      "response_time_ms": 15.23
    },
    "dependencies": {
      "database": {
        "status": "healthy|unhealthy",
        "message": "Database connection successful"
      },
      "file_system": {
        "status": "healthy|unhealthy",
        "message": "File system access successful"
      }
    },
    "system": {
      "status": "healthy|unhealthy",
      "timestamp": 1704795000.0,
      "cpu": {
        "usage_percent": 25.5,
        "count": 4,
        "frequency_mhz": 2400.0,
        "process_usage_percent": 2.1
      },
      "memory": {
        "total_bytes": 8589934592,
        "available_bytes": 4294967296,
        "used_bytes": 4294967296,
        "usage_percent": 50.0,
        "swap_total_bytes": 2147483648,
        "swap_used_bytes": 0,
        "swap_usage_percent": 0.0,
        "process_memory_bytes": 52428800
      },
      "disk": {
        "total_bytes": 107374182400,
        "used_bytes": 53687091200,
        "free_bytes": 53687091200,
        "usage_percent": 50.0
      }
    },
    "application": {
      "status": "healthy|unhealthy",
      "timestamp": 1704795000.0,
      "database": {
        "user_count": 5,
        "server_count": 3,
        "active_server_count": 2,
        "pool_metrics": {
          "pool_size": 5,
          "checked_in": 3,
          "checked_out": 2,
          "overflow": 0,
          "invalid": 0
        }
      },
      "application": {
        "debug_mode": false,
        "testing": false,
        "secret_key_configured": true
      }
    }
  }
}
```

### Readiness Check

**Endpoint:** `GET /health/ready`

Used by Kubernetes and other container orchestration systems to determine if
the service is ready to accept traffic.

**Response Format:**

```json
{
  "status": "ready|not_ready",
  "timestamp": "2025-01-09T10:30:00.000Z",
  "service": "mcServerManager",
  "reason": "Database not accessible" // Only present when not_ready
}
```

### Liveness Check

**Endpoint:** `GET /health/live`

Used by Kubernetes and other container orchestration systems to determine if
the service is alive and should be restarted if it fails.

**Response Format:**

```json
{
  "status": "alive",
  "timestamp": "2025-01-09T10:30:00.000Z",
  "service": "mcServerManager"
}
```

## System Metrics

The monitoring system collects the following system metrics:

### CPU Metrics

- Overall CPU usage percentage
- CPU core count
- CPU frequency (if available)
- Process-specific CPU usage

### Memory Metrics

- Total system memory
- Available memory
- Used memory and percentage
- Swap memory usage
- Process-specific memory usage (RSS)

### Disk Metrics

- Total disk space
- Used disk space
- Free disk space
- Usage percentage

### Network Metrics

- Bytes sent/received
- Packets sent/received
- Active network connections

## Application Metrics

The monitoring system collects the following application metrics:

### Database Metrics

- User count
- Server count
- Active server count
- Database connection pool metrics

### Application Configuration

- Debug mode status
- Testing mode status
- Secret key configuration status

## Health Check Status

Health checks can return the following status values:

- **healthy**: The component is functioning normally
- **unhealthy**: The component has failed or is not responding
- **warning**: The component is functioning but may have issues
- **critical**: The component is in a critical state

## Usage Examples

### Basic Health Check

```bash
curl http://localhost:5000/health/
```

### Detailed Health Check

```bash
curl http://localhost:5000/health/detailed
```

### Kubernetes Readiness Probe

```yaml
readinessProbe:
  httpGet:
    path: /health/ready
    port: 5000
  initialDelaySeconds: 10
  periodSeconds: 5
```

### Kubernetes Liveness Probe

```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 5000
  initialDelaySeconds: 30
  periodSeconds: 10
```

### Load Balancer Health Check

```bash
curl -f http://localhost:5000/health/ || exit 1
```

## Monitoring Integration

The health check endpoints can be integrated with various monitoring systems:

- **Prometheus**: Use the detailed endpoint to scrape metrics
- **Grafana**: Create dashboards using the health check data
- **Kubernetes**: Use readiness/liveness probes for container health
- **Load Balancers**: Use basic health check for traffic routing
- **Alerting Systems**: Monitor health status and trigger alerts

## Error Handling

All health check endpoints include proper error handling:

- Database connection failures are caught and reported
- System metric collection failures are handled gracefully
- External dependency failures are logged and reported
- Response times are measured and included in responses

## Security Considerations

- Health check endpoints do not require authentication
- Sensitive information is not exposed in health check responses
- System metrics are limited to non-sensitive resource usage data
- Database queries are read-only and lightweight

## Performance Impact

Health check endpoints are designed to be lightweight and fast:

- Basic health check typically responds in < 50ms
- Detailed health check typically responds in < 200ms
- Database queries are optimized for speed
- System metric collection is efficient and cached where possible
