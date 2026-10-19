const { copyFileSync, existsSync, renameSync, unlinkSync } = require("node:fs");
const { spawnSync } = require("node:child_process");
const path = require("node:path");

if (process.platform !== "darwin") {
  process.exit(0);
}

const bindings = [
  "node_modules/@next/swc-darwin-arm64/next-swc.darwin-arm64.node",
  "node_modules/@tailwindcss/oxide-darwin-arm64/tailwindcss-oxide.darwin-arm64.node",
  "node_modules/lightningcss-darwin-arm64/lightningcss.darwin-arm64.node",
];

for (const binding of bindings) {
  const fullPath = path.join(process.cwd(), binding);
  if (!existsSync(fullPath)) {
    continue;
  }

  // Sign a fresh inode. macOS can retain a failed code-signature validation
  // for an already-loaded file even after an in-place signature replacement.
  const signedPath = `${fullPath}.signed.node`;
  copyFileSync(fullPath, signedPath);
  const result = spawnSync("codesign", ["--force", "--sign", "-", signedPath], {
    stdio: "inherit",
  });

  if (result.status !== 0) {
    unlinkSync(signedPath);
    console.warn(`Skipping native binding signing for ${binding}`);
  } else {
    renameSync(signedPath, fullPath);
  }
}
