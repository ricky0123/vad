#!/usr/bin/env bash

eslint --config eslint.config.mts --debug 'packages/**/src/**/*.{ts,tsx}' --max-warnings 0
