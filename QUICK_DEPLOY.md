# 快速部署指南

## 🚀 一键部署（推荐）

### Linux 服务器部署

1. **上传代码到服务器**
   ```bash
   # 方式1: 使用 Git
   git clone <your-repo-url> standxDexScript
   cd standxDexScript
   
   # 方式2: 使用 SCP（在本地执行）
   scp -r ./standxDexScript user@server-ip:/opt/
   ```

2. **运行部署脚本**
   ```bash
   cd standxDexScript
   chmod +x deploy.sh
   bash deploy.sh
   ```

3. **完成！** 脚本会自动：
   - ✅ 检查 Node.js 环境
   - ✅ 安装 PM2（如果未安装）
   - ✅ 安装项目依赖
   - ✅ 创建 .env 文件（如果不存在）
   - ✅ 创建日志目录
   - ✅ 启动应用
   - ✅ 配置开机自启（可选）

## 📋 手动部署步骤

如果不想使用脚本，可以手动执行以下步骤：

```bash
# 1. 安装 Node.js（如果未安装）
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. 安装 PM2
sudo npm install -g pm2

# 3. 安装项目依赖
npm install --production

# 4. 创建 .env 文件（如果不存在）
nano .env
# 填入配置信息，保存退出

# 5. 创建日志目录
mkdir -p logs

# 6. 启动应用
pm2 start ecosystem.config.js

# 7. 设置开机自启
pm2 startup
pm2 save
```

## 🔍 验证部署

```bash
# 查看应用状态
pm2 status

# 查看实时日志
pm2 logs standx-dex-script

# 查看详细信息
pm2 info standx-dex-script
```

## 📝 更新代码

```bash
# 停止应用
pm2 stop standx-dex-script

# 更新代码（Git 方式）
git pull origin main

# 或手动上传新文件

# 安装新依赖（如果有）
npm install --production

# 重启应用
pm2 restart standx-dex-script
```

## ⚠️ 注意事项

1. **.env 文件安全**
   - 确保 `.env` 文件权限设置为 600：`chmod 600 .env`
   - 不要将 `.env` 文件提交到 Git

2. **首次运行**
   - 程序首次运行时会自动生成钱包和密钥
   - Token 会自动获取并定期刷新

3. **网络要求**
   - 确保服务器可以访问 StandX API
   - 检查防火墙设置

4. **资源监控**
   - 定期检查日志：`pm2 logs standx-dex-script`
   - 监控内存使用：`pm2 monit`

## 🆘 遇到问题？

查看详细部署文档：[DEPLOY.md](./DEPLOY.md)

查看应用日志：
```bash
pm2 logs standx-dex-script --err
```


