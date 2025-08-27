import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '../',
  testRegex: '.*\\.e2e-spec\\.ts$', // e2e 테스트는 *.e2e-spec.ts 네이밍
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  moduleNameMapper: {
    '^@app/(.*)$': '<rootDir>/libs/$1/src',
  },
  testEnvironment: 'node',
};

export default config;
