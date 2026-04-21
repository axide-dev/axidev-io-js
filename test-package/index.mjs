import { keyboard } from "@axidev/io";

const message = "Hello world";
const delayMs = 3000;

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

const permissions = keyboard.setupPermissions();

if (permissions.requiresLogout) {
  console.error("Permissions changed. Log out and back in before running again.");
  process.exit(1);
}

console.log("version:", keyboard.version());
console.log("backend:", keyboard.backendName);
console.log(`Focus the target window. Sending "${message}" in ${delayMs / 1000}s...`);

await sleep(delayMs);

keyboard.initialize();

try {
  keyboard.sender.text(message);
  console.log(`sent: ${message}`);
} finally {
  keyboard.shutdown();
}
