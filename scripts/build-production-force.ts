import { execSync } from 'child_process';
import * as readline from 'readline';

async function confirmProduction(): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('⚠️  You are building for PRODUCTION (FORCE MODE - skips ESLint). Continue? (yes/no): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes');
    });
  });
}

async function main() {
  console.log('🚀 Starting FORCE production build (ESLint disabled)...\n');

  // Confirmation prompt
  const confirmed = await confirmProduction();
  if (!confirmed) {
    console.log('❌ Production build cancelled');
    process.exit(0);
  }

  try {
    // Validate environment
    console.log('\nStep 1: Validating environment variables');
    execSync('tsx scripts/validate-env.ts', { stdio: 'inherit' });
    
    // Type check only (skip ESLint entirely)
    console.log('\nStep 2: Running TypeScript type check');
    execSync('tsc --noEmit', { stdio: 'inherit' });
    
    console.log('\nStep 3: Skipping ESLint (FORCE MODE)');
    console.log('⚠️  ESLint checks disabled for this build');
    
    // Backup current build
    console.log('\nStep 4: Backing up previous build');
    try {
      execSync('rm -rf .next.backup && cp -r .next .next.backup', { stdio: 'inherit' });
      console.log('✅ Previous build backed up to .next.backup');
    } catch {
      console.log('ℹ️  No previous build to backup');
    }
    
    // Run Next.js build with ESLint completely disabled
    console.log('\nStep 5: Building Next.js application (ESLint disabled)');
    execSync('next build', { 
      stdio: 'inherit',
      env: { 
        ...process.env, 
        ESLINT_NO_DEV_ERRORS: 'true',
        DISABLE_ESLINT_PLUGIN: 'true',
        NODE_ENV: 'production'
      }
    });
    
    console.log('\n✅ FORCE production build completed successfully!');
    console.log('📦 Build output: .next/');
    console.log('💾 Backup: .next.backup/');
    console.log('🚀 Deploy with: pnpm start:production');
    console.log('⚠️  Note: ESLint was disabled for this build');
  } catch (error) {
    console.error('\n❌ Production build failed');
    console.error('💾 Previous build preserved in .next.backup (if exists)');
    console.error('Error:', error);
    process.exit(1);
  }
}

main();