import { ensureDatabase, getD1 } from "../../../db";
import { getCurrentMember } from "../../server/member";

export async function GET() {
  const profile = await getCurrentMember();
  if (!profile) return Response.json({ error: "Sign in to continue." }, { status: 401 });
  return Response.json({ profile });
}

export async function PATCH(request: Request) {
  const profile = await getCurrentMember();
  if (!profile) return Response.json({ error: "Sign in to continue." }, { status: 401 });

  const payload = await request.json() as {
    displayName?: string;
    role?: "investor" | "founder";
    headline?: string;
    company?: string;
    bio?: string;
    sectors?: string[];
    stages?: string[];
    locations?: string[];
  };
  const displayName = payload.displayName?.trim().slice(0, 80);
  const role = payload.role === "investor" || payload.role === "founder" ? payload.role : null;
  if (!displayName || !role) {
    return Response.json({ error: "Your name and member type are required." }, { status: 400 });
  }

  await ensureDatabase();
  const sectors = cleanList(payload.sectors);
  const stages = cleanList(payload.stages);
  const locations = cleanList(payload.locations);
  await getD1().prepare("UPDATE profiles SET display_name = ?, role = ?, headline = ?, company = ?, bio = ?, sectors_json = ?, stages_json = ?, locations_json = ?, onboarding_complete = 1, updated_at = ? WHERE id = ?")
    .bind(
      displayName,
      role,
      payload.headline?.trim().slice(0, 120) ?? "",
      payload.company?.trim().slice(0, 100) ?? "",
      payload.bio?.trim().slice(0, 600) ?? "",
      JSON.stringify(sectors),
      JSON.stringify(stages),
      JSON.stringify(locations),
      Date.now(),
      profile.id,
    )
    .run();
  if (role === "founder" && payload.company?.trim()) {
    await getD1().prepare("INSERT INTO startups (id, owner_profile_id, name, sector, stage, location, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name, sector = excluded.sector, stage = excluded.stage, location = excluded.location, description = excluded.description")
      .bind(`member-${profile.id}`, profile.id, payload.company.trim().slice(0, 100), sectors[0] ?? "Other", stages[0] ?? "Pre-seed", locations[0] ?? "India", payload.bio?.trim().slice(0, 600) ?? "", Date.now()).run();
  }

  return Response.json({
    profile: {
      ...profile,
      displayName,
      role,
      headline: payload.headline?.trim().slice(0, 120) ?? "",
      company: payload.company?.trim().slice(0, 100) ?? "",
      bio: payload.bio?.trim().slice(0, 600) ?? "",
      sectors,
      stages,
      locations,
      onboardingComplete: true,
    },
  });
}

function cleanList(value?: string[]) {
  return Array.isArray(value) ? value.map((item) => String(item).trim().slice(0, 60)).filter(Boolean).slice(0, 12) : [];
}
