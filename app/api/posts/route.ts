import { ensureDatabase, getD1 } from "../../../db";

type StoredRow = { payload: string };

export async function GET() {
  try {
    await ensureDatabase();
    const result = await getD1()
      .prepare("SELECT payload FROM community_posts ORDER BY created_at DESC LIMIT 20")
      .all<StoredRow>();
    const posts = result.results.flatMap((row) => {
      try { return [JSON.parse(row.payload)]; } catch { return []; }
    });
    return Response.json({ posts });
  } catch {
    return Response.json({ posts: [] });
  }
}

export async function POST(request: Request) {
  try {
    const post = await request.json() as { id?: string; startupId?: string; startup?: string; headline?: string; body?: string };
    if (!post.id || !post.headline?.trim() || !post.body?.trim()) {
      return Response.json({ error: "A post id, headline, and body are required." }, { status: 400 });
    }
    await ensureDatabase();
    await getD1()
      .prepare("INSERT OR REPLACE INTO community_posts (id, author_profile_id, startup_id, payload, created_at) VALUES (?, ?, ?, ?, ?)")
      .bind(post.id, null, post.startupId ?? null, JSON.stringify(post), Date.now())
      .run();
    return Response.json({ post }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to save this post." }, { status: 500 });
  }
}
