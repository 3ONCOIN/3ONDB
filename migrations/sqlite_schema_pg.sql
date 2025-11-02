-- Translated Postgres DDL generated from SQLite schema
-- Review and adjust types, constraints, and FKs before applying to Postgres.

-- original: users
CREATE TABLE users (id SERIAL PRIMARY KEY, username TEXT, password_hash TEXT, email TEXT, created_at TEXT);

