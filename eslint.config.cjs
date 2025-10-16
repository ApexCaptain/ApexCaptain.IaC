const {
    defineConfig,
    globalIgnores,
} = require("eslint/config");

const {
    fixupConfigRules,
    fixupPluginRules,
} = require("@eslint/compat");

const typescriptEslint = require("@typescript-eslint/eslint-plugin");
const _import = require("eslint-plugin-import");
const globals = require("globals");
const tsParser = require("@typescript-eslint/parser");
const js = require("@eslint/js");

const {
    FlatCompat,
} = require("@eslint/eslintrc");

const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

module.exports = defineConfig([globalIgnores([
    "**/node_modules/*",
    "eslint.config.cjs",
    "**/lib/",
    "scripts/generated/",
    "!**/.projenrc.ts",
    "!projenrc/**/*.ts",
]), {
    files: ["src/**/*.ts", "scripts/**/*.ts", "**/.projenrc.ts"],
    extends: fixupConfigRules(compat.extends("plugin:import/typescript", "plugin:prettier/recommended")),

    plugins: {
        "@typescript-eslint": typescriptEslint,
        import: fixupPluginRules(_import),
    },

    languageOptions: {
        globals: {
            ...globals.jest,
            ...globals.node,
        },

        parser: tsParser,
        ecmaVersion: 2018,
        sourceType: "module",

        parserOptions: {
            project: "./tsconfig.dev.json",
        },
    },

    settings: {
        "import/parsers": {
            "@typescript-eslint/parser": [".ts", ".tsx"],
        },

        "import/resolver": {
            node: {},

            typescript: {
                project: "./tsconfig.dev.json",
                alwaysTryTypes: true,
            },
        },
    },

    rules: {
        curly: ["error", "multi-line", "consistent"],
        "@typescript-eslint/no-require-imports": "error",

        "import/no-extraneous-dependencies": ["error", {
            devDependencies: ["**/scripts/**", ".projenrc.ts", "projenrc/**/*.ts"],
            optionalDependencies: false,
            peerDependencies: true,
        }],

        "import/no-unresolved": ["error"],

        "import/order": ["warn", {
            groups: ["builtin", "external"],

            alphabetize: {
                order: "asc",
                caseInsensitive: true,
            },
        }],

        "import/no-duplicates": ["error"],
        "no-shadow": ["off"],
        "@typescript-eslint/no-shadow": "error",
        "@typescript-eslint/no-floating-promises": "error",
        "no-return-await": ["off"],
        "@typescript-eslint/return-await": "error",
        "dot-notation": ["error"],
        "no-bitwise": ["error"],

        "@typescript-eslint/member-ordering": ["error", {
            default: [
                "public-static-field",
                "public-static-method",
                "protected-static-field",
                "protected-static-method",
                "private-static-field",
                "private-static-method",
                "field",
                "constructor",
                "method",
            ],
        }],
    },
}, {
    files: ["**/.projenrc.ts"],

    rules: {
        "@typescript-eslint/no-require-imports": "off",
        "import/no-extraneous-dependencies": "off",
    },
}]);