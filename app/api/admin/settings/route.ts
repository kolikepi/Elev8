import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';
import { getSiteSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { authorized, error } = await requireAdmin();
  if (!authorized) return NextResponse.json({ error }, { status: 401 });
  const settings = await getSiteSettings();
  return NextResponse.json(settings);
}

export async function PATCH(req: NextRequest) {
  const { authorized, error } = await requireAdmin();
  if (!authorized) return NextResponse.json({ error }, { status: 401 });

  try {
    const body = await req.json();
    const data: Record<string, string | boolean | number | null> = {};

    const stringKeys = [
      'businessName', 'publicEmail', 'adminEmail', 'phone', 'whatsapp', 'addressLine',
      'country', 'currency', 'instagram', 'tiktok', 'websiteUrl', 'returnConditions',
      'returnShippingPaidBy', 'nonReturnableItems', 'returnProcedure', 'bankName',
      'bankAccountHolder', 'bankIban', 'bankSwift', 'bankInstructions',
    ] as const;
    for (const key of stringKeys) {
      if (body[key] !== undefined) {
        const v = String(body[key] ?? '').trim();
        // businessName and currency must never be empty
        if ((key === 'businessName' || key === 'currency') && v === '') continue;
        data[key] = v === '' ? null : v;
      }
    }

    const boolKeys = [
      'exchangeAllowed', 'codEnabled', 'bankTransferEnabled', 'cardPaymentsEnabled',
      'orderStatusEmailsEnabled',
    ] as const;
    for (const key of boolKeys) {
      if (body[key] !== undefined) data[key] = Boolean(body[key]);
    }

    if (body.returnWindowDays !== undefined) {
      const raw = body.returnWindowDays;
      if (raw === '' || raw === null) {
        data.returnWindowDays = null;
      } else {
        const n = Number(raw);
        if (isNaN(n) || n < 0) {
          return NextResponse.json({ error: 'Invalid return window' }, { status: 400 });
        }
        data.returnWindowDays = Math.round(n);
      }
    }

    await prisma.siteSetting.upsert({
      where: { id: 'singleton' },
      update: data,
      create: { id: 'singleton', ...data },
    });

    const settings = await getSiteSettings();
    return NextResponse.json(settings);
  } catch (e) {
    console.error('Error updating site settings:', e);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
