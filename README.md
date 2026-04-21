# @axidev/io

`@axidev/io` is a Node/Electron main-process package for keyboard automation and keyboard event listening.

It wraps the native `axidev-io` library and exposes a small JS API centered around `keyboard`, `keyboard.sender`, `keyboard.listener`, and `keyboard.keys`.

Supports ESM. CommonJS is also available.

## Install

```sh
npm install @axidev/io
```

The published package ships compiled JavaScript from `dist/` and packaged native addon binaries from `prebuilds/<platform>-<arch>/`.
End users should not need a local C/C++ build toolchain when a matching prebuilt is present.

Important native docs are shipped in the package as well:

- `vendor/axidev-io/docs/consumers/README.md`
- `vendor/axidev-io/README.md`
- `vendor/axidev-io/LICENSE`
- `vendor/axidev-io/vendor/licenses/*`

## Platform Notes

Supported platforms:

- Linux
- Windows

This package is meant for Node.js and Electron main-process usage. It is not intended for browser code or Electron renderer code.

## System Requirements

### Windows

Runtime notes:

- uses the packaged prebuilt `axidev_io.node`
- no local compiler toolchain is required for normal npm installs

### Linux

Runtime requirements:

- the packaged prebuilt `axidev_io.node`
- system shared libraries for `libinput`, `libudev`, and `xkbcommon`
- access to `/dev/uinput` for key injection
- access to the relevant `/dev/input/event*` devices for listening

On Linux, those backend dependencies are intentionally expected from the system and must remain dynamically linked.
`keyboard.setupPermissions()` can help set up the required `uinput` access.
For the full native runtime/compliance guidance, read `vendor/axidev-io/docs/consumers/README.md` in the installed package.

## Simple Example

```js
import { keyboard } from "@axidev/io";

const permissions = keyboard.setupPermissions();

if (permissions.requiresLogout) {
  console.log("Log out and back in, then run again.");
  process.exit(0);
}

keyboard.initialize({ keyDelayUs: 2000 });

keyboard.sender.text("Hello from @axidev/io");
keyboard.sender.tap("Ctrl+Shift+P");

const stop = keyboard.listener.start((event) => {
  console.log(event.combo, event.pressed, event.text);
});

setTimeout(() => {
  stop();
  keyboard.shutdown();
}, 5000);
```

## API Shape

Main entrypoints:

- `keyboard.initialize(options?)`
- `keyboard.shutdown()`
- `keyboard.setupPermissions()`
- `keyboard.status()`
- `keyboard.version()`

Sender methods:

- `keyboard.sender.tap(input, mods?)`
- `keyboard.sender.keyDown(input, mods?)`
- `keyboard.sender.keyUp(input, mods?)`
- `keyboard.sender.text(text)`
- `keyboard.sender.typeCharacter(input)`
- `keyboard.sender.holdModifiers(mods)`
- `keyboard.sender.releaseModifiers(mods)`
- `keyboard.sender.releaseAllModifiers()`
- `keyboard.sender.flush()`

Listener methods:

- `keyboard.listener.start(callback)`
- `keyboard.listener.stop()`

Key helpers:

- `keyboard.keys.parse(name)`
- `keyboard.keys.format(key)`
- `keyboard.keys.parseCombo(text)`
- `keyboard.keys.formatCombo(input, mods?)`
- `keyboard.keys.modifiers.resolve(mods)`
- `keyboard.keys.modifiers.toNames(mask)`

## Listener Events

Listener callbacks receive objects shaped like:

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

## Initialization

Call `keyboard.initialize()` before using:

- `keyboard.sender.*`
- `keyboard.listener.start(...)`

Key parsing and formatting helpers under `keyboard.keys` can be used without initialization.

## Development

Useful scripts:

- `npm run build`
- `npm run build:native`
- `npm run stage:prebuilt`
- `npm run build:release`
- `npm run smoke`
- `npm run test:consumer:esm`
- `npm test`
- `npm run typecheck`
- `npm run sync:upstream`

There is also a tracked local consumer fixture in `test-package/`.
It is an ESM package that installs the generated local npm tarball and sends a simple `Hello world` text payload to the currently focused window.
It is kept in the repository for manual testing, but it is not included in the published npm package.
