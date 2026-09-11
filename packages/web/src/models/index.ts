import { OrtConfigurer } from "./common"

export * from "./common"
export { SileroLegacy } from "./legacy"
export { Silero } from "./silero"

export type OrtOptions = {
  ortConfig?: OrtConfigurer
}
