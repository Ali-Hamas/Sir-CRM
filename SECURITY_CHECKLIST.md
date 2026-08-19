# Britsync — Security Hardening & Audit Checklist

This document details all security mechanisms implemented in Britsync.

---

## 1. Authentication & Session Security
- **Dual Token Pattern**: Short-lived JWT Access Tokens (15 min) paired with long-lived Refresh Tokens (7 days).
- **HttpOnly Cookies**: Refresh tokens are transmitted exclusively via `HttpOnly`, `SameSite=Lax`, `Secure` cookies to eliminate XSS token theft.
- **Token Rotation & Revocation**: Refresh tokens are rotated on each refresh and revoked upon logout or password reset in the `RefreshToken` database model.
- **Bcrypt Password Hashing**: Passwords stored using bcrypt with cost factor 10.

---

## 2. Network & Transport Security
- **Strict HTTPS/TLS**: Nginx reverse proxy configured to enforce TLS 1.2 / 1.3.
- **HSTS Enforcement**: `Strict-Transport-Security` header set with `max-age=31536000; includeSubDomains`.
- **CORS Protection**: Restricted to explicit `ALLOWED_ORIGINS` specified in environment variables.

---

## 3. Data Protection & Encryption
- **AES-256-GCM Encryption**: Key database attributes (e.g. integration API credentials, tokens) encrypted at rest using `EncryptionService` powered by `ENCRYPTION_KEY`.
- **MongoDB Safety**: Queries executed exclusively via Prisma ORM parameterized queries to prevent NoSQL injection attacks.

---

## 4. Application Defense
- **Security Headers (Helmet)**:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: SAMEORIGIN`
  - `X-XSS-Protection: 1; mode=block`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Content-Security-Policy`
- **Rate Limiting**: Nginx rate limit zones (`30r/s` for API, `5r/s` for Auth endpoints) to defend against brute force and Denial of Service.
- **Input Sanitization & Validation**: NestJS `ValidationPipe` stripping non-whitelisted payload parameters.
- **Audit Logging**: `AuditLogInterceptor` recording IP address, user ID, module, duration, and timestamp for all data mutation requests.
