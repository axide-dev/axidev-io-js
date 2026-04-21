import {
  assertInteger,
  assertOk,
  ensureKeyboardInitialized,
  modifierMaskToNames,
  native,
  resolveModifiers,
} from "../internal/utils";
import type {
  Capabilities,
  KeyInput,
  KeyboardKeyHelpers,
  KeyboardSender,
  KeyboardSenderStatus,
  ModifierInput,
} from "../types";

function normalizeCodepoint(input: number | string): number {
  let codepoint: number;

  if (typeof input === "string") {
    const chars = Array.from(input);
    if (chars.length !== 1) {
      throw new TypeError("typeCharacter expects a single Unicode character");
    }

    codepoint = chars[0].codePointAt(0) ?? 0;
  } else {
    codepoint = input;
  }

  return assertInteger(codepoint, "codepoint");
}

interface KeyboardSenderDependencies {
  getCapabilities(): Capabilities;
  keys: KeyboardKeyHelpers;
}

export function createKeyboardSender({
  getCapabilities,
  keys,
}: KeyboardSenderDependencies): KeyboardSender {
  function isInitialized(): boolean {
    return native.isReady();
  }

  function getActiveModifiers(): number {
    return native.activeModifiers();
  }

  function getActiveModifierNames(): string[] {
    return modifierMaskToNames(getActiveModifiers());
  }

  function status(): Readonly<KeyboardSenderStatus> {
    return Object.freeze({
      activeModifierNames: getActiveModifierNames(),
      activeModifiers: getActiveModifiers(),
      capabilities: getCapabilities(),
      initialized: isInitialized(),
      ready: isInitialized(),
    });
  }

  function keyDown(input: KeyInput, mods?: ModifierInput): void {
    ensureKeyboardInitialized("keyboard.sender.keyDown");
    const combo = keys.resolve(input, mods);
    assertOk("keyDown", native.keyDown(combo.key, combo.mods));
  }

  function keyUp(input: KeyInput, mods?: ModifierInput): void {
    ensureKeyboardInitialized("keyboard.sender.keyUp");
    const combo = keys.resolve(input, mods);
    assertOk("keyUp", native.keyUp(combo.key, combo.mods));
  }

  function tap(input: KeyInput, mods?: ModifierInput): void {
    ensureKeyboardInitialized("keyboard.sender.tap");
    const combo = keys.resolve(input, mods);
    assertOk("tap", native.tap(combo.key, combo.mods));
  }

  function holdModifiers(mods: ModifierInput): void {
    ensureKeyboardInitialized("keyboard.sender.holdModifiers");
    assertOk("holdModifiers", native.holdModifiers(resolveModifiers(mods)));
  }

  function releaseModifiers(mods: ModifierInput): void {
    ensureKeyboardInitialized("keyboard.sender.releaseModifiers");
    assertOk(
      "releaseModifiers",
      native.releaseModifiers(resolveModifiers(mods)),
    );
  }

  function releaseAllModifiers(): void {
    ensureKeyboardInitialized("keyboard.sender.releaseAllModifiers");
    assertOk("releaseAllModifiers", native.releaseAllModifiers());
  }

  function typeText(text: string): void {
    ensureKeyboardInitialized("keyboard.sender.typeText");

    if (typeof text !== "string") {
      throw new TypeError("text must be a string");
    }

    assertOk("typeText", native.typeText(text));
  }

  function typeCharacter(input: number | string): void {
    ensureKeyboardInitialized("keyboard.sender.typeCharacter");
    assertOk("typeCharacter", native.typeCharacter(normalizeCodepoint(input)));
  }

  function flush(): void {
    ensureKeyboardInitialized("keyboard.sender.flush");
    native.flush();
  }

  function setKeyDelay(delayUs: number): void {
    ensureKeyboardInitialized("keyboard.sender.setKeyDelay");
    native.setKeyDelay(assertInteger(delayUs, "delayUs"));
  }

  return Object.freeze({
    get activeModifierNames() {
      return getActiveModifierNames();
    },
    get activeModifiers() {
      return getActiveModifiers();
    },
    get capabilities() {
      return getCapabilities();
    },
    character: typeCharacter,
    flush,
    getActiveModifierNames,
    getActiveModifiers,
    getCapabilities,
    holdModifiers,
    get initialized() {
      return isInitialized();
    },
    isInitialized,
    keyDown,
    keyUp,
    press: keyDown,
    get ready() {
      return isInitialized();
    },
    release: keyUp,
    releaseAllModifiers,
    releaseModifiers,
    setKeyDelay,
    status,
    tap,
    text: typeText,
    typeCharacter,
    typeText,
  } satisfies KeyboardSender);
}
