export const defaultModelFetcher = (path: string) => {
  return fetch(path).then((model) => model.arrayBuffer())
}
