import {
  assertOk,
  ensureKeyboardInitialized,
  modifierMaskToNames,
  native,
} from "../internal/utils";
import type {
  KeyEvent,
  KeyboardListener,
  KeyboardListenerStatus,
  Listener,
  Unsubscribe,
} from "../types";
import type { RawNativeListenerEvent } from "../internal/native";

export function createKeyboardListener(): KeyboardListener {
  const listeners = new Set<Listener>();
  let nativeListenerRunning = false;

  function isInitialized(): boolean {
    return native.isReady();
  }

  function isListening(): boolean {
    return nativeListenerRunning && native.isListening();
  }

  function decorateListenerEvent(rawEvent: RawNativeListenerEvent): Readonly<KeyEvent> {
    const codepoint = rawEvent.codepoint;
    const key = rawEvent.key;
    const mods = rawEvent.mods;

    return Object.freeze({
      codepoint,
      combo: native.keyToStringWithModifier(key, mods),
      key,
      keyName: native.keyToString(key),
      modifiers: modifierMaskToNames(mods),
      mods,
      pressed: Boolean(rawEvent.pressed),
      text: codepoint > 0 ? String.fromCodePoint(codepoint) : null,
    });
  }

  function emitListenerEvent(rawEvent: RawNativeListenerEvent): void {
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

  function stop(): void {
    listeners.clear();
    native.stopListener();
    nativeListenerRunning = false;
  }

  function start(listener: Listener): Unsubscribe {
    if (typeof listener !== "function") {
      throw new TypeError("listener must be a function");
    }

    ensureKeyboardInitialized("keyboard.listener.start");

    if (!nativeListenerRunning) {
      assertOk("startListener", native.startListener(emitListenerEvent));
      nativeListenerRunning = true;
    }

    listeners.add(listener);

    let active = true;
    return function unsubscribe(): void {
      if (!active) {
        return;
      }

      active = false;
      listeners.delete(listener);
      if (listeners.size === 0) {
        stop();
      }
    };
  }

  function status(): Readonly<KeyboardListenerStatus> {
    return Object.freeze({
      initialized: isInitialized(),
      listening: isListening(),
      subscriberCount: listeners.size,
    });
  }

  return Object.freeze({
    get initialized() {
      return isInitialized();
    },
    get listening() {
      return isListening();
    },
    get subscriberCount() {
      return listeners.size;
    },
    isInitialized,
    isListening,
    listen: start,
    start,
    status,
    stop,
    subscribe: start,
  } satisfies KeyboardListener);
}
