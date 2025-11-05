-- Create CONCURRENTLY indexes for production (run with psql outside a transaction)
-- This script is idempotent and uses IF NOT EXISTS where supported.
-- Audit Logs Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
-- Activity Streams Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_streams_user_id ON activity_streams(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_streams_project_id ON activity_streams(project_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_streams_created_at ON activity_streams(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_streams_type ON activity_streams(activity_type);
-- Analytics Snapshots Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_snapshots_type ON analytics_snapshots(snapshot_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_snapshots_metric ON analytics_snapshots(metric_name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_snapshots_period ON analytics_snapshots(time_period_start, time_period_end);
-- System Settings Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_system_settings_category ON system_settings(category);
-- API Keys Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_keys_key ON api_keys(api_key);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);
-- Sessions Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_session_id ON sessions(session_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_active ON sessions(is_active);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_last_activity ON sessions(last_activity);
-- Backups Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_backups_created_at ON backups(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_backups_type ON backups(backup_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_backups_status ON backups(backup_status);
-- Files Indexes (if large)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_files_bucket_id ON files(bucket_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_files_user_id ON files(user_id);
-- Run this script with: PGPASSWORD=REPLACE_ME psql -h localhost -U pguser -d 3onprime -f scripts/psql_create_concurrent_indexes.sql