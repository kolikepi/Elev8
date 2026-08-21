import { prisma } from '@/lib/prisma'

// A single dedicated "guest pool" user owns every public/guest quote request. This keeps the required
// Quote.userId FK satisfied and every existing userId-scoped query working, WITHOUT creating a real
// customer record per guest (no duplicate customers). The user has role GUEST so it is naturally
// excluded from the admin Customer Master list (which filters to CUSTOMER/BUSINESS_CUSTOMER) and is
// marked inactive so it can never log in. Original guest contact details always live on the Quote row
// itself (guestName/guestCompany/guestPhone/guestEmail), preserving audit history even after an admin
// re-links a quote to a real customer.
const GUEST_POOL_EMAIL = 'guest-pool@forwardone.internal'

export async function getGuestPoolUserId(): Promise<string> {
  const existing = await prisma.user.findUnique({ where: { email: GUEST_POOL_EMAIL }, select: { id: true } })
  if (existing) return existing.id
  // bcrypt hash of a random, unusable password — this account can never be logged into.
  const created = await prisma.user.upsert({
    where: { email: GUEST_POOL_EMAIL },
    update: {},
    create: {
      email: GUEST_POOL_EMAIL,
      name: 'Guest Requests (Public Website)',
      passwordHash: '$2a$12$xxxxxxxxxxxxxxxxxxxxxxGuestPoolNoLoginAllowedxxxxxxxxxxxxxx',
      role: 'GUEST' as any,
      isActive: false,
    },
    select: { id: true },
  })
  return created.id
}
