const mkLogger = (level: "error" | "debug" | "warn") => (message: string) => {
  console.log(`VAD | ${level} >`, message)
}

export const log = {
  error: mkLogger("error"),
  debug: mkLogger("debug"),
  warn: mkLogger("warn"),
}
