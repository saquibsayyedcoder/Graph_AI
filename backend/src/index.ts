import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { graphRouter } from './routes/graph'
import { chatRouter } from './routes/chat'

const app = express()
const PORT = process.env.PORT || 4000

// Allow both local dev and production frontend
const allowedOrigins = [
  'http://localhost:3000',                   // local dev
  process.env.FRONTEND_URL || ''             // production frontend
].filter(Boolean) // remove empty strings just in case

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like Postman)
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  }
}))

app.use(express.json())

app.use('/api/graph', graphRouter)
app.use('/api/chat', chatRouter)

app.get('/api/health', (_, res) => res.json({ status: 'ok' }))

app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`))