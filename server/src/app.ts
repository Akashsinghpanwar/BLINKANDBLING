import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "@workspace/db";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();
app.disable("etag");

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "60mb" }));
app.use(express.urlencoded({ extended: true, limit: "60mb" }));

const PgStore = connectPgSimple(session);
const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  throw new Error("SESSION_SECRET environment variable is required");
}

const pgStore = new PgStore({ pool, tableName: "bb_sessions", createTableIfMissing: true });
// Suppress session-store errors so a Supabase blip doesn't crash the process
pgStore.on("error", (err: Error) => {
  logger.warn({ err: err.message }, "Session store error (non-fatal)");
});

app.set("trust proxy", 1);
app.use(
  session({
    store: pgStore,
    name: "bb.sid",
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 30,
    },
  }),
);

app.use("/api", router);

// Global JSON error handler — catches any unhandled route error and returns
// a clean JSON response instead of Express's default HTML error page.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, "Unhandled route error");
  const status = (err as unknown as { status?: number; statusCode?: number }).status
    ?? (err as unknown as { status?: number; statusCode?: number }).statusCode
    ?? 500;
  res.status(status).json({ error: err.message || "Internal server error" });
});

export default app;
