#!/usr/bin/env python3
"""
GitHub Pages 部署脚本
使用 git subtree 方法强制部署
"""

import subprocess
import sys

def run_command(cmd, description=""):
    """执行 shell 命令"""
    print(f"执行: {description or cmd}")
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"错误: {result.stderr}")
        return False
    print(f"成功: {result.stdout}")
    return True

def main():
    print("开始部署到 GitHub Pages...")
    
    # 1. 添加 dist 目录到暂存区
    print("\n添加 dist 目录...")
    if not run_command('git add -f dist', "添加 dist 目录"):
        return False
    
    # 2. 提交
    print("\n提交 dist 目录...")
    if not run_command('git commit -m "Add dist for deployment"', "提交"):
        return False
    
    # 3. 创建 subtree 并强制推送到 gh-pages
    print("\n创建 subtree 并强制推送...")
    # 第一步：获取 subtree split 的 commit hash
    cmd1 = 'git subtree split --prefix dist test'
    result1 = subprocess.run(cmd1, shell=True, capture_output=True, text=True)
    if result1.returncode != 0:
        print(f"错误: {result1.stderr}")
        return False
    commit_hash = result1.stdout.strip()
    print(f"获取到 commit hash: {commit_hash}")
    
    # 第二步：强制推送
    cmd2 = f'git push origin {commit_hash}:gh-pages --force'
    if not run_command(cmd2, "强制推送到 gh-pages 分支"):
        return False
    
    print("\n✅ 部署成功！")
    print("访问 https://ruohan999.github.io/goodluck/ 查看您的网站")
    
    return True

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)