# EBA Promo 服务端生产部署指南（Node 16.9）

> 适用场景：外部接口（如 Hubtel 支付回调）有 **IP 白名单**，API 必须部署在指定服务器上。  
> 该服务器 Node 最高 **16.9** 时，推荐 **本地/CI 用 Node 18+ 编译**，服务器只负责 **安装依赖 + 运行 `dist`**。

---

## 一、架构建议

```
用户浏览器
    │
    ├─ https://你的域名/          → H5 静态资源（可放 CDN / 任意 Web 服务器）
    ├─ https://你的域名/admin/    → 管理端静态资源
    └─ https://你的域名/api/      → 反向代理到【白名单服务器】:3000
                                      （NestJS，Hubtel 回调、OSS 上传等）
```

| 组件 | 是否必须在白名单 IP 服务器 | 说明 |
|------|--------------------------|------|
| `luckygo-server` | **是** | 支付回调、需固定出口 IP 的第三方接口 |
| `luckygo-admin` 构建产物 | 否 | 纯静态，Nginx 托管即可 |
| `luckygo-h5-new` 构建产物 | 否 | 纯静态；`VITE_API_BASE_URL` 指向白名单服务器的 `/api` |
| MySQL | 建议同机房或内网 | 与白名单服务器网络互通 |

---

## 二、服务器环境准备

### 2.1 系统依赖

- **Node.js**：16.9.x（运行用）
- **npm**：8.x（随 Node 16 自带即可）
- **MySQL**：5.7+ / 8.0（推荐 8.0，`utf8mb4`）
- **PM2**（推荐）：`npm install -g pm2@4`（兼容 Node 16）
- **Nginx**（推荐）：反向代理 `/api`、托管前端静态文件

### 2.2 目录规划（示例）

```text
/var/www/luckygo/
├── server/          # luckygo-server（本仓库子目录部署内容）
│   ├── dist/
│   ├── node_modules/
│   ├── package.json
│   ├── package-lock.json
│   ├── .env         # 生产配置，勿提交 Git
│   └── logs/        # PM2 / 应用日志
├── h5/              # luckygo-h5-new/dist 内容
└── admin/           # luckygo-admin/dist 内容
```

---

## 三、数据库（阿里云 RDS）

生产库已迁到 RDS 时，详见 **[RDS-MIGRATION.md](./RDS-MIGRATION.md)**。服务器 `.env` 配置 `DB_HOST` 为 RDS 地址（同 VPC 建议用内网地址），执行 `npm run db:test` 验证连接。

---

## 三（附）、数据库初始化与迁移（本地 / 自建 MySQL）

在 MySQL 创建库与用户（示例）：

```sql
CREATE DATABASE luckygo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'luckygo'@'%' IDENTIFIED BY '你的强密码';
GRANT ALL PRIVILEGES ON luckygo.* TO 'luckygo'@'%';
FLUSH PRIVILEGES;
```

**按顺序**执行 `luckygo-server/sql/` 下脚本（已有库则跳过已执行项）：

| 顺序 | 文件 | 说明 |
|------|------|------|
| 1 | `20260518_campaigns_lottery.sql` | 期次/参与码表结构（新库或迁移） |
| 2 | `20260515_add_users_exchange_balance.sql` | 用户兑换余额字段（若需要） |
| 3 | `20260519_campaign_auto_draw_countdown.sql` | 满员倒计时字段 |
| 4 | `20260521_campaigns_drop_product_copy_fields.sql` | 删除期次冗余 title/image（已手动删可跳过） |
| 5 | `20260520_seed_iphone_products.sql` | 可选：示例商品数据 |

```bash
mysql -h127.0.0.1 -uluckygo -p luckygo < sql/20260518_campaigns_lottery.sql
# ... 依次执行
```

---

## 四、推荐部署流程（本地构建 + 服务器运行）

### 4.1 在开发机 / CI（Node 18+）构建后端

```bash
cd luckygo-server
npm ci
npm run build
# 产物：dist/
```

打包上传到服务器（不要上传 `.env`）：

```text
dist/
package.json
package-lock.json
sql/                 # 可选，便于服务器上执行迁移
ecosystem.config.cjs
scripts/deploy/
```

### 4.2 在白名单服务器安装生产依赖

```bash
cd /var/www/luckygo/server
npm ci --omit=dev
# 或：bash scripts/deploy/install.sh
```

> 若 `npm ci` 在 Node 16.9 报错，请在 Node 18 机器执行 `npm ci --omit=dev` 后，将 `node_modules` 一并打包上传（体积较大但最稳）。

### 4.3 配置生产环境变量

```bash
cp .env.production.example .env
chmod 600 .env
vim .env
```

**务必修改**：`ADMIN_JWT_SECRET`、`DB_*`、`SUPER_ADMIN_PASSWORD`、`HUBTEL_*`、`HUBTEL_CALLBACK_URL`（公网 HTTPS 地址）、`OSS_*`、`H5_OTP_DEV_CODE`（生产应接真实短信后改掉占位逻辑）。

