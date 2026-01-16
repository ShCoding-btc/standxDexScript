# 服务器部署指南

本文档介绍如何将 StandX DEX 交易脚本部署到服务器上。

## 📋 部署前准备

### 1. 服务器要求

- **操作系统**: Linux (推荐 Ubuntu 20.04+ 或 CentOS 7+)
- **Node.js**: v16 或更高版本
- **内存**: 至少 512MB RAM
- **网络**: 稳定的网络连接（需要连接 StandX API）

### 2. 本地准备

确保以下文件已准备好：
- ✅ 项目代码（已推送到 Git 仓库或打包）
- ✅ `.env` 文件（包含敏感配置信息，**不要提交到 Git**）
- ✅ `config.js` 已按需求配置

## 🚀 部署步骤

### 方法一：使用 PM2 部署（推荐）

PM2 是一个强大的 Node.js 进程管理器，支持自动重启、日志管理、监控等功能。

#### 步骤 1: 连接服务器

```bash
ssh user@your-server-ip
```

#### 步骤 2: 安装 Node.js（如果未安装）

**Ubuntu/Debian:**
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**CentOS/RHEL:**
```bash
curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
sudo yum install -y nodejs
```

验证安装：
```bash
node --version
npm --version
```

#### 步骤 3: 安装 PM2

```bash
sudo npm install -g pm2
```

#### 步骤 4: 上传项目代码

**方式 A: 使用 Git（推荐）**

```bash
# 在服务器上克隆项目
cd /opt  # 或其他目录
git clone <your-repo-url> standxDexScript
cd standxDexScript
```

**方式 B: 使用 SCP**

```bash
# 在本地执行
scp -r ./standxDexScript user@your-server-ip:/opt/
```

**方式 C: 使用压缩包**

```bash
# 在本地打包
tar -czf standxDexScript.tar.gz standxDexScript/

# 上传到服务器
scp standxDexScript.tar.gz user@your-server-ip:/opt/

# 在服务器上解压
cd /opt
tar -xzf standxDexScript.tar.gz
cd standxDexScript
```

#### 步骤 5: 安装项目依赖

```bash
cd /opt/standxDexScript  # 或你的项目路径
npm install --production
```

#### 步骤 6: 配置环境变量

创建 `.env` 文件：

```bash
nano .env
```

添加以下内容（根据实际情况修改）：

```env
# 钱包配置
WALLET_ADDRESS=你的钱包地址
PRIVATE_KEY=你的私钥

# Ed25519 密钥对（程序会自动生成，首次运行后会自动填充）
PRIVATE_KEY_ED25519=
PUBLIC_KEY_ED25519=
REQUEST_ID=

# Token（程序会自动获取并更新）
TOKEN=
```

保存并退出（`Ctrl+X`，然后 `Y`，然后 `Enter`）

**重要**: 确保 `.env` 文件权限安全：
```bash
chmod 600 .env
```

#### 步骤 7: 创建日志目录

```bash
mkdir -p logs
```

#### 步骤 8: 使用 PM2 启动应用

```bash
# 使用配置文件启动
pm2 start ecosystem.config.js

# 或者直接启动
pm2 start index.js --name standx-dex-script
```

#### 步骤 9: 设置 PM2 开机自启

```bash
# 生成启动脚本
pm2 startup

# 保存当前进程列表
pm2 save
```

#### 步骤 10: 查看运行状态

```bash
# 查看进程状态
pm2 status

# 查看实时日志
pm2 logs standx-dex-script

# 查看详细信息
pm2 info standx-dex-script

# 监控面板
pm2 monit
```

### 方法二：使用 systemd 部署

如果你不想使用 PM2，可以使用 systemd 来管理服务。

#### 步骤 1-6: 同 PM2 方法

#### 步骤 7: 创建 systemd 服务文件

```bash
sudo nano /etc/systemd/system/standx-dex.service
```

添加以下内容（根据实际情况修改路径）：

```ini
[Unit]
Description=StandX DEX Trading Script
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/opt/standxDexScript
Environment="NODE_ENV=production"
ExecStart=/usr/bin/node /opt/standxDexScript/index.js
Restart=always
RestartSec=10
StandardOutput=append:/opt/standxDexScript/logs/app.log
StandardError=append:/opt/standxDexScript/logs/error.log

[Install]
WantedBy=multi-user.target
```

保存并退出。

#### 步骤 8: 启动服务

