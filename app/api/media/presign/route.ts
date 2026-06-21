import { NextRequest, NextResponse } from "next/server";
import { createMediaUploadUrl, getR2Status } from "@/lib/r2";
import { getCurrentUser } from "@/lib/session";
import { createClient, hasSupabaseServerConfig } from "@/utils/supabase/server";

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const SAFE_MIME_PREFIXES = ["image/", "video/", "audio/", "application/pdf"];

function cleanFileName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "upload";
}

export async function GET() {
  const status = getR2Status();
  return NextResponse.json({
    bucket: status.bucket,
    configured: status.configured,
    missing: status.configured ? [] : status.missing
  });
}

export async function POST(request: NextRequest) {
  const status = getR2Status();
  if (!status.configured) {
    return NextResponse.json(
      {
        error: "R2 storage is not configured.",
        bucket: status.bucket,
        missing: status.missing
      },
      { status: 503 }
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in with Google before uploading media." }, { status: 401 });
  }

  const body = (await request.json()) as {
    fileName?: string;
    mimeType?: string;
    sizeBytes?: number;
    width?: number;
    height?: number;
  };

  const mimeType = body.mimeType ?? "";
  const sizeBytes = Number(body.sizeBytes ?? 0);
  if (!SAFE_MIME_PREFIXES.some((prefix) => mimeType.startsWith(prefix))) {
    return NextResponse.json({ error: "Unsupported media type." }, { status: 400 });
  }
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0 || sizeBytes > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Upload size must be between 1 byte and 25 MB." }, { status: 400 });
  }

  const fileName = cleanFileName(body.fileName ?? "upload");
  const objectKey = `uploads/${user.id}/${Date.now()}-${fileName}`;
  const upload = await createMediaUploadUrl({ objectKey, mimeType, sizeBytes });

  let mediaAssetId: string | null = null;
  if (hasSupabaseServerConfig) {
    const supabase = createClient();
    const { data: profile } = await supabase.from("profiles").select("id").eq("user_id", user.id).maybeSingle();
    const { data } = await supabase
      .from("media_assets")
      .insert({
        bucket: upload.bucket,
        object_key: upload.objectKey,
        public_url: null,
        signed_url_metadata: { upload_expires_in: upload.expiresIn },
        mime_type: mimeType,
        size_bytes: sizeBytes,
        width: body.width ?? null,
        height: body.height ?? null,
        owner_profile_id: profile?.id ?? null
      })
      .select("id")
      .single();

    mediaAssetId = data?.id ?? null;
  }

  return NextResponse.json({
    ...upload,
    mediaAssetId
  });
}
