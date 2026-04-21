import { Modifier } from "../internal/constants";
import {
  assertInteger,
  assertObject,
  modifierMaskToNames,
  native,
  resolveModifiers,
} from "../internal/utils";
import type {
  KeyCombo,
  KeyComboInput,
  KeyInput,
  KeyboardComboHelpers,
  KeyboardKeyHelpers,
  KeyboardModifierHelpers,
} from "../types";

export function parseCombo(input: string): Readonly<KeyCombo> {
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

export function parseKey(input: string): number {
  const parsed = parseCombo(input);
  if (parsed.mods !== Modifier.NONE) {
    throw new TypeError(`Expected a plain key name without modifiers: ${input}`);
  }

  return parsed.key;
}

export function formatKey(key: number): string | null {
  return native.keyToString(assertInteger(key, "key"));
}

export function normalizeKeyInput(
  input: KeyInput,
  mods?: number | string | readonly string[],
): Readonly<KeyCombo> {
  if (typeof input === "number") {
    return Object.freeze({
      key: assertInteger(input, "key"),
      mods: resolveModifiers(mods),
    });
  }

  if (typeof input === "string") {
    if (mods === undefined) {
      return parseCombo(input);
    }

    return Object.freeze({
      key: parseKey(input),
      mods: resolveModifiers(mods),
    });
  }

  assertObject(input, "key input");

  if (!Object.prototype.hasOwnProperty.call(input, "key")) {
    throw new TypeError("key input object must contain a key property");
  }

  const comboInput = input as KeyComboInput;

  return Object.freeze({
    key:
      typeof comboInput.key === "string"
        ? parseKey(comboInput.key)
        : assertInteger(comboInput.key, "key"),
    mods: resolveModifiers(comboInput.mods),
  });
}

export function formatCombo(
  input: KeyInput,
  mods?: number | string | readonly string[],
): string | null {
  const combo = normalizeKeyInput(input, mods);
  return native.keyToStringWithModifier(combo.key, combo.mods);
}

const modifierHelpers = Object.freeze({
  flags: Modifier,
  resolve: resolveModifiers,
  toNames: modifierMaskToNames,
} satisfies KeyboardModifierHelpers);

const comboHelpers = Object.freeze({
  format: formatCombo,
  parse: parseCombo,
  resolve: normalizeKeyInput,
} satisfies KeyboardComboHelpers);

export const keys = Object.freeze({
  combo: comboHelpers,
  format: formatKey,
  formatCombo,
  modifiers: modifierHelpers,
  parse: parseKey,
  parseCombo,
  resolve: normalizeKeyInput,
} satisfies KeyboardKeyHelpers);
