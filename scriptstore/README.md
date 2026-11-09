# ScriptStore

A dark, responsive community library for sharing educational Roblox Studio Luau resources.

## Current MVP
- Search and category filters
- Newest / popular sorting
- Script detail view and copy button
- Supabase email/password authentication
- User submissions enter a pending moderation queue
- Public browsing is limited to approved (published) posts
- Row Level Security on all community tables
- Responsive desktop, tablet and mobile layout

## Setup
1. Create a separate Supabase project named **ScriptStore**. Do not reuse another app's database.
2. In the new project's SQL Editor, run `supabase-schema.sql`.
3. In Project Settings → API, copy the Project URL and **publishable key**.
4. Replace the placeholders in `supabase-config.js`.
5. Deploy the repository's `scriptstore/` folder as the Netlify publish directory, or serve this folder locally over HTTP.

Never put a Supabase secret or service_role key in browser code or GitHub.

## Content policy
This community is for legitimate Roblox Studio development and learning: gameplay systems, UI, utilities, data patterns, and tutorials. Do not submit exploit executors, cheating scripts, account/session theft, credential collection, or code intended to disrupt other experiences.

## Moderation note
Submissions are inserted with `status = 'pending'`. The starter client intentionally has no admin approval button. Add moderation through a trusted server-side process after configuring an administrator; do not let users change their own status to published.
