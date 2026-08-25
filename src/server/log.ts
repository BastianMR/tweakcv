import { appendFileSync, mkdirSync, renameSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { dataDir } from './db'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LEVELS: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 }
const DEFAULT_MAX_BYTES = 5 * 1024 * 1024

export interface Logger {
  debug(msg: string, meta?: unknown): void
  info(msg: string, meta?: unknown): void
  warn(msg: string, meta?: unknown): void
  error(msg: string, err?: unknown): void
}

const SECRET_KEY_RE = /api[_-]?key/i

export function redactSecrets(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.replace(/(api[_-]?key\s*[=:]\s*)\S+/gi, '$1[REDACTED]')
  }
  if (Array.isArray(value)) return value.map(redactSecrets)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) {
      out[k] = SECRET_KEY_RE.test(k) ? '[REDACTED]' : redactSecrets(v)
    }
    return out
  }
  return value
}

interface LogLine {
  time: string
  level: LogLevel
  msg: string
  [key: string]: unknown
}

function threshold(): number {
  const raw =
    process.env.TWEAKCV_LOG_LEVEL ?? process.env.LOG_LEVEL ?? 'info'
  return LEVELS[(raw as LogLevel) in LEVELS ? (raw as LogLevel) : 'info']
}

function maxBytes(): number {
  const parsed = Number(process.env.TWEAKCV_LOG_MAX_BYTES)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_BYTES
}

export function logFilePath(): string {
  return join(dataDir(), 'logs', 'app.log')
}

function rotateIfNeeded(path: string) {
  try {
    if (statSync(path).size > maxBytes()) {
      renameSync(path, `${path}.1`)
    }
  } catch {
    // archivo no existe todavía: nada que rotar
  }
}

function write(line: LogLine) {
  const path = logFilePath()
  mkdirSync(dirname(path), { recursive: true })
  rotateIfNeeded(path)
  appendFileSync(path, `${JSON.stringify(redactSecrets(line))}\n`, 'utf8')
}

export function createLogger(options?: { level?: LogLevel }): Logger {
  const min = options?.level ? LEVELS[options.level] : threshold()

  function emit(level: LogLevel, msg: string, extra?: unknown) {
    if (LEVELS[level] < min) return
    const line: LogLine = {
      time: new Date().toISOString(),
      level,
      msg,
      ...(extra as Record<string, unknown> | undefined),
    }
    write(line)
    if (level === 'error' || level === 'warn') {
      console.error(`[${level}] ${msg}`)
    }
  }

  return {
    debug: (msg, meta) => emit('debug', msg, meta),
    info: (msg, meta) => emit('info', msg, meta),
    warn: (msg, meta) => emit('warn', msg, meta),
    error(msg, err) {
      const extra: Record<string, unknown> = {}
      if (err instanceof Error) {
        extra.err_message = `${err.name}: ${err.message}`
        extra.err_stack = err.stack
      } else if (err !== undefined) {
        extra.err = String(err)
      }
      emit('error', msg, extra)
    },
  }
}

let singleton: Logger | null = null

export function getLogger(): Logger {
  return (singleton ??= createLogger())
}
