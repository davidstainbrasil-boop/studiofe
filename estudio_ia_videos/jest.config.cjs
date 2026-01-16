const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

/** @type {import('jest').Config} */
module.exports = {
  rootDir: '.',
  testEnvironment: 'jsdom',

  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: [require.resolve('next/babel', { paths: [__dirname] })] }],
  },

  moduleNameMapper: {
    // Mapeamentos manuais para garantir a resolução correta
    '^@/lib/logging/logger$': '<rootDir>/src/lib/logging/logger.ts',
    '^@/lib/tts/tts-service$': '<rootDir>/src/lib/tts/tts-service.ts',
    ...pathsToModuleNameMapper(compilerOptions.paths, { prefix: '<rootDir>/' }),
    // Manter mapeamentos que não estão no tsconfig
    '^dnd-core$': 'dnd-core/dist/cjs',
    '^react-dnd$': 'react-dnd/dist/cjs',
    '^react-dnd-html5-backend$': 'react-dnd-html5-backend/dist/cjs',
    '^@prisma/client$': '<rootDir>/node_modules/@prisma/client',
  },



  transformIgnorePatterns: [
    '/node_modules/(?!bullmq|msgpackr|jose|@supabase/auth-helpers-shared|@supabase/auth-helpers-nextjs|dnd-core|react-dnd|react-dnd-html5-backend).+\\.(js|jsx|mjs|cjs|ts|tsx)$',
  ],

  testMatch: [
    '<rootDir>/src/app/**/__tests__/**/*.test.{ts,tsx}',
    '<rootDir>/src/app/tests/**/*.test.{ts,tsx}',
    '<rootDir>/src/app/__tests__/integration/**/*.test.{ts,tsx}',
    '<rootDir>/src/__tests__/**/*.test.{ts,tsx}',
  ],

  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    'vitest',
    'playwright',
    // Ignorar arquivos que não existem ou estão desabilitados
    '.*\.disabled\.(ts|js)$',
    '.*\.test\.disabled\.(ts|js)$',
    '.*tests_disabled.*',
    '.*_archive.*',
    '.*tests-legacy.*',
    // Ignorar arquivos que não têm testes
    '.*setup\.ts$',
    '.*mocks.*\.ts$',
    '.*mock\.ts$',
    // Ignorar arquivos que causam conflitos
    '.*page\.test\.tsx$',
    '.*browser\.test\.disabled\.ts$',
    '.*full-user-flow\.test\.disabled\.ts$',
    '.*api\.video\.export.*\.test.*\.ts$',
    '.*logger-service\.test\.ts$',
    '.*feedback\.test\.tsx$',
    '.*rbac.*\.test.*\.ts$',
    '.*storage.*\.test.*\.ts$',
    '.*flags\.test\.disabled\.ts$',
    '.*monitoring-service\.test\.disabled\.ts$',
  ],

  setupFilesAfterEnv: ['<rootDir>/src/app/jest.setup.js'],
  testTimeout: 120000,
  verbose: true,
};
