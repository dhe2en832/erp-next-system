# User Update 405 Fix - Bugfix Design

## Overview

The user management system currently returns a 405 (Method Not Allowed) error when attempting to update existing users because the `/api/setup/users` route only implements GET and POST methods. This fix adds a PUT method handler to enable user updates while preserving all existing functionality for user listing (GET) and creation (POST).

The fix follows the bug condition methodology: identify inputs that trigger the bug (PUT requests), implement the expected behavior (successful user updates), and ensure preservation of existing behaviors (GET and POST operations remain unchanged).

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when a PUT request is sent to `/api/setup/users` with user update data
- **Property (P)**: The desired behavior when PUT requests are sent - users should be successfully updated in ERPNext with modified fields
- **Preservation**: Existing GET (list users) and POST (create user) behaviors that must remain unchanged by the fix
- **handleUserUpdate**: The new PUT handler function in `app/api/setup/users/route.ts` that processes user update requests
- **editingName**: The user identifier (name field) passed in the request body to identify which user to update

## Bug Details

### Fault Condition

The bug manifests when a user submits the edit form in the user management interface. The frontend sends a PUT request to `/api/setup/users` with the user's updated data, but the API route does not have a PUT method handler, causing Next.js to return a 405 (Method Not Allowed) error.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type HTTPRequest
  OUTPUT: boolean
  
  RETURN input.method == 'PUT'
         AND input.url == '/api/setup/users'
         AND input.body.name IS_DEFINED
         AND NOT putHandlerExists()
END FUNCTION
```

### Examples

- **Example 1**: User edits "John Doe" to change full_name to "John Smith" → Frontend sends PUT request → Server returns 405 error → Changes not saved
- **Example 2**: User updates email from "john@old.com" to "john@new.com" → Frontend sends PUT request → Server returns 405 error → Email not updated
- **Example 3**: User adds "Sales Manager" role to existing user → Frontend sends PUT request → Server returns 405 error → Role not added
- **Example 4**: User changes password for existing user → Frontend sends PUT request → Server returns 405 error → Password not changed
- **Edge Case**: User updates user with empty password field → Should update other fields without changing password

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- GET requests to `/api/setup/users` must continue to return the list of users with their roles
- POST requests to `/api/setup/users` must continue to create new users with the same validation and error handling
- Authentication checks (API key or session cookie) must continue to work for all methods
- Error handling for ERPNext API failures must continue to parse and return error messages correctly
- Required field validation for user creation must remain unchanged

**Scope:**
All inputs that do NOT involve PUT requests to `/api/setup/users` should be completely unaffected by this fix. This includes:
- GET requests for listing users
- POST requests for creating new users
- All other API routes in the system
- Frontend user interface and form validation

## Hypothesized Root Cause

Based on the bug description and code analysis, the root cause is clear:

1. **Missing PUT Handler**: The `app/api/setup/users/route.ts` file only exports GET and POST functions
   - The file has no `export async function PUT()` declaration
   - Next.js App Router requires explicit method handlers for each HTTP method
   - Without a PUT handler, Next.js automatically returns 405 for PUT requests

2. **Frontend Expectation Mismatch**: The frontend (`app/users/page.tsx`) correctly sends PUT requests when editing
   - Line 127: `method: isEdit ? 'PUT' : 'POST'`
   - The frontend includes the user identifier in the body: `name: editingName`
   - This follows the same pattern used successfully in other modules (invoices, purchase orders, etc.)

3. **No Alternative Route**: Unlike some other modules that use `/api/resource/[name]` pattern for updates, the users module uses a single route for all operations

## Correctness Properties

Property 1: Fault Condition - User Update Success

_For any_ HTTP request where the method is PUT, the URL is `/api/setup/users`, and the request body contains a valid user identifier (name field) along with update data, the fixed API route SHALL successfully update the user in ERPNext and return a success response with the updated user data.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6**

Property 2: Preservation - Existing Method Behaviors

_For any_ HTTP request that is NOT a PUT request to `/api/setup/users` (specifically GET and POST requests), the fixed API route SHALL produce exactly the same behavior as the original code, preserving user listing functionality, user creation functionality, authentication checks, and error handling.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

**File**: `app/api/setup/users/route.ts`

**Function**: New `PUT` export function

**Specific Changes**:

1. **Add PUT Method Handler**: Export a new async function named `PUT` that accepts `NextRequest` parameter
   - Follow the same structure as the existing POST handler
   - Use the same authentication mechanism via `getAuthHeaders()`
   - Extract user identifier from request body (`name` field)

2. **Extract and Validate Request Data**: Parse the request body and validate required fields
   - Extract: `name` (user identifier), `email`, `full_name`, `new_password`, `roles`, `enabled`
   - Validate that `name` field exists (required to identify which user to update)
   - Validate that at least one field is being updated

3. **Build Update Payload**: Construct the ERPNext API payload for user update
   - Include only fields that are provided in the request
   - Handle password updates conditionally (only include `new_password` if provided)
   - Transform roles array to ERPNext format: `roles.map(role => ({ role }))`
   - Split `full_name` into `first_name` and `last_name` for ERPNext compatibility

4. **Call ERPNext API**: Send PUT request to ERPNext's User resource endpoint
   - URL: `${ERPNEXT_API_URL}/api/resource/User/${encodeURIComponent(name)}`
   - Method: PUT
   - Headers: Include authentication headers from `getAuthHeaders()`
   - Body: JSON stringified update payload

5. **Handle Response and Errors**: Process ERPNext response and return appropriate status
   - On success: Return 200 with success message and updated user data
   - On error: Parse `_server_messages` field (same logic as POST handler)
   - Handle authentication errors (401)
   - Handle validation errors (400)
   - Handle server errors (500)

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Fault Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm that PUT requests currently fail with 405 errors.

**Test Plan**: Write tests that send PUT requests to `/api/setup/users` with valid user update data. Run these tests on the UNFIXED code to observe 405 failures and confirm the root cause.

**Test Cases**:
1. **Update Full Name Test**: Send PUT request to update user's full_name (will fail with 405 on unfixed code)
2. **Update Email Test**: Send PUT request to update user's email (will fail with 405 on unfixed code)
3. **Update Password Test**: Send PUT request with new_password field (will fail with 405 on unfixed code)
4. **Update Roles Test**: Send PUT request to modify user roles (will fail with 405 on unfixed code)
5. **Update Without Password Test**: Send PUT request without password field (will fail with 405 on unfixed code)

**Expected Counterexamples**:
- All PUT requests return 405 (Method Not Allowed) status code
- Response body indicates the method is not allowed
- Root cause confirmed: No PUT handler exists in the route file

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := handleUserUpdate_fixed(input)
  ASSERT result.status == 200
  ASSERT result.body.success == true
  ASSERT userUpdatedInERPNext(input.body.name, input.body)
END FOR
```

