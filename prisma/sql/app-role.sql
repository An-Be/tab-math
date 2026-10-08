-- Least-privilege runtime role for TabMath. Run ONCE in the Neon SQL editor as
-- the owner role (neondb_owner), on the production branch (and dev if wanted).
--
-- The app then connects as tabmath_app (DATABASE_URL and DIRECT_URL): row access
-- on app tables only, no DDL, not in neon_superuser. Migrations keep running
-- with the owner role. Creating the role in SQL keeps it out of neon_superuser.

CREATE ROLE tabmath_app WITH LOGIN PASSWORD 'REPLACE_WITH_A_LONG_RANDOM_PASSWORD';

GRANT CONNECT ON DATABASE neondb TO tabmath_app;
GRANT USAGE ON SCHEMA public TO tabmath_app;

-- One line per app table. Extend this every time a migration adds a table.
GRANT SELECT, INSERT, UPDATE, DELETE ON
  "User", "Split", "Person", "LineItem", "Assignment", "Payment", "RateLimitHit", "FeatureInterest"
TO tabmath_app;
