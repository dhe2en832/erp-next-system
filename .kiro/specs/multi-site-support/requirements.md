# Requirements Document

## Introduction

This document defines requirements for multi-site support in the erp-next-system Next.js application. The system currently connects to a single ERPNext backend instance. This feature will enable the application to support multiple ERPNext sites from a single Next.js deployment, allowing users to switch between different ERPNext sites (e.g., batasku.local, demo.batasku.local, bac.batasku.cloud, cirebon.batasku.cloud) within the same application instance.

The multi-site architecture follows the ERPNext bench pattern where one bench hosts multiple sites, each with its own database and configuration. The Next.js application will act as a unified frontend that can connect to any configured site based on user selection or context.

## Glossary

- **Site**: An ERPNext instance with its own database, configuration, and API endpoint (e.g., batasku.local, bac.batasku.cloud)
- **Bench**: An ERPNext deployment that hosts multiple sites
- **Site_Selector**: UI component that allows users to choose which ERPNext site to connect to
- **Site_Context**: The currently active site configuration including API URL and credentials
- **Site_Configuration**: Stored settings for a site including URL, API key, API secret, and display name
- **Authentication_Manager**: Component responsible for managing authentication credentials per site
- **API_Router**: Component that routes API requests to the correct ERPNext site based on Site_Context
- **Session_Manager**: Component that maintains separate user sessions per site
- **Next_App**: The Next.js frontend application
- **ERPNext_API**: The REST API provided by each ERPNext site

## Requirements

### Requirement 1: Site Configuration Management

**User Story:** As a system administrator, I want to configure multiple ERPNext sites, so that users can access different ERPNext instances from the same application.

#### Acceptance Criteria

1. THE Next_App SHALL store Site_Configuration for multiple sites including URL, API key, API secret, and display name
2. WHEN a new site is added, THE Next_App SHALL validate the site connection before saving the configuration
3. THE Next_App SHALL support both local sites (e.g., batasku.local) and cloud sites (e.g., bac.batasku.cloud)
4. THE Next_App SHALL persist Site_Configuration across application restarts
5. WHEN Site_Configuration is updated, THE Next_App SHALL re-validate the connection to the site
6. THE Next_App SHALL provide a management interface for adding, editing, and removing site configurations

### Requirement 2: Site Selection

**User Story:** As a user, I want to select which ERPNext site to work with, so that I can access data from different business entities or environments.

#### Acceptance Criteria

1. THE Site_Selector SHALL display all configured sites with their display names
2. WHEN a user selects a site, THE Next_App SHALL switch the Site_Context to the selected site
3. THE Site_Selector SHALL indicate which site is currently active
4. WHEN switching sites, THE Next_App SHALL preserve the current page route if it exists on the new site
5. THE Site_Selector SHALL be accessible from all pages in the application
6. WHEN no site is selected, THE Next_App SHALL prompt the user to select a site before accessing any features

### Requirement 3: Site-Specific Authentication

**User Story:** As a user, I want to authenticate separately for each site, so that I can maintain different credentials and permissions per site.

#### Acceptance Criteria

1. THE Authentication_Manager SHALL maintain separate API credentials for each site
2. WHEN a user switches sites, THE Authentication_Manager SHALL use the credentials configured for that site
3. THE Authentication_Manager SHALL support both API key authentication and session-based authentication per site
4. WHEN API key authentication fails, THE Authentication_Manager SHALL fall back to session-based authentication for that site
5. THE Session_Manager SHALL maintain separate session cookies for each site
6. WHEN a user logs out from one site, THE Session_Manager SHALL not affect sessions on other sites

### Requirement 4: Site-Aware API Routing

**User Story:** As a developer, I want API requests to be automatically routed to the correct ERPNext site, so that the application correctly interacts with the selected site.

#### Acceptance Criteria

