-- Create auth schema and auth.uid() function fallback for non-Supabase Postgres environments
CREATE SCHEMA IF NOT EXISTS auth;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS text AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '')::text;
$$ LANGUAGE sql STABLE;

-- Enable Row Level Security on all tables
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "teams" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "team_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "repositories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "commits" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pull_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pr_reviews" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "standups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sprints" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ai_reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "refresh_tokens" ENABLE ROW LEVEL SECURITY;

-- Disable FORCE ROW LEVEL SECURITY to allow the database owner/superuser role (used by Prisma connection) to bypass RLS policies
ALTER TABLE "users" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "teams" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "team_members" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "repositories" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "commits" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "pull_requests" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "pr_reviews" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "standups" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "sprints" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "ai_reports" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "subscriptions" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "refresh_tokens" NO FORCE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to allow re-runs
DROP POLICY IF EXISTS users_policy ON "users";
DROP POLICY IF EXISTS teams_policy ON "teams";
DROP POLICY IF EXISTS team_members_policy ON "team_members";
DROP POLICY IF EXISTS repositories_policy ON "repositories";
DROP POLICY IF EXISTS commits_policy ON "commits";
DROP POLICY IF EXISTS pull_requests_policy ON "pull_requests";
DROP POLICY IF EXISTS pr_reviews_policy ON "pr_reviews";
DROP POLICY IF EXISTS standups_policy ON "standups";
DROP POLICY IF EXISTS sprints_policy ON "sprints";
DROP POLICY IF EXISTS ai_reports_policy ON "ai_reports";
DROP POLICY IF EXISTS subscriptions_policy ON "subscriptions";
DROP POLICY IF EXISTS refresh_tokens_policy ON "refresh_tokens";

-- Create policies utilizing both Supabase auth.uid() and application session parameter current_setting('app.current_user_id')

-- 1. Users can access their own user record
CREATE POLICY users_policy ON "users"
FOR ALL
USING (
  id = NULLIF(current_setting('app.current_user_id', true), '') OR id = auth.uid()::text
);

-- 2. Teams can be accessed by their members
CREATE POLICY teams_policy ON "teams"
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM "team_members"
    WHERE "team_members".team_id = id
    AND ("team_members".user_id = NULLIF(current_setting('app.current_user_id', true), '') OR "team_members".user_id = auth.uid()::text)
  )
);

-- 3. Team members can be accessed by other members of the same team
CREATE POLICY team_members_policy ON "team_members"
FOR ALL
USING (
  user_id = NULLIF(current_setting('app.current_user_id', true), '') OR user_id = auth.uid()::text OR
  EXISTS (
    SELECT 1 FROM "team_members" AS tm
    WHERE tm.team_id = team_id
    AND (tm.user_id = NULLIF(current_setting('app.current_user_id', true), '') OR tm.user_id = auth.uid()::text)
  )
);

-- 4. Repositories can be accessed by team members
CREATE POLICY repositories_policy ON "repositories"
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM "team_members"
    WHERE "team_members".team_id = team_id
    AND ("team_members".user_id = NULLIF(current_setting('app.current_user_id', true), '') OR "team_members".user_id = auth.uid()::text)
  )
);

-- 5. Commits can be accessed by members of the repository's team
CREATE POLICY commits_policy ON "commits"
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM "repositories"
    JOIN "team_members" ON "team_members".team_id = "repositories".team_id
    WHERE "repositories".id = repo_id
    AND ("team_members".user_id = NULLIF(current_setting('app.current_user_id', true), '') OR "team_members".user_id = auth.uid()::text)
  )
);

-- 6. Pull requests can be accessed by members of the repository's team
CREATE POLICY pull_requests_policy ON "pull_requests"
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM "repositories"
    JOIN "team_members" ON "team_members".team_id = "repositories".team_id
    WHERE "repositories".id = repo_id
    AND ("team_members".user_id = NULLIF(current_setting('app.current_user_id', true), '') OR "team_members".user_id = auth.uid()::text)
  )
);

-- 7. PR Reviews can be accessed by members of the repository's team
CREATE POLICY pr_reviews_policy ON "pr_reviews"
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM "pull_requests"
    JOIN "repositories" ON "repositories".id = "pull_requests".repo_id
    JOIN "team_members" ON "team_members".team_id = "repositories".team_id
    WHERE "pull_requests".id = pr_id
    AND ("team_members".user_id = NULLIF(current_setting('app.current_user_id', true), '') OR "team_members".user_id = auth.uid()::text)
  )
);

-- 8. Standups can be accessed by members of the standup's team
CREATE POLICY standups_policy ON "standups"
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM "team_members"
    WHERE "team_members".team_id = team_id
    AND ("team_members".user_id = NULLIF(current_setting('app.current_user_id', true), '') OR "team_members".user_id = auth.uid()::text)
  )
);

-- 9. Sprints can be accessed by members of the sprint's team
CREATE POLICY sprints_policy ON "sprints"
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM "team_members"
    WHERE "team_members".team_id = team_id
    AND ("team_members".user_id = NULLIF(current_setting('app.current_user_id', true), '') OR "team_members".user_id = auth.uid()::text)
  )
);

-- 10. AI Reports can be accessed by members of the report's team
CREATE POLICY ai_reports_policy ON "ai_reports"
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM "team_members"
    WHERE "team_members".team_id = team_id
    AND ("team_members".user_id = NULLIF(current_setting('app.current_user_id', true), '') OR "team_members".user_id = auth.uid()::text)
  )
);

-- 11. Subscriptions can be accessed by their owners
CREATE POLICY subscriptions_policy ON "subscriptions"
FOR ALL
USING (
  user_id = NULLIF(current_setting('app.current_user_id', true), '') OR user_id = auth.uid()::text
);

-- 12. Refresh tokens can be accessed by their owners
CREATE POLICY refresh_tokens_policy ON "refresh_tokens"
FOR ALL
USING (
  user_id = NULLIF(current_setting('app.current_user_id', true), '') OR user_id = auth.uid()::text
);
