# Bugfix Requirements Document

## Introduction

The user update functionality in the user management system returns a 405 (Method Not Allowed) error when attempting to update an existing user. This occurs because the frontend sends a PUT request to `/api/setup/users`, but the API route only implements GET and POST methods. This prevents users from editing existing user information such as full name, email, password, roles, and enabled status.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user attempts to update an existing user by submitting the edit form THEN the system returns a 405 (Method Not Allowed) HTTP error

1.2 WHEN the frontend sends a PUT request to `/api/setup/users` with user data THEN the API route rejects the request because no PUT handler exists

1.3 WHEN a user tries to modify user information (full_name, email, password, roles, enabled status) THEN the changes are not saved and an error is displayed

### Expected Behavior (Correct)

2.1 WHEN a user attempts to update an existing user by submitting the edit form THEN the system SHALL successfully process the PUT request and update the user in ERPNext

2.2 WHEN the frontend sends a PUT request to `/api/setup/users` with user data including the user's name identifier THEN the API route SHALL handle the request with a PUT method handler

2.3 WHEN a user modifies user information (full_name, email, password, roles, enabled status) THEN the system SHALL save the changes to ERPNext and display a success message

2.4 WHEN updating a user with a new password THEN the system SHALL update the password in ERPNext

2.5 WHEN updating a user without providing a password THEN the system SHALL update other fields without changing the existing password

2.6 WHEN updating user roles THEN the system SHALL replace the existing roles with the new role assignments

### Unchanged Behavior (Regression Prevention)

3.1 WHEN fetching the list of users THEN the system SHALL CONTINUE TO use the GET method and return all users with their roles

3.2 WHEN creating a new user THEN the system SHALL CONTINUE TO use the POST method and create the user in ERPNext

3.3 WHEN authentication fails THEN the system SHALL CONTINUE TO return a 401 Unauthorized error

3.4 WHEN required fields (email, full_name) are missing during user creation THEN the system SHALL CONTINUE TO return a 400 Bad Request error

3.5 WHEN ERPNext returns an error during user operations THEN the system SHALL CONTINUE TO parse and return the error message appropriately
