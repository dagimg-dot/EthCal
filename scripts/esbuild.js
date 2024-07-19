#!/usr/bin/env node

import * as esbuild from 'esbuild';

esbuild.build({
    entryPoints: ['src/**/*.ts'],
    outdir: 'dist/',
    platform: 'neutral',
    format: 'esm'
});
