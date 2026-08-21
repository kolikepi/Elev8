import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface User {
    role: 'CUSTOMER' | 'BUSINESS_CUSTOMER' | 'ADMINISTRATOR' | 'GUEST'
  }
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role: 'CUSTOMER' | 'BUSINESS_CUSTOMER' | 'ADMINISTRATOR' | 'GUEST'
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: 'CUSTOMER' | 'BUSINESS_CUSTOMER' | 'ADMINISTRATOR' | 'GUEST'
  }
}
