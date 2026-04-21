import { keyboard } from "./index";

export { keyboard as default, keyboard };
export type {
  AxidevIoModule,
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
} from "./index";

export const clearLastError = keyboard.clearLastError;
export const free = keyboard.free;
export const getBackend = keyboard.getBackend;
export const getBackendName = keyboard.getBackendName;
export const getCapabilities = keyboard.getCapabilities;
export const getLastError = keyboard.getLastError;
export const getLogLevel = keyboard.getLogLevel;
export const getLogLevelName = keyboard.getLogLevelName;
export const hasRequiredPermissions = keyboard.hasRequiredPermissions;
export const initialize = keyboard.initialize;
export const isInitialized = keyboard.isInitialized;
export const isReady = keyboard.isReady;
export const keys = keyboard.keys;
export const listener = keyboard.listener;
export const modifiers = keyboard.modifiers;
export const permissions = keyboard.permissions;
export const requestPermissions = keyboard.requestPermissions;
export const sender = keyboard.sender;
export const setLogLevel = keyboard.setLogLevel;
export const setupPermissions = keyboard.setupPermissions;
export const shutdown = keyboard.shutdown;
export const status = keyboard.status;
export const version = keyboard.version;
