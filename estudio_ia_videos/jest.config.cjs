const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

/** @type {import('jest').Config} */
module.exports = {
  rootDir: '.',
  testEnvironment: 'jsdom',
  cacheDirectory: '<rootDir>/../tmp/jest-cache',

  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        module: 'commonjs',
        moduleResolution: 'node',
        strict: false,
        skipLibCheck: true,
        noEmit: true,
        paths: compilerOptions.paths,
        baseUrl: '.',
      },
    }],
    '^.+\\.(js|jsx)$': ['babel-jest', { presets: [require.resolve('next/babel', { paths: [__dirname] })] }],
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
    '/node_modules/(?!bullmq|msgpackr|jose|next-auth|@panva|preact-render-to-string|@supabase/auth-helpers-shared|@supabase/auth-helpers-nextjs|dnd-core|react-dnd|react-dnd-html5-backend).+\\.(js|jsx|mjs|cjs|ts|tsx)$',
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
    // Arquivos de setup e mocks
    '.*setup\\.ts$',
    '.*mocks.*\\.ts$',
    '.*mock\\.ts$',
    // Testes de páginas que requerem ambiente completo do Next.js
    '.*page\\.test\\.tsx$',
  ],

  setupFilesAfterEnv: ['<rootDir>/src/app/jest.setup.js'],
  testTimeout: 120000,
  verbose: true,

  // Force exit after all tests complete — some module-level setInterval/Redis
  // connections in queue modules keep worker processes alive. The .unref() fix
  // in cache-invalidation.ts mitigates the main culprit, but BullMQ queue 
  // modules (render-queue.ts, video-processing.queue.ts) create Redis connections
  // at module scope that can't be easily cleaned up in test workers.
  forceExit: true,
};
