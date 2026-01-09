import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import pluginImport from 'eslint-plugin-import';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const ignores = [
  '**/node_modules/**',
  '**/.git/**',
  '**/.next/**',
  '**/dist/**',
  '**/build/**',
  '**/coverage/**',
  '**/archive/**',
  '**/_archive/**',
  '**/_Fases_REAL/**',
  '**/___BIBLIOTECAS/**',
  '**/legacy/**',
  '**/*-legacy/**',
  '**/pages_old_backup/**',
  '**/backups_*/**',
  '**/__tests__/**',
  '**/tests/**',
  '**/test-results/**',
  '**/tmp/**',
  '**/temp/**',
  '**/videos/**',
  '**/storage/**',
  '**/evidencias/**',
  '**/monitoring/**',
  '**/nginx/**',
  '**/redis/**',
  '**/supabase/**',
  '**/fail2ban/**',
  '**/avatar-pipeline/**',
  '**/ugc-video-generator/**',
  'logs/**',
  'app/**', // Ignora a pasta 'app' na raiz, que parece ser antiga/duplicada
  'components/**', // Ignora a pasta 'components' na raiz
  'public/**', // Ignora a pasta 'public' na raiz
];

export default tseslint.config(
  {
    ignores,
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    files: ['estudio_ia_videos/app/api/v1/video-jobs/**/*.ts'],
    rules: {
      // API Routes são bordas de integração: req.json() e Supabase ainda expõem tipos amplos.
      // Mantemos validação Zod + tipagem no domínio (app/lib/video-jobs), e relaxamos apenas aqui.
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
    },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-undef': 'off', // Desativa para scripts JS legados que usam 'require', 'process', etc.
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      import: pluginImport,
    },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: ['tsconfig.json', 'estudio_ia_videos/tsconfig.json', 'estudio_ia_videos/app/tsconfig.json'],
        },
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': ['error', { ignoreRestArgs: false }],
      '@typescript-eslint/ban-ts-comment': ['warn', { 'ts-ignore': true }],
      'import/order': [
        'warn',
        {
          groups: [
            ['builtin', 'external'],
            ['internal'],
            ['parent', 'sibling', 'index'],
            ['type'],
          ],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
    },
  },
  eslintConfigPrettier,
);
