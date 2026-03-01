import { execSync } from 'child_process';
import { existsSync } from 'fs';

console.log('🔄 Rolling back to previous production build...\n');

if (!existsSync('.next.backup')) {
  console.error('❌ No backup found. Cannot rollback.');
  console.error('ℹ️  Backup is created automatically during production builds.');
  process.exit(1);
}

try {
  console.log('Step 1: Removing current build');
  execSync('rm -rf .next', { stdio: 'inherit' });
  
  console.log('Step 2: Restoring backup');
  execSync('mv .next.backup .next', { stdio: 'inherit' });
  
  console.log('\n✅ Rollback completed successfully!');
  console.log('🚀 Restart with: pnpm start');
} catch {
  console.error('\n❌ Rollback failed');
  process.exit(1);
}