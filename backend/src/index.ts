import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { graphRouter } from './routes/graph'
import { chatRouter } from './routes/chat'

const app = express()
const PORT = process.env.PORT || 4000

const allowedOrigins = [
  'http://localhost:3000',
  process.env.FRONTEND_URL
].filter(Boolean)

app.use(cors({
  origin: (origin, callback) => {
    console.log('Request Origin:', origin) // 🔍 debug

    // allow Postman / mobile apps / no-origin requests
    if (!origin) return callback(null, true)

    // normalize (remove trailing slash)
    const normalizedOrigin = origin.replace(/\/$/, '')

    if (allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true)
    }

    console.error('Blocked by CORS:', origin)
    callback(new Error('Not allowed by CORS'))
  }
}))

app.use(express.json())

app.use('/api/graph', graphRouter)
app.use('/api/chat', chatRouter)

app.get('/api/health', (_, res) => res.json({ status: 'ok' }))

app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`))