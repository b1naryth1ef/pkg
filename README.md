# pkg

This repository contains a set of tools written in [deno](https://deno.land/) oriented around managing the [hydr0 apt repository](https://pkg.hydr0.com). This repository contains both custom built packages and packages being mirrored from other locations. This repository is primarily designed for use within hydr0 infrastructure, but its open for public use as well.

## tools

- [tools/build.ts](tools/build.ts) manages building deb packages based on the descriptions in [packages.yaml](packages.yaml)
- [tools/release.ts](tools/release.ts) manages generating and signing apt release files for publishing the repository
- [tools/docker.ts](tools/docker.ts) builds the docker image which is used to serve the public facing resources at [pkg.hydr0.com](https://pkg.hydr0.com)

## packages

- discord - redistributes the official Discord deb file to make updating easier
- discord-canary - same as the above but for the canary release of Discord
- discord-wayland - utility package which provides a /usr/local/bin launch override of Discord with wayland support
- [age](https://github.com/FiloSottile/age) - mirrors the latest age from debian
- [files](https://github.com/brngle/files) - custom file serving software
- [yamon](https://github.com/b1naryth1ef/yamon) - custom observability tool
- [restic](https://github.com/restic/restic) - packages the official restic release
- [tailwindcss](https://github.com/tailwindlabs/tailwindcss) - packages the official tailwindcss release
- [sway](https://github.com/swaywm/sway) - experimental sway window manager packaging
- [libwlroots-dev](https://gitlab.freedesktop.org/wlroots/wlroots) - experimental wlroots window manager packaging
- [obsidian](https://github.com/obsidianmd/obsidian-releases/) - obsidian mirror

## installation

### bootstrap package

The easiest way to install the package repository is via the [bootstrap package file](https://pkg.hydr0.com/hydr0-pkg-repo_1.0.0_amd64.deb). This debian package will handle setting up the repository, gpg key, and apt preferences to prioritize installing packages over other repositories.

### manually

First download and generate a keyring for the package gpg key:

```bash
curl https://pkg.hydr0.com/public.key | sudo gpg --dearmour -o /usr/share/keyrings/hydr0.gpg
```

Next create a new apt repository source pointing to our package repository:

```bash
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/hydr0.gpg] http://pkg.hydr0.com/apt stable main" | sudo tee /etc/apt/sources.list.d/hydr0.list
```

Finally to configure the package priority so the repository takes precendence over standard distro packages, edit `/etc/apt/preferences.d/hydr0` to contain the following:

```
Package: *
Pin: origin pkg.hydr0.com
Pin-Priority: 1000
```
