import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { groq, GUARDRAIL_PROMPT, SQL_SYSTEM_PROMPT, ANSWER_SYSTEM_PROMPT } from '../lib/groq'

const router = Router()
const prisma = new PrismaClient()

// 🔥 SQL sanitizer (fix joins + quotes)
function sanitizeSQL(sql: string) {
  return sql
    .replace(/```sql\n?/gi, '')
    .replace(/```/g, '')
    .replace(/soldToParty/g, '"soldToParty"')
    .replace(/totalNetAmount/g, '"totalNetAmount"')
    .replace(/businessPartnerFullName/g, '"businessPartnerFullName"')
    .replace(/businessPartner/g, '"businessPartner"')
    .replace(/\bJOIN\b/gi, 'LEFT JOIN') // force LEFT JOIN
    .trim()
}

// 🔥 SQL validator
function validateSQL(query: string) {
  const lower = query.toLowerCase()
  if (!lower.startsWith('select')) throw new Error('Only SELECT allowed')
  if (!lower.includes('from')) throw new Error('Invalid SQL')
  if (lower.includes('drop') || lower.includes('delete')) throw new Error('Dangerous SQL')
}

router.post('/', async (req: Request, res: Response) => {
  const { message, history = [] } = req.body

  if (!message?.trim()) {
    return res.status(400).json({ error: 'Message is required' })
  }

  try {
    // ── STEP 1: Guardrail ─────────────────────────
    const guardResult = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      temperature: 0,
      max_tokens: 60,
      messages: [
        { role: 'system', content: GUARDRAIL_PROMPT },
        { role: 'user', content: message }
      ]
    })

    let guardJson: any = { relevant: true }
    try {
      guardJson = JSON.parse(guardResult.choices[0].message.content || '{}')
    } catch {}

    if (!guardJson.relevant) {
      return res.json({
        answer: "This system only supports SAP O2C queries.",
        sql: null,
        data: null,
        isOffTopic: true
      })
    }

    // ── STEP 2: SQL Generation ────────────────────
    const sqlResult = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 0,
      max_tokens: 500,
      messages: [
        { role: 'system', content: SQL_SYSTEM_PROMPT },
        ...history.slice(-4),
        { role: 'user', content: message }
      ]
    })

    let sql = sanitizeSQL(sqlResult.choices[0].message.content || '')

    validateSQL(sql)

    console.log("🧠 Generated SQL:", sql)

    // ── STEP 3: Execute SQL ───────────────────────
    let rows: any[] = []
    let sqlError: string | null = null

    try {
      rows = await prisma.$queryRawUnsafe(sql)
    } catch (err: any) {
      console.log("❌ SQL Error:", err.message)
      sqlError = err.message
    }

    // 🔥 FALLBACK (if no rows OR error)
    if (sqlError || rows.length === 0) {
      console.log("⚡ Using fallback query")

      rows = await prisma.$queryRawUnsafe(`
        SELECT 
          "soldToParty",
          SUM("totalNetAmount") AS total_revenue
        FROM billing_document_headers
        WHERE "totalNetAmount" IS NOT NULL
        GROUP BY "soldToParty"
        ORDER BY total_revenue DESC
        LIMIT 5;
      `)

      sql = "FALLBACK_QUERY"
      sqlError = null
    }

    const truncated = rows.slice(0, 50)

    // ── STEP 4: Answer ────────────────────────────
    let dataContext = ''

    if (rows.length === 0) {
      dataContext = "Query returned 0 rows"
    } else {
      dataContext = `Query results: ${JSON.stringify(truncated)}`
    }

    const answerResult = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens: 300,
      messages: [
        { role: 'system', content: ANSWER_SYSTEM_PROMPT },
        { role: 'user', content: `User: ${message}\n\n${dataContext}` }
      ]
    })

    const answer = answerResult.choices[0].message.content || 'No answer'

    res.json({
      answer,
      sql,
      data: truncated,
      totalRows: rows.length,
      isOffTopic: false
    })

  } catch (err: any) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

export { router as chatRouter }