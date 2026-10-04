// Flat ESLint configuration for the Command Center.
//
// Next.js 15.1 does not yet export a native flat config, so the legacy
// shareable configs are bridged with FlatCompat. Once on a Next version that
// exports flat config directly, replace the compat block with a direct import.
//
// Note: eslint-config-next resolves its own plugin dependencies (typescript,
// react, react-hooks, jsx-a11y, import) relative to itself via
// @rushstack/eslint-patch, so it works under pnpm's strict node_modules layout.
// Only @eslint/eslintrc must be declared as an explicit dependency.

import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const config = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'next-env.d.ts',
      '**/*.d.ts',
      'public/**',
    ],
  },

  ...compat.extends('next/core-web-vitals', 'next/typescript'),

  {
    rules: {
      // §229: the platform must never silently claim success. Silently
      // swallowed errors are how that happens, so they are an error here.
      'no-empty': ['error', { allowEmptyCatch: false }],

      // Unused code is a defect signal, not a style preference. Leading
      // underscore opts a binding out deliberately.
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      // §141 zero-trust / §86 server-side authorization. `==` on ids and
      // tokens hides type coercion bugs in exactly the code that makes access
      // decisions.
      eqeqeq: ['error', 'always', { null: 'ignore' }],
    },
  },

  {
    // Config files run in Node and are CommonJS-ish tooling, not app code.
    files: ['*.config.{js,mjs,ts}', 'eslint.config.mjs'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
];

export default config;