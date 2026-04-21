import type { BackendMap, LogLevelMap, ModifierMap } from "../types";

export const Modifier = Object.freeze({
  NONE: 0x00,
  SHIFT: 0x01,
  CTRL: 0x02,
  ALT: 0x04,
  SUPER: 0x08,
  CAPSLOCK: 0x10,
  NUMLOCK: 0x20,
} as const satisfies ModifierMap);

export const Backend = Object.freeze({
  UNKNOWN: 0,
  WINDOWS: 1,
  MACOS: 2,
  LINUX_LIBINPUT: 3,
  LINUX_UINPUT: 4,
} as const satisfies BackendMap);

export const LogLevel = Object.freeze({
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
} as const satisfies LogLevelMap);

export const BACKEND_NAMES: Readonly<Record<number, string>> = Object.freeze({
  [Backend.UNKNOWN]: "unknown",
  [Backend.WINDOWS]: "windows",
  [Backend.MACOS]: "macos",
  [Backend.LINUX_LIBINPUT]: "linux-libinput",
  [Backend.LINUX_UINPUT]: "linux-uinput",
});

export const LOG_LEVEL_NAMES: Readonly<Record<number, string>> = Object.freeze({
  [LogLevel.DEBUG]: "debug",
  [LogLevel.INFO]: "info",
  [LogLevel.WARN]: "warn",
  [LogLevel.ERROR]: "error",
});

export const MODIFIER_FLAGS = Object.freeze([
  Object.freeze(["Super", Modifier.SUPER] as const),
  Object.freeze(["Ctrl", Modifier.CTRL] as const),
  Object.freeze(["Alt", Modifier.ALT] as const),
  Object.freeze(["Shift", Modifier.SHIFT] as const),
  Object.freeze(["CapsLock", Modifier.CAPSLOCK] as const),
  Object.freeze(["NumLock", Modifier.NUMLOCK] as const),
]);

export const MODIFIER_ALIASES = new Map<string, number>([
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
