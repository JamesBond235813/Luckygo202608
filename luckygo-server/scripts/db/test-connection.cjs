/**
 * 测试数据库连接：node scripts/db/test-connection.cjs
 * 读取项目根目录 .env 中的 DB_* 配置
 */
const path = require('path');
const mysql = require('mysql2/promise');

require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function main() {
  const useSsl = process.env.DB_SSL === 'true';
  const config = {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  };

  console.log(`Connecting to ${config.user}@${config.host}:${config.port}/${config.database} (ssl=${useSsl})...`);
  const conn = await mysql.createConnection(config);
  const [rows] = await conn.query('SELECT DATABASE() AS db, VERSION() AS version');
  console.log('OK:', rows[0]);
  const [tables] = await conn.query('SHOW TABLES');
  console.log(`Tables: ${tables.length}`);
  await conn.end();
}

main().catch((err) => {
  console.error('Connection failed:', err.message);
  process.exit(1);
});
