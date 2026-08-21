import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { serializeData } from '@/lib/serialize'
import { customerServiceLabel } from '@/lib/customer-service-label'

export const dynamic = 'force-dynamic'

// Returns active carrier services grouped by category + volumetric divisors so the
// quotation form can drive the dynamic, service-first workflow.
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  const isAdmin = (session?.user as any)?.role === 'ADMINISTRATOR'
  try {
    const [services, volumetricRules, restrictions, customerServices] = await Promise.all([
      prisma.carrierService.findMany({ where: { isActive: true }, orderBy: [{ category: 'asc' }, { carrier: 'asc' }, { name: 'asc' }] }),
      prisma.volumetricRule.findMany({ where: { isActive: true }, orderBy: { priority: 'asc' } }),
      prisma.serviceRestriction.findMany({ where: { isActive: true } }),
      prisma.customerService.findMany({ where: { isActive: true }, orderBy: [{ category: 'asc' }, { displayOrder: 'asc' }, { name: 'asc' }] }),
    ])
    // For non-admin users, sanitize carrier brand names from service list.
    const safeServices = isAdmin ? services : (services ?? []).map((s: any) => ({ ...s, carrier: customerServiceLabel(s?.carrier), name: customerServiceLabel(s?.carrier, s?.name) }))
    return NextResponse.json({ services: serializeData(safeServices ?? []), volumetricRules: serializeData(volumetricRules ?? []), restrictions: serializeData(restrictions ?? []), customerServices: serializeData(customerServices ?? []) })
  } catch (error: unknown) { console.error(error); return NextResponse.json({ error: 'Unable to load carrier services.' }, { status: 500 }) }
}
