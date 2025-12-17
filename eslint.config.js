import globals from 'globals';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import prettierPlugin from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import promisePlugin from 'eslint-plugin-promise';
import nodePlugin from 'eslint-plugin-n';
import securityPlugin from 'eslint-plugin-security';

export default [
  {
    ignores: ['node_modules', 'dist', 'coverage', 'src/generated/**', 'drizzle/**'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      prettier: prettierPlugin,
      import: importPlugin,
      promise: promisePlugin,
      n: nodePlugin,
      security: securityPlugin,
    },
    rules: {
      // Prettier
      ...prettierConfig.rules,
      'prettier/prettier': 'error',

      // TypeScript
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // Import 插件规则
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            ['parent', 'sibling'],
            'index',
            'object',
            'type',
          ],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
          pathGroups: [
            {
              pattern: '@/**',
              group: 'internal',
              position: 'before',
            },
          ],
          pathGroupsExcludedImportTypes: ['builtin'],
        },
      ],
      'import/no-unresolved': 'off', // TypeScript 已经处理
      'import/no-duplicates': 'error',
      'import/no-cycle': 'off', // 后端项目中循环依赖有时难以避免
      'import/no-self-import': 'error',
      'import/newline-after-import': 'error',
      'import/no-named-as-default': 'off', // 与 CommonJS 模块兼容性问题
      'import/no-named-as-default-member': 'off', // 与 CommonJS 模块兼容性问题

      // Promise 插件规则
      'promise/always-return': 'off', // async/await 时代不需要
      'promise/catch-or-return': 'warn',
      'promise/no-return-wrap': 'error',
      'promise/param-names': 'error',
      'promise/no-nesting': 'warn',
      'promise/no-promise-in-callback': 'warn',
      'promise/no-callback-in-promise': 'warn',
      'promise/avoid-new': 'off',
      'promise/no-new-statics': 'error',
      'promise/no-return-in-finally': 'error',
      'promise/valid-params': 'error',

      // Node 插件规则
      'n/no-unsupported-features/es-syntax': 'off', // TypeScript 处理
      'n/no-missing-import': 'off', // TypeScript 处理
      'n/no-unpublished-import': 'off',
      'n/no-process-exit': 'warn',
      'n/no-deprecated-api': 'error',
      'n/prefer-global/buffer': ['error', 'always'],
      'n/prefer-global/console': ['error', 'always'],
      'n/prefer-global/process': ['error', 'always'],
      'n/prefer-promises/dns': 'error',
      'n/prefer-promises/fs': 'error',

      // Security 插件规则
      'security/detect-object-injection': 'off', // 太多误报
      'security/detect-non-literal-regexp': 'warn',
      'security/detect-unsafe-regex': 'error',
      'security/detect-buffer-noassert': 'error',
      'security/detect-child-process': 'warn',
      'security/detect-disable-mustache-escape': 'error',
      'security/detect-eval-with-expression': 'error',
      'security/detect-no-csrf-before-method-override': 'error',
      'security/detect-non-literal-fs-filename': 'off', // 后端常见场景
      'security/detect-non-literal-require': 'warn',
      'security/detect-possible-timing-attacks': 'warn',
      'security/detect-pseudoRandomBytes': 'error',

      // Standard 风格规则
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-arrow-callback': 'error',
      'prefer-template': 'error',
      'object-shorthand': 'error',
      'quote-props': ['error', 'as-needed'],
      'no-console': 'off', // 后端项目需要 console
      'no-debugger': 'error',
      'no-alert': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-return-await': 'off', // @typescript-eslint 处理
      'require-await': 'off', // @typescript-eslint 处理
      'no-throw-literal': 'off', // @typescript-eslint 处理
    },
    settings: {
      'import/resolver': {
        typescript: true,
        node: true,
      },
      'import/parsers': {
        '@typescript-eslint/parser': ['.ts', '.tsx'],
      },
    },
  },
  // 脚本文件和入口文件的特殊规则
  {
    files: ['scripts/**/*.ts', 'src/index.ts', 'src/core/database/migrate.ts', 'src/core/database/seed.ts', 'src/core/config/env.ts'],
    rules: {
      'n/no-process-exit': 'off', // 脚本文件中允许使用 process.exit()
    },
  },
];
