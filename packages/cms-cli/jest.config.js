const path = require('path');

module.exports = {
  testRegex: '((\\.|/)(spec))\\.[jt]sx?$',
  rootDir: path.join(__dirname, './__tests__'),
  setupFiles: ['./utils/cmd.js'],
};