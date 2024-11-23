import { OrtConfigurer } from "./common"

export * from "./common"
export { SileroLegacy } from "./legacy"
export { SileroV5 } from "./v5"

export type OrtOptions = {
  ortConfig?: OrtConfigurer
}