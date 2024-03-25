- Build the docker image

```sh
podman build -t vad .
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