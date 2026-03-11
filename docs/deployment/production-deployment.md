# Production Deployment Guide

## Overview

This guide covers the deployment process for the production environment of the Next.js ERP system. Production deployments include additional safety measures, validation checks, and backup mechanisms to ensure system reliability.

## Prerequisites

Before deploying to production, ensure you have:

1. **Node.js and pnpm installed**
   - Node.js version 18 or higher
   - pnpm package manager

2. **Environment Configuration**
   - Access to production ERPNext instance
   - Production API credentials (API Key and Secret)
   - Verified staging deployment working correctly

3. **Dependencies Installed**
   ```bash
   pnpm install
   ```

4. **Code Quality Verification**
   - All TypeScript errors resolved
   - All ESLint issues fixed
   - Comprehensive testing completed in staging

## Environment Setup

### 1. Configure Production Environment Variables

Create or update `.env.production.local` with your actual production credentials:

```env
# Production Environment Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_ENV=production

# ERPNext API Configuration for Production
ERPNEXT_API_URL=https://your-production-erp.example.com
ERP_API_KEY=your_production_api_key
ERP_API_SECRET=your_production_api_secret
```

**Critical:** Never commit `.env.production.local` to version control as it contains sensitive production credentials.

### 2. Verify Environment Variables

Run the environment validation script to ensure all required variables are set:

```bash
pnpm validate:env
```

## Production Deployment Process

### Step 1: Pre-Deployment Checklist

Before starting the production build, verify:

- [ ] All changes tested thoroughly in staging
- [ ] No TypeScript compilation errors
- [ ] No ESLint violations
- [ ] Database backups completed (ERPNext side)
- [ ] Maintenance window scheduled (if required)
- [ ] Rollback plan prepared

### Step 2: Build for Production

Run the production build command:

```bash
pnpm build:production
```

**Important:** This command will prompt for confirmation before proceeding.

The production build process includes:

1. **Confirmation Prompt**: You must type "yes" to proceed
2. **Environment Validation**: Validates all required environment variables
3. **TypeScript Check**: Ensures no type errors exist
4. **ESLint Check**: Ensures code quality standards are met
5. **Build Backup**: Automatically backs up previous build to `.next.backup/`
6. **Next.js Build**: Creates optimized production build

### Step 3: Start the Application

Start the application in production mode:

```bash
pnpm start:production
```

The application will be available at `http://localhost:3000` (or your configured port).

### Step 4: Verify Deployment

1. **No Environment Badge**: Production should NOT show any environment badge
2. **Verify Backend Connection**: Check console logs for successful connection to production ERPNext
3. **Test Core Functionality**: Perform comprehensive testing of critical business operations
4. **Monitor Performance**: Check application performance and response times

## Safety Measures

### Automatic Build Backup

Every production build automatically creates a backup of the previous build:

- **Backup Location**: `.next.backup/`
- **Automatic Creation**: Created before new build starts
- **Rollback Ready**: Can be restored using rollback command

### Rollback Procedure

If issues are discovered after deployment, you can quickly rollback:

```bash
pnpm rollback:production
```

This command will:
1. Remove the current build
2. Restore the previous build from backup
3. Confirm successful rollback

**Note:** After rollback, restart the application with `pnpm start:production`

### Environment Isolation

Production deployment includes strict environment isolation:

- **Backend URL Validation**: Prevents production from connecting to staging URLs
- **Credential Separation**: Uses production-specific API credentials
- **Configuration Isolation**: Separate environment files prevent cross-contamination

## Monitoring and Verification

### Visual Indicators

- **No Environment Badge**: Production should not display any environment badge
- **Console Logs**: Application startup logs showing production environment and backend URL
- **Performance**: Optimized build with minified assets and no source maps

### Health Checks

After deployment, perform these health checks:

1. **API Connectivity**
   - Test connection to production ERPNext
   - Verify API authentication works
   - Check data retrieval from all major modules

2. **Core Business Functions**
   - Create and submit a sales invoice
   - Generate a financial report
   - Test user authentication and permissions

3. **Performance Verification**
   - Check page load times
   - Verify asset optimization (minified CSS/JS)
   - Test responsive design on different devices

## Troubleshooting

### Common Issues

#### 1. Build Confirmation Timeout

