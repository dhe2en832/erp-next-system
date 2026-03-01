# Design Document: Staging and Production Deployment

## Overview

This design establishes a robust deployment system for the Next.js ERP application with separate staging and production environments. The system provides environment-specific configuration management, automated build processes, and safety mechanisms to ensure reliable deployments while preventing configuration errors and production incidents.

The deployment system leverages Next.js built-in environment variable handling, pnpm scripts for automation, and validation utilities to create a developer-friendly workflow that minimizes manual configuration and reduces deployment risks.

## Architecture

### Environment Structure

The deployment architecture consists of three distinct environments:

1. **Development Environment**: Local development with hot-reload, running on `localhost:3000`
2. **Staging Environment**: Pre-production testing environment with staging ERPNext backend
3. **Production Environment**: Live environment serving end users with production ERPNext backend

### Configuration Flow

```
.env.staging → Build Process → Staging Build → Staging Server
.env.production → Build Process → Production Build → Production Server
.env.local → Development Server (not committed)
```

### Environment Variable Hierarchy

Next.js loads environment variables in the following priority order:
1. `.env.production.local` (production only, not committed)
2. `.env.staging.local` (staging only, not committed)
3. `.env.local` (all environments, not committed)
4. `.env.production` (production defaults, committed)
5. `.env.staging` (staging defaults, committed)
6. `.env` (base defaults, committed)

### Build Process Architecture

```
Developer → pnpm build:staging → Environment Validation → TypeScript Check → 
ESLint Check → Next.js Build → Optimized Staging Bundle

Developer → pnpm build:production → Environment Validation → TypeScript Check → 
ESLint Check → Confirmation Prompt → Next.js Build → Optimized Production Bundle
```

## Components and Interfaces

### 1. Environment Configuration Files

**File: `.env.staging`**
```env
# Staging Environment Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_ENV=staging
ERPNEXT_API_URL=https://staging-erp.example.com
ERP_API_KEY=staging_api_key_placeholder
ERP_API_SECRET=staging_api_secret_placeholder
```

**File: `.env.production`**
```env
# Production Environment Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_ENV=production
ERPNEXT_API_URL=https://erp.example.com
ERP_API_KEY=production_api_key_placeholder
ERP_API_SECRET=production_api_secret_placeholder
```

**File: `.env.example`** (updated)
```env
# ERPNext API Configuration
ERPNEXT_API_URL=http://localhost:8000
ERP_API_KEY=your_api_key_here
ERP_API_SECRET=your_api_secret_here

# Environment Identifier (development/staging/production)
NEXT_PUBLIC_APP_ENV=development

# Instructions:
# 1. Copy this file to .env.local for development
# 2. Replace the values with your actual ERPNext credentials
# 3. Get API credentials from ERPNext: User Menu > API Access > Generate Keys
# 4. For staging/production, use .env.staging.local or .env.production.local
```

### 2. Environment Validation Utility

**File: `lib/env-validation.ts`**

This utility validates required environment variables at build time and runtime.

```typescript
import { z } from 'zod';

const envSchema = z.object({
  ERPNEXT_API_URL: z.string().url('ERPNEXT_API_URL must be a valid URL'),
  ERP_API_KEY: z.string().min(1, 'ERP_API_KEY is required'),
  ERP_API_SECRET: z.string().min(1, 'ERP_API_SECRET is required'),
  NEXT_PUBLIC_APP_ENV: z.enum(['development', 'staging', 'production']).optional(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  const env = {
    ERPNEXT_API_URL: process.env.ERPNEXT_API_URL,
    ERP_API_KEY: process.env.ERP_API_KEY,
    ERP_API_SECRET: process.env.ERP_API_SECRET,
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
  };

  try {
    return envSchema.parse(env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(e => `  - ${e.path.join('.')}: ${e.message}`).join('\n');
      throw new Error(
        `Environment validation failed:\n${missingVars}\n\n` +
        `Please check your .env file and ensure all required variables are set.`
      );
    }
    throw error;
  }
}

export function getAppEnvironment(): 'development' | 'staging' | 'production' {
  return (process.env.NEXT_PUBLIC_APP_ENV as any) || 'development';
}

export function isProduction(): boolean {
  return getAppEnvironment() === 'production';
}

export function isStaging(): boolean {
  return getAppEnvironment() === 'staging';
}

export function isDevelopment(): boolean {
  return getAppEnvironment() === 'development';
}
```

### 3. Build Scripts

**File: `scripts/validate-env.ts`**

Pre-build validation script that runs before the Next.js build process.

```typescript
import { validateEnv, getAppEnvironment } from '../lib/env-validation';

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
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
```

**File: `scripts/build-staging.ts`**

Staging build orchestration script.

```typescript
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
} catch (error) {
  console.error('\n❌ Staging build failed');
  process.exit(1);
}
```

