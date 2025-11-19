#!/usr/bin/env bash

eslint --config eslint.config.mts 'packages/**/src/**/*.{ts,tsx}' --max-warnings 0
