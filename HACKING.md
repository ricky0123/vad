You can also find relevant documentation on the [wiki](https://wiki.vad.ricky0123.com/en/docs/developer/hacking).

TODO: Reconcile two documentation sources.

## Instructions for running automated tests on Fedora/non-Ubuntu systems

- Build the docker image

```sh
podman build -f Dockerfile.test -t vad .
```

- Run the container and mount the package folder

```sh
podman run -it -v $(pwd):/app vad /bin/bash
```

- Build all the packages

```sh
npm run build
```

- Run automated tests

```sh
npm run test
```

- Run manual tests

```sh
npm run dev
```
