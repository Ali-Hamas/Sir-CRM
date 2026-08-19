#!/bin/bash

# ==============================================================================
#  BRITSYNC CRM — VPS SUBDOMAIN DEPLOYMENT SCRIPT
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
echo -e "${BLUE}            Britsync CRM - VPS Subdomain Deployment Script            ${NC}"
echo -e "${BLUE}======================================================================${NC}"

# 1. Check prerequisites
echo -e "\n${BLUE}[1/7] Verifying prerequisites...${NC}"
if ! [ -x "$(command -v docker)" ]; then
  echo -e "${RED}Error: docker is not installed. Please install Docker first.${NC}" >&2
  exit 1
fi

if ! [ -x "$(command -v docker-compose)" ] && ! docker compose version >/dev/null 2>&1; then
  echo -e "${RED}Error: docker-compose is not installed. Please install Docker Compose first.${NC}" >&2
  exit 1
fi
echo -e "${GREEN}✓ Docker & Docker Compose are installed.${NC}"

# Define command alias for docker compose
DOCKER_COMPOSE="docker compose"
if ! docker compose version >/dev/null 2>&1; then
  DOCKER_COMPOSE="docker-compose"
fi

# 2. Get Subdomain / Domain Name
echo -e "\n${BLUE}[2/7] Domain Configuration...${NC}"
read -p "Enter your target subdomain (e.g. crm.britsync.com): " DOMAIN
if [ -z "$DOMAIN" ]; then
  echo -e "${RED}Error: Domain name cannot be empty.${NC}"
  exit 1
fi
echo -e "${GREEN}Target domain set to: https://$DOMAIN${NC}"

read -p "Enter admin email (for Let's Encrypt SSL alerts): " EMAIL
if [ -z "$EMAIL" ]; then
  echo -e "${RED}Error: Email cannot be empty.${NC}"
  exit 1
fi

# 3. Create .env.production file
echo -e "\n${BLUE}[3/7] Setting up environment files...${NC}"
if [ -f "apps/backend/.env" ]; then
  echo -e "Copying existing backend .env to root .env.production..."
  cp apps/backend/.env .env.production
else
  echo -e "Creating .env.production from template..."
  cp apps/backend/.env.example .env.production
fi

# Update Domain URLs in .env.production
# Use temporary file to make it compatible with both Linux and macOS sed
sed -e "s|APP_URL=.*|APP_URL=https://$DOMAIN|g" \
    -e "s|FRONTEND_URL=.*|FRONTEND_URL=https://$DOMAIN|g" \
    -e "s|BACKEND_URL=.*|BACKEND_URL=https://$DOMAIN/api|g" \
    .env.production > .env.production.tmp
mv .env.production.tmp .env.production

# Make sure database package has the same env
cp .env.production packages/database/.env
cp .env.production .env

echo -e "${GREEN}✓ Environment configurations generated and updated for $DOMAIN.${NC}"

# 4. Configure Nginx with subdomain
echo -e "\n${BLUE}[4/7] Configuring Nginx reverse proxy...${NC}"
NGINX_CONF="nginx/conf.d/default.conf"

if [ -f "$NGINX_CONF" ]; then
  echo -e "Setting server_name in Nginx configuration..."
  sed -e "s|server_name localhost _;|server_name $DOMAIN;|g" \
      -e "s|server_name blackdesk.com;|server_name $DOMAIN;|g" \
      $NGINX_CONF > ${NGINX_CONF}.tmp
  mv ${NGINX_CONF}.tmp $NGINX_CONF
fi

# Create directories for SSL keys if they don't exist
mkdir -p nginx/ssl/live/$DOMAIN

# Generate a temporary self-signed certificate if they don't have Let's Encrypt yet
# (Nginx container will crash on startup if certificate files referenced in ssl block do not exist)
if [ ! -f "nginx/ssl/live/$DOMAIN/fullchain.pem" ]; then
  echo -e "${YELLOW}Generating temporary self-signed certificate to prevent Nginx startup crash...${NC}"
  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout "nginx/ssl/live/$DOMAIN/privkey.pem" \
    -out "nginx/ssl/live/$DOMAIN/fullchain.pem" \
    -subj "/CN=$DOMAIN"
