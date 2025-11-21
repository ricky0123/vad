#!/usr/bin/env bash

npx eslint --config eslint.config.mts 'packages/**/src/**/*.{ts,tsx}' 'test-site/src/**/*.{ts,tsx}' --max-warnings 0
