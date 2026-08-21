import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { generatePresignedUploadUrl } from '@/lib/s3'

export const dynamic = 'force-dynamic'
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  try {
    const body = await request?.json?.().catch?.(() => ({})) ?? {}
    const fileName = String(body?.fileName ?? '')
    const contentType = String(body?.contentType ?? 'application/octet-stream')
    if (!fileName) return NextResponse.json({ error: 'File name is required.' }, { status: 400 })
    const result = await generatePresignedUploadUrl(fileName, contentType, false)
    return NextResponse.json(result)
  } catch (error: unknown) { console.error(error); return NextResponse.json({ error: 'Unable to prepare upload.' }, { status: 500 }) }
}
