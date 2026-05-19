import { defineConfig } from "drizzle-kit";
import { getDatabaseUrl, loadAppEnv } from "./src/load-env";

loadAppEnv();
const url = getDatabaseUrl();

export default defineConfig({
  schema: "./src/schema/users.ts",
  dialect: "postgresql",
  dbCredentials: { url },
});
