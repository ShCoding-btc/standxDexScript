#!/bin/bash

# StandX DEX Script 部署脚本
# 使用方法: bash deploy.sh

set -e  # 遇到错误立即退出

echo "=========================================="
echo "StandX DEX Script 部署脚本"
echo "=========================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查 Node.js 是否安装
check_node() {
    if ! command -v node &> /dev/null; then
        echo -e "${RED}错误: 未检测到 Node.js，请先安装 Node.js v16+${NC}"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 16 ]; then
        echo -e "${RED}错误: Node.js 版本过低，需要 v16 或更高版本${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Node.js 版本: $(node -v)${NC}"
}

# 检查 PM2 是否安装
check_pm2() {
    if ! command -v pm2 &> /dev/null; then
        echo -e "${YELLOW}警告: 未检测到 PM2，正在安装...${NC}"
        npm install -g pm2
    fi
    echo -e "${GREEN}✓ PM2 已安装: $(pm2 -v)${NC}"
}

# 安装依赖
install_dependencies() {
    echo ""
    echo "正在安装项目依赖..."
    npm install --production
    echo -e "${GREEN}✓ 依赖安装完成${NC}"
}

# 检查 .env 文件
check_env() {
    if [ ! -f .env ]; then
        echo -e "${YELLOW}警告: 未找到 .env 文件${NC}"
        echo "正在创建 .env 文件模板..."
        cat > .env << EOF
# 钱包配置（如果不存在会自动生成）
WALLET_ADDRESS=
PRIVATE_KEY=

# Ed25519 密钥对（程序会自动生成）
PRIVATE_KEY_ED25519=
PUBLIC_KEY_ED25519=
REQUEST_ID=

# Token（程序会自动获取并更新）
TOKEN=
EOF
        echo -e "${YELLOW}请编辑 .env 文件并填入必要的配置信息${NC}"
        echo "按 Enter 继续，或 Ctrl+C 退出..."
        read
    else
        echo -e "${GREEN}✓ .env 文件已存在${NC}"
    fi
    
    # 设置 .env 文件权限
    chmod 600 .env
}

# 创建日志目录
create_logs_dir() {
    if [ ! -d logs ]; then
        mkdir -p logs
        echo -e "${GREEN}✓ 日志目录已创建${NC}"
    else
        echo -e "${GREEN}✓ 日志目录已存在${NC}"
    fi
}

# 启动应用
start_app() {
    echo ""
    echo "正在启动应用..."
    
    # 检查是否已经运行
    if pm2 list | grep -q "standx-dex-script"; then
        echo -e "${YELLOW}应用已在运行，正在重启...${NC}"
        pm2 restart ecosystem.config.js
    else
        pm2 start ecosystem.config.js
    fi
    
    echo -e "${GREEN}✓ 应用已启动${NC}"
}

# 设置 PM2 开机自启
setup_pm2_startup() {
    echo ""
    read -p "是否设置 PM2 开机自启? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        pm2 startup
        pm2 save
        echo -e "${GREEN}✓ PM2 开机自启已配置${NC}"
    fi
}

# 显示状态信息
show_status() {
    echo ""
    echo "=========================================="
    echo "部署完成！"
    echo "=========================================="
    echo ""
    echo "常用命令："
    echo "  查看状态:  pm2 status"
    echo "  查看日志:  pm2 logs standx-dex-script"
    echo "  重启应用:  pm2 restart standx-dex-script"
    echo "  停止应用:  pm2 stop standx-dex-script"
    echo "  监控面板:  pm2 monit"
    echo ""
    echo "当前状态："
    pm2 status
}

# 主流程
main() {
    check_node
    check_pm2
    install_dependencies
    check_env
    create_logs_dir
    start_app
    setup_pm2_startup
    show_status
}

# 运行主流程
main


