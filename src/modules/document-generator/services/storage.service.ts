import { GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2 } from '../../../config/cloudflare';
import { env } from '../../../config/env';
import { logger } from '../../../config/logger';

/**
 * Uploads a document buffer to the private R2 bucket and returns a 1-hour presigned GET URL.
 */
export async function uploadDocument(buffer: Buffer, key: string, contentType: string): Promise<string> {
  const uploadCommand = new PutObjectCommand({
    Bucket: env.CF_R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  await r2.send(uploadCommand);
  logger.info({ key }, 'Uploaded document to R2');

  return generatePresignedUrl(key);
}

/**
 * Generates a presigned GET URL for a given object key (expires in 1 hour).
 */
export async function generatePresignedUrl(key: string): Promise<string> {
  const getCommand = new GetObjectCommand({
    Bucket: env.CF_R2_BUCKET_NAME,
    Key: key,
  });

  // Expires in 3600 seconds (1 hour)
  return getSignedUrl(r2, getCommand, { expiresIn: 3600 });
}

/**
 * Deletes a document from the R2 bucket.
 */
export async function deleteDocument(key: string): Promise<void> {
  try {
    const deleteCommand = new DeleteObjectCommand({
      Bucket: env.CF_R2_BUCKET_NAME,
      Key: key,
    });

    await r2.send(deleteCommand);
    logger.info({ key }, 'Deleted document from R2');
  } catch (error) {
    logger.error({ error, key }, 'Failed to delete document from R2');
    throw error;
  }
}
