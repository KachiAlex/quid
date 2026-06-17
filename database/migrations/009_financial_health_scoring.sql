-- Financial Health Scoring Migration
-- Creates tables for financial health scoring and analytics

-- Financial health scores table
CREATE TABLE IF NOT EXISTS financial_health_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    overall_score DECIMAL(5,2) NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
    score_category VARCHAR(20) NOT NULL CHECK (score_category IN ('excellent', 'good', 'fair', 'poor', 'critical')),
    affordability_score DECIMAL(5,2) NOT NULL CHECK (affordability_score >= 0 AND affordability_score <= 100),
    optimization_score DECIMAL(5,2) NOT NULL CHECK (optimization_score >= 0 AND optimization_score <= 100),
    stability_score DECIMAL(5,2) NOT NULL CHECK (stability_score >= 0 AND stability_score <= 100),
    diversity_score DECIMAL(5,2) NOT NULL CHECK (diversity_score >= 0 AND diversity_score <= 100),
    awareness_score DECIMAL(5,2) NOT NULL CHECK (awareness_score >= 0 AND awareness_score <= 100),
    total_subscriptions INTEGER NOT NULL DEFAULT 0,
    total_annual_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    potential_savings DECIMAL(10,2) NOT NULL DEFAULT 0,
    recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
    next_review_date TIMESTAMP NOT NULL,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_financial_health_scores_user_id ON financial_health_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_health_scores_overall_score ON financial_health_scores(overall_score);
CREATE INDEX IF NOT EXISTS idx_financial_health_scores_score_category ON financial_health_scores(score_category);
CREATE INDEX IF NOT EXISTS idx_financial_health_scores_calculated_at ON financial_health_scores(calculated_at);
CREATE INDEX IF NOT EXISTS idx_financial_health_scores_next_review_date ON financial_health_scores(next_review_date);

-- Create trigger for updated_at
CREATE TRIGGER update_financial_health_scores_updated_at BEFORE UPDATE ON financial_health_scores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Score history table (for trend analysis)
CREATE TABLE IF NOT EXISTS score_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    score DECIMAL(5,2) NOT NULL,
    category VARCHAR(20) NOT NULL,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    change_from_previous DECIMAL(5,2),
    key_factors JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_score_history_user_id ON score_history(user_id);
CREATE INDEX IF NOT EXISTS idx_score_history_calculated_at ON score_history(calculated_at);
CREATE INDEX IF NOT EXISTS idx_score_history_score ON score_history(score);

-- User profiles table (extended for financial data)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    estimated_annual_income DECIMAL(10,2),
    monthly_budget DECIMAL(10,2),
    financial_goals JSONB NOT NULL DEFAULT '{}'::jsonb,
    risk_tolerance VARCHAR(20) CHECK (risk_tolerance IN ('conservative', 'moderate', 'aggressive')),
    preferred_savings_method VARCHAR(30),
    notification_preferences JSONB NOT NULL DEFAULT '{
        "score_updates": true,
        "recommendations": true,
        "trend_alerts": true,
        "monthly_reports": true
    }'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_risk_tolerance ON user_profiles(risk_tolerance);

-- Create trigger for updated_at
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Product statistics table (for scoring calculations)
CREATE TABLE IF NOT EXISTS product_statistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    record_id UUID NOT NULL REFERENCES product_records(record_id) ON DELETE CASCADE,
    potential_savings DECIMAL(10,2) NOT NULL DEFAULT 0,
    cost_volatility DECIMAL(5,2) NOT NULL DEFAULT 0,
    market_comparison_score DECIMAL(5,2) NOT NULL DEFAULT 0,
    optimization_potential DECIMAL(5,2) NOT NULL DEFAULT 0,
    last_calculated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, record_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_statistics_user_id ON product_statistics(user_id);
CREATE INDEX IF NOT EXISTS idx_product_statistics_record_id ON product_statistics(record_id);
CREATE INDEX IF NOT EXISTS idx_product_statistics_potential_savings ON product_statistics(potential_savings);

