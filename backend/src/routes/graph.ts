import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

// GET /api/graph - returns full graph (paginated/sampled for performance)
router.get('/', async (req: Request, res: Response) => {
  try {
    const [
      salesOrders,
      deliveries,
      deliveryItems,
      billingDocs,
      payments,
      journalEntries,
      partners,
    ] = await Promise.all([
      prisma.salesOrderHeader.findMany({ take: 100, include: { items: true } }),
      prisma.outboundDeliveryHeader.findMany({ take: 100, include: { items: true } }),
      prisma.outboundDeliveryItem.findMany({ take: 200 }),
      prisma.billingDocumentHeader.findMany({ take: 100 }),
      prisma.paymentAccountsReceivable.findMany({ take: 100 }),
      prisma.journalEntryItem.findMany({ take: 100 }),
      prisma.businessPartner.findMany({ include: { addresses: true } }),
    ])

    const nodes: any[] = []
    const edges: any[] = []
    const edgeSet = new Set<string>()

    const addEdge = (source: string, target: string, label: string) => {
      const key = `${source}__${target}`
      if (!edgeSet.has(key) && source !== target) {
        edgeSet.add(key)
        edges.push({ id: key, source, target, label, animated: false })
      }
    }

    // Business Partner nodes
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
        position: { x: 0, y: 0 },
      })
    }

    // Sales Order nodes + edges to customer
    for (const so of salesOrders) {
      nodes.push({
        id: `so_${so.salesOrder}`,
        type: 'salesOrder',
        data: {
          label: `SO ${so.salesOrder}`,
          subLabel: `₹${Number(so.totalNetAmount || 0).toLocaleString()}`,
          status: so.overallDeliveryStatus,
          billingStatus: so.overallOrdReltdBillgStatus,
          currency: so.transactionCurrency,
          itemCount: so.items.length,
          creationDate: so.creationDate,
        },
        position: { x: 0, y: 0 },
      })
      if (so.soldToParty) {
        addEdge(`bp_${so.soldToParty}`, `so_${so.salesOrder}`, 'places')
      }
    }

    // Delivery nodes + edges from sales order items
    for (const del of deliveries) {
      nodes.push({
        id: `del_${del.deliveryDocument}`,
        type: 'delivery',
        data: {
          label: `Delivery ${del.deliveryDocument}`,
          subLabel: del.shippingPoint ? `Ship: ${del.shippingPoint}` : '',
          goodsMovementStatus: del.overallGoodsMovementStatus,
          pickingStatus: del.overallPickingStatus,
          creationDate: del.creationDate,
        },
        position: { x: 0, y: 0 },
      })
    }

    // Link delivery items → sales orders
    for (const di of deliveryItems) {
      if (di.referenceSdDocument) {
        addEdge(`so_${di.referenceSdDocument}`, `del_${di.deliveryDocument}`, 'fulfilled by')
      }
    }

    // Billing Document nodes + edges from deliveries and sales orders
    for (const bd of billingDocs) {
      nodes.push({
        id: `bd_${bd.billingDocument}`,
        type: 'billingDocument',
        data: {
          label: `Invoice ${bd.billingDocument}`,
          subLabel: `₹${Number(bd.totalNetAmount || 0).toLocaleString()}`,
          isCancelled: bd.billingDocumentIsCancelled,
          fiscalYear: bd.fiscalYear,
          accountingDocument: bd.accountingDocument,
          creationDate: bd.creationDate,
        },
        position: { x: 0, y: 0 },
      })
      if (bd.soldToParty) {
        addEdge(`bp_${bd.soldToParty}`, `bd_${bd.billingDocument}`, 'billed to')
      }
    }

    // Link billing doc items → deliveries (via referenceSdDocument = delivery)
    const bdItems = await prisma.billingDocumentItem.findMany({ take: 300 })
    for (const bi of bdItems) {
      if (bi.referenceSdDocument) {
        // referenceSdDocument could be a delivery doc
        if (edgeSet.has(`del_${bi.referenceSdDocument}`) || deliveries.find(d => d.deliveryDocument === bi.referenceSdDocument)) {
          addEdge(`del_${bi.referenceSdDocument}`, `bd_${bi.billingDocument}`, 'billed')
        }
      }
    }

    // Payment nodes + edges from billing docs
    for (const pmt of payments) {
      const pmtId = `pmt_${pmt.id}`
      nodes.push({
        id: pmtId,
        type: 'payment',
        data: {
          label: `Payment`,
          subLabel: `₹${Number(pmt.amountInTransactionCurrency || 0).toLocaleString()}`,
          accountingDocument: pmt.accountingDocument,
          clearingDate: pmt.clearingDate,
          glAccount: pmt.glAccount,
        },
        position: { x: 0, y: 0 },
      })
      if (pmt.customer) {
        addEdge(`bp_${pmt.customer}`, pmtId, 'pays')
      }
      // Link payment → billing doc via accountingDocument
      const matchingBD = billingDocs.find(bd => bd.accountingDocument === pmt.accountingDocument)
      if (matchingBD) {
        addEdge(`bd_${matchingBD.billingDocument}`, pmtId, 'clears')
      }
    }

    // Journal Entry nodes + edges from billing docs
    for (const je of journalEntries) {
      const jeId = `je_${je.id}`
      nodes.push({
        id: jeId,
        type: 'journalEntry',
        data: {
          label: `Journal Entry`,
          subLabel: `₹${Number(je.amountInTransactionCurrency || 0).toLocaleString()}`,
          accountingDocument: je.accountingDocument,
          glAccount: je.glAccount,
          postingDate: je.postingDate,
          docType: je.accountingDocumentType,
        },
        position: { x: 0, y: 0 },
      })
      if (je.referenceDocument) {
        addEdge(`bd_${je.referenceDocument}`, jeId, 'posts to')
      }
    }

    res.json({ nodes, edges })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to load graph' })
  }
})

