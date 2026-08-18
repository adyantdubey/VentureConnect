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
  assert.match(html, /Search investors, companies/i);
  assert.match(html, /EmberGrid/);
  assert.match(html, />Checking…</);
  assert.doesNotMatch(html, /Your site is taking shape|Building your site/);
});

test("protects member APIs when no demo session is supplied", async () => {
  const profileRoute = await readFile(new URL("../app/api/profile/route.ts", import.meta.url), "utf8");
  assert.match(profileRoute, /getCurrentMember\(\)/);
  assert.match(profileRoute, /if \(!profile\).*status:\s*401/);
  assert.match(profileRoute, /Sign in to continue\./);
});

test("uses 50 signable demo identities with expiring server sessions", async () => {
  const [client, member, app, logins, accounts, route, schema] = await Promise.all([
    readFile(new URL("../app/supabase-client.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/server/member.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/innovestart-app.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/demo-logins.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/server/demo-accounts.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/demo-auth/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
  ]);

  assert.match(logins, /founder@innovestart\.demo/);
  assert.match(logins, /investor@innovestart\.demo/);
  assert.match(accounts, /demoMembers\.map/);
  assert.match(accounts, /demoEmailFor/);
  assert.match(accounts, /demoPasswordFor/);
  assert.match(accounts, /scenario:/);
  assert.match(route, /accounts: DEMO_ACCOUNTS\.map/);
  assert.match(accounts, /crypto\.subtle\.digest\("SHA-256"/);
  assert.match(accounts, /HttpOnly; SameSite=Lax/);
  assert.match(route, /createDemoSession/);
  assert.match(route, /Incorrect demo password/);
  assert.match(member, /DEMO_SESSION_COOKIE/);
  assert.match(member, /demo_sessions s INNER JOIN profiles/);
  assert.match(schema, /demoSessions/);
  assert.match(client, /credentials: "same-origin"/);

  assert.doesNotMatch(app, /supabase\.auth/);
  assert.doesNotMatch(app, /Create account/);
  assert.match(app, /authenticatedFetch\("\/api\/posts"/);
  assert.match(app, /All 50 identities use expiring HttpOnly sessions/);
});

test("ships the role-aware network, reciprocal ranking, TAM and interaction foundations", async () => {
  const [data, app, messages, meetings, calls, schema, intelligence, intelligenceApi, database] = await Promise.all([
    readFile(new URL("../app/synthetic-data.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/innovestart-app.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/messages/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/meetings/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/calls/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/intelligence.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/intelligence/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/index.ts", import.meta.url), "utf8"),
  ]);

  assert.match(data, /startupSeeds = \[/);
  assert.equal((data.match(/^ {2}\["[a-z]/gm) ?? []).length, 50);
  assert.match(data, /length: 200/);
  assert.match(data, /export const videoPosts: Post\[\] = startups\.map/);
  assert.match(data, /export const pexelsVideoCatalog/);
  assert.equal((data.match(/mediaUrl: "https:\/\/videos\.pexels\.com\/video-files\//g) ?? []).length, 30);
  assert.equal((data.match(/sourceUrl: "https:\/\/www\.pexels\.com\/video\//g) ?? []).length, 30);
  assert.match(data, /Photo by Pexels · synthetic company/);

  assert.match(app, /function ReelsView/);
  assert.match(app, /function ReelVideo/);
  assert.match(app, /IntersectionObserver/);
  assert.match(app, /muted=\{muted\} loop autoPlay/);
  assert.match(app, /className="media-wrap inline-video"/);
  assert.doesNotMatch(app, /<select/);
  assert.match(app, /function ChoiceMenu/);
  assert.match(app, /function InvestorProfileModal/);
  assert.match(app, /function IntelligenceView/);
  assert.match(app, /ROLE-AWARE NETWORK/);
  assert.match(app, /INVESTMENT THESIS/);
  assert.match(app, /RECIPROCAL INVESTOR FIT/);
  assert.match(app, /function CallModal/);
  assert.match(app, /new RTCPeerConnection/);
  assert.match(app, /stun:stun\.l\.google\.com:19302/);
  assert.match(messages, /matchByProfileIds/);
  assert.match(messages, /member\.role === "investor"/);
  assert.match(messages, /modelMatch\.inboxTier/);
  assert.match(messages, /routing_model_version/);
  assert.match(meetings, /status = 'booked'.*status = 'open'/s);
  assert.match(calls, /offer_json/);
  assert.match(schema, /callCandidates/);
  assert.match(schema, /matchScores/);
  assert.match(schema, /dealPipeline/);
  assert.match(schema, /tamAnalyses/);
  assert.match(intelligence, /MATCH_MODEL_VERSION = "innovestart-match-v1\.0"/);
  assert.match(intelligence, /function textSimilarity/);
  assert.match(intelligence, /const sigmoid =/);
  assert.match(intelligence, /Math\.sqrt\(\(investorProbability \/ 100\) \* founderUtility\)/);
  assert.match(intelligence, /calculateTam/);
  assert.match(intelligenceApi, /recommendationsForInvestor/);
  assert.match(intelligenceApi, /recommendationsForFounder/);
  assert.match(intelligenceApi, /Only investors can manage a deal pipeline/);
  assert.match(database, /MATCH_MODEL_METADATA\.metrics/);
});

test("locks account roles after onboarding and exposes transparent market sources", async () => {
  const [profileRoute, intelligence, model, trainer, packageJson] = await Promise.all([
    readFile(new URL("../app/api/profile/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/intelligence.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/match-model.json", import.meta.url), "utf8"),
    readFile(new URL("../scripts/train-match-model.mjs", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);
  assert.match(profileRoute, /Account roles are fixed after onboarding/);
  assert.match(profileRoute, /status: 403/);
  assert.match(intelligence, /Reserve Bank of India/);
  assert.match(intelligence, /Ministry of New and Renewable Energy/);
  assert.match(intelligence, /Ministry of MSME/);
  assert.match(intelligence, /confidence:/);
  const artifact = JSON.parse(model);
  assert.equal(artifact.metrics.trainPairs + artifact.metrics.validationPairs, 600);
  assert.ok(artifact.metrics.auc > .9);
  assert.deepEqual(Object.keys(artifact.metrics.tierDistribution), ["primary", "secondary", "request"]);
  assert.match(trainer, /2_400/);
  assert.match(trainer, /L2/);
  assert.match(packageJson, /"ml:train"/);
});
