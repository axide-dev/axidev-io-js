"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const native = require(path.join(__dirname, "build", "Release", "axidev_io.node"));

class AxidevIoError extends Error {
  constructor(action, details) {
    super(details ? `${action} failed: ${details}` : `${action} failed`);
    this.name = "AxidevIoError";
    this.action = action;
    this.details = details ?? null;
  }
}

const Modifier = Object.freeze({
  NONE: 0x00,
  SHIFT: 0x01,
  CTRL: 0x02,
  ALT: 0x04,
  SUPER: 0x08,
  CAPSLOCK: 0x10,
  NUMLOCK: 0x20,
});

const Backend = Object.freeze({
  UNKNOWN: 0,
  WINDOWS: 1,
  MACOS: 2,
  LINUX_LIBINPUT: 3,
  LINUX_UINPUT: 4,
});

const LogLevel = Object.freeze({
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
});

const BACKEND_NAMES = new Map([
  [Backend.UNKNOWN, "unknown"],
  [Backend.WINDOWS, "windows"],
  [Backend.MACOS, "macos"],
  [Backend.LINUX_LIBINPUT, "linux-libinput"],
  [Backend.LINUX_UINPUT, "linux-uinput"],
]);

const LOG_LEVEL_NAMES = new Map([
  [LogLevel.DEBUG, "debug"],
  [LogLevel.INFO, "info"],
  [LogLevel.WARN, "warn"],
  [LogLevel.ERROR, "error"],
]);

const MODIFIER_FLAGS = [
  ["Super", Modifier.SUPER],
  ["Ctrl", Modifier.CTRL],
  ["Alt", Modifier.ALT],
  ["Shift", Modifier.SHIFT],
  ["CapsLock", Modifier.CAPSLOCK],
  ["NumLock", Modifier.NUMLOCK],
];

const MODIFIER_ALIASES = new Map([
  ["", Modifier.NONE],
  ["none", Modifier.NONE],
  ["shift", Modifier.SHIFT],
  ["ctrl", Modifier.CTRL],
  ["control", Modifier.CTRL],
  ["alt", Modifier.ALT],
  ["option", Modifier.ALT],
  ["super", Modifier.SUPER],
  ["meta", Modifier.SUPER],
  ["cmd", Modifier.SUPER],
  ["command", Modifier.SUPER],
  ["win", Modifier.SUPER],
  ["windows", Modifier.SUPER],
  ["caps", Modifier.CAPSLOCK],
  ["capslock", Modifier.CAPSLOCK],
  ["num", Modifier.NUMLOCK],
  ["numlock", Modifier.NUMLOCK],
]);

const listeners = new Set();
let nativeListenerRunning = false;

function getLastError() {
  return native.getLastError();
}

function makeError(action, fallbackDetails) {
  return new AxidevIoError(action, getLastError() ?? fallbackDetails ?? null);
}

function assertOk(action, ok) {
  if (!ok) {
    throw makeError(action);
  }
}

