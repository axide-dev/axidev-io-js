"use strict";

const axidev = require("..");

console.log("version:", axidev.version());
console.log("backend:", axidev.keyboard.backendName);
console.log("ready:", axidev.keyboard.initialized);
console.log("ctrl+shift+a:", axidev.keyboard.keys.parseCombo("Ctrl+Shift+A"));
console.log("format:", axidev.keyboard.keys.formatCombo("Ctrl+Shift+A"));
