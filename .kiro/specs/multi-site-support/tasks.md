# Implementation Plan: Multi-Site Support

## Overview

This implementation plan converts the multi-site support design into actionable coding tasks. The implementation follows a layered approach: configuration layer → context layer → authentication layer → API layer → UI layer. Each task builds incrementally, with property-based tests integrated close to implementation to catch errors early.

The implementation uses TypeScript and follows the existing Next.js App Router architecture with React 19, Tailwind CSS, and the ERPNext API integration patterns.

## Tasks

- [x] 1. Set up environment configuration and migration utilities
  - Create environment variable parser for multi-site format
  - Implement legacy single-site to multi-site migration
  - Add environment variable validation
  - Create .env.example with multi-site configuration examples
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 9.1, 9.2_

- [ ]* 1.1 Write property tests for environment configuration
  - **Property 22: Environment Variable Site Configuration**
  - **Property 23: Environment Variable Fallback**
  - **Property 24: Legacy Environment Variable Migration**
  - **Property 25: Multi-Site Configuration Priority**
  - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 9.1, 9.2**

- [x] 2. Implement Site Configuration Store (lib/site-config.ts)
  - [x] 2.1 Create SiteConfig interface and storage schema
    - Define TypeScript interfaces for SiteConfig, SitesStorage
    - Implement localStorage key constants
    - _Requirements: 1.1, 1.4_

  - [x] 2.2 Implement CRUD operations for site configurations
    - Write addSite, updateSite, removeSite, getSite, getAllSites functions
    - Add duplicate name detection
    - Implement ID generation from site name
    - _Requirements: 1.1, 1.6_

  - [ ]* 2.3 Write property tests for site configuration CRUD
    - **Property 1: Site Configuration Storage Round-Trip**
    - **Property 4: Site Configuration Persistence Round-Trip**
    - **Property 5: Site Configuration CRUD Operations**
    - **Validates: Requirements 1.1, 1.4, 1.6**

  - [x] 2.4 Implement site connection validation
    - Write validateSiteConnection function with ERPNext ping
    - Add URL format validation
    - Implement timeout handling (5 seconds)
    - _Requirements: 1.2, 1.5_

  - [ ]* 2.5 Write property tests for connection validation
    - **Property 2: Site Connection Validation Before Save**
    - **Property 3: URL Format Support**
    - **Validates: Requirements 1.2, 1.3, 1.5**

  - [x] 2.6 Implement persistence and loading from localStorage
    - Write persist() and loadFromEnvironment() functions
    - Add JSON serialization/deserialization
    - Implement storage version for future migrations
    - _Requirements: 1.4, 7.1, 7.2_

  - [ ]* 2.7 Write unit tests for site configuration store
    - Test edge cases: empty configs, invalid URLs, missing credentials
    - Test localStorage corruption handling
    - Test environment variable parsing

- [x] 3. Checkpoint - Ensure site configuration tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement Site Context Provider (lib/site-context.tsx)
  - [x] 4.1 Create SiteContext and SiteProvider component
    - Define SiteContextValue interface
    - Implement React Context with createContext
    - Write SiteProvider component with state management
    - _Requirements: 2.2, 5.1_

  - [x] 4.2 Implement site selection and switching logic
    - Write setActiveSite function with localStorage persistence
    - Add cache clearing on site switch
    - Implement site restoration on app load
    - _Requirements: 2.2, 5.2, 6.2_

  - [ ]* 4.3 Write property tests for site context
    - **Property 7: Site Context Switching**
    - **Property 9: Route Preservation on Site Switch**
    - **Validates: Requirements 2.2, 2.4, 5.1, 5.2**

  - [x] 4.4 Implement useSite hook for component access
    - Write useSite hook with context validation
    - Add error handling for missing provider
    - _Requirements: 2.2_

  - [ ]* 4.5 Write unit tests for site context provider
    - Test context initialization
    - Test site switching behavior
    - Test missing provider error handling

