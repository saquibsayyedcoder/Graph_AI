import { useEffect, useState } from 'react'
import { X, ExternalLink } from 'lucide-react'
import axios from 'axios'

interface Props {
  node: any
  onClose: () => void
  API: string
}

const TYPE_LABELS: Record<string, string> = {
  businessPartner: 'Business Partner',
  salesOrder: 'Sales Order',
  delivery: 'Outbound Delivery',
  billingDocument: 'Billing Document',
  payment: 'Payment',
  journalEntry: 'Journal Entry',
}

const TYPE_COLORS: Record<string, string> = {
  businessPartner: '#a855f7',
  salesOrder: '#3b82f6',
  delivery: '#22c55e',
  billingDocument: '#f59e0b',
  payment: '#14b8a6',
  journalEntry: '#6366f1',
}

export default function NodeInspector({ node, onClose, API }: Props) {
  const [detail, setDetail] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const type = node.entityType
  const id = node.entityId
  const color = TYPE_COLORS[type] || '#3b82f6'

  useEffect(() => {
    if (!type || !id) return
    setLoading(true)
    setDetail(null)
    axios.get(`${API}/graph/node/${type}/${id}`)
      .then(r => setDetail(r.data))
      .catch(() => setDetail(null))
      .finally(() => setLoading(false))
  }, [type, id, API])

  return (
    <div style={{
      position: 'absolute', top: 0, right: 0, bottom: 0,
      width: 320, background: 'var(--bg2)',
      borderLeft: `1px solid ${color}40`,
      display: 'flex', flexDirection: 'column',
      zIndex: 20, overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: `1px solid ${color}30`,
        background: `${color}10`,
      }}>
        <div>
          <div style={{ fontSize: 11, color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {TYPE_LABELS[type] || type}
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginTop: 2 }}>
            {node.data?.label}
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4 }}>
          <X size={16} />
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        {loading && (
          <div style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center', paddingTop: 40 }}>Loading...</div>
        )}
        {!loading && detail && (
          <>
            <Section title="Summary" color={color}>
              {renderSummary(type, detail)}
            </Section>
            {detail.items?.length > 0 && (
              <Section title={`Line Items (${detail.items.length})`} color={color}>
                <ItemTable items={detail.items} type={type} />
              </Section>
            )}
            {detail.addresses?.length > 0 && (
              <Section title="Address" color={color}>
                <AddressCard addr={detail.addresses[0]} />
              </Section>
            )}
            {detail.journalEntries?.length > 0 && (
              <Section title={`Journal Entries (${detail.journalEntries.length})`} color={color}>
                {detail.journalEntries.slice(0, 3).map((je: any, i: number) => (
                  <KV key={i} label="Accounting Doc" value={je.accountingDocument} />
                ))}
              </Section>
            )}
          </>
        )}
        {!loading && !detail && (
          <div style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center', paddingTop: 40 }}>
            No detail available
          </div>
        )}
      </div>
    </div>
  )
}

