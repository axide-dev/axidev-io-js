import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const sourcePath = path.join(rootDir, "build", "Release", "axidev_io.node");
const targetDir = path.join(
  rootDir,
  "prebuilds",
  `${process.platform}-${process.arch}`,
);
const targetPath = path.join(targetDir, "axidev_io.node");
const tempTargetPath = path.join(targetDir, "axidev_io.node.tmp");

function sha256(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function sameFileContents(leftPath, rightPath) {
  return sha256(leftPath) === sha256(rightPath);
}

if (!existsSync(sourcePath)) {
  throw new Error(
    `Missing built addon at ${sourcePath}. Run the native build before staging prebuilt artifacts.`,
  );
}

mkdirSync(targetDir, { recursive: true });

try {
  rmSync(tempTargetPath, { force: true });
  copyFileSync(sourcePath, tempTargetPath);
  renameSync(tempTargetPath, targetPath);
} catch (error) {
  rmSync(tempTargetPath, { force: true });

  if (
    existsSync(targetPath) &&
    sameFileContents(sourcePath, targetPath) &&
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error.code === "EBUSY" || error.code === "EPERM")
  ) {
    console.log(`Prebuilt addon already staged and locked in place: ${targetPath}`);
    process.exit(0);
  }

  throw error;
}

console.log(`Staged prebuilt addon: ${targetPath}`);
