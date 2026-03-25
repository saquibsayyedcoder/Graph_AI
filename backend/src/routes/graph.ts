import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

function safeAmount(val: any) {
  return Number(val || 0).toLocaleString()
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const [
      salesOrders,
      deliveries,
      deliveryItems,
      billingDocs,
      payments,
      journalEntries,
      partners,
      bdItems
    ] = await Promise.all([
      prisma.salesOrderHeader.findMany({ take: 100, include: { items: true } }),
      prisma.outboundDeliveryHeader.findMany({ take: 100, include: { items: true } }),
      prisma.outboundDeliveryItem.findMany({ take: 200 }),
      prisma.billingDocumentHeader.findMany({ take: 100 }),
      prisma.paymentAccountsReceivable.findMany({ take: 100 }),
      prisma.journalEntryItem.findMany({ take: 100 }),
      prisma.businessPartner.findMany({ include: { addresses: true } }),
      prisma.billingDocumentItem.findMany({ take: 300 })
    ])

    const nodes: any[] = []
    const edges: any[] = []
    const edgeSet = new Set<string>()

    const addEdge = (source: string, target: string, label: string) => {
      const key = `${source}__${target}`
      if (!edgeSet.has(key) && source !== target) {
        edgeSet.add(key)
        edges.push({ id: key, source, target, label })
      }
    }

    // 🔥 Create fast lookup maps
    const deliveryMap = new Set(deliveries.map(d => d.deliveryDocument))
    const billingMap = new Map(billingDocs.map(b => [b.accountingDocument, b]))

    // ── Business Partners ──
    for (const bp of partners) {
      nodes.push({
        id: `bp_${bp.businessPartner}`,
        type: 'businessPartner',
        data: {
          label: bp.businessPartnerFullName || bp.businessPartner,
          subLabel: `Customer ${bp.businessPartner}`,
          isBlocked: bp.businessPartnerIsBlocked,
          city: bp.addresses[0]?.cityName || '',
          country: bp.addresses[0]?.country || '',
        },
        position: { x: 0, y: 0 }
      })
    }

    // ── Sales Orders ──
    for (const so of salesOrders) {
      nodes.push({
        id: `so_${so.salesOrder}`,
        type: 'salesOrder',
        data: {
          label: `SO ${so.salesOrder}`,
          subLabel: `₹${safeAmount(so.totalNetAmount)}`,
          status: so.overallDeliveryStatus,
          billingStatus: so.overallOrdReltdBillgStatus,
          itemCount: so.items.length
        },
        position: { x: 0, y: 0 }
      })

      if (so.soldToParty) {
        addEdge(`bp_${so.soldToParty}`, `so_${so.salesOrder}`, 'places')
      }
    }

    // ── Deliveries ──
    for (const del of deliveries) {
      nodes.push({
        id: `del_${del.deliveryDocument}`,
        type: 'delivery',
        data: {
          label: `Delivery ${del.deliveryDocument}`,
          subLabel: del.shippingPoint || '',
          status: del.overallGoodsMovementStatus
        },
        position: { x: 0, y: 0 }
      })
    }

    // SO → Delivery
    for (const di of deliveryItems) {
      if (di.referenceSdDocument) {
        addEdge(`so_${di.referenceSdDocument}`, `del_${di.deliveryDocument}`, 'fulfilled by')
      }
    }

    // ── Billing Documents ──
    for (const bd of billingDocs) {
      nodes.push({
        id: `bd_${bd.billingDocument}`,
        type: 'billingDocument',
        data: {
          label: `Invoice ${bd.billingDocument}`,
          subLabel: `₹${safeAmount(bd.totalNetAmount)}`,
          isCancelled: bd.billingDocumentIsCancelled
        },
        position: { x: 0, y: 0 }
      })

      if (bd.soldToParty) {
        addEdge(`bp_${bd.soldToParty}`, `bd_${bd.billingDocument}`, 'billed to')
      }
    }

    // Delivery → Billing (FIXED)
    for (const bi of bdItems) {
      if (bi.referenceSdDocument && deliveryMap.has(bi.referenceSdDocument)) {
        addEdge(`del_${bi.referenceSdDocument}`, `bd_${bi.billingDocument}`, 'billed')
      }
    }

    // ── Payments ──
    for (const pmt of payments) {
      const id = `pmt_${pmt.id}`

      nodes.push({
        id,
        type: 'payment',
        data: {
          label: 'Payment',
          subLabel: `₹${safeAmount(pmt.amountInTransactionCurrency)}`
        },
        position: { x: 0, y: 0 }
      })

      if (pmt.customer) {
        addEdge(`bp_${pmt.customer}`, id, 'pays')
      }

      const bd = billingMap.get(pmt.accountingDocument)
      if (bd) {
        addEdge(`bd_${bd.billingDocument}`, id, 'clears')
      }
    }

    // ── Journal Entries ──
    for (const je of journalEntries) {
      const id = `je_${je.id}`

      nodes.push({
        id,
        type: 'journalEntry',
        data: {
          label: 'Journal Entry',
          subLabel: `₹${safeAmount(je.amountInTransactionCurrency)}`
        },
        position: { x: 0, y: 0 }
      })

      if (je.referenceDocument) {
        addEdge(`bd_${je.referenceDocument}`, id, 'posted')
      }
    }

    res.json({ nodes, edges })

  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to load graph' })
  }
})

