module.exports = {
  apps: [{
    name: 'nextjs',
    script: 'node_modules/.bin/next',
    args: 'start',
    cwd: '/home/limina/erp-next-system',
    env: {
      NODE_ENV: 'production',
      NEXT_PUBLIC_APP_ENV: 'production',
      // Default site
      ERPNEXT_API_URL: 'https://your-site.example.com',
      ERP_API_KEY: 'your-api-key',
      ERP_API_SECRET: 'your-api-secret',
      // Multi-Site Configuration
      SITE_DEMO_BATASKU_CLOUD_API_URL: 'https://demo.batasku.cloud',
      SITE_DEMO_BATASKU_CLOUD_API_KEY: 'your-api-key',
      SITE_DEMO_BATASKU_CLOUD_API_SECRET: 'your-api-secret',
      SITE_BAC_BATASKU_CLOUD_API_URL: 'https://bac.batasku.cloud',
      SITE_BAC_BATASKU_CLOUD_API_KEY: 'your-api-key',
      SITE_BAC_BATASKU_CLOUD_API_SECRET: 'your-api-secret',
      SITE_CIREBON_BATASKU_CLOUD_API_URL: 'https://cirebon.batasku.cloud',
      SITE_CIREBON_BATASKU_CLOUD_API_KEY: 'your-api-key',
      SITE_CIREBON_BATASKU_CLOUD_API_SECRET: 'your-api-secret',
      SITE_CVCIREBON_BATASKU_CLOUD_API_URL: 'https://cvcirebon.batasku.cloud',
      SITE_CVCIREBON_BATASKU_CLOUD_API_KEY: 'your-api-key',
      SITE_CVCIREBON_BATASKU_CLOUD_API_SECRET: 'your-api-secret'
    },
    instances: 1,
    exec_mode: 'fork'
  }]
}
