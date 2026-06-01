module.exports = {
  env: {
    node: true,
    es2021: true
  },
  parserOptions: {
    ecmaVersion: 12,
    sourceType: "module"
  },
  extends: ["eslint:recommended", "prettier"],
  rules: {
    // you can add or override rules here
    "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }]
  }
};
// 