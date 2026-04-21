export interface ModifierMap {
  readonly NONE: 0;
  readonly SHIFT: 1;
  readonly CTRL: 2;
  readonly ALT: 4;
  readonly SUPER: 8;
  readonly CAPSLOCK: 16;
  readonly NUMLOCK: 32;
}

export interface BackendMap {
  readonly UNKNOWN: 0;
  readonly WINDOWS: 1;
  readonly MACOS: 2;
  readonly LINUX_LIBINPUT: 3;
  readonly LINUX_UINPUT: 4;
}

export interface LogLevelMap {
  readonly DEBUG: 0;
  readonly INFO: 1;
  readonly WARN: 2;
  readonly ERROR: 3;
}

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

export interface KeyboardModifierHelpers {
  readonly flags: ModifierMap;
  resolve(input?: ModifierInput | null): number;
  toNames(mask: number): string[];
}

export interface KeyboardComboHelpers {
  parse(input: string): Readonly<KeyCombo>;
  format(input: KeyInput, mods?: ModifierInput): string | null;
  resolve(input: KeyInput, mods?: ModifierInput): Readonly<KeyCombo>;
}

export interface KeyboardKeyHelpers {
  readonly combo: KeyboardComboHelpers;
  readonly modifiers: KeyboardModifierHelpers;
  parse(input: string): number;
  format(key: number): string | null;
  resolve(input: KeyInput, mods?: ModifierInput): Readonly<KeyCombo>;
  parseCombo(input: string): Readonly<KeyCombo>;
  formatCombo(input: KeyInput, mods?: ModifierInput): string | null;
}

export interface KeyboardSenderStatus {
  initialized: boolean;
  ready: boolean;
  capabilities: Capabilities;
  activeModifiers: number;
  activeModifierNames: string[];
}

export interface KeyboardListenerStatus {
  initialized: boolean;
  listening: boolean;
  subscriberCount: number;
}

export interface KeyboardSender {
  readonly initialized: boolean;
  readonly ready: boolean;
  readonly capabilities: Capabilities;
  readonly activeModifiers: number;
  readonly activeModifierNames: string[];
  isInitialized(): boolean;
  status(): Readonly<KeyboardSenderStatus>;
  getCapabilities(): Capabilities;
  getActiveModifiers(): number;
  getActiveModifierNames(): string[];
  keyDown(input: KeyInput, mods?: ModifierInput): void;
  press(input: KeyInput, mods?: ModifierInput): void;
  keyUp(input: KeyInput, mods?: ModifierInput): void;
  release(input: KeyInput, mods?: ModifierInput): void;
  tap(input: KeyInput, mods?: ModifierInput): void;
  holdModifiers(mods: ModifierInput): void;
  releaseModifiers(mods: ModifierInput): void;
  releaseAllModifiers(): void;
  typeText(text: string): void;
  text(text: string): void;
  typeCharacter(input: number | string): void;
  character(input: number | string): void;
  flush(): void;
  setKeyDelay(delayUs: number): void;
}

export interface KeyboardListener {
  readonly initialized: boolean;
  readonly listening: boolean;
  readonly subscriberCount: number;
  isInitialized(): boolean;
  isListening(): boolean;
  status(): Readonly<KeyboardListenerStatus>;
  start(listener: Listener): Unsubscribe;
  listen(listener: Listener): Unsubscribe;
  subscribe(listener: Listener): Unsubscribe;
  stop(): void;
}

export interface PermissionSetupResult {
  platform: string;
  alreadyGranted: boolean;
  helperApplied: boolean;
  requiresLogout: boolean;
  helperPath: string | null;
}

export interface PermissionHelpers {
  request(): void;
  setup(): Readonly<PermissionSetupResult>;
  hasRequired(): boolean;
  check(): boolean;
}

export interface Status {
  version: string;
  initialized: boolean;
  ready: boolean;
  listening: boolean;
  backend: number;
  backendName: string;
  capabilities: Capabilities;
  activeModifiers: number;
  activeModifierNames: string[];
  logLevel: number;
  logLevelName: string;
  sender: KeyboardSenderStatus;
  listener: KeyboardListenerStatus;
}

export interface KeyboardApi {
  readonly initialized: boolean;
  readonly ready: boolean;
  readonly backend: number;
  readonly backendName: string;
  readonly capabilities: Capabilities;
  readonly logLevel: number;
  readonly logLevelName: string;
  readonly sender: KeyboardSender;
  readonly listener: KeyboardListener;
  readonly keys: KeyboardKeyHelpers;
  readonly modifiers: KeyboardModifierHelpers;
  readonly permissions: PermissionHelpers;
  initialize(options?: InitializeOptions): KeyboardApi;
  shutdown(): void;
  free(): void;
  isReady(): boolean;
  isInitialized(): boolean;
  status(): Readonly<Status>;
  version(): string;
  getLastError(): string | null;
  clearLastError(): void;
  getBackend(): number;
  getBackendName(backend?: number): string;
  getCapabilities(): Capabilities;
  requestPermissions(): void;
  setupPermissions(): Readonly<PermissionSetupResult>;
  hasRequiredPermissions(): boolean;
  setLogLevel(level: LogLevelInput): void;
  getLogLevel(): number;
  getLogLevelName(level?: number): string;
}
