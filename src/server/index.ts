import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { existsSync } from 'node:fs'
import { createApp } from './app.ts'

const distDir = 'dist/client'
const app = createApp()

if (existsSync(distDir)) {
  app.use('*', serveStatic({ root: distDir }))
  app.get('*', serveStatic({ path: `${distDir}/index.html` }))
}

serve({ fetch: app.fetch, port: Number(process.env.PORT ?? 3001) }, (info) => {
  console.log(`tweakcv api listening on http://localhost:${info.port}`)
})
