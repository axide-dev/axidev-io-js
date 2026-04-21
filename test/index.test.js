"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const axidev = require("..");

test("exports native version", () => {
  assert.match(axidev.version(), /^\d+\.\d+\.\d+/);
});

test("exposes the namespaced keyboard API", () => {
  assert.equal(typeof axidev.keyboard.initialize, "function");
  assert.equal(typeof axidev.keyboard.sender.tap, "function");
  assert.equal(typeof axidev.keyboard.listener.start, "function");
  assert.equal(typeof axidev.keyboard.keys.parseCombo, "function");
});

test("parses and formats combos through keyboard keys helpers", () => {
  const combo = axidev.keyboard.keys.parseCombo("Ctrl+Shift+A");

  assert.equal(combo.key, axidev.keyboard.keys.parse("A"));
  assert.equal(combo.mods, axidev.Modifier.CTRL | axidev.Modifier.SHIFT);
  assert.equal(axidev.keyboard.keys.formatCombo(combo), "Ctrl+Shift+A");
});

test("supports modifier aliases", () => {
  assert.equal(
    axidev.keyboard.keys.formatCombo("A", ["control", "option"]),
    "Ctrl+Alt+A",
  );
});

test("reports invalid combos as type errors", () => {
  assert.throws(
    () => axidev.keyboard.keys.parseCombo("DefinitelyNotAKey"),
    TypeError,
  );
});

test("blocks sender usage before initialization", () => {
  assert.throws(
    () => axidev.keyboard.sender.tap("A"),
    axidev.AxidevIoStateError,
  );
});

test("listen validates the callback before initialization guard", () => {
  assert.throws(() => axidev.listen(null), TypeError);
});

test("exports the package-level permission helper", () => {
  assert.equal(typeof axidev.keyboard.setupPermissions, "function");
  assert.equal(typeof axidev.setupPermissions, "function");
});

test("exports the keyboard subpath through commonjs", () => {
  const keyboard = require(path.join(__dirname, "..", "dist", "keyboard.js"));

  assert.equal(typeof keyboard.sender.tap, "function");
  assert.equal(typeof keyboard.listener.start, "function");
});

test("exports the ESM entrypoints", async () => {
  const esm = await import(
    pathToFileURL(path.join(__dirname, "..", "dist", "index.mjs")).href,
  );
  const keyboardModule = await import(
    pathToFileURL(path.join(__dirname, "..", "dist", "keyboard.mjs")).href,
  );

  assert.equal(esm.keyboard, esm.default.keyboard);
  assert.equal(typeof esm.keyboard.sender.tap, "function");
  assert.equal(keyboardModule.default, esm.keyboard);
  assert.equal(typeof keyboardModule.sender.tap, "function");
});
