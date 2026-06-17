-- Quid Database Schema (PostgreSQL 15)
-- Supports: user management, Open Banking, product detection, comparison, switching, renewal alerts

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- Users
-- =============================================
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    email_verified_at TIMESTAMPTZ,
    password_hash VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone_number VARCHAR(20),
    phone_number_verified_at TIMESTAMPTZ,
    subscription_tier VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium')),
    notification_prefs JSONB NOT NULL DEFAULT '{}',
    mfa_enabled BOOLEAN NOT NULL DEFAULT false,
    mfa_method VARCHAR(20) NOT NULL DEFAULT 'totp' CHECK (mfa_method IN ('totp', 'sms')),
    mfa_secret_encrypted TEXT,
    email_verification_token VARCHAR(64),
    email_verification_expires TIMESTAMPTZ,
    password_reset_token VARCHAR(64),
    password_reset_expires TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_deleted_at ON users(deleted_at);

-- =============================================
-- Bank Connections
-- =============================================
CREATE TABLE bank_connections (
    connection_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    bank_name VARCHAR(100) NOT NULL,
    bank_id VARCHAR(100) NOT NULL,
    truelayer_token_encrypted TEXT NOT NULL,
    truelayer_refresh_token_encrypted TEXT,
    connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bank_connections_user_id ON bank_connections(user_id);
CREATE INDEX idx_bank_connections_status ON bank_connections(status);
CREATE INDEX idx_bank_connections_expires_at ON bank_connections(expires_at);

-- =============================================
-- Consent Log (GDPR requirement)
-- =============================================
CREATE TABLE consent_logs (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    connection_id UUID REFERENCES bank_connections(connection_id) ON DELETE SET NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('granted', 'revoked', 'expired', 'renewed')),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_consent_logs_user_id ON consent_logs(user_id);
CREATE INDEX idx_consent_logs_created_at ON consent_logs(created_at);

-- =============================================
-- Product Records (classified, raw transactions discarded)
-- =============================================
CREATE TABLE product_records (
    record_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    connection_id UUID REFERENCES bank_connections(connection_id) ON DELETE SET NULL,
    product_type VARCHAR(50) NOT NULL CHECK (product_type IN (
        'car_insurance',
        'home_insurance',
        'life_insurance',
        'pet_insurance',
        'energy',
        'broadband',
        'subscription'
    )),
    provider_name VARCHAR(100) NOT NULL,
    annual_cost DECIMAL(10, 2) NOT NULL,
    frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('monthly', 'quarterly', 'annual', 'weekly')),
    confidence_score DECIMAL(3, 2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
    last_verified TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    excluded_by_user BOOLEAN NOT NULL DEFAULT false,
    excluded_reason VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_product_records_user_id ON product_records(user_id);
CREATE INDEX idx_product_records_user_type ON product_records(user_id, product_type);
CREATE INDEX idx_product_records_excluded ON product_records(user_id, excluded_by_user) WHERE excluded_by_user = false;

-- =============================================
-- Raw Transactions (classify-and-discard: purged within 24h)
-- =============================================
CREATE TABLE raw_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    connection_id UUID NOT NULL REFERENCES bank_connections(connection_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    truelayer_transaction_id VARCHAR(255) NOT NULL,
    account_id VARCHAR(255) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'GBP',
    description TEXT NOT NULL,
    merchant_name VARCHAR(255),
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('DEBIT', 'CREDIT')),
    transaction_category VARCHAR(100),
    transaction_date DATE NOT NULL,
    running_balance DECIMAL(12, 2),
    meta JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_raw_transactions_user_id ON raw_transactions(user_id);
CREATE INDEX idx_raw_transactions_connection_id ON raw_transactions(connection_id);
CREATE INDEX idx_raw_transactions_created_at ON raw_transactions(created_at);

-- =============================================
-- Comparison Results
-- =============================================
CREATE TABLE comparison_results (
    result_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    product_record_id UUID NOT NULL REFERENCES product_records(record_id) ON DELETE CASCADE,
    best_provider VARCHAR(100) NOT NULL,
    best_cost DECIMAL(10, 2) NOT NULL,
    saving DECIMAL(10, 2) NOT NULL,
    compared_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    rate_source_timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_comparison_results_user_id ON comparison_results(user_id);
CREATE INDEX idx_comparison_results_product_record ON comparison_results(product_record_id);
CREATE INDEX idx_comparison_results_created_at ON comparison_results(created_at);

-- =============================================
-- Switch Events
-- =============================================
CREATE TABLE switch_events (
    event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    product_type VARCHAR(50) NOT NULL,
    from_provider VARCHAR(100) NOT NULL,
    to_provider VARCHAR(100) NOT NULL,
    saving DECIMAL(10, 2),
    commission_gross DECIMAL(10, 2),
    commission_net DECIMAL(10, 2),
    status VARCHAR(20) NOT NULL DEFAULT 'initiated' CHECK (status IN ('initiated', 'completed', 'cancelled', 'failed')),
    affiliate_ref VARCHAR(255),
    commission_disclosure_shown BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_switch_events_user_id ON switch_events(user_id);
CREATE INDEX idx_switch_events_status ON switch_events(status);
CREATE INDEX idx_switch_events_created_at ON switch_events(created_at);

-- =============================================
-- Renewal Alerts
-- =============================================
CREATE TABLE renewal_alerts (
    alert_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    product_record_id UUID NOT NULL REFERENCES product_records(record_id) ON DELETE CASCADE,
    renewal_date_estimated DATE NOT NULL,
    alert_sent_at_60d TIMESTAMPTZ,
    alert_sent_at_14d TIMESTAMPTZ,
    user_actioned BOOLEAN NOT NULL DEFAULT false,
    user_actioned_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_renewal_alerts_user_id ON renewal_alerts(user_id);
CREATE INDEX idx_renewal_alerts_renewal_date ON renewal_alerts(renewal_date_estimated);

-- =============================================
-- Rate Database (no personal data)
-- =============================================
CREATE TABLE rate_records (
    rate_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_type VARCHAR(50) NOT NULL,
    provider VARCHAR(100) NOT NULL,
    annual_cost DECIMAL(10, 2) NOT NULL,
    effective_from DATE NOT NULL,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source VARCHAR(255) NOT NULL,
    UNIQUE (product_type, provider)
);

CREATE INDEX idx_rate_records_product_type ON rate_records(product_type);
CREATE INDEX idx_rate_records_provider ON rate_records(provider);

-- =============================================
-- Affiliate Merchants
-- =============================================
CREATE TABLE affiliate_merchants (
    merchant_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_name VARCHAR(100) NOT NULL UNIQUE,
    awin_merchant_id VARCHAR(50) NOT NULL,
    product_types VARCHAR(50)[] NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- Commission Rates
-- =============================================
CREATE TABLE commission_rates (
    rate_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_name VARCHAR(100) NOT NULL,
    product_type VARCHAR(50) NOT NULL,
    rate_percent DECIMAL(5, 2) NOT NULL,
    effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    active BOOLEAN NOT NULL DEFAULT true,
    UNIQUE(provider_name, product_type)
);

CREATE INDEX idx_commission_rates_lookup ON commission_rates(provider_name, product_type, active);

-- =============================================
-- Refresh Tokens
-- =============================================
CREATE TABLE refresh_tokens (
    user_id UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- =============================================
-- WebAuthn Credentials
-- =============================================
CREATE TABLE webauthn_credentials (
    credential_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    credential_external_id TEXT NOT NULL UNIQUE,
    public_key BYTEA NOT NULL,
    counter BIGINT NOT NULL DEFAULT 0,
    transports TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webauthn_credentials_user_id ON webauthn_credentials(user_id);

CREATE TABLE audit_logs (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    metadata JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- =============================================
-- Functions
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bank_connections_updated_at BEFORE UPDATE ON bank_connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_records_updated_at BEFORE UPDATE ON product_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_switch_events_updated_at BEFORE UPDATE ON switch_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_renewal_alerts_updated_at BEFORE UPDATE ON renewal_alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- Duplicate Charges
-- =============================================
CREATE TABLE duplicate_charges (
    duplicate_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    connection_id UUID NOT NULL REFERENCES bank_connections(connection_id) ON DELETE CASCADE,
    transaction_id UUID NOT NULL REFERENCES raw_transactions(transaction_id) ON DELETE CASCADE,
    duplicate_transaction_id UUID NOT NULL REFERENCES raw_transactions(transaction_id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL,
    merchant_name VARCHAR(255),
    description TEXT,
    transaction_date DATE NOT NULL,
    duplicate_transaction_date DATE NOT NULL,
    time_difference_hours DECIMAL(5, 2) NOT NULL,
    confidence DECIMAL(3, 2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    reason TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'confirmed_duplicate', 'false_positive', 'resolved')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_duplicate_pair UNIQUE (transaction_id, duplicate_transaction_id)
);

CREATE INDEX idx_duplicate_charges_user_id ON duplicate_charges(user_id);
CREATE INDEX idx_duplicate_charges_status ON duplicate_charges(status);
CREATE INDEX idx_duplicate_charges_created_at ON duplicate_charges(created_at);
CREATE INDEX idx_duplicate_charges_confidence ON duplicate_charges(confidence DESC);

CREATE TRIGGER update_duplicate_charges_updated_at BEFORE UPDATE ON duplicate_charges
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- Dormant Subscriptions
-- =============================================
CREATE TABLE dormant_subscriptions (
    dormant_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    product_record_id UUID NOT NULL REFERENCES product_records(record_id) ON DELETE CASCADE,
    product_type VARCHAR(50) NOT NULL,
    provider_name VARCHAR(255) NOT NULL,
    annual_cost DECIMAL(12, 2) NOT NULL,
    frequency VARCHAR(20) NOT NULL,
    last_charge_date DATE,
    last_activity_date DATE,
    days_since_last_charge INTEGER NOT NULL,
    days_since_last_activity INTEGER NOT NULL,
    estimated_monthly_cost DECIMAL(10, 2) NOT NULL,
    potential_savings DECIMAL(10, 2) NOT NULL,
    dormant_reason TEXT NOT NULL,
    confidence DECIMAL(3, 2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    status VARCHAR(20) NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'confirmed_dormant', 'false_positive', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_dormant_product UNIQUE (product_record_id)
);

CREATE INDEX idx_dormant_subscriptions_user_id ON dormant_subscriptions(user_id);
CREATE INDEX idx_dormant_subscriptions_status ON dormant_subscriptions(status);
CREATE INDEX idx_dormant_subscriptions_created_at ON dormant_subscriptions(created_at);
CREATE INDEX idx_dormant_subscriptions_potential_savings ON dormant_subscriptions(potential_savings DESC);

CREATE TRIGGER update_dormant_subscriptions_updated_at BEFORE UPDATE ON dormant_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
