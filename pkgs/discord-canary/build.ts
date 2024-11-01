import { exists } from "jsr:@std/fs";

const DISCORD_DOWNLOAD_URL =
  "https://discord.com/api/download/canary?platform=linux&format=deb";

export default async (_: unknown, ctx: { force: boolean }) => {
  const res = await fetch(DISCORD_DOWNLOAD_URL, {
    method: "HEAD",
    redirect: "manual",
  });

  if (res.status !== 302) {
    throw new Error(
      `failed to fetch discord download ${res.status}? (${DISCORD_DOWNLOAD_URL})`
    );
  }

  const url = res.headers.get("location");
  if (!url) {
    console.log(res.headers);
    throw new Error(`discord download had no redirect?`);
  }

  const [filename] = url.split("/").slice(-1);

  if (!ctx.force && (await exists(`apt/pool/main/${filename}`))) {
    return;
  }

  const dl = await fetch(url);
  const download = await Deno.open(`${filename}`, {
    create: true,
    write: true,
  });
  await dl.body?.pipeTo(download.writable);
};
