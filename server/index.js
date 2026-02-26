import 'dotenv/config'
import express from 'express'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { registerAuthRoutes } from './routes/auth.js'
import { registerTrackingRoutes } from './routes/tracking.js'
import { registerOrdersRoutes } from './routes/orders.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json())

// API routes
registerAuthRoutes(app)
registerTrackingRoutes(app)
registerOrdersRoutes(app)

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

// Serve static build in production
const distPath = resolve(__dirname, '..', 'dist')
app.use(express.static(distPath))
app.get('*', (req, res) => {
  res.sendFile(resolve(distPath, 'index.html'))
})

app.listen(PORT, () => {
  console.log(`Orion Dashboard running on http://localhost:${PORT}`)
})
