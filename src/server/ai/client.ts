import type Database from 'better-sqlite3'
import OpenAI from 'openai'
import { z } from 'zod'
import { ApiError } from '../errors'
import { getApiKey, getSettings } from '../settings'
import { getLogger } from '../log'

export const PRESET_BASE_URLS = {
  openai: 'https://api.openai.com/v1',
  groq: 'https://api.groq.com/openai/v1',
  openrouter: 'https://openrouter.ai/api/v1',
  ollama: 'http://localhost:11434/v1',
  lmstudio: 'http://localhost:1234/v1',
  custom: null,
  mock: null,
} as const

export type AiErrorCode =
  | 'not_configured'
  | 'no_vision'
  | 'ai_schema'
  | 'ai_unreachable'

export class AiError extends ApiError {
  constructor(
    public code: AiErrorCode,
    message: string,
    status: number,
    detail?: unknown,
  ) {
    super(code, message, status, detail)
    this.name = 'AiError'
  }
}

interface AiConfig {
  preset: string
  baseUrl: string
  model: string
  apiKey: string | null
  visionCapable: boolean
}

function resolveConfig(db: Database.Database): AiConfig {
  const s = getSettings(db)
  const presetBase = PRESET_BASE_URLS[s.provider_preset as keyof typeof PRESET_BASE_URLS]

  if (s.provider_preset === 'mock') {
    return {
      preset: 'mock',
      baseUrl: '',
      model: s.model ?? 'mock',
      apiKey: null,
      visionCapable: true,
    }
  }

  const baseUrl = s.base_url ?? (presetBase === undefined ? undefined : presetBase)
  if (!baseUrl || !s.model) {
    throw new AiError(
      'not_configured',
      `proveedor '${s.provider_preset}' sin base_url/model configurados`,
      400,
    )
  }
  return {
    preset: s.provider_preset,
    baseUrl,
    model: s.model,
    apiKey: getApiKey(),
    visionCapable: s.vision_capable,
  }
}

export interface AiClientOptions {
  fetch?: typeof fetch
  retryDelayMs?: number
  timeoutMs?: number
}

export interface CompleteJsonInput<T> {
  op: string
  system: string
  user: string
  schema: z.ZodType<T>
  /** salida determinista usada cuando el preset es mock */
  mockOutput?: () => T
  /** imagen en base64 (sin prefijo data:) — requiere vision_capable */
  imageBase64?: string
}

export interface AiClient {
  readonly preset: string
  isMock(): boolean
  assertVisionCapable(): void
  completeJson<T>(input: CompleteJsonInput<T>): Promise<T>
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function createAiClient(db: Database.Database, options: AiClientOptions = {}): AiClient {
  const config = resolveConfig(db)

  const openai = new OpenAI({
    baseURL: config.baseUrl || undefined,
    apiKey: config.apiKey ?? 'unused-for-mock',
    timeout: options.timeoutMs ?? 30_000,
    maxRetries: 0,
    ...(options.fetch && { fetch: options.fetch }),
  })

  async function callOnce<T>(
    input: CompleteJsonInput<T>,
  ): Promise<{ ok: true; value: T } | { ok: false; reason: 'network' | 'schema'; message: string }> {
    try {
      const completion = await openai.chat.completions.create({
        model: config.model,
        messages: [
          { role: 'system', content: input.system },
          { role: 'user', content: input.user },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: input.op.replace(/[^a-z0-9_]/gi, '_'),
            strict: true,
            schema: z.toJSONSchema(input.schema, { target: 'draft-2020-12' }) as Record<string, unknown>,
          },
        },
      })
      const content = completion.choices[0]?.message?.content ?? ''
      const parsed = input.schema.safeParse(JSON.parse(content))
      if (!parsed.success) {
        return { ok: false, reason: 'schema', message: z.prettifyError(parsed.error) }
      }
      return { ok: true, value: parsed.data }
    } catch (err) {
      return {
        ok: false,
        reason: 'network',
        message: err instanceof Error ? err.message : String(err),
      }
    }
  }

  return {
    preset: config.preset,
    isMock: () => config.preset === 'mock',
    assertVisionCapable() {
      if (!config.visionCapable) {
        throw new AiError('no_vision', 'el modelo configurado no soporta imágenes', 422)
      }
    },
    async completeJson<T>(input: CompleteJsonInput<T>): Promise<T> {
      if (config.preset === 'mock') {
        if (!input.mockOutput) {
          throw new AiError('ai_schema', `op '${input.op}' no define mockOutput`, 500)
        }
        return input.mockOutput()
      }

      if (input.imageBase64 !== undefined) this.assertVisionCapable()

      const first = await callOnce(input)
      if (first.ok) return first.value

      getLogger().warn(`ai retry tras fallo (${first.reason}): ${first.message}`)
      await sleep(options.retryDelayMs ?? 250)
      const second = await callOnce(input)
      if (second.ok) return second.value

      if (second.reason === 'schema' || first.reason === 'schema') {
        throw new AiError(
          'ai_schema',
          `respuesta del modelo no cumple schema de '${input.op}'`,
          502,
          { lastError: second.message },
        )
      }
      let host = ''
      try {
        host = new URL(config.baseUrl).host
      } catch {
        host = ''
      }
      throw new AiError(
        'ai_unreachable',
        `no se pudo contactar al proveedor de IA (${config.preset})`,
        502,
        { host },
      )
    },
  }
}
