import { CompleteMultipartUploadCommand, CreateMultipartUploadCommand, DeleteObjectCommand, GetObjectCommand, PutObjectCommand, UploadPartCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { createS3Client, getBucketConfig } from '@/lib/aws-config'

function shouldServeInline(contentType: string): boolean {
  return (contentType?.startsWith?.('image/') && contentType !== 'image/svg+xml')
    || contentType?.startsWith?.('video/')
    || contentType?.startsWith?.('audio/')
}

const client = createS3Client()

export async function generatePresignedUploadUrl(fileName: string, contentType: string, isPublic = false) {
  const safeName = (fileName ?? 'file').replace(/[^a-zA-Z0-9._-]/g, '-')
  const { bucketName, folderPrefix } = getBucketConfig()
  const cloud_storage_path = `${folderPrefix}${isPublic ? 'public/' : ''}uploads/${Date.now()}-${safeName}`
  const command = new PutObjectCommand({ Bucket: bucketName, Key: cloud_storage_path, ContentType: contentType ?? 'application/octet-stream' })
  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 3600 })
  return { uploadUrl, cloud_storage_path }
}

export async function initiateMultipartUpload(fileName: string, contentType: string, isPublic = false) {
  const safeName = (fileName ?? 'file').replace(/[^a-zA-Z0-9._-]/g, '-')
  const { bucketName, folderPrefix } = getBucketConfig()
  const cloud_storage_path = `${folderPrefix}${isPublic ? 'public/' : ''}uploads/${Date.now()}-${safeName}`
  const result = await client.send(new CreateMultipartUploadCommand({ Bucket: bucketName, Key: cloud_storage_path, ContentType: contentType ?? 'application/octet-stream' }))
  return { uploadId: result?.UploadId ?? '', cloud_storage_path }
}

export async function getPresignedUrlForPart(cloud_storage_path: string, uploadId: string, partNumber: number) {
  const { bucketName } = getBucketConfig()
  return getSignedUrl(client, new UploadPartCommand({ Bucket: bucketName, Key: cloud_storage_path ?? '', UploadId: uploadId ?? '', PartNumber: partNumber ?? 1 }), { expiresIn: 3600 })
}

export async function completeMultipartUpload(cloud_storage_path: string, uploadId: string, parts: Array<{ ETag: string; PartNumber: number }>) {
  const { bucketName } = getBucketConfig()
  return client.send(new CompleteMultipartUploadCommand({ Bucket: bucketName, Key: cloud_storage_path ?? '', UploadId: uploadId ?? '', MultipartUpload: { Parts: parts ?? [] } }))
}

export async function getFileUrl(cloud_storage_path: string, contentType: string, isPublic: boolean) {
  const { bucketName } = getBucketConfig()
  const region = process.env.AWS_REGION ?? 'us-east-1'
  const encodedPath = (cloud_storage_path ?? '').split('/').map((part: string) => encodeURIComponent(part ?? '')).join('/')
  if (isPublic) return `https://${bucketName}.s3.${region}.amazonaws.com/${encodedPath}`
  return getSignedUrl(client, new GetObjectCommand({ Bucket: bucketName, Key: cloud_storage_path ?? '', ResponseContentDisposition: shouldServeInline(contentType ?? '') ? 'inline' : 'attachment' }), { expiresIn: 3600 })
}

export async function deleteFile(cloud_storage_path: string) {
  const { bucketName } = getBucketConfig()
  return client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: cloud_storage_path ?? '' }))
}
