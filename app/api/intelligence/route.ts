import { ensureDatabase, getD1 } from "../../../db";
import {
  calculateTam,
  investorForRecord,
  investorIntelligence,
  marketSources,
  MATCH_MODEL_METADATA,
  MATCH_MODEL_VERSION,
  recommendationsForFounder,
  recommendationsForInvestor,
  startupForRecord,
  startupIntelligence,
} from "../../intelligence";
import { getCurrentMember } from "../../server/member";

export async function GET() {
  const member = await getCurrentMember();
  if (!member) return Response.json({ error: "Sign in to use Innovestart Intelligence." }, { status: 401 });
  await ensureDatabase();
  const d1 = getD1();

  if (member.role === "investor") {
    const recommendations = recommendationsForInvestor(member.id, 18).map(({ startup, match }) => ({
      startup: startupForRecord(startup),
      intelligence: startup,
      match,
      market: calculateTam(startup),
    }));
    const pipeline = await d1.prepare("SELECT startup_id, stage, notes, updated_at FROM deal_pipeline WHERE investor_profile_id = ? ORDER BY updated_at DESC")
      .bind(member.id).all<{ startup_id: string; stage: string; notes: string; updated_at: number }>();
    const investor = investorIntelligence.find((item) => item.profileId === member.id) ?? investorIntelligence[0];
    return Response.json({
      role: member.role,
      model: modelSummary(),
      investor,
      recommendations,
      pipeline: pipeline.results.map((item) => ({ startupId: item.startup_id, stage: item.stage, notes: item.notes, updatedAt: item.updated_at })),
      marketSources,
    });
  }

  const recommendations = recommendationsForFounder(member.id, 18).map(({ investor, match }) => ({
    investor: investorForRecord(investor),
    intelligence: investor,
    match,
  }));
  const startup = startupIntelligence.find((item) => item.founderProfileId === member.id) ?? startupIntelligence[0];
  return Response.json({
    role: member.role,
    model: modelSummary(),
    startup,
    recommendations,
    tam: {
      bear: calculateTam(startup, "bear"),
      base: calculateTam(startup, "base"),
      bull: calculateTam(startup, "bull"),
    },
    marketSources,
  });
}

export async function POST(request: Request) {
  const member = await getCurrentMember();
  if (!member) return Response.json({ error: "Sign in to update Intelligence." }, { status: 401 });
  await ensureDatabase();
  const d1 = getD1();
  const input = await request.json() as {
    action?: "pipeline" | "event" | "tam";
    startupId?: string;
    investorProfileId?: string;
    stage?: "saved" | "reviewing" | "meeting" | "diligence" | "passed";
    eventType?: string;
    notes?: string;
    scenario?: "bear" | "base" | "bull";
  };
  const now = Date.now();

  if (input.action === "pipeline") {
    if (member.role !== "investor") return Response.json({ error: "Only investors can manage a deal pipeline." }, { status: 403 });
    const startup = startupIntelligence.find((item) => item.startupId === input.startupId);
    if (!startup) return Response.json({ error: "Startup not found." }, { status: 404 });
    const stage = input.stage ?? "saved";
    await d1.prepare("INSERT INTO deal_pipeline (id, investor_profile_id, startup_id, stage, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(investor_profile_id, startup_id) DO UPDATE SET stage = excluded.stage, notes = excluded.notes, updated_at = excluded.updated_at")
      .bind(`pipeline-${member.id}-${startup.startupId}`, member.id, startup.startupId, stage, input.notes?.trim().slice(0, 500) ?? "", now, now).run();
    await recordEvent(d1, member.id, startup.startupId, null, stage === "passed" ? "pass" : "save", now, { pipelineStage: stage });
    return Response.json({ ok: true, startupId: startup.startupId, stage });
  }

  if (input.action === "tam") {
    const startup = startupIntelligence.find((item) => item.startupId === input.startupId || item.founderProfileId === member.id);
    if (!startup) return Response.json({ error: "Startup not found." }, { status: 404 });
    if (member.role === "founder" && startup.founderProfileId !== member.id) return Response.json({ error: "Founders can only save analysis for their own startup." }, { status: 403 });
    const analysis = calculateTam(startup, input.scenario ?? "base");
    const id = `tam-${crypto.randomUUID()}`;
    await d1.prepare("INSERT INTO tam_analyses (id, owner_profile_id, startup_id, sector, scenario, tam_cr, sam_cr, som_cr, assumptions_json, source_ids_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(id, member.id, startup.startupId, startup.sector, analysis.scenario, analysis.tamCr, analysis.samCr, analysis.somCr, JSON.stringify({ formula: analysis.formula, serviceableRate: analysis.serviceableRate, obtainableRate: analysis.obtainableRate }), JSON.stringify([analysis.source.id]), now).run();
    return Response.json({ id, analysis });
  }

  if (input.action === "event") {
    const eventType = input.eventType?.trim().slice(0, 40);
    if (!eventType) return Response.json({ error: "Event type is required." }, { status: 400 });
    await recordEvent(d1, member.id, input.startupId ?? null, input.investorProfileId ?? null, eventType, now, {});
    return Response.json({ ok: true });
  }

  return Response.json({ error: "Unsupported Intelligence action." }, { status: 400 });
}

function modelSummary() {
  return {
    version: MATCH_MODEL_VERSION,
    algorithm: MATCH_MODEL_METADATA.algorithm,
    trainingPairs: startupIntelligence.length * investorIntelligence.length,
    profiles: startupIntelligence.length + investorIntelligence.length,
    validation: MATCH_MODEL_METADATA.metrics,
    explainable: true,
  };
}

async function recordEvent(d1: ReturnType<typeof getD1>, actorProfileId: string, startupId: string | null, investorProfileId: string | null, eventType: string, createdAt: number, metadata: Record<string, unknown>) {
  await d1.prepare("INSERT INTO interaction_events (id, actor_profile_id, startup_id, investor_profile_id, event_type, value, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)")
    .bind(`event-${crypto.randomUUID()}`, actorProfileId, startupId, investorProfileId, eventType, JSON.stringify(metadata), createdAt).run();
}
