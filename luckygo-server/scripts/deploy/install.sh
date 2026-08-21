#!/usr/bin/env bash
# 在白名单服务器上安装生产依赖（需已上传 dist/、package.json、package-lock.json）
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

if [[ ! -f dist/main.js ]]; then
  echo "错误: 未找到 dist/main.js，请先在 Node 18+ 环境执行 npm run build 并上传 dist/"
  exit 1
fi

mkdir -p logs

echo ">>> npm ci --omit=dev (Node $(node -v))"
npm ci --omit=dev

echo ">>> 完成。下一步:"
echo "    1. 配置 .env（可参考 .env.production.example）"
echo "    2. pm2 start ecosystem.config.cjs"
echo "    3. curl http://127.0.0.1:3000/api/campaigns"
