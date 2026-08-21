import { S3Client } from "@aws-sdk/client-s3";

export function getBucketConfig() {
  return {
    bucketName: process.env.AWS_BUCKET_NAME ?? "",
    folderPrefix: process.env.AWS_FOLDER_PREFIX ?? "",
    region: process.env.S3_REGION ?? "us-east-1",
  };
}

// Named S3_* rather than the standard AWS_* so these never collide with the
// AWS_REGION / AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY environment
// variables that the Lambda runtime underneath Vercel reserves for its own
// execution-role credentials — setting those names in Vercel's dashboard
// gets silently overridden at runtime, which otherwise makes every S3
// request authenticate as Vercel's Lambda role instead of ours.
export function createS3Client() {
  return new S3Client({
    region: process.env.S3_REGION,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
    },
  });
}
