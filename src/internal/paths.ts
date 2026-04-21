import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function candidateRoots(startDir: string): string[] {
  return [
    startDir,
    path.resolve(startDir, ".."),
    path.resolve(startDir, "..", ".."),
  ];
}

export function resolvePackageRoot(moduleUrl: string): string {
  const startDir = path.dirname(fileURLToPath(moduleUrl));

  for (const candidate of candidateRoots(startDir)) {
    if (fs.existsSync(path.join(candidate, "package.json"))) {
      return candidate;
    }
  }

  return path.resolve(startDir, "..");
}

export function resolvePackagePath(
  moduleUrl: string,
  ...segments: string[]
): string {
  return path.join(resolvePackageRoot(moduleUrl), ...segments);
}