**File: `scripts/build-production.ts`**

Production build orchestration script with additional safety checks.

```typescript
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
    // Validate environment
    console.log('\nStep 1: Validating environment variables');
    execSync('tsx scripts/validate-env.ts', { stdio: 'inherit' });
    
    // Type check
    console.log('\nStep 2: Running TypeScript type check');
    execSync('tsc --noEmit', { stdio: 'inherit' });
    
    // Lint check
    console.log('\nStep 3: Running ESLint');
    execSync('pnpm lint', { stdio: 'inherit' });
    
    // Backup current build
    console.log('\nStep 4: Backing up previous build');
    try {
      execSync('rm -rf .next.backup && cp -r .next .next.backup', { stdio: 'inherit' });
      console.log('✅ Previous build backed up to .next.backup');
    } catch {
      console.log('ℹ️  No previous build to backup');
    }
    
    // Run Next.js build
    console.log('\nStep 5: Building Next.js application');
    execSync('next build', { stdio: 'inherit' });
    
    console.log('\n✅ Production build completed successfully!');
    console.log('📦 Build output: .next/');
    console.log('💾 Backup: .next.backup/');
    console.log('🚀 Deploy with: pnpm start');
  } catch (error) {
    console.error('\n❌ Production build failed');
    console.error('💾 Previous build preserved in .next.backup (if exists)');
    process.exit(1);
  }
}

main();
```

**File: `scripts/rollback-production.ts`**

Rollback script to restore previous production build.

```typescript
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
} catch (error) {
  console.error('\n❌ Rollback failed');
  process.exit(1);
}
```

### 4. Updated package.json Scripts

Add the following scripts to `package.json`:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "build:staging": "dotenv -e .env.staging -- tsx scripts/build-staging.ts",
    "build:production": "dotenv -e .env.production -- tsx scripts/build-production.ts",
    "start": "next start",
    "start:staging": "dotenv -e .env.staging -- next start",
    "start:production": "dotenv -e .env.production -- next start",
    "rollback:production": "tsx scripts/rollback-production.ts",
    "validate:env": "tsx scripts/validate-env.ts",
    "lint": "eslint"
  }
}
```

Note: Requires `dotenv-cli` package: `pnpm add -D dotenv-cli`

### 5. Environment Display Component

**File: `components/EnvironmentBadge.tsx`**

Visual indicator of current environment (development only).

```typescript
'use client';

export function EnvironmentBadge() {
  const env = process.env.NEXT_PUBLIC_APP_ENV || 'development';
  
  // Only show in development
  if (env === 'production') {
    return null;
  }
  
  const colors = {
    development: 'bg-blue-500',
    staging: 'bg-yellow-500',
    production: 'bg-red-500',
  };
  
  return (
    <div className={`fixed bottom-4 right-4 ${colors[env as keyof typeof colors]} text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg z-50`}>
      {env.toUpperCase()}
    </div>
  );
}
```

### 6. Runtime Environment Logging

**File: `app/layout.tsx`** (add to existing layout)

```typescript
import { validateEnv, getAppEnvironment } from '@/lib/env-validation';

// Validate environment on server startup
if (typeof window === 'undefined') {
  try {
    const env = validateEnv();
    const appEnv = getAppEnvironment();
    console.log(`🚀 Application started in ${appEnv} mode`);
    console.log(`🔗 Connected to: ${env.ERPNEXT_API_URL}`);
  } catch (error) {
    console.error('❌ Environment validation failed:', error);
    throw error;
  }
}
```

### 7. Updated .gitignore

Ensure sensitive environment files are not committed:

```gitignore
# Environment files
.env.local
.env.*.local
.env.staging.local
.env.production.local

# Build artifacts
.next/
.next.backup/
out/

