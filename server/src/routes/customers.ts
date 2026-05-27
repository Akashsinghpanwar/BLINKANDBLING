import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import { z } from "zod";

const router: IRouter = Router();

const createCustomerSchema = z.object({
  fullName: z.string().min(1).max(200).trim(),
  email: z.string().email().optional().or(z.literal("")).default(""),
  phone: z.string().max(80).optional().default(""),
  projectName: z.string().max(200).optional().default("Custom jewellery project"),
});

const codeLoginSchema = z.object({
  accessCode: z.string().min(4).max(40).trim(),
});

const featureAccessSchema = z.object({
  feature: z.enum(["overview", "luna", "designs", "gallery", "cad", "timeline", "payments"]),
  unlocked: z.boolean(),
});

const DEFAULT_FEATURE_ACCESS = {
  overview: true,
  luna: true,
  designs: true,
  gallery: true,
  cad: false,
  timeline: true,
  payments: true,
};

declare module "express-session" {
  interface SessionData {
    customerProjectId?: string;
    customerAccessCode?: string;
    customerName?: string;
  }
}

let customerTablesReady: Promise<void> | null = null;

async function runCustomerTableSetup() {
  await pool.query(`
    create table if not exists bb_customer_workspaces (
      id uuid primary key default gen_random_uuid(),
      jeweller_user_id varchar(255),
      full_name varchar(200) not null,
      email varchar(255),
      phone varchar(80),
      project_name varchar(200) not null default 'Custom jewellery project',
      access_code varchar(40) not null unique,
      status varchar(40) not null default 'in_progress',
      stage varchar(60) not null default 'concept_review',
      budget varchar(120) not null default 'Not set',
      metal_preference varchar(120) not null default 'Not set',
      gemstone_preference varchar(120) not null default 'Not set',
      ring_size varchar(40) not null default 'Not set',
      timeline varchar(80) not null default 'Not set',
      cad_unlocked boolean not null default false,
      feature_access jsonb not null default '{"overview":true,"luna":true,"designs":true,"gallery":true,"cad":false,"timeline":true,"payments":true}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      last_access_at timestamptz
    );

    create index if not exists idx_bb_customer_workspaces_jeweller
      on bb_customer_workspaces(jeweller_user_id, created_at desc);
    create index if not exists idx_bb_customer_workspaces_access_code
      on bb_customer_workspaces(access_code);
  `);

  await pool.query(`
    alter table bb_customer_workspaces
      add column if not exists feature_access jsonb not null default '{"overview":true,"luna":true,"designs":true,"gallery":true,"cad":false,"timeline":true,"payments":true}'::jsonb;
    alter table bb_customer_workspaces
      add column if not exists intake_dna jsonb;
  `);

  await pool.query(`
    update bb_customer_workspaces
    set feature_access =
      '{"overview":true,"luna":true,"designs":true,"gallery":true,"cad":false,"timeline":true,"payments":true}'::jsonb
      || coalesce(feature_access, '{}'::jsonb)
      || jsonb_build_object('cad', cad_unlocked)
    where feature_access is null
       or not (feature_access ? 'overview')
       or not (feature_access ? 'luna')
       or not (feature_access ? 'designs')
       or not (feature_access ? 'gallery')
       or not (feature_access ? 'cad')
       or not (feature_access ? 'timeline')
       or not (feature_access ? 'payments');
  `);
}

async function ensureCustomerTables() {
  if (!customerTablesReady) {
    customerTablesReady = runCustomerTableSetup().catch((err: unknown) => {
      customerTablesReady = null;
      throw err;
    });
  }
  return customerTablesReady;
}

function normalizeNamePrefix(name: string) {
  const first = name.trim().split(/\s+/)[0] || "CLIENT";
  return first.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 10) || "CLIENT";
}

async function generateAccessCode(name: string) {
  const prefix = normalizeNamePrefix(name);
  for (let i = 0; i < 20; i += 1) {
    const code = `${prefix}${Math.floor(100000 + Math.random() * 900000)}`;
    const { rowCount } = await pool.query("select 1 from bb_customer_workspaces where access_code = $1", [code]);
    if (!rowCount) return code;
  }
  return `${prefix}${Date.now().toString().slice(-6)}`;
}

