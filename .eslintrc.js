module.exports = {
  env: {
    browser: true,
    es2021: true,
    jquery: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    'no-unused-vars': 'warn',
    'no-console': 'off',
    'no-undef': 'off'
  },
  globals: {
    '$': 'readonly',
    'jQuery': 'readonly',
    'backupManager': 'writable'
  }
};
