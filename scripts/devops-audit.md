# Moneyger DevOps Audit Agent Prompt

Paste this entire prompt into Claude Code as a task whenever you ship changes that
touch auth, sync, or any Netlify function.

---

## Task

You are auditing the Moneyger PWA infrastructure for deployment readiness.
Perform all checks below, then produce a pass/fail table and an action list.

### Step 1 — Read what the code expects

Read these files and extract the requirements:

- `netlify/functions/google-oauth-exchange.mjs` → which env vars it reads
- `netlify/functions/google-oauth-refresh.mjs` → which env vars it reads
- `netlify/functions/registry.mjs` → which env vars it reads
- `src/auth/session.tsx` → OAuth scopes in `SCOPES`, redirect URI logic
- `src/lib/google-sheets-api.ts` → which Sheets API endpoints are called
- `src/lib/google-drive-api.ts` → which Drive API endpoints are called
- `.env.example` → full list of required/optional env vars

Extract:
  a. Required server-side env vars (Netlify dashboard)
  b. Required client-side env vars (VITE_ prefix, also Netlify dashboard)
  c. Google OAuth scopes the app requests
  d. Redirect URIs the app uses (from `buildRedirectUri` in session.tsx)
  e. Google APIs accessed (Sheets v4, Drive v3, etc.)

### Step 2 — Check Netlify

Use the Netlify MCP tools:
  1. Call `netlify-team-services-reader` → `get-teams` to get the team slug
  2. Call `netlify-project-services-reader` → `get-projects` for team slug "ronnoche",
     filter for "moneyger-pwa"
  3. Call `netlify-deploy-services-reader` → `get-deploy-for-site` for the
     current deploy ID from the project
  4. From the deploy, verify:
     - `state` is "ready" (not "error" or "building")
     - `available_functions` contains all 3 expected functions:
       google-oauth-exchange, google-oauth-refresh, registry
     - `error_message` is null
     - The deployed commit matches the latest commit on the main branch

  5. Cross-reference the list of required env vars (from Step 1) against what
     should be in Netlify. NOTE: You cannot read secret values via MCP, so
     produce a checklist the user must verify manually in the Netlify dashboard
     at: https://app.netlify.com/projects/moneyger-pwa/configuration/env-vars

### Step 3 — Check Google Cloud Console (manual checklist)

You cannot access Google Cloud Console programmatically, so produce a
checklist for the user to verify manually at:
https://console.cloud.google.com/apis/credentials

Cross-reference the OAuth scopes from Step 1 against:
  - Authorized OAuth scopes on the Web client
  - Authorized redirect URIs (must include https://moneyger.ronnoche.dev/auth/callback
    and any preview/staging URLs if used)
  - APIs & Services → Enabled APIs (Google Sheets API v4, Google Drive API v3)

### Step 4 — Produce the report

Output a structured report with three sections:

#### 4a. Netlify Status
Table with columns: Check | Expected | Actual | Status (✅/❌/⚠️)

Rows:
- Deploy state
- google-oauth-exchange deployed
- google-oauth-refresh deployed
- registry deployed
- Deploy error_message
- Deployed commit matches main

#### 4b. Netlify Env Vars (manual verification needed)
Table with columns: Var Name | Side | Required | Notes

Mark server-only vars (not VITE_) as "Cannot verify via API — check Netlify dashboard"

#### 4c. Google Console Checklist (manual)
Bullet list of items to check, with the exact value to look for.

#### 4d. Action Items
Numbered list of anything that is missing or broken, with exact steps to fix.
If everything is clean, say "No action needed."

---

## Context

- Production URL: https://moneyger.ronnoche.dev
- Netlify site ID: b5338847-a95e-45ad-9bfc-bcd0cd630023
- Netlify team slug: ronnoche
- Google OAuth callback path: /auth/callback
- Google APIs used: Sheets API v4, Drive API v3, OAuth2 userinfo
- Netlify functions: google-oauth-exchange, google-oauth-refresh, registry
