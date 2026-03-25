import { useState, useRef, useEffect } from 'react'
import { Send, ChevronDown, ChevronUp, AlertTriangle, Database } from 'lucide-react'
import axios from 'axios'

interface Props {
  onHighlight: (ids: string[]) => void
  API: string
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  sql?: string
  data?: any[]
  totalRows?: number
  isOffTopic?: boolean
  loading?: boolean
}

const SUGGESTED = [
  'Which products appear in the most billing documents?',
  'Trace the full flow of billing document 90504248',
  'Show sales orders that were delivered but not billed',
  'Which customers have the highest total order value?',
  'List all cancelled billing documents',
  'Which sales orders have a billing block?',
  'Show me payments made in April 2025',
]

export default function ChatPanel({ onHighlight, API }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! I can answer questions about your SAP Order-to-Cash data — sales orders, deliveries, billing documents, payments, and more. What would you like to know?',
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (text?: string) => {
    const q = (text || input).trim()
    if (!q || loading) return
    setInput('')
    setLoading(true)

    const userMsg: Message = { role: 'user', content: q }
    setMessages(prev => [...prev, userMsg, { role: 'assistant', content: '', loading: true }])

    try {
      const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }))
      const res = await axios.post(`${API}/chat`, { message: q, history })
      const { answer, sql, data, totalRows, isOffTopic } = res.data

      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: answer, sql, data, totalRows, isOffTopic }
      ])
    } catch (err) {
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      width: 380, display: 'flex', flexDirection: 'column',
      background: 'var(--bg2)', borderLeft: '1px solid var(--border)',
      flexShrink: 0,
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%', background: '#22c55e',
          boxShadow: '0 0 6px #22c55e',
        }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>O2C Assistant</span>
        <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 4 }}>powered by Groq</span>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 12px 4px' }}>
        {messages.map((msg, i) => (
          <ChatMessage key={i} msg={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Suggested queries - only show when few messages */}
      {messages.length <= 2 && (
        <div style={{ padding: '0 12px 8px' }}>
          <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Try asking
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {SUGGESTED.slice(0, 4).map((q, i) => (
              <button
                key={i}
                onClick={() => send(q)}
                style={{
                  textAlign: 'left', padding: '6px 10px', borderRadius: 6,
                  border: '1px solid var(--border)', background: 'var(--bg3)',
                  color: 'var(--text2)', fontSize: 11, cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#3b82f6')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div style={{
        padding: '10px 12px', borderTop: '1px solid var(--border)',
        display: 'flex', gap: 8, alignItems: 'flex-end',
      }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder="Ask about sales orders, deliveries, invoices…"
          rows={2}
          style={{
            flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '8px 10px', color: 'var(--text)',
            fontSize: 13, resize: 'none', outline: 'none',
            fontFamily: 'inherit', lineHeight: 1.4,
          }}
          onFocus={e => (e.target.style.borderColor = '#3b82f6')}
          onBlur={e => (e.target.style.borderColor = 'var(--border)')}
        />
        <button
          onClick={() => send()}
          disabled={!input.trim() || loading}
          style={{
            width: 36, height: 36, borderRadius: 8, border: 'none',
            background: input.trim() && !loading ? '#3b82f6' : 'var(--bg3)',
            color: input.trim() && !loading ? '#fff' : 'var(--text3)',
            cursor: input.trim() && !loading ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'all 0.15s',
          }}
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  )
}

function ChatMessage({ msg }: { msg: Message }) {
  const [sqlOpen, setSqlOpen] = useState(false)
  const [dataOpen, setDataOpen] = useState(false)
  const isUser = msg.role === 'user'

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 12,
    }}>
      <div style={{
        maxWidth: '92%', padding: '8px 12px', borderRadius: isUser ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
        background: isUser ? '#1e3a5f' : 'var(--bg3)',
        border: `1px solid ${isUser ? '#3b82f640' : 'var(--border)'}`,
        fontSize: 13, lineHeight: 1.6, color: 'var(--text)',
      }}>
        {msg.loading ? (
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '2px 0' }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: 6, height: 6, borderRadius: '50%', background: '#3b82f6',
                animation: `bounce 1s ease-in-out ${i * 0.15}s infinite`,
              }} />
            ))}
            <style>{`@keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }`}</style>
          </div>
        ) : (
          <>
            {msg.isOffTopic && (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6, color: '#f59e0b' }}>
                <AlertTriangle size={13} />
                <span style={{ fontSize: 11, fontWeight: 600 }}>Off-topic query</span>
              </div>
            )}
            <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
          </>
        )}
      </div>

      {/* SQL accordion */}
      {msg.sql && (
        <div style={{ maxWidth: '92%', marginTop: 4, width: '100%' }}>
          <button
            onClick={() => setSqlOpen(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#6366f1', fontSize: 11, padding: '2px 0',
            }}
          >
            <Database size={11} />
            View SQL
            {sqlOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
          {sqlOpen && (
            <pre style={{
              background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 6, padding: 10, fontSize: 11, color: '#a5b4fc',
              overflow: 'auto', maxHeight: 180, lineHeight: 1.5,
              whiteSpace: 'pre-wrap', wordBreak: 'break-all',
            }}>
              {msg.sql}
            </pre>
          )}
        </div>
      )}

      {/* Data table accordion */}
      {msg.data && msg.data.length > 0 && (
        <div style={{ maxWidth: '92%', marginTop: 4, width: '100%' }}>
          <button
            onClick={() => setDataOpen(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#14b8a6', fontSize: 11, padding: '2px 0',
            }}
          >
            View data ({msg.totalRows} rows)
            {dataOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
          {dataOpen && (
            <div style={{ overflow: 'auto', maxHeight: 220, border: '1px solid var(--border)', borderRadius: 6 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                <thead>
                  <tr style={{ background: 'var(--bg3)', position: 'sticky', top: 0 }}>
                    {Object.keys(msg.data[0]).slice(0, 6).map(col => (
                      <th key={col} style={{
                        padding: '5px 8px', textAlign: 'left', color: 'var(--text3)',
                        fontWeight: 600, borderBottom: '1px solid var(--border)',
                        whiteSpace: 'nowrap',
                      }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {msg.data.slice(0, 20).map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      {Object.values(row).slice(0, 6).map((val: any, j) => (
                        <td key={j} style={{
                          padding: '4px 8px', color: 'var(--text2)',
                          maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {val === null ? <span style={{ color: 'var(--text3)' }}>null</span> : String(val)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
