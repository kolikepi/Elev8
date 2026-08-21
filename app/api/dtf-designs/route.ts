import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Public: list active ELEV8 DTF designs for the mockup editor
export async function GET() {
  try {
    const designs = await prisma.dtfDesign.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      select: { id: true, name: true, imageUrl: true, category: true },
    });
    return NextResponse.json(designs);
  } catch (error) {
    console.error('Error fetching DTF designs:', error);
    return NextResponse.json({ error: 'Failed to fetch designs' }, { status: 500 });
  }
}
