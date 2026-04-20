import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const submoduleDir = path.join("vendor", "axidev-io");

function run(args) {
  console.log("+", "git", ...args);

  const result = spawnSync("git", args, {
    cwd: rootDir,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} exited with status ${result.status ?? "unknown"}`);
  }
}

run(["submodule", "sync", "--", submoduleDir]);
run(["submodule", "update", "--init", "--remote", "--checkout", "--", submoduleDir]);

console.log(`Synced ${submoduleDir} from its configured upstream branch`);
