#!/usr/bin/env -S deno run --allow-all --node-modules-dir=auto

import { parseArgs } from "jsr:@std/cli/parse-args";
import { join } from "jsr:@std/path@^1.0.7/join";
import { compare, format, parse, SemVer } from "jsr:@std/semver";
import { exec, loadPackages } from "./lib.ts";

const DEFAULT_KEEP = 3;

export async function main() {
  const flags = parseArgs(Deno.args, {
    boolean: ["noop"],
  });

  const packages = await loadPackages();
  const skipList = Object.entries(packages).filter(([_, v]) =>
    v.prune?.skip === true
  ).map(([k]) => k);

  const debs = new Map<string, Array<[string, SemVer]>>();

  for await (const dirEntry of Deno.readDir("apt/pool/main")) {
    if (!dirEntry.name.endsWith(".deb")) {
      continue;
    }

    // This is an easy way to skip the packages since we don't wanna even try to parse them
    let skipped = false;
    for (const skip of skipList) {
      if (dirEntry.name.includes(skip)) {
        skipped = true;
        break;
      }
    }
    if (skipped) continue;

    const res = await exec([
      "dpkg-deb",
      "-f",
      join("apt/pool/main", dirEntry.name),
      "Package",
      "Version",
    ]);

    const parts = res.stdout().split("\n");

    const name = parts[0].split(": ")[1];
    const version = parse(parts[1].split(": ")[1]);

    const ourDebs = debs.get(name);
    if (ourDebs === undefined) {
      debs.set(name, [[dirEntry.name, version]]);
    } else {
      ourDebs.push([dirEntry.name, version]);
    }
  }

  for (const [name, pkg] of Object.entries(packages)) {
    let ourDebs = debs.get(name);
    if (!ourDebs) {
      continue;
    }

    ourDebs = ourDebs.sort(([_a, a], [_b, b]) => compare(a, b)).filter(
      ([_, item]) => {
        return !pkg.versions?.includes(format(item));
      },
    );

    const toPrune = ourDebs.slice(0, (pkg.prune?.keep || DEFAULT_KEEP) * -1)
      .map(([k]) => k);

    if (toPrune.length === 0) {
      continue;
    }

    if (flags.noop) {
      console.log(`${name}: ${toPrune.join(" ")}`);
    } else {
      for (const path of toPrune) {
        await Deno.remove(join("apt/pool/main", path));
      }
      console.log(`${name}: ${toPrune.join(" ")}`);
    }
  }
}

await main();
