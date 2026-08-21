import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getFileUrl } from '@/lib/s3'

export const dynamic='force-dynamic'
export async function GET(_request:Request,context:{params:{id:string}}){const session=await getServerSession(authOptions);if(!session?.user?.id)return NextResponse.json({error:'Unauthorized.'},{status:401});try{const file=await prisma.quoteFile.findUnique({where:{id:context?.params?.id ?? ''},include:{quote:{select:{userId:true,reference:true}}}});if(!file||(session?.user?.role!=='ADMINISTRATOR'&&file?.quote?.userId!==session?.user?.id))return NextResponse.json({error:'File not found.'},{status:404});const url=await getFileUrl(file?.cloudStoragePath ?? '',file?.contentType ?? 'application/octet-stream',file?.isPublic ?? false);return NextResponse.json({file:{id:file?.id ?? '',fileType:file?.fileType ?? '',fileName:file?.fileName ?? '',contentType:file?.contentType ?? '',cloud_storage_path:file?.cloudStoragePath ?? '',reference:file?.quote?.reference ?? '',url}})}catch(error:unknown){console.error(error);return NextResponse.json({error:'Unable to access file.'},{status:500})}}
