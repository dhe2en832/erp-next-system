# Role-Based Menu Access Fix - Bugfix Design

## Overview

The role-based access control (RBAC) for menu navigation is not functioning correctly after the multi-site implementation. All users can see and access all menus regardless of their assigned roles. The root cause is in the `canSeeCategory` function in `app/components/Navbar.tsx`, which incorrectly returns `true` when the roles array is empty or undefined, effectively granting access to all menu categories.

The fix will modify the `canSeeCategory`, `filterItems`, and `filterSubCategories` functions to return `false` (deny access) when roles are not loaded or empty, instead of `true` (grant access). This ensures that menu filtering is secure by default and only shows menus when roles are explicitly verified.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when a user's roles array is empty, undefined, or not yet loaded from the API
- **Property (P)**: The desired behavior - users should see NO menus (except public pages) when roles are not loaded, and should only see role-appropriate menus once roles are loaded
- **Preservation**: Existing behavior for System Manager (see all menus), role-based filtering logic, menu display, navigation, and mobile menu functionality must remain unchanged
- **canSeeCategory**: Function in `Navbar.tsx` that determines if a user can see a menu category based on their roles
- **filterItems**: Function that filters menu items based on `allowedRoles` property
- **filterSubCategories**: Function that filters subcategories and their items based on roles
- **roleCategoryMap**: Mapping object that defines which menu categories each role can access
- **visibleCategories**: Computed array of menu categories that the current user can see after filtering

## Bug Details

### Fault Condition

The bug manifests when a user's roles array is empty, undefined, or not yet loaded from the `/api/setup/auth/me` endpoint. The `canSeeCategory` function incorrectly returns `true` in this scenario, causing all menu categories to be visible regardless of the user's actual roles.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { roles: string[] | undefined | null }
  OUTPUT: boolean
  
  RETURN (input.roles === undefined OR 
          input.roles === null OR 
          input.roles.length === 0)
         AND canSeeCategory_original(anyCategory) === true
