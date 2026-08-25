import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { ApiError } from './errors'
import { getLogger } from './log'
import { registerCollectionRoutes, registerProfileRoutes } from './routes/collections'
import { registerDocumentRoutes } from './routes/documents'
import { registerPostingRoutes } from './routes/postings'
import { registerCvRoutes } from './routes/cvs'
import { registerSystemRoutes } from './routes/system'
import { registerSettingsRoutes } from './routes/settings'

export function createApp(): Hono {
  const app = new Hono()

  app.get('/api/health', (c) => c.json({ ok: true }))

  registerProfileRoutes(app)
  registerCollectionRoutes(app)
  registerDocumentRoutes(app)
  registerPostingRoutes(app)
  registerCvRoutes(app)
  registerSystemRoutes(app)
  registerSettingsRoutes(app)

  app.notFound((c) =>
    c.json(
      { error: { code: 'not_found', message: `Ruta no encontrada: ${c.req.method} ${c.req.path}` } },
      404,
    ),
  )

  app.onError((err, c) => {
    if (err instanceof ApiError) {
      return c.json(
        {
          error: {
            code: err.code,
            message: err.message,
            ...(err.detail !== undefined && { detail: err.detail }),
          },
        },
        err.status as 400,
      )
    }
    if (err instanceof HTTPException) {
      return c.json(
        { error: { code: 'http_exception', message: err.message || 'HTTP error' } },
        (err.status || 500) as 400,
      )
    }
    getLogger().error('unhandled error', err)
    console.error(err)
    return c.json({ error: { code: 'internal', message: 'Internal server error' } }, 500)
  })

  return app
}
