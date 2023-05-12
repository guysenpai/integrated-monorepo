/* eslint-disable */
export default {
  displayName: 'nx-release',
  preset: '../../jest.preset.js',
  setupFilesAfterEnv: ['jest-extended/all'],
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }]
  },
  moduleFileExtensions: ['ts', 'js', 'json', 'html'],
  coverageDirectory: '../../coverage/packages/nx-release',
  testEnvironment: 'node'
};
