import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { prisma } from './db';

export async function isAdmin(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return false;
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { role: true },
  });

  return user?.role === 'admin';
}

export async function requireAdmin(): Promise<{ authorized: boolean; error?: string }> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return { authorized: false, error: 'Not authenticated' };
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { role: true },
  });

  if (user?.role !== 'admin') {
    return { authorized: false, error: 'Not authorized. Admin access required.' };
  }

  return { authorized: true };
}
