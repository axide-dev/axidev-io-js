"use strict";

const axidev = require("../index.js");

console.log("version:", axidev.version());
console.log("backend:", axidev.getBackendName());
console.log("ctrl+shift+a:", axidev.parseCombo("Ctrl+Shift+A"));
console.log("format:", axidev.formatCombo("Ctrl+Shift+A"));
