import { execSync } from 'child_process';

console.log('🚀 Starting staging build...\n');

try {
  // Validate environment
  console.log('Step 1: Validating environment variables');
  execSync('tsx scripts/validate-env.ts', { stdio: 'inherit' });
  
  // Run Next.js build
  console.log('\nStep 2: Building Next.js application');
  execSync('next build', { stdio: 'inherit' });
  
  console.log('\n✅ Staging build completed successfully!');
  console.log('📦 Build output: .next/');
  console.log('🚀 Deploy with: pnpm start');
} catch {
  console.error('\n❌ Staging build failed');
  process.exit(1);
}