**Issue**: Production build times out waiting for confirmation

**Solution**: 
- Ensure you type exactly "yes" (lowercase) when prompted
- Check terminal input is working correctly
- Run build in interactive terminal session

#### 2. TypeScript Compilation Errors

**Error**: `Production build failed` during TypeScript check

**Solution**:
- Run `npx tsc --noEmit` to see detailed errors
- Fix all TypeScript errors before attempting production build
- Ensure all imports and type definitions are correct

#### 3. ESLint Violations

**Error**: `Production build failed` during ESLint check

**Solution**:
- Run `pnpm lint` to see all linting issues
- Fix all ESLint errors and warnings
- Consider updating ESLint configuration if needed

#### 4. Environment Validation Failed

**Error**: `Environment validation failed`

**Solution**:
- Verify `.env.production.local` exists and contains all required variables
- Check ERPNEXT_API_URL is accessible from production environment
- Validate API credentials are correct and have necessary permissions

#### 5. Backend Connection Issues

**Error**: API requests fail in production

**Solution**:
- Verify production ERPNext instance is running and accessible
- Check firewall and network connectivity
- Validate SSL certificates if using HTTPS
- Confirm API credentials have not expired

### Emergency Procedures

#### Immediate Rollback

If critical issues are discovered:

```bash
# Quick rollback to previous version
pnpm rollback:production

# Restart application
pnpm start:production
```

#### Build Recovery

If build backup is corrupted:

```bash
# Rebuild from source
pnpm build:production

# Or restore from version control
git checkout HEAD~1  # Go back one commit
pnpm build:production
```

## Production vs Staging Differences

| Aspect | Staging | Production |
|--------|---------|------------|
| Environment Badge | Yellow "STAGING" badge | No badge (hidden) |
| Source Maps | Enabled | Disabled |
| Build Validation | Basic checks | Enhanced validation |
| Confirmation Prompt | No | Required |
| Automatic Backup | No | Yes |
| Error Logging | Verbose | Optimized |
| Asset Optimization | Standard | Maximum |

## Security Best Practices

### Environment Security

1. **Credential Management**
   - Use production-specific API credentials
   - Rotate credentials regularly
   - Never share production credentials

2. **Access Control**
   - Limit production deployment access to authorized personnel
   - Use secure deployment pipelines
   - Implement audit logging for deployments

3. **Network Security**
   - Use HTTPS for all production communications
   - Implement proper firewall rules
   - Regular security updates

### Data Protection

1. **Backup Strategy**
   - Regular automated backups of ERPNext data
   - Test backup restoration procedures
   - Maintain offsite backup copies

2. **Monitoring**
   - Implement application monitoring
   - Set up error alerting
   - Monitor performance metrics

## Maintenance and Updates

### Regular Maintenance

1. **Weekly Tasks**
   - Review application logs
   - Check system performance
   - Verify backup integrity

2. **Monthly Tasks**
   - Update dependencies (after staging testing)
   - Review security patches
   - Performance optimization review

### Update Process

1. **Development** → **Staging** → **Production**
2. Comprehensive testing in staging
3. Scheduled maintenance windows for major updates
4. Rollback plan for every update

## Support and Escalation

### Deployment Issues

1. **Level 1**: Check troubleshooting guide
2. **Level 2**: Review application logs and error messages
3. **Level 3**: Contact development team with:
   - Detailed error messages
   - Steps to reproduce
   - Environment configuration (without credentials)
   - Timeline of when issue started

### Emergency Contacts

- **Development Team**: [Contact Information]
- **System Administrator**: [Contact Information]
- **Business Stakeholders**: [Contact Information]

## Post-Deployment Checklist

After successful production deployment:

- [ ] All health checks passed
- [ ] Performance metrics within acceptable range
- [ ] No error alerts triggered
- [ ] Key stakeholders notified of successful deployment
- [ ] Documentation updated with any changes
- [ ] Monitoring systems configured
- [ ] Backup verification completed

## Conclusion

Production deployment requires careful attention to safety measures and validation procedures. Always test thoroughly in staging before production deployment, and maintain a rollback plan for quick recovery if issues arise.

For additional support or questions not covered in this guide, contact the development team with detailed information about your deployment environment and any error messages encountered.