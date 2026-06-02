-- Migration: TrueLayer data fetching fixes
-- Run this against an existing database to apply fixes for proper TrueLayer integration.

-- 1. Add unique index on raw_transactions to prevent duplicates during sync
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_raw_transactions_unique
  ON raw_transactions(connection_id, truelayer_transaction_id);

-- 2. Add composite index for faster bank connection lookups by user + status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bank_connections_user_status
  ON bank_connections(user_id, status) WHERE status = 'active';
