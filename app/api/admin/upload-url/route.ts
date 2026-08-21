import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { createS3Client, getBucketConfig } from '@/lib/aws-config';

export async function POST(request: NextRequest) {
  try {
    const { authorized, error } = await requireAdmin();
    if (!authorized) {
      return NextResponse.json({ error }, { status: 401 });
    }

    const { imageUrl } = await request.json();

    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json(
        { error: 'imageUrl is required' },
        { status: 400 }
      );
    }

    // Download the image from the external URL
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ELEV8/1.0)',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to download image: ${response.status} ${response.statusText}` },
        { status: 400 }
      );
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = Buffer.from(await response.arrayBuffer());

    // Validate it's actually an image
    if (!contentType.startsWith('image/')) {
      return NextResponse.json(
        { error: 'URL does not point to a valid image' },
        { status: 400 }
      );
    }

    // Determine file extension
    const extMap: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
      'image/svg+xml': '.svg',
    };
    const ext = extMap[contentType] || '.jpg';

    // Upload to S3
    const s3Client = createS3Client();
    const { bucketName, folderPrefix, region } = getBucketConfig();
    const timestamp = Date.now();
    const cloud_storage_path = `${folderPrefix}public/uploads/${timestamp}-product${ext}`;

    const putCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: cloud_storage_path,
      Body: buffer,
      ContentType: contentType,
    });

    await s3Client.send(putCommand);

    // Generate public URL
    const publicUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${cloud_storage_path}`;

    return NextResponse.json({ publicUrl, cloud_storage_path });
  } catch (err) {
    console.error('Error uploading from URL:', err);
    return NextResponse.json(
      { error: 'Failed to process image URL' },
      { status: 500 }
    );
  }
}
