/**
 * 补发 user_notifications 中缺失的 treasure_win 记录（与 sql/20260620_backfill_treasure_win_notifications.sql 一致）
 * node scripts/db/backfill-missing-win-notifications.cjs
 */
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

(async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  try {
    const sqlPath = path.join(__dirname, '../../sql/20260620_backfill_treasure_win_notifications.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    const insertSql = sql
      .split('\n')
      .filter((line) => !line.trim().startsWith('--'))
      .join('\n')
      .trim();
    const [result] = await pool.query(insertSql);
    console.log('backfill affectedRows:', result.affectedRows ?? 0);

    const [missing] = await pool.query(`
      SELECT COUNT(*) AS cnt FROM winning_records w
      LEFT JOIN user_notifications un
        ON un.ref_type = 'winning' AND un.ref_id = w.id AND un.type = 'treasure_win'
      WHERE w.user_id IS NOT NULL AND un.id IS NULL
    `);
    console.log('remaining missing:', missing[0].cnt);
  } catch (e) {
    console.error('backfill failed:', e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
