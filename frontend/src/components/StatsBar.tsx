import { LayoutGrid, MessageSquare, X } from 'lucide-react'

interface Props {
  stats: any
  chatOpen: boolean
  onToggleChat: () => void
}

const s: Record<string, React.CSSProperties> = {
  bar: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '0 16px', height: 52,
    background: 'var(--bg2)', borderBottom: '1px solid var(--border)',
    flexShrink: 0,
  },
  logo: { display: 'flex', alignItems: 'center', gap: 8, marginRight: 8 },
  logoIcon: {
    width: 28, height: 28, borderRadius: 6,
    background: 'linear-gradient(135deg, #3b82f6, #a855f7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 13, fontWeight: 700, color: '#fff',
  },
  logoText: { fontSize: 14, fontWeight: 600, color: 'var(--text)' },
  divider: { width: 1, height: 24, background: 'var(--border)', margin: '0 4px' },
  stat: { display: 'flex', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: '50%' },
  statLabel: { fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  statValue: { fontSize: 13, fontWeight: 600, color: 'var(--text)' },
  spacer: { flex: 1 },
  btn: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border)',
    background: 'transparent', color: 'var(--text2)', cursor: 'pointer',
    fontSize: 12, fontWeight: 500, transition: 'all 0.15s',
  },
}

export default function StatsBar({ stats, chatOpen, onToggleChat }: Props) {
  const items = [
    { label: 'Sales Orders', value: stats?.salesOrders, color: '#3b82f6' },
    { label: 'Deliveries', value: stats?.deliveries, color: '#22c55e' },
    { label: 'Invoices', value: stats?.billingDocuments, color: '#f59e0b' },
    { label: 'Payments', value: stats?.payments, color: '#14b8a6' },
    { label: 'Customers', value: stats?.customers, color: '#a855f7' },
    { label: 'Cancelled', value: stats?.cancelledInvoices, color: '#ef4444' },
  ]

  return (
    <div style={s.bar}>
      <div style={s.logo}>
        <div style={s.logoIcon}>O2C</div>
        <span style={s.logoText}>Graph Explorer</span>
      </div>
      <div style={s.divider} />
      {items.map(item => (
        <div key={item.label} style={s.stat}>
          <div style={{ ...s.dot, background: item.color }} />
          <span style={s.statLabel}>{item.label}</span>
          <span style={s.statValue}>{item.value ?? '—'}</span>
        </div>
      ))}
      {stats?.totalRevenue && (
        <>
          <div style={s.divider} />
          <div style={s.stat}>
            <span style={s.statLabel}>Total Revenue</span>
            <span style={{ ...s.statValue, color: '#22c55e' }}>
              ₹{Number(stats.totalRevenue).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          </div>
        </>
      )}
      <div style={s.spacer} />
      <button style={s.btn} onClick={onToggleChat}>
        {chatOpen ? <X size={13} /> : <MessageSquare size={13} />}
        {chatOpen ? 'Hide Chat' : 'Open Chat'}
      </button>
    </div>
  )
}
