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
  globalSetup: './test/jest-e2e-local.setup.ts',
  testTimeout: 120000,
};

export default config;
