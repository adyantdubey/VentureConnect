import { ensureDatabase, getD1, getMediaBucket } from "../../../../db";
import { getCurrentMember } from "../../../server/member";

type MediaRow = {
  id: string;
  owner_profile_id: string;
  r2_key: string;
  file_name: string;
  content_type: string;
  size_bytes: number;
  published_count: number;
};
type PartRow = { part_number: number; r2_key: string; size_bytes: number };

export async function GET(request: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  await ensureDatabase();
  const params = await context.params;
  const row = await getD1().prepare("SELECT m.id, m.owner_profile_id, m.r2_key, m.file_name, m.content_type, m.size_bytes, (SELECT COUNT(*) FROM community_posts p WHERE p.media_asset_id = m.id) AS published_count FROM media_assets m WHERE m.id = ? AND m.status = 'ready'")
    .bind(params.id)
    .first<MediaRow>();
  if (!row) return new Response("Not found", { status: 404 });

  if (!row.published_count) {
    const viewer = await getCurrentMember({ create: false });
    if (!viewer || viewer.id !== row.owner_profile_id) return new Response("Not found", { status: 404 });
  }

  const parts = await getD1().prepare("SELECT part_number, r2_key, size_bytes FROM media_parts WHERE asset_id = ? ORDER BY part_number")
    .bind(row.id).all<PartRow>();
  if (!parts.results.length) return new Response("Not found", { status: 404 });
  const range = parseRange(request.headers.get("range"), row.size_bytes);
  if (!range) return new Response("Range not satisfiable", { status: 416, headers: { "content-range": `bytes */${row.size_bytes}` } });

  const headers = new Headers({
    "content-type": row.content_type,
    "content-disposition": `inline; filename="${row.file_name.replace(/[\"\r\n]/g, "")}"`,
    "cache-control": "public, max-age=31536000, immutable",
    "accept-ranges": "bytes",
  });
  const length = range.end - range.start + 1;
  headers.set("content-length", String(length));
  if (range.partial) headers.set("content-range", `bytes ${range.start}-${range.end}/${row.size_bytes}`);
  return new Response(streamParts(parts.results, range.start, range.end), { status: range.partial ? 206 : 200, headers });
}

function parseRange(value: string | null, total: number): { start: number; end: number; partial: boolean } | null {
  if (!value) return { start: 0, end: total - 1, partial: false };
  const match = /^bytes=(\d*)-(\d*)$/.exec(value.trim());
  if (!match || (!match[1] && !match[2])) return null;
  let start: number;
  let end: number;
  if (!match[1]) {
    const suffix = Number(match[2]);
    if (!Number.isFinite(suffix) || suffix <= 0) return null;
    start = Math.max(0, total - suffix);
    end = total - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : total - 1;
  }
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start >= total || end < start) return null;
  return { start, end: Math.min(end, total - 1), partial: true };
}

function streamParts(parts: PartRow[], requestedStart: number, requestedEnd: number) {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        let globalOffset = 0;
        for (const part of parts) {
          const partStart = globalOffset;
          const partEnd = partStart + part.size_bytes - 1;
          globalOffset += part.size_bytes;
          if (partEnd < requestedStart || partStart > requestedEnd) continue;
          const localStart = Math.max(0, requestedStart - partStart);
          const localEnd = Math.min(part.size_bytes - 1, requestedEnd - partStart);
          const object = await getMediaBucket().get(part.r2_key, { range: { offset: localStart, length: localEnd - localStart + 1 } });
          if (!object) throw new Error("A stored media part is missing.");
          const reader = object.body.getReader();
          while (true) {
            const result = await reader.read();
            if (result.done) break;
            controller.enqueue(result.value as Uint8Array);
          }
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}
