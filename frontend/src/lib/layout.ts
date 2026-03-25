// Tiered left-to-right layout for O2C flow
// Column order: Customer → Sales Order → Delivery → Billing → Payment/Journal

const TIER_ORDER: Record<string, number> = {
  businessPartner: 0,
  salesOrder:      1,
  delivery:        2,
  billingDocument: 3,
  payment:         4,
  journalEntry:    4,
}

const COL_WIDTH  = 260
const ROW_HEIGHT = 110
const X_OFFSET   = 60
const Y_OFFSET   = 80

export function layoutGraph(nodes: any[], edges: any[]) {
  // Group nodes by tier
  const tiers: Map<number, any[]> = new Map()
  for (const node of nodes) {
    const tier = TIER_ORDER[node.type] ?? 5
    if (!tiers.has(tier)) tiers.set(tier, [])
    tiers.get(tier)!.push(node)
  }

  const positioned = nodes.map(node => {
    const tier = TIER_ORDER[node.type] ?? 5
    const tierNodes = tiers.get(tier) || []
    const idx = tierNodes.findIndex((n: any) => n.id === node.id)
    const totalInTier = tierNodes.length

    // Spread nodes vertically within each tier
    const x = X_OFFSET + tier * COL_WIDTH
    const y = Y_OFFSET + idx * ROW_HEIGHT - (totalInTier * ROW_HEIGHT) / 2 + 300

    return { ...node, position: { x, y } }
  })

  return { nodes: positioned, edges }
}
