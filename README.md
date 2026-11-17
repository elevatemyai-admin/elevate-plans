# Elevate plans (one site for every client plan)

One Vercel project serves every client's action plan. Plans, steps and progress all live in one Upstash Redis database.
Edit anything at /admin. Nothing needs uploading to GitHub after the first setup.

## Files
- plan.html: the client's page (reads its plan from /api/plan, saves progress to /api/progress)
- admin.html: your admin page at /admin
- api/plan.js, api/progress.js, api/admin.js, api/digest.js, api/_lib.js
- vercel.json

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
plans (set), plan:<id> (content), prog:<id> (client progress), hosts (web address > plan id), digest:<id> (last digest baseline)
Free plan: 500K commands per month, 250 MB, one database per account.

## Backup
/admin > Download backup, once a month. Restore backup puts it back.
