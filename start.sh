#!/bin/bash
set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

# Kill existing processes on ports 3000 and 3001
echo "Stopping existing processes..."
fuser -k 3000/tcp 2>/dev/null || true
fuser -k 3001/tcp 2>/dev/null || true
sleep 1

# Start backend
echo "Starting backend..."
cd "$BACKEND_DIR"
nohup node dist/main.js > /tmp/backend.log 2>&1 &
BACKEND_PID=$!

# Start frontend
echo "Starting frontend..."
cd "$FRONTEND_DIR"
nohup npm run dev > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!

# Wait for both to be ready
echo "Waiting for services..."
for i in $(seq 1 20); do
  BACKEND_UP=false
  FRONTEND_UP=false
  ss -tlnp | grep -q ':3001 ' && BACKEND_UP=true
  ss -tlnp | grep -q ':3000 ' && FRONTEND_UP=true
  if $BACKEND_UP && $FRONTEND_UP; then
    break
  fi
  sleep 1
done

echo ""
echo "================================"
if ss -tlnp | grep -q ':3001 '; then
  echo "Backend:  http://localhost:3001/api (PID $BACKEND_PID)"
else
  echo "Backend:  FAILED — check /tmp/backend.log"
fi
if ss -tlnp | grep -q ':3000 '; then
  echo "Frontend: http://localhost:3000 (PID $FRONTEND_PID)"
else
  echo "Frontend: FAILED — check /tmp/frontend.log"
fi
echo "================================"
echo ""
echo "Logs: tail -f /tmp/backend.log /tmp/frontend.log"
