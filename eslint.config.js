import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import svelte from 'eslint-plugin-svelte';
import svelteParser from 'svelte-eslint-parser';
import globals from 'globals';

export default [
  js.configs.recommended,
  ...svelte.configs['flat/recommended'],
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
      },
      globals: {
        ...globals.browser,
        ...globals.es2021
      }
    },
    plugins: {
      '@typescript-eslint': tseslint
    },
    rules: {
      'no-undef': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }]
    }
  },
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parser: svelteParser,
      parserOptions: {
        parser: tsparser,
        extraFileExtensions: ['.svelte']
      },
      globals: {
        ...globals.browser,
        ...globals.es2021
      }
    },
    rules: {
      'no-undef': 'off'
    }
  },
  {
    files: ['vite.config.ts', 'svelte.config.js', 'eslint.config.js'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2021
      }
    }
  },
  {
    ignores: ['.svelte-kit/**', 'dist/**', 'build/**', 'src-tauri/target/**']
  }
];
