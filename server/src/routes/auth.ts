import { Router, type IRouter, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import {
  db,
  pool,
  directPasswordResetSchema,
  loginSchema,
  signupSchema,
  usersTable,
  type User,
} from "@workspace/db";
import { z } from "zod";

declare module "express-session" {
  interface SessionData {
    userId?: string;
    role?: string;
    email?: string;
  }
}

const router: IRouter = Router();
const PASSWORD_HASH_ROUNDS = 12;

function publicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
  };
}

function publicSessionCustomer(req: Request) {
  return {
    id: req.session.customerProjectId || "customer",
    email: req.session.email || "",
    fullName: req.session.customerName || "Customer",
    role: "customer",
    accessCode: req.session.customerAccessCode,
  };
}

function createSession(req: Request, res: Response, user: User, status = 200) {
  req.session.regenerate((err) => {
    if (err) {
      res.status(500).json({ error: "Could not establish session" });
      return;
    }

    req.session.userId = user.id;
    req.session.role = user.role;
    req.session.email = user.email;
    res.status(status).json(publicUser(user));
  });
}

router.post("/auth/signup", async (req, res): Promise<void> => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }

  const { email, password, fullName, role } = parsed.data;

  try {
    const [existing] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (existing?.isVerified) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, PASSWORD_HASH_ROUNDS);

    if (existing) {
      const [user] = await db
        .update(usersTable)
        .set({
          fullName,
          role,
          passwordHash,
          isVerified: true,
          updatedAt: new Date(),
        })
        .where(eq(usersTable.id, existing.id))
        .returning();

      createSession(req, res, user, 201);
      return;
    }

    const [user] = await db
      .insert(usersTable)
      .values({
        email,
        fullName,
        role,
        passwordHash,
        isVerified: true,
      })
      .returning();

    createSession(req, res, user, 201);
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Signup failed" });
  }
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }

  const { email, password, expectedRole } = parsed.data;

  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    if (expectedRole && user.role !== expectedRole) {
      res.status(403).json({
        error: expectedRole === "customer"
          ? "This is a jeweller account. Use Jeweller login."
          : "This is a customer account. Use Customer login.",
      });
      return;
    }

    const [updatedUser] = await db
      .update(usersTable)
      .set({ lastLogin: new Date(), isVerified: true, updatedAt: new Date() })
      .where(eq(usersTable.id, user.id))
      .returning();

    createSession(req, res, updatedUser);
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

router.post("/auth/password/reset-direct", async (req, res): Promise<void> => {
  const parsed = directPasswordResetSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }

  const { email, password, expectedRole } = parsed.data;

  try {
    const passwordHash = await bcrypt.hash(password, PASSWORD_HASH_ROUNDS);
    const [user] = await db
      .update(usersTable)
      .set({
        passwordHash,
        isVerified: true,
        updatedAt: new Date(),
      })
      .where(eq(usersTable.email, email))
      .returning();

    if (!user) {
      res.status(404).json({ error: "Account not found" });
      return;
    }

    if (expectedRole && user.role !== expectedRole) {
      res.status(403).json({
        error: expectedRole === "customer"
          ? "This is a jeweller account. Use Jeweller login."
          : "This is a customer account. Use Customer login.",
      });
      return;
    }

    createSession(req, res, user);
  } catch (err) {
    console.error("Direct password reset error:", err);
    res.status(500).json({ error: "Password reset failed" });
  }
});

const updateProfileSchema = z.object({
  fullName: z.preprocess(v => (v === '' ? undefined : v), z.string().min(1).max(200).trim().optional()),
  email: z.preprocess(v => (v === '' ? undefined : v), z.string().email().max(255).optional()),
  studio: z.preprocess(v => (v === '' ? undefined : v), z.string().max(200).optional()),
  phone: z.preprocess(v => (v === '' ? undefined : v), z.string().max(80).optional()),
});

let profileColumnsReady: Promise<void> | null = null;
async function ensureProfileColumns() {
  if (!profileColumnsReady) {
    profileColumnsReady = pool.query(`
      alter table bb_users
        add column if not exists studio varchar(200),
        add column if not exists phone varchar(80);
    `).catch((err: unknown) => {
      profileColumnsReady = null;
      throw err;
    });
  }
  return profileColumnsReady;
}

