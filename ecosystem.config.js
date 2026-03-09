module.exports = {
  apps: [{
    name: 'nextjs',
    script: 'node_modules/.bin/next',
    args: 'start',
    cwd: '/home/limina/erp-next-system',
    env_file: '/home/limina/erp-next-system/.env.production',
    env: {
      NODE_ENV: 'production',
      NEXT_PUBLIC_APP_ENV: 'production'
    },
    instances: 1,
    exec_mode: 'fork',
    restart_delay: 4000,
    max_memory_restart: '1G'
  }]
}
