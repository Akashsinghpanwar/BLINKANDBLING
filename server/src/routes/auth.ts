import { Router, type IRouter, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import {
  db,
  directPasswordResetSchema,
  loginSchema,
  signupSchema,
  usersTable,
  type User,
} from "@workspace/db";

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