function toProject(row: any) {
  const rowFeatureAccess = row.feature_access && typeof row.feature_access === "object" ? row.feature_access : {};
  const featureAccess = {
    ...DEFAULT_FEATURE_ACCESS,
    ...rowFeatureAccess,
    cad: Boolean(row.cad_unlocked || rowFeatureAccess.cad),
  };

  return {
    id: row.id,
    name: row.project_name,
    accessCode: row.access_code,
    customer: {
      id: row.id,
      name: row.full_name,
      email: row.email || "",
      phone: row.phone || "",
    },
    status: row.status,
    stage: row.stage,
    budget: row.budget,
    metalPreference: row.metal_preference,
    gemstonePreference: row.gemstone_preference,
    ringSize: row.ring_size,
    timeline: row.timeline,
    cadUnlocked: featureAccess.cad,
    featureAccess,
    intakeDNA: row.intake_dna ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

router.get("/customers", async (req, res): Promise<void> => {
  try {
    await ensureCustomerTables();
    const userId = req.session.userId || "demo";

    // Auto-claim any customers created under the unauthenticated 'demo' fallback
    // so they appear for the first authenticated jeweller who logs in.
    if (userId !== "demo") {
      await pool.query(
        "update bb_customer_workspaces set jeweller_user_id = $1, updated_at = now() where jeweller_user_id = 'demo'",
        [userId],
      );
    }

    const { rows } = await pool.query(
      "select * from bb_customer_workspaces where jeweller_user_id = $1 order by created_at desc",
      [userId],
    );
    res.json({ customers: rows.map(toProject) });
  } catch (err) {
    console.error("Customer list error:", err);
    res.status(500).json({ error: "Failed to load customers" });
  }
});

router.post("/customers", async (req, res): Promise<void> => {
  const parsed = createCustomerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }

  try {
    await ensureCustomerTables();
    const accessCode = await generateAccessCode(parsed.data.fullName);
    const [projectName, fullName] = [
      parsed.data.projectName || "Custom jewellery project",
      parsed.data.fullName,
    ];

    const { rows } = await pool.query(
      `
        insert into bb_customer_workspaces(
          jeweller_user_id, full_name, email, phone, project_name, access_code
        )
        values ($1, $2, $3, $4, $5, $6)
        returning *
      `,
      [req.session.userId || "demo", fullName, parsed.data.email || "", parsed.data.phone || "", `${fullName} - ${projectName}`, accessCode],
    );

    res.status(201).json({ customer: toProject(rows[0]) });
  } catch (err) {
    console.error("Customer create error:", err);
    res.status(500).json({ error: "Failed to create customer" });
  }
});

const updateCustomerSchema = z.object({
  projectName: z.string().max(200).optional(),
  budget: z.string().max(120).optional(),
  metalPreference: z.string().max(120).optional(),
  gemstonePreference: z.string().max(120).optional(),
  ringSize: z.string().max(40).optional(),
  timeline: z.string().max(80).optional(),
  stage: z.string().max(60).optional(),
  fullName: z.string().min(1).max(200).optional(),
  email: z.string().max(255).optional(),
  phone: z.string().max(80).optional(),
  status: z.string().max(40).optional(),
});

router.patch("/customers/:id", async (req, res): Promise<void> => {
  const parsed = updateCustomerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }

  const fields = parsed.data;
  if (Object.keys(fields).length === 0) {
    res.status(400).json({ error: "No fields provided" });
    return;
  }

  try {
    await ensureCustomerTables();

    // Determine caller: jeweller (has userId) or customer portal (has customerProjectId)
    const isCustomerSelf = !req.session.userId && !!req.session.customerProjectId
      && req.session.customerProjectId === req.params.id;
    const jewellerId = req.session.userId || "demo";

    const setClauses: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (!isCustomerSelf) {
      // Jewellers can update all project fields
      if (fields.projectName !== undefined) { setClauses.push(`project_name = $${idx++}`); values.push(fields.projectName); }
      if (fields.budget !== undefined) { setClauses.push(`budget = $${idx++}`); values.push(fields.budget || "Not set"); }
      if (fields.metalPreference !== undefined) { setClauses.push(`metal_preference = $${idx++}`); values.push(fields.metalPreference || "Not set"); }
      if (fields.gemstonePreference !== undefined) { setClauses.push(`gemstone_preference = $${idx++}`); values.push(fields.gemstonePreference || "Not set"); }
      if (fields.ringSize !== undefined) { setClauses.push(`ring_size = $${idx++}`); values.push(fields.ringSize || "Not set"); }
      if (fields.timeline !== undefined) { setClauses.push(`timeline = $${idx++}`); values.push(fields.timeline || "Not set"); }
      if (fields.stage !== undefined) { setClauses.push(`stage = $${idx++}`); values.push(fields.stage); }
      if (fields.status !== undefined) { setClauses.push(`status = $${idx++}`); values.push(fields.status); }
    }
    // Both jewellers and customers can update contact info
    if (fields.fullName !== undefined) { setClauses.push(`full_name = $${idx++}`); values.push(fields.fullName); }
    if (fields.email !== undefined) { setClauses.push(`email = $${idx++}`); values.push(fields.email); }
    if (fields.phone !== undefined) { setClauses.push(`phone = $${idx++}`); values.push(fields.phone); }

    setClauses.push(`updated_at = now()`);

    // Customers can only update their own project; jewellers check by ownership
    const whereClause = isCustomerSelf
      ? `where id = $${idx}`
      : `where id = $${idx++} and jeweller_user_id = $${idx}`;
    values.push(req.params.id);
    if (!isCustomerSelf) values.push(jewellerId);

    const { rows } = await pool.query(
      `update bb_customer_workspaces set ${setClauses.join(", ")} ${whereClause} returning *`,
      values,
    );

    if (!rows[0]) {
      res.status(404).json({ error: "Customer workspace not found" });
      return;
    }

    // Keep session name in sync when customer updates their own name
    if (isCustomerSelf && fields.fullName) {
      req.session.customerName = fields.fullName;
    }

    res.json({ customer: toProject(rows[0]) });
  } catch (err) {
    console.error("Customer update error:", err);
    res.status(500).json({ error: "Failed to update customer" });
  }
});

