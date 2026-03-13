/**
 * Color Contrast Verification Script
 * 
 * Verifies that all text/background combinations in the Dashboard Analytics
 * Enhancement components meet WCAG AA standard (4.5:1 contrast ratio).
 * 
 * Requirements: 12.7
 */

interface ColorCombination {
  name: string;
  textColor: string;
  backgroundColor: string;
  usage: string;
}

interface ContrastResult {
  combination: ColorCombination;
  contrastRatio: number;
  passes: boolean;
  wcagLevel: 'AAA' | 'AA' | 'Fail';
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

/**
 * Calculate relative luminance
 * https://www.w3.org/TR/WCAG20-TECHS/G17.html
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const sRGB = c / 255;
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 * https://www.w3.org/TR/WCAG20-TECHS/G17.html
 */
function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
  
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Determine WCAG level based on contrast ratio
 */
function getWCAGLevel(ratio: number): 'AAA' | 'AA' | 'Fail' {
  if (ratio >= 7) return 'AAA';
  if (ratio >= 4.5) return 'AA';
  return 'Fail';
}

/**
 * All text/background combinations used in analytics components
 */
const COLOR_COMBINATIONS: ColorCombination[] = [
  // Primary text on white backgrounds
  {
    name: 'Primary Text on White',
    textColor: '#111827', // text-gray-900
    backgroundColor: '#FFFFFF', // bg-white
    usage: 'Card titles, chart labels, primary content',
  },
  {
    name: 'Secondary Text on White',
    textColor: '#4B5563', // text-gray-600
    backgroundColor: '#FFFFFF', // bg-white
    usage: 'Descriptions, secondary labels, metadata',
  },
  
  // Text on gray backgrounds
  {
    name: 'Primary Text on Light Gray',
    textColor: '#111827', // text-gray-900
    backgroundColor: '#F9FAFB', // bg-gray-50
    usage: 'Card content on light gray backgrounds',
  },
  {
    name: 'Secondary Text on Light Gray',
    textColor: '#4B5563', // text-gray-600
    backgroundColor: '#F9FAFB', // bg-gray-50
    usage: 'Secondary content on light gray backgrounds',
  },
  
  // White text on colored backgrounds
  {
    name: 'White Text on Indigo',
    textColor: '#FFFFFF', // text-white
    backgroundColor: '#4F46E5', // bg-indigo-600
    usage: 'Primary buttons, badges, chart elements',
  },
  {
    name: 'White Text on Red',
    textColor: '#FFFFFF', // text-white
    backgroundColor: '#DC2626', // CHART_COLORS.red (WCAG AA compliant)
    usage: 'Error alerts, critical badges',
  },
  {
    name: 'White Text on Dark Red',
    textColor: '#FFFFFF', // text-white
    backgroundColor: '#B91C1C', // CHART_COLORS.redDark (bad debt emphasis)
    usage: 'Bad debt indicators, critical warnings',
  },
  {
    name: 'White Text on Green',
    textColor: '#FFFFFF', // text-white
    backgroundColor: '#047857', // CHART_COLORS.green (WCAG AA compliant)
    usage: 'Success indicators, positive metrics',
  },
  {
    name: 'White Text on Orange',
    textColor: '#FFFFFF', // text-white
    backgroundColor: '#B45309', // CHART_COLORS.orange (WCAG AA compliant)
    usage: 'Warning indicators, needs attention',
  },
  
  // Text on colored light backgrounds (alerts/banners)
  {
    name: 'Red Text on Light Red Background',
    textColor: '#991B1B', // text-red-800
    backgroundColor: '#FEE2E2', // bg-red-50
    usage: 'Error alert text',
  },
  {
    name: 'Orange Text on Light Orange Background',
    textColor: '#92400E', // text-orange-800
    backgroundColor: '#FEF3C7', // bg-orange-50
    usage: 'Warning alert text',
  },
  {
    name: 'Green Text on Light Green Background',
    textColor: '#065F46', // text-green-800
    backgroundColor: '#D1FAE5', // bg-green-50
    usage: 'Success alert text',
  },
  {
    name: 'Indigo Text on Light Indigo Background',
    textColor: '#312E81', // text-indigo-800
    backgroundColor: '#E0E7FF', // bg-indigo-50
    usage: 'Info alert text',
  },
  
  // Chart colors (used in Recharts)
  {
    name: 'Chart Indigo on White',
    textColor: '#4F46E5', // CHART_COLORS.indigo
    backgroundColor: '#FFFFFF',
    usage: 'Chart bars, lines, primary data visualization',
  },
  {
    name: 'Chart Green on White',
    textColor: '#047857', // CHART_COLORS.green (WCAG AA compliant)
    backgroundColor: '#FFFFFF',
    usage: 'Success metrics in charts',
  },
  {
    name: 'Chart Orange on White',
    textColor: '#B45309', // CHART_COLORS.orange (WCAG AA compliant)
    backgroundColor: '#FFFFFF',
    usage: 'Warning metrics in charts',
  },
  {
    name: 'Chart Red on White',
    textColor: '#DC2626', // CHART_COLORS.red (WCAG AA compliant)
    backgroundColor: '#FFFFFF',
    usage: 'Danger/critical metrics in charts',
  },
  {
    name: 'Chart Dark Red on White',
    textColor: '#B91C1C', // CHART_COLORS.redDark (bad debt emphasis)
    backgroundColor: '#FFFFFF',
    usage: 'Bad debt visualization',
  },
  {
    name: 'Chart Gray on White',
    textColor: '#6B7280', // CHART_COLORS.gray
    backgroundColor: '#FFFFFF',
    usage: 'Neutral data, grid lines',
  },
  
  // Badge combinations
  {
    name: 'Badge - Red on Light Red',
    textColor: '#7F1D1D', // text-red-900
    backgroundColor: '#FEE2E2', // bg-red-100
    usage: 'Reorder badge, critical status',
  },
  {
    name: 'Badge - Orange on Light Orange',
    textColor: '#78350F', // text-orange-900
    backgroundColor: '#FED7AA', // bg-orange-100
    usage: 'Warning badge, needs attention',
  },
  {
    name: 'Badge - Green on Light Green',
    textColor: '#14532D', // text-green-900
    backgroundColor: '#D1FAE5', // bg-green-100
    usage: 'Success badge, positive status',
  },
];

/**
 * Verify all color combinations
 */
function verifyColorContrast(): ContrastResult[] {
  const results: ContrastResult[] = [];
  
  for (const combination of COLOR_COMBINATIONS) {
    const contrastRatio = getContrastRatio(
      combination.textColor,
      combination.backgroundColor
    );
    
    const wcagLevel = getWCAGLevel(contrastRatio);
    const passes = contrastRatio >= 4.5;
    
    results.push({
      combination,
      contrastRatio: Math.round(contrastRatio * 100) / 100,
      passes,
      wcagLevel,
    });
  }
  
  return results;
}

/**
 * Print results to console
 */
function printResults(results: ContrastResult[]): void {
  console.log('\n='.repeat(80));
  console.log('COLOR CONTRAST VERIFICATION RESULTS');
  console.log('WCAG AA Standard: 4.5:1 minimum contrast ratio');
  console.log('='.repeat(80));
  
  const passed = results.filter((r) => r.passes);
  const failed = results.filter((r) => !r.passes);
  
  console.log(`\n✓ PASSED: ${passed.length}/${results.length} combinations`);
  console.log(`✗ FAILED: ${failed.length}/${results.length} combinations\n`);
  
  // Print all results
  for (const result of results) {
    const status = result.passes ? '✓' : '✗';
    const statusColor = result.passes ? '\x1b[32m' : '\x1b[31m';
    const resetColor = '\x1b[0m';
    
    console.log(`${statusColor}${status}${resetColor} ${result.combination.name}`);
    console.log(`  Text: ${result.combination.textColor}`);
    console.log(`  Background: ${result.combination.backgroundColor}`);
    console.log(`  Contrast Ratio: ${result.contrastRatio}:1 (${result.wcagLevel})`);
    console.log(`  Usage: ${result.combination.usage}`);
    console.log('');
  }
  
  // Summary
  console.log('='.repeat(80));
  if (failed.length === 0) {
    console.log('✓ ALL COLOR COMBINATIONS PASS WCAG AA STANDARD');
  } else {
    console.log('✗ SOME COLOR COMBINATIONS FAIL WCAG AA STANDARD');
    console.log('\nFailed combinations:');
    for (const result of failed) {
      console.log(`  - ${result.combination.name}: ${result.contrastRatio}:1`);
    }
  }
  console.log('='.repeat(80) + '\n');
}

/**
 * Main execution
 */
if (require.main === module) {
  const results = verifyColorContrast();
  printResults(results);
  
  // Exit with error code if any combinations fail
  const failedCount = results.filter((r) => !r.passes).length;
  process.exit(failedCount > 0 ? 1 : 0);
}

export { verifyColorContrast, getContrastRatio, getWCAGLevel, COLOR_COMBINATIONS };
