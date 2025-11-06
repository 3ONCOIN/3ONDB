-- 3ONDB Core Schema - PostgreSQL Version
-- Generated from SQLite schema with enhancements

-- Users table (migrated from SQLite)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password TEXT NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  updated_by INTEGER,
  user_id INTEGER,
  username VARCHAR(255),
  password_hash TEXT
);

-- Buckets table for file storage
CREATE TABLE IF NOT EXISTS buckets (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Files table for file metadata
CREATE TABLE IF NOT EXISTS files (
  id SERIAL PRIMARY KEY,
  bucket_id INTEGER REFERENCES buckets(id),
  filename VARCHAR(255) NOT NULL,
  size_bytes BIGINT,
  content_type VARCHAR(255),
  user_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Share tokens for file sharing
CREATE TABLE IF NOT EXISTS share_tokens (
  token VARCHAR(255) PRIMARY KEY,
  file_id INTEGER REFERENCES files(id),
  expires_at TIMESTAMP WITHOUT TIME ZONE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Test table for development
CREATE TABLE IF NOT EXISTS test_table (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255)
);