#!/bin/bash
# I-NEX Web - Deploy to VPS via GitHub
# Usage: ./deploy.sh

set -e

SERVER="stibe"
REMOTE_REPO="/var/www/inex-repo"
REMOTE_APP="$REMOTE_REPO/I-NEX"
PORT=3050
PM2_APP_NAME="i-nex-website"

echo "📥 Pulling latest code from GitHub..."
ssh "$SERVER" "cd $REMOTE_APP && git pull origin main"

echo "📦 Installing dependencies on server..."
ssh "$SERVER" "cd $REMOTE_APP && npm install"

echo "🔨 Building Vite project on server..."
ssh "$SERVER" "cd $REMOTE_APP && npm run build"

echo "✅ Frontend is built! Nginx will serve it directly."
# ssh "$SERVER" "cd $REMOTE_APP && (pm2 delete $PM2_APP_NAME || true)"

echo "🔄 Restarting or Starting PM2 backend app..."
ssh "$SERVER" "cd $REMOTE_APP/backend && npm install && (pm2 restart i-nex-backend --update-env || pm2 start server.js --name \"i-nex-backend\")"

echo "✅ Deployed! The app is running on Port $PORT and backend on 3099."
