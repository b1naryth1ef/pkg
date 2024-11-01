#!/usr/bin/env -S deno run --allow-all --node-modules-dir=auto

import { parseArgs } from "jsr:@std/cli/parse-args";
import { exists } from "jsr:@std/fs";
import {
  exec,
  loadPackages,
  type PackageDescription,
  type PackageDescriptionBuild,
  type PackageDescriptionBuildDocker,
  type PackageDescriptionGithubRelease,
  type PackageDescriptionMirror,
} from "./lib.ts";

type GithubRelease = {
  assets: Array<{
    url: string;
    id: number;
    name: string;
    content_type: string;
    size: number;
    browser_download_url: string;
  }>;
};

export type BuildCtx = {
  force: boolean;
};

export async function mirror(desc: PackageDescriptionMirror, ctx: BuildCtx) {
  const res = await fetch(desc.url);
  const [filename] = res.url.split("/").slice(-1);

  const outPath = `apt/pool/main/${filename}`;
  if (!ctx.force && (await exists(outPath))) {
    return;
  }

  const download = await Deno.open(`${filename}`, {
    create: true,
    write: true,
  });
  await res.body?.pipeTo(download.writable);
}

export async function githubRelease(
  name: string,
  desc: PackageDescriptionGithubRelease,
  ctx: BuildCtx
) {
  for (const version of desc.versions) {
    const outPath = `apt/pool/main/${name}_${version}_amd64.deb`;
    if (!ctx.force && (await exists(outPath))) {
      continue;
    }

    const res = await fetch(
      `https://api.github.com/repos/${desc.repo}/releases/tags/v${version}`
    );
    if (!res.ok) {
      console.log(
        `https://api.github.com/repos/${desc.repo}/releases/tags/v${version}`
      );
      throw new Error(
        `failed to fetch github release from ${desc.repo}: ${version}`
      );
    }

    const data = (await res.json()) as GithubRelease;
    const assets = new Map(
      data.assets.map((it) => [it.name, it.browser_download_url])
    );

    for (const [dst, src] of Object.entries(desc.files)) {
      const url = assets.get(src.name.replaceAll("$VERSION", version));
      if (!url) {
        throw new Error(`failed to find file dst=${dst} src=${src}`);
      }

      const assetOutPath = `tmp/${dst}`;
      const downloadRes = await fetch(url);
      const download = await Deno.open(assetOutPath, {
        create: true,
        write: true,
      });
      await downloadRes.body?.pipeTo(download.writable);

      if (src.postProcess) {
        if (Array.isArray(src.postProcess)) {
          for (const cmd of src.postProcess) {
            await exec(cmd);
          }
        } else {
          await exec(src.postProcess);
        }
      }
    }

    await exec(`nfpm pkg --packager deb --config pkgs/${name}/nfpm.yaml`, {
      env: {
        VERSION: version,
      },
    });
  }
}

export async function buildDocker(
  name: string,
  desc: PackageDescriptionBuildDocker,
  ctx: BuildCtx
) {
  let path;

  for (const version of desc.versions) {
    const outPath = `apt/pool/main/${name}_${version}_amd64.deb`;
    if (!ctx.force && (await exists(outPath))) {
      continue;
    }

    if (desc.git) {
      path = `tmp/${name}-repo`;
      if (!(await exists(path))) {
        await exec(
          `git clone --branch v${version} ${desc.git} tmp/${name}-repo`
        );
      } else {
        await exec(`git fetch --tags`, { cwd: path });
        await exec(`git checkout v${version}`, { cwd: path });
        await exec(`git reset --hard`, { cwd: path });
      }
    } else if (desc.path) {
      path = desc.path;
    } else {
      throw new Error(`path or git required for build-docker`);
    }

    const buildArgs = Object.entries(desc.args || {}).map(
      ([k, v]) => `--build-arg=${k}=${v}`
    );
    const args = ["docker", "build", "-t", `${name}:latest`, ...buildArgs, "."];

    const listOfFiles = desc.extract.join(" ");
    await exec(args, { cwd: path, inherit: true });
    await exec([
      "docker",
      "run",
      "--entrypoint",
      "/bin/sh",
      "-v",
      "./tmp:/opt/out",
      `${name}:latest`,
      "-c",
      `cp -r ${listOfFiles} /opt/out/`,
    ]);

    await exec(`nfpm pkg --packager deb --config pkgs/${name}/nfpm.yaml`, {
      env: {
        VERSION: version,
      },
    });
  }
}

export async function build(
  name: string,
  desc: PackageDescriptionBuild,
  ctx: BuildCtx
) {
  // deno-lint-ignore no-explicit-any
  const exports = (await import(`../pkgs/${name}/build.ts`)) as any;

  if (desc.versions) {
    for (const version of desc.versions) {
      const outPath = `apt/pool/main/${name}_${version}_amd64.deb`;
      if (!ctx.force && (await exists(outPath))) {
        continue;
      }
      await exports.default({ ...desc, versions: undefined, version }, ctx);
    }
  } else {
    await exports.default(desc, ctx);
  }
}

async function runBuild(name: string, desc: PackageDescription, ctx: BuildCtx) {
  const start = performance.now();
  if (desc.type === "mirror") {
    await mirror(desc, ctx);
  } else if (desc.type === "build") {
    await build(name, desc, ctx);
  } else if (desc.type === "build-docker") {
    await buildDocker(name, desc, ctx);
  } else if (desc.type === "github-release") {
    await githubRelease(name, desc, ctx);
  } else {
    throw new Error(`unsupported package build type '${desc}'`);
  }
  console.log(
    `  built package ${name} in ${((performance.now() - start) / 1000).toFixed(
      2
    )}s`
  );
}

export async function main() {
  const flags = parseArgs(Deno.args, {
    boolean: ["force"],
  });

  if (!(await exists("tmp"))) {
    await Deno.mkdir("tmp/");
  }

  const ctx = { force: flags.force };
  const packages = await loadPackages();

  await Promise.all(
    Object.entries(packages)
      .filter(([name]) => flags["_"].length === 0 || flags["_"].includes(name))
      .map(([name, desc]) => runBuild(name, desc, ctx))
  );

  for await (const dirEntry of Deno.readDir(".")) {
    if (dirEntry.name.endsWith(".deb")) {
      console.log("  -> moving output package ", dirEntry.name);
      await Deno.rename(dirEntry.name, `apt/pool/main/${dirEntry.name}`);
    }
  }
}

await main();
