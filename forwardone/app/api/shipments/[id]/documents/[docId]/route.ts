import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getFileUrl, deleteFile } from '@/lib/s3'
import { audit, str, bool } from '@/lib/admin-api'

export const dynamic = 'force-dynamic'

async function loadDoc(shipmentId: string, docId: string) {
  const doc = await prisma.shipmentDocument.findUnique({ where: { id: docId }, include: { shipment: { select: { userId: true } } } })
  if (!doc || doc.shipmentId !== shipmentId) return null
  return doc
}

// GET — returns a short-lived signed download URL for a single document.
//   Admin: any document. Customer: must own the shipment AND the document must be isCustomerVisible.
export async function GET(_request: Request, { params }: { params: { id: string; docId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  try {
    const doc = await loadDoc(str(params?.id), str(params?.docId))
    if (!doc) return NextResponse.json({ error: 'Document not found.' }, { status: 404 })
    const isAdmin = session?.user?.role === 'ADMINISTRATOR'
    if (!isAdmin && (doc.shipment?.userId !== session?.user?.id || !doc.isCustomerVisible)) return NextResponse.json({ error: 'Document not found.' }, { status: 404 })
    const url = await getFileUrl(doc.cloudStoragePath, doc.contentType ?? 'application/octet-stream', false)
    return NextResponse.json({ url, fileName: doc.fileName })
  } catch (error: unknown) {
    console.error(error)
    return NextResponse.json({ error: 'Unable to access document.' }, { status: 500 })
  }
}

// PATCH — admin only. Toggle customer visibility.
export async function PATCH(request: Request, { params }: { params: { id: string; docId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session?.user?.role !== 'ADMINISTRATOR') return NextResponse.json({ error: 'Administrator access required.' }, { status: 401 })
  try {
    const doc = await loadDoc(str(params?.id), str(params?.docId))
    if (!doc) return NextResponse.json({ error: 'Document not found.' }, { status: 404 })
    const body = (await request?.json?.().catch?.(() => ({}))) ?? {}
    const updated = await prisma.shipmentDocument.update({ where: { id: doc.id }, data: { isCustomerVisible: bool(body?.isCustomerVisible) } })
    await audit('ShipmentDocument', doc.id, 'document-visibility-updated', session?.user?.id, { isCustomerVisible: updated.isCustomerVisible })
    return NextResponse.json({ ok: true, isCustomerVisible: updated.isCustomerVisible })
  } catch (error: unknown) {
    console.error(error)
    return NextResponse.json({ error: 'Unable to update document.' }, { status: 500 })
  }
}

// DELETE — admin only. Removes the DB record and best-effort deletes the stored object.
export async function DELETE(_request: Request, { params }: { params: { id: string; docId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session?.user?.role !== 'ADMINISTRATOR') return NextResponse.json({ error: 'Administrator access required.' }, { status: 401 })
  try {
    const doc = await loadDoc(str(params?.id), str(params?.docId))
    if (!doc) return NextResponse.json({ error: 'Document not found.' }, { status: 404 })
    await prisma.shipmentDocument.delete({ where: { id: doc.id } })
    try { await deleteFile(doc.cloudStoragePath) } catch (e) { console.error('deleteFile failed', e) }
    await audit('ShipmentDocument', doc.id, 'document-deleted', session?.user?.id, { shipmentId: doc.shipmentId })
    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    console.error(error)
    return NextResponse.json({ error: 'Unable to delete document.' }, { status: 500 })
  }
}
