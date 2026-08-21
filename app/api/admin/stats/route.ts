import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';

export async function GET() {
  try {
    const { authorized, error } = await requireAdmin();
    if (!authorized) {
      return NextResponse.json({ error }, { status: 401 });
    }

    const [productsCount, contactsCount, subscribersCount, usersCount, ordersCount, pendingOrders, totalRevenue] = await Promise.all([
      prisma.product.count(),
      prisma.contactSubmission.count(),
      prisma.newsletterSignup.count(),
      prisma.user.count(),
      prisma.order.count(),
      prisma.order.count({ where: { status: 'pending' } }),
      prisma.order.aggregate({ _sum: { total: true } }),
    ]);

    const newContacts = await prisma.contactSubmission.count({
      where: { status: 'new' },
    });

    return NextResponse.json({
      products: productsCount,
      contacts: contactsCount,
      subscribers: subscribersCount,
      users: usersCount,
      newContacts,
      orders: ordersCount,
      pendingOrders,
      revenue: totalRevenue._sum.total || 0,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
