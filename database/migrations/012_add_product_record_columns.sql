-- Migration: Add missing columns to product_records for status, contract end date, and tariff name
-- These columns are expected by the renewal detection and subscription management features.

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'product_records' AND column_name = 'status'
    ) THEN
        ALTER TABLE product_records 
        ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active' 
        CHECK (status IN ('active', 'cancelled', 'switched'));
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'product_records' AND column_name = 'contract_end_date'
    ) THEN
        ALTER TABLE product_records 
        ADD COLUMN contract_end_date DATE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'product_records' AND column_name = 'tariff_name'
    ) THEN
        ALTER TABLE product_records 
        ADD COLUMN tariff_name VARCHAR(255);
    END IF;
END $$;