- [x] 5. Implement Authentication Manager (utils/erpnext-auth-multi.ts)
  - [x] 5.1 Create site-specific authentication header functions
    - Write makeErpHeaders function accepting SiteConfig
    - Implement getErpAuthHeaders for Next.js requests
    - Add getErpHeaders with site-specific session cookies
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 5.2 Implement session cookie isolation
    - Add site-prefixed cookie naming (sid_${siteId})
    - Write cookie getter/setter functions per site
    - Implement cookie clearing on logout per site
    - _Requirements: 3.5, 3.6_

  - [ ]* 5.3 Write property tests for authentication
    - **Property 10: Site-Specific Credential Isolation**
    - **Property 11: Authentication Method Support**
    - **Property 12: Authentication Fallback**
    - **Property 13: Session Cookie Isolation**
    - **Property 14: Session Independence on Logout**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

  - [x] 5.3 Implement authentication fallback logic
    - Add API key to session fallback
    - Write isAuthenticated function per site
    - _Requirements: 3.4_

  - [ ]* 5.4 Write unit tests for authentication manager
    - Test header generation with different auth methods
    - Test cookie isolation between sites
    - Test fallback behavior

- [x] 6. Checkpoint - Ensure authentication tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement API Router Layer (lib/erpnext-multi.ts)
  - [x] 7.1 Create ERPNextMultiClient class extending ERPNextClient
    - Extend existing ERPNextClient class
    - Override constructor to accept SiteConfig
    - Ensure all inherited methods work with site-specific config
    - _Requirements: 4.1, 4.3_

  - [x] 7.2 Implement getERPNextClientForSite factory function
    - Write factory function returning configured client
    - Add error handling for missing site config
    - _Requirements: 4.1, 4.4_

  - [ ]* 7.3 Write property tests for API routing
    - **Property 15: API Request Routing Correctness**
    - **Property 16: Immediate Routing Update on Site Change**
    - **Property 17: Authentication Header Correctness**
    - **Property 18: URL Format Handling**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.5**

  - [x] 7.4 Implement useERPNextClient React hook
    - Write hook using useSite context
    - Add error handling for no active site
    - Return site-specific client instance
    - _Requirements: 4.1, 4.4_

  - [ ]* 7.5 Write unit tests for API router
    - Test client creation with various site configs
    - Test URL construction with different formats
    - Test error handling for missing site

- [x] 8. Implement Site Health Monitor (lib/site-health.ts)
  - [x] 8.1 Create SiteHealthMonitor class with health check logic
    - Define HealthCheckResult interface
    - Implement checkSite function with ping endpoint
    - Add timeout and retry logic with exponential backoff
    - _Requirements: 8.1, 8.2_

  - [x] 8.2 Implement background monitoring with intervals
    - Write startMonitoring and stopMonitoring functions
    - Add 60-second interval for health checks
    - Implement consecutive failure tracking
    - _Requirements: 8.2_

  - [ ]* 8.3 Write property tests for health monitoring
    - **Property 26: Health Status Display**
    - **Property 27: Offline Status Indication**
    - **Property 28: Active Site Unavailability Notification**
    - **Property 29: Manual Health Check Trigger**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**

  - [x] 8.3 Implement health status caching and subscription
    - Write getStatus function with cache
    - Add subscribe/unsubscribe for status updates
    - Persist health status to localStorage
    - _Requirements: 8.1_

  - [ ]* 8.4 Write unit tests for site health monitor
    - Test health check with mock responses
    - Test retry logic and exponential backoff
    - Test subscription notifications

- [x] 9. Checkpoint - Ensure core infrastructure tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Implement Site Selector Component (components/site-selector.tsx)
  - [x] 10.1 Create SiteSelector UI component
    - Build dropdown component with Tailwind CSS
    - Display all sites with display names
    - Add active site indicator
    - Implement keyboard navigation
    - _Requirements: 2.1, 2.3, 2.5_

  - [x] 10.2 Integrate health status indicators
    - Add online/offline badges per site
    - Display response time if available
    - Show last checked timestamp
    - _Requirements: 8.1, 8.3_

  - [ ]* 10.3 Write property tests for site selector
    - **Property 6: Site Selector Display Completeness**
    - **Property 8: Active Site Indicator Consistency**
    - **Validates: Requirements 2.1, 2.3**

  - [x] 10.4 Implement site switching interaction
    - Add onClick handler calling setActiveSite
    - Show loading state during switch
    - Display confirmation for successful switch
    - _Requirements: 2.2_

  - [ ]* 10.5 Write unit tests for site selector component
    - Test rendering with various site configurations
    - Test click interactions
    - Test keyboard navigation

