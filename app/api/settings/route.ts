import { NextResponse } from 'next/server';
import { getSiteSettings, toPublicSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

// Public: returns only the customer-safe business settings. The internal
// admin notification email is never included, and bank details are only
// present when Bank Transfer is enabled.
export async function GET() {
  const settings = await getSiteSettings();
  return NextResponse.json(toPublicSettings(settings));
}
