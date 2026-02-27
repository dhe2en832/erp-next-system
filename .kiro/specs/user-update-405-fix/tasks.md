# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Fault Condition** - PUT Request Returns 405 Error
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to concrete failing cases - PUT requests to `/api/setup/users` with valid user update data
  - Test that PUT requests to `/api/setup/users` with user update data (name, email, full_name, roles) return 405 status code
  - The test assertions should match the Expected Behavior Properties from design: after fix, PUT requests should return 200 with success response
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS with 405 status (this is correct - it proves the bug exists)
  - Document counterexamples found:
    - PUT request with full_name update returns 405
    - PUT request with email update returns 405
    - PUT request with password update returns 405
    - PUT request with roles update returns 405
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - GET and POST Method Behaviors
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs (GET and POST requests)
  - Observe: GET `/api/setup/users` returns user list with roles
  - Observe: POST `/api/setup/users` creates new users with validation
  - Observe: Authentication checks work for both GET and POST
  - Observe: Error handling parses `_server_messages` correctly
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements:
    - For all GET requests, response contains user list with same structure
    - For all POST requests with valid data, users are created with same validation
    - For all requests without auth, 401 is returned
    - For all ERPNext errors, same error parsing logic applies
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Fix for User Update 405 Error

  - [x] 3.1 Add PUT method handler to users API route
    - Export new async function `PUT` in `app/api/setup/users/route.ts`
    - Accept `NextRequest` parameter
    - Use same authentication mechanism via `getAuthHeaders()`
    - _Bug_Condition: isBugCondition(input) where input.method == 'PUT' AND input.url == '/api/setup/users' AND input.body.name IS_DEFINED_
    - _Expected_Behavior: result.status == 200 AND result.body.success == true AND userUpdatedInERPNext(input.body.name, input.body)_
    - _Preservation: GET and POST behaviors unchanged, authentication checks preserved, error handling preserved_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 3.2 Extract and validate request data
    - Parse request body to extract: name, email, full_name, new_password, roles, enabled
    - Validate that `name` field exists (required to identify user)
    - Validate that at least one field is being updated
    - Return 400 error if validation fails
    - _Requirements: 2.1, 2.2_

  - [x] 3.3 Build update payload for ERPNext
    - Include only fields provided in the request
    - Handle password conditionally (only include `new_password` if provided)
    - Transform roles array to ERPNext format: `roles.map(role => ({ role }))`
    - Split `full_name` into `first_name` and `last_name` for ERPNext compatibility
    - _Requirements: 2.3, 2.4, 2.5_

  - [x] 3.4 Call ERPNext API to update user
    - Send PUT request to `${ERPNEXT_API_URL}/api/resource/User/${encodeURIComponent(name)}`
    - Include authentication headers from `getAuthHeaders()`
    - Send JSON stringified update payload
    - _Requirements: 2.6_

  - [x] 3.5 Handle response and errors
    - On success: Return 200 with success message and updated user data
    - On error: Parse `_server_messages` field (same logic as POST handler)
    - Handle authentication errors (401)
    - Handle validation errors (400)
    - Handle server errors (500)
    - _Requirements: 2.6, 3.4_

  - [x] 3.6 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - PUT Request Successfully Updates User
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - Verify PUT requests return 200 status
    - Verify response contains success message
    - Verify user is actually updated in ERPNext
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 3.7 Verify preservation tests still pass
    - **Property 2: Preservation** - GET and POST Method Behaviors
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Verify GET requests still return user list correctly
    - Verify POST requests still create users correctly
    - Verify authentication still works for all methods
    - Verify error handling still works the same
    - Confirm all tests still pass after fix (no regressions)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4. Checkpoint - Ensure all tests pass
  - Run all tests (exploration test + preservation tests)
  - Verify exploration test passes (bug is fixed)
  - Verify preservation tests pass (no regressions)
  - Ensure all tests pass, ask the user if questions arise
