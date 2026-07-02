import { defineConfig } from "eslint/config";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import unicorn from "eslint-plugin-unicorn";
import { importX } from "eslint-plugin-import-x";
import pluginUnusedImports from "eslint-plugin-unused-imports";
import pluginTailwindcss from "eslint-plugin-tailwindcss";

const here = dirname(fileURLToPath(import.meta.url));
const sourceGlob = "**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}";
// Type-aware linting only runs against the TypeScript that lives under the
// TS project; JS config files at the repo root are intentionally excluded.
const typedGlob = "src/**/*.{ts,tsx,mts,cts}";

// eslint-plugin-tailwindcss reads its cssFiles setting as plain CSS only, so any
// selectors authored in Sass never reach no-custom-classname. Harvest them up
// front and feed them to the rule's whitelist so real class names aren't flagged.
function harvestSassSelectors() {
  const root = join(here, "src");
  const found = new Set();
  for (const file of readdirSync(root, { recursive: true })) {
    if (!file.endsWith(".scss")) continue;
    const contents = readFileSync(join(root, file), "utf8");
    for (const hit of contents.matchAll(/\.([a-zA-Z_][\w-]*)/g)) {
      found.add(hit[1]);
    }
  }
  return [...found];
}

export default defineConfig([
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    files: [sourceGlob],
    plugins: { js },
    ...js.configs.recommended,
  },
  // Point the TS parser at the project so recommendedTypeChecked has the type
  // information its rules depend on.
  {
    files: [typedGlob],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: here,
      },
    },
  },
  ...tseslint.configs.recommendedTypeChecked.map((cfg) => ({
    ...cfg,
    files: [typedGlob],
  })),
  pluginReact.configs.flat.recommended,
  {
    settings: { react: { version: "19.2" } },
  },
  {
    files: [sourceGlob],
    rules: {
      // console.log noise shouldn't ship; warn/error stay available for
      // genuine diagnostics.
      "no-console": ["error", { allow: ["warn", "error"] }],
    },
  },
  {
    // Rewrite `import Foo` used only as a type into `import type Foo`, and split
    // mixed value/type imports inline. Both fixes are applied automatically.
    files: [typedGlob],
    plugins: { "@typescript-eslint": tseslint.plugin },
    rules: {
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-import-type-side-effects": "error",
    },
  },
  {
    // Autofixable modernizations from unicorn: reach for native array/string
    // helpers, node: protocol imports, and terser control flow.
    files: [sourceGlob],
    plugins: { unicorn },
    rules: {
      "unicorn/prefer-node-protocol": "error",
      "unicorn/prefer-includes": "error",
      "unicorn/prefer-set-has": "error",
      "unicorn/prefer-string-starts-ends-with": "error",
      "unicorn/prefer-string-replace-all": "error",
      "unicorn/prefer-array-flat": "error",
      "unicorn/prefer-array-flat-map": "error",
      "unicorn/prefer-array-some": "error",
      "unicorn/prefer-array-find": "error",
      "unicorn/prefer-ternary": ["error", "only-single-line"],
      "unicorn/prefer-single-call": "error",
      "unicorn/no-lonely-if": "error",
      "unicorn/no-zero-fractions": "error",
      "unicorn/no-useless-undefined": ["error", { checkArrowFunctionBody: false }],
      "unicorn/no-instanceof-builtins": ["error", { exclude: ["Function"] }],
      "unicorn/new-for-builtins": "error",
      "unicorn/throw-new-error": "error",
      "unicorn/escape-case": "error",
      // Require a message when constructing an Error so failures aren't blank.
      "unicorn/error-message": "error",
    },
  },
  {
    // Keep import blocks tidy: collapse duplicates, hoist them to the top, trim
    // redundant ../ hops, require a blank line after the block, and reject
    // circular dependencies.
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: { "import-x": importX },
    settings: {
      // Let no-cycle follow baseUrl aliases (e.g. "hooks/useCursorPosition")
      // by resolving them through the TypeScript config.
      "import-x/resolver": {
        typescript: {
          alwaysTryTypes: true,
          project: "./tsconfig.json",
        },
      },
    },
    rules: {
      "import-x/first": "error",
      "import-x/no-duplicates": "error",
      "import-x/newline-after-import": "error",
      "import-x/no-useless-path-segments": "error",
      "import-x/no-cycle": ["error", { maxDepth: 3 }],
    },
  },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: { "unused-imports": pluginUnusedImports },
    rules: {
      "no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "error",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: { tailwindcss: pluginTailwindcss },
    settings: {
      tailwindcss: {
        // v4 compiles the theme from the CSS entry point instead of a JS
        // config, so hand it the stylesheet that pulls Tailwind in. cn/clsx/
        // cva/twMerge are already covered by the plugin's default functions.
        cssConfigPath: "./src/index.css",
      },
    },
    rules: {
      // Surface class names Tailwind never generated — typos like "felx" and
      // classes left stranded after a theme change. Selectors that only live
      // in Sass never reach the compiler, so allow those explicitly.
      "tailwindcss/no-custom-classname": ["error", { whitelist: harvestSassSelectors() }],
      // Collapse mt-4 mb-4 ml-4 mr-4 into m-4, w-4 h-4 into size-4, and so on.
      "tailwindcss/enforces-shorthand": "error",
      // e.g. -top-[5px] rather than top-[-5px]
      "tailwindcss/enforces-negative-arbitrary-values": "error",
      // Favor the built-in scale over arbitrary values (w-4 over w-[16px]).
      "tailwindcss/no-unnecessary-arbitrary-value": "error",
      "tailwindcss/no-contradicting-classname": "error",
    },
  },
  {
    // Triple-slash directives are the normal way ambient declaration files pull
    // in their references, so let them through.
    files: ["**/*.d.ts"],
    rules: {
      "@typescript-eslint/triple-slash-reference": "off",
    },
  },
  {
    // react-three-fiber renders three.js props (args, intensity, decay, ...)
    // that the DOM-focused rule has no knowledge of.
    files: ["src/space3d/**/*.{ts,tsx}"],
    rules: {
      "react/no-unknown-property": "off",
    },
  },
]);
