import { parse } from "jsr:@std/yaml";

export async function goBuild(target: string, cwd?: string) {
  const env = { CGO_ENABLED: "1", CC: "musl-gcc" };

  const command = new Deno.Command("go", {
    args: [
      "build",
      "--ldflags",
      "-linkmode=external -extldflags=-static",
      "-o",
      target,
      `cmd/${target}/main.go`,
    ],
    env,
    cwd,
  });

  const { code, stderr } = await command.output();
  if (code !== 0) {
    throw new Error(
      `failed to run go build: ${new TextDecoder().decode(stderr)}`,
    );
  }
}

type ExecOpts = {
  env?: Record<string, string>;
  cwd?: string;
  inherit?: boolean;
};

type ExecResult = {
  code: number;
  stdout: () => string;
  stderr: () => string;
};

export async function exec(
  args: string | Array<string>,
  opts?: ExecOpts,
): Promise<ExecResult> {
  if (!Array.isArray(args)) {
    args = args.split(" ");
  }

  const command = new Deno.Command(args[0], {
    args: args.slice(1),
    env: opts?.env,
    cwd: opts?.cwd,
    stderr: opts?.inherit ? "inherit" : undefined,
    stdout: opts?.inherit ? "inherit" : undefined,
    stdin: opts?.inherit ? "inherit" : undefined,
  });

  if (opts?.inherit) {
    const { code } = await command.output();
    return {
      code,
      stdout: () => {
        throw new Error(`not piped`);
      },
      stderr: () => {
        throw new Error(`not piped`);
      },
    };
  }

  const { code, stdout, stderr } = await command.output();
  if (code !== 0) {
    console.log(new TextDecoder().decode(stdout));
    throw new Error(
      `failed to exec '${args.join(" ")}: ${new TextDecoder().decode(stderr)}`,
    );
  }

  return {
    code,
    stdout: () => new TextDecoder().decode(stdout),
    stderr: () => new TextDecoder().decode(stderr),
  };
}

export type GithubReleaseFile = {
  name: string;
  postProcess?: string | Array<string>;
};

export type PackageDescriptionMirror = {
  type: "mirror";
  url: string;
  versions: Array<string>;
  name?: string;
};
export type PackageDescriptionBuild = {
  type: "build";
  versions?: Array<string>;
};
export type PackageDescriptionBuildDocker = {
  type: "build-docker";
  versions: Array<string>;
  git?: string;
  path?: string;
  args?: Record<string, string>;
  extract: Array<string>;
};
export type PackageDescriptionGithubRelease = {
  type: "github-release";
  versions: Array<string>;
  versionPrefix?: string;
  semver?: boolean;
  repo: string;
  files: Record<string, GithubReleaseFile> | Array<string>;
};
export type PackageDescriptionMeta = {
  prune?: {
    keep?: number;
    skip?: boolean;
  };
};
export type PackageDescription =
  & (
    | PackageDescriptionMirror
    | PackageDescriptionBuild
    | PackageDescriptionBuildDocker
    | PackageDescriptionGithubRelease
  )
  & PackageDescriptionMeta;
export type Packages = Record<string, PackageDescription>;

export async function loadPackages(): Promise<Packages> {
  const contents = await Deno.readTextFile("packages.yaml");
  return (parse(contents) as { packages: Packages }).packages;
}
