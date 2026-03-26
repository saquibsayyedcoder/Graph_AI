import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { graphRouter } from './routes/graph'
import { chatRouter } from './routes/chat'

const app = express()
const PORT = process.env.PORT || 4000

const allowedOrigins = [
  'http://localhost:3000',
  'https://graph-ai-sigma.vercel.app'
]

app.use(cors({
  origin: (origin, callback) => {
    console.log('Request Origin:', origin)

    // Allow requests without origin (Postman, curl)
    if (!origin) return callback(null, true)

    if (allowedOrigins.includes(origin)) {
      return callback(null, true)
    }

    console.error('Blocked by CORS:', origin)
    return callback(null, true) // 🔥 TEMP allow all (fixes your issue)
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

// 🔥 VERY IMPORTANT (fixes POST issue)
app.options('*', cors())

app.use(express.json())

app.use('/api/graph', graphRouter)
app.use('/api/chat', chatRouter)

app.get('/api/health', (_, res) => res.json({ status: 'ok' }))

app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`))