- [x] 11. Implement Site Management UI (app/settings/sites/page.tsx)
  - [x] 11.1 Create site management page layout
    - Build page with site list table
    - Add "Add Site" button and modal
    - Implement edit and delete actions per site
    - _Requirements: 1.6_

  - [x] 11.2 Create site configuration form
    - Build form with fields: displayName, apiUrl, apiKey, apiSecret, isDefault
    - Add form validation with Zod schema
    - Implement masked input for API secret
    - _Requirements: 1.1, 1.2_

  - [x] 11.3 Implement connection testing UI
    - Add "Test Connection" button
    - Show loading spinner during test
    - Display success/error messages
    - _Requirements: 1.2, 1.5_

  - [ ]* 11.4 Write unit tests for site management UI
    - Test form validation
    - Test CRUD operations through UI
    - Test connection testing flow

- [x] 12. Integrate Site Context into App Layout (app/layout.tsx)
  - [x] 12.1 Wrap application with SiteProvider
    - Add SiteProvider to root layout
    - Ensure all pages have access to site context
    - _Requirements: 2.2, 2.5_

  - [x] 12.2 Add SiteSelector to navigation bar
    - Place SiteSelector in navbar component
    - Ensure visibility on all pages
    - Add responsive design for mobile
    - _Requirements: 2.5_

  - [x] 12.3 Add current site display indicator
    - Show active site name prominently in UI
    - Add visual indicators for site-specific data
    - _Requirements: 6.3, 6.5_

  - [ ]* 12.4 Write property tests for site isolation
    - **Property 19: Cache Isolation Between Sites**
    - **Property 20: Current Site Display**
    - **Property 21: Site Data Visual Indicators**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.5**

- [x] 13. Update existing API routes for multi-site support
  - [x] 13.1 Refactor API routes to use site-aware client
    - Update all API routes in app/api/* to use getERPNextClientForSite
    - Extract site config from request context or headers
    - Maintain backward compatibility with single-site usage
    - _Requirements: 9.4_

  - [ ]* 13.2 Write property tests for backward compatibility
    - **Property 30: Backward Compatibility with Existing API Routes**
    - **Property 31: Post-Migration Functional State**
    - **Validates: Requirements 9.4, 9.5**

  - [x] 13.3 Add site-specific error handling to API routes
    - Implement error messages with site context
    - Add site name to error logs
    - Distinguish network vs configuration errors
    - _Requirements: 10.1, 10.3, 10.4_

  - [ ]* 13.4 Write property tests for error handling
    - **Property 32: Site-Specific Error Messages**
    - **Property 33: Authentication Error Guidance**
    - **Property 34: Error Type Classification**
    - **Property 35: Error Logging Completeness**
    - **Property 36: Multi-Site Error Summary**
    - **Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5**

- [x] 14. Checkpoint - Ensure API integration tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. Implement migration and initialization logic
  - [x] 15.1 Create migration utility for single-site to multi-site
    - Detect legacy environment variables
    - Create SiteConfig from legacy format
    - Persist migrated configuration
    - _Requirements: 9.1, 9.2, 9.3_

  - [x] 15.2 Add initialization logic to app startup
    - Run migration check on first load
    - Load sites from environment if none configured
    - Set default site if specified
    - _Requirements: 7.2, 9.5_

  - [ ]* 15.3 Write unit tests for migration
    - Test legacy config detection
    - Test migration process
    - Test backward compatibility preservation

- [x] 16. Create documentation and examples
  - [x] 16.1 Update .env.example with multi-site format
    - Add examples for single-site legacy format
    - Add examples for multi-site JSON format
    - Document ERPNEXT_DEFAULT_SITE variable
    - _Requirements: 7.1, 7.5_

  - [x] 16.2 Create migration guide documentation
    - Document migration process from single-site
    - Provide troubleshooting steps
    - Add examples for common scenarios
    - _Requirements: 9.1, 9.2_

- [x] 17. Integration testing and final validation
  - [ ]* 17.1 Write integration tests for complete site switching flow
    - Test end-to-end site selection and API request
    - Test authentication across site switches
    - Test cache isolation between sites

  - [ ]* 17.2 Write integration tests for UI components
    - Test SiteSelector with SiteContext integration
    - Test site management UI with actual storage
    - Test health monitoring with real API calls (mocked)

  - [x] 17.3 Manual testing checklist
    - Test with local development sites (batasku.local, demo.batasku.local)
    - Test with cloud production sites (bac.batasku.cloud, cirebon.batasku.cloud)
    - Test migration from existing single-site setup
    - Test all error scenarios (offline sites, invalid credentials)

- [x] 18. Final checkpoint - Complete feature validation
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property-based tests are placed close to implementation to catch errors early
- All 36 correctness properties from the design document are covered
- Environment configuration is integrated throughout the implementation
- Migration from single-site to multi-site is handled automatically
- The implementation maintains full backward compatibility with existing code
