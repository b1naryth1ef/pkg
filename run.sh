#!/bin/bash

echo ">> Running Package Builds..."
./tools/build.ts --force

echo ">> Running Release..."
./tools/release.ts --sign

echo ">> Building Docker..."
./tools/docker.ts

echo "Done! Good work :3"