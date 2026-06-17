-- Product Exclusion Migration
-- Creates tables for product exclusions and exclusion rules

-- Product exclusions table
CREATE TABLE IF NOT EXISTS product_exclusions (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    record_id UUID NOT NULL REFERENCES product_records(record_id) ON DELETE CASCADE,
    is_excluded BOOLEAN NOT NULL DEFAULT false,
    exclusion_reason TEXT,
    exclusion_date TIMESTAMP,
    rule_id UUID REFERENCES exclusion_rules(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, record_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_exclusions_user_id ON product_exclusions(user_id);
CREATE INDEX IF NOT EXISTS idx_product_exclusions_record_id ON product_exclusions(record_id);
CREATE INDEX IF NOT EXISTS idx_product_exclusions_is_excluded ON product_exclusions(is_excluded);
CREATE INDEX IF NOT EXISTS idx_product_exclusions_rule_id ON product_exclusions(rule_id);
CREATE INDEX IF NOT EXISTS idx_product_exclusions_exclusion_date ON product_exclusions(exclusion_date);

-- Create trigger for updated_at
CREATE TRIGGER update_product_exclusions_updated_at BEFORE UPDATE ON product_exclusions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Exclusion rules table
CREATE TABLE IF NOT EXISTS exclusion_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    rule_type VARCHAR(20) NOT NULL CHECK (rule_type IN ('provider', 'product_type', 'cost_range', 'custom')),
    rule_value TEXT NOT NULL,
    description TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_exclusion_rules_user_id ON exclusion_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_exclusion_rules_rule_type ON exclusion_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_exclusion_rules_is_active ON exclusion_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_exclusion_rules_created_at ON exclusion_rules(created_at);

-- Create trigger for updated_at
CREATE TRIGGER update_exclusion_rules_updated_at BEFORE UPDATE ON exclusion_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Exclusion settings table
CREATE TABLE IF NOT EXISTS exclusion_settings (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    exclude_cancelled_products BOOLEAN NOT NULL DEFAULT true,
    exclude_low_value_products BOOLEAN NOT NULL DEFAULT false,
    low_value_threshold DECIMAL(10,2) NOT NULL DEFAULT 100.00,
    auto_renewal_exclusions BOOLEAN NOT NULL DEFAULT false,
    notification_preferences JSONB NOT NULL DEFAULT '{
        "renewal_alerts": true,
        "price_hike_alerts": true,
        "comparison_alerts": true
    }'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_exclusion_settings_user_id ON exclusion_settings(user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_exclusion_settings_updated_at BEFORE UPDATE ON exclusion_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create view for exclusion statistics
CREATE OR REPLACE VIEW exclusion_statistics AS
SELECT 
    pe.user_id,
    COUNT(*) as total_products,
    COUNT(CASE WHEN pe.is_excluded THEN 1 END) as excluded_products,
    COUNT(CASE WHEN NOT pe.is_excluded THEN 1 END) as included_products,
    ROUND(
        (COUNT(CASE WHEN pe.is_excluded THEN 1 END)::decimal / NULLIF(COUNT(*), 0)) * 100, 
        2
    ) as exclusion_rate,
    COUNT(DISTINCT er.id) as active_rules
FROM product_records pr
LEFT JOIN product_exclusions pe ON pr.record_id = pe.record_id AND pr.user_id = pe.user_id
LEFT JOIN exclusion_rules er ON pr.user_id = er.user_id AND er.is_active = true
GROUP BY pe.user_id;

-- Create view for exclusion analytics
CREATE OR REPLACE VIEW exclusion_analytics AS
SELECT 
    DATE_TRUNC('month', pe.created_at) as month,
    COUNT(*) as total_exclusions,
    COUNT(CASE WHEN pe.is_excluded THEN 1 END) as active_exclusions,
    COUNT(CASE WHEN NOT pe.is_excluded THEN 1 END) as re_inclusions,
    COUNT(DISTINCT pe.user_id) as unique_users,
    COUNT(DISTINCT pe.record_id) as unique_products
FROM product_exclusions pe
GROUP BY DATE_TRUNC('month', pe.created_at)
ORDER BY month DESC;

-- Create view for rule effectiveness
CREATE OR REPLACE VIEW rule_effectiveness AS
SELECT 
    er.id,
    er.user_id,
    er.rule_type,
    er.rule_value,
    er.description,
    er.is_active,
    COUNT(pe.record_id) as affected_products,
    COUNT(CASE WHEN pe.is_excluded THEN 1 END) as active_exclusions,
    ROUND(
        (COUNT(CASE WHEN pe.is_excluded THEN 1 END)::decimal / NULLIF(COUNT(pe.record_id), 0)) * 100, 
        2
    ) as effectiveness_rate,
    er.created_at
FROM exclusion_rules er
LEFT JOIN product_exclusions pe ON er.id = pe.rule_id
GROUP BY er.id, er.user_id, er.rule_type, er.rule_value, er.description, er.is_active, er.created_at
ORDER BY effectiveness_rate DESC;

-- Create function to apply exclusion rules
CREATE OR REPLACE FUNCTION apply_exclusion_rules(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_rules_applied INTEGER := 0;
    v_rule RECORD;
    v_affected_count INTEGER;
BEGIN
    -- Loop through active exclusion rules
    FOR v_rule IN 
        SELECT id, rule_type, rule_value, description 
        FROM exclusion_rules 
        WHERE user_id = p_user_id AND is_active = true
    LOOP
        -- Remove existing exclusions from this rule
        DELETE FROM product_exclusions 
        WHERE rule_id = v_rule.id AND user_id = p_user_id;
        
        -- Apply rule based on type
        IF v_rule.rule_type = 'provider' THEN
            INSERT INTO product_exclusions (user_id, record_id, is_excluded, exclusion_reason, exclusion_date, rule_id)
            SELECT 
                p_user_id,
                pr.record_id,
                true,
                'Applied by rule: ' || v_rule.description,
                NOW(),
                v_rule.id
            FROM product_records pr
            WHERE pr.user_id = p_user_id 
                AND pr.provider_name = v_rule.rule_value
                AND pr.status = 'active'
            ON CONFLICT (user_id, record_id) 
            DO UPDATE SET
                is_excluded = EXCLUDED.is_excluded,
                exclusion_reason = EXCLUDED.exclusion_reason,
                exclusion_date = EXCLUDED.exclusion_date,
                rule_id = EXCLUDED.rule_id,
                updated_at = NOW();
                
            GET DIAGNOSTICS v_affected_count = ROW_COUNT;
            v_rules_applied := v_rules_applied + v_affected_count;
            
        ELSIF v_rule.rule_type = 'product_type' THEN
            INSERT INTO product_exclusions (user_id, record_id, is_excluded, exclusion_reason, exclusion_date, rule_id)
            SELECT 
                p_user_id,
                pr.record_id,
                true,
                'Applied by rule: ' || v_rule.description,
                NOW(),
                v_rule.id
            FROM product_records pr
            WHERE pr.user_id = p_user_id 
                AND pr.product_type = v_rule.rule_value
                AND pr.status = 'active'
            ON CONFLICT (user_id, record_id) 
            DO UPDATE SET
                is_excluded = EXCLUDED.is_excluded,
                exclusion_reason = EXCLUDED.exclusion_reason,
                exclusion_date = EXCLUDED.exclusion_date,
                rule_id = EXCLUDED.rule_id,
                updated_at = NOW();
                
            GET DIAGNOSTICS v_affected_count = ROW_COUNT;
            v_rules_applied := v_rules_applied + v_affected_count;
            
        ELSIF v_rule.rule_type = 'cost_range' THEN
            -- Handle cost range rules (e.g., ">1000" or "<50")
            IF v_rule.rule_value LIKE '>%' THEN
                INSERT INTO product_exclusions (user_id, record_id, is_excluded, exclusion_reason, exclusion_date, rule_id)
                SELECT 
                    p_user_id,
                    pr.record_id,
                    true,
                    'Applied by rule: ' || v_rule.description,
                    NOW(),
                    v_rule.id
                FROM product_records pr
                WHERE pr.user_id = p_user_id 
                    AND pr.annual_cost > CAST(SUBSTRING(v_rule.rule_value, 2) AS DECIMAL)
                    AND pr.status = 'active'
                ON CONFLICT (user_id, record_id) 
                DO UPDATE SET
                    is_excluded = EXCLUDED.is_excluded,
                    exclusion_reason = EXCLUDED.exclusion_reason,
                    exclusion_date = EXCLUDED.exclusion_date,
                    rule_id = EXCLUDED.rule_id,
                    updated_at = NOW();
                    
                GET DIAGNOSTICS v_affected_count = ROW_COUNT;
                v_rules_applied := v_rules_applied + v_affected_count;
                
            ELSIF v_rule.rule_value LIKE '<%' THEN
                INSERT INTO product_exclusions (user_id, record_id, is_excluded, exclusion_reason, exclusion_date, rule_id)
                SELECT 
                    p_user_id,
                    pr.record_id,
                    true,
                    'Applied by rule: ' || v_rule.description,
                    NOW(),
                    v_rule.id
                FROM product_records pr
                WHERE pr.user_id = p_user_id 
                    AND pr.annual_cost < CAST(SUBSTRING(v_rule.rule_value, 2) AS DECIMAL)
                    AND pr.status = 'active'
                ON CONFLICT (user_id, record_id) 
                DO UPDATE SET
                    is_excluded = EXCLUDED.is_excluded,
                    exclusion_reason = EXCLUDED.exclusion_reason,
                    exclusion_date = EXCLUDED.exclusion_date,
                    rule_id = EXCLUDED.rule_id,
                    updated_at = NOW();
                    
                GET DIAGNOSTICS v_affected_count = ROW_COUNT;
                v_rules_applied := v_rules_applied + v_affected_count;
            END IF;
        END IF;
    END LOOP;
    
    RETURN v_rules_applied;
END;
$$ LANGUAGE plpgsql;

-- Create function to apply exclusion settings
CREATE OR REPLACE FUNCTION apply_exclusion_settings(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_settings RECORD;
    v_affected_count INTEGER := 0;
BEGIN
    -- Get user's exclusion settings
    SELECT * INTO v_settings 
    FROM exclusion_settings 
    WHERE user_id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN 0;
    END IF;
    
    -- Apply cancelled products exclusion
    IF v_settings.exclude_cancelled_products THEN
        INSERT INTO product_exclusions (user_id, record_id, is_excluded, exclusion_reason, exclusion_date)
        SELECT 
            p_user_id,
            pr.record_id,
            true,
            'Automatically excluded: Cancelled product',
            NOW()
        FROM product_records pr
        WHERE pr.user_id = p_user_id 
            AND pr.status = 'cancelled' 
            AND pr.record_id NOT IN (
                SELECT record_id FROM product_exclusions WHERE user_id = p_user_id
            )
        ON CONFLICT (user_id, record_id) 
        DO UPDATE SET
            is_excluded = EXCLUDED.is_excluded,
            exclusion_reason = EXCLUDED.exclusion_reason,
            exclusion_date = EXCLUDED.exclusion_date,
            updated_at = NOW();
            
        GET DIAGNOSTICS v_affected_count = ROW_COUNT;
        v_affected_count := v_affected_count + v_affected_count;
    END IF;
    
    -- Apply low value products exclusion
    IF v_settings.exclude_low_value_products THEN
        INSERT INTO product_exclusions (user_id, record_id, is_excluded, exclusion_reason, exclusion_date)
        SELECT 
            p_user_id,
            pr.record_id,
            true,
            'Automatically excluded: Low value product',
            NOW()
        FROM product_records pr
        WHERE pr.user_id = p_user_id 
            AND pr.annual_cost < v_settings.low_value_threshold
            AND pr.status = 'active'
            AND pr.record_id NOT IN (
                SELECT record_id FROM product_exclusions WHERE user_id = p_user_id
            )
        ON CONFLICT (user_id, record_id) 
        DO UPDATE SET
            is_excluded = EXCLUDED.is_excluded,
            exclusion_reason = EXCLUDED.exclusion_reason,
            exclusion_date = EXCLUDED.exclusion_date,
            updated_at = NOW();
            
        GET DIAGNOSTICS v_affected_count = ROW_COUNT;
        v_affected_count := v_affected_count + v_affected_count;
    END IF;
    
    RETURN v_affected_count;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically apply rules when a new rule is created
CREATE OR REPLACE FUNCTION auto_apply_exclusion_rules()
RETURNS TRIGGER AS $$
BEGIN
    -- Apply the new rule to existing products
    PERFORM apply_exclusion_rules(NEW.user_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic rule application
CREATE TRIGGER auto_apply_exclusion_rules_trigger
    AFTER INSERT ON exclusion_rules
    FOR EACH ROW
    EXECUTE FUNCTION auto_apply_exclusion_rules();

-- Create trigger to automatically apply settings when settings are updated
CREATE OR REPLACE FUNCTION auto_apply_exclusion_settings()
RETURNS TRIGGER AS $$
BEGIN
    -- Apply the updated settings to existing products
    PERFORM apply_exclusion_settings(NEW.user_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic settings application
CREATE TRIGGER auto_apply_exclusion_settings_trigger
    AFTER INSERT OR UPDATE ON exclusion_settings
    FOR EACH ROW
    EXECUTE FUNCTION auto_apply_exclusion_settings();

-- Insert default exclusion settings for existing users
INSERT INTO exclusion_settings (user_id, exclude_cancelled_products, exclude_low_value_products, low_value_threshold, auto_renewal_exclusions, notification_preferences)
SELECT 
    user_id,
    true,
    false,
    100.00,
    false,
    '{
        "renewal_alerts": true,
        "price_hike_alerts": true,
        "comparison_alerts": true
    }'::jsonb
FROM users
WHERE user_id NOT IN (SELECT user_id FROM exclusion_settings)
ON CONFLICT (user_id) DO NOTHING;
