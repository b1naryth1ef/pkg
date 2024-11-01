FROM ubuntu:24.10

RUN apt-get update -y && \
    apt-get -y install git glslang-tools libcairo2-dev libcap-dev libdbus-1-dev \
    libdisplay-info-dev libevdev-dev libgdk-pixbuf2.0-dev libinput-dev \
    libjson-c-dev libliftoff-dev libpam0g-dev libpango1.0-dev libpcre2-dev \
    libpixman-1-dev libseat-dev libsystemd-dev libvulkan-dev libwayland-dev \
    libwayland-egl1 libwlroots-dev libxcb-ewmh-dev libxkbcommon-dev meson \
    pkgconf scdoc tree wayland-protocols

RUN mkdir /tmp/build
WORKDIR /tmp/build

ARG WLROOTS_VERSION=master
RUN git clone https://gitlab.freedesktop.org/wlroots/wlroots.git && cd wlroots && git checkout $WLROOTS_VERSION
RUN cd wlroots && meson build && ninja -C build && ninja -C build install && DESTDIR=/opt/wlroots ninja -C build install

ARG SWAY_VERSION=master
RUN git clone https://github.com/swaywm/sway.git && cd sway && git checkout $SWAY_VERSION

RUN cd sway && meson build && ninja -C build && DESTDIR=/opt/sway ninja -C build install
