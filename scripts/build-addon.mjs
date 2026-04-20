import { existsSync, mkdirSync, readdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const nodeGypBin = require.resolve("node-gyp/bin/node-gyp.js");
const upstreamDir = path.join(rootDir, "vendor", "axidev-io");

function run(command, args, options = {}) {
  console.log("+", command, ...args);

  const result = spawnSync(command, args, {
    cwd: rootDir,
    stdio: "inherit",
    ...options,
  });

  if (result.status !== 0) {
    throw new Error(`${command} exited with status ${result.status ?? "unknown"}`);
  }
}

function sortVersionsDescending(entries) {
  return [...entries].sort((left, right) => {
    const leftParts = left.split(".").map((part) => Number.parseInt(part, 10) || 0);
    const rightParts = right.split(".").map((part) => Number.parseInt(part, 10) || 0);
    const length = Math.max(leftParts.length, rightParts.length);

    for (let index = 0; index < length; index += 1) {
      const delta = (rightParts[index] ?? 0) - (leftParts[index] ?? 0);
      if (delta !== 0) {
        return delta;
      }
    }

    return 0;
  });
}

function ensureClangExists() {
  run("clang", ["--version"]);

  if (process.platform === "win32") {
    run("clang++", ["--version"]);
  }
}

function ensureNodeHeaders() {
  const cacheRoot =
    process.platform === "win32"
      ? path.join(
          process.env.LOCALAPPDATA ?? path.join(os.homedir(), "AppData", "Local"),
          "node-gyp",
          "Cache",
          process.versions.node,
        )
      : path.join(os.homedir(), ".cache", "node-gyp", process.versions.node);
  const nodeLib = path.join(
    cacheRoot,
    process.platform === "win32" ? "x64" : "lib",
    process.platform === "win32" ? "node.lib" : "node.a",
  );

  if (!existsSync(path.join(cacheRoot, "include", "node")) || !existsSync(nodeLib)) {
    run(process.execPath, [nodeGypBin, "install", "--ensure"]);
  }

  return {
    cacheRoot,
    nodeLib,
  };
}

function findMsvcLibDir() {
  const baseDir = path.join(
    process.env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)",
    "Microsoft Visual Studio",
    "2022",
  );
  const editions = ["BuildTools", "Community", "Professional", "Enterprise"];

  for (const edition of editions) {
    const toolsRoot = path.join(baseDir, edition, "VC", "Tools", "MSVC");
    if (!existsSync(toolsRoot)) {
      continue;
    }

    const versions = sortVersionsDescending(
      readdirSync(toolsRoot, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name),
    );

    for (const version of versions) {
      const candidate = path.join(toolsRoot, version, "lib", "x64");
      if (existsSync(candidate)) {
        return candidate;
      }
    }
  }

  throw new Error("Could not find the MSVC x64 library directory");
}

function findWindowsSdkLibDirs() {
  const sdkRoot = path.join(
    process.env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)",
    "Windows Kits",
    "10",
    "lib",
  );

  if (!existsSync(sdkRoot)) {
    throw new Error("Could not find the Windows 10 SDK libraries");
  }

  const versions = sortVersionsDescending(
    readdirSync(sdkRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name),
  );

  for (const version of versions) {
    const ucrt = path.join(sdkRoot, version, "ucrt", "x64");
    const um = path.join(sdkRoot, version, "um", "x64");

    if (existsSync(ucrt) && existsSync(um)) {
      return { ucrt, um };
    }
  }

  throw new Error("Could not find matching Windows SDK ucrt/um x64 library directories");
}

function buildWindowsAddon() {
  const { cacheRoot, nodeLib } = ensureNodeHeaders();
  const msvcLibDir = findMsvcLibDir();
  const windowsSdkLibDirs = findWindowsSdkLibDirs();
  const manualDir = path.join(rootDir, "build", "manual");
  const releaseDir = path.join(rootDir, "build", "Release");
  const addonObject = path.join(manualDir, "addon.o");
  const delayHookObject = path.join(manualDir, "win_delay_load_hook.o");
  const outputFile = path.join(releaseDir, "axidev_io.node");
  const upstreamLibrary = path.join(
    upstreamDir,
    "build",
    "windows",
    "lib",
    "libaxidev-io.a",
  );
  const includeDirs = [
    path.join(cacheRoot, "include", "node"),
    path.join(cacheRoot, "src"),
    path.join(cacheRoot, "deps", "openssl", "config"),
    path.join(cacheRoot, "deps", "openssl", "openssl", "include"),
    path.join(cacheRoot, "deps", "uv", "include"),
    path.join(cacheRoot, "deps", "zlib"),
    path.join(cacheRoot, "deps", "v8", "include"),
    path.join(upstreamDir, "include"),
    path.join(upstreamDir, "src"),
    path.join(upstreamDir, "vendor"),
  ];

  mkdirSync(manualDir, { recursive: true });
  mkdirSync(releaseDir, { recursive: true });

  run("python", ["build.py", "--build-dir", "build/windows"], {
    cwd: upstreamDir,
  });

  run("clang", [
    "-std=c11",
    "-DAXIDEV_IO_STATIC",
    "-D_CRT_SECURE_NO_WARNINGS",
    ...includeDirs.flatMap((dir) => ["-I", dir]),
    "-c",
    path.join(rootDir, "src", "addon.c"),
    "-o",
    addonObject,
  ]);

  run("clang++", [
    "-std=c++20",
    "-c",
    path.join(rootDir, "src", "win_delay_load_hook.cc"),
    "-o",
    delayHookObject,
  ]);

  run("clang", [
    "-shared",
    "-fuse-ld=lld",
    "-fms-runtime-lib=static",
    "-o",
    outputFile,
    addonObject,
    delayHookObject,
    upstreamLibrary,
    nodeLib,
    path.join(windowsSdkLibDirs.um, "user32.lib"),
    path.join(windowsSdkLibDirs.um, "kernel32.lib"),
    path.join(msvcLibDir, "delayimp.lib"),
    "-Wl,/DELAYLOAD:node.exe",
  ]);
}

function buildAddon() {
  ensureClangExists();

  if (process.platform === "win32") {
    buildWindowsAddon();
    return;
  }

  run(process.execPath, [nodeGypBin, "rebuild"]);
}

buildAddon();
