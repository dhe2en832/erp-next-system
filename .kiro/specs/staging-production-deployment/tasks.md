# Implementation Plan: Staging and Production Deployment

## Overview

This implementation plan creates a robust deployment system for the Next.js ERP application with separate staging and production environments. The system provides environment-specific configuration management, automated build processes, validation utilities, and safety mechanisms to ensure reliable deployments.

## Tasks

- [ ] 1. Set up environment configuration files
  - [x] 1.1 Create staging environment configuration
    - Create `.env.staging` with staging-specific variables
    - Include ERPNEXT_API_URL, ERP_API_KEY, ERP_API_SECRET for staging
    - Set NEXT_PUBLIC_APP_ENV=staging
    - _Requirements: 1.1, 1.4_
  
  - [x] 1.2 Create production environment configuration
    - Create `.env.production` with production-specific variables
    - Include ERPNEXT_API_URL, ERP_API_KEY, ERP_API_SECRET for production
    - Set NEXT_PUBLIC_APP_ENV=production
    - _Requirements: 1.1, 1.4_
  
  - [x] 1.3 Update .env.example with deployment guidance
    - Add environment-specific setup instructions
    - Include API credential generation guidance
    - Document environment variable hierarchy
    - _Requirements: 4.3, 4.4_
  
  - [x] 1.4 Update .gitignore for environment security
    - Add .env.*.local patterns to prevent credential commits
    - Add build backup directories
    - _Requirements: 1.5_

- [ ] 2. Implement environment validation utility
  - [x] 2.1 Create environment validation module
    - Write `lib/env-validation.ts` with Zod schema validation
    - Implement validateEnv() function for required variables
    - Add URL format validation for ERPNEXT_API_URL
    - Include environment detection helper functions
    - _Requirements: 8.1, 8.2, 8.3, 8.5_
  
  - [ ]* 2.2 Write property test for environment validation
    - **Property 2: Required environment variables validation**
    - **Validates: Requirements 2.5, 8.1, 8.2, 8.3, 8.4**
  
  - [ ]* 2.3 Write property test for URL format validation
    - **Property 10: URL format validation**
    - **Validates: Requirements 8.5**
  
  - [ ]* 2.4 Write unit tests for environment detection functions
    - Test getAppEnvironment(), isProduction(), isStaging(), isDevelopment()
    - Test edge cases and fallback behavior
    - _Requirements: 5.1_

- [ ] 3. Create build automation scripts
  - [x] 3.1 Implement environment validation script
    - Create `scripts/validate-env.ts` for pre-build validation
    - Add environment-backend URL mismatch detection
    - Include descriptive error messages for validation failures
    - _Requirements: 2.5, 3.3, 3.4_
  
  - [x] 3.2 Create staging build script
    - Write `scripts/build-staging.ts` with validation and build steps
    - Include environment validation and Next.js build execution
    - Add build success/failure logging
    - _Requirements: 2.1, 2.3_
  
  - [x] 3.3 Create production build script
    - Write `scripts/build-production.ts` with safety checks
    - Add confirmation prompt for production builds
    - Include TypeScript and ESLint validation
    - Implement build backup mechanism
    - _Requirements: 2.2, 2.4, 6.1, 6.2, 6.3, 6.4_
  
  - [x] 3.4 Create rollback script
    - Write `scripts/rollback-production.ts` for build restoration
    - Validate backup existence before rollback
    - Include rollback success/failure messaging
    - _Requirements: 6.5_
  
  - [ ]* 3.5 Write property test for build process validation
    - **Property 1: Environment-specific build configuration**
    - **Validates: Requirements 1.2, 1.3**
  
  - [ ]* 3.6 Write property test for production build validation
    - **Property 6: Production build validation**
    - **Validates: Requirements 6.1, 6.2**

