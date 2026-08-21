import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Admin: list all designs (active + inactive)
export async function GET() {
  const { authorized, error } = await requireAdmin();
  if (!authorized) return NextResponse.json({ error }, { status: 401 });

  try {
    const designs = await prisma.dtfDesign.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
    return NextResponse.json(designs);
  } catch (err) {
    console.error('Error listing DTF designs:', err);
    return NextResponse.json({ error: 'Failed to list designs' }, { status: 500 });
  }
}

// Admin: create a new design
export async function POST(request: NextRequest) {
  const { authorized, error } = await requireAdmin();
  if (!authorized) return NextResponse.json({ error }, { status: 401 });

  try {
    const { name, imageUrl, category } = await request.json();
    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 });
    }
    const design = await prisma.dtfDesign.create({
      data: {
        name: (name && String(name).trim()) || 'ELEV8 Design',
        imageUrl,
        category: (category && String(category).trim()) || 'Logo',
      },
    });
    return NextResponse.json(design);
  } catch (err) {
    console.error('Error creating DTF design:', err);
    return NextResponse.json({ error: 'Failed to create design' }, { status: 500 });
  }
}
