/**
 * Single Vercel serverless function — handles all /api/* routes via Express.
 * Replaces individual api/ files to stay within Vercel Hobby plan's 12-function limit.
 */
import 'dotenv/config'
import express from 'express'
import { registerAuthRoutes } from '../server/routes/auth.js'
import { registerTrackingRoutes } from '../server/routes/tracking.js'
import { registerOrdersRoutes } from '../server/routes/orders.js'
import { registerProductsRoutes } from '../server/routes/products.js'
import { registerCouponsRoutes } from '../server/routes/coupons.js'
import { registerAgenciesRoutes } from '../server/routes/agencies.js'
import { registerAdminUsersRoutes } from '../server/routes/admin-users.js'

const app = express()
app.use(express.json({ limit: '10mb' }))

registerAuthRoutes(app)
registerTrackingRoutes(app)
registerOrdersRoutes(app)
registerProductsRoutes(app)
registerCouponsRoutes(app)
registerAgenciesRoutes(app)
registerAdminUsersRoutes(app)

app.get('/api/health', (req, res) => res.json({ status: 'ok' }))

export default app
