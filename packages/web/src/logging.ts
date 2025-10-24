const mkLogger =
  (level: string) =>
  (...args: any) => {
    console.log(`VAD | ${level} >`, ...args)
  }

export const log = {
  error: mkLogger("error"),
  debug: mkLogger("debug"),
  warn: mkLogger("warn"),
}
