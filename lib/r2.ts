import "server-only";

import { HeadBucketCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const DEFAULT_BUCKET = "openchat-agents-media";

export type R2Status = {
  bucket: string;
  configured: boolean;
  missing: string[];
  endpoint: string | null;
};

function env(name: string, fallbackName?: string) {
  return process.env[name] || (fallbackName ? process.env[fallbackName] : undefined);
}

export function getR2Status(): R2Status {
  const accountId = env("CLOUDFLARE_R2_ACCOUNT_ID", "R2_ACCOUNT_ID");
  const accessKeyId = env("CLOUDFLARE_R2_ACCESS_KEY_ID", "R2_ACCESS_KEY_ID");
  const secretAccessKey = env("CLOUDFLARE_R2_SECRET_ACCESS_KEY", "R2_SECRET_ACCESS_KEY");
  const bucket = env("CLOUDFLARE_R2_BUCKET", "S3_BUCKET_NAME") || DEFAULT_BUCKET;
  const missing = [
    ["CLOUDFLARE_R2_ACCOUNT_ID", accountId],
    ["CLOUDFLARE_R2_ACCESS_KEY_ID", accessKeyId],
    ["CLOUDFLARE_R2_SECRET_ACCESS_KEY", secretAccessKey]
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name as string);

  return {
    bucket,
    configured: missing.length === 0,
    missing,
    endpoint: accountId ? `https://${accountId}.r2.cloudflarestorage.com` : null
  };
}

function getR2Client() {
  const status = getR2Status();
  const accessKeyId = env("CLOUDFLARE_R2_ACCESS_KEY_ID", "R2_ACCESS_KEY_ID");
  const secretAccessKey = env("CLOUDFLARE_R2_SECRET_ACCESS_KEY", "R2_SECRET_ACCESS_KEY");

  if (!status.configured || !status.endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error(`R2 is not configured. Missing: ${status.missing.join(", ")}`);
  }

  return new S3Client({
    endpoint: status.endpoint,
    region: "auto",
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  });
}

export async function checkR2Bucket() {
  const status = getR2Status();
  if (!status.configured) {
    return { ok: false, status, message: `Missing R2 secrets: ${status.missing.join(", ")}` };
  }

  try {
    const client = getR2Client();
    await client.send(new HeadBucketCommand({ Bucket: status.bucket }));
    return { ok: true, status, message: "R2 bucket is reachable." };
  } catch (error) {
    return {
      ok: false,
      status,
      message: error instanceof Error ? error.message : "R2 bucket check failed."
    };
  }
}

export async function createMediaUploadUrl(input: { objectKey: string; mimeType: string; sizeBytes: number }) {
  const status = getR2Status();
  if (!status.configured) {
    throw new Error(`R2 is not configured. Missing: ${status.missing.join(", ")}`);
  }

  const client = getR2Client();
  const command = new PutObjectCommand({
    Bucket: status.bucket,
    Key: input.objectKey,
    ContentType: input.mimeType,
    ContentLength: input.sizeBytes
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 60 * 10 });

  return {
    bucket: status.bucket,
    objectKey: input.objectKey,
    uploadUrl,
    expiresIn: 600
  };
}
