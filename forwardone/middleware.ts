import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(request) {
    const role = request?.nextauth?.token?.role ?? ''
    const path = request?.nextUrl?.pathname ?? '/'
    if (path.startsWith('/admin') && role !== 'ADMINISTRATOR') return NextResponse.redirect(new URL('/dashboard', request?.url ?? ''))
    if (path.startsWith('/business') && role !== 'BUSINESS_CUSTOMER') return NextResponse.redirect(new URL('/dashboard', request?.url ?? ''))
    if (path.startsWith('/customer') && role !== 'CUSTOMER') return NextResponse.redirect(new URL('/dashboard', request?.url ?? ''))
    return NextResponse.next()
  },
  { callbacks: { authorized: ({ token }) => Boolean(token) } },
)

export const config = { matcher: ['/dashboard/:path*', '/customer/:path*', '/business/:path*', '/admin/:path*', '/account/:path*'] }