**Test Cases**:
1. **Update Full Name**: Verify full_name is updated in ERPNext
2. **Update Email**: Verify email is updated in ERPNext
3. **Update Password**: Verify password is changed (test by logging in with new password)
4. **Update Roles**: Verify roles are replaced with new role assignments
5. **Update Enabled Status**: Verify user can be enabled/disabled
6. **Update Without Password**: Verify other fields update without changing password
7. **Update Multiple Fields**: Verify multiple fields can be updated simultaneously

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT handleUserOperations_original(input) = handleUserOperations_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-PUT requests

**Test Plan**: Observe behavior on UNFIXED code first for GET and POST requests, then write property-based tests capturing that behavior.

**Test Cases**:
1. **GET Request Preservation**: Observe that fetching user list works correctly on unfixed code, then verify this continues after fix
   - Verify same users are returned
   - Verify roles are fetched for each user
   - Verify pagination and filtering work the same
2. **POST Request Preservation**: Observe that creating new users works correctly on unfixed code, then verify this continues after fix
   - Verify same validation rules apply
   - Verify same error messages are returned
   - Verify same success response format
3. **Authentication Preservation**: Verify authentication checks work the same for all methods
   - Verify 401 is returned when no credentials provided
   - Verify API key authentication works
   - Verify session cookie authentication works
4. **Error Handling Preservation**: Verify ERPNext error parsing works the same
   - Verify `_server_messages` parsing logic unchanged
   - Verify error message formatting unchanged

### Unit Tests

- Test PUT handler with valid user update data (full_name, email, password, roles, enabled)
- Test PUT handler with missing `name` field (should return 400)
- Test PUT handler with invalid authentication (should return 401)
- Test PUT handler with password update (should include new_password in payload)
- Test PUT handler without password (should not include new_password in payload)
- Test PUT handler with role updates (should format roles correctly)
- Test error handling when ERPNext returns validation errors
- Test error handling when ERPNext returns server errors

### Property-Based Tests

- Generate random user update payloads and verify they are processed correctly
- Generate random combinations of fields to update and verify partial updates work
- Generate random role combinations and verify role updates work correctly
- Test that GET and POST requests continue to work across many scenarios with different authentication methods

### Integration Tests

- Test full user update flow: fetch user list → open edit dialog → modify fields → submit → verify changes in ERPNext
- Test updating user and then fetching user list to see updated data
- Test creating a user (POST) and then updating it (PUT) in sequence
- Test authentication flow for all three methods (GET, POST, PUT)
- Test error scenarios: network failures, ERPNext downtime, invalid data
