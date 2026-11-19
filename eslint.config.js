import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/node_modules/**', '**/dist/**', '**/.angular/**', 'coverage/**', 'reports/**', '.local-data/**', 'marketing-site/**', 'release/**', 'apps/desktop/stage/**', 'apps/desktop/src-tauri/target/**', 'apps/desktop/src-tauri/gen/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' }],
      'no-control-regex': 'off',
      'no-restricted-syntax': [
        'error',
        { selector: "Literal[value=/rebound\\/rebound-ops|Projects\\/rebound\\//]", message: 'References to legacy project paths are forbidden.' },
      ],
    },
  },
  {
    files: ['apps/web/**/*.ts'],
    rules: { 'no-restricted-properties': ['error', { property: 'innerHTML', message: 'Untrusted text must never be rendered as HTML.' }] },
  },
);
