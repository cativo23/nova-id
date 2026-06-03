# Minimal seeder image: curl + jq baked in (no runtime apk; reproducible).
FROM alpine:3.20
RUN apk add --no-cache curl jq
ENTRYPOINT ["/bin/sh", "/seed.sh"]
