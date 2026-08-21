import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET single product
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { authorized, error } = await requireAdmin();
    if (!authorized) {
      return NextResponse.json({ error }, { status: 401 });
    }

    const { id } = await context.params;
    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}

// UPDATE product
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { authorized, error } = await requireAdmin();
    if (!authorized) {
      return NextResponse.json({ error }, { status: 401 });
    }

    const { id } = await context.params;
    const data = await request.json();

    // Generate slug from name if name changed
    const updateData: Record<string, unknown> = {};
    
    if (data.name !== undefined) {
      updateData.name = data.name;
      updateData.slug = data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    }
    if (data.description !== undefined) updateData.description = data.description;
    if (data.price !== undefined) updateData.price = parseFloat(data.price);
    if (data.originalPrice !== undefined) updateData.originalPrice = data.originalPrice ? parseFloat(data.originalPrice) : null;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.sizes !== undefined) updateData.sizes = data.sizes;
    if (data.colors !== undefined) updateData.colors = data.colors;
    if (data.colorHexCodes !== undefined) updateData.colorHexCodes = data.colorHexCodes;
    if (data.gsm !== undefined) updateData.gsm = data.gsm ? parseInt(data.gsm) : null;
    if (data.fabricType !== undefined) updateData.fabricType = data.fabricType;
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
    if (data.imageUrls !== undefined) updateData.imageUrls = data.imageUrls;
    if (data.careInstructions !== undefined) updateData.careInstructions = data.careInstructions;
    if (data.features !== undefined) updateData.features = data.features;
    if (data.isFeatured !== undefined) updateData.isFeatured = data.isFeatured;
    if (data.isBestSeller !== undefined) updateData.isBestSeller = data.isBestSeller;
    if (data.inStock !== undefined) updateData.inStock = data.inStock;
    if (data.gender !== undefined) updateData.gender = data.gender || null;
    if (data.activity !== undefined) updateData.activity = data.activity || null;
    if (data.collection !== undefined) updateData.collection = data.collection || null;
    if (data.fit !== undefined) updateData.fit = data.fit || null;
    if (data.sku !== undefined) updateData.sku = data.sku || null;
    if (data.badge !== undefined) updateData.badge = data.badge || null;
    if (data.modelHeight !== undefined) updateData.modelHeight = data.modelHeight || null;
    if (data.modelSize !== undefined) updateData.modelSize = data.modelSize || null;
    if (data.status !== undefined) updateData.status = data.status === 'draft' ? 'draft' : 'active';

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

// DELETE product
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { authorized, error } = await requireAdmin();
    if (!authorized) {
      return NextResponse.json({ error }, { status: 401 });
    }

    const { id } = await context.params;
    await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
