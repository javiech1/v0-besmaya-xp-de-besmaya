// PM2 config - para mantener el bot corriendo en la VM
module.exports = {
  apps: [
    {
      name: "nadie-bot",
      script: "dist/index.js",
      cwd: "/home/nadie-bot/twitter-bot",
      env: {
        NODE_ENV: "production",
      },
      // Restart si crashea
      autorestart: true,
      // Max restarts en 15 min
      max_restarts: 10,
      min_uptime: "30s",
      // Logs
      log_file: "/home/nadie-bot/logs/bot.log",
      error_file: "/home/nadie-bot/logs/error.log",
      out_file: "/home/nadie-bot/logs/out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      // Merge stdout y stderr
      merge_logs: true,
      // Restart diario a las 4am para limpiar memoria
      cron_restart: "0 4 * * *",
    },
  ],
}
