-- Cost Change Tracking Migration
-- Creates tables for tracking subscription cost changes over time

-- Cost changes table
CREATE TABLE IF NOT EXISTS cost_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    record_id UUID NOT NULL REFERENCES product_records(record_id) ON DELETE CASCADE,
    provider_name VARCHAR(255) NOT NULL,
    product_type VARCHAR(50) NOT NULL,
    old_cost DECIMAL(10,2) NOT NULL,
    new_cost DECIMAL(10,2) NOT NULL,
    change_amount DECIMAL(10,2) NOT NULL,
    change_percentage DECIMAL(5,2) NOT NULL,
    change_type VARCHAR(20) NOT NULL CHECK (change_type IN ('increase', 'decrease', 'no_change')),
    change_date TIMESTAMP NOT NULL,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    source VARCHAR(20) NOT NULL CHECK (source IN ('manual', 'automatic', 'import', 'user_reported')),
    notes TEXT,
    is_significant BOOLEAN NOT NULL DEFAULT false,
    impact_level VARCHAR(10) NOT NULL CHECK (impact_level IN ('low', 'medium', 'high')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_cost_changes_user_id ON cost_changes(user_id);
CREATE INDEX IF NOT EXISTS idx_cost_changes_record_id ON cost_changes(record_id);
CREATE INDEX IF NOT EXISTS idx_cost_changes_change_date ON cost_changes(change_date);
CREATE INDEX IF NOT EXISTS idx_cost_changes_change_type ON cost_changes(change_type);
CREATE INDEX IF NOT EXISTS idx_cost_changes_impact_level ON cost_changes(impact_level);
CREATE INDEX IF NOT EXISTS idx_cost_changes_is_significant ON cost_changes(is_significant);
CREATE INDEX IF NOT EXISTS idx_cost_changes_provider_name ON cost_changes(provider_name);
CREATE INDEX IF NOT EXISTS idx_cost_changes_product_type ON cost_changes(product_type);

-- Create trigger for updated_at
CREATE TRIGGER update_cost_changes_updated_at BEFORE UPDATE ON cost_changes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Cost change alerts table
CREATE TABLE IF NOT EXISTS cost_change_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    record_id UUID NOT NULL REFERENCES product_records(record_id) ON DELETE CASCADE,
    alert_type VARCHAR(20) NOT NULL CHECK (alert_type IN ('significant_increase', 'unusual_change', 'trend_alert')),
    threshold DECIMAL(5,2) NOT NULL,
    current_value DECIMAL(10,2) NOT NULL,
    threshold_value DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_triggered TIMESTAMP,
    trigger_count INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, record_id, alert_type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_cost_change_alerts_user_id ON cost_change_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_cost_change_alerts_record_id ON cost_change_alerts(record_id);
CREATE INDEX IF NOT EXISTS idx_cost_change_alerts_alert_type ON cost_change_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_cost_change_alerts_is_active ON cost_change_alerts(is_active);
CREATE INDEX IF NOT EXISTS idx_cost_change_alerts_last_triggered ON cost_change_alerts(last_triggered);

-- Create trigger for updated_at
CREATE TRIGGER update_cost_change_alerts_updated_at BEFORE UPDATE ON cost_change_alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create view for cost change analytics
CREATE OR REPLACE VIEW cost_change_analytics AS
SELECT 
    DATE_TRUNC('month', cc.change_date) as month,
    cc.product_type,
    COUNT(*) as total_changes,
    COUNT(CASE WHEN cc.change_type = 'increase' THEN 1 END) as increases,
    COUNT(CASE WHEN cc.change_type = 'decrease' THEN 1 END) as decreases,
    COALESCE(SUM(cc.change_amount), 0) as net_change,
    COALESCE(AVG(cc.change_percentage), 0) as average_change_percentage,
    COUNT(CASE WHEN cc.is_significant THEN 1 END) as significant_changes,
    COUNT(DISTINCT cc.user_id) as affected_users,
    COUNT(DISTINCT cc.provider_name) as unique_providers
FROM cost_changes cc
GROUP BY DATE_TRUNC('month', cc.change_date), cc.product_type
ORDER BY month DESC, cc.product_type;

-- Create view for provider cost change analysis
CREATE OR REPLACE VIEW provider_cost_change_analysis AS
SELECT 
    cc.provider_name,
    cc.product_type,
    COUNT(*) as total_changes,
    COUNT(CASE WHEN cc.change_type = 'increase' THEN 1 END) as increases,
    COUNT(CASE WHEN cc.change_type = 'decrease' THEN 1 END) as decreases,
    COALESCE(SUM(cc.change_amount), 0) as total_change,
    COALESCE(AVG(cc.change_percentage), 0) as average_change_percentage,
    MAX(cc.change_percentage) as max_increase,
    MIN(cc.change_percentage) as max_decrease,
    COUNT(CASE WHEN cc.is_significant THEN 1 END) as significant_changes,
    COUNT(DISTINCT cc.user_id) as affected_users,
    MAX(cc.change_date) as last_change_date
FROM cost_changes cc
GROUP BY cc.provider_name, cc.product_type
ORDER BY total_changes DESC;

-- Create view for user cost impact summary
CREATE OR REPLACE VIEW user_cost_impact_summary AS
SELECT 
    cc.user_id,
    u.email,
    u.first_name,
    COUNT(*) as total_changes,
    COUNT(CASE WHEN cc.change_type = 'increase' THEN 1 END) as increases,
    COUNT(CASE WHEN cc.change_type = 'decrease' THEN 1 END) as decreases,
    COALESCE(SUM(cc.change_amount), 0) as net_annual_change,
    COALESCE(SUM(CASE WHEN cc.change_type = 'increase' THEN cc.change_amount ELSE 0 END), 0) as total_increases,
    COALESCE(SUM(CASE WHEN cc.change_type = 'decrease' THEN ABS(cc.change_amount) ELSE 0 END), 0) as total_decreases,
    COALESCE(AVG(cc.change_percentage), 0) as average_change_percentage,
    COUNT(CASE WHEN cc.is_significant THEN 1 END) as significant_changes,
    MAX(cc.change_date) as last_change_date
FROM cost_changes cc
JOIN users u ON cc.user_id = u.user_id
GROUP BY cc.user_id, u.email, u.first_name
ORDER BY net_annual_change DESC;

-- Create view for cost change trends
CREATE OR REPLACE VIEW cost_change_trends AS
SELECT 
    cc.user_id,
    cc.record_id,
    cc.provider_name,
    cc.product_type,
    FIRST_VALUE(cc.new_cost) OVER (PARTITION BY cc.record_id ORDER BY cc.change_date ASC) as initial_cost,
    FIRST_VALUE(cc.new_cost) OVER (PARTITION BY cc.record_id ORDER BY cc.change_date DESC) as current_cost,
    COUNT(*) as change_count,
    COALESCE(SUM(cc.change_amount), 0) as total_change,
    COALESCE(AVG(cc.change_percentage), 0) as average_change_percentage,
    MIN(cc.change_date) as first_change_date,
    MAX(cc.change_date) as last_change_date,
    CASE 
        WHEN COUNT(*) = 1 THEN 'stable'
        WHEN (LAST_VALUE(cc.new_cost) OVER (PARTITION BY cc.record_id ORDER BY cc.change_date DESC) - 
              FIRST_VALUE(cc.new_cost) OVER (PARTITION BY cc.record_id ORDER BY cc.change_date ASC)) > 0 
        THEN 'increasing'
        ELSE 'decreasing'
    END as trend
FROM cost_changes cc
GROUP BY cc.user_id, cc.record_id, cc.provider_name, cc.product_type
ORDER BY total_change DESC;

-- Create function to automatically detect cost changes
CREATE OR REPLACE FUNCTION detect_cost_changes(p_user_id UUID, p_record_id UUID)
RETURNS TABLE (
    detected_change BOOLEAN,
    old_cost DECIMAL,
    new_cost DECIMAL,
    change_percentage DECIMAL
) AS $$
DECLARE
    v_latest_cost DECIMAL;
    v_previous_cost DECIMAL;
    v_change_percentage DECIMAL;
BEGIN
    -- Get the latest cost from cost history
    SELECT annual_cost INTO v_latest_cost
    FROM product_cost_history
    WHERE user_id = p_user_id AND record_id = p_record_id
    ORDER BY recorded_at DESC
    LIMIT 1;
    
    -- Get the previous cost (second latest)
    SELECT annual_cost INTO v_previous_cost
    FROM product_cost_history
    WHERE user_id = p_user_id AND record_id = p_record_id
    ORDER BY recorded_at DESC
    LIMIT 1 OFFSET 1;
    
    -- If we don't have previous data, no change to detect
    IF v_previous_cost IS NULL OR v_latest_cost IS NULL THEN
        RETURN QUERY SELECT false, NULL, NULL, NULL;
        RETURN;
    END IF;
    
    -- Calculate change percentage
    v_change_percentage := CASE 
        WHEN v_previous_cost = 0 THEN 0
        ELSE ((v_latest_cost - v_previous_cost) / v_previous_cost) * 100
    END;
    
    -- Return the detected change
    RETURN QUERY SELECT 
        v_latest_cost != v_previous_cost,
        v_previous_cost,
        v_latest_cost,
        v_change_percentage;
END;
$$ LANGUAGE plpgsql;

-- Create function to record cost change automatically
CREATE OR REPLACE FUNCTION record_cost_change(
    p_user_id UUID,
    p_record_id UUID,
    p_new_cost DECIMAL,
    p_source VARCHAR DEFAULT 'automatic'
)
RETURNS UUID AS $$
DECLARE
    v_change_id UUID;
    v_old_cost DECIMAL;
    v_change_amount DECIMAL;
    v_change_percentage DECIMAL;
    v_change_type VARCHAR;
    v_is_significant BOOLEAN;
    v_impact_level VARCHAR;
    v_provider_name VARCHAR;
    v_product_type VARCHAR;
BEGIN
    -- Get the latest cost from cost history
    SELECT annual_cost INTO v_old_cost
    FROM product_cost_history
    WHERE user_id = p_user_id AND record_id = p_record_id
    ORDER BY recorded_at DESC
    LIMIT 1;
    
    -- If no previous cost, insert without change tracking
    IF v_old_cost IS NULL THEN
        INSERT INTO product_cost_history (user_id, record_id, annual_cost, source, recorded_at)
        VALUES (p_user_id, p_record_id, p_new_cost, p_source, NOW());
        RETURN NULL;
    END IF;
    
    -- Skip if cost hasn't changed
    IF v_old_cost = p_new_cost THEN
        RETURN NULL;
    END IF;
    
    -- Get product details
    SELECT provider_name, product_type INTO v_provider_name, v_product_type
    FROM product_records
    WHERE record_id = p_record_id AND user_id = p_user_id;
    
    -- Calculate change metrics
    v_change_amount := p_new_cost - v_old_cost;
    v_change_percentage := CASE 
        WHEN v_old_cost = 0 THEN 0
        ELSE (v_change_amount / v_old_cost) * 100
    END;
    
    v_change_type := CASE 
        WHEN v_change_amount > 0 THEN 'increase'
        WHEN v_change_amount < 0 THEN 'decrease'
        ELSE 'no_change'
    END;
    
    v_is_significant := ABS(v_change_percentage) >= 5;
    
    v_impact_level := CASE 
        WHEN ABS(v_change_percentage) >= 20 THEN 'high'
        WHEN ABS(v_change_percentage) >= 10 THEN 'medium'
        ELSE 'low'
    END;
    
    -- Insert cost change record
    INSERT INTO cost_changes (
        user_id, record_id, provider_name, product_type, old_cost, new_cost,
        change_amount, change_percentage, change_type, change_date, detected_at,
        source, is_significant, impact_level
    ) VALUES (
        p_user_id, p_record_id, v_provider_name, v_product_type, v_old_cost, p_new_cost,
        v_change_amount, v_change_percentage, v_change_type, NOW(), NOW(),
        p_source, v_is_significant, v_impact_level
    ) RETURNING id INTO v_change_id;
    
    -- Update cost history
    INSERT INTO product_cost_history (user_id, record_id, annual_cost, source, recorded_at)
    VALUES (p_user_id, p_record_id, p_new_cost, p_source, NOW())
    ON CONFLICT (user_id, record_id, recorded_at) 
    DO UPDATE SET
        annual_cost = EXCLUDED.annual_cost,
        source = EXCLUDED.source;
    
    -- Update current product cost
    UPDATE product_records 
    SET annual_cost = p_new_cost, last_updated = NOW() 
    WHERE record_id = p_record_id AND user_id = p_user_id;
    
    RETURN v_change_id;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically record cost changes when product cost is updated
CREATE OR REPLACE FUNCTION auto_record_cost_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only record if cost actually changed
    IF OLD.annual_cost IS DISTINCT FROM NEW.annual_cost THEN
        PERFORM record_cost_change(NEW.user_id, NEW.record_id, NEW.annual_cost, 'automatic');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic cost change recording
CREATE TRIGGER auto_record_cost_change_trigger
    AFTER UPDATE OF annual_cost ON product_records
    FOR EACH ROW
    EXECUTE FUNCTION auto_record_cost_change();

-- Create function to clean up old cost change data
CREATE OR REPLACE FUNCTION cleanup_cost_changes(p_keep_months INTEGER DEFAULT 24)
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    -- Delete cost changes older than specified months
    DELETE FROM cost_changes 
    WHERE created_at < NOW() - INTERVAL '1 month' * p_keep_months;
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    -- Log the cleanup
    RAISE LOG 'Cleaned up % old cost change records older than % months', v_deleted_count, p_keep_months;
    
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to get cost change predictions
CREATE OR REPLACE FUNCTION get_cost_change_predictions(p_user_id UUID, p_record_id UUID, p_months_ahead INTEGER DEFAULT 3)
RETURNS TABLE (
    predicted_month DATE,
    predicted_cost DECIMAL,
    confidence DECIMAL
) AS $$
DECLARE
    v_monthly_change DECIMAL;
    v_volatility DECIMAL;
    v_current_cost DECIMAL;
    v_prediction_count INTEGER;
BEGIN
    -- Calculate average monthly change and volatility
    SELECT 
        AVG(change_percentage) as monthly_change,
        STDDEV(change_percentage) as volatility
    INTO v_monthly_change, v_volatility
    FROM cost_changes
    WHERE user_id = p_user_id AND record_id = p_record_id
      AND change_date >= NOW() - INTERVAL '6 months';
    
    -- Get current cost
    SELECT annual_cost INTO v_current_cost
    FROM product_records
    WHERE record_id = p_record_id AND user_id = p_user_id;
    
    -- Generate predictions
    v_prediction_count := 0;
    WHILE v_prediction_count < p_months_ahead LOOP
        v_prediction_count := v_prediction_count + 1;
        
        RETURN QUERY SELECT 
            (NOW() + (v_prediction_count || ' months')::INTERVAL)::DATE,
            v_current_cost * POWER(1 + (v_monthly_change / 100), v_prediction_count),
            GREATEST(0.1, 1 - (v_volatility / 100) - (v_prediction_count * 0.2));
    END LOOP;
    
END;
$$ LANGUAGE plpgsql;

-- Insert initial cost change alerts for existing products (optional)
-- This would be run after migration to set up default alerts
DO $$
DECLARE
    v_product RECORD;
BEGIN
    -- Create alerts for products with significant cost history
    FOR v_product IN 
        SELECT DISTINCT pr.user_id, pr.record_id
        FROM product_records pr
        JOIN cost_changes cc ON pr.record_id = cc.record_id
        WHERE pr.status = 'active'
          AND cc.change_date >= NOW() - INTERVAL '3 months'
    LOOP
        INSERT INTO cost_change_alerts (user_id, record_id, alert_type, threshold, current_value, threshold_value)
        VALUES (
            v_product.user_id,
            v_product.record_id,
            'significant_increase',
            10.0, -- 10% threshold
            (SELECT annual_cost FROM product_records WHERE record_id = v_product.record_id),
            (SELECT annual_cost * 1.10 FROM product_records WHERE record_id = v_product.record_id)
        )
        ON CONFLICT (user_id, record_id, alert_type) DO NOTHING;
    END LOOP;
END $$;
