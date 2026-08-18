import { ensureDatabase, getD1, getMediaBucket } from "../../../db";
import { getCurrentMember } from "../../server/member";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const IMAGE_LIMIT = 15 * 1024 * 1024;
const VIDEO_LIMIT = 80 * 1024 * 1024;
const CHUNK_LIMIT = 900 * 1024;

type AssetRow = {
  id: string;
  owner_profile_id: string;
  r2_key: string;
  file_name: string;
  content_type: string;
  size_bytes: number;
  uploaded_bytes: number;
  chunk_count: number;
  status: "uploading" | "ready" | "deleted";
};

export async function POST(request: Request) {
  const profile = await getCurrentMember();
  if (!profile) return Response.json({ error: "Sign in to upload media." }, { status: 401 });
  if (!profile.onboardingComplete) return Response.json({ error: "Finish your profile before posting." }, { status: 403 });

  try {
    const url = new URL(request.url);
    const action = url.searchParams.get("action") ?? "start";
    await ensureDatabase();
    if (action === "complete") {
      const id = url.searchParams.get("id");
      if (!id) return Response.json({ error: "An upload id is required." }, { status: 400 });
      const asset = await getD1().prepare("SELECT id, owner_profile_id, r2_key, file_name, content_type, size_bytes, uploaded_bytes, chunk_count, status FROM media_assets WHERE id = ? AND owner_profile_id = ?")
        .bind(id, profile.id).first<AssetRow>();
      if (!asset || asset.status !== "uploading") return Response.json({ error: "Upload not found or already completed." }, { status: 404 });
      if (asset.uploaded_bytes !== asset.size_bytes || asset.chunk_count < 1) return Response.json({ error: "The file has not finished uploading." }, { status: 409 });
      await getD1().prepare("UPDATE media_assets SET status = 'ready' WHERE id = ? AND owner_profile_id = ?").bind(id, profile.id).run();
      return Response.json({ asset: publicAsset(asset) });
    }

    const input = await request.json() as { fileName?: string; contentType?: string; sizeBytes?: number };
    const contentType = input.contentType ?? "";
    const isImage = IMAGE_TYPES.has(contentType);
    const isVideo = VIDEO_TYPES.has(contentType);
    if (!isImage && !isVideo) return Response.json({ error: "Use JPG, PNG, WebP, GIF, MP4, WebM, or MOV files." }, { status: 415 });
    const sizeBytes = Number(input.sizeBytes);
    const limit = isVideo ? VIDEO_LIMIT : IMAGE_LIMIT;
    if (!Number.isSafeInteger(sizeBytes) || sizeBytes < 1 || sizeBytes > limit) return Response.json({ error: `${isVideo ? "Videos" : "Images"} must be smaller than ${Math.round(limit / 1024 / 1024)} MB.` }, { status: 413 });
    const quota = await getD1().prepare("SELECT COALESCE(SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END), 0) AS daily_count, COALESCE(SUM(CASE WHEN status != 'deleted' THEN size_bytes ELSE 0 END), 0) AS active_bytes FROM media_assets WHERE owner_profile_id = ?")
      .bind(Date.now() - 24 * 60 * 60 * 1000, profile.id).first<{ daily_count: number; active_bytes: number }>();
    if ((quota?.daily_count ?? 0) >= 20) return Response.json({ error: "You have reached today’s upload limit." }, { status: 429 });
    if ((quota?.active_bytes ?? 0) + sizeBytes > 500 * 1024 * 1024) return Response.json({ error: "Your media library has reached its 500 MB early-access limit." }, { status: 413 });
    const id = crypto.randomUUID();
    const safeName = (input.fileName ?? "").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || (isVideo ? "video.mp4" : "image.jpg");
    const key = `members/${profile.id}/${id}-${safeName}`;
    await getD1().prepare("INSERT INTO media_assets (id, owner_profile_id, r2_key, file_name, content_type, size_bytes, uploaded_bytes, chunk_count, status, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, 0, 'uploading', ?)")
      .bind(id, profile.id, key, safeName, contentType, sizeBytes, Date.now()).run();
    return Response.json({ upload: { id, chunkSize: CHUNK_LIMIT } }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to upload this file." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const profile = await getCurrentMember();
  if (!profile) return Response.json({ error: "Sign in to upload media." }, { status: 401 });
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const partNumber = Number(url.searchParams.get("part"));
  if (!id || !Number.isInteger(partNumber) || partNumber < 0) return Response.json({ error: "A valid upload id and part number are required." }, { status: 400 });
  const chunk = await request.arrayBuffer();
  if (!chunk.byteLength || chunk.byteLength > CHUNK_LIMIT) return Response.json({ error: "This upload part is too large." }, { status: 413 });
  await ensureDatabase();
  const asset = await getD1().prepare("SELECT id, owner_profile_id, r2_key, file_name, content_type, size_bytes, uploaded_bytes, chunk_count, status FROM media_assets WHERE id = ? AND owner_profile_id = ?")
    .bind(id, profile.id).first<AssetRow>();
  if (!asset || asset.status !== "uploading") return Response.json({ error: "Upload not found or already completed." }, { status: 404 });
  const partKey = `${asset.r2_key}/parts/${String(partNumber).padStart(5, "0")}`;
  await getMediaBucket().put(partKey, chunk, { httpMetadata: { contentType: "application/octet-stream" } });
  const d1 = getD1();
  await d1.prepare("INSERT OR REPLACE INTO media_parts (asset_id, part_number, r2_key, size_bytes, created_at) VALUES (?, ?, ?, ?, ?)")
    .bind(id, partNumber, partKey, chunk.byteLength, Date.now()).run();
  const totals = await d1.prepare("SELECT COALESCE(SUM(size_bytes), 0) AS uploaded_bytes, COUNT(*) AS chunk_count FROM media_parts WHERE asset_id = ?")
    .bind(id).first<{ uploaded_bytes: number; chunk_count: number }>();
  await d1.prepare("UPDATE media_assets SET uploaded_bytes = ?, chunk_count = ? WHERE id = ? AND owner_profile_id = ?")
    .bind(totals?.uploaded_bytes ?? 0, totals?.chunk_count ?? 0, id, profile.id).run();
  return Response.json({ uploadedBytes: totals?.uploaded_bytes ?? 0, totalBytes: asset.size_bytes });
}

export async function DELETE(request: Request) {
  const profile = await getCurrentMember();
  if (!profile) return Response.json({ error: "Sign in to manage uploads." }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "An upload id is required." }, { status: 400 });
  await ensureDatabase();
  const media = await getD1().prepare("SELECT r2_key FROM media_assets WHERE id = ? AND owner_profile_id = ? AND status != 'deleted'")
    .bind(id, profile.id)
    .first<{ r2_key: string }>();
  if (!media) return Response.json({ error: "Upload not found." }, { status: 404 });
  const attached = await getD1().prepare("SELECT id FROM community_posts WHERE media_asset_id = ? LIMIT 1").bind(id).first<{ id: string }>();
  if (attached) return Response.json({ error: "Published media can only be removed by deleting its post." }, { status: 409 });
  const parts = await getD1().prepare("SELECT r2_key FROM media_parts WHERE asset_id = ? ORDER BY part_number").bind(id).all<{ r2_key: string }>();
  await Promise.all(parts.results.map((part) => getMediaBucket().delete(part.r2_key)));
  await getD1().prepare("DELETE FROM media_parts WHERE asset_id = ?").bind(id).run();
  await getD1().prepare("UPDATE media_assets SET status = 'deleted' WHERE id = ? AND owner_profile_id = ?").bind(id, profile.id).run();
  return Response.json({ ok: true });
}

function publicAsset(asset: AssetRow) {
  return {
    id: asset.id,
    url: `/api/media/${asset.id}`,
    fileName: asset.file_name,
    contentType: asset.content_type,
    mediaType: asset.content_type.startsWith("video/") ? "video" : "image",
    sizeBytes: asset.size_bytes,
  };
}
