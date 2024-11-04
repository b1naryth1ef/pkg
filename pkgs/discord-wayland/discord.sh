#!/bin/bash
if [[ "$XDG_SESSION_TYPE" == "wayland" ]]; then
  /usr/bin/discord --enable-features=UseOzonePlatform --ozone-platform=wayland 1>&- 2>&-
else
  /usr/bin/discord 1>&- 2>&-
fi