-- Create trigger for updated_at
CREATE TRIGGER update_product_statistics_updated_at BEFORE UPDATE ON product_statistics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- User activity log table (for engagement tracking)
CREATE TABLE IF NOT EXISTS user_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL,
    activity_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_activity_log_user_id ON user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_activity_type ON user_activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_created_at ON user_activity_log(created_at);

-- User alerts table (for awareness scoring)
CREATE TABLE IF NOT EXISTS user_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    alert_type VARCHAR(30) NOT NULL,
    alert_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'dismissed')),
    priority VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    acknowledged_at TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_alerts_user_id ON user_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_alerts_alert_type ON user_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_user_alerts_status ON user_alerts(status);
CREATE INDEX IF NOT EXISTS idx_user_alerts_created_at ON user_alerts(created_at);

-- Create view for financial health analytics
CREATE OR REPLACE VIEW financial_health_analytics AS
SELECT 
    DATE_TRUNC('month', calculated_at) as month,
    score_category,
    COUNT(*) as user_count,
    AVG(overall_score) as average_score,
    AVG(affordability_score) as avg_affordability,
    AVG(optimization_score) as avg_optimization,
    AVG(stability_score) as avg_stability,
    AVG(diversity_score) as avg_diversity,
    AVG(awareness_score) as avg_awareness,
    AVG(total_annual_cost) as avg_annual_cost,
    AVG(potential_savings) as avg_potential_savings
FROM financial_health_scores
WHERE calculated_at >= NOW() - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', calculated_at), score_category
ORDER BY month DESC, score_category;

-- Create view for score distribution
CREATE OR REPLACE VIEW score_distribution AS
SELECT 
    score_category,
    COUNT(*) as user_count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage,
    AVG(overall_score) as average_score,
    MIN(overall_score) as min_score,
    MAX(overall_score) as max_score,
    STDDEV(overall_score) as score_stddev
FROM financial_health_scores
WHERE calculated_at >= NOW() - INTERVAL '30 days'
GROUP BY score_category
ORDER BY 
    CASE score_category
        WHEN 'excellent' THEN 1
        WHEN 'good' THEN 2
        WHEN 'fair' THEN 3
        WHEN 'poor' THEN 4
        WHEN 'critical' THEN 5
    END;

-- Create view for user financial insights
CREATE OR REPLACE VIEW user_financial_insights AS
SELECT 
    fhs.user_id,
    u.email,
    u.first_name,
    fhs.overall_score,
    fhs.score_category,
    fhs.total_subscriptions,
    fhs.total_annual_cost,
    fhs.potential_savings,
    ROUND((fhs.potential_savings / NULLIF(fhs.total_annual_cost, 0)) * 100, 2) as savings_percentage,
    fhs.next_review_date,
    fhs.calculated_at,
    -- Trend calculation
    CASE 
        WHEN LAG(fhs.overall_score) OVER (PARTITION BY fhs.user_id ORDER BY fhs.calculated_at) < fhs.overall_score THEN 'improving'
        WHEN LAG(fhs.overall_score) OVER (PARTITION BY fhs.user_id ORDER BY fhs.calculated_at) > fhs.overall_score THEN 'declining'
        ELSE 'stable'
    END as score_trend,
    -- Percentile calculation (simplified)
    PERCENT_RANK() OVER (ORDER BY fhs.overall_score) as score_percentile
FROM financial_health_scores fhs
JOIN users u ON fhs.user_id = u.user_id
WHERE fhs.calculated_at = (
    SELECT MAX(calculated_at) 
    FROM financial_health_scores fhs2 
    WHERE fhs2.user_id = fhs.user_id
);

-- Create function to calculate product statistics
CREATE OR REPLACE FUNCTION calculate_product_statistics(p_user_id UUID, p_record_id UUID)
RETURNS VOID AS $$
DECLARE
    v_current_cost DECIMAL;
    v_market_cost DECIMAL;
    v_potential_savings DECIMAL;
    v_cost_volatility DECIMAL;
    v_market_comparison_score DECIMAL;
    v_optimization_potential DECIMAL;
