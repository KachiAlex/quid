-- Renewal Detection Migration
-- Creates tables for renewal detection and alerting

-- Product cost history table for price hike detection
CREATE TABLE IF NOT EXISTS product_cost_history (
    id SERIAL PRIMARY KEY,
    record_id UUID NOT NULL REFERENCES product_records(record_id) ON DELETE CASCADE,
    annual_cost DECIMAL(10,2) NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    source VARCHAR(50) DEFAULT 'user_input',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_cost_history_record_id ON product_cost_history(record_id);
CREATE INDEX IF NOT EXISTS idx_product_cost_history_recorded_at ON product_cost_history(recorded_at);

-- Renewal alerts table
CREATE TABLE IF NOT EXISTS renewal_alerts (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id),
    record_id UUID NOT NULL REFERENCES product_records(record_id) ON DELETE CASCADE,
    provider_name VARCHAR(255) NOT NULL,
    product_type VARCHAR(50) NOT NULL,
    renewal_date DATE NOT NULL,
    days_until_renewal INTEGER NOT NULL,
    annual_cost DECIMAL(10,2) NOT NULL,
    alert_type VARCHAR(20) NOT NULL CHECK (alert_type IN ('60_day', '14_day', 'imminent', 'overdue')),
    current_tariff VARCHAR(255),
    best_alternatives JSONB,
    price_hike_detected BOOLEAN DEFAULT false,
    price_hike_percentage DECIMAL(5,2),
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_renewal_alerts_user_id ON renewal_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_renewal_alerts_record_id ON renewal_alerts(record_id);
CREATE INDEX IF NOT EXISTS idx_renewal_alerts_renewal_date ON renewal_alerts(renewal_date);
CREATE INDEX IF NOT EXISTS idx_renewal_alerts_alert_type ON renewal_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_renewal_alerts_sent_at ON renewal_alerts(sent_at);

-- Create trigger for updated_at
CREATE TRIGGER update_renewal_alerts_updated_at BEFORE UPDATE ON renewal_alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Renewal statistics table for tracking trends
CREATE TABLE IF NOT EXISTS renewal_statistics (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    total_renewals INTEGER DEFAULT 0,
    upcoming_renewals INTEGER DEFAULT 0,
    overdue_renewals INTEGER DEFAULT 0,
    total_potential_savings DECIMAL(12,2) DEFAULT 0,
    average_price_hike DECIMAL(5,2) DEFAULT 0,
    alerts_sent INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_renewal_statistics_date ON renewal_statistics(date);

-- Create trigger for updated_at
CREATE TRIGGER update_renewal_statistics_updated_at BEFORE UPDATE ON renewal_statistics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create view for active renewals
CREATE OR REPLACE VIEW active_renewals AS
SELECT 
    ra.id,
    ra.user_id,
    u.email,
    u.first_name,
    u.last_name,
    ra.record_id,
    ra.provider_name,
    ra.product_type,
    ra.renewal_date,
    ra.days_until_renewal,
    ra.annual_cost,
    ra.alert_type,
    ra.current_tariff,
    ra.best_alternatives,
    ra.price_hike_detected,
    ra.price_hike_percentage,
    ra.sent_at,
    ra.created_at
FROM renewal_alerts ra
JOIN users u ON ra.user_id = u.user_id
WHERE ra.renewal_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY ra.renewal_date ASC;

-- Create view for renewal analytics
CREATE OR REPLACE VIEW renewal_analytics AS
SELECT 
    DATE_TRUNC('month', ra.renewal_date) as month,
    ra.product_type,
    COUNT(*) as total_renewals,
    COUNT(CASE WHEN ra.alert_type = '60_day' THEN 1 END) as day_60_alerts,
    COUNT(CASE WHEN ra.alert_type = '14_day' THEN 1 END) as day_14_alerts,
    COUNT(CASE WHEN ra.alert_type = 'imminent' THEN 1 END) as imminent_alerts,
    COUNT(CASE WHEN ra.alert_type = 'overdue' THEN 1 END) as overdue_alerts,
    AVG(ra.annual_cost) as average_annual_cost,
    COALESCE(SUM(CASE WHEN ra.best_alternatives IS NOT NULL THEN 
        (SELECT COALESCE(MAX((ra.annual_cost::decimal - alt.cost::decimal)), 0) 
         FROM json_array_elements(ra.best_alternatives) as alt(cost decimal)) 
        ELSE 0 END), 0) as total_potential_savings,
    COUNT(CASE WHEN ra.price_hike_detected THEN 1 END) as price_hikes_detected,
    AVG(CASE WHEN ra.price_hike_detected THEN ra.price_hike_percentage ELSE 0 END) as average_price_hike
FROM renewal_alerts ra
GROUP BY DATE_TRUNC('month', ra.renewal_date), ra.product_type
ORDER BY month DESC, ra.product_type;

-- Create view for user renewal summary
CREATE OR REPLACE VIEW user_renewal_summary AS
SELECT 
    ra.user_id,
    u.email,
    u.first_name,
    u.last_name,
    COUNT(*) as total_alerts,
    COUNT(CASE WHEN ra.alert_type = '60_day' THEN 1 END) as day_60_alerts,
    COUNT(CASE WHEN ra.alert_type = '14_day' THEN 1 END) as day_14_alerts,
    COUNT(CASE WHEN ra.alert_type = 'imminent' THEN 1 END) as imminent_alerts,
    COUNT(CASE WHEN ra.alert_type = 'overdue' THEN 1 END) as overdue_alerts,
    COALESCE(SUM(CASE WHEN ra.best_alternatives IS NOT NULL THEN 
        (SELECT COALESCE(MAX((ra.annual_cost::decimal - alt.cost::decimal)), 0) 
         FROM json_array_elements(ra.best_alternatives) as alt(cost decimal)) 
        ELSE 0 END), 0) as total_potential_savings,
    COUNT(CASE WHEN ra.price_hike_detected THEN 1 END) as price_hikes_detected,
    AVG(CASE WHEN ra.price_hike_detected THEN ra.price_hike_percentage ELSE 0 END) as average_price_hike,
    MAX(ra.created_at) as last_alert_date
FROM renewal_alerts ra
JOIN users u ON ra.user_id = u.user_id
GROUP BY ra.user_id, u.email, u.first_name, u.last_name
ORDER BY total_alerts DESC;

-- Function to create cost history entry
CREATE OR REPLACE FUNCTION create_cost_history_entry()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create history entry if cost actually changed
    IF TG_OP = 'UPDATE' AND OLD.annual_cost IS DISTINCT FROM NEW.annual_cost THEN
        INSERT INTO product_cost_history (record_id, annual_cost, source)
        VALUES (NEW.record_id, NEW.annual_cost, 'user_update');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically track cost changes
CREATE TRIGGER track_cost_changes
    AFTER UPDATE ON product_records
    FOR EACH ROW
    EXECUTE FUNCTION create_cost_history_entry();

-- Function to get renewal alerts for notification
CREATE OR REPLACE FUNCTION get_unsent_renewal_alerts()
RETURNS TABLE (
    id INTEGER,
    user_id UUID,
    email VARCHAR,
    first_name VARCHAR,
    record_id UUID,
    provider_name VARCHAR,
    product_type VARCHAR,
    renewal_date DATE,
    days_until_renewal INTEGER,
    annual_cost DECIMAL,
    alert_type VARCHAR,
    current_tariff VARCHAR,
    best_alternatives JSONB,
    price_hike_detected BOOLEAN,
    price_hike_percentage DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ra.id,
        ra.user_id,
        u.email,
        u.first_name,
        ra.record_id,
        ra.provider_name,
        ra.product_type,
        ra.renewal_date,
        ra.days_until_renewal,
        ra.annual_cost,
        ra.alert_type,
        ra.current_tariff,
        ra.best_alternatives,
        ra.price_hike_detected,
        ra.price_hike_percentage
    FROM renewal_alerts ra
    JOIN users u ON ra.user_id = u.user_id
    WHERE ra.sent_at IS NULL
    ORDER BY ra.renewal_date ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to mark alerts as sent
CREATE OR REPLACE FUNCTION mark_alerts_sent(alert_ids INTEGER[])
RETURNS INTEGER AS $$
DECLARE
    marked_count INTEGER;
BEGIN
    UPDATE renewal_alerts 
    SET sent_at = NOW(), updated_at = NOW()
    WHERE id = ANY(alert_ids);
    
    GET DIAGNOSTICS marked_count = ROW_COUNT;
    RETURN marked_count;
END;
$$ LANGUAGE plpgsql;

-- Insert sample cost history data for existing products
INSERT INTO product_cost_history (record_id, annual_cost, source, recorded_at)
SELECT 
    pr.record_id,
    pr.annual_cost,
    'migration',
    pr.created_at
FROM product_records pr
WHERE pr.annual_cost IS NOT NULL
ON CONFLICT DO NOTHING;

-- Create initial renewal statistics for today
INSERT INTO renewal_statistics (date, total_renewals, upcoming_renewals, overdue_renewals)
SELECT 
    CURRENT_DATE,
    COUNT(*),
    COUNT(CASE WHEN days_until_renewal >= 0 THEN 1 END),
    COUNT(CASE WHEN days_until_renewal < 0 THEN 1 END)
FROM renewal_alerts
WHERE DATE(created_at) = CURRENT_DATE
ON CONFLICT (date) DO NOTHING;

-- Price hike alerts table
CREATE TABLE IF NOT EXISTS price_hike_alerts (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id),
    record_id UUID NOT NULL REFERENCES product_records(record_id) ON DELETE CASCADE,
    provider_name VARCHAR(255) NOT NULL,
    product_type VARCHAR(50) NOT NULL,
    old_cost DECIMAL(10,2) NOT NULL,
    new_cost DECIMAL(10,2) NOT NULL,
    percentage_increase DECIMAL(5,2) NOT NULL,
    actual_increase DECIMAL(10,2) NOT NULL,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    alert_sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMP,
    user_notified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_price_hike_alerts_user_id ON price_hike_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_price_hike_alerts_record_id ON price_hike_alerts(record_id);
CREATE INDEX IF NOT EXISTS idx_price_hike_alerts_detected_at ON price_hike_alerts(detected_at);
CREATE INDEX IF NOT EXISTS idx_price_hike_alerts_alert_sent ON price_hike_alerts(alert_sent);
CREATE INDEX IF NOT EXISTS idx_price_hike_alerts_percentage_increase ON price_hike_alerts(percentage_increase);

-- Create trigger for updated_at
CREATE TRIGGER update_price_hike_alerts_updated_at BEFORE UPDATE ON price_hike_alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create view for price hike analytics
CREATE OR REPLACE VIEW price_hike_analytics AS
SELECT 
    DATE_TRUNC('month', pha.detected_at) as month,
    pha.product_type,
    COUNT(*) as total_hikes,
    AVG(pha.percentage_increase) as average_increase,
    SUM(pha.actual_increase) as total_increase,
    COUNT(CASE WHEN pha.alert_sent THEN 1 END) as alerts_sent,
    COUNT(DISTINCT pha.user_id) as affected_users
FROM price_hike_alerts pha
GROUP BY DATE_TRUNC('month', pha.detected_at), pha.product_type
ORDER BY month DESC, pha.product_type;

-- Create view for provider price hike analysis
CREATE OR REPLACE VIEW provider_price_hike_analysis AS
SELECT 
    pha.provider_name,
    pha.product_type,
    COUNT(*) as total_hikes,
    AVG(pha.percentage_increase) as average_increase,
    MAX(pha.percentage_increase) as max_increase,
    MIN(pha.percentage_increase) as min_increase,
    SUM(pha.actual_increase) as total_increase,
    COUNT(DISTINCT pha.user_id) as affected_users,
    MAX(pha.detected_at) as last_hike_date
FROM price_hike_alerts pha
GROUP BY pha.provider_name, pha.product_type
ORDER BY total_hikes DESC;

-- Create view for user price impact summary
CREATE OR REPLACE VIEW user_price_impact_summary AS
SELECT 
    pha.user_id,
    u.email,
    u.first_name,
    COUNT(*) as total_hikes,
    SUM(pha.actual_increase) as total_annual_increase,
    AVG(pha.percentage_increase) as average_increase,
    MAX(pha.percentage_increase) as max_increase,
    COUNT(CASE WHEN pha.alert_sent THEN 1 END) as alerts_sent,
    MAX(pha.detected_at) as last_hike_date
FROM price_hike_alerts pha
JOIN users u ON pha.user_id = u.user_id
GROUP BY pha.user_id, u.email, u.first_name
ORDER BY total_annual_increase DESC;
