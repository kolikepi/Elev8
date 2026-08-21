import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    CredentialsProvider({
      name: 'Email and password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim?.()?.toLowerCase?.() ?? ''
        const password = credentials?.password ?? ''
        if (!email || !password) return null
        const user = await prisma.user.findUnique({ where: { email } })
        if (!user?.isActive) return null
        const valid = await bcrypt.compare(password, user?.passwordHash ?? '')
        if (!valid) return null
        return { id: user?.id ?? '', email: user?.email ?? '', name: user?.name ?? '', role: user?.role ?? 'CUSTOMER' }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user?.id ?? ''
        token.role = user?.role ?? 'CUSTOMER'
      }
      return token ?? {}
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = String(token?.id ?? '')
        session.user.role = String(token?.role ?? 'CUSTOMER') as 'CUSTOMER' | 'BUSINESS_CUSTOMER' | 'ADMINISTRATOR'
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}

export function dashboardForRole(role?: string | null): string {
  if (role === 'ADMINISTRATOR') return '/admin'
  if (role === 'BUSINESS_CUSTOMER') return '/business'
  return '/customer'
}