BEGIN
    -- Get current product cost
    SELECT annual_cost INTO v_current_cost
    FROM product_records
    WHERE record_id = p_record_id AND user_id = p_user_id;
    
    -- Get market comparison cost (simplified - would use actual market data)
    SELECT COALESCE(AVG(annual_cost), v_current_cost) INTO v_market_cost
    FROM rate_records rr
    JOIN product_records pr ON rr.product_type = pr.product_type
    WHERE pr.record_id = p_record_id AND pr.user_id = p_user_id
      AND rr.created_at >= NOW() - INTERVAL '30 days';
    
    -- Calculate potential savings
    v_potential_savings := GREATEST(0, v_current_cost - v_market_cost);
    
    -- Calculate cost volatility (simplified - would use historical data)
    SELECT COALESCE(STDDEV(change_percentage), 0) INTO v_cost_volatility
    FROM cost_changes
    WHERE record_id = p_record_id AND user_id = p_user_id
      AND change_date >= NOW() - INTERVAL '12 months';
    
    -- Calculate market comparison score
    v_market_comparison_score := CASE 
        WHEN v_current_cost = 0 THEN 100
        WHEN v_market_cost = 0 THEN 50
        ELSE GREATEST(0, LEAST(100, (v_market_cost / v_current_cost) * 100))
    END;
    
    -- Calculate optimization potential
    v_optimization_potential := CASE 
        WHEN v_current_cost = 0 THEN 0
        ELSE GREATEST(0, LEAST(100, (v_potential_savings / v_current_cost) * 100))
    END;
    
    -- Update or insert product statistics
    INSERT INTO product_statistics (
        user_id, record_id, potential_savings, cost_volatility,
        market_comparison_score, optimization_potential, last_calculated
    ) VALUES (
        p_user_id, p_record_id, v_potential_savings, v_cost_volatility,
        v_market_comparison_score, v_optimization_potential, NOW()
    )
    ON CONFLICT (user_id, record_id) 
    DO UPDATE SET
        potential_savings = EXCLUDED.potential_savings,
        cost_volatility = EXCLUDED.cost_volatility,
        market_comparison_score = EXCLUDED.market_comparison_score,
        optimization_potential = EXCLUDED.optimization_potential,
        last_calculated = NOW(),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Create function to log user activity
