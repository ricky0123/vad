#!/usr/bin/env bash

npx eleventy --input=src/content --output dist
npx tailwindcss -i ./src/css/input.css -o ./dist/style.css
npx esbuild src/js/demo.tsx --bundle --outfile=dist/demo.js
