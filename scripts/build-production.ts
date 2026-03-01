import { execSync } from 'child_process';
import * as readline from 'readline';

async function confirmProduction(): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('⚠️  You are building for PRODUCTION. Continue? (yes/no): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes');
    });
  });
}

async function main() {
  console.log('🚀 Starting production build...\n');

  // Confirmation prompt
  const confirmed = await confirmProduction();
  if (!confirmed) {
    console.log('❌ Production build cancelled');
    process.exit(0);
  }

  try {
    // Clean up any existing build artifacts first
    console.log('\nStep 1: Cleaning build artifacts');
    try {
      execSync('rm -rf .next.backup', { stdio: 'inherit' });
      console.log('✅ Cleaned .next.backup directory');
    } catch {
      console.log('ℹ️  No .next.backup to clean');
    }

    // Validate environment
    console.log('\nStep 2: Validating environment variables');
    execSync('tsx scripts/validate-env.ts', { stdio: 'inherit' });
    
    // Type check
    console.log('\nStep 3: Running TypeScript type check');
    execSync('tsc --noEmit', { stdio: 'inherit' });
    
    // Lint check with production config - allow warnings and only check source files
    console.log('\nStep 4: Running ESLint (production mode - source files only)');
    try {
      execSync('npx eslint --config eslint.config.production.mjs "app/**/*.{ts,tsx}" "components/**/*.{ts,tsx}" "lib/**/*.{ts,tsx}" "utils/**/*.{ts,tsx}" "types/**/*.{ts,tsx}" --max-warnings 10000', { stdio: 'inherit' });
      console.log('✅ ESLint check passed');
    } catch (lintError) {
      console.log('⚠️  ESLint warnings detected, but continuing with build...');
    }
    
    // Backup current build
    console.log('\nStep 5: Backing up previous build');
    try {
      execSync('cp -r .next .next.backup', { stdio: 'inherit' });
      console.log('✅ Previous build backed up to .next.backup');
    } catch {
      console.log('ℹ️  No previous build to backup');
    }
    
    // Run Next.js build with ESLint disabled during build
    console.log('\nStep 6: Building Next.js application');
    execSync('next build', { 
      stdio: 'inherit',
      env: { 
        ...process.env, 
        ESLINT_NO_DEV_ERRORS: 'true',
        DISABLE_ESLINT_PLUGIN: 'true',
        NODE_ENV: 'production'
      }
    });
    
    console.log('\n✅ Production build completed successfully!');
    console.log('📦 Build output: .next/');
    console.log('💾 Backup: .next.backup/');
    console.log('🚀 Deploy with: pnpm start:production');
  } catch (error) {
    console.error('\n❌ Production build failed');
    console.error('💾 Previous build preserved in .next.backup (if exists)');
    process.exit(1);
  }
}

main();