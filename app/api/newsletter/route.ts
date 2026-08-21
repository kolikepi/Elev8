import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body ?? {};

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const existingSignup = await prisma.newsletterSignup.findUnique({
      where: { email },
    });

    if (existingSignup) {
      return NextResponse.json({
        success: true,
        message: 'You are already subscribed!',
      });
    }

    await prisma.newsletterSignup.create({
      data: { email },
    });

    return NextResponse.json({
      success: true,
      message: 'Successfully subscribed to newsletter!',
    });
  } catch (error) {
    console.error('Newsletter signup error:', error);
    return NextResponse.json(
      { error: 'Failed to subscribe' },
      { status: 500 }
    );
  }
}
