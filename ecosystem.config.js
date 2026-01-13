// PM2 进程管理配置文件
// 使用方式: pm2 start ecosystem.config.js

module.exports = {
  apps: [
    {
      name: 'standx-dex-script',
      script: 'index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production'
      },
      // 日志配置
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // 自动重启配置
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      // 其他配置
      kill_timeout: 5000,
      listen_timeout: 3000,
      shutdown_with_message: true
    }
  ]
};


