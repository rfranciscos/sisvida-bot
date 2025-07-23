module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  extends: ['eslint:recommended'],
  env: {
    node: true,
    es2022: true,
    jest: true,
  },
  rules: {
    'prefer-const': 'error',
    'no-var': 'error',
    'no-console': 'warn',
    eqeqeq: ['error', 'always'],
    curly: ['error', 'all'],
    'no-duplicate-imports': 'error',
  },
  ignorePatterns: ['dist/**/*', 'node_modules/**/*', 'coverage/**/*'],
};
