import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { groq, GUARDRAIL_PROMPT, SQL_SYSTEM_PROMPT, ANSWER_SYSTEM_PROMPT } from '../lib/groq'

const router = Router()
const prisma = new PrismaClient()

// POST /api/chat
router.post('/', async (req: Request, res: Response) => {
  const { message, history = [] } = req.body

  if (!message?.trim()) {
    return res.status(400).json({ error: 'Message is required' })
  }

  try {
    // ── STEP 1: Guardrail check ──────────────────────────────────────────
    const guardResult = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      max_tokens: 60,
      temperature: 0,
      messages: [
        { role: 'system', content: GUARDRAIL_PROMPT },
        { role: 'user', content: message }
      ]
    })

    let guardJson: any = { relevant: true }
    try {
      const guardText = guardResult.choices[0].message.content?.trim() || '{}'
      guardJson = JSON.parse(guardText)
    } catch { /* default to relevant if parse fails */ }

    if (!guardJson.relevant) {
      return res.json({
        answer: `This system is designed to answer questions related to the SAP Order-to-Cash dataset only. ${guardJson.reason ? `(${guardJson.reason})` : ''}`,
        sql: null,
        data: null,
        isOffTopic: true,
      })
    }

    // ── STEP 2: NL → SQL ────────────────────────────────────────────────
    const sqlMessages: any[] = [
      { role: 'system', content: SQL_SYSTEM_PROMPT },
      ...history.slice(-4).map((h: any) => ({ role: h.role, content: h.content })),
      { role: 'user', content: message }
    ]

    const sqlResult = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 600,
      temperature: 0,
      messages: sqlMessages,
    })

    let sql = sqlResult.choices[0].message.content?.trim() || ''
    // Strip markdown code blocks if model adds them
    sql = sql.replace(/```sql\n?/gi, '').replace(/```\n?/g, '').trim()

    // Safety check — only allow SELECT
    if (!sql.toLowerCase().startsWith('select')) {
      return res.json({
        answer: 'I could not generate a safe query for that question. Please rephrase.',
        sql,
        data: null,
      })
    }

    // ── STEP 3: Execute SQL ─────────────────────────────────────────────
    let rows: any[] = []
    let sqlError: string | null = null
    try {
      rows = await prisma.$queryRawUnsafe(sql) as any[]
    } catch (err: any) {
      sqlError = err.message
      // Try a fallback simpler query
      rows = []
    }

    // Limit payload size
    const truncated = rows.slice(0, 50)

    // ── STEP 4: Synthesize answer ───────────────────────────────────────
    const dataContext = sqlError
      ? `SQL Error: ${sqlError}. The query was: ${sql}`
      : `Query results (${rows.length} rows): ${JSON.stringify(truncated, null, 2)}`

    const answerResult = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 400,
      temperature: 0.3,
      messages: [
        { role: 'system', content: ANSWER_SYSTEM_PROMPT },
        { role: 'user', content: `User question: ${message}\n\n${dataContext}` }
      ]
    })

    const answer = answerResult.choices[0].message.content?.trim() || 'Unable to generate answer.'

    res.json({
      answer,
      sql,
      data: truncated,
      totalRows: rows.length,
      isOffTopic: false,
    })

  } catch (err: any) {
    console.error('Chat error:', err)
    res.status(500).json({ error: 'Chat processing failed', details: err.message })
  }
})

export { router as chatRouter }