function renderSummary(type: string, d: any) {
  switch (type) {
    case 'businessPartner': return (
      <>
        <KV label="Partner ID" value={d.businessPartner} />
        <KV label="Name" value={d.businessPartnerFullName} />
        <KV label="Blocked" value={d.businessPartnerIsBlocked ? '⚠️ Yes' : 'No'} warn={d.businessPartnerIsBlocked} />
        <KV label="Archived" value={d.isMarkedForArchiving ? '⚠️ Yes' : 'No'} warn={d.isMarkedForArchiving} />
        <KV label="Created" value={fmtDate(d.creationDate)} />
      </>
    )
    case 'salesOrder': return (
      <>
        <KV label="Order #" value={d.salesOrder} />
        <KV label="Type" value={d.salesOrderType} />
        <KV label="Amount" value={`₹${fmtNum(d.totalNetAmount)} ${d.transactionCurrency}`} highlight />
        <KV label="Delivery Status" value={statusLabel(d.overallDeliveryStatus)} />
        <KV label="Billing Status" value={statusLabel(d.overallOrdReltdBillgStatus) || 'N/A'} />
        <KV label="Payment Terms" value={d.customerPaymentTerms} />
        <KV label="Created" value={fmtDate(d.creationDate)} />
      </>
    )
    case 'delivery': return (
      <>
        <KV label="Delivery Doc" value={d.deliveryDocument} />
        <KV label="Shipping Point" value={d.shippingPoint} />
        <KV label="Goods Movement" value={statusLabel(d.overallGoodsMovementStatus)} />
        <KV label="Picking Status" value={statusLabel(d.overallPickingStatus)} />
        <KV label="Created" value={fmtDate(d.creationDate)} />
      </>
    )
    case 'billingDocument': return (
      <>
        <KV label="Invoice #" value={d.billingDocument} />
        <KV label="Amount" value={`₹${fmtNum(d.totalNetAmount)} ${d.transactionCurrency}`} highlight />
        <KV label="Cancelled" value={d.billingDocumentIsCancelled ? '⚠️ Yes' : 'No'} warn={d.billingDocumentIsCancelled} />
        <KV label="Accounting Doc" value={d.accountingDocument} />
        <KV label="Company Code" value={d.companyCode} />
        <KV label="Fiscal Year" value={d.fiscalYear} />
        <KV label="Billing Date" value={fmtDate(d.billingDocumentDate)} />
      </>
    )
    case 'payment': return (
      <>
        <KV label="Accounting Doc" value={d.accountingDocument} />
        <KV label="Amount" value={`₹${fmtNum(d.amountInTransactionCurrency)} ${d.transactionCurrency}`} highlight />
        <KV label="Clearing Doc" value={d.clearingAccountingDocument} />
        <KV label="GL Account" value={d.glAccount} />
        <KV label="Profit Center" value={d.profitCenter} />
        <KV label="Posting Date" value={fmtDate(d.postingDate)} />
        <KV label="Clearing Date" value={fmtDate(d.clearingDate)} />
      </>
    )
    case 'journalEntry': return (
      <>
        <KV label="Accounting Doc" value={d.accountingDocument} />
        <KV label="Amount" value={`₹${fmtNum(d.amountInTransactionCurrency)} ${d.transactionCurrency}`} highlight />
        <KV label="Doc Type" value={d.accountingDocumentType} />
        <KV label="GL Account" value={d.glAccount} />
        <KV label="Profit Center" value={d.profitCenter} />
        <KV label="Posting Date" value={fmtDate(d.postingDate)} />
      </>
    )
    default: return <pre style={{ fontSize: 11, color: 'var(--text3)' }}>{JSON.stringify(d, null, 2)}</pre>
  }
}

function Section({ title, color, children }: any) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase',
        letterSpacing: '0.08em', marginBottom: 8, paddingBottom: 4,
        borderBottom: `1px solid ${color}20`,
      }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function KV({ label, value, highlight, warn }: { label: string; value: any; highlight?: boolean; warn?: boolean }) {
  if (!value && value !== 0) return null
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5, gap: 8 }}>
      <span style={{ fontSize: 11, color: 'var(--text3)', flexShrink: 0 }}>{label}</span>
      <span style={{
        fontSize: 11, color: warn ? '#ef4444' : highlight ? '#22c55e' : 'var(--text)',
        fontWeight: highlight ? 600 : 400, textAlign: 'right', wordBreak: 'break-all',
      }}>
        {String(value)}
      </span>
    </div>
  )
}

function ItemTable({ items, type }: { items: any[]; type: string }) {
  return (
    <div style={{ overflow: 'auto', maxHeight: 200 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
        <tbody>
          {items.slice(0, 10).map((item: any, i: number) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '4px 0', color: 'var(--text3)' }}>
                {item.salesOrderItem || item.deliveryDocumentItem || item.billingDocumentItem || i + 1}
              </td>
              <td style={{ padding: '4px 4px', color: 'var(--text)', wordBreak: 'break-all' }}>
                {item.material || item.product || '—'}
              </td>
              <td style={{ padding: '4px 0', color: '#22c55e', textAlign: 'right' }}>
                {item.netAmount ? `₹${fmtNum(item.netAmount)}` : item.actualDeliveryQuantity ? `${item.actualDeliveryQuantity} ${item.deliveryQuantityUnit}` : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {items.length > 10 && <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>+{items.length - 10} more</div>}
    </div>
  )
}

function AddressCard({ addr }: { addr: any }) {
  return (
    <div style={{ fontSize: 11, color: 'var(--text)', lineHeight: 1.7 }}>
      {addr.streetName && <div>{addr.streetName}</div>}
      {addr.cityName && <div>{addr.cityName}{addr.postalCode ? `, ${addr.postalCode}` : ''}</div>}
      {addr.region && <div>{addr.region}, {addr.country}</div>}
    </div>
  )
}

function fmtDate(d: any) {
  if (!d) return null
  try { return new Date(d).toLocaleDateString('en-IN') } catch { return d }
}
function fmtNum(n: any) {
  return Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })
}
function statusLabel(s: string) {
  const m: Record<string, string> = { A: 'Not Started', B: 'Partial', C: 'Complete', '': 'N/A' }
  return m[s] || s
}