- [ ] 4. Update package.json with deployment scripts
  - [x] 4.1 Add build and deployment scripts
    - Add build:staging, build:production commands
    - Add start:staging, start:production commands
    - Add rollback:production and validate:env commands
    - Install dotenv-cli dependency for environment loading
    - _Requirements: 2.1, 2.2_
  
  - [ ]* 4.2 Write unit tests for script definitions
    - Verify script existence and basic structure
    - Test script command syntax
    - _Requirements: 2.1, 2.2_

- [ ] 5. Checkpoint - Validate core build system
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement environment display and logging
  - [x] 6.1 Create environment badge component
    - Write `components/EnvironmentBadge.tsx` for visual environment indicator
    - Show badge only in non-production environments
    - Use environment-specific colors and styling
    - _Requirements: 5.4_
  
  - [x] 6.2 Add runtime environment logging
    - Update `app/layout.tsx` with environment validation and logging
    - Log current environment and backend URL on startup
    - Include error handling for validation failures
    - _Requirements: 5.1, 5.2, 5.3_
  
  - [ ]* 6.3 Write property test for environment isolation
    - **Property 3: Environment isolation**
    - **Validates: Requirements 3.3, 3.4**
  
  - [ ]* 6.4 Write property test for backend connection logging
    - **Property 4: Backend connection logging**
    - **Validates: Requirements 3.5**
  
  - [ ]* 6.5 Write unit tests for environment badge
    - Test badge visibility in different environments
    - Test styling and content for each environment
    - _Requirements: 5.4_

- [ ] 7. Implement comprehensive property-based tests
  - [ ]* 7.1 Write property test for environment detection
    - **Property 5: Environment detection**
    - **Validates: Requirements 5.1, 5.2**
  
  - [ ]* 7.2 Write property test for production backup creation
    - **Property 7: Production backup creation**
    - **Validates: Requirements 6.4**
  
  - [ ]* 7.3 Write property test for rollback functionality
    - **Property 8: Rollback functionality**
    - **Validates: Requirements 6.5**
  
  - [ ]* 7.4 Write property test for build optimization
    - **Property 9: Build optimization**
    - **Validates: Requirements 7.2, 7.3, 7.4**
  
  - [ ]* 7.5 Write property test for sensitive data protection
    - **Property 11: Sensitive data protection**
    - **Validates: Requirements 5.5**

- [ ] 8. Create deployment documentation
  - [x] 8.1 Create staging deployment documentation
    - Document staging deployment process and prerequisites
    - Include step-by-step staging deployment instructions
    - Add troubleshooting guidance for staging issues
    - _Requirements: 4.1, 4.3, 4.4, 4.5_
  
  - [x] 8.2 Create production deployment documentation
    - Document production deployment process and safety measures
    - Include step-by-step production deployment instructions
    - Add rollback procedures and troubleshooting guidance
    - _Requirements: 4.2, 4.3, 4.4, 4.5_
  
  - [ ]* 8.3 Write unit tests for documentation completeness
    - Verify documentation files exist and contain required sections
    - Test documentation structure and content
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 9. Final integration and validation
  - [x] 9.1 Test complete deployment workflow
    - Validate staging build and deployment process
    - Test production build with safety checks
    - Verify rollback functionality works correctly
    - _Requirements: 2.1, 2.2, 6.5_
  
  - [x] 9.2 Validate environment isolation
    - Confirm staging connects only to staging backend
    - Confirm production connects only to production backend
    - Test environment variable validation across all scenarios
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  
  - [ ]* 9.3 Run comprehensive property-based test suite
    - Execute all property tests with minimum 100 iterations
    - Validate all correctness properties hold across input space
    - Generate test coverage report for property tests

- [ ] 10. Final checkpoint - Complete system validation
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties using fast-check
- Unit tests validate specific examples and edge cases
- Build scripts include comprehensive validation and safety measures
- Environment isolation prevents cross-environment data contamination
- Production builds include additional safety checks and backup mechanisms
- Documentation provides complete deployment guidance for team members