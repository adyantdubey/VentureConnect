import {
  clearDemoSessionCookie,
  createDemoSession,
  DEMO_ACCOUNTS,
  deleteDemoSession,
  demoSessionCookie,
  DEMO_SESSION_COOKIE,
  findDemoAccount,
  readCookie,
} from "../../server/demo-accounts";

function json(payload: unknown, status = 200, cookie?: string) {
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  if (cookie) headers.append("set-cookie", cookie);
  return new Response(JSON.stringify(payload), { status, headers });
}

export async function GET() {
  return json({
    accounts: DEMO_ACCOUNTS.map((account) => ({
      id: account.id,
      email: account.email,
      password: account.password,
      displayName: account.displayName,
      role: account.role,
      headline: account.headline,
      company: account.company,
      scenario: account.scenario,
      featured: account.featured,
    })),
  });
}

export async function POST(request: Request) {
  let body: { email?: unknown; password?: unknown };
  try {
    body = await request.json() as typeof body;
  } catch {
    return json({ demo: false, error: "Invalid sign-in request." }, 400);
  }

  const email = typeof body.email === "string" ? body.email : "";
  const password = typeof body.password === "string" ? body.password : "";
  const account = findDemoAccount(email);
  if (!account) return json({ demo: false }, 404);
  if (password !== account.password) return json({ demo: true, error: "Incorrect demo password." }, 401);

  const { token, expiresAt } = await createDemoSession(account);
  const secure = new URL(request.url).protocol === "https:";
  return json(
    { demo: true, profileId: account.id, role: account.role, expiresAt },
    200,
    demoSessionCookie(token, secure),
  );
}

export async function DELETE(request: Request) {
  const token = readCookie(request.headers.get("cookie"), DEMO_SESSION_COOKIE);
  await deleteDemoSession(token);
  const secure = new URL(request.url).protocol === "https:";
  return json({ ok: true }, 200, clearDemoSessionCookie(secure));
}
