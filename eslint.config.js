const prettier = require("eslint-plugin-prettier");

module.exports = [
  {
    ignores: [
      "node_modules/**",
      "test-results/**",
      "playwright-report/**",
      ".playwright/**",
      "app.zip",
    ],
  },
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
    },
    plugins: { prettier },
    rules: {
      "prettier/prettier": "error",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
];
