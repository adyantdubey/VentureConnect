import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const profiles = sqliteTable("profiles", {
  id: text("id").primaryKey(),
  googleSubject: text("google_subject"),
  email: text("email"),
  displayName: text("display_name").notNull(),
  role: text("role", { enum: ["investor", "founder"] }).notNull(),
  headline: text("headline").notNull().default(""),
  company: text("company").notNull().default(""),
  bio: text("bio").notNull().default(""),
  avatarColor: text("avatar_color").notNull().default("#5567d8"),
  sectorsJson: text("sectors_json").notNull().default("[]"),
  stagesJson: text("stages_json").notNull().default("[]"),
  locationsJson: text("locations_json").notNull().default("[]"),
  portfolioStartupIdsJson: text("portfolio_startup_ids_json").notNull().default("[]"),
  onboardingComplete: integer("onboarding_complete", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
}, (table) => [uniqueIndex("idx_profiles_google_subject").on(table.googleSubject)]);

export const startupRecords = sqliteTable("startups", {
  id: text("id").primaryKey(),
  ownerProfileId: text("owner_profile_id").references(() => profiles.id),
  name: text("name").notNull(),
  sector: text("sector").notNull(),
  stage: text("stage").notNull(),
  location: text("location").notNull(),
  description: text("description").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}, (table) => [index("idx_startups_sector_stage").on(table.sector, table.stage)]);

export const communityPosts = sqliteTable("community_posts", {
  id: text("id").primaryKey(),
  authorProfileId: text("author_profile_id").references(() => profiles.id),
  startupId: text("startup_id"),
  mediaAssetId: text("media_asset_id"),
  payload: text("payload").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}, (table) => [
  index("idx_community_posts_created_at").on(table.createdAt),
  index("idx_community_posts_author_created").on(table.authorProfileId, table.createdAt),
]);

export const engagements = sqliteTable("engagements", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  postId: text("post_id").notNull(),
  actorProfileId: text("actor_profile_id").references(() => profiles.id),
  actor: text("actor").notNull(),
  action: text("action", { enum: ["like", "save", "share", "comment"] }).notNull(),
  content: text("content"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}, (table) => [
  index("idx_engagements_post_action").on(table.postId, table.action),
  index("idx_engagements_actor_action").on(table.actorProfileId, table.action),
]);

export const mediaAssets = sqliteTable("media_assets", {
  id: text("id").primaryKey(),
  ownerProfileId: text("owner_profile_id").notNull().references(() => profiles.id),
  r2Key: text("r2_key").notNull(),
  fileName: text("file_name").notNull(),
  contentType: text("content_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  uploadedBytes: integer("uploaded_bytes").notNull().default(0),
  chunkCount: integer("chunk_count").notNull().default(0),
  status: text("status", { enum: ["uploading", "ready", "deleted"] }).notNull().default("uploading"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}, (table) => [
  uniqueIndex("idx_media_assets_r2_key").on(table.r2Key),
  index("idx_media_assets_owner_created").on(table.ownerProfileId, table.createdAt),
]);

export const mediaParts = sqliteTable("media_parts", {
  assetId: text("asset_id").notNull().references(() => mediaAssets.id),
  partNumber: integer("part_number").notNull(),
  r2Key: text("r2_key").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}, (table) => [
  uniqueIndex("idx_media_parts_asset_part").on(table.assetId, table.partNumber),
]);

export const follows = sqliteTable("follows", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  profileId: text("profile_id").notNull(),
  startupId: text("startup_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}, (table) => [uniqueIndex("idx_follows_profile_startup").on(table.profileId, table.startupId)]);

export const conversations = sqliteTable("conversations", {
  id: text("id").primaryKey(),
  founderProfileId: text("founder_profile_id").notNull().references(() => profiles.id),
  investorProfileId: text("investor_profile_id").notNull().references(() => profiles.id),
  inboxTier: text("inbox_tier", { enum: ["primary", "secondary", "request"] }).notNull().default("request"),
  lastMessageAt: integer("last_message_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}, (table) => [
  uniqueIndex("idx_conversations_pair").on(table.founderProfileId, table.investorProfileId),
  index("idx_conversations_founder_latest").on(table.founderProfileId, table.lastMessageAt),
  index("idx_conversations_investor_tier_latest").on(table.investorProfileId, table.inboxTier, table.lastMessageAt),
]);

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id").notNull().references(() => conversations.id),
  senderProfileId: text("sender_profile_id").notNull().references(() => profiles.id),
  recipientProfileId: text("recipient_profile_id").notNull().references(() => profiles.id),
  body: text("body").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  readAt: integer("read_at", { mode: "timestamp" }),
}, (table) => [
  index("idx_messages_conversation_created").on(table.conversationId, table.createdAt),
  index("idx_messages_recipient_read").on(table.recipientProfileId, table.readAt),
]);

export const availabilitySlots = sqliteTable("availability_slots", {
  id: text("id").primaryKey(),
  investorProfileId: text("investor_profile_id").notNull().references(() => profiles.id),
  startsAt: integer("starts_at", { mode: "timestamp" }).notNull(),
  endsAt: integer("ends_at", { mode: "timestamp" }).notNull(),
  status: text("status", { enum: ["open", "booked", "cancelled"] }).notNull().default("open"),
  bookedByProfileId: text("booked_by_profile_id").references(() => profiles.id),
}, (table) => [
  uniqueIndex("idx_availability_investor_start").on(table.investorProfileId, table.startsAt),
  index("idx_availability_status_start").on(table.status, table.startsAt),
]);

export const meetings = sqliteTable("meetings", {
  id: text("id").primaryKey(),
  slotId: text("slot_id").notNull().references(() => availabilitySlots.id),
  organizerProfileId: text("organizer_profile_id").notNull().references(() => profiles.id),
  investorProfileId: text("investor_profile_id").notNull().references(() => profiles.id),
  conversationId: text("conversation_id").references(() => conversations.id),
  notes: text("notes").notNull().default(""),
  status: text("status", { enum: ["scheduled", "cancelled", "completed"] }).notNull().default("scheduled"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}, (table) => [
  uniqueIndex("idx_meetings_slot").on(table.slotId),
  index("idx_meetings_organizer_created").on(table.organizerProfileId, table.createdAt),
]);

export const callSessions = sqliteTable("call_sessions", {
  id: text("id").primaryKey(),
  callerProfileId: text("caller_profile_id").notNull().references(() => profiles.id),
  calleeProfileId: text("callee_profile_id").notNull().references(() => profiles.id),
  conversationId: text("conversation_id").references(() => conversations.id),
  mode: text("mode", { enum: ["voice", "video"] }).notNull(),
  status: text("status", { enum: ["ringing", "active", "declined", "ended"] }).notNull().default("ringing"),
  offerJson: text("offer_json"),
  answerJson: text("answer_json"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
}, (table) => [
  index("idx_call_sessions_callee_status").on(table.calleeProfileId, table.status, table.updatedAt),
]);

export const callCandidates = sqliteTable("call_candidates", {
  id: text("id").primaryKey(),
  callId: text("call_id").notNull().references(() => callSessions.id),
  profileId: text("profile_id").notNull().references(() => profiles.id),
  candidateJson: text("candidate_json").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}, (table) => [index("idx_call_candidates_call_created").on(table.callId, table.createdAt)]);
