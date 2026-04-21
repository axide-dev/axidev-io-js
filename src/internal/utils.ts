import { LOG_LEVEL_NAMES, MODIFIER_ALIASES, MODIFIER_FLAGS } from "./constants";
import { AxidevIoError, AxidevIoStateError } from "./errors";
import native from "./native";
import type { LogLevelInput, ModifierInput } from "../types";

export function getLastError(): string | null {
  return native.getLastError();
}

export function makeError(
  action: string,
  fallbackDetails?: string | null,
): AxidevIoError {
  return new AxidevIoError(action, getLastError() ?? fallbackDetails ?? null);
}

export function assertOk(action: string, ok: boolean): void {
  if (!ok) {
    throw makeError(action);
  }
}

export function assertObject(value: unknown, name: string): asserts value is object {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object`);
  }
}

export function assertInteger(value: number, name: string): number {
  if (!Number.isInteger(value)) {
    throw new TypeError(`${name} must be an integer`);
  }

  return value;
}

export function resolveLogLevel(level: LogLevelInput): number {
  if (typeof level === "number") {
    return assertInteger(level, "logLevel");
  }

  const normalized = level.trim().toLowerCase();
  for (const [code, name] of Object.entries(LOG_LEVEL_NAMES)) {
    if (normalized === name) {
      return Number(code);
    }
  }

  throw new TypeError(`Unknown log level: ${level}`);
}

export function modifierMaskToNames(mask: number): string[] {
  return Object.freeze(
    MODIFIER_FLAGS.filter(([, flag]) => (mask & flag) === flag).map(
      ([name]) => name,
    ),
  ) as string[];
}

function resolveModifierToken(token: string): number {
  const normalized = token.trim().toLowerCase().replace(/[_\-\s]+/g, "");
  const flag = MODIFIER_ALIASES.get(normalized);

  if (flag === undefined) {
    throw new TypeError(`Unknown modifier: ${token}`);
  }

  return flag;
}

export function resolveModifiers(input?: ModifierInput | null): number {
  if (input === undefined || input === null) {
    return 0;
  }

  if (typeof input === "number") {
    return assertInteger(input, "mods");
  }

  if (typeof input === "string") {
    const segments = input
      .split("+")
      .map((segment) => segment.trim())
      .filter(Boolean);

    if (segments.length === 0) {
      return 0;
    }

    return segments.reduce(
      (mask, segment) => mask | resolveModifierToken(segment),
      0,
    );
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

export function ensureKeyboardInitialized(action: string): void {
  if (!native.isReady()) {
    throw new AxidevIoStateError(action);
  }
}

export { native };
