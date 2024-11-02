#!/usr/bin/env -S deno run --allow-all --node-modules-dir=auto

import { exec } from "./lib.ts";
import { parseArgs } from "jsr:@std/cli/parse-args";

const flags = parseArgs(Deno.args, {
  boolean: ["push"],
  string: ["tag"],
});

const tag = flags.tag || "latest"

console.log("Generating bootstrap deb...");
const cwd = Deno.cwd();
Deno.chdir("bootstrap");
await exec("nfpm pkg --packager deb");
Deno.chdir(cwd);

console.log("Generating docker image...");
await exec(`docker build -t docker.hydr0.com/pkg/pkg:${tag} .`, { inherit: true });

if (flags.push) {
  console.log("Pushing docker image...");
  await exec(`docker push docker.hydr0.com/pkg/pkg:${tag}`, { inherit: true });
}
