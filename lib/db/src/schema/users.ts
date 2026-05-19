import { pgTable, text, varchar, timestamp, jsonb, index, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable(
  "bb_users",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    email: varchar("email", { length: 255 }).notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    fullName: varchar("full_name", { length: 200 }).notNull(),
    role: varchar("role", { length: 20 }).notNull().default("customer"),
    isVerified: boolean("is_verified").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    lastLogin: timestamp("last_login", { withTimezone: true }),
  },
  (t) => [
    index("IDX_bb_users_email").on(t.email),
    index("IDX_bb_users_role").on(t.role),
  ],
);

export const sessionsTable = pgTable(
  "bb_sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire", { precision: 6 }).notNull(),
  },
  (t) => [index("IDX_bb_sessions_expire").on(t.expire)],
);

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  passwordHash: true,
  isVerified: true,
  createdAt: true,
  updatedAt: true,
  lastLogin: true,
});

export const signupSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(8).max(200),
  fullName: z.string().min(1).max(200).trim(),
  role: z.enum(["customer", "jeweller"]).default("customer"),
});

export const loginSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1).max(200),
  expectedRole: z.enum(["customer", "jeweller"]).optional(),
});

export const directPasswordResetSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(8).max(200),
  expectedRole: z.enum(["customer", "jeweller"]).optional(),
});

export type User = typeof usersTable.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type DirectPasswordResetInput = z.infer<typeof directPasswordResetSchema>;
