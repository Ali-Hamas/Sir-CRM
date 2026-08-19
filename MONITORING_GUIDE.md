# Britsync — Monitoring & Observability Guide

This guide details the monitoring architecture, health check endpoints, and logging systems in Britsync.

---

## 1. Observability Overview

Britsync provides comprehensive system diagnostics, application logs, database health monitoring, and performance telemetry.

```
 +-----------------------------------------------------------------+
 |                    Britsync Observability                    |
 +------------------+-------------------+----------------------------+
 | Application Logs | Performance Logs  | Health & Readiness Metrics |
 +------------------+-------------------+----------------------------+
 | Structured JSON  | Request Duration  | MongoDB Ping Latency       |
 | Audit Trail      | Memory / Heap MB  | CPU & System Memory Ratio  |
 | Exception Traces | HTTP Status Codes | Active Modules Checklist   |
 +------------------+-------------------+----------------------------+
```

---

## 2. Health Monitoring Endpoints

The backend provides four dedicated health check endpoints under `/health`:

### 1. Overall System Health (`GET /health`)
Returns high-level status (`HEALTHY` or `DEGRADED`), database connection status, latency in milliseconds, system memory usage ratio, and Node process heap metrics.

```json
{
  "status": "HEALTHY",
  "timestamp": "2026-08-03T16:00:00.000Z",
  "uptimeSeconds": 3600,
  "environment": "production",
  "database": {
    "provider": "MongoDB",
    "connected": true,
    "latencyMs": 4
  },
  "system": {
    "platform": "linux",
    "cpusCount": 8,
    "memoryUsageRatio": 0.42
  }
}
```

### 2. Kubernetes / Docker Liveness Probe (`GET /health/liveness`)
Used by container orchestrators to determine if the container process is running.
- **Response**: `{ "alive": true, "timestamp": "...", "uptimeSeconds": 3600 }`
- **HTTP Status**: `200 OK`

### 3. Kubernetes / Docker Readiness Probe (`GET /health/readiness`)
Used to determine if the backend is ready to handle client traffic (verifies database connectivity).
- **HTTP Status**: `200 OK` if connected; `503 Service Unavailable` if database disconnected.

### 4. Deep System Diagnostics (`GET /health/diagnostics`)
Returns complete metrics summary (user count, org count, project count, task count, AI execution count) and verifies that all 28+ enterprise modules are active.

---

## 3. Log Management

- **Request Logs**: Formatted as `[METHOD] /url STATUS - durationMs | Heap: XXMB | IP: X.X.X.X` via `PerformanceLoggingInterceptor`.
- **Audit Logs**: State mutation operations (POST/PUT/DELETE) logged with user ID, IP address, and operation via `AuditLogInterceptor`.
- **Nginx Access & Error Logs**: Stored in `/var/log/nginx/` with upstream connection and response timing (`rt`, `uct`, `urt`).
