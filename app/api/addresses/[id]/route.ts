import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// PATCH: update an address (must belong to user)
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as { id?: string })?.id;
    if (!userId) return NextResponse.json({ error: 'User not found' }, { status: 400 });

    const existing = await prisma.address.findUnique({ where: { id: params.id } });
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }

    const data = await request.json();
    const { label, firstName, lastName, phone, address, city, postalCode, isDefault } = data;

    if (isDefault) {
      await prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
    }

    const updated = await prisma.address.update({
      where: { id: params.id },
      data: {
        ...(label !== undefined ? { label: label || null } : {}),
        ...(firstName !== undefined ? { firstName } : {}),
        ...(lastName !== undefined ? { lastName } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(address !== undefined ? { address } : {}),
        ...(city !== undefined ? { city } : {}),
        ...(postalCode !== undefined ? { postalCode: postalCode || null } : {}),
        ...(isDefault !== undefined ? { isDefault } : {}),
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating address:', error);
    return NextResponse.json({ error: 'Failed to update address' }, { status: 500 });
  }
}

// DELETE: remove an address (must belong to user)
export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as { id?: string })?.id;
    if (!userId) return NextResponse.json({ error: 'User not found' }, { status: 400 });

    const existing = await prisma.address.findUnique({ where: { id: params.id } });
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }

    await prisma.address.delete({ where: { id: params.id } });

    // If we deleted the default, promote the most recent remaining address
    if (existing.isDefault) {
      const next = await prisma.address.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } });
      if (next) {
        await prisma.address.update({ where: { id: next.id }, data: { isDefault: true } });
      }
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting address:', error);
    return NextResponse.json({ error: 'Failed to delete address' }, { status: 500 });
  }
}
