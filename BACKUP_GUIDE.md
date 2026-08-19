# Britsync — Database Backup & Disaster Recovery Guide

This guide describes how to run, schedule, and verify automated backups for Britsync MongoDB database.

---

## 1. Automated Backup Architecture

Britsync includes a cross-platform backup engine (`scripts/backup.js`) capable of:
1. Triggering native `mongodump` if MongoDB CLI tools are available.
2. Falling back to high-speed JSON collection stream export using Prisma ORM.
3. Automatically compressing output with Gzip (`.tar.gz` / `.json.gz`).
4. Verifying archive size and structure.
5. Enforcing a retention policy (deleting backups older than 30 days).

---

## 2. Running a Manual Backup

To trigger an on-demand database backup:

```bash
# Cross-platform Node runner
node scripts/backup.js

# Linux / Docker environments
bash scripts/backup-mongodb.sh
```

Backups are saved to `./backups/Britsync-backup-YYYY-MM-DD_HH-MM-SS.json.gz`.

---

## 3. Automated Scheduling

### Option A: Cron Job (Linux / macOS)

To run daily backups at 02:00 AM:

```bash
crontab -e
```

Add entry:
```cron
0 2 * * * cd /path/to/Britsync-os && /usr/bin/node scripts/backup.js >> /var/log/Britsync-backup.log 2>&1
```

### Option B: Windows Task Scheduler

1. Open Task Scheduler -> Create Basic Task.
2. Trigger: Daily at 2:00 AM.
3. Action: Start a Program -> `node.exe`.
4. Arguments: `scripts/backup.js`.
5. Start in: `C:\Users\USER\Desktop\Britsync`.

---

## 4. Database Restoration Procedure

To restore from the latest backup:

```bash
node scripts/restore.js
```

Or using native `mongorestore` CLI:
```bash
mongorestore --uri="mongodb://shaheerkhanhyd6_db_user:Britsync2024!@localhost:27017/Britsync" --gzip --archive=./backups/latest-dump.tar.gz
```
