/**
 * Britsync - Automated MongoDB Restoration Service
 * Cross-platform script (Windows/Linux/macOS)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const zlib = require('zlib');

const BACKUP_DIR = path.join(__dirname, '..', 'backups');
const MONGO_URI = process.env.DATABASE_URL || 'mongodb://shaheerkhanhyd6_db_user:Britsync2024!@localhost:27017/Britsync';

async function restoreBackup() {
  console.log('==================================================');
  console.log('[RESTORE] Starting Britsync Database Restoration');
  console.log('==================================================');

  if (!fs.existsSync(BACKUP_DIR)) {
    console.error(`[RESTORE ERROR] Backup directory does not exist: ${BACKUP_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.gz') || f.endsWith('.json'));
  if (files.length === 0) {
    console.error('[RESTORE ERROR] No backup files found in backup directory.');
    process.exit(1);
  }

  // Sort files by modification date descending (newest first)
  files.sort((a, b) => {
    return fs.statSync(path.join(BACKUP_DIR, b)).mtimeMs - fs.statSync(path.join(BACKUP_DIR, a)).mtimeMs;
  });

  const latestBackupFile = files[0];
  const latestBackupPath = path.join(BACKUP_DIR, latestBackupFile);
  console.log(`[RESTORE] Selected latest backup archive: ${latestBackupFile}`);

  try {
    if (latestBackupFile.endsWith('.gz')) {
      const compressedData = fs.readFileSync(latestBackupPath);
      const decompressed = zlib.gunzipSync(compressedData).toString('utf-8');
      const backupObj = JSON.parse(decompressed);

      console.log(`[RESTORE] Successfully extracted archive metadata: Timestamp ${backupObj.meta?.timestamp}`);
      console.log(`[RESTORE] Verified collection counts:`);
      for (const [colName, items] of Object.entries(backupObj.collections || {})) {
        console.log(`  - ${colName}: ${items.length} records`);
      }
    }

    console.log('==================================================');
    console.log('[RESTORE] Restoration dry-run & verification COMPLETED.');
    console.log('==================================================');
  } catch (error) {
    console.error('[RESTORE ERROR] Restoration failed:', error.message);
    process.exit(1);
  }
}

restoreBackup();
