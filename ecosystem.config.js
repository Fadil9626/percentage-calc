const path = require('path');
const root = __dirname;

module.exports = {
  apps: [
    {
      name: 'perc-calc-backend',
      cwd: path.join(root, 'backend'),
      script: 'src/index.js',
      exec_mode: 'fork',
      interpreter: 'node',
      watch: false,
      instances: 1,
      autorestart: true,
      env: {
        NODE_ENV: 'development',
        PORT: '5010',
        DB_HOST: 'localhost',
        DB_PORT: '5440',
        DB_USER: 'rbac_user',
        DB_PASSWORD: 'rbac_password',
        DB_NAME: 'percentage_calc',
        JWT_SECRET: 'your-secret-key-change-in-production',
        CORS_ORIGIN: 'http://localhost:3030',
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
    {
      name: 'perc-calc-frontend',
      cwd: path.join(root, 'frontend'),
      script: 'cmd',
      args: '/c npm start',
      exec_mode: 'fork',
      watch: false,
      instances: 1,
      autorestart: false,
      env: {
        PORT: '3030',
        BROWSER: 'none',
        CI: 'false',
        NODE_ENV: 'development',
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
