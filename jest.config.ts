import type { Config } from 'jest';

const config: Config = {
  rootDir: '.',
  moduleFileExtensions: ['js', 'json', 'ts'],
  testEnvironment: 'node',
  testRegex: '.*\\.spec\\.ts$', // 테스트 파일 패턴
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@app/(.*)$': '<rootDir>/libs/$1/src',
    '^@app/(.*)/(.*)$': '<rootDir>/libs/$1/src/$2',
  },
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  collectCoverage: true,
  collectCoverageFrom: [
    'apps/**/*.ts',
    'libs/**/*.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/test/**',
    '!**/*.module.ts', // Nest 모듈 제외
    '!**/main.ts', // 엔트리 제외
  ],
  coverageDirectory: '<rootDir>/coverage',
};

export default config;
