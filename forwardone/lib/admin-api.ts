import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function guardAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session?.user?.role !== 'ADMINISTRATOR') return null
  return session
}

export async function audit(entityType: string, entityId: string, action: string, actorId?: string | null, details?: any) {
  try { await prisma.auditLog.create({ data: { entityType, entityId, action, actorId: actorId ?? null, detailsJson: details ?? undefined } }) }
  catch (error: unknown) { console.error('audit', error) }
}

export const str = (v: unknown): string => String(v ?? '').trim()
export const strOrNull = (v: unknown): string | null => { const s = String(v ?? '').trim(); return s ? s : null }
export const int = (v: unknown): number => Math.trunc(Number(v ?? 0) || 0)
export const intOrNull = (v: unknown): number | null => { if (v === null || v === undefined || v === '') return null; const n = Math.trunc(Number(v) || 0); return n }
export const dec = (v: unknown): number => Number(v ?? 0) || 0
export const decOrNull = (v: unknown): number | null => { if (v === null || v === undefined || v === '') return null; return Number(v) || 0 }
export const bool = (v: unknown): boolean => v === true || v === 'true' || v === 1 || v === '1'
export const dateOrNull = (v: unknown): Date | null => { if (v === null || v === undefined || v === '') return null; const d = new Date(String(v)); return Number.isNaN(d.getTime()) ? null : d }
export const enumOrNull = (v: unknown, allowed: string[]): string | null => { const s = String(v ?? '').trim(); return allowed.includes(s) ? s : null }
export const enumOr = (v: unknown, allowed: string[], fallback: string): string => { const s = String(v ?? '').trim(); return allowed.includes(s) ? s : fallback }

export const CATEGORY = ['EXPRESS', 'ROAD_FREIGHT', 'AIR_FREIGHT', 'SEA_FREIGHT']
export const DIRECTION = ['IMPORT', 'EXPORT']
export const BASIS = ['FIXED', 'PERCENTAGE', 'PER_KG', 'PER_CHARGEABLE_KG', 'PER_PIECE', 'PER_SHIPMENT', 'PER_PALLET']
export const DIM_UNIT = ['CM', 'IN', 'M']
export const WT_UNIT = ['KG', 'LB']
export const TARIFF_STATUS = ['DRAFT', 'VALIDATED', 'ACTIVE', 'INACTIVE', 'ARCHIVED']
