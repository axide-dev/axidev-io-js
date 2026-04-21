# test-package

Tracked local ESM consumer fixture for `@axidev/io`.

It is meant for manual end-to-end testing from a consumer package shape while
staying out of the published npm tarball.

## Usage

From the repo root:

```sh
npm run test:consumer:esm
```

Or directly:

```sh
cd test-package
npm run install-local
npm run hello
```

The script waits 3 seconds, then sends `Hello world` to the currently focused
window.
