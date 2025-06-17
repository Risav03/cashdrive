import { authOptions } from '@/app/lib/backend/authConfig';
import { secrets } from '@/app/lib/config';
import connectDB from '@/app/lib/mongodb';
import { Item } from '@/app/models/Item';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getServerSession } from 'next-auth/next';
import { NextRequest, NextResponse } from 'next/server';

const s3Client = new S3Client({
  region: secrets.AWS_REGION,
  credentials: {
    accessKeyId: secrets.AWS_ACCESS_KEY_ID,
    secretAccessKey: secrets.AWS_SECRET_ACCESS_KEY,
  },
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Extract the file path from the URL
    const pathname = request.nextUrl.pathname;
    const pathSegments = pathname.split('/').slice(3); // Remove /api/files/
    const filePath = pathSegments.join('/');

    if (!filePath) {
      return NextResponse.json({ error: 'File path required' }, { status: 400 });
    }

    await connectDB();

    // Find the item in database to verify ownership
    const item = await Item.findOne({ 
      url: filePath, 
      owner: session.user.id 
    });

    if (!item) {
      return NextResponse.json({ error: 'File not found or unauthorized' }, { status: 404 });
    }

    // Get the file from S3
    const getObjectCommand = new GetObjectCommand({
      Bucket: secrets.AWS_S3_BUCKET_NAME,
      Key: filePath,
    });

    const s3Response = await s3Client.send(getObjectCommand);
    
    if (!s3Response.Body) {
      return NextResponse.json({ error: 'File not found in storage' }, { status: 404 });
    }

    // Convert the stream to buffer
    const chunks: Uint8Array[] = [];
    const reader = s3Response.Body.transformToWebStream().getReader();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    const buffer = Buffer.concat(chunks);

    // Set appropriate headers
    const headers = new Headers();
    headers.set('Content-Type', item.mimeType || 'application/octet-stream');
    headers.set('Content-Length', buffer.length.toString());
    headers.set('Cache-Control', 'private, max-age=3600'); // Cache for 1 hour
    
    // For PDFs, set inline disposition so they display in browser
    if (item.mimeType === 'application/pdf') {
      headers.set('Content-Disposition', `inline; filename="${item.name}"`);
    }

    return new NextResponse(buffer, {
      status: 200,
      headers,
    });

  } catch (error: any) {
    console.error('File serving error:', error);
    
    if (error.name === 'NoSuchKey') {
      return NextResponse.json({ error: 'File not found in storage' }, { status: 404 });
    }
    
    return NextResponse.json({ error: 'Failed to serve file' }, { status: 500 });
  }
} 