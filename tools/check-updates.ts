#!/usr/bin/env -S deno run --allow-all --node-modules-dir=auto

import { parseArgs } from "jsr:@std/cli/parse-args";
import {
  lessThan,
  parse
} from "jsr:@std/semver";
import {
  loadPackages,
  PackageDescriptionGithubRelease
} from "./lib.ts";

export async function main() {
  const flags = parseArgs(Deno.args, {});

  const githubReleasePackages = Object.entries(await loadPackages())
      .filter(([name]) => flags["_"].length === 0 || flags["_"].includes(name))
      .filter(([_, desc]) => desc.type === "github-release") as [string, PackageDescriptionGithubRelease][];
  
  for (const [name, desc] of githubReleasePackages) {
    const res = await fetch(
      `https://api.github.com/repos/${desc.repo}/releases/latest`
    )
    if (!res.ok) {
      throw new Error(`failed to fetch latest github release from ${desc.repo}`);
    }

    let version = 'v' + desc.versions[0];
    if (desc.versionPrefix) {
      version = desc.versionPrefix + desc.versions[0];
    }

    const data = await res.json();

    if (desc.semver === false) {
      if (version === data.tag_name) {
        continue
      }
      console.log(`[${name}] potentially newer version for non-semver package: ${data.tag_name} (${data.html_url}`)
      continue
    }

    if (lessThan(parse(version), parse(data.tag_name))) {
      console.log(`[${name}] newer version available: ${data.tag_name} (${data.html_url}`)
    }
  }
}

await main();