// GET /api/graph/node/:type/:id - node detail
router.get('/node/:type/:id', async (req: Request, res: Response) => {
  const { type, id } = req.params
  try {
    let data: any = null
    switch (type) {
      case 'salesOrder':
        data = await prisma.salesOrderHeader.findUnique({
          where: { salesOrder: id },
          include: { items: true, soldTo: { include: { addresses: true } } }
        })
        break
      case 'delivery':
        data = await prisma.outboundDeliveryHeader.findUnique({
          where: { deliveryDocument: id },
          include: { items: true }
        })
        break
      case 'billingDocument':
        data = await prisma.billingDocumentHeader.findUnique({
          where: { billingDocument: id },
          include: { items: true, soldTo: true, journalEntries: true }
        })
        break
      case 'businessPartner':
        data = await prisma.businessPartner.findUnique({
          where: { businessPartner: id },
          include: { addresses: true }
        })
        break
      case 'payment':
        data = await prisma.paymentAccountsReceivable.findUnique({ where: { id: parseInt(id) } })
        break
      case 'journalEntry':
        data = await prisma.journalEntryItem.findUnique({ where: { id: parseInt(id) } })
        break
    }
    if (!data) return res.status(404).json({ error: 'Not found' })
    res.json(data)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to load node' })
  }
})

// GET /api/graph/stats - summary stats for dashboard
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const [soCount, delCount, bdCount, pmtCount, bpCount, cancelledCount] = await Promise.all([
      prisma.salesOrderHeader.count(),
      prisma.outboundDeliveryHeader.count(),
      prisma.billingDocumentHeader.count({ where: { billingDocumentIsCancelled: false } }),
      prisma.paymentAccountsReceivable.count(),
      prisma.businessPartner.count(),
      prisma.billingDocumentHeader.count({ where: { billingDocumentIsCancelled: true } }),
    ])
    const totalRevenue = await prisma.billingDocumentHeader.aggregate({
      _sum: { totalNetAmount: true },
      where: { billingDocumentIsCancelled: false }
    })
    res.json({
      salesOrders: soCount,
      deliveries: delCount,
      billingDocuments: bdCount,
      payments: pmtCount,
      customers: bpCount,
      cancelledInvoices: cancelledCount,
      totalRevenue: totalRevenue._sum.totalNetAmount,
    })
  } catch (err) {
    res.status(500).json({ error: 'Stats failed' })
  }
})

export { router as graphRouter }
