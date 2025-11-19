module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'babel-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/main.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  // setupFiles runs BEFORE test environment is set up (before modules are loaded)
  // This is needed to set DATABASE_URL with worker-specific schema before Prisma Client is created
  setupFiles: ['<rootDir>/test/test-setup.ts'],
  // setupFilesAfterEnv runs AFTER test environment is set up (supports async)
  // This is used to actually create the database schema (async operation)
  setupFilesAfterEnv: ['<rootDir>/test/setup-after-env.ts'],
  testTimeout: 30000,
  // maxWorkers configuration for parallel execution:
  // - 1: Sequential execution (test dijalankan satu per satu) - Paling lambat tapi paling stabil
  // - 2: Parallel dengan 2 workers - Test dibagi ke 2 worker yang berjalan bersamaan
  // - '50%': Uses 50% of CPU cores (balanced) - Contoh: 8 cores = 4 workers
  // - '100%': Uses all CPU cores - Paling cepat tapi butuh lebih banyak resource
  // - Number: Uses specific number of workers (e.g., 4 = 4 workers)
  // Project has database-per-worker setup (schema per worker), so parallel is safe
  // Recommended: 2-4 workers untuk balance antara speed dan resource usage
  maxWorkers: '50%', // 2 workers untuk parallel execution yang optimal
  forceExit: true, // Force exit after tests complete
  detectOpenHandles: true, // Detect open handles
};

