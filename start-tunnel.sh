#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Load .env file
set -a
source "$SCRIPT_DIR/.env" 2>/dev/null || true
set +a

BACKEND_PORT=${BACKEND_PORT:-3001}
FRONTEND_PORT=${FRONTEND_PORT:-3000}

echo "Starting Bomb Game with Cloudflare Tunnels..."

# Create temp files for tunnel URLs
BACKEND_LOG=$(mktemp)
FRONTEND_LOG=$(mktemp)

# Start cloudflared for backend
echo "Starting backend tunnel on port $BACKEND_PORT..."
cloudflared tunnel --url http://localhost:$BACKEND_PORT > "$BACKEND_LOG" 2>&1 &
BACKEND_TUNNEL_PID=$!

sleep 5

# Get backend tunnel URL
BACKEND_TUNNEL_URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$BACKEND_LOG" | head -1)
echo "Backend tunnel: $BACKEND_TUNNEL_URL"

# Start cloudflared for frontend
echo "Starting frontend tunnel on port $FRONTEND_PORT..."
cloudflared tunnel --url http://localhost:$FRONTEND_PORT > "$FRONTEND_LOG" 2>&1 &
FRONTEND_TUNNEL_PID=$!

sleep 5

# Get frontend tunnel URL
FRONTEND_TUNNEL_URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$FRONTEND_LOG" | head -1)
echo "Frontend tunnel: $FRONTEND_TUNNEL_URL"

if [ -z "$BACKEND_TUNNEL_URL" ] || [ -z "$FRONTEND_TUNNEL_URL" ]; then
  echo "Error: Failed to get tunnel URLs"
  echo "Backend log:"
  cat "$BACKEND_LOG"
  echo "Frontend log:"
  cat "$FRONTEND_LOG"
  kill $BACKEND_TUNNEL_PID $FRONTEND_TUNNEL_PID 2>/dev/null
  rm -f "$BACKEND_LOG" "$FRONTEND_LOG"
  exit 1
fi

# Start backend with updated CORS
echo "Starting backend..."
cd "$SCRIPT_DIR/apps/backend" && CORS_ORIGINS="$FRONTEND_TUNNEL_URL,http://localhost:$FRONTEND_PORT" bun run dev &
BACKEND_PID=$!

sleep 2

# Start frontend with tunnel URL
echo "Starting frontend..."
cd "$SCRIPT_DIR/apps/frontend" && NEXT_PUBLIC_SOCKET_URL="$BACKEND_TUNNEL_URL" bun run dev &
FRONTEND_PID=$!

echo ""
echo "=============================================="
echo "Bomb Game is running with Cloudflare Tunnels!"
echo ""
echo "Share this URL to play:"
echo "  $FRONTEND_TUNNEL_URL"
echo ""
echo "Backend tunnel: $BACKEND_TUNNEL_URL"
echo "=============================================="
echo ""
echo "Press Ctrl+C to stop all services"

# Cleanup function
cleanup() {
  echo ""
  echo "Stopping services..."
  kill $BACKEND_PID $FRONTEND_PID $BACKEND_TUNNEL_PID $FRONTEND_TUNNEL_PID 2>/dev/null
  rm -f "$BACKEND_LOG" "$FRONTEND_LOG"
  exit
}

trap cleanup INT TERM
wait
