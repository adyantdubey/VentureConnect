import { ensureDatabase, getD1 } from "../../../db";

const allowedActions = new Set(["like", "save", "share", "comment"]);

export async function GET(request: Request) {
  try {
    await ensureDatabase();
    const url = new URL(request.url);
    const postId = url.searchParams.get("postId");
    if (!postId) return Response.json({ error: "postId is required" }, { status: 400 });
    const counts = await getD1()
      .prepare("SELECT action, COUNT(*) AS count FROM engagements WHERE post_id = ? GROUP BY action")
      .bind(postId)
      .all<{ action: string; count: number }>();
    const comments = await getD1()
      .prepare("SELECT id, actor, content, created_at AS createdAt FROM engagements WHERE post_id = ? AND action = 'comment' ORDER BY created_at ASC LIMIT 100")
      .bind(postId)
      .all();
    return Response.json({ counts: counts.results, comments: comments.results });
  } catch {
    return Response.json({ counts: [], comments: [] });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json() as { postId?: string; action?: string; actor?: string; content?: string };
    if (!payload.postId || !payload.action || !allowedActions.has(payload.action)) {
      return Response.json({ error: "A valid postId and action are required." }, { status: 400 });
    }
    if (payload.action === "comment" && !payload.content?.trim()) {
      return Response.json({ error: "A comment cannot be empty." }, { status: 400 });
    }
    await ensureDatabase();
    const result = await getD1()
      .prepare("INSERT INTO engagements (post_id, actor, action, content, created_at) VALUES (?, ?, ?, ?, ?)")
      .bind(payload.postId, (payload.actor ?? "Innovestart member").slice(0, 120), payload.action, payload.content?.trim().slice(0, 1500) ?? null, Date.now())
      .run();
    return Response.json({ ok: true, id: result.meta.last_row_id }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to record this action." }, { status: 500 });
  }
}
