export const LOG_PREFIX = "[VAD]"

const levels = ["error", "debug", "warn"] as const
type Level = (typeof levels)[number]
type LogFn = (...args: any) => void
type Logger = Record<Level, LogFn>

function getLog(level: Level): LogFn {
  return (...args: any) => {
    console[level](LOG_PREFIX, ...args)
  }
}

const _log = levels.reduce<Partial<Logger>>((acc, level) => {
  acc[level] = getLog(level)
  return acc
}, {})

export const log = _log as Logger
