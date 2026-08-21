import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Admin: update a design (toggle active / rename / category)
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const { authorized, error } = await requireAdmin();
  if (!authorized) return NextResponse.json({ error }, { status: 401 });

  try {
    const body = await request.json();
    const data: Record<string, unknown> = {};
    if (typeof body.active === 'boolean') data.active = body.active;
    if (typeof body.name === 'string') data.name = body.name.trim();
    if (typeof body.category === 'string') data.category = body.category.trim();
    if (typeof body.sortOrder === 'number') data.sortOrder = body.sortOrder;

    const design = await prisma.dtfDesign.update({
      where: { id: params.id },
      data,
    });
    return NextResponse.json(design);
  } catch (err) {
    console.error('Error updating DTF design:', err);
    return NextResponse.json({ error: 'Failed to update design' }, { status: 500 });
  }
}

// Admin: delete a design
export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const { authorized, error } = await requireAdmin();
  if (!authorized) return NextResponse.json({ error }, { status: 401 });

  try {
    await prisma.dtfDesign.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error deleting DTF design:', err);
    return NextResponse.json({ error: 'Failed to delete design' }, { status: 500 });
  }
}
