# EBA Promo 数据库迁移到阿里云 RDS

## RDS 连接信息（生产）

| 项 | 值 |
|----|-----|
| 外网地址 | `rm-wz9db07344p0o59726o.mysql.rds.aliyuncs.com` |
| 端口 | `6687` |
| 数据库名 | `luckygo` |
| 用户名 | `luckygo` |

密码放在服务器与本机 `.env` 的 `DB_PASSWORD`，**不要提交 Git**。

---

## 迁移前必做（阿里云控制台）

1. **RDS 已创建库** `luckygo`，账号 `luckygo` 对该库有读写权限。
2. **白名单**：把下面 IP 加进 RDS 白名单  
   - 你的**开发机公网 IP**（本机测连接、导数据）  
   - **API 服务器公网/内网 IP**（若 ECS 与 RDS 同 VPC，用内网地址更稳、更快）
3. 若 API 服务器在华南同区，建议在 RDS 控制台查看是否有**内网地址**，生产 `.env` 优先用内网地址（省流量、延迟低）。

---

## 方式 A：旧库有数据 → 导出再导入

在本机（能连上旧 MySQL）：

```bash
cd luckygo-server

# 1. 配置 scripts/db/rds.env（复制 rds.env.example，填 LOCAL_* 与 RDS_*）
copy scripts\db\rds.env.example scripts\db\rds.env

# 2. 从本地旧库导出
node scripts/db/export-local.cjs

# 3. 导入 RDS（rds.env 里 RDS_* 指向阿里云）
node scripts/db/import-to-rds.cjs
```

---

## 方式 B：RDS 空库 → 只跑表结构迁移

`.env` 已指向 RDS 后：

```bash
cd luckygo-server
node scripts/db/test-connection.cjs
node scripts/db/run-migrations.cjs
```

需要示例商品时，在 `run-migrations.cjs` 里取消注释 `20260520_seed_iphone_products.sql` 再执行一次。

---

## 应用配置

### 本机开发 `.env`

```env
DB_HOST=rm-wz9db07344p0o59726o.mysql.rds.aliyuncs.com
DB_PORT=6687
DB_USER=luckygo
DB_PASSWORD=你的密码
DB_NAME=luckygo
DB_SSL=false
DB_CONNECTION_LIMIT=10
```

（外网一般 `DB_SSL=false` 即可；若 RDS 强制 SSL，改为 `DB_SSL=true`。）

### 生产服务器 `.env`

与上相同；若 ECS 在深圳且与 RDS 同 VPC，把 `DB_HOST` 换成 RDS **内网地址**。

改完后：

```bash
npm run build
pm2 restart luckygo-server
pm2 logs luckygo-server
```

应看到 `Successfully connected to the database.`

---

## 验证

```bash
node scripts/db/test-connection.cjs
```

登录管理端 / H5，检查商品、期次、用户是否正常。

---

## 安全提醒

- 密码勿写入 Git；`rds.env`、`backup-luckygo.sql` 已加入 `.gitignore`。
- 若在聊天/工单里发过密码，建议在阿里云 RDS **修改账号密码** 后同步更新 `.env`。
