# 一键部署到 GitHub Pages（PowerShell 版本）
# 使用方法：powershell -ExecutionPolicy Bypass -File deploy.ps1

Write-Host "=== 开始部署到 GitHub Pages ===" -ForegroundColor Green

# 1. 构建项目
Write-Host "1. 构建项目..." -ForegroundColor Cyan
npm run build

# 2. 创建临时部署目录
Write-Host "2. 创建临时部署目录..." -ForegroundColor Cyan
Remove-Item -Recurse -Force temp-deploy -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path temp-deploy -Force | Out-Null
Copy-Item -Path dist\* -Destination temp-deploy\ -Recurse -Force

# 3. 创建 .nojekyll 文件（禁用 GitHub Pages 的 Jekyll 处理）
Write-Host "3. 创建 .nojekyll 文件..." -ForegroundColor Cyan
New-Item -Path temp-deploy\.nojekyll -ItemType File -Force | Out-Null

# 4. 进入临时目录并初始化 Git
Write-Host "4. 初始化 Git 并推送..." -ForegroundColor Cyan
Set-Location temp-deploy
git init
git remote add origin git@github.com:ruohan999/goodluck.git
git add .
git commit -m "Deploy: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
git push -f origin master:gh-pages

# 5. 清理
Write-Host "5. 清理临时目录..." -ForegroundColor Cyan
Set-Location ..
Remove-Item -Recurse -Force temp-deploy

Write-Host "=== 部署完成！===" -ForegroundColor Green
Write-Host "访问地址：https://ruohan999.github.io/goodluck/#/home" -ForegroundColor Yellow