#!/usr/bin/env node
/** Copy the IDL produced by `anchor build` into the versioned client folder. */
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(root, "target/idl/motora.json");
const targets = [
  resolve(root, "idl/motora.json"),
  resolve(root, "client/src/idl/motora.json"),
  resolve(root, "app/src/idl/motora.json"),
];

for (const target of targets) {
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(source, target);
  console.log(`IDL -> ${target.replace(root + "/", "")}`);
}
