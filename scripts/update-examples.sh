#!/usr/bin/env bash

set +x

(
    cd examples/bundler
    npm i @ricky0123/vad-web@latest
    npm run clean
    npm run build
)

(
    cd examples/node
    npm i @ricky0123/vad-node@latest
)

(
    cd examples/react-bundler
    npm remove @ricky0123/vad-react
    npm i @ricky0123/vad-react@latest
    npm run clean
    npm run build
)

(
    cd examples/script-tags
    latest_version=$(wget -O - https://cdn.jsdelivr.net/npm/@ricky0123/vad-web/ \
        | grep -oP "@ricky0123/vad-web@\d+\.\d+\.\d+" \
        | head -1 \
        | grep -oP "\d+\.\d+\.\d+"
    )
    sed -i "s/@ricky0123\/vad-web@[[:digit:]]\+\.[[:digit:]]\+\.[[:digit:]]\+/@ricky0123\/vad-web@$latest_version/g" \
        index.html
)
