const mysql = require('mysql2/promise');
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
    const [tables] = await pool.query("SHOW TABLES LIKE 'user_notifications'");
    console.log('table exists:', tables.length > 0);
    if (tables.length) {
      const [cols] = await pool.query('DESCRIBE user_notifications');
      console.log('columns:', cols.map((c) => c.Field).join(', '));
    }
    const [wins] = await pool.query(`
      SELECT w.id, w.user_id, w.campaign_id, w.winning_number, w.draw_time,
             un.id AS notification_id
      FROM winning_records w
      LEFT JOIN user_notifications un
        ON un.ref_type = 'winning' AND un.ref_id = w.id AND un.type = 'treasure_win'
      ORDER BY w.id DESC
      LIMIT 10
    `);
    console.log('recent wins:', JSON.stringify(wins, null, 2));
    const [missing] = await pool.query(`
      SELECT COUNT(*) AS cnt FROM winning_records w
      LEFT JOIN user_notifications un
        ON un.ref_type = 'winning' AND un.ref_id = w.id AND un.type = 'treasure_win'
      WHERE w.user_id IS NOT NULL AND un.id IS NULL
    `);
    console.log('wins with user but no notification:', missing[0].cnt);
    const [treasureCount] = await pool.query(
      "SELECT COUNT(*) AS cnt FROM user_notifications WHERE type = 'treasure_win'",
    );
    console.log('treasure_win notifications total:', treasureCount[0].cnt);
  } catch (e) {
    console.error('ERR', e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
