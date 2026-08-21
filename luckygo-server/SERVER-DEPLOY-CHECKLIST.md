# 打包上服务器清单（EBA Promo）

API 域名：`https://api.luckygo.kwikcc.com`  
服务器示例 IP：`47.76.241.234`（以你宝塔为准）

---

## 一、本机打包（在项目根目录执行）

```powershell
# 1. 服务端
cd luckygo-server
npm install
npm run build

# 2. H5
cd ..\luckygo-h5-new
npm install
npm run build

# 3. 管理端
cd ..\luckygo-admin
npm install
npm run build
```

产物目录：

| 项目 | 上传内容 |
|------|----------|
| 服务端 | `luckygo-server/dist/`、`package.json`、`package-lock.json` |
| H5 | `luckygo-h5-new/dist/` 全部 |
| 管理端 | `luckygo-admin/dist/` 全部 |

---

## 二、服务器环境（宝塔）

1. **Node** 16.9+（运行）/ 本机 18+ 已 build 即可  
2. **Redis 5+**（软件商店安装，启动，设密码）  
3. **RDS** 白名单加入本服务器 IP，端口 **6687**  
4. **Nginx** 反代 `/api` → `127.0.0.1:3000`

---

## 三、服务端目录（示例 `/www/wwwroot/luckygo/server/`）

上传后结构：

```text
server/
├── dist/
├── node_modules/   # 服务器上 npm install --omit=dev
├── package.json
├── package-lock.json
└── .env            # 从 .env.production.example 复制后改名
```

### `.env` 关键项（与 API 同机）

```env
NODE_ENV=production
PORT=3000

DB_HOST=rm-wz9db07344p0o59726o.mysql.rds.aliyuncs.com
DB_PORT=6687
DB_USER=luckygo
DB_PASSWORD=你的RDS密码
DB_NAME=luckygo

REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=宝塔Redis密码
AUTO_DRAW_REDIS_ENABLED=true
AUTO_DRAW_RECOVERY_ENABLED=true
```

RDS 与 ECS 同 VPC 时，可把 `DB_HOST` 换成 RDS **内网地址**。

### 安装依赖并启动

```bash
cd /www/wwwroot/luckygo/server
npm install --omit=dev
pm2 start ecosystem.config.cjs
# 或宝塔 Node 项目：启动文件 dist/main.js
pm2 logs luckygo-server
```

日志应含：`Successfully connected to the database.`  
Redis 正常时无连接错误。

### 数据库（RDS 空库时，在能连 RDS 的机器上）

```bash
npm run db:test
npm run db:migrate
```

有旧数据见 `RDS-MIGRATION.md`。

---

## 四、静态站点

| 站点 | 目录 | 说明 |
|------|------|------|
| H5 | 网站根目录 | 上传 `luckygo-h5-new/dist/*` |
| 管理端 | `admin.luckygo.kwikcc.com` 网站根目录 | 上传 `luckygo-admin/dist/*`（资源路径 `/assets/...`） |

H5/管理端已配置生产 API：`https://api.luckygo.kwikcc.com/api`（`.env.production`）。

---

## 五、上线验证

- [ ] `https://api.luckygo.kwikcc.com/` 有 Running 提示  
- [ ] 管理端登录、商品列表正常  
- [ ] H5 登录、首页期次正常  
- [ ] 满员后约 1 分钟内自动开奖（需 Redis + `AUTO_DRAW_REDIS_ENABLED=true`）  
- [ ] 开奖日志见下方「自动开奖日志（宝塔）」

---

## 自动开奖日志（宝塔）

每条日志带 **`[AutoDraw]`**，并用 **`source=`** 区分路径：

| source | 含义 |
|--------|------|
| `schedule-redis` | 满员后写入 Redis 延迟任务 |
| `redis-queue` | **到点由 Redis 队列触发开奖（主路径）** |
| `recovery-cron` | **每分钟扫库兜底开奖** |
| `recovery-startup` | 进程启动时兜底扫一次 |
| `manual-admin` | 管理端手动开奖 |

事件：`SCHEDULE` → `TRIGGER` → `SUCCESS`（含 `winningNumber`）

### 在宝塔里怎么看

1. **专用文件（推荐，按日期分文件）**  
   - 自动开奖：`logs/auto-draw/YYYY-MM-DD.log`  
   - Hubtel 支付回调/入账：`logs/hubtel-payment-callback/YYYY-MM-DD.log`  
   - H5 请求：`logs/h5/YYYY-MM-DD.log`（含 query/body 参数；已登录则带 `userId`/`phone`）  
   与 `.env` 里 `LOG_DIR`、`LOG_TZ` 一致。示例：`tail -f logs/auto-draw/$(date +%F).log`

2. **PM2 / Node 项目标准输出**  
   宝塔 → Node 项目 → 日志，或 SSH：  
   `pm2 logs luckygo-server --lines 100`  
   搜索：`grep AutoDraw logs/pm2-out.log`

3. **示例**

   ```text
   [AutoDraw] SCHEDULE source=schedule-redis campaignId=12 delayMs=60000 ...
   [AutoDraw] TRIGGER source=redis-queue campaignId=12 jobId=campaign-auto-draw-12
   [AutoDraw] SUCCESS source=redis-queue campaignId=12 winningNumber=123456 winnerUserId=3
   ```

   若看到 `source=recovery-cron` 的 `SUCCESS`，说明是**兜底**开的，不是 Redis 准时任务（可检查 Redis 是否启动、密码是否正确）。

## Hubtel 支付回调日志

格式与开奖一致：`72` 字符分隔线 + `[HubtelPay] 事件 key=value ...`，写入 `logs/hubtel-payment-callback/YYYY-MM-DD.log` 与 PM2 控制台。

| source | 含义 |
|--------|------|
| `callback` | Hubtel 服务器 POST `/api/payments/hubtel/callback` |
| `confirm` | H5 回跳后用户端 POST `/api/payments/hubtel/confirm` |
| `refund-callback` | 退款回调（当前仅记录，未入账） |

事件：`RECEIVED` → `SETTLE` → `SUCCESS` / `SKIP` / `FAIL`

示例：

```text
------------------------------------------------------------------------
[HubtelPay] RECEIVED source=callback checkoutId=xxx clientReference=EBA... status=success
[HubtelPay] SETTLE source=callback checkoutId=xxx clientReference=EBA...
[HubtelPay] SUCCESS source=callback userId=3 transactionId=42 amount=50 checkoutId=xxx
------------------------------------------------------------------------
```

搜索：`grep HubtelPay logs/hubtel-payment-callback/$(date +%F).log`

---

## 六、本机开发说明

本机 `.env` 已设 `AUTO_DRAW_REDIS_ENABLED=false`，不配 Redis 也能起 API；**自动开奖请在服务器测**。
