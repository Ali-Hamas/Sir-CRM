# Britsync — Production Launch Checklist

This checklist must be reviewed and signed off prior to deploying Britsync into production.

---

## 1. Environment & Secrets Setup
- [x] All `.env.production` placeholders replaced with production credentials.
- [x] `JWT_SECRET` set to minimum 64 random characters.
- [x] `JWT_REFRESH_SECRET` set to separate random 64-character secret.
- [x] `COOKIE_SECRET` configured for HttpOnly signed cookie validation.
- [x] `ENCRYPTION_KEY` configured with 256-bit AES key (64 hex characters).
- [x] `DATABASE_URL` pointing to production MongoDB Atlas / Cluster instance.
- [x] CORS origins explicitly constrained in `ALLOWED_ORIGINS` (no wildcards in prod).
- [x] API keys for AI providers (OpenAI, Anthropic, Gemini, DeepSeek, OpenRouter) configured.

---

## 2. Infrastructure & Networking
- [x] Nginx reverse proxy configured with TLS 1.2 / TLS 1.3 SSL protocols.
- [x] Port 80 redirected to 443 HTTPS.
- [x] Rate limiting active on Nginx (`limit_req_zone`) and backend endpoints.
- [x] Maximum body upload limit set to `100M`.
- [x] WebSocket proxying (`/socket.io/`) verified with `Upgrade` and `Connection` headers.
- [x] Static assets caching configured (`max-age=31536000`).

---

## 3. Security & Compliance
- [x] Security headers enabled: HSTS, `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Content-Security-Policy`.
- [x] Cookies configured with `HttpOnly`, `SameSite=Lax`, and `Secure` flag.
- [x] Input validation enabled with NestJS `ValidationPipe` (`whitelist: true`, `transform: true`).
- [x] Audit logging active for non-GET state mutation endpoints (`audit-log.interceptor.ts`).
- [x] Sensitive database fields encrypted via `EncryptionService`.

---

## 4. Performance & Database Optimization
- [x] MongoDB indices pushed via `npx prisma db push`.
- [x] Connection pooling parameters configured on MongoDB connection URI.
- [x] Response caching active via `CacheService`.
- [x] Next.js `standalone` mode output verified.
- [x] Image optimization enabled via `next.config.mjs`.

---

## 5. Operations, Monitoring & Backups
- [x] Automated MongoDB backup service configured (`scripts/backup.js`).
- [x] 30-day retention cleanup policy verified.
- [x] Health check endpoints responding (`/health`, `/health/liveness`, `/health/readiness`).
- [x] GitHub Actions CI/CD workflow tested (`.github/workflows/ci-cd.yml`).
- [x] Production verification script executed with 100% pass rate (`node scripts/verify-production.js`).
