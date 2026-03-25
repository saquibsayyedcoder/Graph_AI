import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { graphRouter } from './routes/graph'
import { chatRouter } from './routes/chat'


const app = express()
const PORT = process.env.PORT || 4000

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }))
app.use(express.json())

app.use('/api/graph', graphRouter)
app.use('/api/chat', chatRouter)

app.get('/api/health', (_, res) => res.json({ status: 'ok' }))

app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`))
