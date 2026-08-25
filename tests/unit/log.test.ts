import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  createLogger,
  redactSecrets,
} from '../../src/server/log'

let tmp: string
const originalDataDir = process.env.TWEAKCV_DATA_DIR
const originalMaxBytes = process.env.TWEAKCV_LOG_MAX_BYTES

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), 'tweakcv-log-'))
  process.env.TWEAKCV_DATA_DIR = tmp
})

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true })
  if (originalDataDir === undefined) delete process.env.TWEAKCV_DATA_DIR
  else process.env.TWEAKCV_DATA_DIR = originalDataDir
  if (originalMaxBytes === undefined) delete process.env.TWEAKCV_LOG_MAX_BYTES
  else process.env.TWEAKCV_LOG_MAX_BYTES = originalMaxBytes
})

function logFile() {
  return join(tmp, 'logs', 'app.log')
}

function lines() {
  return readFileSync(logFile(), 'utf8')
    .trim()
    .split('\n')
    .map((l) => JSON.parse(l))
}

describe('createLogger', () => {
  it('escribe líneas JSON en data/logs/app.log creando el directorio', () => {
    const logger = createLogger()

    logger.info('hola', { foo: 'bar' })

    expect(existsSync(logFile())).toBe(true)
    const [line] = lines()
    expect(line.level).toBe('info')
    expect(line.msg).toBe('hola')
    expect(line.foo).toBe('bar')
    expect(line.time).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('filtra por nivel según threshold', () => {
    const logger = createLogger({ level: 'warn' })
    logger.debug('no')
    logger.info('tampoco')
    logger.warn('sí')

    const written = lines()
    expect(written).toHaveLength(1)
    expect(written[0].level).toBe('warn')
  })

  it('rota app.log → app.log.1 al superar el tamaño máximo', () => {
    process.env.TWEAKCV_LOG_MAX_BYTES = '200'
    const logger = createLogger()

    for (let i = 0; i < 10; i++) logger.info(`linea larga para llenar el archivo ${i}`)

    expect(statSync(logFile()).size).toBeLessThanOrEqual(300)
    expect(existsSync(join(tmp, 'logs', 'app.log.1'))).toBe(true)
  })

  it('error() también imprime a stderr y guarda err.stack localmente si viene un Error', () => {
    const logger = createLogger()
    logger.error('falló', new Error('boom'))

    const [line] = lines()
    expect(line.level).toBe('error')
    expect(line.msg).toBe('falló')
    expect(line.err_message).toBe('Error: boom')
    expect(String(line.err_stack)).toContain('at ')
  })
})

describe('redactSecrets', () => {
  it('elimina valores de campos tipo api_key en objetos anidados', () => {
    const input = {
      api_key: 'sk-supersecreto',
      apiKey: 'otro-secreto',
      nested: { provider_api_key: 'x', ok: 1 },
      list: [{ api_key: 'y', name: 'z' }],
      normal: 'queda',
    }
    expect(redactSecrets(input)).toEqual({
      api_key: '[REDACTED]',
      apiKey: '[REDACTED]',
      nested: { provider_api_key: '[REDACTED]', ok: 1 },
      list: [{ api_key: '[REDACTED]', name: 'z' }],
      normal: 'queda',
    })
  })

  it('en strings reemplaza patrones key=valor', () => {
    expect(redactSecrets('llamada con api_key=sk-123 falló')).not.toContain('sk-123')
  })
})
