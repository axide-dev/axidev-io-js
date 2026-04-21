import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

import type { Capabilities } from "../types";
import { resolvePackagePath, resolvePackageRoot } from "./paths";

export interface NativeKeyCombo {
  key: number;
  mods: number;
}

export interface RawNativeListenerEvent {
  codepoint: number;
  key: number;
  mods: number;
  pressed: boolean;
}

export interface NativeBinding {
  initialize(): boolean;
  free(): void;
  isReady(): boolean;
  getBackend(): number;
  getCapabilities(): Capabilities;
  requestPermissions(): boolean;
  keyDown(key: number, mods: number): boolean;
  keyUp(key: number, mods: number): boolean;
  tap(key: number, mods: number): boolean;
  activeModifiers(): number;
  holdModifiers(mods: number): boolean;
  releaseModifiers(mods: number): boolean;
  releaseAllModifiers(): boolean;
  typeText(text: string): boolean;
  typeCharacter(codepoint: number): boolean;
  flush(): void;
  setKeyDelay(delayUs: number): void;
  startListener(listener: (event: RawNativeListenerEvent) => void): boolean;
  stopListener(): void;
  isListening(): boolean;
  keyToString(key: number): string | null;
  stringToKey(text: string): number;
  keyToStringWithModifier(key: number, mods: number): string | null;
  stringToKeyWithModifier(text: string): NativeKeyCombo | null;
  version(): string;
  getLastError(): string | null;
  clearLastError(): void;
  logSetLevel(level: number): void;
  logGetLevel(): number;
}

const require = createRequire(import.meta.url);
const packageRoot = resolvePackageRoot(import.meta.url);
const targetLabel = `${process.platform}-${process.arch}`;
const consumerGuidePath = resolvePackagePath(
  import.meta.url,
  "vendor",
  "axidev-io",
  "docs",
  "consumers",
  "README.md",
);

function listAvailablePrebuildTargets(): string[] {
  const prebuildsDir = path.join(packageRoot, "prebuilds");

  if (!fs.existsSync(prebuildsDir)) {
    return [];
  }

  return fs
    .readdirSync(prebuildsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function resolveNativeAddonPath(): string {
  const prebuiltAddonPath = resolvePackagePath(
    import.meta.url,
    "prebuilds",
    targetLabel,
    "axidev_io.node",
  );

  if (fs.existsSync(prebuiltAddonPath)) {
    return prebuiltAddonPath;
  }

  const devAddonPath = resolvePackagePath(
    import.meta.url,
    "build",
    "Release",
    "axidev_io.node",
  );

  if (fs.existsSync(devAddonPath)) {
    return devAddonPath;
  }

  const availableTargets = listAvailablePrebuildTargets();
  const availableDescription =
    availableTargets.length > 0 ? availableTargets.join(", ") : "none";

  throw new Error(
    [
      `No native addon was found for ${targetLabel}.`,
      `Expected prebuilt path: ${prebuiltAddonPath}`,
      `Available packaged prebuilds: ${availableDescription}`,
      `See native runtime requirements: ${consumerGuidePath}`,
    ].join(" "),
  );
}

const nativeAddonPath = resolveNativeAddonPath();

let native: NativeBinding;

try {
  native = require(nativeAddonPath) as NativeBinding;
} catch (error) {
  const guidance =
    process.platform === "linux"
      ? " On Linux, the packaged addon still requires the system shared libraries libinput, libudev, and xkbcommon at runtime."
      : "";

  throw new Error(
    `Failed to load native addon at ${nativeAddonPath}.${guidance} See ${consumerGuidePath}.`,
    {
      cause: error instanceof Error ? error : undefined,
    },
  );
}

export default native;
