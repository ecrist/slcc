module.exports = {
  apps: [
    {
      name: "swan-lake",
      script: "node_modules/.bin/next",
      args: "start",
      cwd: "/var/www/swan-lake",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      // Log rotation handled by pm2-logrotate module
      error_file: "/var/log/pm2/swan-lake-error.log",
      out_file: "/var/log/pm2/swan-lake-out.log",
      merge_logs: true,
      time: true,
    },
  ],
};
