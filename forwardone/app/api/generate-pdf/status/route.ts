import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!(session as any)?.user) return NextResponse.json({ status: 'FAILED', error: 'Unauthorized' }, { status: 401 })
    const { request_id } = await request.json()
    const statusResponse = await fetch('https://apps.abacus.ai/api/getConvertHtmlToPdfStatus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_id, deployment_token: process.env.ABACUSAI_API_KEY }),
    })
    const statusResult = await statusResponse.json()
    const status = statusResult?.status || 'FAILED'
    const result = statusResult?.result || null
    if (status === 'SUCCESS') {
      if (result && result.result) return NextResponse.json({ status, pdf_base64: result.result })
      return NextResponse.json({ status: 'FAILED', error: 'PDF generation completed but no result data' })
    }
    if (status === 'FAILED') return NextResponse.json({ status, error: result?.error || 'PDF generation failed' })
    return NextResponse.json({ status })
  } catch (error) {
    console.error('Error checking PDF status:', error)
    return NextResponse.json({ status: 'FAILED', error: 'Failed to check PDF status' }, { status: 500 })
  }
}
