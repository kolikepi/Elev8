import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions, dashboardForRole } from '@/lib/auth'
export const dynamic = 'force-dynamic'
export default async function DashboardRedirect(){const session=await getServerSession(authOptions);if(!session?.user?.id)redirect('/login');redirect(dashboardForRole(session?.user?.role))}
