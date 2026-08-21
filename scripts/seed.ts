import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

const products = [
  {
    name: 'Performance Tee - Black',
    slug: 'performance-tee-black',
    description: 'Engineered for peak performance. Our signature black tee features moisture-wicking technology and a tailored athletic fit.',
    price: 45.00,
    category: 'T-Shirts',
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    colors: ['Black'],
    colorHexCodes: ['#000000'],
    imageUrl: 'https://cdn.abacus.ai/images/2fd41820-6034-4c2f-a7dd-a630ae3f42c0.png',
    imageUrls: ['https://cdn.abacus.ai/images/2fd41820-6034-4c2f-a7dd-a630ae3f42c0.png'],
    careInstructions: ['Machine wash cold', 'Do not bleach', 'Tumble dry low', 'Do not iron print'],
    features: ['Moisture-wicking', '4-way stretch', 'Anti-odor technology', 'Flatlock seams'],
    isFeatured: true,
    isBestSeller: true,
    inStock: true,
  },
  {
    name: 'Performance Tee - White',
    slug: 'performance-tee-white',
    description: 'Clean. Crisp. Unstoppable. The white performance tee delivers the same technical excellence in a fresh colorway.',
    price: 45.00,
    category: 'T-Shirts',
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    colors: ['White'],
    colorHexCodes: ['#FFFFFF'],
    imageUrl: 'https://cdn.abacus.ai/images/090e9005-b2b0-44b0-abf7-76bbe7a53c88.png',
    imageUrls: ['https://cdn.abacus.ai/images/090e9005-b2b0-44b0-abf7-76bbe7a53c88.png'],
    careInstructions: ['Machine wash cold', 'Do not bleach', 'Tumble dry low', 'Do not iron print'],
    features: ['Moisture-wicking', '4-way stretch', 'Anti-odor technology', 'Flatlock seams'],
    isFeatured: false,
    isBestSeller: false,
    inStock: true,
  },
  {
    name: 'Performance Tee - Charcoal',
    slug: 'performance-tee-charcoal',
    description: 'Subtle sophistication meets athletic excellence. The charcoal tee features neon green accent stitching.',
    price: 48.00,
    category: 'T-Shirts',
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    colors: ['Charcoal'],
    colorHexCodes: ['#36454F'],
    imageUrl: 'https://cdn.abacus.ai/images/b5cf02f2-afc2-461e-9c66-0d79690ffcf6.png',
    imageUrls: ['https://cdn.abacus.ai/images/b5cf02f2-afc2-461e-9c66-0d79690ffcf6.png'],
    careInstructions: ['Machine wash cold', 'Do not bleach', 'Tumble dry low', 'Do not iron print'],
    features: ['Moisture-wicking', '4-way stretch', 'Contrast stitching', 'Flatlock seams'],
    isFeatured: true,
    isBestSeller: false,
    inStock: true,
  },
  {
    name: 'Compression Leggings - Black',
    slug: 'compression-leggings-black',
    description: 'Maximum compression. Maximum performance. High-waisted support with seamless construction.',
    price: 68.00,
    category: 'Leggings',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: ['Black'],
    colorHexCodes: ['#000000'],
    imageUrl: 'https://cdn.abacus.ai/images/942e4428-6934-4344-bd36-36d9e12536cd.png',
    imageUrls: ['https://cdn.abacus.ai/images/942e4428-6934-4344-bd36-36d9e12536cd.png'],
    careInstructions: ['Machine wash cold', 'Do not bleach', 'Hang dry', 'Do not use fabric softener'],
    features: ['High-waisted', 'Squat-proof', 'No front seam', 'Hidden pocket'],
    isFeatured: true,
    isBestSeller: true,
    inStock: true,
  },
  {
    name: 'Compression Leggings - Gray',
    slug: 'compression-leggings-gray',
    description: 'Sleek. Strong. Supported. The gray compression leggings deliver high-performance compression.',
    price: 68.00,
    category: 'Leggings',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: ['Gray'],
    colorHexCodes: ['#808080'],
    imageUrl: 'https://cdn.abacus.ai/images/1ee986c6-1efa-4401-ae9f-76abb2e65724.png',
    imageUrls: ['https://cdn.abacus.ai/images/1ee986c6-1efa-4401-ae9f-76abb2e65724.png'],
    careInstructions: ['Machine wash cold', 'Do not bleach', 'Hang dry', 'Do not use fabric softener'],
    features: ['High-waisted', 'Squat-proof', 'No front seam', 'Hidden pocket'],
    isFeatured: false,
    isBestSeller: false,
    inStock: true,
  },
  {
    name: 'Compression Leggings - Neon Stripe',
    slug: 'compression-leggings-neon-stripe',
    description: 'Stand out. Work out. Signature black leggings elevated with bold neon green side stripes.',
    price: 75.00,
    category: 'Leggings',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: ['Black/Neon Green'],
    colorHexCodes: ['#000000', '#32FF6A'],
    imageUrl: 'https://cdn.abacus.ai/images/c998c417-12f5-40d7-be42-f72adc77f42f.png',
    imageUrls: ['https://cdn.abacus.ai/images/c998c417-12f5-40d7-be42-f72adc77f42f.png'],
    careInstructions: ['Machine wash cold', 'Do not bleach', 'Hang dry', 'Do not use fabric softener'],
    features: ['High-waisted', 'Squat-proof', 'Signature stripe detail', 'Hidden pocket'],
    isFeatured: true,
    isBestSeller: false,
    inStock: true,
  },
  {
    name: 'Premium Hoodie - Black',
    slug: 'premium-hoodie-black',
    description: 'The ultimate post-workout essential. 320 GSM heavyweight warmth with relaxed athletic fit.',
    price: 85.00,
    category: 'Hoodies',
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    colors: ['Black'],
    colorHexCodes: ['#000000'],
    imageUrl: 'https://cdn.abacus.ai/images/943a74f1-ced2-495b-9d78-2ffda7cda498.png',
    imageUrls: ['https://cdn.abacus.ai/images/943a74f1-ced2-495b-9d78-2ffda7cda498.png'],
    careInstructions: ['Machine wash cold', 'Do not bleach', 'Tumble dry low', 'Iron on low heat'],
    features: ['Heavyweight fleece', 'Kangaroo pocket', 'Ribbed cuffs', 'Drawstring hood'],
    isFeatured: true,
    isBestSeller: true,
    inStock: true,
  },
  {
    name: 'Premium Hoodie - Heather Gray',
    slug: 'premium-hoodie-heather-gray',
    description: 'Classic comfort. Modern construction. 300 GSM premium fleece with a relaxed fit.',
    price: 85.00,
    category: 'Hoodies',
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    colors: ['Heather Gray'],
    colorHexCodes: ['#9E9E9E'],
    imageUrl: 'https://cdn.abacus.ai/images/a317cac3-6e1d-4c0a-8252-33966c12d313.png',
    imageUrls: ['https://cdn.abacus.ai/images/a317cac3-6e1d-4c0a-8252-33966c12d313.png'],
    careInstructions: ['Machine wash cold', 'Do not bleach', 'Tumble dry low', 'Iron on low heat'],
    features: ['Heavyweight fleece', 'Kangaroo pocket', 'Ribbed cuffs', 'Drawstring hood'],
    isFeatured: false,
    isBestSeller: false,
    inStock: true,
  },
  {
    name: 'Premium Hoodie - White',
    slug: 'premium-hoodie-white',
    description: 'Bold statement. Clean aesthetic. The white hoodie with signature neon green logo.',
    price: 88.00,
    category: 'Hoodies',
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    colors: ['White'],
    colorHexCodes: ['#FFFFFF'],
    imageUrl: 'https://cdn.abacus.ai/images/202d0cc4-97bf-4643-864c-61b70df6bec3.png',
    imageUrls: ['https://cdn.abacus.ai/images/202d0cc4-97bf-4643-864c-61b70df6bec3.png'],
    careInstructions: ['Machine wash cold', 'Do not bleach', 'Tumble dry low', 'Iron on low heat'],
    features: ['Heavyweight fleece', 'Kangaroo pocket', 'Signature logo', 'Drawstring hood'],
    isFeatured: true,
    isBestSeller: false,
    inStock: true,
  },
  {
    name: 'Performance Joggers - Black',
    slug: 'performance-joggers-black',
    description: 'Train. Recover. Repeat. Tapered athletic fit with zippered pockets.',
    price: 72.00,
    category: 'Pants',
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    colors: ['Black'],
    colorHexCodes: ['#000000'],
    imageUrl: 'https://cdn.abacus.ai/images/50236277-8e19-401d-97b3-2078be102c96.png',
    imageUrls: ['https://cdn.abacus.ai/images/50236277-8e19-401d-97b3-2078be102c96.png'],
    careInstructions: ['Machine wash cold', 'Do not bleach', 'Tumble dry low', 'Do not iron'],
    features: ['Tapered fit', 'Zippered pockets', 'Elastic waistband', 'Ankle cuffs'],
    isFeatured: true,
    isBestSeller: true,
    inStock: true,
  },
  {
    name: 'Performance Joggers - Dark Gray',
    slug: 'performance-joggers-dark-gray',
    description: 'Versatile performance. Clean lines. Perfect for training or everyday wear.',
    price: 72.00,
    category: 'Pants',
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    colors: ['Dark Gray'],
    colorHexCodes: ['#4A4A4A'],
    imageUrl: 'https://cdn.abacus.ai/images/d6d859c5-e640-4b94-b2de-9b1dc64e084c.png',
    imageUrls: ['https://cdn.abacus.ai/images/d6d859c5-e640-4b94-b2de-9b1dc64e084c.png'],
    careInstructions: ['Machine wash cold', 'Do not bleach', 'Tumble dry low', 'Do not iron'],
    features: ['Tapered fit', 'Zippered pockets', 'Elastic waistband', 'Ankle cuffs'],
    isFeatured: false,
    isBestSeller: false,
    inStock: true,
  },
  {
    name: 'Performance Joggers - Neon Accent',
    slug: 'performance-joggers-neon-accent',
    description: 'Details make the difference. Black joggers with signature neon green accents.',
    price: 78.00,
    category: 'Pants',
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    colors: ['Black/Neon Green'],
    colorHexCodes: ['#000000', '#32FF6A'],
    imageUrl: 'https://cdn.abacus.ai/images/d8feefbd-96ae-4fa1-b904-f45077a5c876.png',
    imageUrls: ['https://cdn.abacus.ai/images/d8feefbd-96ae-4fa1-b904-f45077a5c876.png'],
    careInstructions: ['Machine wash cold', 'Do not bleach', 'Tumble dry low', 'Do not iron'],
    features: ['Tapered fit', 'Neon accent details', 'Zippered pockets', 'Ankle cuffs'],
    isFeatured: true,
    isBestSeller: false,
    inStock: true,
  },
];

