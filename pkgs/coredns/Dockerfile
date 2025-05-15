FROM golang:1.24-alpine

RUN mkdir -p /usr/src
WORKDIR /usr/src

RUN apk add --no-cache --update curl gcc musl-dev make git

ARG VERSION=master
RUN git clone --depth 1 https://github.com/coredns/coredns.git --branch v$VERSION --single-branch
WORKDIR /usr/src/coredns

RUN echo "blocklist:github.com/relekang/coredns-blocklist" | cat - plugin.cfg > new-plugin.cfg && mv new-plugin.cfg plugin.cfg

ENV GOFLAGS="-buildvcs=false"
RUN pwd && ls -lah && make

ENTRYPOINT ["/bin/coredns"]