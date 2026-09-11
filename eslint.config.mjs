import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  {
    // Legacy PHP app and build artifacts are never linted.
    ignores: [
      'public_html/**',
      'rules/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/.turbo/**',
      '**/coverage/**',
      '**/generated/**',
      '**/node_modules/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    // Everything in this repo runs on Node (Nest API, build scripts, config
    // files). Browser-specific globals are added per-app in the Next.js phase.
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node },
    },
  },

  {
    rules: {
      // --- Security-relevant rules (see rules/01-security-rules.md) ---
      // Never pass user input to a dynamic code evaluator.
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',

      // Secrets must never be printed. console.* is allowed only via the
      // app's logger, which redacts. Direct console use is a warning so it
      // surfaces in review rather than shipping silently.
      'no-console': 'warn',

      // --- Correctness ---
      '@typescript-eslint/no-floating-promises': 'off', // needs type-aware linting; enabled per-app in Phase 1
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },

  {
    // Enforce centralised secret handling: nothing reads process.env directly
    // except the env package itself. This is what stops a hardcoded-or-ad-hoc
    // secret read from creeping back in (the exact failure mode found in the
    // legacy PHP config files).
    files: ['apps/**/*.ts', 'apps/**/*.tsx', 'packages/**/*.ts'],
    ignores: ['packages/env/**'],
    rules: {
      'no-restricted-properties': [
        'error',
        {
          object: 'process',
          property: 'env',
          message:
            'Do not read process.env directly. Import the validated config from @laptopmitra/env instead.',
        },
      ],
    },
  },

  {
    // CLI scripts and test files are the one place console output IS the
    // interface, so the no-console warning would be pure noise here.
    files: ['**/scripts/**', '**/*.test.ts', '**/*.spec.ts', '*.mjs', '*.config.*'],
    rules: {
      'no-console': 'off',
    },
  },

  // Prettier last — turns off all stylistic rules that would conflict.
  prettier,
);
