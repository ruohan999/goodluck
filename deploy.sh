#!/bin/bash
# 一键部署到 GitHub Pages
# 使用方法：bash deploy.sh

set -e

echo "=== 开始部署到 GitHub Pages ==="

# 1. 构建项目
echo "1. 构建项目..."
npm run build

# 2. 创建临时部署目录
echo "2. 创建临时部署目录..."
rm -rf temp-deploy
mkdir temp-deploy
cp -r dist/* temp-deploy/

# 3. 创建 .nojekyll 文件（禁用 GitHub Pages 的 Jekyll 处理）
echo "3. 创建 .nojekyll 文件..."
touch temp-deploy/.nojekyll

# 4. 进入临时目录并初始化 Git
echo "4. 初始化 Git 并推送..."
cd temp-deploy
git init
git remote add origin git@github.com:ruohan999/goodluck.git
git add .
git commit -m "Deploy: $(date '+%Y-%m-%d %H:%M:%S')"
git push -f origin master:gh-pages

# 5. 清理
echo "5. 清理临时目录..."
cd ..
rm -rf temp-deploy

echo "=== 部署完成！==="
echo "访问地址：https://ruohan999.github.io/goodluck/#/home"