function randomPassword(): string {
  return crypto.randomBytes(12).toString('base64url');
}

async function main() {
  console.log('Seeding database...');

  // Create test user (random password each run unless SEED_TEST_PASSWORD is set)
  const testPassword = process.env.SEED_TEST_PASSWORD || randomPassword();
  const hashedPassword = await bcrypt.hash(testPassword, 10);
  await prisma.user.upsert({
    where: { email: 'john@doe.com' },
    update: {},
    create: {
      email: 'john@doe.com',
      name: 'John Doe',
      password: hashedPassword,
      role: 'user',
    },
  });
  console.log(`Test user created (john@doe.com / ${testPassword})`);

  // Create admin user for kolikepi.17@gmail.com (random password each run unless SEED_ADMIN_PASSWORD is set)
  const adminPlainPassword = process.env.SEED_ADMIN_PASSWORD || randomPassword();
  const adminPassword = await bcrypt.hash(adminPlainPassword, 10);
  await prisma.user.upsert({
    where: { email: 'kolikepi.17@gmail.com' },
    update: { 
      role: 'admin',
      password: adminPassword,
      name: 'ELEV8 Admin',
    },
    create: {
      email: 'kolikepi.17@gmail.com',
      name: 'ELEV8 Admin',
      password: adminPassword,
      role: 'admin',
    },
  });
  console.log(`Admin user created/updated: kolikepi.17@gmail.com / ${adminPlainPassword}`);
  
  // Also make kolikepi@gmail.com admin if it exists
  const existingUser = await prisma.user.findUnique({ where: { email: 'kolikepi@gmail.com' } });
  if (existingUser) {
    await prisma.user.update({
      where: { email: 'kolikepi@gmail.com' },
      data: { role: 'admin' },
    });
    console.log('Also granted admin to: kolikepi@gmail.com');
  }
  for (const product of products) {
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: product,
      create: product,
    });
  }

  // Seed starter ELEV8 DTF designs (idempotent by name)
  const dtfDesigns = [
    { name: 'ELEV8 Wordmark White', imageUrl: 'https://cdn.abacus.ai/images/54f89133-06bc-4ff5-862b-6f4828ffa0e0.png', category: 'Logo', sortOrder: 1 },
    { name: 'ELEV8 Wordmark Black', imageUrl: 'https://cdn.abacus.ai/images/9b6e2d7a-4d1b-46d3-92bb-c2e21ae0c728.png', category: 'Logo', sortOrder: 2 },
    { name: 'ELEV8 Emblem', imageUrl: 'https://cdn.abacus.ai/images/b32cddb2-35c3-4e90-9eda-cd4d6895ec9f.png', category: 'Logo', sortOrder: 3 },
    { name: 'ELEV8 Sportswear Lockup', imageUrl: 'https://cdn.abacus.ai/images/4d83f42d-73a9-4b3a-969e-2d4bd0c5ce66.png', category: 'Logo', sortOrder: 4 },
  ];
  for (const d of dtfDesigns) {
    const existing = await prisma.dtfDesign.findFirst({ where: { name: d.name } });
    if (existing) {
      await prisma.dtfDesign.update({ where: { id: existing.id }, data: d });
    } else {
      await prisma.dtfDesign.create({ data: d });
    }
  }
  console.log(dtfDesigns.length + ' DTF designs seeded');
  console.log(products.length + ' products seeded');

  // Shipping settings singleton (configurable shipping rates)
  await prisma.shippingSetting.upsert({
    where: { id: 'singleton' },
    update: {},
    create: { id: 'singleton', freeShippingThreshold: 50, tiranaRate: 3, standardRate: 5 },
  });
  console.log('Shipping settings seeded');

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });