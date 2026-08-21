/**
 * 从本地库导出数据到 scripts/db/backup-luckygo.sql（需本机可连上 LOCAL_*）
 * 使用 Node 流式导出表数据，不依赖 mysqldump 命令行。
 *
 * 配置：复制 rds.env.example 为 rds.env，填 LOCAL_* 与 RDS_*（本脚本只用 LOCAL_*）
 * node scripts/db/export-local.cjs
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

const OUT = path.join(__dirname, 'backup-luckygo.sql');

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.LOCAL_HOST || '127.0.0.1',
    port: Number(process.env.LOCAL_PORT || 3306),
    user: process.env.LOCAL_USER || process.env.DB_USER,
    password: process.env.LOCAL_PASSWORD || process.env.DB_PASSWORD,
    database: process.env.LOCAL_DATABASE || process.env.DB_NAME,
  });

  const [tables] = await conn.query('SHOW TABLES');
  const tableKey = Object.keys(tables[0] || {})[0] || 'Tables_in_luckygo';
  const names = tables.map((r) => r[tableKey]);

  const lines = ['SET FOREIGN_KEY_CHECKS=0;', 'SET NAMES utf8mb4;'];
  for (const table of names) {
    const [createRows] = await conn.query(`SHOW CREATE TABLE \`${table}\``);
    lines.push(`DROP TABLE IF EXISTS \`${table}\`;`);
    lines.push(`${createRows[0]['Create Table']};`);
    const [rows] = await conn.query(`SELECT * FROM \`${table}\``);
    if (!rows.length) continue;
    const cols = Object.keys(rows[0]).map((c) => `\`${c}\``).join(',');
    for (const row of rows) {
      const vals = Object.values(row).map((v) => {
        if (v === null) return 'NULL';
        if (v instanceof Date) return `'${v.toISOString().slice(0, 19).replace('T', ' ')}'`;
        if (typeof v === 'number') return String(v);
        if (typeof v === 'object') return `'${conn.escape(JSON.stringify(v)).replace(/^'|'$/g, '')}'`;
        return conn.escape(v);
      });
      lines.push(`INSERT INTO \`${table}\` (${cols}) VALUES (${vals.join(',')});`);
    }
  }
  lines.push('SET FOREIGN_KEY_CHECKS=1;');
  fs.writeFileSync(OUT, lines.join('\n'), 'utf8');
  await conn.end();
  console.log(`Exported ${names.length} tables to ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