// ── NODE DETAILS ──
router.get('/node/:type/:id', async (req: Request, res: Response) => {
  const { type, id } = req.params
  const cleanId = id.split('_')[1]

  try {
    let data: any = null

    if (type === 'salesOrder') {
      data = await prisma.salesOrderHeader.findUnique({
        where: { salesOrder: cleanId },
        include: { items: true, soldTo: true }
      })
    }

    if (type === 'delivery') {
      data = await prisma.outboundDeliveryHeader.findUnique({
        where: { deliveryDocument: cleanId },
        include: { items: true }
      })
    }

    if (type === 'billingDocument') {
      data = await prisma.billingDocumentHeader.findUnique({
        where: { billingDocument: cleanId },
        include: { items: true }
      })
    }

    if (type === 'businessPartner') {
      data = await prisma.businessPartner.findUnique({
        where: { businessPartner: cleanId },
        include: { addresses: true }
      })
    }

    if (type === 'payment') {
      data = await prisma.paymentAccountsReceivable.findUnique({
        where: { id: Number(cleanId) }
      })
    }

    if (type === 'journalEntry') {
      data = await prisma.journalEntryItem.findUnique({
        where: { id: Number(cleanId) }
      })
    }

    if (!data) return res.status(404).json({ error: 'Not found' })

    res.json(data)

  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to load node' })
  }
})

// ── STATS ──
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const [so, del, bd, pay, bp, cancelled] = await Promise.all([
      prisma.salesOrderHeader.count(),
      prisma.outboundDeliveryHeader.count(),
      prisma.billingDocumentHeader.count({ where: { billingDocumentIsCancelled: false } }),
      prisma.paymentAccountsReceivable.count(),
      prisma.businessPartner.count(),
      prisma.billingDocumentHeader.count({ where: { billingDocumentIsCancelled: true } }),
    ])

    const revenue = await prisma.billingDocumentHeader.aggregate({
      _sum: { totalNetAmount: true },
      where: { billingDocumentIsCancelled: false }
    })

    res.json({
      salesOrders: so,
      deliveries: del,
      billingDocuments: bd,
      payments: pay,
      customers: bp,
      cancelledInvoices: cancelled,
      totalRevenue: revenue._sum.totalNetAmount
    })

  } catch {
    res.status(500).json({ error: 'Stats failed' })
  }
})

export { router as graphRouter }