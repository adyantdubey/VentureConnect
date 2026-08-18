import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function request(pathname = "/", headers = {}) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${Math.random()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html", ...headers },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the public Innovestart discovery experience", async () => {
  const response = await request();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /Innovestart home/i);
  assert.match(html, /Meet the people building what’s next\./i);
  assert.match(html, /Search startups, sectors/i);
  assert.match(html, /EmberGrid/);
  assert.match(html, />Checking…</);
  assert.doesNotMatch(html, /Your site is taking shape|Building your site/);
});

test("protects member APIs when no Supabase session is supplied", async () => {
  const profileRoute = await readFile(new URL("../app/api/profile/route.ts", import.meta.url), "utf8");
  assert.match(profileRoute, /getCurrentMember\(\)/);
  assert.match(profileRoute, /if \(!profile\).*status:\s*401/);
  assert.match(profileRoute, /Sign in to continue\./);
});

test("uses Supabase email/password auth end to end", async () => {
  const [client, server, member, app, packageJson] = await Promise.all([
    readFile(new URL("../app/supabase-client.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/supabase-auth.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/server/member.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/innovestart-app.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(packageJson, /"@supabase\/supabase-js"/);
  assert.match(client, /persistSession:\s*true/);
  assert.match(client, /autoRefreshToken:\s*true/);
  assert.match(client, /authorization.*Bearer/i);
  assert.match(server, /auth\.getUser\(accessToken\)/);
  assert.match(server, /userId:\s*`supabase:\$\{user\.id\}`/);
  assert.match(member, /getSupabaseUser/);

  assert.match(app, /auth\.signUp/);
  assert.match(app, /auth\.signInWithPassword/);
  assert.match(app, /auth\.resetPasswordForEmail/);
  assert.match(app, /auth\.updateUser/);
  assert.match(app, /PASSWORD_RECOVERY/);
  assert.match(app, /authenticatedFetch\("\/api\/posts"/);
  assert.match(app, /request\.setRequestHeader\("authorization"/);

  assert.doesNotMatch(`${client}\n${server}`, /service[_-]?role/i);
});

test("ships the expanded demo network and interaction foundations", async () => {
  const [data, app, messages, meetings, calls, schema] = await Promise.all([
    readFile(new URL("../app/synthetic-data.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/innovestart-app.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/messages/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/meetings/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/calls/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
  ]);

  assert.match(data, /startupSeeds = \[/);
  assert.equal((data.match(/^  \["[a-z]/gm) ?? []).length, 50);
  assert.match(data, /length: 200/);
  assert.match(data, /export const videoPosts: Post\[\] = startups\.map/);
  assert.match(data, /Photo by Pexels · synthetic company/);

  assert.match(app, /function ReelsView/);
  assert.match(app, /className="media-wrap inline-video"/);
  assert.match(app, /All locations/);
  assert.match(app, /function InvestorProfileModal/);
  assert.match(app, /function CallModal/);
  assert.match(messages, /score >= 2 \? "primary" : score === 1 \? "secondary" : "request"/);
  assert.match(messages, /member\.role === "investor" \? "primary"/);
  assert.match(meetings, /status = 'booked'.*status = 'open'/s);
  assert.match(calls, /offer_json/);
  assert.match(schema, /callCandidates/);
});