# Dependencies
node_modules/
```

## Data Models

### Environment Configuration Schema

```typescript
interface EnvironmentConfig {
  NODE_ENV: 'development' | 'production';
  NEXT_PUBLIC_APP_ENV: 'development' | 'staging' | 'production';
  ERPNEXT_API_URL: string; // Valid URL
  ERP_API_KEY: string; // Non-empty string
  ERP_API_SECRET: string; // Non-empty string
}
```

### Build Metadata

```typescript
interface BuildMetadata {
  environment: 'staging' | 'production';
  timestamp: string;
  backendUrl: string;
  buildSuccess: boolean;
  validationPassed: boolean;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Environment-specific build configuration

*For any* build environment (staging or production), the build process should load and use the environment-specific configuration variables from the corresponding .env file.

**Validates: Requirements 1.2, 1.3**

### Property 2: Required environment variables validation

*For any* build attempt, if any required environment variable (ERPNEXT_API_URL, ERP_API_KEY, ERP_API_SECRET) is missing, the build process should fail with a descriptive error message.

**Validates: Requirements 2.5, 8.1, 8.2, 8.3, 8.4**

### Property 3: Environment isolation

*For any* environment configuration, the staging environment should never connect to production backend URLs, and production environment should never connect to staging backend URLs.

**Validates: Requirements 3.3, 3.4**

### Property 4: Backend connection logging

*For any* backend connection failure, the system should log both the current environment name and the target backend URL for debugging purposes.

**Validates: Requirements 3.5**

### Property 5: Environment detection

*For any* running application instance, the system should correctly expose and log the current environment name (development, staging, or production).

**Validates: Requirements 5.1, 5.2**

### Property 6: Production build validation

*For any* production build attempt, the build process should fail if TypeScript type errors or ESLint errors exist in the codebase.

**Validates: Requirements 6.1, 6.2**

### Property 7: Production backup creation

*For any* production build, the system should create a backup of the previous build before creating the new build.

**Validates: Requirements 6.4**

### Property 8: Rollback functionality

*For any* production rollback request, if a backup exists, the system should restore the previous production build successfully.

**Validates: Requirements 6.5**

### Property 9: Build optimization

*For any* production build, the output should be minified and optimized, while staging builds should include source maps for debugging.

**Validates: Requirements 7.2, 7.3, 7.4**

### Property 10: URL format validation

*For any* ERPNEXT_API_URL value, the validation system should accept only valid URL formats and reject invalid formats with descriptive error messages.

**Validates: Requirements 8.5**

### Property 11: Sensitive data protection

*For any* logging or UI display, sensitive configuration values (API keys, secrets) should never be exposed in plain text.

**Validates: Requirements 5.5**

## Error Handling

### Build-Time Error Handling

1. **Environment Validation Errors**
   - Missing required environment variables
   - Invalid URL formats
   - Environment/backend URL mismatches
   - Clear error messages with remediation steps

2. **Code Quality Errors**
   - TypeScript compilation errors
   - ESLint rule violations
   - Build process failures
   - Rollback on production build failures

3. **File System Errors**
   - Missing configuration files
   - Permission issues during backup/rollback
   - Disk space issues during builds

### Runtime Error Handling

1. **Backend Connection Errors**
   - Network connectivity issues
   - Authentication failures
   - API endpoint unavailability
   - Graceful degradation with user feedback

2. **Environment Detection Errors**
   - Missing environment variables at runtime
   - Configuration inconsistencies
   - Fallback to safe defaults where possible

### Error Recovery Mechanisms

1. **Automatic Rollback**
   - Production build failures trigger automatic rollback
   - Preserve previous working build
   - Clear rollback success/failure messaging

2. **Manual Recovery**
   - Manual rollback command for production issues
   - Environment variable validation utility
   - Build artifact cleanup commands

## Testing Strategy

### Dual Testing Approach

The deployment system requires both unit testing and property-based testing to ensure comprehensive coverage:

- **Unit tests**: Verify specific examples, edge cases, and error conditions
- **Property tests**: Verify universal properties across all inputs
- Both approaches are complementary and necessary for complete validation

### Unit Testing Focus Areas

Unit tests should concentrate on:
- Specific configuration file structures and content
- Build script existence and basic functionality
- Documentation presence and structure
- Environment badge display in development mode
- Confirmation prompts for production builds
- Source map inclusion in staging builds
- Next.js optimization flags in production builds

### Property-Based Testing Focus Areas

Property tests should verify:
- Environment variable validation across all possible input combinations
- Build process behavior consistency across different environments
- Backend URL isolation rules for all environment combinations
- Error message generation for all types of validation failures
- Logging behavior across all connection failure scenarios
- Backup and rollback functionality across all build states
- Security properties for sensitive data exposure across all contexts

### Property Test Configuration

- **Testing Library**: Use `fast-check` for JavaScript/TypeScript property-based testing
- **Test Iterations**: Minimum 100 iterations per property test
- **Test Tagging**: Each property test must reference its design document property

Example test tag format:
```typescript
// Feature: staging-production-deployment, Property 2: Required environment variables validation
```

### Test Environment Setup

1. **Isolated Test Environments**
   - Separate test configuration files
   - Mock ERPNext backend for testing
   - Temporary build directories for testing

2. **Test Data Generation**
   - Generate valid and invalid environment configurations
   - Create various backend URL formats for testing
   - Generate different build states for rollback testing

3. **Integration Testing**
   - End-to-end build process testing
   - Cross-environment deployment validation
   - Backup and rollback workflow testing

### Continuous Integration

1. **Pre-commit Hooks**
   - Environment validation
   - Code quality checks
   - Unit test execution

2. **Build Pipeline**
   - Automated testing on all environments
   - Property-based test execution
   - Deployment validation checks

3. **Monitoring**
   - Build success/failure tracking
   - Environment health monitoring
   - Performance metrics collection

