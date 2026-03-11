# Staging Deployment Guide

## Overview

This guide covers the deployment process for the staging environment of the Next.js ERP system. The staging environment is used for testing changes before they are deployed to production.

## Prerequisites

Before deploying to staging, ensure you have:

1. **Node.js and pnpm installed**
   - Node.js version 18 or higher
   - pnpm package manager

2. **Environment Configuration**
   - Access to staging ERPNext instance
   - Staging API credentials (API Key and Secret)

3. **Dependencies Installed**
   ```bash
   pnpm install
   ```

## Environment Setup

### 1. Configure Staging Environment Variables

Create or update `.env.staging.local` with your actual staging credentials:

```env
# Staging Environment Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_ENV=staging

# ERPNext API Configuration for Staging
ERPNEXT_API_URL=https://your-staging-erp.example.com
ERP_API_KEY=your_staging_api_key
ERP_API_SECRET=your_staging_api_secret
```

**Important:** Never commit `.env.staging.local` to version control as it contains sensitive credentials.

### 2. Verify Environment Variables

Run the environment validation script to ensure all required variables are set:

```bash
pnpm validate:env
```

## Deployment Process

### Step 1: Build for Staging

Run the staging build command:

```bash
pnpm build:staging
```

This command will:
1. Validate environment variables
2. Build the Next.js application with staging configuration
3. Create an optimized build in the `.next/` directory

### Step 2: Start the Application

Start the application in staging mode:

```bash
pnpm start:staging
```

The application will be available at `http://localhost:3000` (or your configured port).

### Step 3: Verify Deployment

1. **Check Environment Badge**: You should see a yellow "STAGING" badge in the bottom-right corner
2. **Verify Backend Connection**: Check the console logs for successful connection to staging ERPNext
3. **Test Core Functionality**: Perform basic operations to ensure the application works correctly

## Environment Verification

### Visual Indicators

- **Environment Badge**: Yellow badge showing "STAGING" in bottom-right corner
- **Console Logs**: Application startup logs showing staging environment and backend URL

### Backend Connection Test

Test the connection to your staging ERPNext instance:

1. Navigate to any module (e.g., Sales Invoice)
2. Try to load data - this will test the API connection
3. Check browser console for any connection errors

## Troubleshooting

### Common Issues

#### 1. Environment Validation Failed

**Error**: `Environment validation failed: ERPNEXT_API_URL is required`

**Solution**: 
- Ensure `.env.staging.local` exists and contains all required variables
- Check that variable names are spelled correctly
- Verify that ERPNEXT_API_URL is a valid URL format

#### 2. Build Failed

**Error**: Build process fails during TypeScript compilation or ESLint

**Solution**:
- Fix any TypeScript errors in your code
- Run `pnpm lint` to identify and fix linting issues
- Ensure all imports are correct

#### 3. Backend Connection Failed

**Error**: API requests to ERPNext fail

**Solution**:
- Verify ERPNEXT_API_URL is accessible from your deployment environment
- Check API credentials are valid and have necessary permissions
- Ensure ERPNext instance is running and accessible

#### 4. Environment Badge Not Showing

**Issue**: No staging badge visible

**Solution**:
- Check that `NEXT_PUBLIC_APP_ENV=staging` is set correctly
- Verify the EnvironmentBadge component is included in the layout
- Check browser console for any JavaScript errors

### Debug Commands

```bash
# Validate environment variables
pnpm validate:env

# Check TypeScript compilation
npx tsc --noEmit

# Run ESLint
pnpm lint

# Test build without deployment
pnpm build:staging
```

## Staging vs Production Differences

| Aspect | Staging | Production |
|--------|---------|------------|
| Environment Badge | Yellow "STAGING" badge visible | No badge shown |
| Source Maps | Enabled for debugging | Disabled for performance |
| Error Logging | Verbose logging | Minimal logging |
| Backend URL | staging-erp.example.com | erp.example.com |
| Build Validation | Basic validation | Enhanced validation with confirmation |

## Security Considerations

1. **Environment Files**: Never commit `.env.staging.local` to version control
2. **API Credentials**: Use staging-specific credentials, not production ones
3. **Access Control**: Limit access to staging environment to authorized personnel
4. **Data Isolation**: Ensure staging uses separate database from production

## Next Steps

After successful staging deployment:

1. **Testing**: Perform comprehensive testing of new features
2. **User Acceptance**: Allow stakeholders to review changes
3. **Production Deployment**: Once approved, proceed with production deployment using the production deployment guide

## Support

If you encounter issues not covered in this guide:

1. Check the application logs for detailed error messages
2. Verify all prerequisites are met
3. Consult the main project documentation
4. Contact the development team for assistance