import express from 'express'
import { registerAuthRoutes } from './routes/auth.js'
import { registerTrackingRoutes } from './routes/tracking.js'
import { registerOrdersRoutes } from './routes/orders.js'

/**
 * Vite plugin that mounts API routes directly into Vite's dev server.
 */
export function apiPlugin() {
  return {
    name: 'orion-api',
    configureServer(server) {
      const app = express()
      app.use(express.json())

      // Register all API routes
      registerAuthRoutes(app)
      registerTrackingRoutes(app)
      registerOrdersRoutes(app)

      app.get('/api/health', (req, res) => {
        res.json({ status: 'ok' })
      })

      // Mount Express as Vite middleware
      server.middlewares.use(app)
    },
  }
}
