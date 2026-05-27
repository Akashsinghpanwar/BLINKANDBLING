import { pool } from "@workspace/db";

/**
 * Creates all application tables if they don't already exist.
 * Runs once at startup before the server starts accepting real traffic.
 * Safe to call multiple times (all statements use IF NOT EXISTS).
 */
export async function ensureSchema(): Promise<void> {
  await pool.query(`
    -- Users
    CREATE TABLE IF NOT EXISTS bb_users (
      id          VARCHAR(120) PRIMARY KEY DEFAULT gen_random_uuid()::text,
      email       VARCHAR(255) NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name   VARCHAR(200) NOT NULL,
      role        VARCHAR(20)  NOT NULL DEFAULT 'customer',
      is_verified BOOLEAN      NOT NULL DEFAULT false,
      created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
      updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
      last_login  TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_bb_users_email ON bb_users(email);
    CREATE INDEX IF NOT EXISTS idx_bb_users_role  ON bb_users(role);

    -- Sessions (connect-pg-simple)
    CREATE TABLE IF NOT EXISTS bb_sessions (
      sid    VARCHAR    NOT NULL PRIMARY KEY,
      sess   JSONB      NOT NULL,
      expire TIMESTAMP(6) NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_bb_sessions_expire ON bb_sessions(expire);

    -- Messages
    CREATE TABLE IF NOT EXISTS bb_messages (
      id               VARCHAR(120) PRIMARY KEY,
      project_id       VARCHAR(120) NOT NULL,
      author           VARCHAR(20)  NOT NULL,
      author_name      VARCHAR(200) NOT NULL,
      text             TEXT         NOT NULL,
      created_at       TIMESTAMPTZ  DEFAULT now(),
      read_by_jeweller BOOLEAN      DEFAULT false,
      read_by_customer BOOLEAN      DEFAULT false
    );
    CREATE INDEX IF NOT EXISTS idx_bb_messages_project ON bb_messages(project_id, created_at ASC);

    -- Uploads
    CREATE TABLE IF NOT EXISTS bb_uploads (
      id          VARCHAR(120) PRIMARY KEY,
      user_id     VARCHAR(120),
      project_id  VARCHAR(120),
      name        VARCHAR(500) NOT NULL,
      data_url    TEXT         NOT NULL,
      mime_type   VARCHAR(100),
      size_bytes  BIGINT,
      created_at  TIMESTAMPTZ  DEFAULT now()
    );

    -- CAD files
    CREATE TABLE IF NOT EXISTS bb_cad_files (
      id              VARCHAR(120) PRIMARY KEY,
      project_id      VARCHAR(120),
      name            VARCHAR(500) NOT NULL,
      url             TEXT         NOT NULL,
      mime_type       VARCHAR(100),
      extension       VARCHAR(20),
      size            BIGINT,
      source          VARCHAR(100),
      source_image_id VARCHAR(120),
      created_at      TIMESTAMPTZ  DEFAULT now(),
      updated_at      TIMESTAMPTZ  DEFAULT now()
    );

    -- Gallery folders
    CREATE TABLE IF NOT EXISTS bb_gallery_folders (
      id         VARCHAR(120) PRIMARY KEY,
      user_id    VARCHAR(120),
      project_id VARCHAR(120),
      name       VARCHAR(500) NOT NULL,
      source     VARCHAR(40)  NOT NULL DEFAULT 'ai',
      prompt     TEXT,
      created_at TIMESTAMPTZ  DEFAULT now(),
      updated_at TIMESTAMPTZ  DEFAULT now()
    );

    -- Gallery images
    CREATE TABLE IF NOT EXISTS bb_gallery_images (
      id         VARCHAR(120) PRIMARY KEY,
      folder_id  VARCHAR(120) NOT NULL REFERENCES bb_gallery_folders(id) ON DELETE CASCADE,
      url        TEXT         NOT NULL,
      label      VARCHAR(500),
      prompt     TEXT,
      angle      VARCHAR(100),
      created_at TIMESTAMPTZ  DEFAULT now()
    );
  `);
}
