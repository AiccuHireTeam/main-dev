#!/usr/bin/env bash

# Ensure Node environment binaries are in PATH
export PATH="/Users/sabyasachisengupta/.nvm/versions/node/v24.15.0/bin:$PATH"

# Always run from the ui directory
cd "$(dirname "$0")" || exit 1

# Auto-heal Replit platform exclusions in pnpm-workspace.yaml if pushed from Replit
if grep -q 'darwin-arm64.*"-' pnpm-workspace.yaml 2>/dev/null; then
    echo "🔧 Removing Replit platform exclusions from pnpm-workspace.yaml..."
    sed -i '' -E '/# replit uses linux-x64 only/d; /"(esbuild|lightningcss|@tailwindcss\/oxide|rollup|@expo\/ngrok-bin)>.*": "-"/d; s/esbuild: false/esbuild: true/' pnpm-workspace.yaml
    pnpm install
elif [ ! -d "node_modules/.pnpm" ] || ! ls node_modules/.pnpm/@esbuild+darwin-* >/dev/null 2>&1; then
    echo "📦 Installing missing workspace dependencies..."
    pnpm install
fi

echo "========================================================"
echo "🚀 Starting AICCU Hire Workspace Applications..."
echo "========================================================"

# Function to clean up background processes on Ctrl+C / EXIT
cleanup() {
    echo ""
    echo "🛑 Shutting down all running services..."
    kill $(jobs -p) 2>/dev/null
    exit 0
}

trap cleanup INT TERM EXIT

# Start API Server (Backend) on Port 5005
PORT=5005 pnpm --filter @workspace/api-server dev &
API_PID=$!

# Start Dashboard / Talent Hiring Portal (Frontend UI) on Port 3000
PORT=3000 BASE_PATH=/ API_TARGET=http://localhost:5005 pnpm --filter @workspace/talent-hiring-portal dev &
DASHBOARD_PID=$!

# Start Mockup Sandbox (UI Components) on Port 5001
PORT=5001 BASE_PATH=/ pnpm --filter @workspace/mockup-sandbox dev &
SANDBOX_PID=$!

echo ""
echo "✅ All services launched!"
echo "   ➜ 💻 Dashboard UI:       http://localhost:3000"
echo "   ➜ 🔌 API Server:         http://localhost:5005"
echo "   ➜ 🧪 Mockup Sandbox:     http://localhost:5001"
echo ""
echo "Press Ctrl+C to stop all services."
echo "========================================================"

# Wait for background jobs to finish
wait
