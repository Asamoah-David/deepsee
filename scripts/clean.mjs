#!/usr/bin/env node
/**
 * Cross-platform workspace clean.
 *
 * The previous root `clean` script used `find . -name node_modules ... -exec rm`,
 * which is a Unix invocation. On Windows `find` is a completely different
 * program, so `pnpm clean` failed there. This walks the tree in Node instead
 * and works identically on Windows, macOS and Linux.
 */

import { readdirSync, rmSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Directories that are always safe to delete and never worth descending into. */
const REMOVABLE = new Set(['node_modules', '.next', '.turbo', 'dist', 'coverage']);

/** Never delete these, even if they were somehow named like build output. */
const PROTECTED = new Set(['.git', '.github', '.vscode']);

let removed = 0;

function walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (PROTECTED.has(entry.name)) continue;

    const full = join(dir, entry.name);

    if (REMOVABLE.has(entry.name)) {
      try {
        rmSync(full, { recursive: true, force: true });
        removed += 1;
      } catch (error) {
        console.error(`  failed to remove ${full}: ${error.message}`);
      }
      // Do not descend: everything inside is gone.
      continue;
    }

    walk(full);
  }
}

if (!existsSync(ROOT)) {
  console.error(`Workspace root not found: ${ROOT}`);
  process.exit(1);
}

console.log(`Cleaning workspace at ${ROOT}`);
walk(ROOT);
console.log(
  removed === 0
    ? 'Nothing to clean.'
    : `Removed ${removed} build/dependency director${removed === 1 ? 'y' : 'ies'}.`,
);