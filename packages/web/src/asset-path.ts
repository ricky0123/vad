// nextjs@14 bundler may attempt to execute this during SSR and crash
const isWeb =
  typeof window !== "undefined" && typeof window.document !== "undefined"
const currentScript = isWeb
  ? (window.document.currentScript as HTMLScriptElement)
  : null

let basePath = "/"
if (currentScript) {
  basePath = currentScript.src
    .replace(/#.*$/, "")
    .replace(/\?.*$/, "")
    .replace(/\/[^\/]+$/, "/")
}

export const assetPath = (file: string) => {
  return basePath + file
}
