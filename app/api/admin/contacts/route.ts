import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';

export async function GET() {
  try {
    const { authorized, error } = await requireAdmin();
    if (!authorized) {
      return NextResponse.json({ error }, { status: 401 });
    }

    const contacts = await prisma.contactSubmission.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(contacts);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { authorized, error } = await requireAdmin();
    if (!authorized) {
      return NextResponse.json({ error }, { status: 401 });
    }

    const { id, status } = await request.json();

    const contact = await prisma.contactSubmission.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json(contact);
  } catch (error) {
    console.error('Error updating contact:', error);
    return NextResponse.json({ error: 'Failed to update contact' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { authorized, error } = await requireAdmin();
    if (!authorized) {
      return NextResponse.json({ error }, { status: 401 });
    }

    const { id } = await request.json();

    await prisma.contactSubmission.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting contact:', error);
    return NextResponse.json({ error: 'Failed to delete contact' }, { status: 500 });
  }
}
