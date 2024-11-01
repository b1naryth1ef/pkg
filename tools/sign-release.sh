#!/bin/bash
export KEYID="E4016525"

cat apt/dists/stable/Release | gpg --default-key $KEYID -abs > apt/dists/stable/Release.gpg
cat apt/dists/stable/Release | gpg --default-key $KEYID -abs --clearsign > apt/dists/stable/InRelease