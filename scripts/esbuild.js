#!/usr/bin/env node

import { readdirSync, readFileSync, rmdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import * as esbuild from "esbuild";
import { esbuildPreserveWhitespacePlugin } from "esbuild-preserve-whitespace";

const projectRoot = join(fileURLToPath(import.meta.url), "..", "..");
config({ path: join(projectRoot, ".env") });
const envSuffix = process.env.ENV ? `-${process.env.ENV}` : "";

function removeTypeOnlyFiles(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
            removeTypeOnlyFiles(fullPath);
        } else if (entry.name.endsWith(".js")) {
            const content = readFileSync(fullPath, "utf-8");
            const stripped = content
                .replace(/^export\s+\*\s+from\s+["'][^"']*["']\s*;?\s*/gm, "")
                .replace(/^export\s*\{\s*\}\s*;?\s*/gm, "")
                .trim();
            if (!stripped) {
                rmSync(fullPath);
            }
        }
    }
    try {
        const remaining = readdirSync(dir);
        if (remaining.length === 0) {
            rmdirSync(dir);
        }
    } catch {
        /* directory already removed or protected */
    }
}

// 1. Transpile extension source files 1:1 without bundling (bundle: false)
await esbuild.build({
    entryPoints: ["src/**/*.ts"],
    outdir: "dist/",
    platform: "neutral",
    format: "esm",
    bundle: false,
    splitting: false,
    sourcemap: false,
    minify: false,
    legalComments: "inline",
    tsconfig: "tsconfig.json",
    mainFields: ["module", "main"],
    conditions: ["module", "import", "default"],
    define: {
        __ETHCAL_ENV_SUFFIX__: JSON.stringify(envSuffix),
    },
    plugins: [esbuildPreserveWhitespacePlugin()],
});

// 2. Bundle external npm dependencies (kenat) into standalone dist/lib/kenat.js
await esbuild.build({
    entryPoints: ["src/lib/kenat.ts"],
    outfile: "dist/lib/kenat.js",
    platform: "neutral",
    format: "esm",
    bundle: true,
    allowOverwrite: true,
    splitting: false,
    sourcemap: false,
    minify: false,
    legalComments: "inline",
    tsconfig: "tsconfig.json",
    plugins: [esbuildPreserveWhitespacePlugin()],
});

removeTypeOnlyFiles(join(projectRoot, "dist"));
