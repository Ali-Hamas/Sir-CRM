#!/bin/bash

# ==============================================================================
#  BRITSYNC CRM — USER-LEVEL VPS DEPLOYMENT SCRIPT (NO SUDO)
# ==============================================================================

# Exit on error
set -e

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================================================${NC}"
echo -e "${GREEN}             ____       _ _                                           ${NC}"
echo -e "${GREEN}            | __ ) _ __(_) |_ ___ _   _ _ __   ___                    ${NC}"
echo -e "${GREEN}            |  _ \| '__| | __/ __| | | | '_ \ / __|                   ${NC}"
echo -e "${GREEN}            | |_) | |  | | |_ \__ \ |_| | | | | (__                    ${NC}"
echo -e "${GREEN}            |____/|_|  |_|\__|___/\__, |_| |_|\___|                   ${NC}"
echo -e "${GREEN}                                  |___/                               ${NC}"
echo -e "${BLUE}       Britsync CRM - VPS User-Level Safe Deployment (No Sudo)        ${NC}"
echo -e "${BLUE}======================================================================${NC}"

# 1. Verify Docker Compose
echo -e "\n${BLUE}[1/5] Checking Docker...${NC}"
DOCKER_COMPOSE="docker compose"
if ! docker compose version >/dev/null 2>&1; then
  if docker-compose version >/dev/null 2>&1; then
    DOCKER_COMPOSE="docker-compose"
  else
    echo -e "${RED}Error: Docker Compose is not installed or you do not have permissions.${NC}"
    echo -e "${YELLOW}Ensure your user is in the 'docker' group: sudo usermod -aG docker \$USER${NC}"
    exit 1
  fi
fi
echo -e "${GREEN}✓ Docker Compose is ready (${DOCKER_COMPOSE}).${NC}"

# 2. Get Subdomain / Domain Name
echo -e "\n${BLUE}[2/5] Domain Configuration...${NC}"
read -p "Enter your target subdomain (e.g. crm.britsyncai.com): " DOMAIN
if [ -z "$DOMAIN" ]; then
  echo -e "${RED}Error: Domain name cannot be empty.${NC}"
  exit 1
fi
echo -e "${GREEN}Target domain set to: https://$DOMAIN${NC}"

# 3. Create .env.production file
echo -e "\n${BLUE}[3/5] Setting up environment files...${NC}"
if [ -f "apps/backend/.env" ]; then
  echo -e "Copying existing backend .env to root .env.production..."
  cp apps/backend/.env .env.production
else
  echo -e "Creating .env.production from template..."
  cp apps/backend/.env.example .env.production
fi

# Update Domain URLs in .env.production
sed -e "s|APP_URL=.*|APP_URL=https://$DOMAIN|g" \
    -e "s|FRONTEND_URL=.*|FRONTEND_URL=https://$DOMAIN|g" \
    -e "s|BACKEND_URL=.*|BACKEND_URL=https://$DOMAIN/api|g" \
    .env.production > .env.production.tmp
mv .env.production.tmp .env.production

# Copy to required modules
cp .env.production packages/database/.env
cp .env.production .env

echo -e "${GREEN}✓ Environment configurations generated for $DOMAIN.${NC}"

# 4. Generate docker-compose.vps.yml
echo -e "\n${BLUE}[4/5] Writing docker-compose.vps.yml...${NC}"
cat << 'EOF' > docker-compose.vps.yml
version: '3.8'

services:
  mongodb:
    image: mongo:7.0
    container_name: britsync-vps-mongodb
    restart: always
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_INITDB_ROOT_USERNAME:-shaheerkhanhyd6_db_user}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_INITDB_ROOT_PASSWORD:-BlackDesk2024!}
      MONGO_INITDB_DATABASE: ${MONGO_INITDB_DATABASE:-BlackDesk}
    volumes:
      - mongodb_vps_data:/data/db
      - mongodb_vps_config:/data/configdb
    networks:
      - britsync-vps-internal
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 15s
      timeout: 5s
      retries: 5
      start_period: 15s
    logging:
      driver: "json-file"
      options:
        max-size: "100m"
        max-file: "5"

  backend:
    build:
      context: .
      dockerfile: apps/backend/Dockerfile
    container_name: britsync-vps-backend
    restart: always
    env_file:
      - .env.production
    environment:
      - NODE_ENV=production
      - PORT=3001
      - DATABASE_URL=${DATABASE_URL:-mongodb://shaheerkhanhyd6_db_user:BlackDesk2024!@mongodb:27017/BlackDesk?authSource=admin}
    ports:
      - '127.0.0.1:5009:3001'
    volumes:
      - uploads_vps_data:/app/uploads
    networks:
      - britsync-vps-internal
    depends_on:
      mongodb:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3001/health/liveness"]
      interval: 20s
      timeout: 5s
      retries: 3
      start_period: 20s
    logging:
      driver: "json-file"
      options:
        max-size: "100m"
        max-file: "5"

  frontend:
    build:
      context: .
      dockerfile: apps/frontend/Dockerfile
      args:
        NEXT_PUBLIC_API_URL: /api
        NEXT_PUBLIC_APP_URL: ${APP_URL:-https://crm.britsyncai.com}
    container_name: britsync-vps-frontend
    restart: always
    env_file:
      - .env.production
    environment:
      - NODE_ENV=production
      - PORT=3000
    ports:
      - '127.0.0.1:3009:3000'
    networks:
      - britsync-vps-internal
    depends_on:
      - backend
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/"]
      interval: 20s
      timeout: 5s
      retries: 3
      start_period: 20s
    logging:
      driver: "json-file"
      options:
        max-size: "100m"
        max-file: "5"

networks:
  britsync-vps-internal:
    driver: bridge

volumes:
  mongodb_vps_data:
  mongodb_vps_config:
  uploads_vps_data:
EOF
echo -e "${GREEN}✓ docker-compose.vps.yml generated successfully.${NC}"

# 5. Build and run containers
echo -e "\n${BLUE}[5/5] Deploying Docker containers...${NC}"
$DOCKER_COMPOSE -f docker-compose.vps.yml down
$DOCKER_COMPOSE -f docker-compose.vps.yml up -d --build

echo -e "Waiting for backend service to start up..."
sleep 15

# 6. Schema push & DB Seed
echo -e "\n${BLUE}[6/6] Synchronizing database & seeding demo records...${NC}"
$DOCKER_COMPOSE -f docker-compose.vps.yml exec -T backend npx prisma db push --schema=packages/database/prisma/schema.prisma

# Seed demo data inside temporary container connected to network
docker run --rm \
  --network crm-blackdesk_britsync-vps-internal \
  -v "$(pwd):/app" \
  -w /app \
  node:20-alpine sh -c "npm install -g pnpm && pnpm install --filter @blackdesk/database && node scripts/seed-demo-data.js"

echo -e "\n${GREEN}======================================================================${NC}"
echo -e "${GREEN} 🎉 Britsync CRM SERVICES STARTED SUCCESSFULLY!${NC}"
echo -e " Frontend is running locally on: ${BLUE}http://127.0.0.1:3009${NC}"
echo -e " Backend is running locally on: ${BLUE}http://127.0.0.1:5009${NC}"
echo -e ""
echo -e " ${YELLOW}NEXT STEP FOR VPS ADMIN:${NC}"
echo -e " Configure Nginx on the host VPS to forward your subdomain traffic to"
echo -e " port 3009 (frontend) and /api requests to port 5009 (backend)."
echo -e "======================================================================${NC}"
