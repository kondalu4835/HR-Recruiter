#!/bin/bash
echo "=== AI-Powered HRMS - Backend Setup ==="

cd "$(dirname "$0")/backend"

# Create venv if not exists
if [ ! -d "venv" ]; then
  echo "Creating virtual environment..."
  python3 -m venv venv
fi

# Activate
source venv/bin/activate

# Install deps
echo "Installing dependencies..."
pip install -r requirements.txt -q

# Copy .env if missing
if [ ! -f ".env" ]; then
  cp .env.example .env
  echo ""
  echo "⚠️  .env file created. Please set your ANTHROPIC_API_KEY in backend/.env"
  echo ""
fi

echo "Starting backend on http://localhost:8000"
echo "Swagger docs: http://localhost:8000/docs"
echo ""
uvicorn main:app --reload --port 8000
