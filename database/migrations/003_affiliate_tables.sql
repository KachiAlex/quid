-- Migration: Add affiliate merchant and commission rate tables

CREATE TABLE IF NOT EXISTS affiliate_merchants (
    merchant_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_name VARCHAR(100) NOT NULL UNIQUE,
    awin_merchant_id VARCHAR(50) NOT NULL,
    product_types VARCHAR(50)[] NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS commission_rates (
    rate_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_name VARCHAR(100) NOT NULL,
    product_type VARCHAR(50) NOT NULL,
    rate_percent DECIMAL(5, 2) NOT NULL,
    effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    active BOOLEAN NOT NULL DEFAULT true,
    UNIQUE(provider_name, product_type)
);

CREATE INDEX IF NOT EXISTS idx_commission_rates_lookup ON commission_rates(provider_name, product_type, active);
