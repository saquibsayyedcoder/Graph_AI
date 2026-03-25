import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import * as readline from 'readline'

const prisma = new PrismaClient()

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../../data/sap-o2c-data')

async function readJsonl(folder: string): Promise<any[]> {
  const dir = path.join(DATA_DIR, folder)
  if (!fs.existsSync(dir)) { console.warn(`Missing: ${dir}`); return [] }
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsonl'))
  const records: any[] = []
  for (const file of files) {
    const rl = readline.createInterface({ input: fs.createReadStream(path.join(dir, file)) })
    for await (const line of rl) {
      if (line.trim()) records.push(JSON.parse(line))
    }
  }
  return records
}

function toDecimal(v: any) {
  if (v === null || v === undefined || v === '') return null
  const n = parseFloat(v)
  return isNaN(n) ? null : n
}

function toDate(v: any) {
  if (!v) return null
  try { const d = new Date(v); return isNaN(d.getTime()) ? null : d } catch { return null }
}

async function main() {
  console.log('🌱 Seeding SAP O2C data...')

  // Business Partners
  const partners = await readJsonl('business_partners')
  await prisma.businessPartner.deleteMany()
  for (const r of partners) {
    await prisma.businessPartner.upsert({
      where: { businessPartner: r.businessPartner },
      update: {},
      create: {
        businessPartner: r.businessPartner,
        customer: r.customer || null,
        businessPartnerCategory: r.businessPartnerCategory || null,
        businessPartnerFullName: r.businessPartnerFullName || null,
        businessPartnerName: r.businessPartnerName || null,
        businessPartnerIsBlocked: r.businessPartnerIsBlocked ?? false,
        isMarkedForArchiving: r.isMarkedForArchiving ?? false,
        creationDate: toDate(r.creationDate),
        lastChangeDate: toDate(r.lastChangeDate),
      }
    })
  }
  console.log(`✅ BusinessPartners: ${partners.length}`)

  // Business Partner Addresses
  const addresses = await readJsonl('business_partner_addresses')
  await prisma.businessPartnerAddress.deleteMany()
  const validBPs = new Set(partners.map((p: any) => p.businessPartner))
  for (const r of addresses) {
    if (!validBPs.has(r.businessPartner)) continue
    await prisma.businessPartnerAddress.create({
      data: {
        businessPartner: r.businessPartner,
        cityName: r.cityName || null,
        country: r.country || null,
        postalCode: r.postalCode || null,
        streetName: r.streetName || null,
        region: r.region || null,
      }
    })
  }
  console.log(`✅ Addresses: ${addresses.length}`)

  // Products
  const products = await readJsonl('products')
  await prisma.product.deleteMany()
  for (const r of products) {
    await prisma.product.upsert({
      where: { product: r.product },
      update: {},
      create: {
        product: r.product,
        productType: r.productType || null,
        productOldId: r.productOldId || null,
        grossWeight: toDecimal(r.grossWeight),
        netWeight: toDecimal(r.netWeight),
        weightUnit: r.weightUnit || null,
        productGroup: r.productGroup || null,
        baseUnit: r.baseUnit || null,
        division: r.division || null,
        isMarkedForDeletion: r.isMarkedForDeletion ?? false,
        creationDate: toDate(r.creationDate),
      }
    })
  }
  console.log(`✅ Products: ${products.length}`)

  // Product Descriptions
  const prodDescs = await readJsonl('product_descriptions')
  await prisma.productDescription.deleteMany()
  const validProducts = new Set(products.map((p: any) => p.product))
  for (const r of prodDescs) {
    if (!validProducts.has(r.product)) continue
    await prisma.productDescription.create({
      data: {
        product: r.product,
        language: r.language || null,
        description: r.productDescription || null,
      }
    })
  }
  console.log(`✅ ProductDescriptions: ${prodDescs.length}`)

  // Plants
  const plants = await readJsonl('plants')
  await prisma.plant.deleteMany()
  for (const r of plants) {
    await prisma.plant.upsert({
      where: { plant: r.plant },
      update: {},
      create: {
        plant: r.plant,
        plantName: r.plantName || null,
        salesOrganization: r.salesOrganization || null,
        distributionChannel: r.distributionChannel || null,
        addressId: r.addressId || null,
        factoryCalendar: r.factoryCalendar || null,
        isMarkedForArchiving: r.isMarkedForArchiving ?? false,
      }
    })
  }
  console.log(`✅ Plants: ${plants.length}`)

  // Customer Sales Area Assignments
  const csaa = await readJsonl('customer_sales_area_assignments')
  await prisma.customerSalesAreaAssignment.deleteMany()
  for (const r of csaa) {
    await prisma.customerSalesAreaAssignment.create({
      data: {
        customer: r.customer || null,
        salesOrganization: r.salesOrganization || null,
        distributionChannel: r.distributionChannel || null,
        division: r.division || null,
        salesGroup: r.salesGroup || null,
        salesOffice: r.salesOffice || null,
      }
    })
  }
  console.log(`✅ CustomerSalesAreaAssignments: ${csaa.length}`)

  // Customer Company Assignments
  const cca = await readJsonl('customer_company_assignments')
  await prisma.customerCompanyAssignment.deleteMany()
  for (const r of cca) {
    await prisma.customerCompanyAssignment.create({
      data: {
        customer: r.customer || null,
        companyCode: r.companyCode || null,
        paymentTerms: r.paymentTerms || null,
        accountGroup: r.customerAccountGroup || null,
      }
    })
  }
  console.log(`✅ CustomerCompanyAssignments: ${cca.length}`)

  // Sales Order Headers
  const soHeaders = await readJsonl('sales_order_headers')
  await prisma.salesOrderHeader.deleteMany()
  for (const r of soHeaders) {
    await prisma.salesOrderHeader.upsert({
      where: { salesOrder: r.salesOrder },
      update: {},
      create: {
        salesOrder: r.salesOrder,
        salesOrderType: r.salesOrderType || null,
        salesOrganization: r.salesOrganization || null,
        soldToParty: validBPs.has(r.soldToParty) ? r.soldToParty : null,
        creationDate: toDate(r.creationDate),
        totalNetAmount: toDecimal(r.totalNetAmount),
        overallDeliveryStatus: r.overallDeliveryStatus || null,
        overallOrdReltdBillgStatus: r.overallOrdReltdBillgStatus || null,
        transactionCurrency: r.transactionCurrency || null,
        requestedDeliveryDate: toDate(r.requestedDeliveryDate),
        headerBillingBlockReason: r.headerBillingBlockReason || null,
        deliveryBlockReason: r.deliveryBlockReason || null,
        customerPaymentTerms: r.customerPaymentTerms || null,
      }
    })
  }
  console.log(`✅ SalesOrderHeaders: ${soHeaders.length}`)

  // Sales Order Items
  const soItems = await readJsonl('sales_order_items')
  await prisma.salesOrderItem.deleteMany()
  const validSOs = new Set(soHeaders.map((s: any) => s.salesOrder))
  for (const r of soItems) {
    if (!validSOs.has(r.salesOrder)) continue
    await prisma.salesOrderItem.upsert({
      where: { salesOrder_salesOrderItem: { salesOrder: r.salesOrder, salesOrderItem: r.salesOrderItem } },
      update: {},
      create: {
        salesOrder: r.salesOrder,
        salesOrderItem: r.salesOrderItem,
        material: r.material || null,
        requestedQuantity: toDecimal(r.requestedQuantity),
        requestedQuantityUnit: r.requestedQuantityUnit || null,
        netAmount: toDecimal(r.netAmount),
        transactionCurrency: r.transactionCurrency || null,
        materialGroup: r.materialGroup || null,
        productionPlant: r.productionPlant || null,
        storageLocation: r.storageLocation || null,
        salesDocumentRjcnReason: r.salesDocumentRjcnReason || null,
        itemBillingBlockReason: r.itemBillingBlockReason || null,
      }
    })
  }
  console.log(`✅ SalesOrderItems: ${soItems.length}`)

  // Sales Order Schedule Lines
  const sosl = await readJsonl('sales_order_schedule_lines')
  await prisma.salesOrderScheduleLine.deleteMany()
  for (const r of sosl) {
    await prisma.salesOrderScheduleLine.create({
      data: {
        salesOrder: r.salesOrder,
        salesOrderItem: r.salesOrderItem,
        scheduleLine: r.scheduleLine || null,
        requestedDeliveryDate: toDate(r.requestedDeliveryDate),
        scheduledQuantity: toDecimal(r.scheduledQuantity),
        confirmedDeliveryDate: toDate(r.confirmedDeliveryDate),
        confirmedQuantity: toDecimal(r.confirmedQuantity),
      }
    })
  }
  console.log(`✅ SalesOrderScheduleLines: ${sosl.length}`)

  // Outbound Delivery Headers
  const odHeaders = await readJsonl('outbound_delivery_headers')
  await prisma.outboundDeliveryHeader.deleteMany()
  for (const r of odHeaders) {
    await prisma.outboundDeliveryHeader.upsert({
      where: { deliveryDocument: r.deliveryDocument },
      update: {},
      create: {
        deliveryDocument: r.deliveryDocument,
        creationDate: toDate(r.creationDate),
        shippingPoint: r.shippingPoint || null,
        deliveryBlockReason: r.deliveryBlockReason || null,
        headerBillingBlockReason: r.headerBillingBlockReason || null,
        overallGoodsMovementStatus: r.overallGoodsMovementStatus || null,
        overallPickingStatus: r.overallPickingStatus || null,
        actualGoodsMovementDate: toDate(r.actualGoodsMovementDate),
        hdrGeneralIncompletionStatus: r.hdrGeneralIncompletionStatus || null,
      }
    })
  }
  console.log(`✅ OutboundDeliveryHeaders: ${odHeaders.length}`)

  // Outbound Delivery Items
  const odItems = await readJsonl('outbound_delivery_items')
  await prisma.outboundDeliveryItem.deleteMany()
  const validDeliveries = new Set(odHeaders.map((d: any) => d.deliveryDocument))
  for (const r of odItems) {
    if (!validDeliveries.has(r.deliveryDocument)) continue
    await prisma.outboundDeliveryItem.upsert({
      where: { deliveryDocument_deliveryDocumentItem: { deliveryDocument: r.deliveryDocument, deliveryDocumentItem: r.deliveryDocumentItem } },
      update: {},
      create: {
        deliveryDocument: r.deliveryDocument,
        deliveryDocumentItem: r.deliveryDocumentItem,
        referenceSdDocument: r.referenceSdDocument || null,
        referenceSdDocumentItem: r.referenceSdDocumentItem || null,
        actualDeliveryQuantity: toDecimal(r.actualDeliveryQuantity),
        deliveryQuantityUnit: r.deliveryQuantityUnit || null,
        plant: r.plant || null,
        storageLocation: r.storageLocation || null,
        itemBillingBlockReason: r.itemBillingBlockReason || null,
      }
    })
  }
  console.log(`✅ OutboundDeliveryItems: ${odItems.length}`)

  // Billing Document Headers (active + cancelled combined)
  const bdHeaders = await readJsonl('billing_document_headers')
  const bdCancelled = await readJsonl('billing_document_cancellations')
  const allBilling = [...bdHeaders, ...bdCancelled]
  await prisma.billingDocumentHeader.deleteMany()
  for (const r of allBilling) {
    await prisma.billingDocumentHeader.upsert({
      where: { billingDocument: r.billingDocument },
      update: {},
      create: {
        billingDocument: r.billingDocument,
        billingDocumentType: r.billingDocumentType || null,
        creationDate: toDate(r.creationDate),
        billingDocumentDate: toDate(r.billingDocumentDate),
        billingDocumentIsCancelled: r.billingDocumentIsCancelled ?? false,
        cancelledBillingDocument: r.cancelledBillingDocument || null,
        totalNetAmount: toDecimal(r.totalNetAmount),
        transactionCurrency: r.transactionCurrency || null,
        companyCode: r.companyCode || null,
        fiscalYear: r.fiscalYear || null,
        accountingDocument: r.accountingDocument || null,
        soldToParty: validBPs.has(r.soldToParty) ? r.soldToParty : null,
      }
    })
  }
  console.log(`✅ BillingDocumentHeaders: ${allBilling.length}`)

  // Billing Document Items
  const bdItems = await readJsonl('billing_document_items')
  await prisma.billingDocumentItem.deleteMany()
  const validBDs = new Set(allBilling.map((b: any) => b.billingDocument))
  for (const r of bdItems) {
    if (!validBDs.has(r.billingDocument)) continue
    await prisma.billingDocumentItem.upsert({
      where: { billingDocument_billingDocumentItem: { billingDocument: r.billingDocument, billingDocumentItem: r.billingDocumentItem } },
      update: {},
      create: {
        billingDocument: r.billingDocument,
        billingDocumentItem: r.billingDocumentItem,
        material: r.material || null,
        billingQuantity: toDecimal(r.billingQuantity),
        billingQuantityUnit: r.billingQuantityUnit || null,
        netAmount: toDecimal(r.netAmount),
        transactionCurrency: r.transactionCurrency || null,
        referenceSdDocument: r.referenceSdDocument || null,
        referenceSdDocumentItem: r.referenceSdDocumentItem || null,
      }
    })
  }
  console.log(`✅ BillingDocumentItems: ${bdItems.length}`)

  // Payments
  const payments = await readJsonl('payments_accounts_receivable')
  await prisma.paymentAccountsReceivable.deleteMany()
  for (const r of payments) {
    await prisma.paymentAccountsReceivable.create({
      data: {
        companyCode: r.companyCode || null,
        fiscalYear: r.fiscalYear || null,
        accountingDocument: r.accountingDocument || null,
        accountingDocumentItem: r.accountingDocumentItem || null,
        clearingDate: toDate(r.clearingDate),
        clearingAccountingDocument: r.clearingAccountingDocument || null,
        amountInTransactionCurrency: toDecimal(r.amountInTransactionCurrency),
        transactionCurrency: r.transactionCurrency || null,
        customer: validBPs.has(r.customer) ? r.customer : null,
        invoiceReference: r.invoiceReference || null,
        salesDocument: r.salesDocument || null,
        postingDate: toDate(r.postingDate),
        glAccount: r.glAccount || null,
        profitCenter: r.profitCenter || null,
      }
    })
  }
  console.log(`✅ Payments: ${payments.length}`)

  // Journal Entries
  const journals = await readJsonl('journal_entry_items_accounts_receivable')
  await prisma.journalEntryItem.deleteMany()
  for (const r of journals) {
    await prisma.journalEntryItem.create({
      data: {
        companyCode: r.companyCode || null,
        fiscalYear: r.fiscalYear || null,
        accountingDocument: r.accountingDocument || null,
        accountingDocumentItem: r.accountingDocumentItem || null,
        glAccount: r.glAccount || null,
        referenceDocument: validBDs.has(r.referenceDocument) ? r.referenceDocument : null,
        profitCenter: r.profitCenter || null,
        amountInTransactionCurrency: toDecimal(r.amountInTransactionCurrency),
        transactionCurrency: r.transactionCurrency || null,
        postingDate: toDate(r.postingDate),
        accountingDocumentType: r.accountingDocumentType || null,
        customer: validBPs.has(r.customer) ? r.customer : null,
        clearingDate: toDate(r.clearingDate),
        clearingAccountingDocument: r.clearingAccountingDocument || null,
      }
    })
  }
  console.log(`✅ JournalEntries: ${journals.length}`)

  console.log('\n🎉 Seeding complete!')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
