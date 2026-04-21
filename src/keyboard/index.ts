import fs from "node:fs";
import { spawnSync } from "node:child_process";

import { BACKEND_NAMES, LOG_LEVEL_NAMES } from "../internal/constants";
import { AxidevIoError } from "../internal/errors";
import { resolvePackagePath } from "../internal/paths";
import {
  assertInteger,
  assertObject,
  assertOk,
  getLastError,
  native,
  resolveLogLevel,
} from "../internal/utils";
import { keys } from "./helpers";
import { createKeyboardListener } from "./listener";
import { createKeyboardSender } from "./sender";
import type {
  InitializeOptions,
  KeyboardApi,
  PermissionHelpers,
  PermissionSetupResult,
  Status,
} from "../types";

export function createKeyboard(): KeyboardApi {
  function isReady(): boolean {
    return native.isReady();
  }

  function getBackend(): number {
    return native.getBackend();
  }

  function getBackendName(backend = getBackend()): string {
    return BACKEND_NAMES[backend] ?? "unknown";
  }

  function getCapabilities() {
    return Object.freeze({ ...native.getCapabilities() });
  }

  function getLogLevel(): number {
    return native.logGetLevel();
  }

  function getLogLevelName(level = getLogLevel()): string {
    return LOG_LEVEL_NAMES[level] ?? "unknown";
  }

  function setLogLevel(level: InitializeOptions["logLevel"]): void {
    if (level === undefined) {
      return;
    }

    native.logSetLevel(resolveLogLevel(level));
  }

  function version(): string {
    return native.version();
  }

  function clearLastError(): void {
    native.clearLastError();
  }

  const sender = createKeyboardSender({
    getCapabilities,
    keys,
  });
  const listener = createKeyboardListener();

  function initialize(options?: InitializeOptions): KeyboardApi {
    let keyDelayUs: number | undefined;
    let normalizedOptions: InitializeOptions = {};

    if (options !== undefined && options !== null) {
      assertObject(options, "options");
      normalizedOptions = options;
    }

    if (normalizedOptions.logLevel !== undefined) {
      setLogLevel(normalizedOptions.logLevel);
    }

    if (normalizedOptions.keyDelayUs !== undefined) {
      keyDelayUs = assertInteger(normalizedOptions.keyDelayUs, "keyDelayUs");
    }

    assertOk("initialize", native.initialize());

    if (keyDelayUs !== undefined) {
      native.setKeyDelay(keyDelayUs);
    }

    return keyboard;
  }

  function shutdown(): void {
    listener.stop();
    native.free();
  }

  function requestPermissions(): void {
    assertOk("requestPermissions", native.requestPermissions());
  }

  function hasRequiredPermissions(): boolean {
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

  function runLinuxPermissionHelper(): string {
    const helperPath = resolvePackagePath(
      import.meta.url,
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

  function setupPermissions(): Readonly<PermissionSetupResult> {
    if (process.platform !== "linux") {
      hasRequiredPermissions();

      return Object.freeze({
        alreadyGranted: true,
        helperApplied: false,
        helperPath: null,
        platform: process.platform,
        requiresLogout: false,
      });
    }

    if (hasRequiredPermissions()) {
      return Object.freeze({
        alreadyGranted: true,
        helperApplied: false,
        helperPath: null,
        platform: "linux",
        requiresLogout: false,
      });
    }

    return Object.freeze({
      alreadyGranted: false,
      helperApplied: true,
      helperPath: runLinuxPermissionHelper(),
      platform: "linux",
      requiresLogout: true,
    });
  }

  function status(): Readonly<Status> {
    const backend = getBackend();
    const senderStatus = sender.status();
    const listenerStatus = listener.status();

    return Object.freeze({
      activeModifierNames: senderStatus.activeModifierNames,
      activeModifiers: senderStatus.activeModifiers,
      backend,
      backendName: getBackendName(backend),
      capabilities: senderStatus.capabilities,
      initialized: isReady(),
      listener: listenerStatus,
      listening: listenerStatus.listening,
      logLevel: getLogLevel(),
      logLevelName: getLogLevelName(),
      ready: isReady(),
      sender: senderStatus,
      version: version(),
    });
  }

  const permissions = Object.freeze({
    check: hasRequiredPermissions,
    hasRequired: hasRequiredPermissions,
    request: requestPermissions,
    setup: setupPermissions,
  } satisfies PermissionHelpers);

  const keyboard = Object.freeze({
    get backend() {
      return getBackend();
    },
    get backendName() {
      return getBackendName();
    },
    get capabilities() {
      return getCapabilities();
    },
    clearLastError,
    free: shutdown,
    getBackend,
    getBackendName,
    getCapabilities,
    get initialized() {
      return isReady();
    },
    initialize,
    isInitialized: isReady,
    getLastError,
    listener,
    get logLevel() {
      return getLogLevel();
    },
    get logLevelName() {
      return getLogLevelName();
    },
    modifiers: keys.modifiers,
    permissions,
    get ready() {
      return isReady();
    },
    requestPermissions,
    sender,
    setLogLevel,
    setupPermissions,
    shutdown,
    status,
    isReady,
    keys,
    version,
    hasRequiredPermissions,
    getLogLevel,
    getLogLevelName,
  } satisfies KeyboardApi);

  return keyboard;
}
