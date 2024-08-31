/** @type {import('eslint').Linter.Config} */
const config = {
  root: true,
  extends: [
    "@repo/eslint-config/base",
    "@repo/eslint-config/nextjs",
    "@repo/eslint-config/react",
  ],
};

module.exports = config;
