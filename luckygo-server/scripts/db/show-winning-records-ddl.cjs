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
    const [desc] = await pool.query('SHOW CREATE TABLE winning_records');
    console.log(desc[0]['Create Table']);
  } finally {
    await pool.end();
  }
})();
