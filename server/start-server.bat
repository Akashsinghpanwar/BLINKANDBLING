@echo off
:: ──────────────────────────────────────────────────────────────
:: BB Bling — local dev server launcher
:: Copy this file, fill in your own keys, and run it.
:: DO NOT commit a version that contains real credentials.
:: All keys should come from your .env file or be set here
:: only on your local machine.
:: ──────────────────────────────────────────────────────────────
cd /d "%~dp0"

set DATABASE_URL=YOUR_NEON_DATABASE_URL
set PORT=5000
set SESSION_SECRET=YOUR_SESSION_SECRET

set ELEVENLABS_API_KEY=YOUR_ELEVENLABS_API_KEY
set ELEVENLABS_LUNA_AGENT_ID=YOUR_ELEVENLABS_AGENT_ID

set OPENAI_MODEL=openai/gpt-5.4-image-2
set OPENAI_PROVIDER=openrouter
set OPENAI_API_KEY=YOUR_AZURE_OPENAI_KEY

set AZURE_OPENAI_ENDPOINT=YOUR_AZURE_ENDPOINT
set AZURE_OPENAI_RESPONSES_URL=YOUR_AZURE_RESPONSES_URL
set AZURE_OPENAI_API_VERSION=2025-04-01-preview
set AZURE_OPENAI_IMAGE_DEPLOYMENT=gpt-image-1

set OPENROUTER_MODEL=google/gemini-3.5-flash
set OPENROUTER_IMAGE_MODEL=google/gemini-3.1-flash-image-preview
set OPENROUTER_VIDEO_MODEL=google/veo-3.1
set OPENROUTER_API_KEY=YOUR_OPENROUTER_API_KEY
set PUBLIC_BASE_URL=https://your-deployed-app.example.com

node --enable-source-maps dist\index.mjs