router.get("/auth/profile", async (req, res): Promise<void> => {
  if (!req.session.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  try {
    let u: Record<string, unknown> | undefined;
    try {
      await ensureProfileColumns();
      const { rows } = await pool.query(
        "select id, email, full_name, role, studio, phone from bb_users where id = $1 limit 1",
        [req.session.userId],
      );
      u = rows[0];
    } catch {
      // Fallback: studio/phone columns may not exist yet
      const { rows } = await pool.query(
        "select id, email, full_name, role from bb_users where id = $1 limit 1",
        [req.session.userId],
      );
      u = rows[0];
    }
    if (!u) { res.status(404).json({ error: "User not found" }); return; }
    res.json({ profile: { id: u["id"], email: u["email"], fullName: u["full_name"], role: u["role"], studio: (u["studio"] as string) || "", phone: (u["phone"] as string) || "" } });
  } catch (err) {
    console.error("Profile fetch error:", err);
    res.status(500).json({ error: "Failed to load profile" });
  }
});

router.patch("/auth/profile", async (req, res): Promise<void> => {
  if (!req.session.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }
  const fields = parsed.data;
  if (Object.keys(fields).length === 0) {
    res.status(400).json({ error: "No fields provided" });
    return;
  }
  // Helper: build parameterised SET clause from a list of [col, value] pairs
  function buildUpdate(pairs: [string, unknown][], userId: string, withExtraCols = false) {
    const clauses = pairs.map(([col], i) => `${col} = $${i + 1}`);
    clauses.push(`updated_at = now()`);
    const values = [...pairs.map(([, v]) => v), userId];
    const ret = withExtraCols
      ? "id, email, full_name, role, studio, phone"
      : "id, email, full_name, role";
    const sql = `update bb_users set ${clauses.join(", ")} where id = $${pairs.length + 1} returning ${ret}`;
    return { sql, values };
  }

  // Base pairs (core columns that always exist)
  const basePairs: [string, unknown][] = [];
  if (fields.fullName !== undefined) basePairs.push(["full_name", fields.fullName]);
  if (fields.email !== undefined) basePairs.push(["email", fields.email]);

  // Extra pairs (columns added via ensureProfileColumns)
  const extraPairs: [string, unknown][] = [];
  if (fields.studio) extraPairs.push(["studio", fields.studio]);
  if (fields.phone) extraPairs.push(["phone", fields.phone]);

  const allPairs = [...basePairs, ...extraPairs];
  if (allPairs.length === 0) { res.status(400).json({ error: "No fields to update" }); return; }

  try {
    if (extraPairs.length > 0) await ensureProfileColumns();

    let u: Record<string, unknown> | undefined;
    try {
      const { sql, values } = buildUpdate(allPairs, req.session.userId!, extraPairs.length > 0);
      const { rows } = await pool.query(sql, values);
      u = rows[0];
    } catch {
      // Columns might not exist yet — retry with base columns only
      if (basePairs.length === 0) throw new Error("No base fields to update");
      const { sql, values } = buildUpdate(basePairs, req.session.userId!, false);
      const { rows } = await pool.query(sql, values);
      u = rows[0];
    }

    if (!u) { res.status(404).json({ error: "User not found" }); return; }
    res.json({ profile: { id: u["id"], email: u["email"], fullName: u["full_name"], role: u["role"], studio: (u["studio"] as string) || "", phone: (u["phone"] as string) || "" } });
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

router.post("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("bb.sid");
    res.json({ ok: true });
  });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  if (!req.session.userId && req.session.role === "customer" && req.session.customerProjectId) {
    res.json(publicSessionCustomer(req));
    return;
  }

  if (!req.session.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, req.session.userId))
      .limit(1);

    if (!user) {
      req.session.destroy(() => {});
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    res.json(publicUser(user));
  } catch (err) {
    console.error("Auth me error:", err);
    res.status(500).json({ error: "Failed to get user" });
  }
});

export default router;
