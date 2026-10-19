module.exports = {
  apps: [
    {
      name: 'vama-whatsapp-sidecar',
      script: 'server.js',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        WHATSAPP_SIDECAR_PORT: 3001,
        WHATSAPP_SIDECAR_HOST: '127.0.0.1'
      }
    }
  ]
};
