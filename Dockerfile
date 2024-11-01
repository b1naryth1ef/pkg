FROM golang:1.23-alpine AS builder

RUN apk add --no-cache git

RUN mkdir -p /usr/src/ && cd /usr/src && git clone https://github.com/joshuarli/srv.git
WORKDIR /usr/src/srv

RUN go mod download
RUN go build -v -o /bin/srv main.go

FROM alpine

COPY --from=builder /bin/srv /bin/srv
RUN mkdir -p /opt/contents

COPY docker/index.html /opt/contents/index.html
COPY bootstrap/*.deb /opt/contents/
COPY key.public /opt/contents/public.key
COPY apt /opt/contents/apt

ENTRYPOINT ["srv", "-b", "0.0.0.0", "-p", "80", "/opt/contents"]