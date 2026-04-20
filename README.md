# @axidev/io

`@axidev/io` is a Node/Electron package that wraps the native `axidev-io` C
library behind a JavaScript-friendly API.

Recommended architecture:

```text
Electron main process / Node -> N-API addon -> axidev-io
```

This package is intended for the Electron main process or plain Node. It is not
designed for renderer code.

## What It Wraps

The upstream lives under `vendor/axidev-io/` as a Git submodule tracking:

- `git@github.com:axide-dev/axidev-io.git`
- branch `release`

The native addon exposes the upstream keyboard sender/listener surface and uses
`napi_threadsafe_function` to bridge listener callbacks from the library's
background thread into JavaScript safely.

## Install

```sh
npm install
```

The install step builds the addon locally.

If you are working from source, initialize the upstream submodule first:

```sh
git submodule update --init --recursive
```

- Linux uses `node-gyp`
- Windows uses the vendored upstream `build.py` plus a direct `clang` link step

### Windows Prerequisites

At build time:

- LLVM with `clang`, `clang++`, and `llvm-ar`
- Python 3
- Visual Studio Build Tools with the Windows SDK libraries

### Linux Prerequisites

At build time:

- `pkg-config`
- `libinput`
- `libudev`
- `xkbcommon`

At runtime:

- write access to `/dev/uinput` for key injection
- access to the relevant `/dev/input/event*` devices for listening

These are system/environment requirements from `axidev-io`, not npm issues.

## Permissions

For application code, prefer `setupPermissions()` as the single entrypoint for
permission setup.

- On Linux, it checks whether `/dev/uinput` access is already available.
- If access is missing, it runs the vendored `setup_uinput_permissions.sh`
  helper and returns `requiresLogout: true`.
- On Windows, it simply validates the native permission path and returns.

```js
const io = require("@axidev/io");

const permissions = io.setupPermissions();

if (permissions.requiresLogout) {
  console.log("Log out and back in, then rerun the app.");
  process.exit(0);
}

io.initialize({ keyDelayUs: 2000 });
```

`requestPermissions()` is still available as the low-level native call if you
need it, but `setupPermissions()` is the recommended package-level helper.

## Usage

```js
const io = require("@axidev/io");

io.initialize({ keyDelayUs: 2000 });

io.typeText("Hello from Node");
io.tap("Ctrl+C");
io.tap({ key: "A", mods: ["Shift"] });

const stop = io.listen((event) => {
  console.log(event.combo, event.pressed, event.text);
});

setTimeout(() => {
  stop();
  io.shutdown();
}, 5000);
```

### Main API

- `initialize(options?)`
- `shutdown()` / `free()`
- `isReady()`
- `requestPermissions()` / `setupPermissions()`
- `typeText(text)`
- `typeCharacter(charOrCodepoint)`
- `tap(input, mods?)`
- `keyDown(input, mods?)`
- `keyUp(input, mods?)`
- `listen(callback)` / `startListener(callback)`
- `stopListener()`
- `getCapabilities()`
- `status()`
- `parseKey(name)` / `formatKey(key)`
- `parseCombo(text)` / `formatCombo(input, mods?)`

Preferred inputs are strings such as `"A"` or `"Ctrl+Shift+P"`, but numeric
key ids are also accepted for low-level use.

## Listener Events

Listener callbacks receive:

```ts
type KeyEvent = {
  codepoint: number;
  text: string | null;
  key: number;
  keyName: string | null;
  mods: number;
  modifiers: string[];
  combo: string | null;
  pressed: boolean;
};
```

The JS layer fans out a single native listener to multiple JS subscribers.

## Development

Sync the upstream submodule to the latest `release` commit:

```sh
npm run sync:upstream
```

Run a quick load/parsing smoke test:

```sh
npm run smoke
```

Run the local test suite:

```sh
npm test
```

Run the upstream integration suite from the vendored submodule:

```sh
cd vendor/axidev-io
python build.py test
```