```bash
# 重新加载 systemd
sudo systemctl daemon-reload

# 启动服务
sudo systemctl start standx-dex

# 设置开机自启
sudo systemctl enable standx-dex

# 查看状态
sudo systemctl status standx-dex

# 查看日志
sudo journalctl -u standx-dex -f
```

### 方法三：使用 Docker 部署（可选）

如果你熟悉 Docker，可以使用容器化部署。

#### 步骤 1: 创建 Dockerfile

在项目根目录创建 `Dockerfile`：

```dockerfile
FROM node:18-alpine

WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制项目文件
COPY . .

# 创建日志目录
RUN mkdir -p logs

# 暴露端口（如果需要）
# EXPOSE 3000

# 启动应用
CMD ["node", "index.js"]
```

#### 步骤 2: 创建 .dockerignore

```
node_modules
npm-debug.log
.env
.git
.gitignore
logs
*.log
```

#### 步骤 3: 构建和运行

```bash
# 构建镜像
docker build -t standx-dex-script .

# 运行容器（需要挂载 .env 文件）
docker run -d \
  --name standx-dex \
  --restart unless-stopped \
  -v $(pwd)/.env:/app/.env \
  -v $(pwd)/logs:/app/logs \
  standx-dex-script

# 查看日志
docker logs -f standx-dex
```

## 🔧 常用管理命令

### PM2 命令

```bash
# 启动应用
pm2 start ecosystem.config.js

# 停止应用
pm2 stop standx-dex-script

# 重启应用
pm2 restart standx-dex-script

# 删除应用
pm2 delete standx-dex-script

# 查看日志
pm2 logs standx-dex-script

# 清空日志
pm2 flush

# 查看监控
pm2 monit

# 保存当前进程列表
pm2 save
```

### systemd 命令

```bash
# 启动服务
sudo systemctl start standx-dex

# 停止服务
sudo systemctl stop standx-dex

# 重启服务
sudo systemctl restart standx-dex

# 查看状态
sudo systemctl status standx-dex

# 查看日志
sudo journalctl -u standx-dex -f

# 禁用开机自启
sudo systemctl disable standx-dex
```

## 📝 更新部署

当需要更新代码时：

### 使用 Git

```bash
cd /opt/standxDexScript
git pull origin main
npm install --production
pm2 restart standx-dex-script
```

### 手动更新

```bash
# 停止应用
pm2 stop standx-dex-script

# 备份当前版本（可选）
cp -r /opt/standxDexScript /opt/standxDexScript.backup

# 上传新代码并替换

# 安装依赖
npm install --production

# 启动应用
pm2 start standx-dex-script
```

## 🔍 故障排查

### 1. 应用无法启动

- 检查 Node.js 版本：`node --version`
- 检查依赖是否安装：`npm list`
- 查看错误日志：`pm2 logs standx-dex-script --err`
- 检查 `.env` 文件是否存在且格式正确

### 2. 应用频繁重启

- 查看日志找出错误原因：`pm2 logs standx-dex-script`
- 检查内存使用：`pm2 monit`
- 检查网络连接
- 检查 Token 是否有效

### 3. 无法连接 WebSocket

- 检查防火墙设置
- 检查服务器网络连接
- 查看应用日志中的连接错误信息

### 4. 权限问题

- 确保 `.env` 文件权限：`chmod 600 .env`
- 确保日志目录可写：`chmod 755 logs`

## 🔒 安全建议

1. **保护敏感信息**
   - `.env` 文件不要提交到 Git
   - 设置 `.env` 文件权限为 600
   - 定期更换密钥和 Token

2. **防火墙配置**
   - 只开放必要的端口
   - 使用 SSH 密钥认证而非密码

3. **定期备份**
   - 备份 `.env` 文件（加密存储）
   - 备份配置文件 `config.js`
   - 定期备份日志文件

4. **监控和告警**
   - 设置 PM2 监控或使用外部监控服务
   - 配置日志轮转避免磁盘空间不足

## 📊 监控建议

### PM2 监控

```bash
# 实时监控
pm2 monit

# 查看详细信息
pm2 show standx-dex-script
```

### 日志管理

建议配置日志轮转，避免日志文件过大：

```bash
# 安装 pm2-logrotate
pm2 install pm2-logrotate

# 配置日志轮转
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

## 📞 获取帮助

如果遇到问题，请检查：
1. 应用日志：`pm2 logs standx-dex-script`
2. 系统日志：`journalctl -xe`
3. README.md 中的故障排除部分

---

**注意**: 部署到生产环境前，请确保充分测试，并了解交易风险。


