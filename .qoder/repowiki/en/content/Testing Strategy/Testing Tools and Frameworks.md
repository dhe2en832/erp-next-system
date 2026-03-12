# Testing Tools and Frameworks

<cite>
**Referenced Files in This Document**
- [package.json](file://package.json)
- [README-INTEGRATION-TESTS.md](file://__tests__/README-INTEGRATION-TESTS.md)
- [csrf-protection.test.ts](file://__tests__/csrf-protection.test.ts)
- [input-sanitization.test.ts](file://__tests__/input-sanitization.test.ts)
- [sales-return-api.test.ts](file://__tests__/sales-return-api.test.ts)
- [sales-return-ui.test.ts](file://__tests__/sales-return-ui.test.ts)
- [sales-invoice-cache-update-integration.test.ts](file://__tests__/sales-invoice-cache-update-integration.test.ts)
- [api-routes-utility-backward-compatibility.pbt.test.ts](file://__tests__/api-routes-utility-backward-compatibility.pbt.test.ts)
- [csrf-protection.ts](file://lib/csrf-protection.ts)
- [input-sanitization.ts](file://lib/input-sanitization.ts)
- [api-responses.property.test.ts](file://tests/property/api-responses.property.test.ts)
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
10. [Appendices](#appendices)

## Introduction
This document describes the testing tools, frameworks, and utilities used in the ERP Next System testing strategy. It covers the testing infrastructure, custom utilities for CSRF protection validation, input sanitization testing, and API route auditing. It also explains property-based testing, mocking frameworks, and test data generation, along with continuous integration setup, test coverage reporting, and automated testing pipelines. Guidance is provided for test environment configuration, debugging test failures, and maintaining the test infrastructure, including best practices, performance testing approaches, and scalability considerations for large test suites.

## Project Structure
The testing strategy is organized across several areas:
- Unit and custom utilities tests under __tests__/
- Property-based tests leveraging fast-check
- Integration tests validating end-to-end workflows
- Property tests for API response consistency under tests/property/

Key characteristics:
- Property-based tests are implemented using fast-check for broad input coverage.
- Custom test runners are used for specific utilities (CSRF protection, input sanitization).
- Integration tests coordinate between Next.js APIs and ERPNext backend services.
- Scripts in package.json orchestrate targeted test runs.

```mermaid
graph TB
subgraph "Testing Infrastructure"
PJSON["package.json<br/>Scripts and Dev Dependencies"]
UT["Unit Tests (__tests__)"]
PT["Property Tests (tests/property)"]
IT["Integration Tests (__tests__)"]
end
subgraph "Custom Utilities"
CSRF["lib/csrf-protection.ts"]
SAN["lib/input-sanitization.ts"]
end
PJSON --> UT
PJSON --> PT
PJSON --> IT
UT --> CSRF
UT --> SAN
IT --> CSRF
IT --> SAN
```

**Diagram sources**
- [package.json](file://package.json#L1-L152)
- [csrf-protection.ts](file://lib/csrf-protection.ts#L1-L238)
- [input-sanitization.ts](file://lib/input-sanitization.ts#L1-L280)

**Section sources**
- [package.json](file://package.json#L1-L152)

## Core Components
This section outlines the primary testing components and their roles.

- Custom CSRF Protection Utilities
  - Validates authentication method and CSRF token requirements.
  - Adds CSRF tokens when needed and enforces protection on state-changing requests.
  - Used by both unit and integration tests to ensure secure API interactions.

- Input Sanitization Utilities
  - Provides functions to sanitize strings, objects, emails, URLs, dates, filenames, numbers, booleans, and arrays.
  - Includes middleware and request body sanitization helpers.
  - Tested via dedicated unit tests to ensure XSS prevention and data integrity.

- Property-Based Testing Libraries
  - fast-check is used extensively for property-based tests across API responses and utility route compatibility.
  - Enables broad input space exploration and robustness validation.

- Mocking and Test Data Generation
  - While explicit mocking frameworks are not imported in the referenced files, property-based tests generate synthetic data to validate behavior across inputs.
  - Integration tests simulate external service interactions (ERPNext backend) and validate responses.

- API Route Auditing
  - Property-based tests validate response structure, field names, and data types for migrated utility routes.
  - Ensures backward compatibility with legacy implementations.

**Section sources**
- [csrf-protection.ts](file://lib/csrf-protection.ts#L1-L238)
- [input-sanitization.ts](file://lib/input-sanitization.ts#L1-L280)
- [api-routes-utility-backward-compatibility.pbt.test.ts](file://__tests__/api-routes-utility-backward-compatibility.pbt.test.ts#L1-L724)
- [api-responses.property.test.ts](file://tests/property/api-responses.property.test.ts#L1-L225)

## Architecture Overview
The testing architecture integrates custom utilities, property-based tests, and integration tests to validate both internal logic and external API interactions.

```mermaid
graph TB
subgraph "Test Orchestration"
PJ["package.json scripts"]
UT["Unit Tests (__tests__/*.test.ts)"]
PT["Property Tests (tests/property/*.test.ts)"]
IT["Integration Tests (__tests__/*integration*.test.ts)"]
end
subgraph "Custom Utilities"
CSRF["CSRF Protection (lib/csrf-protection.ts)"]
SAN["Input Sanitization (lib/input-sanitization.ts)"]
end
subgraph "External Systems"
NEXT["Next.js API"]
ERP["ERPNext Backend"]
end
PJ --> UT
PJ --> PT
PJ --> IT
UT --> CSRF
UT --> SAN
IT --> CSRF
IT --> SAN
IT --> NEXT
IT --> ERP
```

**Diagram sources**
- [package.json](file://package.json#L1-L152)
- [csrf-protection.ts](file://lib/csrf-protection.ts#L1-L238)
- [input-sanitization.ts](file://lib/input-sanitization.ts#L1-L280)
- [sales-invoice-cache-update-integration.test.ts](file://__tests__/sales-invoice-cache-update-integration.test.ts#L1-L655)

## Detailed Component Analysis

### CSRF Protection Validation
The CSRF protection utilities validate authentication method detection, CSRF token requirement, and enforcement on state-changing requests. The unit tests exercise these functions with various scenarios, including API key authentication (immune to CSRF), session-based authentication requiring CSRF tokens, and GET vs POST protections.

```mermaid
sequenceDiagram
participant Test as "CSRF Test Runner"
participant CSRF as "CSRF Utils"
participant Env as "Environment"
Test->>Env : Set ERP_API_KEY/ERP_API_SECRET
Test->>CSRF : validateCSRFProtection()
CSRF-->>Test : {protected, method, message}
Test->>CSRF : isRequestProtected(headers)
CSRF-->>Test : boolean
Test->>CSRF : validateRequestCSRFProtection(request)
CSRF-->>Test : boolean or throws
Test->>CSRF : addCSRFTokenIfNeeded(headers, sessionId)
CSRF-->>Test : headers with CSRF token (if applicable)
```

**Diagram sources**
- [csrf-protection.test.ts](file://__tests__/csrf-protection.test.ts#L1-L206)
- [csrf-protection.ts](file://lib/csrf-protection.ts#L1-L238)

**Section sources**
- [csrf-protection.test.ts](file://__tests__/csrf-protection.test.ts#L1-L206)
- [csrf-protection.ts](file://lib/csrf-protection.ts#L1-L238)

### Input Sanitization Testing
The input sanitization utilities provide robust sanitization for strings, objects, HTML, emails, URLs, dates, filenames, numbers, booleans, and arrays. The unit tests validate XSS prevention, data type handling, and error conditions.

```mermaid
flowchart TD
Start(["Sanitize Input"]) --> Detect["Detect Input Type"]
Detect --> |String| S1["Remove dangerous tags and attributes"]
S1 --> Encode["Encode special HTML characters"]
Encode --> Trim["Trim whitespace"]
Trim --> Return1["Return sanitized string"]
Detect --> |Object| S2["Recursively sanitize string values"]
S2 --> Return2["Return sanitized object"]
Detect --> |Email| E1["Validate format and normalize"]
E1 --> Return3["Return sanitized email"]
Detect --> |URL| U1["Reject dangerous protocols"]
U1 --> Return4["Return sanitized URL"]
Detect --> |Date| D1["Validate format and date"]
D1 --> Return5["Return sanitized date"]
Detect --> |Filename| F1["Remove path traversal and invalid chars"]
F1 --> Return6["Return sanitized filename"]
Detect --> |Number| N1["Convert and validate numeric input"]
N1 --> Return7["Return sanitized number"]
Detect --> |Boolean| B1["Convert and validate boolean input"]
B1 --> Return8["Return sanitized boolean"]
Detect --> |Array| A1["Sanitize string array items"]
A1 --> Return9["Return sanitized array"]
```

**Diagram sources**
- [input-sanitization.test.ts](file://__tests__/input-sanitization.test.ts#L1-L305)
- [input-sanitization.ts](file://lib/input-sanitization.ts#L1-L280)

**Section sources**
- [input-sanitization.test.ts](file://__tests__/input-sanitization.test.ts#L1-L305)
- [input-sanitization.ts](file://lib/input-sanitization.ts#L1-L280)

### API Route Auditing (Property-Based)
Property-based tests validate response structure, field names, and data types for migrated utility routes, ensuring backward compatibility with legacy implementations. They generate synthetic inputs and assert properties across many combinations.

```mermaid
sequenceDiagram
participant Test as "Property Test Runner"
participant FC as "fast-check"
participant Legacy as "Legacy Response Generator"
participant Modern as "Modern Response Generator"
participant Validator as "Response Validator"
Test->>FC : fc.property(...)
FC->>Legacy : Generate inputs -> LegacyResponse
FC->>Modern : Generate inputs -> ModernResponse
FC->>Validator : validateResponseStructure()
Validator-->>FC : boolean
FC-->>Test : assert(property holds)
```

**Diagram sources**
- [api-routes-utility-backward-compatibility.pbt.test.ts](file://__tests__/api-routes-utility-backward-compatibility.pbt.test.ts#L1-L724)

**Section sources**
- [api-routes-utility-backward-compatibility.pbt.test.ts](file://__tests__/api-routes-utility-backward-compatibility.pbt.test.ts#L1-L724)

### Sales Return Management (Property-Based)
Property-based tests validate core business properties for sales returns, including delivery note linkage, initial draft status, list filtering, unique return number generation, and detailed display.

```mermaid
flowchart TD
A["Generate Sales Return Configurations"] --> B["Create Delivery Note"]
B --> C["Create Sales Return"]
C --> D{"Validate Properties"}
D --> |Draft Status| P1["Initial Draft Status"]
D --> |Linkage| P2["Delivery Note Linkage"]
D --> |Filtering| P3["List Filtering"]
D --> |Uniqueness| P4["Unique Return Number"]
D --> |Details| P5["Complete Detail Display"]
P1 --> E["Assert and Report"]
P2 --> E
P3 --> E
P4 --> E
P5 --> E
```

**Diagram sources**
- [sales-return-api.test.ts](file://__tests__/sales-return-api.test.ts#L1-L1257)
- [sales-return-ui.test.ts](file://__tests__/sales-return-ui.test.ts#L1-L1545)

**Section sources**
- [sales-return-api.test.ts](file://__tests__/sales-return-api.test.ts#L1-L1257)
- [sales-return-ui.test.ts](file://__tests__/sales-return-ui.test.ts#L1-L1545)

### Sales Invoice Cache Update Integration
Integration tests validate the end-to-end workflow from API creation to ERPNext UI display, including error handling, concurrent operations, and cross-module integration. They also include property-based tests across many invoice configurations.

```mermaid
sequenceDiagram
participant Test as "Integration Test"
participant Next as "Next.js API"
participant ERP as "ERPNext Backend"
participant CN as "Credit Note Flow"
Test->>Next : POST /api/sales/invoices
Next-->>Test : {success, data{name}}
Test->>ERP : GET /api/resource/Sales Invoice/{name}
ERP-->>Test : {docstatus, status, items...}
Test->>CN : Attempt Credit Note
CN-->>Test : Allowed/Blocked based on status
Test->>ERP : DELETE /api/resource/Sales Invoice/{name}
```

**Diagram sources**
- [sales-invoice-cache-update-integration.test.ts](file://__tests__/sales-invoice-cache-update-integration.test.ts#L1-L655)

**Section sources**
- [sales-invoice-cache-update-integration.test.ts](file://__tests__/sales-invoice-cache-update-integration.test.ts#L1-L655)
- [README-INTEGRATION-TESTS.md](file://__tests__/README-INTEGRATION-TESTS.md#L1-L224)

### API Response Consistency (Property-Based)
Property-based tests validate universal API response properties, including standardized success/data/message fields, consistent data types, and graceful error handling.

```mermaid
flowchart TD
Start(["Generate API Response"]) --> CheckSuccess["Check success field type"]
CheckSuccess --> CheckData["Check data field type (array)"]
CheckData --> CheckMessage["Check message field (string or undefined)"]
CheckMessage --> ValidateItems["Validate item structures"]
ValidateItems --> End(["Assert Property Holds"])
```

**Diagram sources**
- [api-responses.property.test.ts](file://tests/property/api-responses.property.test.ts#L1-L225)

**Section sources**
- [api-responses.property.test.ts](file://tests/property/api-responses.property.test.ts#L1-L225)

## Dependency Analysis
The testing stack relies on:
- fast-check for property-based testing across multiple test suites.
- Custom test runners for CSRF and input sanitization utilities.
- Integration tests orchestrated via package.json scripts that call ts-node with project configuration.

```mermaid
graph TB
PJ["package.json"]
FC["fast-check"]
TS["ts-node / tsconfig.scripts.json"]
UT["__tests__/*.test.ts"]
PT["tests/property/*.test.ts"]
IT["__tests__/*integration*.test.ts"]
PJ --> UT
PJ --> PT
PJ --> IT
UT --> FC
PT --> FC
IT --> FC
PJ --> TS
```

**Diagram sources**
- [package.json](file://package.json#L1-L152)
- [api-responses.property.test.ts](file://tests/property/api-responses.property.test.ts#L1-L225)
- [api-routes-utility-backward-compatibility.pbt.test.ts](file://__tests__/api-routes-utility-backward-compatibility.pbt.test.ts#L1-L724)

**Section sources**
- [package.json](file://package.json#L1-L152)

## Performance Considerations
- Property-based tests use fast-check with configurable numRuns to balance coverage and runtime.
- Integration tests coordinate multiple HTTP requests; timeouts and retries should be considered for CI stability.
- Use targeted scripts to run subsets of tests during development and full suites in CI.
- Prefer synthetic data generation over heavy fixtures to reduce setup overhead.

## Troubleshooting Guide
Common issues and resolutions:
- Missing environment variables for integration tests:
  - Ensure ERPNEXT_API_URL, ERP_API_KEY, ERP_API_SECRET, and NEXT_API_URL are set.
  - Refer to the integration test README for environment setup and prerequisites.

- ERPNext backend connectivity:
  - Verify ERPNext is reachable and responds to API calls.
  - Check credentials and network connectivity.

- Test timeouts:
  - Increase timeouts in test files if backend is slow.
  - Optimize database and network performance.

- Cleanup of test data:
  - Integration tests include cleanup routines; manual cleanup may be required if interrupted.

- Debugging property-based failures:
  - Reduce numRuns temporarily to isolate failing cases.
  - Use verbose logging to inspect generated inputs and assertions.

**Section sources**
- [README-INTEGRATION-TESTS.md](file://__tests__/README-INTEGRATION-TESTS.md#L132-L224)
- [sales-invoice-cache-update-integration.test.ts](file://__tests__/sales-invoice-cache-update-integration.test.ts#L578-L655)

## Conclusion
The ERP Next System employs a comprehensive testing strategy combining custom utilities, property-based testing, and integration tests. fast-check ensures broad input coverage, while custom CSRF and sanitization utilities are validated through dedicated unit tests. Integration tests coordinate with ERPNext to validate end-to-end workflows and cross-module behavior. Scripts in package.json streamline test execution, and the architecture supports scalable growth with targeted and property-based approaches.

## Appendices
- Continuous Integration Setup:
  - Configure environment variables in CI (ERPNEXT_API_URL, ERP_API_KEY, ERP_API_SECRET).
  - Start ERPNext and Next.js services prior to running tests.
  - Execute targeted scripts via pnpm test:<suite-name> to run specific test suites.

- Test Coverage Reporting:
  - No coverage configuration is present in the referenced files; consider integrating a coverage tool if needed.

- Maintaining Test Infrastructure:
  - Keep property-based tests focused on invariant properties.
  - Regularly update integration tests to reflect backend changes.
  - Maintain clear separation between unit, property, and integration tests for easier maintenance and debugging.