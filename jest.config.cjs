const path = require('path');

// Caminho absoluto para babel.config.cjs
const babelConfigPath = path.resolve(__dirname, 'babel.config.cjs');

/** @type {import('jest').Config} */
module.exports = {
  rootDir: '.',
  preset: 'ts-jest',
  testEnvironment: 'jsdom',

  moduleNameMapper: {
    // Handle aliases with slash
    '^@/api/(.*)$': '<rootDir>/estudio_ia_videos/src/app/api/$1',
    '^@/lib/(.*)$': '<rootDir>/estudio_ia_videos/src/lib/$1',
    '^@/components/(.*)$': '<rootDir>/estudio_ia_videos/src/components/$1',
    '^@/hooks/(.*)$': '<rootDir>/estudio_ia_videos/src/hooks/$1',
    '^@/types/(.*)$': '<rootDir>/estudio_ia_videos/src/types/$1',
    '^@/(.*)$': '<rootDir>/estudio_ia_videos/src/$1',

    // Handle aliases without slash (due to inconsistent usage in codebase)
    '^@api/(.*)$': '<rootDir>/estudio_ia_videos/src/app/api/$1',
    '^@lib/(.*)$': '<rootDir>/estudio_ia_videos/src/lib/$1',
    '^@components/(.*)$': '<rootDir>/estudio_ia_videos/src/components/$1',
    '^@hooks/(.*)$': '<rootDir>/estudio_ia_videos/src/hooks/$1',
    '^@types/(.*)$': '<rootDir>/estudio_ia_videos/src/types/$1',

    // Other mappings
    '^dnd-core$': 'dnd-core/dist/cjs',
    '^react-dnd$': 'react-dnd/dist/cjs',
    '^react-dnd-html5-backend$': 'react-dnd-html5-backend/dist/cjs',
    '^@prisma/client$': '<rootDir>/estudio_ia_videos/node_modules/@prisma/client',
  },

  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          strict: false,
          skipLibCheck: true,
          target: 'ES2020',
          module: 'commonjs',
          moduleResolution: 'node',
          resolveJsonModule: true,
          isolatedModules: true,
        },
      },
    ],
    '^.+\\.(js|jsx|mjs)$': ['babel-jest', { configFile: babelConfigPath }],
  },
// ... (o resto do arquivo permanece o mesmo)


  transformIgnorePatterns: [
    '/node_modules/(?!bullmq|msgpackr|jose|@supabase/auth-helpers-shared|@supabase/auth-helpers-nextjs|dnd-core|react-dnd|react-dnd-html5-backend).+\\.(js|jsx|mjs|cjs|ts|tsx)$',
  ],

  testMatch: [
    '<rootDir>/estudio_ia_videos/src/app/**/__tests__/**/*.test.{ts,tsx}',
    '<rootDir>/estudio_ia_videos/src/app/tests/**/*.test.{ts,tsx}',
  ],

  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/_archive/',
    '<rootDir>/archive/',
    '<rootDir>/estudio_ia_videos/app/e2e/',
    '<rootDir>/tests/e2e/',
    'e2e',
    'vitest',
    'playwright',
  ],
  
  setupFilesAfterEnv: ['<rootDir>/estudio_ia_videos/src/app/jest.setup.js'],
  testTimeout: 120000,
  verbose: true,
  
  // Coverage configuration
  collectCoverageFrom: [
    'estudio_ia_videos/app/lib/**/*.{ts,tsx}',
    'estudio_ia_videos/app/hooks/**/*.{ts,tsx}',
    'estudio_ia_videos/app/api/**/*.{ts,tsx}',
    '!estudio_ia_videos/app/**/*.d.ts',
    '!estudio_ia_videos/app/**/__tests__/**',
    '!estudio_ia_videos/app/**/test/**',
    '!estudio_ia_videos/app/**/*.test.{ts,tsx}',
  ],
  coverageThreshold: {
    global: {
      statements: 70,
      branches: 60,
      functions: 70,
      lines: 70,
    },
  },
  coverageReporters: ['text', 'text-summary', 'lcov', 'html'],
  coverageDirectory: '<rootDir>/estudio_ia_videos/coverage',
};
