import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { secrets } from './config';

const s3Client = new S3Client({
  region: secrets.AWS_REGION,
  credentials: {
    accessKeyId: secrets.AWS_ACCESS_KEY_ID,
    secretAccessKey: secrets.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = secrets.AWS_S3_BUCKET_NAME;

export interface UploadResult {
  url: string;
  key: string;
  size: number;
}

export async function uploadFileToS3(
  file: File,
  fileName: string,
  userId: string
): Promise<UploadResult> {
  try {
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `uploads/${userId}/${timestamp}_${sanitizedFileName}`;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: file?.type,
      ContentLength: file.size,
    };

    const command = new PutObjectCommand(uploadParams);
    await s3Client.send(command);

    const url = `https://${BUCKET_NAME}.s3.${secrets.AWS_REGION}.amazonaws.com/${key}`;

    return {
      url,
      key,
      size: file.size,
    };
  } catch (error) {
    console.error('Error uploading file to S3:', error);
    throw new Error('Failed to upload file to S3');
  }
}

export async function deleteFileFromS3(key: string): Promise<void> {
  try {
    const deleteCommand = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(deleteCommand);
    console.log(`Successfully deleted S3 file: ${key}`);
  } catch (error) {
    console.error('Error deleting file from S3:', error);
    throw new Error(`Failed to delete file from S3: ${key}`);
  }
}

export async function deleteFileFromS3ByUrl(url: string): Promise<void> {
  try {
    // Extract key from S3 URL
    const key = extractKeyFromS3Url(url);
    if (!key) {
      throw new Error('Invalid S3 URL format');
    }
    
    await deleteFileFromS3(key);
  } catch (error) {
    console.error('Error deleting file from S3 by URL:', error);
    throw new Error(`Failed to delete file from S3: ${url}`);
  }
}

export function extractKeyFromS3Url(url: string): string | null {
  try {
    // Handle different S3 URL formats:
    // https://bucket.s3.region.amazonaws.com/key
    // https://s3.region.amazonaws.com/bucket/key
    
    const urlObj = new URL(url);
    
    // Format: https://bucket.s3.region.amazonaws.com/key
    if (urlObj.hostname.includes('.s3.')) {
      return urlObj.pathname.substring(1); // Remove leading slash
    }
    
    // Format: https://s3.region.amazonaws.com/bucket/key
    if (urlObj.hostname.startsWith('s3.')) {
      const pathParts = urlObj.pathname.split('/');
      return pathParts.slice(2).join('/'); // Remove empty string and bucket name
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting key from S3 URL:', error);
    return null;
  }
}

export async function cleanupOrphanedS3File(uploadResult: UploadResult): Promise<void> {
  try {
    console.log(`Attempting to cleanup orphaned S3 file: ${uploadResult.url}`);
    await deleteFileFromS3(uploadResult.key);
    console.log(`Successfully cleaned up orphaned S3 file: ${uploadResult.key}`);
  } catch (error) {
    console.error('Failed to cleanup orphaned S3 file:', error);
    // Don't throw here - this is cleanup, we don't want to mask the original error
  }
}

export async function generatePresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
    return signedUrl;
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    throw new Error('Failed to generate presigned URL');
  }
}

export async function downloadFileFromS3(url: string): Promise<Buffer> {
  try {
    const key = extractKeyFromS3Url(url);
    if (!key) {
      throw new Error('Invalid S3 URL format');
    }

    const getObjectCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const response = await s3Client.send(getObjectCommand);
    
    if (!response.Body) {
      throw new Error('No body in S3 response');
    }

    return Buffer.from(await response.Body.transformToByteArray());
  } catch (error) {
    console.error('Error downloading file from S3:', error);
    throw new Error(`Failed to download file from S3: ${url}`);
  }
}

export { validateS3Config } from './config';
