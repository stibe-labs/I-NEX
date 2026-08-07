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

echo "🔄 Restarting or Starting PM2 frontend app..."
# We use pm2 serve to host the static 'dist' folder and act as a Single Page Application (--spa)
ssh "$SERVER" "cd $REMOTE_APP && (pm2 restart $PM2_APP_NAME --update-env || pm2 serve dist $PORT --name \"$PM2_APP_NAME\" --spa)"

echo "🔄 Restarting or Starting PM2 backend app..."
ssh "$SERVER" "cd $REMOTE_APP/backend && npm install && (pm2 restart i-nex-backend --update-env || pm2 start server.js --name \"i-nex-backend\")"

echo "✅ Deployed! The app is running on Port $PORT and backend on 3099."
