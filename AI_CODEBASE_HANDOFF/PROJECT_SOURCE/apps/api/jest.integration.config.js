module.exports = {
  ...require('./jest.config'),
  testRegex: '.*\\.integration-spec\\.ts$',
  globalSetup: '<rootDir>/test/integration/global-setup.ts',
  setupFiles: ['<rootDir>/test/integration/test-environment.ts'],
  testTimeout: 120000,
};
