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
        CORS_ORIGIN: 'http://localhost:3030',
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
    {
      name: 'perc-calc-frontend',
      cwd: path.join(root, 'frontend'),
      // Serve the production build via a tiny zero-dep Node server (serve.js).
      // Avoids the Windows `cmd /c npm start` issue that opened a console window
      // and died when that window was closed. Run `npm run build` after frontend
      // changes, then `pm2 restart perc-calc-frontend`.
      script: 'serve.js',
      interpreter: 'node',
      exec_mode: 'fork',
      watch: false,
      instances: 1,
      autorestart: true,
      env: {
        PORT: '3030',
        NODE_ENV: 'production',
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
