# Elevate plans (one site for every client plan)

One Vercel project serves every client's action plan. Plans, steps and progress all live in one Upstash Redis database.
Edit anything at /admin. Nothing needs uploading to GitHub after the first setup.

## Two page designs
- New (Nov 24): Hub, Tracker and Bank tabs. Served by plan-v4.html. Used by plans with Page design set to Hub, Tracker and Bank in /admin > Basics (stored as view: v4). Rachel is the first.
- Classic: the projects list page, plan.html. Every plan without view v4 still uses it (Devon, Agnes, Janel, CWM, demo).
- router.html decides which one to show for a web address. vercel.json sends the home address to router.html.

## What the new design shows
- Hub: key date countdown, how many steps are on the client and on you, the client's next 3, Where we are and Where we are heading (Overview), projects with progress, Decided and Still open, Results so far.
- Tracker: every step by date with Type, Who, Status (Not started, In progress, Done) and Waiting on. Filters for project and whose. Tap a title for why, steps and the AI prompt. Client can add their own steps.
- Bank: items you add in /admin > Bank, plus every project's Keep handy list and every step's AI prompt.

## Moving a plan to the new design
1. /admin > open the plan > Basics: set Page design to Hub, Tracker and Bank, set Plan level, your first name, and the key date as a date (for the countdown). Save.
2. Projects and steps: open each step and fill Due date, Who does it, Type and Waiting on. Keep titles short, with no owner or date in them.
3. Overview: fill Decided so far and Still open.
4. Bank tab: add captions, brand voice, stories, links. Tick Not ready yet for placeholders.

## Files
- router.html: picks the design for this address
- plan-v4.html: new client page (reads /api/plan, saves to /api/progress)
- plan.html: classic client page
- admin.html: your admin page at /admin
- api/plan.js, api/progress.js, api/admin.js, api/digest.js, api/feedback.js, api/_lib.js
- vercel.json

## Data fields added for the new design (all optional, old plans ignore them)
- Plan: view, level, advisor, keyISO, decided, open, bank
- Step: d (YYYY-MM-DD), who, type (Task, Post, Email, Decision, Session), wait
- Progress: ip (ids marked In progress) and d on steps the client adds

## One-time setup
1. GitHub: new repo elevatemyai-admin/elevate-plans, upload everything in this folder (keep the api folder).
2. Vercel: Add New > Project > import elevate-plans (project name elevate-plans).
3. Vercel > Storage > Upstash for Redis > Free plan > connect to elevate-plans.
4. Vercel > elevate-plans > Settings > Environment Variables: add ADMIN_KEY (a long password only you and Claude know) and DIGEST_KEY (a different long password). Redeploy.
5. Open https://elevate-plans.vercel.app/admin, enter ADMIN_KEY, import the plans, and move each client's address (see below).

## Moving a client's web address onto this project
Old project (for example devon-root-to-rise) > Settings > Domains > remove the address.
elevate-plans > Settings > Domains > add the same address.
In /admin > open the plan > Basics > list the address under Web addresses > Save.

## Environment variables
- ADMIN_KEY: unlocks /admin and /api/admin
- DIGEST_KEY: read-only key for the weekly digest (/api/digest?k=KEY)
- Upstash adds its own variables when connected.

## Data (Upstash keys)
plans (set), plan:ID (content), prog:ID (client progress), hosts (web address to plan id), digest:ID (last digest baseline)
Free plan: 500K commands per month, 250 MB, one database per account.

## Editing code safely
A one-character typo in api/_lib.js takes down every client page (it happened once on Nov 24). After any edit to an api file, open a client's /api/plan address and confirm it still shows data.

## Backup
/admin > Download backup, once a month. Restore backup puts it back.