fi

echo -e "${GREEN}✓ Nginx config setup complete.${NC}"

# 5. Retrieve Let's Encrypt Certificate using Certbot
echo -e "\n${BLUE}[5/7] Certbot SSL Setup...${NC}"
read -p "Would you like to request a real Let's Encrypt SSL certificate now? (y/n): " RUN_CERTBOT
if [[ "$RUN_CERTBOT" =~ ^[Yy]$ ]]; then
  echo -e "Starting standalone Certbot tool..."
  if ! [ -x "$(command -v certbot)" ]; then
    echo -e "${YELLOW}Certbot is not installed on host. Attempting to run via Docker...${NC}"
    docker run -it --rm --name certbot \
      -p 80:80 \
      -v "$(pwd)/nginx/ssl:/etc/letsencrypt" \
      certbot/certbot certonly --standalone \
      -d $DOMAIN --email $EMAIL --agree-tos --no-eff-email
  else
    sudo certbot certonly --standalone -d $DOMAIN --email $EMAIL --agree-tos --no-eff-email
    # Copy host certificates to docker config folder
    sudo cp -L /etc/letsencrypt/live/$DOMAIN/fullchain.pem nginx/ssl/live/$DOMAIN/fullchain.pem
    sudo cp -L /etc/letsencrypt/live/$DOMAIN/privkey.pem nginx/ssl/live/$DOMAIN/privkey.pem
  fi
  echo -e "${GREEN}✓ SSL Certificate retrieved successfully.${NC}"
else
  echo -e "${YELLOW}Skipping Let's Encrypt. Using self-signed SSL. Nginx will use secure port 443 with self-signed certificate.${NC}"
fi

# 6. Build and Start Containerized Services
echo -e "\n${BLUE}[6/7] Building and starting Docker containers...${NC}"
$DOCKER_COMPOSE -f docker-compose.production.yml down
$DOCKER_COMPOSE -f docker-compose.production.yml up -d --build

echo -e "${GREEN}✓ Docker containers built and started successfully.${NC}"

# 7. Database Migration & Seeding
echo -e "\n${BLUE}[7/7] Synchronizing database & seeding demo records...${NC}"
echo -e "Waiting for backend service to become healthy..."
sleep 10

# Push Prisma Schema Indexes
echo -e "Pushing schema index definitions to MongoDB..."
$DOCKER_COMPOSE -f docker-compose.production.yml exec -T backend npx prisma db push --schema=packages/database/prisma/schema.prisma

# Seed demo data
echo -e "Seeding default data (this may take a moment)..."
if [ -x "$(command -v node)" ]; then
  # If node is installed on the host VPS, run directly
  pnpm install --filter @blackdesk/database
  node scripts/seed-demo-data.js
else
  # Otherwise run inside a temporary node docker container connected to internal network
  docker run --rm \
    --network crm-blackdesk_blackdesk-internal \
    -v "$(pwd):/app" \
    -w /app \
    node:20-alpine sh -c "npm install -g pnpm && pnpm install --filter @blackdesk/database && node scripts/seed-demo-data.js"
fi

echo -e "\n${GREEN}======================================================================${NC}"
echo -e "${GREEN} 🎉 Britsync CRM DEPLOYED SUCCESSFULLY!${NC}"
echo -e " Domain: ${BLUE}https://$DOMAIN${NC}"
echo -e " Log files: docker compose logs -f${NC}"
echo -e " Preseeded credentials:${NC}"
echo -e "   - Admin: ${YELLOW}admin@Britsync.com${NC} / password123${NC}"
echo -e "   - Client: ${YELLOW}client@Britsync.com${NC} / password123${NC}"
echo -e "${GREEN}======================================================================${NC}"
