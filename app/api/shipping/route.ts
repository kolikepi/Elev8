import { NextResponse } from 'next/server';
import { getShippingConfig } from '@/lib/shipping';

export const dynamic = 'force-dynamic';

// Public: returns the current shipping configuration so the cart/checkout
// can display accurate shipping costs and free-shipping thresholds.
export async function GET() {
  const config = await getShippingConfig();
  return NextResponse.json(config);
}
