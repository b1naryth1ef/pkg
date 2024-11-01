import { exec, goBuild } from "../../tools/lib.ts";

const REPO_PATH = "../../go/nut";

export default async ({ version }: { version: string }) => {
  await goBuild("nut", REPO_PATH);

  await exec(`cp ${REPO_PATH}/nut tmp/`);
  await exec(`nfpm pkg --packager deb --config pkgs/nut/nfpm.yaml`, {
    env: { VERSION: version },
  });
};
