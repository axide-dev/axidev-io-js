export declare class AxidevIoError extends Error {
  constructor(action: string, details?: string | null);
  readonly action: string;
  readonly details: string | null;
}

export declare const Modifier: {
  readonly NONE: 0;
  readonly SHIFT: 1;
  readonly CTRL: 2;
  readonly ALT: 4;
  readonly SUPER: 8;
  readonly CAPSLOCK: 16;
  readonly NUMLOCK: 32;
};

export declare const Backend: {
  readonly UNKNOWN: 0;
  readonly WINDOWS: 1;
  readonly MACOS: 2;
  readonly LINUX_LIBINPUT: 3;
  readonly LINUX_UINPUT: 4;
};

export declare const LogLevel: {
  readonly DEBUG: 0;
  readonly INFO: 1;
  readonly WARN: 2;
  readonly ERROR: 3;
};

export type ModifierInput = number | string | readonly string[];
export type LogLevelInput = number | "debug" | "info" | "warn" | "error";

export interface KeyCombo {
  key: number;
  mods: number;
}

export interface KeyComboInput {
  key: number | string;
  mods?: ModifierInput;
}

export type KeyInput = number | string | KeyComboInput;

export interface Capabilities {
  canInjectKeys: boolean;
  canInjectText: boolean;
  canSimulateHid: boolean;
  supportsKeyRepeat: boolean;
  needsAccessibilityPerm: boolean;
  needsInputMonitoringPerm: boolean;
  needsUinputAccess: boolean;
}

export interface InitializeOptions {
  keyDelayUs?: number;
  logLevel?: LogLevelInput;
}

export interface KeyEvent {
  codepoint: number;
  text: string | null;
  key: number;
  keyName: string | null;
  mods: number;
  modifiers: string[];
  combo: string | null;
  pressed: boolean;
}

export type Listener = (event: KeyEvent) => void;
export type Unsubscribe = () => void;

export interface Status {
  version: string;
  ready: boolean;
  listening: boolean;
  backend: number;
  backendName: string;
  capabilities: Capabilities;
  activeModifiers: number;
  activeModifierNames: string[];
  logLevel: number;
  logLevelName: string;
}

export interface PermissionSetupResult {
  platform: string;
  alreadyGranted: boolean;
  helperApplied: boolean;
  requiresLogout: boolean;
  helperPath: string | null;
}

export declare function clearLastError(): void;
export declare function flush(): void;
export declare function formatCombo(input: KeyInput, mods?: ModifierInput): string | null;
export declare function formatKey(key: number): string | null;
export declare function free(): void;
export declare function getActiveModifierNames(): string[];
export declare function getActiveModifiers(): number;
export declare function getBackend(): number;
export declare function getBackendName(backend?: number): string;
export declare function getCapabilities(): Capabilities;
export declare function getLastError(): string | null;
export declare function getLogLevel(): number;
export declare function getLogLevelName(level?: number): string;
export declare function holdModifiers(mods: ModifierInput): void;
export declare function initialize(options?: InitializeOptions): void;
export declare function isListening(): boolean;
export declare function isReady(): boolean;
export declare function keyDown(input: KeyInput, mods?: ModifierInput): void;
export declare function keyUp(input: KeyInput, mods?: ModifierInput): void;
export declare function listen(listener: Listener): Unsubscribe;
export declare function parseCombo(input: string): Readonly<KeyCombo>;
export declare function parseKey(input: string): number;
export declare function releaseAllModifiers(): void;
export declare function releaseModifiers(mods: ModifierInput): void;
export declare function requestPermissions(): void;
export declare function setKeyDelay(delayUs: number): void;
export declare function setLogLevel(level: LogLevelInput): void;
export declare function shutdown(): void;
export declare function setupPermissions(): Readonly<PermissionSetupResult>;
export declare function startListener(listener: Listener): Unsubscribe;
export declare function status(): Status;
export declare function stopListener(): void;
export declare function tap(input: KeyInput, mods?: ModifierInput): void;
export declare function typeCharacter(input: number | string): void;
export declare function typeText(text: string): void;
export declare function version(): string;
