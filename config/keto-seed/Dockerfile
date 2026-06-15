# Minimal seeder image: curl + jq + bash baked in (no runtime apk; reproducible).
FROM alpine:3.20
RUN apk add --no-cache curl jq bash
ENTRYPOINT ["/bin/sh", "/seed.sh"]
