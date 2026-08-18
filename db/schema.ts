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
