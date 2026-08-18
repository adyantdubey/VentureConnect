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
  };
  const displayName = payload.displayName?.trim().slice(0, 80);
  const role = payload.role === "investor" || payload.role === "founder" ? payload.role : null;
  if (!displayName || !role) {
    return Response.json({ error: "Your name and member type are required." }, { status: 400 });
  }

  await ensureDatabase();
  await getD1().prepare("UPDATE profiles SET display_name = ?, role = ?, headline = ?, company = ?, bio = ?, onboarding_complete = 1, updated_at = ? WHERE id = ?")
    .bind(
      displayName,
      role,
      payload.headline?.trim().slice(0, 120) ?? "",
      payload.company?.trim().slice(0, 100) ?? "",
      payload.bio?.trim().slice(0, 600) ?? "",
      Date.now(),
      profile.id,
    )
    .run();

  return Response.json({
    profile: {
      ...profile,
      displayName,
      role,
      headline: payload.headline?.trim().slice(0, 120) ?? "",
      company: payload.company?.trim().slice(0, 100) ?? "",
      bio: payload.bio?.trim().slice(0, 600) ?? "",
      onboardingComplete: true,
    },
  });
}
