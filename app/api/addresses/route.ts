import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET: list current user's addresses
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as { id?: string })?.id;
    if (!userId) return NextResponse.json({ error: 'User not found' }, { status: 400 });

    const addresses = await prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    return NextResponse.json(addresses);
  } catch (error) {
    console.error('Error fetching addresses:', error);
    return NextResponse.json({ error: 'Failed to fetch addresses' }, { status: 500 });
  }
}

// POST: create new address
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as { id?: string })?.id;
    if (!userId) return NextResponse.json({ error: 'User not found' }, { status: 400 });

    const data = await request.json();
    const { label, firstName, lastName, phone, address, city, postalCode, isDefault } = data;
    if (!firstName || !lastName || !phone || !address || !city) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // If this is set default, unset others
    if (isDefault) {
      await prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
    }
    // If user has no addresses yet, force default
    const count = await prisma.address.count({ where: { userId } });

    const created = await prisma.address.create({
      data: {
        userId,
        label: label || null,
        firstName,
        lastName,
        phone,
        address,
        city,
        postalCode: postalCode || null,
        isDefault: isDefault || count === 0,
      },
    });
    return NextResponse.json(created);
  } catch (error) {
    console.error('Error creating address:', error);
    return NextResponse.json({ error: 'Failed to create address' }, { status: 500 });
  }
}
