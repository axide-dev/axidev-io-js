import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import pkg from "../package.json" with { type: "json" };

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const testPackageDir = path.join(rootDir, "test-package");
const tarballName = `axidev-io-${pkg.version}.tgz`;
const tarballPath = path.join(rootDir, tarballName);
const testPackageLockPath = path.join(testPackageDir, "package-lock.json");

function quoteWindowsArg(value) {
  if (!/[\s"]/u.test(value)) {
    return value;
  }

  return `"${value.replace(/"/g, '\\"')}"`;
}

function run(command, args, cwd) {
  const result =
    process.platform === "win32"
      ? spawnSync(
          process.env.ComSpec ?? "cmd.exe",
          [
            "/d",
            "/s",
            "/c",
            [command, ...args].map(quoteWindowsArg).join(" "),
          ],
          {
            cwd,
            stdio: "inherit",
          },
        )
      : spawnSync(command, args, {
          cwd,
          stdio: "inherit",
        });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed with status ${result.status ?? "unknown"}`,
    );
  }
}

rmSync(testPackageLockPath, { force: true });
run("npm", ["pack"], rootDir);
run("npm", ["install", "--no-package-lock", tarballPath], testPackageDir);
rmSync(testPackageLockPath, { force: true });
