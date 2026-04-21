# Releasing `@axidev/io`

This repository publishes to npm from a GitHub Release event.
The publish workflow only accepts tags that point to commits reachable from the `release` branch.

## Prerequisites

- Release-ready changes are already merged to `main`
- The `NPM_TOKEN` GitHub Actions secret is configured for the repository or organization
- You can push to `release` and create tags/releases on GitHub
- `gh` is installed and authenticated if you want to create the GitHub Release from the CLI

## Release Flow

### 1. Update local branches

```sh
git checkout main
git pull --ff-only origin main

git checkout release
git pull --ff-only origin release
```

### 2. Fast-forward `release` to `main`

If `release` is meant to publish the current `main`, keep the branch linear:

```sh
git merge --ff-only origin/main
```

If this fails, stop and resolve why `release` has diverged before continuing.

### 3. Confirm the package version on `release`

The release tag must match `package.json`:

```sh
node -p "require('./package.json').version"
```

If you need to change the package version, do it on `release`, commit it, and re-run your checks before tagging.

### 4. Run local verification

```sh
npm ci
npm run typecheck
npm test
```

If you have the required native toolchain and Linux dependencies available locally, you can also run:

```sh
npm run build:release
npm run smoke
```

### 5. Push the updated `release` branch

```sh
git push origin release
```

### 6. Create and push the release tag

Replace `0.1.0` with the package version from `package.json`.

```sh
git tag 0.1.0
git push origin 0.1.0
```

The workflow accepts either `0.1.0` or `v0.1.0`, but keeping the tag equal to `package.json` avoids ambiguity.

### 7. Publish the GitHub Release

Create a GitHub Release for the tag you just pushed:

```sh
gh release create 0.1.0 --title 0.1.0 --generate-notes
```

Publishing that GitHub Release triggers `.github/workflows/publish.yml`, which:

- validates the tag is based on `release`
- builds Linux and Windows prebuilt binaries
- assembles the final npm package
- publishes `@axidev/io` to npm using `NPM_TOKEN`

## Post-Release Checks

- Verify the GitHub Actions publish workflow succeeded
- Verify the package is visible on npm
- Verify the GitHub Release notes and tag point to the expected commit