END FUNCTION
```

### Examples

- **User "agung" with "Sales User" role**: After login, during the brief moment before API response, roles array is empty → all menus are shown → bug manifests
- **User "deden" with "Sales User" and "Purchase User" roles**: Same issue - sees all menus instead of just Dashboard, Penjualan, Pembelian, and Master Data
- **User with "Accounts User" role**: Sees Penjualan, Pembelian, and Persediaan menus which should be hidden
- **Edge case - API failure**: If `/api/setup/auth/me` fails to load, roles remain empty indefinitely → user continues to see all menus instead of being restricted

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- System Manager users must continue to see all menus without any restrictions
- Role-based filtering logic using `roleCategoryMap` must continue to work correctly once roles are loaded
- Menu navigation, dropdown interactions, and mobile menu drawer must continue to function identically
- The "Laporan" category special logic (show if user has access to at least one sub-item) must continue to work
- Item-level filtering using `allowedRoles` property must continue to work
- Subcategory filtering must continue to work
- localStorage synchronization of roles must continue to work
- Cross-tab synchronization via storage events must continue to work
- Navbar hiding on login, select-site, and select-company pages must continue to work

**Scope:**
All inputs where roles are properly loaded and contain valid role strings should be completely unaffected by this fix. This includes:
- Users with System Manager role seeing all menus
- Users with specific roles seeing their designated menus
- Users with multiple roles seeing the union of their role-based menus
- Menu item filtering based on `allowedRoles` property
- Subcategory filtering in the Laporan section

## Hypothesized Root Cause

Based on the code analysis, the root cause is identified in three functions:

1. **Incorrect Default Behavior in canSeeCategory**: Line 454 in `Navbar.tsx`
   ```typescript
   if (!roles || roles.length === 0) return true;
   ```
   This returns `true` (grant access) when roles are empty, which is the opposite of secure behavior. It should return `false` (deny access) to implement a "deny by default" security model.

2. **Incorrect Default Behavior in filterItems**: Line 479 in `Navbar.tsx`
   ```typescript
   if (!roles || roles.length === 0) return items;
   ```
   This returns all items when roles are empty, instead of returning an empty array.

3. **Incorrect Default Behavior in filterSubCategories**: Line 485 in `Navbar.tsx`
   ```typescript
   if (!roles || roles.length === 0) return subCategories;
   ```
   This returns all subcategories when roles are empty, instead of returning an empty array.

4. **Timing Issue**: The roles array may be empty during initial render before the API call to `/api/setup/auth/me` completes, causing a brief window where all menus are visible.

## Correctness Properties

Property 1: Fault Condition - Deny Access When Roles Not Loaded

_For any_ user state where the roles array is empty, undefined, or null (isBugCondition returns true), the fixed canSeeCategory, filterItems, and filterSubCategories functions SHALL return false, empty array, or empty array respectively, causing NO menu categories to be displayed (except on public pages where navbar is hidden).

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11**

Property 2: Preservation - Existing Role-Based Filtering

_For any_ user state where the roles array is properly loaded with valid role strings (isBugCondition returns false), the fixed functions SHALL produce exactly the same filtering behavior as the original functions, preserving all existing role-based access control logic including System Manager access, roleCategoryMap filtering, allowedRoles filtering, and Laporan category special logic.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `app/components/Navbar.tsx`

**Functions**: `canSeeCategory`, `filterItems`, `filterSubCategories`

**Specific Changes**:

1. **Fix canSeeCategory function** (line 454):
   - Change: `if (!roles || roles.length === 0) return true;`
   - To: `if (!roles || roles.length === 0) return false;`
   - Rationale: Implement "deny by default" - don't show menus when roles are not loaded

2. **Fix filterItems function** (line 479):
   - Change: `if (!roles || roles.length === 0) return items;`
   - To: `if (!roles || roles.length === 0) return [];`
   - Rationale: Return empty array when roles are not loaded, preventing all items from being shown

3. **Fix filterSubCategories function** (line 485):
   - Change: `if (!roles || roles.length === 0) return subCategories;`
   - To: `if (!roles || roles.length === 0) return [];`
   - Rationale: Return empty array when roles are not loaded, preventing all subcategories from being shown

4. **Verify System Manager bypass** (lines 455, 480, 486):
   - Ensure `if (roles.includes('System Manager')) return true;` (or equivalent) comes AFTER the empty roles check
   - This is already correct in the current code - no change needed

5. **Verify roleCategoryMap logic** (lines 456-472):
   - Ensure the role-to-category mapping logic remains unchanged
   - This is already correct - no change needed

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Fault Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm that when roles are empty, all menus are incorrectly shown.

**Test Plan**: Write tests that simulate the component rendering with empty roles array and verify that all menu categories are visible. Run these tests on the UNFIXED code to observe failures and confirm the root cause.

**Test Cases**:
1. **Empty Roles Array Test**: Render Navbar with `roles = []` → expect all categories visible (will fail on unfixed code - should show none)
2. **Undefined Roles Test**: Render Navbar with `roles = undefined` → expect all categories visible (will fail on unfixed code - should show none)
3. **Null Roles Test**: Render Navbar with `roles = null` → expect all categories visible (will fail on unfixed code - should show none)
4. **API Delay Simulation**: Render Navbar before API response → expect all categories visible during loading (will fail on unfixed code - should show none)

**Expected Counterexamples**:
- All menu categories (Dashboard, Penjualan, Pembelian, Kas & Bank, Akunting, Persediaan, Laporan, Komisi, Master Data, Pengaturan) are visible when roles array is empty
- Possible causes: `canSeeCategory` returns `true` instead of `false`, `filterItems` returns all items instead of empty array, `filterSubCategories` returns all subcategories instead of empty array

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds (empty roles), the fixed functions produce the expected behavior (no menus shown).

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := canSeeCategory_fixed(anyCategory, input.roles)
  ASSERT result === false
  
  items := filterItems_fixed(anyItems, input.roles)
  ASSERT items.length === 0
  
  subCats := filterSubCategories_fixed(anySubCategories, input.roles)
  ASSERT subCats.length === 0
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold (roles properly loaded), the fixed functions produce the same result as the original functions.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  FOR ALL category IN menuCategories DO
    ASSERT canSeeCategory_original(category, input.roles) = canSeeCategory_fixed(category, input.roles)
  END FOR
  
  FOR ALL items IN allMenuItems DO
    ASSERT filterItems_original(items, input.roles) = filterItems_fixed(items, input.roles)
  END FOR
  
  FOR ALL subCategories IN allSubCategories DO
    ASSERT filterSubCategories_original(subCategories, input.roles) = filterSubCategories_fixed(subCategories, input.roles)
  END FOR
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain (different role combinations)
- It catches edge cases that manual unit tests might miss (e.g., unusual role combinations)
- It provides strong guarantees that behavior is unchanged for all valid role configurations

**Test Plan**: Observe behavior on UNFIXED code first for various role combinations, then write property-based tests capturing that behavior.

**Test Cases**:
1. **System Manager Preservation**: Observe that System Manager sees all menus on unfixed code, then verify this continues after fix
2. **Sales User Preservation**: Observe that Sales User sees Dashboard, Penjualan, Master Data on unfixed code, then verify this continues after fix
3. **Multiple Roles Preservation**: Observe that user with Sales User + Purchase User sees Dashboard, Penjualan, Pembelian, Master Data on unfixed code, then verify this continues after fix
4. **Accounts User Preservation**: Observe that Accounts User sees Dashboard, Kas & Bank, Akunting, Laporan on unfixed code, then verify this continues after fix
5. **Item-Level Filtering Preservation**: Observe that "Periode Akuntansi" is only visible to Accounts Manager/User on unfixed code, then verify this continues after fix
6. **Laporan Category Logic Preservation**: Observe that Laporan category is shown only if user has access to at least one sub-item on unfixed code, then verify this continues after fix

### Unit Tests

- Test `canSeeCategory` with empty roles array → expect false
- Test `canSeeCategory` with undefined roles → expect false
- Test `canSeeCategory` with null roles → expect false
- Test `canSeeCategory` with System Manager role → expect true for all categories
- Test `canSeeCategory` with Sales User role → expect true for Dashboard, Penjualan, Master Data only
- Test `filterItems` with empty roles → expect empty array
- Test `filterItems` with valid roles → expect filtered items based on allowedRoles
- Test `filterSubCategories` with empty roles → expect empty array
- Test `filterSubCategories` with valid roles → expect filtered subcategories

### Property-Based Tests

- Generate random role combinations and verify that menu filtering matches roleCategoryMap expectations
- Generate random menu configurations with allowedRoles and verify that item filtering works correctly
- Generate random user states (with and without roles) and verify that the fix/preservation properties hold
- Test that for any role combination, the union of accessible categories matches the expected set from roleCategoryMap

### Integration Tests

- Test full login flow: login → verify no menus shown initially → wait for API response → verify correct menus shown based on roles
- Test role switching: login as Sales User → verify correct menus → switch to different user with different roles → verify menus update correctly
- Test mobile menu: verify that mobile menu drawer shows the same filtered menus as desktop navigation
- Test cross-tab synchronization: login in one tab → verify menus update in other tabs when roles are loaded
- Test API failure scenario: simulate API failure → verify that no menus are shown (secure default behavior)
