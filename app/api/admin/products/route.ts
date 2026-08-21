import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';

// GET all products for admin
export async function GET() {
  try {
    const { authorized, error } = await requireAdmin();
    if (!authorized) {
      return NextResponse.json({ error }, { status: 401 });
    }

    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

// CREATE new product
export async function POST(request: NextRequest) {
  try {
    const { authorized, error } = await requireAdmin();
    if (!authorized) {
      return NextResponse.json({ error }, { status: 401 });
    }

    const data = await request.json();
    
    // Generate slug from name
    const slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const product = await prisma.product.create({
      data: {
        name: data.name,
        slug,
        description: data.description || '',
        price: parseFloat(data.price),
        originalPrice: data.originalPrice ? parseFloat(data.originalPrice) : null,
        category: data.category,
        sizes: data.sizes || [],
        colors: data.colors || [],
        colorHexCodes: data.colorHexCodes || [],
        gsm: data.gsm ? parseInt(data.gsm) : null,
        fabricType: data.fabricType || null,
        imageUrl: data.imageUrl || '',
        imageUrls: data.imageUrls || [],
        careInstructions: data.careInstructions || [],
        features: data.features || [],
        isFeatured: data.isFeatured || false,
        isBestSeller: data.isBestSeller || false,
        inStock: data.inStock !== false,
        gender: data.gender || null,
        activity: data.activity || null,
        collection: data.collection || null,
        fit: data.fit || null,
        sku: data.sku || null,
        badge: data.badge || null,
        modelHeight: data.modelHeight || null,
        modelSize: data.modelSize || null,
        status: data.status === 'draft' ? 'draft' : 'active',
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
