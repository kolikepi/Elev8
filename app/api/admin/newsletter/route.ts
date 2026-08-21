import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';

export async function GET() {
  try {
    const { authorized, error } = await requireAdmin();
    if (!authorized) {
      return NextResponse.json({ error }, { status: 401 });
    }

    const subscribers = await prisma.newsletterSignup.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(subscribers);
  } catch (error) {
    console.error('Error fetching subscribers:', error);
    return NextResponse.json({ error: 'Failed to fetch subscribers' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { authorized, error } = await requireAdmin();
    if (!authorized) {
      return NextResponse.json({ error }, { status: 401 });
    }

    const { id } = await request.json();

    await prisma.newsletterSignup.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting subscriber:', error);
    return NextResponse.json({ error: 'Failed to delete subscriber' }, { status: 500 });
  }
}
