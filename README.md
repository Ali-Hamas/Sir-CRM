# Blackdesk OS

Enterprise Monorepo built with Next.js 15, NestJS, and Turborepo.

## Architecture

- **Frontend:** Next.js 15 (App Router), Tailwind CSS, Zustand, React Hook Form + Zod, shadcn/ui.
- **Backend:** NestJS, PostgreSQL, Prisma, Clean Architecture.
- **Monorepo:** pnpm workspaces + Turborepo.
- **Infrastructure:** Docker Compose (PostgreSQL, MinIO for S3).

## Prerequisites

- Node.js >= 20
- pnpm >= 9.1
- Docker Desktop

## Getting Started

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Start the local infrastructure:
   ```bash
   docker-compose up -d
   ```

3. Start development servers:
   ```bash
   pnpm dev
   ```

This will run the frontend on `http://localhost:3000` and the backend on `http://localhost:3001`.