function assertObject(value, name) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object`);
  }
}

function assertInteger(value, name) {
  if (!Number.isInteger(value)) {
    throw new TypeError(`${name} must be an integer`);
  }
  return value;
}

function resolveLogLevel(level) {
  if (typeof level === "number") {
    return assertInteger(level, "logLevel");
  }

  if (typeof level !== "string") {
    throw new TypeError("logLevel must be a number or string");
  }

  const normalized = level.trim().toLowerCase();
  for (const [code, name] of LOG_LEVEL_NAMES.entries()) {
    if (normalized === name) {
      return code;
    }
  }

  throw new TypeError(`Unknown log level: ${level}`);
}

function modifierMaskToNames(mask) {
  return MODIFIER_FLAGS.filter(([, flag]) => (mask & flag) === flag).map(
    ([name]) => name,
  );
}

function resolveModifierToken(token) {
  const normalized = token.trim().toLowerCase().replace(/[_\-\s]+/g, "");
  const flag = MODIFIER_ALIASES.get(normalized);

  if (flag === undefined) {
    throw new TypeError(`Unknown modifier: ${token}`);
  }

  return flag;
}

function resolveModifiers(input) {
  if (input === undefined || input === null) {
    return Modifier.NONE;
  }

  if (typeof input === "number") {
    return assertInteger(input, "mods");
  }

  if (typeof input === "string") {
    const segments = input.split("+").map((segment) => segment.trim()).filter(Boolean);
    if (segments.length === 0) {
      return Modifier.NONE;
    }

    return segments.reduce((mask, segment) => mask | resolveModifierToken(segment), 0);
  }

  if (Array.isArray(input)) {
    return input.reduce((mask, segment) => {
      if (typeof segment !== "string") {
        throw new TypeError("Modifier arrays must only contain strings");
      }
      return mask | resolveModifierToken(segment);
    }, 0);
  }

  throw new TypeError("mods must be a number, string, or string[]");
}

function parseCombo(input) {
  if (typeof input !== "string") {
    throw new TypeError("combo must be a string");
  }

  const parsed = native.stringToKeyWithModifier(input);
  if (!parsed || parsed.key === 0) {
    throw new TypeError(`Unknown key or combo: ${input}`);
  }

  return Object.freeze({
    key: parsed.key,
    mods: parsed.mods,
  });
}

function parseKey(input) {
  const parsed = parseCombo(input);
  if (parsed.mods !== Modifier.NONE) {
    throw new TypeError(`Expected a plain key name without modifiers: ${input}`);
  }

  return parsed.key;
}

function formatKey(key) {
  return native.keyToString(assertInteger(key, "key"));
}

function normalizeKeyInput(input, mods) {
  if (typeof input === "number") {
    return {
      key: assertInteger(input, "key"),
      mods: resolveModifiers(mods),
    };
  }

  if (typeof input === "string") {
    if (mods === undefined) {
      return parseCombo(input);
    }

    return {
      key: parseKey(input),
      mods: resolveModifiers(mods),
    };
  }

  assertObject(input, "key input");

  if (!Object.prototype.hasOwnProperty.call(input, "key")) {
    throw new TypeError("key input object must contain a key property");
  }

  return {
    key:
      typeof input.key === "string"
        ? parseKey(input.key)
        : assertInteger(input.key, "key"),
    mods: resolveModifiers(input.mods),
  };
}

function formatCombo(input, mods) {
  const combo = normalizeKeyInput(input, mods);
  return native.keyToStringWithModifier(combo.key, combo.mods);
}

function getBackend() {
  return native.getBackend();
}

function getBackendName(backend = getBackend()) {
  return BACKEND_NAMES.get(backend) ?? "unknown";
}

function getCapabilities() {
  return native.getCapabilities();
}

function getActiveModifiers() {
  return native.activeModifiers();
}

function getActiveModifierNames() {
  return modifierMaskToNames(getActiveModifiers());
}

function setLogLevel(level) {
  native.logSetLevel(resolveLogLevel(level));
}

function getLogLevel() {
  return native.logGetLevel();
}

function getLogLevelName(level = getLogLevel()) {
  return LOG_LEVEL_NAMES.get(level) ?? "unknown";
}

function initialize(options = {}) {
  let keyDelayUs;

  if (options !== undefined && options !== null) {
    assertObject(options, "options");
  }

  if (options.logLevel !== undefined) {
    setLogLevel(options.logLevel);
  }

  if (options.keyDelayUs !== undefined) {
    keyDelayUs = assertInteger(options.keyDelayUs, "keyDelayUs");
  }

  assertOk("initialize", native.initialize());

  if (keyDelayUs !== undefined) {
    native.setKeyDelay(keyDelayUs);
  }
}

function stopListener() {
  listeners.clear();
  native.stopListener();
  nativeListenerRunning = false;
}

function shutdown() {
  stopListener();
  native.free();
}

function isReady() {
  return native.isReady();
}

function isListening() {
  return nativeListenerRunning && native.isListening();
}

function requestPermissions() {
  assertOk("requestPermissions", native.requestPermissions());
}

function hasRequiredPermissions() {
  let initializedHere = false;

  try {
    if (!isReady()) {
      initialize();
      initializedHere = true;
    }

    requestPermissions();
    return true;
  } catch (error) {
    if (
      process.platform === "linux" &&
      error instanceof AxidevIoError &&
      (error.action === "initialize" || error.action === "requestPermissions")
    ) {
      return false;
    }

    throw error;
  } finally {
    if (initializedHere) {
      shutdown();
    }
  }
}

function runLinuxPermissionHelper() {
  const helperPath = path.join(
    __dirname,
    "vendor",
    "axidev-io",
    "scripts",
    "setup_uinput_permissions.sh",
  );

  if (!fs.existsSync(helperPath)) {
    throw new AxidevIoError(
      "setupPermissions",
      `Linux permission helper not found at ${helperPath}`,
    );
  }

  const result = spawnSync(helperPath, [], {
    stdio: "inherit",
  });

  if (result.error) {
    throw new AxidevIoError("setupPermissions", result.error.message);
  }

  if (result.status !== 0) {
    throw new AxidevIoError(
      "setupPermissions",
      `Linux permission helper exited with status ${result.status ?? "unknown"}`,
    );
  }

  return helperPath;
}

function setupPermissions() {
  if (process.platform !== "linux") {
    hasRequiredPermissions();

    return Object.freeze({
      platform: process.platform,
      alreadyGranted: true,
      helperApplied: false,
      requiresLogout: false,
      helperPath: null,
    });
  }

  if (hasRequiredPermissions()) {
    return Object.freeze({
      platform: "linux",
      alreadyGranted: true,
      helperApplied: false,
      requiresLogout: false,
      helperPath: null,
    });
  }

  const helperPath = runLinuxPermissionHelper();

  return Object.freeze({
    platform: "linux",
    alreadyGranted: false,
    helperApplied: true,
    requiresLogout: true,
    helperPath,
  });
}

function keyDown(input, mods) {
  const combo = normalizeKeyInput(input, mods);
  assertOk("keyDown", native.keyDown(combo.key, combo.mods));
}

function keyUp(input, mods) {
  const combo = normalizeKeyInput(input, mods);
  assertOk("keyUp", native.keyUp(combo.key, combo.mods));
}

function tap(input, mods) {
  const combo = normalizeKeyInput(input, mods);
  assertOk("tap", native.tap(combo.key, combo.mods));
}

function holdModifiers(mods) {
  assertOk("holdModifiers", native.holdModifiers(resolveModifiers(mods)));
}

function releaseModifiers(mods) {
  assertOk("releaseModifiers", native.releaseModifiers(resolveModifiers(mods)));
}

function releaseAllModifiers() {
  assertOk("releaseAllModifiers", native.releaseAllModifiers());
}

function typeText(text) {
  if (typeof text !== "string") {
    throw new TypeError("text must be a string");
  }
  assertOk("typeText", native.typeText(text));
}

function typeCharacter(input) {
  let codepoint = input;

  if (typeof input === "string") {
    const chars = Array.from(input);
    if (chars.length !== 1) {
      throw new TypeError("typeCharacter expects a single Unicode character");
    }
    codepoint = chars[0].codePointAt(0);
  }

  codepoint = assertInteger(codepoint, "codepoint");
  assertOk("typeCharacter", native.typeCharacter(codepoint));
}

function flush() {
  native.flush();
}

function setKeyDelay(delayUs) {
  native.setKeyDelay(assertInteger(delayUs, "delayUs"));
}

function version() {
  return native.version();
}

function clearLastError() {
  native.clearLastError();
}

function decorateListenerEvent(rawEvent) {
  const codepoint = rawEvent.codepoint;
  const key = rawEvent.key;
  const mods = rawEvent.mods;
  const keyName = native.keyToString(key);
  const combo = native.keyToStringWithModifier(key, mods);

  return Object.freeze({
    codepoint,
    text: codepoint > 0 ? String.fromCodePoint(codepoint) : null,
    key,
    keyName,
    mods,
    modifiers: modifierMaskToNames(mods),
    combo,
    pressed: Boolean(rawEvent.pressed),
  });
}

function emitListenerEvent(rawEvent) {
  const event = decorateListenerEvent(rawEvent);

  for (const listener of listeners) {
    try {
      listener(event);
    } catch (error) {
      const detail =
        error instanceof Error ? error.stack || error.message : String(error);
      process.emitWarning(detail, {
        code: "AXIDEV_IO_LISTENER_CALLBACK_ERROR",
      });
    }
  }
}

function listen(listener) {
  if (typeof listener !== "function") {
    throw new TypeError("listener must be a function");
  }

  if (!nativeListenerRunning) {
    assertOk("startListener", native.startListener(emitListenerEvent));
    nativeListenerRunning = true;
  }

  listeners.add(listener);

  let active = true;
  return function unsubscribe() {
    if (!active) {
      return;
    }
    active = false;
    listeners.delete(listener);
    if (listeners.size === 0) {
      stopListener();
    }
  };
}

function startListener(listener) {
  return listen(listener);
}

function status() {
  const backend = getBackend();

  return {
    version: version(),
    ready: isReady(),
    listening: isListening(),
    backend,
    backendName: getBackendName(backend),
    capabilities: getCapabilities(),
    activeModifiers: getActiveModifiers(),
    activeModifierNames: getActiveModifierNames(),
    logLevel: getLogLevel(),
    logLevelName: getLogLevelName(),
  };
}

exports.AxidevIoError = AxidevIoError;
exports.Modifier = Modifier;
exports.Backend = Backend;
exports.LogLevel = LogLevel;
exports.clearLastError = clearLastError;
exports.flush = flush;
exports.formatCombo = formatCombo;
exports.formatKey = formatKey;
exports.free = shutdown;
exports.getActiveModifierNames = getActiveModifierNames;
exports.getActiveModifiers = getActiveModifiers;
exports.getBackend = getBackend;
exports.getBackendName = getBackendName;
exports.getCapabilities = getCapabilities;
exports.getLastError = getLastError;
exports.getLogLevel = getLogLevel;
exports.getLogLevelName = getLogLevelName;
exports.holdModifiers = holdModifiers;
exports.initialize = initialize;
exports.isListening = isListening;
exports.isReady = isReady;
exports.keyDown = keyDown;
exports.keyUp = keyUp;
exports.listen = listen;
exports.parseCombo = parseCombo;
exports.parseKey = parseKey;
exports.releaseAllModifiers = releaseAllModifiers;
exports.releaseModifiers = releaseModifiers;
exports.requestPermissions = requestPermissions;
exports.setKeyDelay = setKeyDelay;
exports.setLogLevel = setLogLevel;
exports.shutdown = shutdown;
exports.setupPermissions = setupPermissions;
exports.startListener = startListener;
exports.status = status;
exports.stopListener = stopListener;
exports.tap = tap;
exports.typeCharacter = typeCharacter;
exports.typeText = typeText;
exports.version = version;
