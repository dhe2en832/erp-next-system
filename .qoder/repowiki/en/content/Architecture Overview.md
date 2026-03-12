# Architecture Overview

<cite>
**Referenced Files in This Document**
- [site-context.tsx](file://lib/site-context.tsx)
- [use-erpnext-client.ts](file://lib/use-erpnext-client.ts)
- [erpnext.ts](file://lib/erpnext.ts)
- [erpnext-multi.ts](file://lib/erpnext-multi.ts)
- [site-config.ts](file://lib/site-config.ts)
- [env-config.ts](file://lib/env-config.ts)
- [api-helpers.ts](file://lib/api-helpers.ts)
- [site-credentials.ts](file://lib/site-credentials.ts)
- [erpnext-auth-multi.ts](file://utils/erpnext-auth-multi.ts)
- [site-migration.ts](file://lib/site-migration.ts)
- [layout.tsx](file://app/layout.tsx)
- [route.ts](file://app/api/sales/invoices/[name]/route.ts)
- [route.ts](file://app/api/sites/health/route.ts)
- [route.ts](file://app/api/sites/validate/route.ts)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)

## Introduction
This document describes the architecture of the ERP Next System with a focus on multi-site capabilities, state management, client instantiation, and data access patterns. The system follows a layered architecture separating UI components, business logic, API integration, and data persistence. It leverages:
- Provider pattern for site state management
- Factory pattern for client instantiation
- Repository-like abstraction for data access
- Strong TypeScript interfaces to define contracts across layers
- Site-aware authentication and configuration management

## Project Structure
The system is organized into:
- UI layer (Next.js app directory) with pages, components, and guards
- API routes (Next.js app/api) implementing site-aware handlers
- Shared libraries (lib) for configuration, site context, clients, and helpers
- Utilities (utils) for authentication and shared logic
- Types (types) for strict contracts

```mermaid
graph TB
subgraph "UI Layer"
L["app/layout.tsx"]
C1["Components<br/>Navbar, SiteGuard, Toast"]
end
subgraph "Libraries"
SC["lib/site-context.tsx"]
EC["lib/erpnext-multi.ts"]
AC["lib/api-helpers.ts"]
SI["lib/site-config.ts"]
EI["lib/env-config.ts"]
SM["lib/site-migration.ts"]
UC["lib/use-erpnext-client.ts"]
end
subgraph "Utilities"
AU["utils/erpnext-auth-multi.ts"]
CR["lib/site-credentials.ts"]
end
subgraph "API Routes"
R1["app/api/sales/invoices/[name]/route.ts"]
RH["app/api/sites/health/route.ts"]
RV["app/api/sites/validate/route.ts"]
end
L --> SC
L --> C1
C1 --> SC
C1 --> UC
UC --> EC
EC --> AU
AC --> EC
AC --> EI
AC --> CR
R1 --> AC
RH --> SI
RV --> SI
SC --> SI
SC --> EI
SC --> SM
```

**Diagram sources**
- [layout.tsx](file://app/layout.tsx#L30-L53)
- [site-context.tsx](file://lib/site-context.tsx#L59-L336)
- [use-erpnext-client.ts](file://lib/use-erpnext-client.ts#L40-L55)
- [erpnext-multi.ts](file://lib/erpnext-multi.ts#L24-L92)
- [api-helpers.ts](file://lib/api-helpers.ts#L59-L103)
- [site-config.ts](file://lib/site-config.ts#L97-L122)
- [env-config.ts](file://lib/env-config.ts#L264-L302)
- [site-migration.ts](file://lib/site-migration.ts#L80-L157)
- [erpnext-auth-multi.ts](file://utils/erpnext-auth-multi.ts#L34-L98)
- [site-credentials.ts](file://lib/site-credentials.ts#L25-L73)
- [route.ts](file://app/api/sales/invoices/[name]/route.ts#L9-L48)
- [route.ts](file://app/api/sites/health/route.ts#L26-L91)
- [route.ts](file://app/api/sites/validate/route.ts#L8-L44)

**Section sources**
- [layout.tsx](file://app/layout.tsx#L30-L53)

## Core Components
- Site Context Provider: Manages active site selection, persistence, and switching with localStorage and cookies. See [site-context.tsx](file://lib/site-context.tsx#L59-L336).
- Multi-Site Client: Extends the base client with site-specific URLs and authentication headers. See [erpnext-multi.ts](file://lib/erpnext-multi.ts#L24-L92).
- Single-Site Client: Base client for legacy or unified environments. See [erpnext.ts](file://lib/erpnext.ts#L18-L324).
- Site Configuration Store: CRUD and validation for site configurations with localStorage persistence. See [site-config.ts](file://lib/site-config.ts#L97-L322).
- Environment Configuration: Parses and validates multi-site and legacy configurations, with migration support. See [env-config.ts](file://lib/env-config.ts#L264-L342).
- API Helpers: Extracts site context from requests and builds site-aware clients and error responses. See [api-helpers.ts](file://lib/api-helpers.ts#L59-L156).
- Site Credentials Loader: Loads per-site credentials from environment variables. See [site-credentials.ts](file://lib/site-credentials.ts#L25-L73).
- Authentication Utilities: Builds headers and manages site-scoped session cookies. See [erpnext-auth-multi.ts](file://utils/erpnext-auth-multi.ts#L34-L98).
- Site Migration: Detects and migrates legacy configuration to multi-site. See [site-migration.ts](file://lib/site-migration.ts#L80-L157).
- UI Integration: Provider wiring and client hook for components. See [layout.tsx](file://app/layout.tsx#L38-L49) and [use-erpnext-client.ts](file://lib/use-erpnext-client.ts#L40-L55).

**Section sources**
- [site-context.tsx](file://lib/site-context.tsx#L59-L336)
- [erpnext-multi.ts](file://lib/erpnext-multi.ts#L24-L92)
- [erpnext.ts](file://lib/erpnext.ts#L18-L324)
- [site-config.ts](file://lib/site-config.ts#L97-L322)
- [env-config.ts](file://lib/env-config.ts#L264-L342)
- [api-helpers.ts](file://lib/api-helpers.ts#L59-L156)
- [site-credentials.ts](file://lib/site-credentials.ts#L25-L73)
- [erpnext-auth-multi.ts](file://utils/erpnext-auth-multi.ts#L34-L98)
- [site-migration.ts](file://lib/site-migration.ts#L80-L157)
- [layout.tsx](file://app/layout.tsx#L38-L49)
- [use-erpnext-client.ts](file://lib/use-erpnext-client.ts#L40-L55)

## Architecture Overview
The system implements a layered architecture:
- UI Layer: Pages and components consume site context and use the client hook to access ERPNext APIs.
- Business Logic Layer: API routes encapsulate site-aware logic, error handling, and response formatting.
- Integration Layer: Clients (single-site and multi-site) abstract HTTP calls and authentication.
- Persistence Layer: Site configurations are persisted in localStorage with environment-backed validation and migration.

```mermaid
graph TB
UI["UI Components<br/>useSite, useERPNextClient"] --> PC["Provider Context<br/>SiteProvider"]
PC --> SC["Site Context<br/>activeSite, sites"]
UI --> HC["Hook<br/>useERPNextClient"]
HC --> MC["Multi-Site Client<br/>ERPNextMultiClient"]
MC --> AU["Auth Headers<br/>makeErpHeaders"]
MC --> API["ERPNext API"]
subgraph "Server-Side"
AR["API Routes<br/>/api/sales/invoices/[name]"]
AH["API Helpers<br/>getERPNextClientForRequest"]
AH --> MC
AH --> EC["Single-Site Client<br/>erpnextClient"]
end
AR --> AH
AR --> SC
```

**Diagram sources**
- [layout.tsx](file://app/layout.tsx#L38-L49)
- [site-context.tsx](file://lib/site-context.tsx#L59-L336)
- [use-erpnext-client.ts](file://lib/use-erpnext-client.ts#L40-L55)
- [erpnext-multi.ts](file://lib/erpnext-multi.ts#L24-L92)
- [erpnext-auth-multi.ts](file://utils/erpnext-auth-multi.ts#L34-L98)
- [route.ts](file://app/api/sales/invoices/[name]/route.ts#L9-L48)
- [api-helpers.ts](file://lib/api-helpers.ts#L59-L103)
- [erpnext.ts](file://lib/erpnext.ts#L18-L324)

## Detailed Component Analysis

### Provider Pattern for State Management
The SiteProvider manages site state, persistence, and switching. It:
- Initializes sites from storage or environment
- Supports migration from legacy configuration
- Persists active site to localStorage and sets a cookie for API routes
- Clears caches on site switches to prevent data leakage

```mermaid
sequenceDiagram
participant UI as "UI Component"
participant SP as "SiteProvider"
participant SC as "SiteConfig Store"
participant EC as "Env Config"
UI->>SP : Mount provider
SP->>EC : performMigration()
EC-->>SP : MigrationResult
SP->>SC : reloadSites()
SC-->>SP : SiteConfig[]
SP->>SP : getDefaultSite()
SP->>SP : persistActiveSite()
SP->>UI : Provide {activeSite, sites, setActiveSite}
```

**Diagram sources**
- [site-context.tsx](file://lib/site-context.tsx#L190-L320)
- [site-migration.ts](file://lib/site-migration.ts#L80-L157)
- [site-config.ts](file://lib/site-config.ts#L110-L114)
- [env-config.ts](file://lib/env-config.ts#L264-L302)

**Section sources**
- [site-context.tsx](file://lib/site-context.tsx#L59-L336)
- [site-migration.ts](file://lib/site-migration.ts#L80-L157)
- [site-config.ts](file://lib/site-config.ts#L97-L122)
- [env-config.ts](file://lib/env-config.ts#L264-L302)

### Factory Pattern for Client Instantiation
The system uses a factory-style approach to create site-aware clients:
- A hook creates a multi-site client bound to the active site
- API helpers choose between multi-site and single-site clients based on request context
- Authentication headers are generated per site

```mermaid
classDiagram
class ERPNextClient {
+getList()
+get()
+insert()
+update()
+delete()
+submit()
+cancel()
+call()
+getCurrentUser()
-getHeaders()
}
class ERPNextMultiClient {
-siteConfig
+constructor(siteConfig)
+getSiteConfig()
-getHeaders()
}
class APIHelpers {
+getERPNextClientForRequest(request)
+getSiteIdFromRequest(request)
}
class SiteCredentials {
+loadSiteCredentials(site)
+resolveSiteConfig(site)
}
ERPNextMultiClient --|> ERPNextClient
APIHelpers --> ERPNextMultiClient : "factory"
APIHelpers --> ERPNextClient : "fallback"
APIHelpers --> SiteCredentials : "loads env creds"
```

**Diagram sources**
- [erpnext.ts](file://lib/erpnext.ts#L18-L324)
- [erpnext-multi.ts](file://lib/erpnext-multi.ts#L24-L92)
- [api-helpers.ts](file://lib/api-helpers.ts#L59-L103)
- [site-credentials.ts](file://lib/site-credentials.ts#L25-L73)

**Section sources**
- [use-erpnext-client.ts](file://lib/use-erpnext-client.ts#L40-L55)
- [api-helpers.ts](file://lib/api-helpers.ts#L59-L103)
- [erpnext-multi.ts](file://lib/erpnext-multi.ts#L78-L92)
- [erpnext-auth-multi.ts](file://utils/erpnext-auth-multi.ts#L34-L98)

### Repository Pattern for Data Access
The system abstracts data access behind client methods that:
- Encapsulate HTTP calls to ERPNext endpoints
- Normalize query parameters and error responses
- Provide typed methods for CRUD operations and custom calls

```mermaid
flowchart TD
Start(["Call Client Method"]) --> Build["Build URL and Params"]
Build --> Auth["Attach Auth Headers"]
Auth --> Fetch["Fetch from ERPNext API"]
Fetch --> Ok{"HTTP OK?"}
Ok --> |Yes| Parse["Parse JSON and return data"]
Ok --> |No| Throw["Throw Error with message/exc"]
Parse --> End(["Return Typed Result"])
Throw --> End
```

**Diagram sources**
- [erpnext.ts](file://lib/erpnext.ts#L32-L186)

**Section sources**
- [erpnext.ts](file://lib/erpnext.ts#L18-L324)

### Multi-Site Architecture: Site Context Provider
The multi-site design centers around:
- Site configuration model with ID, name, display name, URL, and credentials
- Site-aware authentication with API key precedence and session cookie fallback
- Server-side validation and health checks
- Seamless switching with cache clearing and cookie propagation

```mermaid
sequenceDiagram
participant User as "User"
participant UI as "UI"
participant SP as "SiteProvider"
participant SC as "SiteConfig Store"
participant AR as "API Route"
participant EC as "ERPNextMultiClient"
User->>UI : Select Site
UI->>SP : setActiveSite(siteId)
SP->>SC : getSite(siteId)
SP->>SP : clearCache()
SP->>SP : persistActiveSite(siteId)
SP->>AR : Set active_site cookie
AR->>EC : getERPNextClientForRequest()
EC-->>AR : Site-specific client
AR->>EC : Perform operation
```

**Diagram sources**
- [site-context.tsx](file://lib/site-context.tsx#L152-L184)
- [site-config.ts](file://lib/site-config.ts#L119-L122)
- [api-helpers.ts](file://lib/api-helpers.ts#L59-L103)
- [erpnext-auth-multi.ts](file://utils/erpnext-auth-multi.ts#L54-L72)

**Section sources**
- [site-context.tsx](file://lib/site-context.tsx#L59-L336)
- [site-config.ts](file://lib/site-config.ts#L97-L122)
- [api-helpers.ts](file://lib/api-helpers.ts#L30-L103)
- [erpnext-auth-multi.ts](file://utils/erpnext-auth-multi.ts#L54-L72)

### Component Interaction Patterns
- UI components depend on SiteProvider via a custom hook to access active site and client
- API routes extract site context from headers or cookies and delegate to site-aware clients
- Error responses include site context for easier debugging

```mermaid
sequenceDiagram
participant Page as "Page Component"
participant Hook as "useERPNextClient"
participant Client as "ERPNextMultiClient"
participant Route as "API Route"
participant Helper as "API Helpers"
Page->>Hook : useERPNextClient()
Hook-->>Page : Client bound to activeSite
Page->>Client : getList("Sales Invoice")
Client->>Route : HTTP request (with auth)
Route->>Helper : getERPNextClientForRequest()
Helper-->>Route : Site-aware client
Route-->>Page : JSON response
```

**Diagram sources**
- [use-erpnext-client.ts](file://lib/use-erpnext-client.ts#L40-L55)
- [route.ts](file://app/api/sales/invoices/[name]/route.ts#L31-L41)
- [api-helpers.ts](file://lib/api-helpers.ts#L59-L103)

**Section sources**
- [layout.tsx](file://app/layout.tsx#L38-L49)
- [use-erpnext-client.ts](file://lib/use-erpnext-client.ts#L40-L55)
- [route.ts](file://app/api/sales/invoices/[name]/route.ts#L9-L48)

### Data Flow: User Actions Through API Routes to ERPNext Instances
- UI triggers an action (e.g., fetching a Sales Invoice)
- The hook resolves a site-aware client
- The API route extracts site context and invokes the client
- The client builds headers and performs the HTTP call to the ERPNext instance

```mermaid
sequenceDiagram
participant UI as "UI Action"
participant Hook as "useERPNextClient"
participant Client as "ERPNextMultiClient"
participant Route as "API Route"
participant ERPNext as "ERPNext Instance"
UI->>Hook : Request data
Hook-->>UI : Client
UI->>Client : get("Sales Invoice", name)
Client->>Route : HTTP GET /api/resource/...
Route->>ERPNext : Forward request with headers
ERPNext-->>Route : JSON response
Route-->>UI : JSON response
```

**Diagram sources**
- [use-erpnext-client.ts](file://lib/use-erpnext-client.ts#L40-L55)
- [route.ts](file://app/api/sales/invoices/[name]/route.ts#L34-L41)
- [erpnext-multi.ts](file://lib/erpnext-multi.ts#L24-L69)

**Section sources**
- [use-erpnext-client.ts](file://lib/use-erpnext-client.ts#L40-L55)
- [route.ts](file://app/api/sales/invoices/[name]/route.ts#L9-L48)
- [erpnext-multi.ts](file://lib/erpnext-multi.ts#L24-L69)

## Dependency Analysis
The following diagram highlights key dependencies among core modules:

```mermaid
graph LR
SC["site-context.tsx"] --> SI["site-config.ts"]
SC --> EI["env-config.ts"]
SC --> SM["site-migration.ts"]
UC["use-erpnext-client.ts"] --> SC
UC --> EC["erpnext-multi.ts"]
EC --> AU["erpnext-auth-multi.ts"]
EC --> ET["erpnext.ts"]
AH["api-helpers.ts"] --> EC
AH --> EI
AH --> CR["site-credentials.ts"]
RH["sites/health/route.ts"] --> SI
RV["sites/validate/route.ts"] --> SI
R1["sales/invoices/[name]/route.ts"] --> AH
```

**Diagram sources**
- [site-context.tsx](file://lib/site-context.tsx#L59-L336)
- [site-config.ts](file://lib/site-config.ts#L97-L322)
- [env-config.ts](file://lib/env-config.ts#L264-L342)
- [site-migration.ts](file://lib/site-migration.ts#L80-L157)
- [use-erpnext-client.ts](file://lib/use-erpnext-client.ts#L40-L55)
- [erpnext-multi.ts](file://lib/erpnext-multi.ts#L24-L92)
- [erpnext-auth-multi.ts](file://utils/erpnext-auth-multi.ts#L34-L98)
- [erpnext.ts](file://lib/erpnext.ts#L18-L324)
- [api-helpers.ts](file://lib/api-helpers.ts#L59-L103)
- [site-credentials.ts](file://lib/site-credentials.ts#L25-L73)
- [route.ts](file://app/api/sites/health/route.ts#L26-L91)
- [route.ts](file://app/api/sites/validate/route.ts#L8-L44)
- [route.ts](file://app/api/sales/invoices/[name]/route.ts#L9-L48)

**Section sources**
- [site-context.tsx](file://lib/site-context.tsx#L59-L336)
- [use-erpnext-client.ts](file://lib/use-erpnext-client.ts#L40-L55)
- [erpnext-multi.ts](file://lib/erpnext-multi.ts#L24-L92)
- [api-helpers.ts](file://lib/api-helpers.ts#L59-L103)

## Performance Considerations
- Client memoization: The client hook memoizes the client instance per active site to avoid recreating clients on every render. See [use-erpnext-client.ts](file://lib/use-erpnext-client.ts#L44-L52).
- Parallel site health checks: Health API routes check multiple sites concurrently with timeouts to prevent blocking. See [route.ts](file://app/api/sites/health/route.ts#L41-L76).
- Cache clearing on site switch: Ensures stale data is not reused across sites. See [site-context.tsx](file://lib/site-context.tsx#L112-L122).
- Retry on timestamp mismatch: Submit/cancel operations retry on transient errors with incremental backoff. See [erpnext.ts](file://lib/erpnext.ts#L194-L231).

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
- Site-aware error responses: API helpers classify and enrich errors with site context for easier debugging. See [api-helpers.ts](file://lib/api-helpers.ts#L114-L156).
- Logging site-specific errors: Centralized logging function records context, siteId, and stack traces. See [api-helpers.ts](file://lib/api-helpers.ts#L167-L185).
- Site validation and health: Server-side validation avoids CORS issues and provides structured results. See [route.ts](file://app/api/sites/validate/route.ts#L8-L44) and [route.ts](file://app/api/sites/health/route.ts#L26-L91).
- Migration status: Migration utility tracks completion and errors to avoid repeated migrations. See [site-migration.ts](file://lib/site-migration.ts#L80-L157).

**Section sources**
- [api-helpers.ts](file://lib/api-helpers.ts#L114-L185)
- [route.ts](file://app/api/sites/validate/route.ts#L8-L44)
- [route.ts](file://app/api/sites/health/route.ts#L26-L91)
- [site-migration.ts](file://lib/site-migration.ts#L80-L157)

## Conclusion
The ERP Next System employs a robust, layered architecture that cleanly separates concerns:
- Provider pattern centralizes site state and lifecycle
- Factory pattern enables flexible client creation per site
- Repository-like clients encapsulate data access and error handling
- Strong TypeScript interfaces ensure contract integrity across layers
- Multi-site design isolates authentication, configuration, and data through site context, cookies, and environment-driven credentials

These architectural decisions improve scalability (parallel site checks, memoized clients), maintainability (centralized helpers, validation, and logging), and operability (site-aware error handling and health checks).