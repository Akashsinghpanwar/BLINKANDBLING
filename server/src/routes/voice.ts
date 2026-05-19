import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/voice/signed-url", async (_req, res) => {
  const apiKey = process.env["ELEVENLABS_API_KEY"];
  const agentId = process.env["ELEVENLABS_LUNA_AGENT_ID"];

  if (!apiKey || !agentId) {
    res.status(500).json({ error: "Luna voice service is not configured" });
    return;
  }

  try {
    const url = new URL(
      "https://api.elevenlabs.io/v1/convai/conversation/get-signed-url",
    );
    url.searchParams.set("agent_id", agentId);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "xi-api-key": apiKey,
      },
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      logSignedUrlFailure(response.status, detail);
      res.status(502).json({ error: "Unable to start Luna voice session" });
      return;
    }

    const body = (await response.json()) as { signed_url?: unknown };
    if (typeof body.signed_url !== "string" || !body.signed_url) {
      res.status(502).json({ error: "Invalid Luna voice session response" });
      return;
    }

    res.json({ signedUrl: body.signed_url });
  } catch (error) {
    logSignedUrlFailure(0, error instanceof Error ? error.message : String(error));
    res.status(502).json({ error: "Unable to start Luna voice session" });
  }
});

router.get("/voice/conversation-token", async (_req, res) => {
  const apiKey = process.env["ELEVENLABS_API_KEY"];
  const agentId = process.env["ELEVENLABS_LUNA_AGENT_ID"];

  if (!apiKey || !agentId) {
    res.status(500).json({ error: "Luna voice service is not configured" });
    return;
  }

  try {
    const url = new URL("https://api.elevenlabs.io/v1/convai/conversation/token");
    url.searchParams.set("agent_id", agentId);
    url.searchParams.set("participant_name", "Blink & Bling customer");

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "xi-api-key": apiKey,
      },
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      logElevenLabsFailure("token", response.status, detail);
      res.status(502).json({ error: "Unable to start Luna voice session" });
      return;
    }

    const body = (await response.json()) as { token?: unknown };
    if (typeof body.token !== "string" || !body.token) {
      res.status(502).json({ error: "Invalid Luna voice session response" });
      return;
    }

    res.json({ token: body.token });
  } catch (error) {
    logElevenLabsFailure(
      "token",
      0,
      error instanceof Error ? error.message : String(error),
    );
    res.status(502).json({ error: "Unable to start Luna voice session" });
  }
});

function logSignedUrlFailure(status: number, detail: string) {
  logElevenLabsFailure("signed-url", status, detail);
}

function logElevenLabsFailure(kind: string, status: number, detail: string) {
  logger.warn({ kind, status, detail }, "ElevenLabs voice request failed");
}

export default router;
