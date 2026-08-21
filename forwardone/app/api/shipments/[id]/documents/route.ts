import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { serializeData } from '@/lib/serialize'
import { audit, str, strOrNull, intOrNull, bool, enumOr } from '@/lib/admin-api'
import { DOCUMENT_CATEGORIES } from '@/lib/documents'

export const dynamic = 'force-dynamic'

// GET — list documents for a shipment.
//   Admin: sees every document.
//   Customer: must own the shipment AND only sees documents flagged isCustomerVisible. Internal storage
//   paths are never returned; downloads go through the per-document route which re-checks ownership.
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  try {
    const shipmentId = str(params?.id)
    const shipment = await prisma.shipment.findUnique({ where: { id: shipmentId }, select: { id: true, userId: true } })
    if (!shipment) return NextResponse.json({ error: 'Shipment not found.' }, { status: 404 })
    const isAdmin = session?.user?.role === 'ADMINISTRATOR'
    if (!isAdmin && shipment?.userId !== session?.user?.id) return NextResponse.json({ error: 'Shipment not found.' }, { status: 404 })

    const where: any = { shipmentId }
    if (!isAdmin) where.isCustomerVisible = true
    const docs = await prisma.shipmentDocument.findMany({ where, orderBy: { createdAt: 'desc' } })
    const projected = docs.map((d) => ({
      id: d.id,
      category: d.category,
      fileName: d.fileName,
      contentType: d.contentType,
      sizeBytes: d.sizeBytes,
      isCustomerVisible: d.isCustomerVisible,
      createdAt: d.createdAt,
    }))
    return NextResponse.json({ documents: serializeData(projected) })
  } catch (error: unknown) {
    console.error(error)
    return NextResponse.json({ error: 'Unable to load documents.' }, { status: 500 })
  }
}

// POST — admin only. Persists a document record after the client has uploaded the file via the shared
// /api/upload/presigned flow. Body: { category, fileName, cloudStoragePath, contentType, sizeBytes?,
// isCustomerVisible? }.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session?.user?.role !== 'ADMINISTRATOR') return NextResponse.json({ error: 'Administrator access required.' }, { status: 401 })
  try {
    const shipmentId = str(params?.id)
    const shipment = await prisma.shipment.findUnique({ where: { id: shipmentId }, select: { id: true } })
    if (!shipment) return NextResponse.json({ error: 'Shipment not found.' }, { status: 404 })
    const body = (await request?.json?.().catch?.(() => ({}))) ?? {}
    const cloudStoragePath = str(body?.cloudStoragePath)
    const fileName = str(body?.fileName)
    if (!cloudStoragePath || !fileName) return NextResponse.json({ error: 'File name and upload path are required.' }, { status: 400 })
    const doc = await prisma.shipmentDocument.create({
      data: {
        shipmentId,
        category: enumOr(body?.category, DOCUMENT_CATEGORIES as unknown as string[], 'OTHER'),
        fileName,
        cloudStoragePath,
        contentType: strOrNull(body?.contentType) ?? 'application/octet-stream',
        sizeBytes: intOrNull(body?.sizeBytes),
        isCustomerVisible: bool(body?.isCustomerVisible),
        uploadedById: session?.user?.id ?? null,
      },
    })
    await audit('ShipmentDocument', doc.id, 'document-uploaded', session?.user?.id, { shipmentId, category: doc.category })
    return NextResponse.json({ document: serializeData({ id: doc.id, category: doc.category, fileName: doc.fileName, contentType: doc.contentType, sizeBytes: doc.sizeBytes, isCustomerVisible: doc.isCustomerVisible, createdAt: doc.createdAt }) }, { status: 201 })
  } catch (error: unknown) {
    console.error(error)
    return NextResponse.json({ error: 'Unable to save document.' }, { status: 500 })
  }
}
