import { Backend, LogLevel, Modifier } from "./internal/constants";
import { AxidevIoError, AxidevIoStateError } from "./internal/errors";
import { createKeyboard } from "./keyboard/index";
import type {
  BackendMap,
  Capabilities,
  InitializeOptions,
  KeyCombo,
  KeyComboInput,
  KeyEvent,
  KeyInput,
  KeyboardApi,
  KeyboardKeyHelpers,
  KeyboardListener,
  KeyboardListenerStatus,
  KeyboardModifierHelpers,
  KeyboardSender,
  KeyboardSenderStatus,
  Listener,
  LogLevelInput,
  LogLevelMap,
  ModifierInput,
  ModifierMap,
  PermissionHelpers,
  PermissionSetupResult,
  Status,
  Unsubscribe,
} from "./types";

export type {
  BackendMap,
  Capabilities,
  InitializeOptions,
  KeyCombo,
  KeyComboInput,
  KeyEvent,
  KeyInput,
  KeyboardApi,
  KeyboardKeyHelpers,
  KeyboardListener,
  KeyboardListenerStatus,
  KeyboardModifierHelpers,
  KeyboardSender,
  KeyboardSenderStatus,
  Listener,
  LogLevelInput,
  LogLevelMap,
  ModifierInput,
  ModifierMap,
  PermissionHelpers,
  PermissionSetupResult,
  Status,
  Unsubscribe,
};

export interface AxidevIoModule {
  readonly AxidevIoError: typeof AxidevIoError;
  readonly AxidevIoStateError: typeof AxidevIoStateError;
  readonly Modifier: ModifierMap;
  readonly Backend: BackendMap;
  readonly LogLevel: LogLevelMap;
  readonly keyboard: KeyboardApi;
  readonly keys: KeyboardKeyHelpers;
  readonly modifiers: KeyboardModifierHelpers;
  clearLastError(): void;
  flush(): void;
  formatCombo(input: KeyInput, mods?: ModifierInput): string | null;
  formatKey(key: number): string | null;
  free(): void;
  getActiveModifierNames(): string[];
  getActiveModifiers(): number;
  getBackend(): number;
  getBackendName(backend?: number): string;
  getCapabilities(): Capabilities;
  getLastError(): string | null;
  getLogLevel(): number;
  getLogLevelName(level?: number): string;
  hasRequiredPermissions(): boolean;
  holdModifiers(mods: ModifierInput): void;
  initialize(options?: InitializeOptions): KeyboardApi;
  isListening(): boolean;
  isReady(): boolean;
  keyDown(input: KeyInput, mods?: ModifierInput): void;
  keyUp(input: KeyInput, mods?: ModifierInput): void;
  listen(listener: Listener): Unsubscribe;
  parseCombo(input: string): Readonly<KeyCombo>;
  parseKey(input: string): number;
  releaseAllModifiers(): void;
  releaseModifiers(mods: ModifierInput): void;
  requestPermissions(): void;
  setKeyDelay(delayUs: number): void;
  setLogLevel(level: LogLevelInput): void;
  setupPermissions(): Readonly<PermissionSetupResult>;
  shutdown(): void;
  startListener(listener: Listener): Unsubscribe;
  status(): Readonly<Status>;
  stopListener(): void;
  tap(input: KeyInput, mods?: ModifierInput): void;
  typeCharacter(input: number | string): void;
  typeText(text: string): void;
  version(): string;
}

export { AxidevIoError, AxidevIoStateError, Backend, LogLevel, Modifier };

export const keyboard = createKeyboard();
export const keys = keyboard.keys;
export const modifiers = keyboard.modifiers;

export const clearLastError = keyboard.clearLastError;
export const flush = keyboard.sender.flush;
export const formatCombo = keys.formatCombo;
export const formatKey = keys.format;
export const free = keyboard.free;
export const getActiveModifierNames = keyboard.sender.getActiveModifierNames;
export const getActiveModifiers = keyboard.sender.getActiveModifiers;
export const getBackend = keyboard.getBackend;
export const getBackendName = keyboard.getBackendName;
export const getCapabilities = keyboard.getCapabilities;
export const getLastError = keyboard.getLastError;
export const getLogLevel = keyboard.getLogLevel;
export const getLogLevelName = keyboard.getLogLevelName;
export const hasRequiredPermissions = keyboard.hasRequiredPermissions;
export const holdModifiers = keyboard.sender.holdModifiers;
export const initialize = keyboard.initialize;
export const isListening = keyboard.listener.isListening;
export const isReady = keyboard.isReady;
export const keyDown = keyboard.sender.keyDown;
export const keyUp = keyboard.sender.keyUp;
export const listen = keyboard.listener.listen;
export const parseCombo = keys.parseCombo;
export const parseKey = keys.parse;
export const releaseAllModifiers = keyboard.sender.releaseAllModifiers;
export const releaseModifiers = keyboard.sender.releaseModifiers;
export const requestPermissions = keyboard.requestPermissions;
export const setKeyDelay = keyboard.sender.setKeyDelay;
export const setLogLevel = keyboard.setLogLevel;
export const setupPermissions = keyboard.setupPermissions;
export const shutdown = keyboard.shutdown;
export const startListener = keyboard.listener.start;
export const status = keyboard.status;
export const stopListener = keyboard.listener.stop;
export const tap = keyboard.sender.tap;
export const typeCharacter = keyboard.sender.typeCharacter;
export const typeText = keyboard.sender.typeText;
export const version = keyboard.version;

const api = Object.freeze({
  AxidevIoError,
  AxidevIoStateError,
  Backend,
  LogLevel,
  Modifier,
  clearLastError,
  flush,
  formatCombo,
  formatKey,
  free,
  getActiveModifierNames,
  getActiveModifiers,
  getBackend,
  getBackendName,
  getCapabilities,
  getLastError,
  getLogLevel,
  getLogLevelName,
  hasRequiredPermissions,
  holdModifiers,
  initialize,
  isListening,
  isReady,
  keyDown,
  keyUp,
  keyboard,
  keys,
  listen,
  modifiers,
  parseCombo,
  parseKey,
  releaseAllModifiers,
  releaseModifiers,
  requestPermissions,
  setKeyDelay,
  setLogLevel,
  setupPermissions,
  shutdown,
  startListener,
  status,
  stopListener,
  tap,
  typeCharacter,
  typeText,
  version,
} satisfies AxidevIoModule);

export default api;
