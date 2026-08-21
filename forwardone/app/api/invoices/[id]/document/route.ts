import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { str } from '@/lib/admin-api'
import { buildInvoiceViewData } from '@/lib/invoice-view'
import { buildInvoiceHtml } from '@/lib/invoice-html'

export const dynamic = 'force-dynamic'

// GET — returns the printable invoice as a standalone HTML document plus a suggested file name.
// Permission is enforced inside buildInvoiceViewData: admin sees any invoice; a customer sees only their
// own FINALIZED invoice. The same HTML powers the browser preview, the Print dialog and the PDF download,
// guaranteeing a single consistent layout across all outputs.
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  try {
    const data = await buildInvoiceViewData(str(params?.id), session as any)
    if (!data) return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 })
    const html = buildInvoiceHtml(data)
    return NextResponse.json({ html, fileName: data.fileName })
  } catch (error: unknown) {
    console.error(error)
    return NextResponse.json({ error: 'Unable to load invoice document.' }, { status: 500 })
  }
}
