publish:
  rsync -avP --delete apt/ /mnt/transmission/apt/

build:
  ./tools/build.ts

release:
  ./tools/release.ts --sign


all: build release publish
