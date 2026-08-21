import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!(session as any)?.user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    const { html_content, pdf_options } = await request.json()
    if (!html_content) return NextResponse.json({ success: false, error: 'Missing html_content' }, { status: 400 })
    const createResponse = await fetch('https://apps.abacus.ai/api/createConvertHtmlToPdfRequest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deployment_token: process.env.ABACUSAI_API_KEY,
        html_content,
        pdf_options: pdf_options || { format: 'A4', print_background: true, margin: { top: '14mm', right: '12mm', bottom: '14mm', left: '12mm' } },
      }),
    })
    if (!createResponse.ok) {
      const error = await createResponse.json().catch(() => ({ error: 'Failed to create PDF request' }))
      return NextResponse.json({ success: false, error: error.error }, { status: 500 })
    }
    const { request_id } = await createResponse.json()
    if (!request_id) return NextResponse.json({ success: false, error: 'No request ID returned' }, { status: 500 })
    return NextResponse.json({ success: true, request_id })
  } catch (error) {
    console.error('Error creating PDF request:', error)
    return NextResponse.json({ success: false, error: 'Failed to create PDF request' }, { status: 500 })
  }
}
