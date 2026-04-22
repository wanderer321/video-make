#!/bin/bash
# DramaForge 开发启动脚本
# 同时启动 Python 后端和 Vite 前端

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "[DramaForge] 启动后端..."
cd "$ROOT/backend"
python main.py &
BACKEND_PID=$!
echo "[DramaForge] 后端 PID: $BACKEND_PID"

sleep 2

echo "[DramaForge] 启动前端 (Vite)..."
cd "$ROOT/desktop"
npm run dev &
FRONTEND_PID=$!

# Wait for Ctrl+C
trap "echo '关闭中...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM

wait
