#!/usr/bin/env bash

npm run build-test-site

npx nodemon \
    --exec "npm run build && npm run build-test-site" \
    -e js,ts,jsx,tsx,html,css \
    --watch packages/web/src \
    --watch packages/react/src \
    &
BUILD_PACKAGE_PID=$!
echo "nodemon pid $BUILD_PACKAGE_PID"

npx nodemon \
    --exec "npm run build-test-site" \
    -e js,ts,jsx,tsx,html,css \
    --watch test-site/src \
    &
BUILD_SITE_PID=$!
echo "nodemon pid $BUILD_SITE_PID"

(
    cd test-site/dist
    npx live-server --host=localhost --port=8080 --no-css-inject --wait=500
) &
SERVER_PID=$!
echo "live server pid $SERVER_PID"

trap "kill -INT $BUILD_PACKAGE_PID $BUILD_SITE_PID $SERVER_PID" INT

wait
