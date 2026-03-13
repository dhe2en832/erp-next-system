/**
 * Color Contrast Tests
 * 
 * Verifies that all text/background combinations in the Dashboard Analytics
 * Enhancement components meet WCAG AA standard (4.5:1 contrast ratio).
 * 
 * Requirements: 12.7
 */

import {
  verifyColorContrast,
  getContrastRatio,
  getWCAGLevel,
  COLOR_COMBINATIONS,
} from '../scripts/verify-color-contrast';

describe('Color Contrast Verification', () => {
  describe('getContrastRatio', () => {
    it('should calculate correct contrast ratio for black on white', () => {
      const ratio = getContrastRatio('#000000', '#FFFFFF');
      expect(ratio).toBeCloseTo(21, 1);
    });

    it('should calculate correct contrast ratio for white on black', () => {
      const ratio = getContrastRatio('#FFFFFF', '#000000');
      expect(ratio).toBeCloseTo(21, 1);
    });

    it('should return same ratio regardless of color order', () => {
      const ratio1 = getContrastRatio('#4F46E5', '#FFFFFF');
      const ratio2 = getContrastRatio('#FFFFFF', '#4F46E5');
      expect(ratio1).toBe(ratio2);
    });

    it('should return 1:1 for identical colors', () => {
      const ratio = getContrastRatio('#4F46E5', '#4F46E5');
      expect(ratio).toBeCloseTo(1, 1);
    });
  });

  describe('getWCAGLevel', () => {
    it('should return AAA for ratio >= 7', () => {
      expect(getWCAGLevel(7.0)).toBe('AAA');
      expect(getWCAGLevel(10.0)).toBe('AAA');
      expect(getWCAGLevel(21.0)).toBe('AAA');
    });

    it('should return AA for ratio >= 4.5 and < 7', () => {
      expect(getWCAGLevel(4.5)).toBe('AA');
      expect(getWCAGLevel(5.0)).toBe('AA');
      expect(getWCAGLevel(6.9)).toBe('AA');
    });

    it('should return Fail for ratio < 4.5', () => {
      expect(getWCAGLevel(4.4)).toBe('Fail');
      expect(getWCAGLevel(3.0)).toBe('Fail');
      expect(getWCAGLevel(1.0)).toBe('Fail');
    });
  });

  describe('WCAG AA Compliance', () => {
    const results = verifyColorContrast();

    it('should verify all defined color combinations', () => {
      expect(results.length).toBe(COLOR_COMBINATIONS.length);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should pass WCAG AA standard for all combinations', () => {
      const failed = results.filter((r) => !r.passes);
      
      if (failed.length > 0) {
        const failureDetails = failed
          .map(
            (r) =>
              `\n  - ${r.combination.name}: ${r.contrastRatio}:1 (needs 4.5:1)\n    Text: ${r.combination.textColor} on Background: ${r.combination.backgroundColor}\n    Usage: ${r.combination.usage}`
          )
          .join('');
        
        fail(
          `${failed.length} color combination(s) failed WCAG AA standard:${failureDetails}`
        );
      }
      
      expect(failed.length).toBe(0);
    });

    describe('Primary text combinations', () => {
      it('should pass for primary text on white background', () => {
        const result = results.find(
          (r) => r.combination.name === 'Primary Text on White'
        );
        expect(result).toBeDefined();
        expect(result!.passes).toBe(true);
        expect(result!.contrastRatio).toBeGreaterThanOrEqual(4.5);
      });

      it('should pass for secondary text on white background', () => {
        const result = results.find(
          (r) => r.combination.name === 'Secondary Text on White'
        );
        expect(result).toBeDefined();
        expect(result!.passes).toBe(true);
        expect(result!.contrastRatio).toBeGreaterThanOrEqual(4.5);
      });

      it('should pass for primary text on light gray background', () => {
        const result = results.find(
          (r) => r.combination.name === 'Primary Text on Light Gray'
        );
        expect(result).toBeDefined();
        expect(result!.passes).toBe(true);
        expect(result!.contrastRatio).toBeGreaterThanOrEqual(4.5);
      });

      it('should pass for secondary text on light gray background', () => {
        const result = results.find(
          (r) => r.combination.name === 'Secondary Text on Light Gray'
        );
        expect(result).toBeDefined();
        expect(result!.passes).toBe(true);
        expect(result!.contrastRatio).toBeGreaterThanOrEqual(4.5);
      });
    });

    describe('White text on colored backgrounds', () => {
      it('should pass for white text on indigo background', () => {
        const result = results.find(
          (r) => r.combination.name === 'White Text on Indigo'
        );
        expect(result).toBeDefined();
        expect(result!.passes).toBe(true);
        expect(result!.contrastRatio).toBeGreaterThanOrEqual(4.5);
      });

      it('should pass for white text on red background', () => {
        const result = results.find(
          (r) => r.combination.name === 'White Text on Red'
        );
        expect(result).toBeDefined();
        expect(result!.passes).toBe(true);
        expect(result!.contrastRatio).toBeGreaterThanOrEqual(4.5);
      });

      it('should pass for white text on dark red background', () => {
        const result = results.find(
          (r) => r.combination.name === 'White Text on Dark Red'
        );
        expect(result).toBeDefined();
        expect(result!.passes).toBe(true);
        expect(result!.contrastRatio).toBeGreaterThanOrEqual(4.5);
      });

      it('should pass for white text on green background', () => {
        const result = results.find(
          (r) => r.combination.name === 'White Text on Green'
        );
        expect(result).toBeDefined();
        expect(result!.passes).toBe(true);
        expect(result!.contrastRatio).toBeGreaterThanOrEqual(4.5);
      });

      it('should pass for white text on orange background', () => {
        const result = results.find(
          (r) => r.combination.name === 'White Text on Orange'
        );
        expect(result).toBeDefined();
        expect(result!.passes).toBe(true);
        expect(result!.contrastRatio).toBeGreaterThanOrEqual(4.5);
      });
    });

    describe('Alert banner combinations', () => {
      it('should pass for red text on light red background', () => {
        const result = results.find(
          (r) => r.combination.name === 'Red Text on Light Red Background'
        );
        expect(result).toBeDefined();
        expect(result!.passes).toBe(true);
        expect(result!.contrastRatio).toBeGreaterThanOrEqual(4.5);
      });

      it('should pass for orange text on light orange background', () => {
        const result = results.find(
          (r) => r.combination.name === 'Orange Text on Light Orange Background'
        );
        expect(result).toBeDefined();
        expect(result!.passes).toBe(true);
        expect(result!.contrastRatio).toBeGreaterThanOrEqual(4.5);
      });

      it('should pass for green text on light green background', () => {
        const result = results.find(
          (r) => r.combination.name === 'Green Text on Light Green Background'
        );
        expect(result).toBeDefined();
        expect(result!.passes).toBe(true);
        expect(result!.contrastRatio).toBeGreaterThanOrEqual(4.5);
      });

      it('should pass for indigo text on light indigo background', () => {
        const result = results.find(
          (r) => r.combination.name === 'Indigo Text on Light Indigo Background'
        );
        expect(result).toBeDefined();
        expect(result!.passes).toBe(true);
        expect(result!.contrastRatio).toBeGreaterThanOrEqual(4.5);
      });
    });

    describe('Chart color combinations', () => {
      it('should pass for chart indigo on white', () => {
        const result = results.find(
          (r) => r.combination.name === 'Chart Indigo on White'
        );
        expect(result).toBeDefined();
        expect(result!.passes).toBe(true);
        expect(result!.contrastRatio).toBeGreaterThanOrEqual(4.5);
      });

      it('should pass for chart green on white', () => {
        const result = results.find(
          (r) => r.combination.name === 'Chart Green on White'
        );
        expect(result).toBeDefined();
        expect(result!.passes).toBe(true);
        expect(result!.contrastRatio).toBeGreaterThanOrEqual(4.5);
      });

      it('should pass for chart orange on white', () => {
        const result = results.find(
          (r) => r.combination.name === 'Chart Orange on White'
        );
        expect(result).toBeDefined();
        expect(result!.passes).toBe(true);
        expect(result!.contrastRatio).toBeGreaterThanOrEqual(4.5);
      });

      it('should pass for chart red on white', () => {
        const result = results.find(
          (r) => r.combination.name === 'Chart Red on White'
        );
        expect(result).toBeDefined();
        expect(result!.passes).toBe(true);
        expect(result!.contrastRatio).toBeGreaterThanOrEqual(4.5);
      });

      it('should pass for chart dark red on white', () => {
        const result = results.find(
          (r) => r.combination.name === 'Chart Dark Red on White'
        );
        expect(result).toBeDefined();
        expect(result!.passes).toBe(true);
        expect(result!.contrastRatio).toBeGreaterThanOrEqual(4.5);
      });

      it('should pass for chart gray on white', () => {
        const result = results.find(
          (r) => r.combination.name === 'Chart Gray on White'
        );
        expect(result).toBeDefined();
        expect(result!.passes).toBe(true);
        expect(result!.contrastRatio).toBeGreaterThanOrEqual(4.5);
      });
    });

    describe('Badge combinations', () => {
      it('should pass for red badge', () => {
        const result = results.find(
          (r) => r.combination.name === 'Badge - Red on Light Red'
        );
        expect(result).toBeDefined();
        expect(result!.passes).toBe(true);
        expect(result!.contrastRatio).toBeGreaterThanOrEqual(4.5);
      });

      it('should pass for orange badge', () => {
        const result = results.find(
          (r) => r.combination.name === 'Badge - Orange on Light Orange'
        );
        expect(result).toBeDefined();
        expect(result!.passes).toBe(true);
        expect(result!.contrastRatio).toBeGreaterThanOrEqual(4.5);
      });

      it('should pass for green badge', () => {
        const result = results.find(
          (r) => r.combination.name === 'Badge - Green on Light Green'
        );
        expect(result).toBeDefined();
        expect(result!.passes).toBe(true);
        expect(result!.contrastRatio).toBeGreaterThanOrEqual(4.5);
      });
    });
  });

  describe('Minimum contrast ratios', () => {
    const results = verifyColorContrast();

    it('should have all combinations with ratio >= 4.5:1', () => {
      const belowMinimum = results.filter((r) => r.contrastRatio < 4.5);
      expect(belowMinimum).toHaveLength(0);
    });

    it('should have at least some combinations with AAA level (7:1)', () => {
      const aaaLevel = results.filter((r) => r.wcagLevel === 'AAA');
      expect(aaaLevel.length).toBeGreaterThan(0);
    });

    it('should report correct WCAG levels', () => {
      for (const result of results) {
        if (result.contrastRatio >= 7) {
          expect(result.wcagLevel).toBe('AAA');
        } else if (result.contrastRatio >= 4.5) {
          expect(result.wcagLevel).toBe('AA');
        } else {
          expect(result.wcagLevel).toBe('Fail');
        }
      }
    });
  });

  describe('Color combination coverage', () => {
    const results = verifyColorContrast();
    
    it('should verify primary text colors', () => {
      const primaryTextCombos = results.filter((r) =>
        r.combination.name.includes('Primary Text')
      );
      expect(primaryTextCombos.length).toBeGreaterThan(0);
    });

    it('should verify secondary text colors', () => {
      const secondaryTextCombos = results.filter((r) =>
        r.combination.name.includes('Secondary Text')
      );
      expect(secondaryTextCombos.length).toBeGreaterThan(0);
    });

    it('should verify white text on colored backgrounds', () => {
      const whiteTextCombos = results.filter((r) =>
        r.combination.name.includes('White Text on')
      );
      expect(whiteTextCombos.length).toBeGreaterThanOrEqual(5);
    });

    it('should verify alert banner combinations', () => {
      const alertCombos = results.filter(
        (r) =>
          r.combination.name.includes('on Light') &&
          r.combination.usage.includes('alert')
      );
      expect(alertCombos.length).toBeGreaterThan(0);
    });

    it('should verify chart color combinations', () => {
      const chartCombos = results.filter((r) =>
        r.combination.name.includes('Chart')
      );
      expect(chartCombos.length).toBeGreaterThanOrEqual(6);
    });

    it('should verify badge combinations', () => {
      const badgeCombos = results.filter((r) =>
        r.combination.name.includes('Badge')
      );
      expect(badgeCombos.length).toBeGreaterThan(0);
    });
  });
});
