#!/usr/bin/env bash

export t=$(mktemp)
echo "TEMPFILE $t"

(
    cd test-site/dist
    npx live-server --host=localhost --port=8080 --no-css-inject "--watch=$t"
) &
SERVER_PID=$!
echo "live server pid $SERVER_PID"

npx nodemon \
    --on-change-only \
    --exec "npm run build && npm run build-test-site && openssl rand -base64 12 > $t" \
    -e js,ts,jsx,tsx,html,css \
    --watch packages/web/src \
    --watch packages/react/src \
    &
BUILD_PACKAGE_PID=$!
echo "nodemon pid $BUILD_PACKAGE_PID"

npx nodemon \
    --on-change-only \
    --exec "npm run build-test-site && openssl rand -base64 12 > $t" \
    -e js,ts,jsx,tsx,html,css \
    --watch test-site/src \
    &
BUILD_SITE_PID=$!
echo "nodemon pid $BUILD_SITE_PID"

trap "echo stopping... && kill -INT $BUILD_PACKAGE_PID $BUILD_SITE_PID $SERVER_PID && rm -f -- '$t' && echo done" INT

wait
