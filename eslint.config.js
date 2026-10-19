// ESLint (#36) : règles recommandées, sans règle de style (Prettier s'en charge). npm run lint
const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
  {
    ignores: [
      "node_modules/",
      "coverage/",
      "reports/",
      "screenshots/",
      "test-results/",
      "playwright-report/",
      ".stryker-tmp/",
    ],
  },
  js.configs.recommended,
  {
    rules: {
      "no-empty": ["error", { allowEmptyCatch: true }], // stockage, voix, réveil : un échec du navigateur ne doit rien bloquer
      "no-unused-vars": ["error", { ignoreRestSiblings: true }], // const { kind, ...e } = m : tout sauf kind
    },
  },
  // l'app : modules ES dans le navigateur
  {
    files: ["js/**/*.js"],
    languageOptions: { sourceType: "module", globals: globals.browser },
  },
  // service worker de l'app hors ligne (#40)
  {
    files: ["sw.js"],
    languageOptions: { sourceType: "script", globals: globals.serviceworker },
  },
  // tests unitaires : modules ES sous Node
  {
    files: ["tests/unit/**/*.js"],
    languageOptions: { sourceType: "module", globals: globals.node },
  },
  // scripts, configurations et tests de bout en bout : CommonJS sous Node ; le code passé à page.evaluate tourne dans la page
  {
    files: ["*.js", "scripts/**/*.js", "tests/server.js"],
    languageOptions: { sourceType: "commonjs", globals: globals.node },
  },
  {
    files: ["tests/e2e/**/*.js", "tests/screenshots/**/*.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: { ...globals.node, ...globals.browser },
    },
    rules: { "no-unused-vars": ["error", { args: "none" }] },
  }, // ({ app }) charge la page même sans s'en servir
];
