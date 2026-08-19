#!/usr/bin/env bash
# Britsync MongoDB Automated Backup Script
set -e

BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
ARCHIVE_NAME="Britsync_mongo_${TIMESTAMP}.tar.gz"

mkdir -p "$BACKUP_DIR"

echo "=================================================="
echo "[BACKUP] Triggering MongoDB Backup: ${TIMESTAMP}"
echo "=================================================="

node ./scripts/backup.js

echo "[BACKUP] Backup procedure complete."
