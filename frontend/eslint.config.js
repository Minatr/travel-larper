// ESLint flat configuration: `npm run lint`, `make lint` and the CI.
import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import jsdoc from 'eslint-plugin-jsdoc'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      jsdoc.configs['flat/recommended-typescript-error'],
    ],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
    rules: {
      // CLAUDE.md: every exported function, hook, component and type has a
      // JSDoc comment.
      'jsdoc/require-jsdoc': [
        'error',
        {
          publicOnly: true,
          require: {
            FunctionDeclaration: true,
            ArrowFunctionExpression: true,
            FunctionExpression: true,
          },
          contexts: ['TSTypeAliasDeclaration', 'TSInterfaceDeclaration'],
        },
      ],
      // Types already document parameters and return values; comments
      // explain the why, not the what.
      'jsdoc/require-param': 'off',
      'jsdoc/require-returns': 'off',
    },
  },
  // Must stay last: turns off the rules that conflict with Prettier.
  prettier,
])
