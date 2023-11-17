import { assetPath } from "./asset-path";

export const defaultModelFetcher = (path: string) => (
  fetch(assetPath(path))
    .then(model=>model.arrayBuffer())
);