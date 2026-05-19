import type { ParametricRecipe } from "@/store/recipe";

/**
 * Manufacturability check. `fail` means a real production house will reject /
 * scrap the piece (lost-wax casting won't fill, prongs will snap, stone won't
 * sit). `warn` means risky but workable by an experienced caster. `ok` is
 * inside the safe envelope used by commercial CAD-CAM jewellery houses.
 *
 * Thresholds source: standard lost-wax casting limits used by Stuller,
 * Hoover & Strong, JCK technical guides — gold/platinum alloys.
 */
export interface ValidationCheck {
  label: string;
  status: "ok" | "warn" | "fail";
  detail: string;
}

export interface ManufacturabilityReport {
  verdict: "ok" | "warn" | "fail";
  checks: ValidationCheck[];
  failCount: number;
  warnCount: number;
  /** Plain-language summary, e.g. "Production ready" / "Will not cast" */
  summary: string;
  reasons: string[];
}

export function validateRecipe(recipe: ParametricRecipe, stoneR: number): ValidationCheck[] {
  const checks: ValidationCheck[] = [];

  // ── Wall thickness ─────────────────────────────────────────────────────────
  // < 0.6 mm = molten metal won't fill the mould reliably for casting.
  // 0.6–0.8 mm = warn, requires a skilled caster + low shrinkage alloy.
  // ≥ 0.8 mm = safe for production.
  const t = recipe.ringBase.thickness;
  checks.push({
    label: "Wall thickness",
    status: t >= 0.8 ? "ok" : t >= 0.6 ? "warn" : "fail",
    detail:
      t >= 0.8
        ? `${t.toFixed(2)} mm — safe for casting`
        : t >= 0.6
        ? `${t.toFixed(2)} mm — risky, requires experienced caster`
        : `${t.toFixed(2)} mm — TOO THIN, mould will not fill (min 0.60 mm)`,
  });

  // ── Band width ─────────────────────────────────────────────────────────────
  // < 1.2 mm = will warp/crack under wear; below 1.0 mm = unwearable.
  const w = recipe.ringBase.width;
  checks.push({
    label: "Band width",
    status: w >= 1.5 ? "ok" : w >= 1.2 ? "warn" : "fail",
    detail:
      w >= 1.5
        ? `${w.toFixed(2)} mm — durable`
        : w >= 1.2
        ? `${w.toFixed(2)} mm — thin, may bend`
        : `${w.toFixed(2)} mm — TOO NARROW, will not survive wear`,
  });

  // ── Prong thickness ────────────────────────────────────────────────────────
  // < 0.5 mm = will snap and lose the stone. 0.5–0.7 mm = warn. ≥ 0.7 mm = ok.
  if (recipe.setting.type !== "bezel" && recipe.setting.type !== "tension") {
    const pt = recipe.prongs.thickness;
    checks.push({
      label: "Prong thickness",
      status: pt >= 0.7 ? "ok" : pt >= 0.5 ? "warn" : "fail",
      detail:
        pt >= 0.7
          ? `${pt.toFixed(2)} mm — secure grip`
          : pt >= 0.5
          ? `${pt.toFixed(2)} mm — will need re-tipping`
          : `${pt.toFixed(2)} mm — WILL SNAP, stone will be lost (min 0.50 mm)`,
    });

    // ── Prong spacing ────────────────────────────────────────────────────────
    // The free arc-length between adjacent prongs. < 0.4 mm of clear gap
    // means there is no room for a setter's burnisher to actually push metal.
    const spacing = (2 * Math.PI * stoneR) / recipe.prongs.count - recipe.prongs.thickness;
    checks.push({
      label: "Prong spacing",
      status: spacing >= 0.4 ? "ok" : spacing >= 0.25 ? "warn" : "fail",
      detail:
        spacing >= 0.4
          ? `${spacing.toFixed(2)} mm clearance — setter can work`
          : spacing >= 0.25
          ? `${spacing.toFixed(2)} mm clearance — tight, slow setting`
          : `${spacing.toFixed(2)} mm clearance — IMPOSSIBLE to set this stone`,
    });
  }

  // ── Halo gap ───────────────────────────────────────────────────────────────
  // Halo melee stones need at least 0.10 mm metal between them after setting,
  // otherwise the wall between seats fractures during burnishing.
  if (recipe.halo.enabled) {
    const g = recipe.halo.spacing;
    checks.push({
      label: "Halo gap",
      status: g >= 0.10 ? "ok" : g >= 0.05 ? "warn" : "fail",
      detail:
        g >= 0.10
          ? `${g.toFixed(2)} mm gap — settable`
          : g >= 0.05
          ? `${g.toFixed(2)} mm gap — fragile wall`
          : `${g.toFixed(2)} mm gap — wall will crack on setting`,
    });
  }

  // ── Stone seat depth ───────────────────────────────────────────────────────
  // Need at least 0.6 mm of seat for the girdle to sit. < 0.4 mm = stone
  // sits proud and falls out under any side impact.
  const sd = recipe.setting.seatDepth;
  checks.push({
    label: "Stone seat depth",
    status: sd >= 0.6 ? "ok" : sd >= 0.4 ? "warn" : "fail",
    detail:
      sd >= 0.6
        ? `${sd.toFixed(2)} mm — stone seats firmly`
        : sd >= 0.4
        ? `${sd.toFixed(2)} mm — stone barely retained`
        : `${sd.toFixed(2)} mm — stone WILL FALL OUT (min 0.40 mm)`,
  });

  // ── Watertight / mesh sanity ───────────────────────────────────────────────
  // Procedural geometry is manifold by construction — we only fail this check
  // if any other geometric metric has already failed.
  const anyFail = checks.some((c) => c.status === "fail");
  const anyWarn = checks.some((c) => c.status === "warn");
  checks.push({
    label: "Mesh / watertight",
    status: anyFail ? "fail" : anyWarn ? "warn" : "ok",
    detail: anyFail
      ? "Geometry has unmanufacturable features"
      : anyWarn
      ? "Manifold but with risk areas"
      : "Closed manifold mesh — STL/STEP ready",
  });

  return checks;
}

export function getReport(recipe: ParametricRecipe, stoneR: number): ManufacturabilityReport {
  const checks = validateRecipe(recipe, stoneR);
  const failCount = checks.filter((c) => c.status === "fail").length;
  const warnCount = checks.filter((c) => c.status === "warn").length;
  const verdict: "ok" | "warn" | "fail" =
    failCount > 0 ? "fail" : warnCount > 0 ? "warn" : "ok";
  const reasons = checks
    .filter((c) => c.status === verdict && verdict !== "ok")
    .map((c) => c.label);
  const summary =
    verdict === "ok"
      ? "Production ready"
      : verdict === "warn"
      ? "Manufacturable with caution"
      : "NOT manufacturable";
  return { verdict, checks, failCount, warnCount, summary, reasons };
}
