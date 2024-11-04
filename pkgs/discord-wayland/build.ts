import { exec } from "../../tools/lib.ts";

export default async ({ version }: { version: string }) => {
  await exec(
    `nfpm pkg --packager deb --config pkgs/discord-wayland/nfpm.yaml`,
    {
      env: {
        VERSION: version,
      },
    }
  );
};
