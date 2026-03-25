import { Handle, Position } from '@xyflow/react'

const nodeStyles: Record<string, { border: string; accent: string; icon: string }> = {
  businessPartner: { border: '#a855f7', accent: '#3b0764', icon: '👤' },
  salesOrder:      { border: '#3b82f6', accent: '#1e3a5f', icon: '📋' },
  delivery:        { border: '#22c55e', accent: '#14532d', icon: '🚚' },
  billingDocument: { border: '#f59e0b', accent: '#451a03', icon: '🧾' },
  payment:         { border: '#14b8a6', accent: '#042f2e', icon: '💳' },
  journalEntry:    { border: '#6366f1', accent: '#1e1b4b', icon: '📒' },
}

function BaseNode({ data, type, selected }: any) {
  const style = nodeStyles[type] || nodeStyles.salesOrder
  const isBlocked = data.isBlocked || data.isCancelled

  return (
    <div style={{
      background: 'var(--bg2)',
      border: `1.5px solid ${selected ? style.border : 'var(--border)'}`,
      borderRadius: 10,
      padding: '10px 14px',
      minWidth: 160,
      maxWidth: 220,
      cursor: 'pointer',
      boxShadow: selected ? `0 0 0 2px ${style.border}40` : '0 2px 8px rgba(0,0,0,0.4)',
      transition: 'all 0.15s',
      position: 'relative',
    }}>
      {isBlocked && (
        <div style={{
          position: 'absolute', top: -6, right: -6,
          background: '#ef4444', borderRadius: 10,
          fontSize: 9, padding: '1px 5px', color: '#fff', fontWeight: 600,
        }}>
          {data.isCancelled ? 'CANCELLED' : 'BLOCKED'}
        </div>
      )}
      <Handle type="target" position={Position.Left} style={{ background: style.border, width: 8, height: 8 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
        <div style={{
          width: 24, height: 24, borderRadius: 6,
          background: style.accent, border: `1px solid ${style.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, flexShrink: 0,
        }}>
          {style.icon}
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3 }}>
            {data.label}
          </div>
          {data.subLabel && (
            <div style={{ fontSize: 10, color: 'var(--text3)', lineHeight: 1.2 }}>
              {data.subLabel}
            </div>
          )}
        </div>
      </div>
      {data.status && (
        <StatusBadge status={data.status} type="delivery" />
      )}
      {data.creationDate && (
        <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3 }}>
          {new Date(data.creationDate).toLocaleDateString('en-IN')}
        </div>
      )}
      <Handle type="source" position={Position.Right} style={{ background: style.border, width: 8, height: 8 }} />
    </div>
  )
}

function StatusBadge({ status, type }: { status: string; type: string }) {
  const map: Record<string, { label: string; color: string }> = {
    'A': { label: 'Not Started', color: '#6b7280' },
    'B': { label: 'Partial', color: '#f59e0b' },
    'C': { label: 'Complete', color: '#22c55e' },
  }
  const s = map[status] || { label: status, color: '#6b7280' }
  return (
    <span style={{
      fontSize: 9, fontWeight: 600, padding: '1px 6px',
      borderRadius: 4, background: `${s.color}20`,
      color: s.color, border: `1px solid ${s.color}40`,
      textTransform: 'uppercase', letterSpacing: '0.05em',
    }}>
      {s.label}
    </span>
  )
}

export const nodeTypes = {
  businessPartner: (props: any) => <BaseNode {...props} type="businessPartner" />,
  salesOrder:      (props: any) => <BaseNode {...props} type="salesOrder" />,
  delivery:        (props: any) => <BaseNode {...props} type="delivery" />,
  billingDocument: (props: any) => <BaseNode {...props} type="billingDocument" />,
  payment:         (props: any) => <BaseNode {...props} type="payment" />,
  journalEntry:    (props: any) => <BaseNode {...props} type="journalEntry" />,
}
