import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const profiles = sqliteTable("profiles", {
  id: text("id").primaryKey(),
  googleSubject: text("google_subject"),
  email: text("email"),
  displayName: text("display_name").notNull(),
  role: text("role", { enum: ["investor", "founder"] }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
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
  payload: text("payload").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}, (table) => [index("idx_community_posts_created_at").on(table.createdAt)]);

export const engagements = sqliteTable("engagements", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  postId: text("post_id").notNull(),
  actor: text("actor").notNull(),
  action: text("action", { enum: ["like", "save", "share", "comment"] }).notNull(),
  content: text("content"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}, (table) => [index("idx_engagements_post_action").on(table.postId, table.action)]);

export const follows = sqliteTable("follows", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  profileId: text("profile_id").notNull(),
  startupId: text("startup_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}, (table) => [uniqueIndex("idx_follows_profile_startup").on(table.profileId, table.startupId)]);
