import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { CustomerPortal } from '@/components/customer-portal'
export const dynamic='force-dynamic'
export default async function BusinessPage({params}:{params:{section?:string[]}}){const session=await getServerSession(authOptions);if(session?.user?.role!=='BUSINESS_CUSTOMER')redirect('/dashboard');const parts=params?.section ?? [];return <CustomerPortal base="/business" section={parts?.[0] ?? 'dashboard'} itemId={parts?.[1]} business/>}
