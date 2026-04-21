import { v2 as cloudinary } from 'cloudinary'
import { env } from '../config/env'

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key:    env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
})

/**
 * Upload an image buffer to Cloudinary. `folder` is the Cloudinary folder
 * (e.g. `opporlink/avatars`). `publicId` is the basename within that folder.
 */
export async function uploadImage(
  buffer: Buffer,
  folder: string,
  publicId: string,
  mimeType: string,
): Promise<string> {
  const dataUri = `data:${mimeType};base64,${buffer.toString('base64')}`
  const result = await cloudinary.uploader.upload(dataUri, {
    folder:         folder,
    public_id:      publicId,
    resource_type:  'image',
    overwrite:      true,
    invalidate:     true,
  })
  return result.secure_url
}

export async function deleteImage(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId, { resource_type: 'image' })
}