1. THE API_Router SHALL route all ERPNext API requests to the URL of the currently active site
2. WHEN Site_Context changes, THE API_Router SHALL immediately use the new site's API endpoint for subsequent requests
3. THE API_Router SHALL include the correct authentication headers for the active site
4. WHEN an API request is made without an active Site_Context, THE API_Router SHALL return an error indicating no site is selected
5. THE API_Router SHALL handle site-specific API URL formats correctly (http vs https, port numbers, paths)

### Requirement 5: Site Context Persistence

**User Story:** As a user, I want my selected site to be remembered, so that I don't have to reselect it every time I use the application.

#### Acceptance Criteria

1. WHEN a user selects a site, THE Next_App SHALL persist the selection in browser storage
2. WHEN the application loads, THE Next_App SHALL restore the previously selected site from browser storage
3. WHEN the previously selected site is no longer available, THE Next_App SHALL prompt the user to select a different site
4. THE Next_App SHALL persist Site_Context separately per browser profile or user account
5. WHEN a user clears browser data, THE Next_App SHALL handle the missing Site_Context gracefully by prompting for site selection

### Requirement 6: Site Isolation

**User Story:** As a user, I want data from different sites to be kept separate, so that I don't accidentally mix data from different business entities.

#### Acceptance Criteria

1. THE Next_App SHALL not cache data across different sites
2. WHEN switching sites, THE Next_App SHALL clear all cached data from the previous site
3. THE Next_App SHALL display the current site name prominently in the UI to prevent confusion
4. THE Next_App SHALL prevent API requests from being sent to the wrong site
5. WHEN displaying data, THE Next_App SHALL include visual indicators showing which site the data belongs to

### Requirement 7: Environment-Specific Configuration

**User Story:** As a developer, I want to configure default sites per environment, so that development, staging, and production environments can have appropriate defaults.

#### Acceptance Criteria

1. THE Next_App SHALL support environment-specific default site configurations via environment variables
2. WHEN no sites are configured, THE Next_App SHALL use the default site from environment variables as a fallback
3. THE Next_App SHALL support the existing single-site environment variable format for backward compatibility
4. WHERE multi-site configuration exists, THE Next_App SHALL prioritize it over single-site environment variables
5. THE Next_App SHALL allow environment variables to define multiple sites in a structured format

### Requirement 8: Site Health Monitoring

**User Story:** As a user, I want to see the connection status of configured sites, so that I know which sites are available before selecting them.

#### Acceptance Criteria

1. THE Site_Selector SHALL display the connection status (online/offline) for each configured site
2. THE Next_App SHALL periodically check the health of configured sites in the background
3. WHEN a site becomes unavailable, THE Site_Selector SHALL indicate the offline status
4. WHEN the currently active site becomes unavailable, THE Next_App SHALL notify the user and suggest switching to an available site
5. THE Next_App SHALL provide a manual refresh option to recheck site availability

### Requirement 9: Migration from Single-Site to Multi-Site

**User Story:** As an existing user, I want my current single-site configuration to work seamlessly, so that the upgrade to multi-site support doesn't break my existing setup.

#### Acceptance Criteria

1. WHEN the application detects single-site environment variables, THE Next_App SHALL automatically create a Site_Configuration from them
2. THE Next_App SHALL migrate existing single-site configurations to the multi-site format on first launch
3. WHEN both single-site and multi-site configurations exist, THE Next_App SHALL prioritize multi-site configuration
4. THE Next_App SHALL maintain backward compatibility with existing API routes and authentication patterns
5. WHEN migration is complete, THE Next_App SHALL continue to function without requiring user intervention

### Requirement 10: Site-Specific Error Handling

**User Story:** As a user, I want clear error messages when site-related issues occur, so that I can understand and resolve problems quickly.

#### Acceptance Criteria

1. WHEN a site connection fails, THE Next_App SHALL display an error message indicating which site failed and why
2. WHEN authentication fails for a site, THE Next_App SHALL provide specific guidance on how to resolve the issue
3. WHEN a site is unreachable, THE Next_App SHALL distinguish between network errors and configuration errors
4. THE Next_App SHALL log site-related errors with sufficient detail for troubleshooting
5. WHEN multiple sites have issues, THE Next_App SHALL provide a summary of all site statuses
