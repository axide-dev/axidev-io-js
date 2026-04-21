import path from "node:path";
import { builtinModules } from "node:module";
import typescript from "@rollup/plugin-typescript";
import dts from "rollup-plugin-dts";

const nodeBuiltins = new Set([
  ...builtinModules,
  ...builtinModules.map((moduleName) => `node:${moduleName}`),
]);

const external = (id) => nodeBuiltins.has(id) || id.startsWith("node:");
const mainEntryIds = new Set([
  "./index",
  path.resolve("src/index"),
  path.resolve("src/index.ts"),
]);

function isMainEntryExternal(id) {
  return mainEntryIds.has(id);
}

const cjsFooter = `
const __cjsModuleDescriptors = Object.assign(
  {},
  Object.getOwnPropertyDescriptors(exports.default ?? {}),
  Object.getOwnPropertyDescriptors(exports),
);
delete __cjsModuleDescriptors.default;
module.exports = Object.freeze(Object.defineProperties({}, __cjsModuleDescriptors));
`;

function createJsBuild({
  input,
  file,
  format,
  additionalExternal = [],
  externalPaths = {},
}) {
  const externalIds = new Set(additionalExternal);

  return {
    input,
    external: (id) =>
      external(id) ||
      externalIds.has(id) ||
      (externalIds.has("./index") && isMainEntryExternal(id)),
    output: {
      file,
      format,
      exports: "named",
      footer: format === "cjs" ? cjsFooter : undefined,
      interop: "auto",
      paths: (id) => {
        if (externalPaths[id]) {
          return externalPaths[id];
        }

        if (externalIds.has("./index") && isMainEntryExternal(id)) {
          return externalPaths["./index"] ?? id;
        }

        return id;
      },
    },
    plugins: [
      typescript({
        tsconfig: "./tsconfig.json",
        declaration: false,
        declarationMap: false,
      }),
    ],
  };
}

function createDtsBuild({ input, file }) {
  return {
    input,
    external,
    output: {
      file,
      format: "es",
    },
    plugins: [
      dts({
        tsconfig: "./tsconfig.json",
      }),
    ],
  };
}

export default [
  createJsBuild({
    input: "src/index.ts",
    file: "dist/index.js",
    format: "cjs",
  }),
  createJsBuild({
    input: "src/index.ts",
    file: "dist/index.mjs",
    format: "es",
  }),
  createJsBuild({
    input: "src/keyboard-entry.ts",
    file: "dist/keyboard.js",
    format: "cjs",
    additionalExternal: ["./index"],
    externalPaths: {
      "./index": "./index.js",
    },
  }),
  createJsBuild({
    input: "src/keyboard-entry.ts",
    file: "dist/keyboard.mjs",
    format: "es",
    additionalExternal: ["./index"],
    externalPaths: {
      "./index": "./index.mjs",
    },
  }),
  createDtsBuild({
    input: "src/index.ts",
    file: "dist/index.d.ts",
  }),
  createDtsBuild({
    input: "src/keyboard-entry.ts",
    file: "dist/keyboard.d.ts",
  }),
];
