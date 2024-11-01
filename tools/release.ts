#!/usr/bin/env -S deno run --allow-all
import { parseArgs } from "jsr:@std/cli/parse-args";
import { crypto } from "jsr:@std/crypto";
import { encodeHex } from "jsr:@std/encoding/hex";
import { walk } from "jsr:@std/fs/walk";
import { exec } from "./lib.ts";

export type Release = {
  origin: string;
  label: string;
  suite: string;
  codename: string;
  version: string;
  architectures: Array<string>;
  components: Array<string>;
  description: string;
  date: Date;
};

export async function generateReleaseFile(release: Release) {
  const contents: Array<string> = [];
  contents.push(`Origin: ${release.origin}`);
  contents.push(`Label: ${release.label}`);
  contents.push(`Suite: ${release.suite}`);
  contents.push(`Codename: ${release.codename}`);
  contents.push(`Version: ${release.version}`);
  contents.push(`Architectures: ${release.architectures.join(" ")}`);
  contents.push(`Components: ${release.components.join(" ")}`);
  contents.push(`Description: ${release.description}`);
  contents.push(`Date: ${release.date.toUTCString()}`);

  const hashes = await generateReleaseFileHashes();

  contents.push(`MD5Sum:`);
  for (const hash of hashes) {
    contents.push(` ${hash.md5sum} ${hash.size} ${hash.path}`);
  }

  contents.push(`SHA1:`);
  for (const hash of hashes) {
    contents.push(` ${hash.sha1} ${hash.size} ${hash.path}`);
  }

  contents.push(`SHA256:`);
  for (const hash of hashes) {
    contents.push(` ${hash.sha256} ${hash.size} ${hash.path}`);
  }

  return contents.join("\n");
}

type FileHashes = {
  md5sum: string;
  sha1: string;
  sha256: string;
  size: number;
  path: string;
};

async function getFileHashes(path: string): Promise<FileHashes> {
  const contents = await Deno.readFile(path);

  return {
    md5sum: encodeHex(await crypto.subtle.digest("MD5", contents)),
    sha1: encodeHex(await crypto.subtle.digest("SHA-1", contents)),
    sha256: encodeHex(await crypto.subtle.digest("SHA-256", contents)),
    size: contents.length,
    path,
  };
}

async function generateReleaseFileHashes(): Promise<Array<FileHashes>> {
  const cwd = Deno.cwd();
  Deno.chdir("apt/dists/stable");

  const result = [];
  for await (const dirEntry of walk(".")) {
    if (!dirEntry.isFile) continue;
    if (dirEntry.name === "Release") continue;

    result.push(await getFileHashes(dirEntry.path));
  }
  Deno.chdir(cwd);
  return result;
}

async function dpkgScanPackages() {
  const cwd = Deno.cwd();
  Deno.chdir("apt/");

  const command = new Deno.Command("dpkg-scanpackages", {
    args: ["--arch", "amd64", "pool/"],
  });

  const { code, stdout, stderr } = await command.output();
  if (code !== 0) {
    throw new Error(
      `failed to run dpkg-scanpackages: ${new TextDecoder().decode(stderr)}`
    );
  }

  await Deno.writeFile("dists/stable/main/binary-amd64/Packages", stdout);

  const target = await Deno.open("dists/stable/main/binary-amd64/Packages.gz", {
    write: true,
  });

  await new Blob([stdout])
    .stream()
    .pipeThrough(new CompressionStream("gzip"))
    .pipeTo(target.writable);

  Deno.chdir(cwd);
}

export async function main() {
  const flags = parseArgs(Deno.args, {
    boolean: ["sign"],
  });

  console.log("Scanning deb files...");
  await dpkgScanPackages();

  console.log("Generating release files...");
  const contents = await generateReleaseFile({
    origin: "Hydr0 Packages",
    label: "Hydr0",
    suite: "stable",
    codename: "stable",
    version: "1.0",
    architectures: ["amd64", "arm64", "arm7"],
    components: ["main"],
    description: "Hydr0 package repository and mirror",
    date: new Date(),
  });
  await Deno.writeFile(
    "apt/dists/stable/Release",
    new TextEncoder().encode(contents)
  );

  if (flags.sign) {
    console.log("Signing Release...");
    await exec("tools/sign-release.sh", {
      inherit: true,
    });
  }

  console.log("Release done.");
}

await main();
