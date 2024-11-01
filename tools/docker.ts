#!/usr/bin/env -S deno run --allow-all --node-modules-dir=auto

import { exec } from "./lib.ts";

console.log("Generating bootstrap deb...");
const cwd = Deno.cwd();
Deno.chdir("bootstrap");
await exec("nfpm pkg --packager deb");
Deno.chdir(cwd);

console.log("Generating docker image...");
await exec("docker build -t github.com/b1naryth1ef/pkg:latest .");
