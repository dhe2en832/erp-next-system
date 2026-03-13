import { config } from 'dotenv';
import { validateEnv, getAppEnvironment } from '../lib/env-validation';

// Load environment variables based on NODE_ENV or from .env.local as fallback
// When called via build scripts (build:production, build:staging), 
// dotenv-cli already loads the correct .env file, so we don't override it
// Only load .env.local if no environment is already set
if (!process.env.ERPNEXT_API_URL) {
  config({ path: '.env.local' });
}

try {
  console.log('🔍 Validating environment variables...');
  const env = validateEnv();
  const appEnv = getAppEnvironment();
  
  console.log(`✅ Environment validation passed`);
  console.log(`📦 Building for: ${appEnv}`);
  console.log(`🔗 Backend URL: ${env.ERPNEXT_API_URL}`);
  
  // Prevent production from connecting to staging
  if (appEnv === 'production' && env.ERPNEXT_API_URL.includes('staging')) {
    throw new Error('Production build cannot use staging backend URL');
  }
  
  // Prevent staging from connecting to production
  if (appEnv === 'staging' && !env.ERPNEXT_API_URL.includes('staging') && !env.ERPNEXT_API_URL.includes('localhost')) {
    console.warn('⚠️  Warning: Staging build may be using production backend URL');
  }
  
  process.exit(0);
} catch (error) {
  console.error('❌ Environment validation failed:');
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error('Unknown error:', error);
  }
  process.exit(1);
}