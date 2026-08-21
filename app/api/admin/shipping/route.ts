import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';
import { getShippingConfig } from '@/lib/shipping';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { authorized, error } = await requireAdmin();
  if (!authorized) return NextResponse.json({ error }, { status: 401 });
  const config = await getShippingConfig();
  return NextResponse.json(config);
}

export async function PATCH(req: NextRequest) {
  const { authorized, error } = await requireAdmin();
  if (!authorized) return NextResponse.json({ error }, { status: 401 });

  try {
    const body = await req.json();
    const data: Record<string, number | boolean | string | null> = {};

    const numericKeys = ['freeShippingThreshold', 'tiranaRate', 'standardRate', 'internationalRate'] as const;
    for (const key of numericKeys) {
      if (body[key] !== undefined) {
        const val = Number(body[key]);
        if (isNaN(val) || val < 0) {
          return NextResponse.json({ error: `Invalid value for ${key}` }, { status: 400 });
        }
        data[key] = val;
      }
    }

    const boolKeys = ['freeShippingEnabled', 'tiranaEnabled', 'albaniaEnabled', 'internationalEnabled'] as const;
    for (const key of boolKeys) {
      if (body[key] !== undefined) data[key] = Boolean(body[key]);
    }

    const textKeys = ['tiranaDeliveryText', 'albaniaDeliveryText', 'internationalDeliveryText'] as const;
    for (const key of textKeys) {
      if (body[key] !== undefined) {
        const v = String(body[key] ?? '').trim();
        data[key] = v === '' ? null : v;
      }
    }

    await prisma.shippingSetting.upsert({
      where: { id: 'singleton' },
      update: data,
      create: { id: 'singleton', ...data },
    });

    const config = await getShippingConfig();
    return NextResponse.json(config);
  } catch (e) {
    console.error('Error updating shipping settings:', e);
    return NextResponse.json({ error: 'Failed to update shipping settings' }, { status: 500 });
  }
}
