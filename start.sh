#!/usr/bin/env bash
set -e

echo "🔮 ==================================================="
echo "      POTIONPULSE · HACKATHON LAUNCH ENGINE          "
echo "====================================================="

# 1. Setup Python Virtual Environment & Backend
echo "📦 Setting up Python backend dependencies..."
if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi
source .venv/bin/activate
pip install -r backend/requirements.txt pytest httpx > /dev/null 2>&1 || pip install -r backend/requirements.txt

# 2. Run automated test suite
echo "🧪 Running ML prophecy & anomaly unit tests..."
pytest test_prediction_engine.py -q || true

# 3. Start Backend Server in Background
echo "🚀 Starting FastAPI Backend on http://localhost:8000..."
python3 -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# 4. Start Frontend
echo "💻 Starting React + Vite Dashboard on http://localhost:3000..."
if [ ! -d "node_modules" ]; then
  echo "Installing npm dependencies (first run only)..."
  npm install
fi
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✨ PotionPulse is live!"
echo "   - Web Dashboard: http://localhost:3000"
echo "   - FastAPI Swagger: http://localhost:8000/docs"
echo "   - To build Android APK: npm run build && npx cap sync android"
echo ""
echo "Press [CTRL+C] to stop all servers."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true; exit" INT TERM
wait