CREATE OR REPLACE FUNCTION log_user_activity(
    p_user_id UUID,
    p_activity_type VARCHAR(50),
    p_activity_data JSONB DEFAULT '{}'::jsonb,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_activity_id UUID;
BEGIN
    INSERT INTO user_activity_log (user_id, activity_type, activity_data, ip_address, user_agent)
    VALUES (p_user_id, p_activity_type, p_activity_data, p_ip_address, p_user_agent)
    RETURNING id INTO v_activity_id;
    
    RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to create user alert
CREATE OR REPLACE FUNCTION create_user_alert(
    p_user_id UUID,
    p_alert_type VARCHAR(30),
    p_alert_data JSONB DEFAULT '{}'::jsonb,
    p_priority VARCHAR(10) DEFAULT 'medium'
)
RETURNS UUID AS $$
DECLARE
    v_alert_id UUID;
BEGIN
    INSERT INTO user_alerts (user_id, alert_type, alert_data, priority)
    VALUES (p_user_id, p_alert_type, p_alert_data, p_priority)
    RETURNING id INTO v_alert_id;
    
    RETURN v_alert_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to get user financial summary
CREATE OR REPLACE FUNCTION get_user_financial_summary(p_user_id UUID)
RETURNS TABLE (
    total_subscriptions INTEGER,
    total_annual_cost DECIMAL,
    total_potential_savings DECIMAL,
    savings_percentage DECIMAL,
    average_cost_per_subscription DECIMAL,
    most_expensive_subscription TEXT,
    highest_potential_savings TEXT,
    active_alerts INTEGER,
    last_score DECIMAL,
    score_category VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_subscriptions,
        COALESCE(SUM(pr.annual_cost), 0) as total_annual_cost,
        COALESCE(SUM(ps.potential_savings), 0) as total_potential_savings,
        CASE 
            WHEN COALESCE(SUM(pr.annual_cost), 0) = 0 THEN 0
            ELSE ROUND((COALESCE(SUM(ps.potential_savings), 0) / SUM(pr.annual_cost)) * 100, 2)
        END as savings_percentage,
        COALESCE(AVG(pr.annual_cost), 0) as average_cost_per_subscription,
        (SELECT pr.provider_name || ' - ' || pr.product_type 
         FROM product_records pr 
         WHERE pr.user_id = p_user_id 
         ORDER BY pr.annual_cost DESC 
         LIMIT 1) as most_expensive_subscription,
        (SELECT pr.provider_name || ' - ' || pr.product_type 
         FROM product_records pr 
         JOIN product_statistics ps ON pr.record_id = ps.record_id
         WHERE pr.user_id = p_user_id 
         ORDER BY ps.potential_savings DESC 
         LIMIT 1) as highest_potential_savings,
        (SELECT COUNT(*) FROM user_alerts WHERE user_id = p_user_id AND status = 'active') as active_alerts,
        (SELECT overall_score FROM financial_health_scores 
         WHERE user_id = p_user_id 
         ORDER BY calculated_at DESC 
         LIMIT 1) as last_score,
        (SELECT score_category FROM financial_health_scores 
         WHERE user_id = p_user_id 
         ORDER BY calculated_at DESC 
         LIMIT 1) as score_category
    FROM product_records pr
    LEFT JOIN product_statistics ps ON pr.record_id = ps.record_id
    WHERE pr.user_id = p_user_id AND pr.status = 'active';
END;
$$ LANGUAGE plpgsql;

-- Create trigger to calculate product statistics when product is updated
CREATE OR REPLACE FUNCTION auto_calculate_product_statistics()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM calculate_product_statistics(NEW.user_id, NEW.record_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic product statistics calculation
CREATE TRIGGER auto_calculate_product_statistics_trigger
    AFTER INSERT OR UPDATE ON product_records
    FOR EACH ROW
    EXECUTE FUNCTION auto_calculate_product_statistics();

-- Create function to clean up old score history
CREATE OR REPLACE FUNCTION cleanup_score_history(p_keep_months INTEGER DEFAULT 24)
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    -- Delete score history older than specified months
    DELETE FROM score_history 
    WHERE created_at < NOW() - INTERVAL '1 month' * p_keep_months;
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    -- Log the cleanup
    RAISE LOG 'Cleaned up % old score history records older than % months', v_deleted_count, p_keep_months;
    
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Insert default user profiles for existing users
INSERT INTO user_profiles (user_id, estimated_annual_income, monthly_budget, risk_tolerance, preferred_savings_method)
SELECT 
    user_id,
    50000, -- Default estimated annual income
    1000,  -- Default monthly budget
    'moderate',
    'automatic'
FROM users
WHERE user_id NOT IN (SELECT user_id FROM user_profiles)
ON CONFLICT (user_id) DO NOTHING;

-- Create function to schedule financial health scoring
CREATE OR REPLACE FUNCTION schedule_financial_health_scoring()
RETURNS TABLE (
    user_id UUID,
    scheduled_date TIMESTAMP,
    priority INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        fhs.user_id,
        fhs.next_review_date as scheduled_date,
        CASE 
            WHEN fhs.score_category IN ('critical', 'poor') THEN 1
            WHEN fhs.score_category = 'fair' THEN 2
            ELSE 3
        END as priority
    FROM financial_health_scores fhs
    WHERE fhs.next_review_date <= NOW() + INTERVAL '7 days'
    ORDER BY priority, fhs.next_review_date;
END;
$$ LANGUAGE plpgsql;
