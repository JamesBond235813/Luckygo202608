/**
 * 将 backup-luckygo.sql 导入 RDS（读取 rds.env 或 .env 中的 RDS_* / DB_*）
 * node scripts/db/import-to-rds.cjs
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const rdsEnvPath = path.join(__dirname, 'rds.env');
if (fs.existsSync(rdsEnvPath)) {
  require('dotenv').config({ path: rdsEnvPath });
} else {
  require('dotenv').config({ path: path.join(__dirname, '../../.env') });
}

const BACKUP = path.join(__dirname, 'backup-luckygo.sql');

async function main() {
  if (process.env.ALLOW_CLOUD_DB_WRITE !== 'true') {
    console.error('Cloud database writes are disabled for local development.');
    process.exit(1);
  }

  const targetHost = (process.env.RDS_HOST || '').trim();
  if (!targetHost || /^(localhost|127\.0\.0\.1|::1)$/i.test(targetHost)) {
    console.error('A non-local RDS_HOST is required for an explicitly authorized import.');
    process.exit(1);
  }

  if (!fs.existsSync(BACKUP)) {
    console.error(`Missing ${BACKUP}. Run export-local.cjs first.`);
    process.exit(1);
  }

  const useSsl = (process.env.RDS_SSL || process.env.DB_SSL) === 'true';
  const conn = await mysql.createConnection({
    host: targetHost,
    port: Number(process.env.RDS_PORT || process.env.DB_PORT || 3306),
    user: process.env.RDS_USER || process.env.DB_USER,
    password: process.env.RDS_PASSWORD || process.env.DB_PASSWORD,
    database: process.env.RDS_DATABASE || process.env.DB_NAME,
    multipleStatements: true,
    ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });

  const sql = fs.readFileSync(BACKUP, 'utf8');
  console.log(`Importing to ${targetHost}...`);
  await conn.query(sql);
  await conn.end();
  console.log('Import finished.');
}

main().catch((e) => {
  console.error('Import failed:', e.message);
  process.exit(1);
});