router.patch("/customers/:id/access", async (req, res): Promise<void> => {
  const parsed = featureAccessSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid feature access update", details: parsed.error.flatten() });
    return;
  }

  try {
    await ensureCustomerTables();
    const userId = req.session.userId || "demo";
    const { feature, unlocked } = parsed.data;
    const { rows } = await pool.query(
      `
        update bb_customer_workspaces
        set
          feature_access = feature_access || jsonb_build_object($1::text, $2::boolean),
          cad_unlocked = case when $1::text = 'cad' then $2::boolean else cad_unlocked end,
          updated_at = now()
        where id = $3 and jeweller_user_id = $4
        returning *
      `,
      [feature, unlocked, req.params.id, userId],
    );

    if (!rows[0]) {
      res.status(404).json({ error: "Customer workspace not found" });
      return;
    }

    res.json({ customer: toProject(rows[0]) });
  } catch (err) {
    console.error("Customer access update error:", err);
    res.status(500).json({ error: "Failed to update feature access" });
  }
});

router.post("/auth/customer-code", async (req, res): Promise<void> => {
  const parsed = codeLoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid code" });
    return;
  }

  try {
    await ensureCustomerTables();
    const code = parsed.data.accessCode.toUpperCase();
    const { rows } = await pool.query(
      "update bb_customer_workspaces set last_access_at = now(), updated_at = now() where access_code = $1 returning *",
      [code],
    );

    const customer = rows[0];
    if (!customer) {
      res.status(401).json({ error: "Invalid access code" });
      return;
    }

    req.session.regenerate((err) => {
      if (err) {
        res.status(500).json({ error: "Could not establish session" });
        return;
      }
      req.session.role = "customer";
      req.session.customerProjectId = customer.id;
      req.session.customerAccessCode = customer.access_code;
      req.session.customerName = customer.full_name;
      res.json({
        id: customer.id,
        email: customer.email || "",
        fullName: customer.full_name,
        role: "customer",
        accessCode: customer.access_code,
      });
    });
  } catch (err) {
    console.error("Customer code login error:", err);
    res.status(500).json({ error: "Code login failed" });
  }
});

router.patch("/portal/intake-dna", async (req, res): Promise<void> => {
  try {
    await ensureCustomerTables();
    const projectId = req.session.customerProjectId || req.body?.projectId;
    if (!projectId) {
      res.status(400).json({ error: "No project in session" });
      return;
    }
    const dna = req.body?.intakeDNA;
    if (!dna || typeof dna !== "object") {
      res.status(400).json({ error: "intakeDNA required" });
      return;
    }
    const { rows } = await pool.query(
      `update bb_customer_workspaces
       set intake_dna = $1, updated_at = now()
       where id = $2
       returning id`,
      [JSON.stringify(dna), projectId],
    );
    if (!rows[0]) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("Save intake DNA error:", err);
    res.status(500).json({ error: "Failed to save brief" });
  }
});

router.get("/portal/project", async (req, res): Promise<void> => {
  try {
    await ensureCustomerTables();
    const projectId = req.session.customerProjectId;

    if (projectId) {
      const { rows } = await pool.query("select * from bb_customer_workspaces where id = $1 limit 1", [projectId]);
      if (rows[0]) {
        res.json({ project: toProject(rows[0]) });
        return;
      }
    }

    if (req.session.role === "jeweller") {
      const { rows } = await pool.query(
        "select * from bb_customer_workspaces where jeweller_user_id = $1 order by created_at desc limit 1",
        [req.session.userId || "demo"],
      );
      if (rows[0]) {
        res.json({ project: toProject(rows[0]) });
        return;
      }
    }

    res.status(404).json({ error: "Customer workspace not found" });
  } catch (err) {
    console.error("Portal project error:", err);
    res.status(500).json({ error: "Failed to load portal project" });
  }
});

export default router;
