-- Performance Indexes
-- Run these against your PostgreSQL database to optimize common query patterns.
-- Use CREATE INDEX CONCURRENTLY in production to avoid locking tables.

-- Dashboard / product lookups by user + exclusion status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_records_user_excluded
  ON product_records(user_id, excluded);

-- Rate lookup by product type + cost (used by LATERAL JOIN in dashboard)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rate_records_product_cost
  ON rate_records(product_type, annual_cost ASC);

-- Switch events: confirmed switches per user
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_switch_events_user_status
  ON switch_events(user_id, status) WHERE status = 'confirmed';

-- Renewal alerts: pending alerts ready to email
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_renewal_alerts_pending
  ON renewal_alerts(status, email_sent_at)
  WHERE status = 'pending' AND email_sent_at IS NULL;

-- Transactions: user's recent transactions (pagination)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_user_date
  ON transactions(user_id, transaction_date DESC);

-- Bank connections: active connections per user
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bank_connections_user_status
  ON bank_connections(user_id, status) WHERE status = 'active';

-- Raw transactions: deduplication during sync
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_raw_transactions_unique
  ON raw_transactions(connection_id, truelayer_transaction_id);
