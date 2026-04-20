"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const axidev = require("../index.js");

test("exports native version", () => {
  assert.match(axidev.version(), /^\d+\.\d+\.\d+/);
});

test("parses and formats combos", () => {
  const combo = axidev.parseCombo("Ctrl+Shift+A");

  assert.equal(combo.key, axidev.parseKey("A"));
  assert.equal(combo.mods, axidev.Modifier.CTRL | axidev.Modifier.SHIFT);
  assert.equal(axidev.formatCombo(combo), "Ctrl+Shift+A");
});

test("supports modifier aliases", () => {
  assert.equal(
    axidev.formatCombo("A", ["control", "option"]),
    "Ctrl+Alt+A",
  );
});

test("reports invalid combos as type errors", () => {
  assert.throws(() => axidev.parseCombo("DefinitelyNotAKey"), TypeError);
});

test("listen validates the callback", () => {
  assert.throws(() => axidev.listen(null), TypeError);
});

test("exports the package-level permission helper", () => {
  assert.equal(typeof axidev.setupPermissions, "function");
});
