build:
  ./tools/build.ts

copy-files:
  rsync -avP --delete apt/ /mnt/transmission/apt/

sign-release:
  ./tools/release.ts --sign

publish: sign-release copy-files
all: build publish
