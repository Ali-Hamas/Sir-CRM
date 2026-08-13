# BlackDesk OS — Production Deployment Guide

This document provides step-by-step instructions for building, containerizing, configuring, and deploying BlackDesk OS in a enterprise production environment.

---

## 1. System Requirements & Architecture

- **Operating System**: Linux (Ubuntu 22.04 LTS / Debian 12 / RHEL 9 recommended) or Windows Server with Docker Engine.
- **Node.js**: v20 LTS+
- **Container Runtime**: Docker 24.0+ & Docker Compose v2.20+
- **Database Engine**: MongoDB 7.0+ (MongoDB Atlas or Self-hosted Cluster via Prisma MongoDB Provider)
- **Reverse Proxy**: Nginx 1.25+

```
                          +-------------------+
                          |  Client Browser   |
                          +---------+---------+
                                    | HTTPS (443) / HTTP (80)
                                    v
                          +-------------------+
                          | Nginx Rev Proxy   |
                          +----+---------+----+
                               |         |
               +---------------+         +---------------+
               | /                                       | /api
               v                                         v
    +--------------------+                    +--------------------+
    | Next.js Frontend   |                    |  NestJS Backend    |
    | (Port 3000)        |                    |  (Port 3001)       |
    +--------------------+                    +---------+----------+
                                                        | Prisma MongoDB
                                                        v
                                              +--------------------+
                                              | MongoDB Database   |
                                              | (Port 27017)       |
                                              +--------------------+
```

---

## 2. Environment Configuration

Before launching production containers, copy `.env.production` and verify secrets:

```bash
cp .env.production .env
```

Ensure the following variables are configured with production values:

| Variable | Description | Example / Required Format |
|---|---|---|
| `DATABASE_URL` | MongoDB Connection URI | `mongodb+srv://user:pass@cluster.mongodb.net/BlackDesk` |
| `JWT_SECRET` | Secret key for JWT signing | 64+ random hex characters |
| `JWT_REFRESH_SECRET` | Secret key for Refresh Tokens | 64+ random hex characters |
| `COOKIE_SECRET` | Signing secret for HttpOnly cookies | 32+ random characters |
| `ENCRYPTION_KEY` | AES-256-GCM encryption key | 32-byte (64 hex characters) |
| `ALLOWED_ORIGINS` | Permitted CORS origins | `https://blackdesk.com,https://app.blackdesk.com` |
| `OPENAI_API_KEY` | OpenAI API Key | `sk-proj-...` |
| `ANTHROPIC_API_KEY` | Anthropic Claude API Key | `sk-ant-...` |
| `GEMINI_API_KEY` | Google Gemini API Key | `AIzaSy...` |
| `DEEPSEEK_API_KEY` | DeepSeek API Key | `sk-...` |
| `OPENROUTER_API_KEY` | OpenRouter Unified Key | `sk-or-...` |

---

## 3. Deployment Methods

### Option A: Docker Compose Production Stack (Recommended)

1. Clone the repository and navigate to root:
   ```bash
   git clone https://github.com/blackdesk/blackdesk-os.git
   cd blackdesk-os
   ```

2. Copy production environment configuration:
   ```bash
   cp .env.production .env
   ```

3. Build and launch containers in detached mode:
   ```bash
   docker compose -f docker-compose.production.yml up -d --build
   ```

4. Check container health status:
   ```bash
   docker compose -f docker-compose.production.yml ps
   ```

5. View application logs:
   ```bash
   docker compose -f docker-compose.production.yml logs -f --tail=100
   ```

---

### Option B: Bare-Metal / PM2 Native Deployment

1. Install dependencies & generate Prisma client:
   ```bash
   pnpm install --frozen-lockfile
   cd packages/database && npx prisma generate && cd ../..
   ```

2. Build backend & frontend:
   ```bash
   pnpm run build
   ```

3. Start backend using PM2:
   ```bash
   pm2 start apps/backend/dist/main.js --name "blackdesk-backend" -i max
   ```

4. Start frontend using PM2:
   ```bash
   pm2 start "node apps/frontend/.next/standalone/server.js" --name "blackdesk-frontend"
   ```

---

## 4. Database Setup & Migrations

For MongoDB with Prisma:

1. Push index definitions to MongoDB:
   ```bash
   cd packages/database
   npx prisma db push
   ```

2. Verify MongoDB indices and connectivity:
   ```bash
   node scripts/verify-production.js
   ```

---

## 5. Post-Deployment Verification

Execute the automated production validation script:

```bash
node scripts/verify-production.js
```

Verify backend health endpoints:
- Health: `GET http://localhost:3001/health`
- Liveness: `GET http://localhost:3001/health/liveness`
- Readiness: `GET http://localhost:3001/health/readiness`
- Diagnostics: `GET http://localhost:3001/health/diagnostics`
