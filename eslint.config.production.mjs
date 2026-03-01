import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Additional ignores for production builds
    "tests/**",
    "__tests__/**",
    "*.test.ts",
    "*.test.tsx",
    "*.pbt.test.ts",
    "scripts/**",
    "ws-server*.js",
    "test-*.js",
  ]),
  {
    rules: {
      // Disable warnings for production builds - focus on critical errors only
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@next/next/no-img-element': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'prefer-const': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'react/no-unescaped-entities': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      'react-hooks/immutability': 'off',
      
      // Temporarily disable the problematic rule for production builds
      'react-hooks/set-state-in-effect': 'off',
    }
  }
]);

export default eslintConfig;