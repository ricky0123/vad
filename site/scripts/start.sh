#!/usr/bin/env bash

npx live-server --browser=google-chrome --entry-file=404.html dist &
SERVER_PID=$!
trap 'kill $SERVER_PID' INT
echo live server pid $SERVER_PID

npx nodemon \
    --exec "npm run build && http-server dist" \
    -w src -e js,ts,jsx,tsx,html,md,njk,css \
    -w .eleventy.js \
    -w tailwind.config.js \
    &
BUILD_PID=$!
trap 'kill $BUILD_PID' INT
echo nodemon pid $BUILD_PID

wait < <(jobs -p)