`HUBTEL_CALLBACK_URL` 示例：

```env
HUBTEL_CALLBACK_URL=https://你的域名/api/payments/hubtel/callback
```

### 4.4 使用 PM2 启动

```bash
cd /var/www/luckygo/server
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup    # 按提示配置开机自启
```

常用命令：

```bash
pm2 status
pm2 logs luckygo-server
pm2 restart luckygo-server
```

### 4.5 健康检查

```bash
curl -s http://127.0.0.1:3000/api/campaigns | head
# 应返回 JSON：{ "code": 0, "data": [...], "message": "ok" }
```

---

## 五、前端构建与静态资源（不在白名单机也可）

在 **Node 18+** 机器执行：

```bash
# H5
cd luckygo-h5-new
# .env.production 或构建时指定：
# VITE_API_BASE_URL=https://你的域名/api
npm ci
npm run build
# 上传 dist/* → /var/www/luckygo/h5/

# 管理端
cd luckygo-admin
# VITE_API_BASE_URL=https://你的域名/api
npm ci
npm run build
# 上传 dist/* → /var/www/luckygo/admin/
```

生产 `VITE_API_BASE_URL` 必须指向白名单服务器对外暴露的 API 地址（带 `/api` 后缀）。

---

## 六、Nginx 配置要点

参考仓库 `deploy/nginx/luckygo.conf.example`。

- `/api/` → `proxy_pass http://127.0.0.1:3000/api/;`
- `/admin/` → 静态目录 `admin/`
- `/` → 静态目录 `h5/`（或 H5 单独域名）
- 上传大小：商品图上传建议 `client_max_body_size 10m;`
- Hubtel 回调走 HTTPS，需有效证书

---

## 七、上线检查清单

- [ ] MySQL 迁移已执行，表结构与代码一致（`campaigns` 无 `title/image/description`）
- [ ] `.env` 已配置且 `ADMIN_JWT_SECRET` 足够长
- [ ] OSS 读写正常，Bucket 公共读或 CDN 可访问图片
- [ ] Hubtel 回调 URL 为公网 HTTPS，且解析到**白名单 IP** 服务器
- [ ] 防火墙放行 80/443；**不要**对公网直接暴露 3000（仅本机 Nginx 反代）
- [ ] PM2 进程 `online`，`pm2 logs` 无持续报错
- [ ] H5 / 管理端能登录，商品图、参与记录接口正常
- [ ] 生产环境关闭或替换 `H5_OTP_DEV_CODE` 占位验证码
- [ ] Redis 已启动，`.env` 中 `AUTO_DRAW_REDIS_ENABLED=true`；`pm2 logs` 可见 `Scheduled auto-draw campaign=...`

---

## 八、满员自动开奖（Redis 延迟队列，秒级准时）

运营环境请安装 **Redis**（宝塔「软件商店」→ Redis 7，绑定 `127.0.0.1`）。

| 组件 | 作用 |
|------|------|
| **BullMQ + Redis** | 满员瞬间按 `sellout_at + 倒计时秒数` 投递**延迟任务**，到点毫秒级触发开奖（主路径） |
| **MySQL 锁** | `GET_LOCK` + `FOR UPDATE`，多 PM2 实例不会重复开同一期 |
| **每分钟补偿** | 同步未入队期次 + 扫库兜底（Redis 短暂故障时） |

`.env` 必配：`REDIS_HOST`、`AUTO_DRAW_REDIS_ENABLED=true`。

流程：最后一笔订单 commit → `scheduleAutoDraw` 写入 Redis → 倒计时结束 Worker 执行 `runAutoDrawIfDue` → `ended`。

**不依赖**用户打开 H5；**不依赖** 10 秒轮询精度。

---

## 九、更新发布（发版）

```bash
# 开发机
cd luckygo-server && npm ci && npm run build

# 上传 dist/ 到服务器后
ssh 白名单服务器
cd /var/www/luckygo/server
npm ci --omit=dev    # package.json 依赖有变时
pm2 restart luckygo-server
```

如有 SQL 变更，先备份数据库，再执行新迁移脚本。

---

## 十、常见问题

### Q1：服务器只有 Node 16.9，本地 package.json 写 `>=18` 怎么办？

- **运行**：编译后的 `dist/main.js` 在 Node 16.9 上一般可正常运行。  
- **构建**：请在 Node 18+ 机器执行 `npm run build`，不要把 `nest build` 放在 16.9 服务器上。

### Q2：为什么 API 必须放白名单服务器？

第三方支付、短信等会校验服务器出口 IP。只有该机器发起的请求和接收的回调才在白名单内。

### Q3：`Database error` 接口报错？

检查 MySQL 连接、迁移是否完整；查看 `pm2 logs` 中 `[findParticipation]` 等 SQL 错误（常见为表字段与代码不一致）。

### Q4：图片无法显示？

确认 `OSS_PUBLIC_URL`、Bucket 读权限；H5/管理端不需再访问本地 `/uploads`。
