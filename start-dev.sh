#!/bin/bash

# Load .env file
set -a
source .env 2>/dev/null || true
set +a

echo "Starting Bomb Game in development mode..."

# Start backend
echo "Starting backend on port ${BACKEND_PORT:-3001}..."
cd apps/backend && bun run dev &
BACKEND_PID=$!

# Wait for backend to start
sleep 2

# Start frontend
echo "Starting frontend on port ${FRONTEND_PORT:-3000}..."
cd ../frontend && bun run dev &
FRONTEND_PID=$!

echo ""
echo "================================"
echo "Bomb Game is running!"
echo "Frontend: http://localhost:${FRONTEND_PORT:-3000}"
echo "Backend:  http://localhost:${BACKEND_PORT:-3001}"
echo "================================"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
