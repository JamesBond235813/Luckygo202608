require('dotenv/config');

const mysql = require('mysql2/promise');

const schema = process.env.DB_NAME || 'luckygo';

async function hasColumn(connection, table, column) {
  const [rows] = await connection.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = ? AND table_name = ? AND column_name = ? LIMIT 1`,
    [schema, table, column],
  );
  return rows.length > 0;
}

async function addColumn(connection, table, column, definition) {
  if (await hasColumn(connection, table, column)) return false;
  await connection.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
  console.log(`[db:migrate] added ${table}.${column}`);
  return true;
}

async function main() {
  if (!/^(127\.0\.0\.1|localhost)$/.test(process.env.DB_HOST || '127.0.0.1')) {
    throw new Error('Refusing to migrate a non-local DB_HOST. This script is local-only.');
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: schema,
    multipleStatements: false,
  });

  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        name VARCHAR(128) NOT NULL,
        applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uk_schema_migrations_name (name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    const migrationName = '20260816_add_rewards_fulfillment_fields';
    const [applied] = await connection.query(
      'SELECT 1 FROM schema_migrations WHERE name = ? LIMIT 1',
      [migrationName],
    );
    if (applied.length) {
      console.log(`[db:migrate] ${migrationName} already applied`);
      return;
    }

    await addColumn(connection, 'winning_records', 'fulfillment_type', "VARCHAR(16) NOT NULL DEFAULT 'pickup' AFTER status");
    await addColumn(connection, 'winning_records', 'delivery_name', 'VARCHAR(128) DEFAULT NULL AFTER fulfillment_type');
    await addColumn(connection, 'winning_records', 'delivery_phone', 'VARCHAR(32) DEFAULT NULL AFTER delivery_name');
    await addColumn(connection, 'winning_records', 'delivery_address', 'VARCHAR(512) DEFAULT NULL AFTER delivery_phone');
    await addColumn(connection, 'winning_records', 'fulfillment_note', 'VARCHAR(512) DEFAULT NULL AFTER delivery_address');
    await addColumn(connection, 'winning_records', 'claimed_at', 'DATETIME DEFAULT NULL AFTER fulfillment_note');
    await addColumn(connection, 'withdrawal_records', 'rejection_reason', 'VARCHAR(255) DEFAULT NULL AFTER remark');
    await addColumn(connection, 'withdrawal_records', 'processed_at', 'DATETIME DEFAULT NULL AFTER completed_at');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_checkins (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id INT UNSIGNED NOT NULL,
        checkin_date DATE NOT NULL,
        streak_days INT NOT NULL DEFAULT 1,
        reward_beans INT NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uk_user_checkin_date (user_id, checkin_date),
        KEY idx_user_checkins_date (user_id, checkin_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS bean_tasks (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        code VARCHAR(64) NOT NULL,
        title_zh VARCHAR(128) NOT NULL,
        title_en VARCHAR(128) NOT NULL,
        description_zh VARCHAR(255) NOT NULL DEFAULT '',
        description_en VARCHAR(255) NOT NULL DEFAULT '',
        task_type VARCHAR(32) NOT NULL DEFAULT 'one_time',
        target_value DECIMAL(12,2) NOT NULL DEFAULT 1,
        reward_beans INT NOT NULL DEFAULT 0,
        enabled TINYINT(1) NOT NULL DEFAULT 1,
        sort_order INT NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uk_bean_tasks_code (code),
        KEY idx_bean_tasks_enabled (enabled, sort_order)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_task_claims (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id INT UNSIGNED NOT NULL,
        task_id INT UNSIGNED NOT NULL,
        progress DECIMAL(12,2) NOT NULL DEFAULT 0,
        reward_beans INT NOT NULL DEFAULT 0,
        claimed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uk_user_task_claim (user_id, task_id),
        KEY idx_user_task_claims_user (user_id, claimed_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await connection.query(`
      INSERT INTO bean_tasks
        (code, title_zh, title_en, description_zh, description_en, task_type, target_value, reward_beans, enabled, sort_order)
      VALUES
        ('first_recharge', '完成首次充值', 'Make your first top-up', '首次成功充值即可领取一次金豆奖励。', 'Claim beans after your first successful top-up.', 'one_time', 1, 100, 1, 10),
        ('first_order', '完成首次夺宝', 'Join your first draw', '首次成功参与夺宝即可领取一次金豆奖励。', 'Claim beans after your first successful draw order.', 'one_time', 1, 100, 1, 20),
        ('complete_profile', '完善个人资料', 'Complete your profile', '设置昵称和头像后即可领取一次金豆奖励。', 'Claim beans after setting a nickname and avatar.', 'one_time', 1, 50, 1, 30)
      ON DUPLICATE KEY UPDATE
        title_zh = VALUES(title_zh), title_en = VALUES(title_en),
        description_zh = VALUES(description_zh), description_en = VALUES(description_en),
        reward_beans = VALUES(reward_beans), enabled = VALUES(enabled), sort_order = VALUES(sort_order)
    `);
    await connection.query('INSERT INTO schema_migrations (name) VALUES (?)', [migrationName]);
    console.log(`[db:migrate] applied ${migrationName}`);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error('[db:migrate] failed:', error.message);
  process.exitCode = 1;
});
