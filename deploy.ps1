# I-NEX Web - Deploy to VPS via GitHub (PowerShell)
# Usage: .\deploy.ps1

$ErrorActionPreference = "Stop"

Write-Host "📥 Pulling latest code from GitHub on server..." -ForegroundColor Cyan
ssh stibe "cd /var/www/inex-repo/I-NEX && git pull origin main"

Write-Host "📦 Installing dependencies on server..." -ForegroundColor Cyan
ssh stibe "cd /var/www/inex-repo/I-NEX && npm install"

Write-Host "🔨 Building Vite project on server..." -ForegroundColor Cyan
ssh stibe "cd /var/www/inex-repo/I-NEX && npm run build"

Write-Host "🔄 Restarting PM2 backend app..." -ForegroundColor Cyan
ssh stibe "cd /var/www/inex-repo/I-NEX/backend && npm install && pm2 restart i-nex-backend --update-env"

Write-Host "🌐 Reloading Nginx..." -ForegroundColor Cyan
ssh stibe "sudo systemctl reload nginx"

Write-Host "✅ Deployment completed successfully!" -ForegroundColor Green
