import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { AdminPortal } from '@/components/admin-portal'
export const dynamic='force-dynamic'
export default async function AdminPage({params}:{params:{section?:string[]}}){const session=await getServerSession(authOptions);if(session?.user?.role!=='ADMINISTRATOR')redirect('/dashboard');const parts=params?.section ?? [];return <AdminPortal section={parts?.[0] ?? 'overview'} itemId={parts?.[1]}/>} 
