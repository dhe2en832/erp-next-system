module.exports = {
  apps: [{
    name: 'nextjs',
    script: 'node_modules/.bin/next',
    args: 'start',
    cwd: '/home/limina/erp-next-system',
    env: {
      NODE_ENV: 'production',
      NEXT_PUBLIC_APP_ENV: 'production',
      // Default site: Demo Batasku
      ERPNEXT_API_URL: 'https://demo.batasku.cloud',
      ERP_API_KEY: '4618e5708dd3d06',
      ERP_API_SECRET: '8984b4011e4a654',
      // Multi-Site Configuration
      SITE_DEMO_BATASKU_CLOUD_API_URL: 'https://demo.batasku.cloud',
      SITE_DEMO_BATASKU_CLOUD_API_KEY: '4618e5708dd3d06',
      SITE_DEMO_BATASKU_CLOUD_API_SECRET: '8984b4011e4a654',
      SITE_BAC_BATASKU_CLOUD_API_URL: 'https://bac.batasku.cloud',
      SITE_BAC_BATASKU_CLOUD_API_KEY: '4618e5708dd3d06',
      SITE_BAC_BATASKU_CLOUD_API_SECRET: '8102adc0e87bb27',
      SITE_CIREBON_BATASKU_CLOUD_API_URL: 'https://cirebon.batasku.cloud',
      SITE_CIREBON_BATASKU_CLOUD_API_KEY: '4618e5708dd3d06',
      SITE_CIREBON_BATASKU_CLOUD_API_SECRET: 'c0541b43bb18814',
      SITE_CVCIREBON_BATASKU_CLOUD_API_URL: 'https://cvcirebon.batasku.cloud',
      SITE_CVCIREBON_BATASKU_CLOUD_API_KEY: '4618e5708dd3d06',
      SITE_CVCIREBON_BATASKU_CLOUD_API_SECRET: '05e5f192e2d458d'
    },
    instances: 1,
    exec_mode: 'fork'
  }]
}
