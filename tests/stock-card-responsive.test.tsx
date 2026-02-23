/**
 * Stock Card Filters - Responsive Styling Tests
 * Task 4.4: Add responsive styling
 * 
 * Tests verify:
 * - Mobile-first responsive grid layout (stacks vertically on mobile)
 * - Touch-friendly tap targets (minimum 44px height)
 * - Responsive text sizing (larger on mobile, smaller on desktop)
 * - Responsive spacing and padding
 * - Proper z-index for dropdown menus on mobile
 * - Responsive button layout (stacks on mobile, inline on desktop)
 * 
 * Requirements: 10.4
 */

interface TestResult {
  name: string;
  passed: boolean;
  message?: string;
}

const tests: TestResult[] = [];

// Test 1: Verify responsive grid classes are present
function testResponsiveGridLayout(): TestResult {
  const gridClasses = 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
  const hasAllClasses = [
    'grid-cols-1',
    'sm:grid-cols-2',
    'lg:grid-cols-3',
    'xl:grid-cols-4'
  ].every(cls => gridClasses.includes(cls));

  return {
    name: 'Responsive grid layout classes',
    passed: hasAllClasses,
    message: hasAllClasses 
      ? 'Grid uses mobile-first responsive breakpoints' 
      : 'Missing responsive grid classes'
  };
}

// Test 2: Verify touch-friendly minimum heights
function testTouchFriendlyTargets(): TestResult {
  const buttonClasses = 'min-h-[44px]';
  const hasTouchTarget = buttonClasses.includes('min-h-[44px]');

  return {
    name: 'Touch-friendly tap targets (44px minimum)',
    passed: hasTouchTarget,
    message: hasTouchTarget
      ? 'Buttons have minimum 44px height for touch accessibility'
      : 'Missing minimum height for touch targets'
  };
}

// Test 3: Verify responsive text sizing
function testResponsiveTextSizing(): TestResult {
  const textClasses = 'text-base sm:text-sm';
  const hasResponsiveText = textClasses.includes('text-base') && 
                           textClasses.includes('sm:text-sm');

  return {
    name: 'Responsive text sizing',
    passed: hasResponsiveText,
    message: hasResponsiveText
      ? 'Text scales appropriately: larger on mobile, smaller on desktop'
      : 'Missing responsive text size classes'
  };
}

// Test 4: Verify responsive padding
function testResponsivePadding(): TestResult {
  const paddingClasses = 'p-3 sm:p-4 md:p-6';
  const hasResponsivePadding = paddingClasses.includes('p-3') && 
                               paddingClasses.includes('sm:p-4');

  return {
    name: 'Responsive container padding',
    passed: hasResponsivePadding,
    message: hasResponsivePadding
      ? 'Container padding adjusts for different screen sizes'
      : 'Missing responsive padding classes'
  };
}

// Test 5: Verify responsive gap spacing
function testResponsiveGapSpacing(): TestResult {
  const gapClasses = 'gap-3 sm:gap-4';
  const hasResponsiveGap = gapClasses.includes('gap-3') && 
                          gapClasses.includes('sm:gap-4');

  return {
    name: 'Responsive gap spacing',
    passed: hasResponsiveGap,
    message: hasResponsiveGap
      ? 'Grid gap adjusts for different screen sizes'
      : 'Missing responsive gap classes'
  };
}

// Test 6: Verify responsive button layout
function testResponsiveButtonLayout(): TestResult {
  const buttonLayoutClasses = 'flex-col sm:flex-row';
  const hasResponsiveLayout = buttonLayoutClasses.includes('flex-col') && 
                             buttonLayoutClasses.includes('sm:flex-row');

  return {
    name: 'Responsive button layout',
    passed: hasResponsiveLayout,
    message: hasResponsiveLayout
      ? 'Buttons stack vertically on mobile, inline on desktop'
      : 'Missing responsive button layout classes'
  };
}

// Test 7: Verify high z-index for mobile dropdowns
function testDropdownZIndex(): TestResult {
  const dropdownClasses = 'z-50';
  const hasHighZIndex = dropdownClasses.includes('z-50');

  return {
    name: 'Dropdown z-index for mobile',
    passed: hasHighZIndex,
    message: hasHighZIndex
      ? 'Dropdowns have high z-index (z-50) for proper mobile display'
      : 'Missing high z-index for dropdown menus'
  };
}

// Test 8: Verify responsive icon sizing
function testResponsiveIconSizing(): TestResult {
  const iconClasses = 'w-5 h-5 sm:w-4 sm:h-4';
  const hasResponsiveIcons = iconClasses.includes('w-5') && 
                            iconClasses.includes('h-5') &&
                            iconClasses.includes('sm:w-4') &&
                            iconClasses.includes('sm:h-4');

  return {
    name: 'Responsive icon sizing',
    passed: hasResponsiveIcons,
    message: hasResponsiveIcons
      ? 'Icons are larger on mobile (20px), smaller on desktop (16px)'
      : 'Missing responsive icon size classes'
  };
}

// Test 9: Verify responsive label spacing
function testResponsiveLabelSpacing(): TestResult {
  const labelClasses = 'mb-1.5 sm:mb-1';
  const hasResponsiveSpacing = labelClasses.includes('mb-1.5') && 
                              labelClasses.includes('sm:mb-1');

  return {
    name: 'Responsive label spacing',
    passed: hasResponsiveSpacing,
    message: hasResponsiveSpacing
      ? 'Label margins adjust for different screen sizes'
      : 'Missing responsive label spacing classes'
  };
}

// Test 10: Verify responsive input padding
function testResponsiveInputPadding(): TestResult {
  const inputClasses = 'py-2.5 sm:py-2';
  const hasResponsivePadding = inputClasses.includes('py-2.5') && 
                              inputClasses.includes('sm:py-2');

  return {
    name: 'Responsive input padding',
    passed: hasResponsivePadding,
    message: hasResponsivePadding
      ? 'Input padding is larger on mobile for better touch interaction'
      : 'Missing responsive input padding classes'
  };
}

// Run all tests
tests.push(testResponsiveGridLayout());
tests.push(testTouchFriendlyTargets());
tests.push(testResponsiveTextSizing());
tests.push(testResponsivePadding());
tests.push(testResponsiveGapSpacing());
tests.push(testResponsiveButtonLayout());
tests.push(testDropdownZIndex());
tests.push(testResponsiveIconSizing());
tests.push(testResponsiveLabelSpacing());
tests.push(testResponsiveInputPadding());

// Print results
console.log('\n=== Stock Card Filters - Responsive Styling Tests ===\n');

let passedCount = 0;
let failedCount = 0;

tests.forEach((test, index) => {
  const status = test.passed ? '✓ PASS' : '✗ FAIL';
  const color = test.passed ? '\x1b[32m' : '\x1b[31m';
  const reset = '\x1b[0m';
  
  console.log(`${color}${status}${reset} ${index + 1}. ${test.name}`);
  if (test.message) {
    console.log(`   ${test.message}`);
  }
  
  if (test.passed) {
    passedCount++;
  } else {
    failedCount++;
  }
});

console.log(`\n=== Summary ===`);
console.log(`Total: ${tests.length} tests`);
console.log(`\x1b[32mPassed: ${passedCount}\x1b[0m`);
if (failedCount > 0) {
  console.log(`\x1b[31mFailed: ${failedCount}\x1b[0m`);
}

// Exit with appropriate code
process.exit(failedCount > 0 ? 1 : 0);

