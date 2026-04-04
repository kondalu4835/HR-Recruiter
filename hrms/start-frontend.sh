#!/bin/bash
echo "=== AI-Powered HRMS - Frontend Setup ==="

cd "$(dirname "$0")/frontend"

if [ ! -d "node_modules" ]; then
  echo "Installing npm dependencies..."
  npm install
fi

echo "Starting frontend on http://localhost:3000"
npm run dev
