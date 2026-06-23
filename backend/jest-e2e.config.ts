import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '\\.e2e-spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', {
      tsconfig: {
        isolatedModules: true,
      },
    }],
  },
  testEnvironment: 'node',
  globalSetup: './test/jest-e2e.setup.ts',
  testTimeout: 30000,
};

export default config;
