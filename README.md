# pkg

This repository contains both the contents of and the tooling required for generating the [hydr0 apt package repository](https://pkg.hydr0.com). This tooling is not designed for use outside of this repository, but it could be integrated into another project without too much pain.

## packages

- [discord](discord/build.ts) redistributes the latest stable deb into our repository for easy upgrading
- [files](files/build.ts) personal software (currently private)
- [nut](nut/build.ts) personal software (currently private)
- [restic](restic/build.ts) redistributes specific versions of restic for my infra use
- [yamon](yamon/build.ts) monitoring software ([github.com/b1naryth1ef/yamon](https://github.com/b1naryth1ef/yamon))

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

## repository management

Simply run `./run.sh` on a machine that has the private key imported into the users gpg keyring.
