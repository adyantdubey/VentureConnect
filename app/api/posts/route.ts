import { ensureDatabase, getD1, getMediaBucket } from "../../../db";
import { getCurrentMember, profileTitle } from "../../server/member";

type StoredRow = { payload: string; author_profile_id: string | null };
type MediaRow = { id: string; owner_profile_id: string; r2_key: string; content_type: string };
type EngagementRow = { id: number; post_id: string; actor: string; action: string; content: string | null; created_at: number };

export async function GET() {
  try {
    await ensureDatabase();
    const viewer = await getCurrentMember({ create: false });
    const result = await getD1()
      .prepare("SELECT payload, author_profile_id FROM community_posts ORDER BY created_at DESC LIMIT 40")
      .all<StoredRow>();
    const posts = result.results.flatMap((row) => {
      try { return [{ ...JSON.parse(row.payload), ownedByViewer: Boolean(viewer && row.author_profile_id === viewer.id) }]; }
      catch { return []; }
    });
    if (!posts.length) return Response.json({ posts });
    const placeholders = posts.map(() => "?").join(",");
    const engagementRows = await getD1().prepare(`SELECT id, post_id, actor, action, content, created_at FROM engagements WHERE post_id IN (${placeholders}) ORDER BY created_at ASC`)
      .bind(...posts.map((post) => post.id)).all<EngagementRow>();
    const hydrated = posts.map((post) => {
      const activity = engagementRows.results.filter((item) => item.post_id === post.id);
      const comments = activity.filter((item) => item.action === "comment" && item.content).map((item) => ({
        id: `engagement-${item.id}`,
        author: item.actor,
        initials: item.actor.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "IN",
        role: "Innovestart member",
        body: item.content,
        time: relativeTime(item.created_at),
      }));
      return {
        ...post,
        likes: Number(post.likes ?? 0) + activity.filter((item) => item.action === "like").length,
        shares: Number(post.shares ?? 0) + activity.filter((item) => item.action === "share").length,
        comments: [...(Array.isArray(post.comments) ? post.comments : []), ...comments],
      };
    });
    return Response.json({ posts: hydrated });
  } catch {
    return Response.json({ posts: [] });
  }
}

export async function POST(request: Request) {
  try {
    const profile = await getCurrentMember();
    if (!profile) return Response.json({ error: "Sign in to publish." }, { status: 401 });
    if (!profile.onboardingComplete) return Response.json({ error: "Finish your profile before publishing." }, { status: 403 });
    const input = await request.json() as { headline?: string; body?: string; tags?: string[]; mediaAssetId?: string; mediaTitle?: string };
    const headline = input.headline?.trim().slice(0, 180);
    const body = input.body?.trim().slice(0, 1500);
    if (!headline || !body) return Response.json({ error: "A headline and update are required." }, { status: 400 });

    await ensureDatabase();
    const recent = await getD1().prepare("SELECT COUNT(*) AS count FROM community_posts WHERE author_profile_id = ? AND created_at >= ?")
      .bind(profile.id, Date.now() - 24 * 60 * 60 * 1000).first<{ count: number }>();
    if ((recent?.count ?? 0) >= 20) return Response.json({ error: "You have reached today’s publishing limit." }, { status: 429 });
    let media: MediaRow | null = null;
    if (input.mediaAssetId) {
      media = await getD1().prepare("SELECT id, owner_profile_id, r2_key, content_type FROM media_assets WHERE id = ? AND status = 'ready'")
        .bind(input.mediaAssetId).first<MediaRow>();
      if (!media || media.owner_profile_id !== profile.id) return Response.json({ error: "That media file does not belong to your account." }, { status: 403 });
    }

    const id = `post-${crypto.randomUUID()}`;
    const authorName = profile.role === "founder" && profile.company ? profile.company : profile.displayName;
    const mediaType = media ? (media.content_type.startsWith("video/") ? "video" : "image") : "none";
    const mediaUrl = media ? `/api/media/${media.id}` : "";
    const initials = authorName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "IN";
    const post = {
      id,
      startupId: profile.role === "founder" ? `member-${profile.id}` : "community",
      startup: authorName,
      logo: initials,
      logoColor: profile.role === "founder" ? "#ff6b4a" : "#4f6ff3",
      meta: `${profileTitle(profile)} · now`,
      headline,
      body,
      tags: Array.isArray(input.tags) ? input.tags.map((tag) => String(tag).trim().replace(/^#/, "").slice(0, 36)).filter(Boolean).slice(0, 8) : [],
      mediaType,
      mediaUrl,
      mediaAssetId: media?.id,
      poster: mediaType === "image" ? mediaUrl : "",
      mediaLabel: mediaType === "video" ? "MEMBER VIDEO · JUST NOW" : mediaType === "image" ? "MEMBER PHOTO · JUST NOW" : "",
      mediaTitle: input.mediaTitle?.trim().slice(0, 120) || headline,
      duration: mediaType === "video" ? "Play video" : undefined,
      likes: 0,
      shares: 0,
      comments: [],
      createdAt: Date.now(),
      ownedByViewer: true,
    };
    await getD1().prepare("INSERT INTO community_posts (id, author_profile_id, startup_id, media_asset_id, payload, created_at) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(id, profile.id, post.startupId, media?.id ?? null, JSON.stringify(post), Date.now()).run();
    return Response.json({ post }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to save this post." }, { status: 500 });
  }
}

function relativeTime(timestamp: number) {
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export async function DELETE(request: Request) {
  const profile = await getCurrentMember();
  if (!profile) return Response.json({ error: "Sign in to manage posts." }, { status: 401 });
  await ensureDatabase();
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "A post id is required." }, { status: 400 });
  const row = await getD1().prepare("SELECT author_profile_id, media_asset_id FROM community_posts WHERE id = ?")
    .bind(id).first<{ author_profile_id: string | null; media_asset_id: string | null }>();
  if (!row) return Response.json({ error: "Post not found." }, { status: 404 });
  if (row.author_profile_id !== profile.id) return Response.json({ error: "You can only delete your own posts." }, { status: 403 });
  if (row.media_asset_id) {
    const media = await getD1().prepare("SELECT r2_key FROM media_assets WHERE id = ? AND owner_profile_id = ?")
      .bind(row.media_asset_id, profile.id).first<{ r2_key: string }>();
    if (media) {
      const parts = await getD1().prepare("SELECT r2_key FROM media_parts WHERE asset_id = ? ORDER BY part_number").bind(row.media_asset_id).all<{ r2_key: string }>();
      await Promise.all(parts.results.map((part) => getMediaBucket().delete(part.r2_key)));
      await getD1().prepare("DELETE FROM media_parts WHERE asset_id = ?").bind(row.media_asset_id).run();
      await getD1().prepare("UPDATE media_assets SET status = 'deleted' WHERE id = ?").bind(row.media_asset_id).run();
    }
  }
  await getD1().prepare("DELETE FROM community_posts WHERE id = ? AND author_profile_id = ?").bind(id, profile.id).run();
  return Response.json({ ok: true });
}
