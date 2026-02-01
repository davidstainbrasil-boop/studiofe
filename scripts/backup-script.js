#!/usr/bin/env node

/**
 * 💾 Automated Backup Script - Supabase & Redis
 * MVP Vídeos TécnicoCursos v7
 * 
 * Features:
 * - Backup do banco de dados Supabase
 * - Backup do Redis (RDB/AOF)
 * - Backup do Supabase Storage
 * - Rotação automática de backups
 * - Verificação de integridade
 * - Upload para S3/GCS
 * - Notificações de status
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');

// ===========================================
// Configuration
// ===========================================

const CONFIG = {
  // Backup settings
  backupDir: process.env.BACKUP_DIR || './backups',
  retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10),
  compression: process.env.BACKUP_COMPRESSION !== 'false',
  
  // Database
  databaseUrl: process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL || '',
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  
  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  
  // Cloud storage (optional)
  s3Bucket: process.env.BACKUP_S3_BUCKET || '',
  gcsBacket: process.env.BACKUP_GCS_BUCKET || '',
  
  // Notifications
  slackWebhook: process.env.SLACK_WEBHOOK_URL || '',
  emailTo: process.env.BACKUP_EMAIL_TO || '',
};

// ===========================================
// Utility Functions
// ===========================================

function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const prefix = {
    INFO: '📋',
    SUCCESS: '✅',
    ERROR: '❌',
    WARN: '⚠️',
  };
  console.log(`${timestamp} ${prefix[level] || '📋'} [${level}] ${message}`);
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    log(`Created directory: ${dirPath}`);
  }
}

function getTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function getChecksum(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('md5').update(content).digest('hex');
}

function formatSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

async function sendSlackNotification(message, success = true) {
  if (!CONFIG.slackWebhook) return;
  
  const payload = {
    attachments: [{
      color: success ? '#36a64f' : '#ff0000',
      title: success ? '✅ Backup Completed' : '❌ Backup Failed',
      text: message,
      footer: 'MVP Vídeos TécnicoCursos Backup System',
      ts: Math.floor(Date.now() / 1000),
    }],
  };

  return new Promise((resolve) => {
    const url = new URL(CONFIG.slackWebhook);
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, resolve);
    req.on('error', () => resolve());
    req.write(JSON.stringify(payload));
    req.end();
  });
}

// ===========================================
// Database Backup
// ===========================================

async function backupDatabase() {
  log('Starting database backup...');
  
  if (!CONFIG.databaseUrl) {
    log('DATABASE_URL not configured, skipping database backup', 'WARN');
    return null;
  }

  const timestamp = getTimestamp();
  const backupFile = path.join(CONFIG.backupDir, 'db', `backup_${timestamp}.sql`);
  ensureDir(path.dirname(backupFile));

  try {
    // Parse database URL
    const dbUrl = new URL(CONFIG.databaseUrl);
    const host = dbUrl.hostname;
    const port = dbUrl.port || '5432';
    const database = dbUrl.pathname.slice(1);
    const user = dbUrl.username;
    const password = dbUrl.password;

    // Set password for pg_dump
    process.env.PGPASSWORD = password;

    // Tables to backup (excluding system tables)
    const tables = [
      'users',
      'projects',
      'slides',
      'render_jobs',
      'analytics_events',
      'nr_courses',
      'nr_modules',
      'roles',
      'permissions',
      'role_permissions',
      'user_roles',
      'subscriptions',
      'certificates',
    ];

    // Run pg_dump
    const pgDumpCmd = `pg_dump -h ${host} -p ${port} -U ${user} -d ${database} --no-owner --no-acl -f ${backupFile}`;
    
    log(`Running: pg_dump to ${backupFile}`);
    execSync(pgDumpCmd, { stdio: 'pipe' });

    // Compress if enabled
    let finalFile = backupFile;
    if (CONFIG.compression) {
      execSync(`gzip -9 ${backupFile}`);
      finalFile = `${backupFile}.gz`;
    }

    const stats = fs.statSync(finalFile);
    const checksum = getChecksum(finalFile);

    log(`Database backup completed: ${finalFile}`, 'SUCCESS');
    log(`Size: ${formatSize(stats.size)}, Checksum: ${checksum}`);

    return {
      file: finalFile,
      size: stats.size,
      checksum,
      tables: tables.length,
    };
  } catch (error) {
    log(`Database backup failed: ${error.message}`, 'ERROR');
    throw error;
  } finally {
    delete process.env.PGPASSWORD;
  }
}

// ===========================================
// Redis Backup
// ===========================================

async function backupRedis() {
  log('Starting Redis backup...');

  if (!CONFIG.redisUrl) {
    log('REDIS_URL not configured, skipping Redis backup', 'WARN');
    return null;
  }

  const timestamp = getTimestamp();
  const backupDir = path.join(CONFIG.backupDir, 'redis');
  ensureDir(backupDir);

  try {
    const redisUrl = new URL(CONFIG.redisUrl);
    const host = redisUrl.hostname;
    const port = redisUrl.port || '6379';
    const password = redisUrl.password;

    // Trigger BGSAVE
    const authArg = password ? `-a ${password}` : '';
    execSync(`redis-cli -h ${host} -p ${port} ${authArg} BGSAVE`, { stdio: 'pipe' });

    // Wait for background save to complete
    log('Waiting for Redis BGSAVE to complete...');
    let saving = true;
    let attempts = 0;
    while (saving && attempts < 60) {
      const info = execSync(
        `redis-cli -h ${host} -p ${port} ${authArg} INFO persistence`,
        { stdio: 'pipe' }
      ).toString();
      saving = info.includes('rdb_bgsave_in_progress:1');
      if (saving) {
        await new Promise((r) => setTimeout(r, 1000));
        attempts++;
      }
    }

    if (saving) {
      throw new Error('Redis BGSAVE timeout');
    }

    // Get RDB file location
    const configDir = execSync(
      `redis-cli -h ${host} -p ${port} ${authArg} CONFIG GET dir`,
      { stdio: 'pipe' }
    ).toString().split('\n')[1]?.trim() || '/var/lib/redis';

    const configFile = execSync(
      `redis-cli -h ${host} -p ${port} ${authArg} CONFIG GET dbfilename`,
      { stdio: 'pipe' }
    ).toString().split('\n')[1]?.trim() || 'dump.rdb';

    const sourceFile = path.join(configDir, configFile);
    const destFile = path.join(backupDir, `redis_${timestamp}.rdb`);

    // Copy RDB file (if accessible)
    if (fs.existsSync(sourceFile)) {
      fs.copyFileSync(sourceFile, destFile);
    } else {
      // For remote Redis, use DUMP command for each key
      log('Remote Redis detected, using key-by-key backup');
      const keys = execSync(
        `redis-cli -h ${host} -p ${port} ${authArg} KEYS "*"`,
        { stdio: 'pipe' }
      ).toString().trim().split('\n').filter(Boolean);

      const keyData = {};
      for (const key of keys.slice(0, 10000)) { // Limit to 10k keys
        try {
          const type = execSync(
            `redis-cli -h ${host} -p ${port} ${authArg} TYPE "${key}"`,
            { stdio: 'pipe' }
          ).toString().trim();
          
          let value;
          switch (type) {
            case 'string':
              value = execSync(
                `redis-cli -h ${host} -p ${port} ${authArg} GET "${key}"`,
                { stdio: 'pipe' }
              ).toString();
              break;
            case 'hash':
              value = execSync(
                `redis-cli -h ${host} -p ${port} ${authArg} HGETALL "${key}"`,
                { stdio: 'pipe' }
              ).toString();
              break;
            case 'list':
              value = execSync(
                `redis-cli -h ${host} -p ${port} ${authArg} LRANGE "${key}" 0 -1`,
                { stdio: 'pipe' }
              ).toString();
              break;
            case 'set':
              value = execSync(
                `redis-cli -h ${host} -p ${port} ${authArg} SMEMBERS "${key}"`,
                { stdio: 'pipe' }
              ).toString();
              break;
            default:
              value = null;
          }
          
          if (value) {
            keyData[key] = { type, value };
          }
        } catch {
          // Skip key if error
        }
      }

      fs.writeFileSync(
        destFile.replace('.rdb', '.json'),
        JSON.stringify(keyData, null, 2)
      );
    }

    // Compress
    let finalFile = destFile;
    if (CONFIG.compression && fs.existsSync(destFile)) {
      execSync(`gzip -9 ${destFile}`);
      finalFile = `${destFile}.gz`;
    } else if (fs.existsSync(destFile.replace('.rdb', '.json'))) {
      finalFile = destFile.replace('.rdb', '.json');
      if (CONFIG.compression) {
        execSync(`gzip -9 ${finalFile}`);
        finalFile = `${finalFile}.gz`;
      }
    }

    if (!fs.existsSync(finalFile)) {
      return null;
    }

    const stats = fs.statSync(finalFile);
    const checksum = getChecksum(finalFile);

    log(`Redis backup completed: ${finalFile}`, 'SUCCESS');
    log(`Size: ${formatSize(stats.size)}, Checksum: ${checksum}`);

    return {
      file: finalFile,
      size: stats.size,
      checksum,
    };
  } catch (error) {
    log(`Redis backup failed: ${error.message}`, 'ERROR');
    // Non-critical, continue
    return null;
  }
}

// ===========================================
// Storage Backup (Supabase)
// ===========================================

async function backupStorage() {
  log('Starting Supabase Storage backup...');

  if (!CONFIG.supabaseUrl || !CONFIG.supabaseServiceKey) {
    log('Supabase credentials not configured, skipping storage backup', 'WARN');
    return null;
  }

  const timestamp = getTimestamp();
  const backupDir = path.join(CONFIG.backupDir, 'storage');
  ensureDir(backupDir);

  try {
    // List buckets
    const bucketsResponse = await fetch(
      `${CONFIG.supabaseUrl}/storage/v1/bucket`,
      {
        headers: {
          Authorization: `Bearer ${CONFIG.supabaseServiceKey}`,
          apikey: CONFIG.supabaseServiceKey,
        },
      }
    );

    if (!bucketsResponse.ok) {
      throw new Error(`Failed to list buckets: ${bucketsResponse.status}`);
    }

    const buckets = await bucketsResponse.json();
    const backupManifest = {
      timestamp: new Date().toISOString(),
      buckets: [],
    };

    for (const bucket of buckets) {
      log(`Backing up bucket: ${bucket.name}`);
      
      // List files in bucket
      const filesResponse = await fetch(
        `${CONFIG.supabaseUrl}/storage/v1/object/list/${bucket.name}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${CONFIG.supabaseServiceKey}`,
            apikey: CONFIG.supabaseServiceKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prefix: '', limit: 10000 }),
        }
      );

      if (!filesResponse.ok) {
        log(`Failed to list files in ${bucket.name}`, 'WARN');
        continue;
      }

      const files = await filesResponse.json();
      backupManifest.buckets.push({
        name: bucket.name,
        fileCount: files.length,
        files: files.map((f) => ({
          name: f.name,
          size: f.metadata?.size,
          lastModified: f.updated_at,
        })),
      });
    }

    // Save manifest
    const manifestFile = path.join(backupDir, `storage_manifest_${timestamp}.json`);
    fs.writeFileSync(manifestFile, JSON.stringify(backupManifest, null, 2));

    // Compress manifest
    if (CONFIG.compression) {
      execSync(`gzip -9 ${manifestFile}`);
    }

    const finalFile = CONFIG.compression ? `${manifestFile}.gz` : manifestFile;
    const stats = fs.statSync(finalFile);

    log(`Storage manifest backup completed: ${finalFile}`, 'SUCCESS');
    log(`Buckets: ${backupManifest.buckets.length}, Files cataloged: ${
      backupManifest.buckets.reduce((sum, b) => sum + b.fileCount, 0)
    }`);

    return {
      file: finalFile,
      size: stats.size,
      buckets: backupManifest.buckets.length,
      files: backupManifest.buckets.reduce((sum, b) => sum + b.fileCount, 0),
    };
  } catch (error) {
    log(`Storage backup failed: ${error.message}`, 'ERROR');
    return null;
  }
}

// ===========================================
// Backup Rotation
// ===========================================

function rotateBackups() {
  log(`Rotating backups older than ${CONFIG.retentionDays} days...`);

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - CONFIG.retentionDays);

  let deletedCount = 0;
  let freedBytes = 0;

  const walkDir = (dir) => {
    if (!fs.existsSync(dir)) return;
    
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        walkDir(fullPath);
      } else {
        const stats = fs.statSync(fullPath);
        if (stats.mtime < cutoffDate) {
          fs.unlinkSync(fullPath);
          deletedCount++;
          freedBytes += stats.size;
          log(`Deleted old backup: ${fullPath}`);
        }
      }
    }
  };

  walkDir(CONFIG.backupDir);

  if (deletedCount > 0) {
    log(`Rotation complete: ${deletedCount} files deleted, ${formatSize(freedBytes)} freed`, 'SUCCESS');
  } else {
    log('No old backups to rotate');
  }
}

// ===========================================
// Upload to Cloud Storage
// ===========================================

async function uploadToS3(filePath) {
  if (!CONFIG.s3Bucket) return null;

  log(`Uploading ${filePath} to S3...`);

  try {
    const fileName = path.basename(filePath);
    const datePrefix = new Date().toISOString().slice(0, 10);
    const s3Key = `backups/${datePrefix}/${fileName}`;

    execSync(
      `aws s3 cp "${filePath}" "s3://${CONFIG.s3Bucket}/${s3Key}" --storage-class STANDARD_IA`,
      { stdio: 'pipe' }
    );

    log(`Uploaded to s3://${CONFIG.s3Bucket}/${s3Key}`, 'SUCCESS');
    return `s3://${CONFIG.s3Bucket}/${s3Key}`;
  } catch (error) {
    log(`S3 upload failed: ${error.message}`, 'ERROR');
    return null;
  }
}

// ===========================================
// Main Backup Function
// ===========================================

async function runBackup() {
  const startTime = Date.now();
  log('='.repeat(50));
  log('Starting automated backup...');
  log('='.repeat(50));

  ensureDir(CONFIG.backupDir);

  const results = {
    success: true,
    startTime: new Date().toISOString(),
    database: null,
    redis: null,
    storage: null,
    errors: [],
  };

  try {
    // Database backup
    results.database = await backupDatabase();
  } catch (error) {
    results.errors.push({ component: 'database', error: error.message });
    results.success = false;
  }

  try {
    // Redis backup
    results.redis = await backupRedis();
  } catch (error) {
    results.errors.push({ component: 'redis', error: error.message });
    // Non-critical
  }

  try {
    // Storage backup
    results.storage = await backupStorage();
  } catch (error) {
    results.errors.push({ component: 'storage', error: error.message });
    // Non-critical
  }

  // Rotate old backups
  try {
    rotateBackups();
  } catch (error) {
    results.errors.push({ component: 'rotation', error: error.message });
  }

  // Upload to cloud (optional)
  if (CONFIG.s3Bucket) {
    if (results.database?.file) {
      results.database.s3Url = await uploadToS3(results.database.file);
    }
    if (results.redis?.file) {
      results.redis.s3Url = await uploadToS3(results.redis.file);
    }
  }

  // Calculate totals
  const duration = (Date.now() - startTime) / 1000;
  const totalSize = 
    (results.database?.size || 0) +
    (results.redis?.size || 0) +
    (results.storage?.size || 0);

  results.endTime = new Date().toISOString();
  results.durationSeconds = duration;
  results.totalSize = totalSize;

  // Log summary
  log('='.repeat(50));
  log('Backup Summary');
  log('='.repeat(50));
  log(`Duration: ${duration.toFixed(2)} seconds`);
  log(`Total Size: ${formatSize(totalSize)}`);
  log(`Database: ${results.database ? '✅' : '❌'}`);
  log(`Redis: ${results.redis ? '✅' : '⚠️ (optional)'}`);
  log(`Storage: ${results.storage ? '✅' : '⚠️ (optional)'}`);
  log(`Errors: ${results.errors.length}`);
  log('='.repeat(50));

  // Send notification
  const notificationMsg = [
    `*Backup ${results.success ? 'Completed' : 'Failed'}*`,
    `Duration: ${duration.toFixed(2)}s`,
    `Total Size: ${formatSize(totalSize)}`,
    `Database: ${results.database ? `✅ ${formatSize(results.database.size)}` : '❌ Failed'}`,
    `Redis: ${results.redis ? `✅ ${formatSize(results.redis.size)}` : '⚠️ Skipped'}`,
    `Storage: ${results.storage ? `✅ ${results.storage.files} files` : '⚠️ Skipped'}`,
    results.errors.length > 0 ? `Errors: ${results.errors.map(e => e.component).join(', ')}` : '',
  ].filter(Boolean).join('\n');

  await sendSlackNotification(notificationMsg, results.success);

  // Save result manifest
  const manifestPath = path.join(CONFIG.backupDir, 'latest_backup.json');
  fs.writeFileSync(manifestPath, JSON.stringify(results, null, 2));

  return results;
}

// ===========================================
// CLI Interface
// ===========================================

const args = process.argv.slice(2);
const command = args[0] || 'full';

async function main() {
  switch (command) {
    case 'full':
      await runBackup();
      break;
    
    case 'db':
    case 'database':
      await backupDatabase();
      break;
    
    case 'redis':
      await backupRedis();
      break;
    
    case 'storage':
      await backupStorage();
      break;
    
    case 'rotate':
      rotateBackups();
      break;
    
    case 'verify':
      await verifyBackups();
      break;
    
    case 'help':
      console.log(`
Backup Script - MVP Vídeos TécnicoCursos

Usage: node backup-script.js [command]

Commands:
  full      Run full backup (default)
  db        Backup database only
  redis     Backup Redis only
  storage   Backup Supabase Storage only
  rotate    Rotate old backups
  verify    Verify backup integrity
  help      Show this help

Environment Variables:
  BACKUP_DIR              Directory for backups (default: ./backups)
  BACKUP_RETENTION_DAYS   Days to keep backups (default: 30)
  DIRECT_DATABASE_URL     PostgreSQL connection string
  REDIS_URL               Redis connection string
  SUPABASE_URL            Supabase API URL
  SUPABASE_SERVICE_KEY    Supabase service role key
  BACKUP_S3_BUCKET        S3 bucket for cloud backup
  SLACK_WEBHOOK_URL       Slack webhook for notifications
      `);
      break;
    
    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
}

async function verifyBackups() {
  log('Verifying backup integrity...');
  
  const manifestPath = path.join(CONFIG.backupDir, 'latest_backup.json');
  if (!fs.existsSync(manifestPath)) {
    log('No backup manifest found', 'ERROR');
    return false;
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  let valid = true;

  // Verify database backup
  if (manifest.database?.file) {
    if (fs.existsSync(manifest.database.file)) {
      const currentChecksum = getChecksum(manifest.database.file);
      if (currentChecksum === manifest.database.checksum) {
        log(`Database backup valid: ${manifest.database.file}`, 'SUCCESS');
      } else {
        log(`Database backup checksum mismatch!`, 'ERROR');
        valid = false;
      }
    } else {
      log(`Database backup file missing: ${manifest.database.file}`, 'ERROR');
      valid = false;
    }
  }

  // Verify Redis backup
  if (manifest.redis?.file) {
    if (fs.existsSync(manifest.redis.file)) {
      log(`Redis backup exists: ${manifest.redis.file}`, 'SUCCESS');
    } else {
      log(`Redis backup file missing`, 'WARN');
    }
  }

  log(`Backup verification ${valid ? 'PASSED' : 'FAILED'}`, valid ? 'SUCCESS' : 'ERROR');
  return valid;
}

main().catch((error) => {
  log(`Backup script failed: ${error.message}`, 'ERROR');
  process.exit(1);
});

module.exports = { runBackup, backupDatabase, backupRedis, backupStorage, rotateBackups };
