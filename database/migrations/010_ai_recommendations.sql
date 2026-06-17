-- AI Recommendations Migration
-- Creates tables for AI-powered recommendation system

-- AI recommendations table
CREATE TABLE IF NOT EXISTS ai_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL CHECK (type IN ('cost_optimization', 'usage_pattern', 'market_opportunity', 'risk_mitigation', 'behavioral')),
    priority VARCHAR(10) NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    actionable_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
    expected_impact JSONB NOT NULL DEFAULT '{
        "costSavings": 0,
        "timeSavings": 0,
        "riskReduction": 0
    }'::jsonb,
    confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    reasoning TEXT NOT NULL,
    data_points JSONB NOT NULL DEFAULT '[]'::jsonb,
    valid_until TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'implemented', 'dismissed', 'expired')),
    feedback TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_user_id ON ai_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_type ON ai_recommendations(type);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_priority ON ai_recommendations(priority);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_status ON ai_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_confidence ON ai_recommendations(confidence);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_valid_until ON ai_recommendations(valid_until);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_created_at ON ai_recommendations(created_at);

-- Create trigger for updated_at
CREATE TRIGGER update_ai_recommendations_updated_at BEFORE UPDATE ON ai_recommendations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- User behavior patterns table (for AI analysis)
CREATE TABLE IF NOT EXISTS user_behavior_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    pattern_type VARCHAR(50) NOT NULL,
    pattern_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    confidence_score DECIMAL(3,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
    last_observed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    observation_count INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, pattern_type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_behavior_patterns_user_id ON user_behavior_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_user_behavior_patterns_pattern_type ON user_behavior_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_user_behavior_patterns_confidence ON user_behavior_patterns(confidence_score);

-- Create trigger for updated_at
CREATE TRIGGER update_user_behavior_patterns_updated_at BEFORE UPDATE ON user_behavior_patterns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Market insights cache table (for AI market analysis)
CREATE TABLE IF NOT EXISTS market_insights_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(50) NOT NULL,
    insight_type VARCHAR(30) NOT NULL,
    insight_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    data_sources JSONB NOT NULL DEFAULT '[]'::jsonb,
    valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(category, insight_type, valid_from)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_market_insights_cache_category ON market_insights_cache(category);
CREATE INDEX IF NOT EXISTS idx_market_insights_cache_insight_type ON market_insights_cache(insight_type);
CREATE INDEX IF NOT EXISTS idx_market_insights_cache_valid_until ON market_insights_cache(valid_until);

-- Create trigger for updated_at
CREATE TRIGGER update_market_insights_cache_updated_at BEFORE UPDATE ON market_insights_cache FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- AI recommendation performance tracking
CREATE TABLE IF NOT EXISTS ai_recommendation_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recommendation_id UUID NOT NULL REFERENCES ai_recommendations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    action_taken VARCHAR(30) NOT NULL CHECK (action_taken IN ('implemented', 'dismissed', 'expired', 'modified')),
    actual_savings DECIMAL(10,2),
    actual_time_savings DECIMAL(5,2),
    actual_risk_reduction DECIMAL(5,2),
    user_feedback TEXT,
    feedback_rating INTEGER CHECK (feedback_rating >= 1 AND feedback_rating <= 5),
    implementation_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_recommendation_performance_recommendation_id ON ai_recommendation_performance(recommendation_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendation_performance_user_id ON ai_recommendation_performance(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendation_performance_action_taken ON ai_recommendation_performance(action_taken);
CREATE INDEX IF NOT EXISTS idx_ai_recommendation_performance_implementation_date ON ai_recommendation_performance(implementation_date);

-- Create view for recommendation analytics
CREATE OR REPLACE VIEW ai_recommendation_analytics AS
SELECT 
    DATE_TRUNC('month', created_at) as month,
    type,
    priority,
    COUNT(*) as total_recommendations,
    COUNT(CASE WHEN status = 'implemented' THEN 1 END) as implemented_count,
    COUNT(CASE WHEN status = 'dismissed' THEN 1 END) as dismissed_count,
    AVG(confidence) as average_confidence,
    COALESCE(SUM(CASE WHEN status = 'implemented' THEN (expected_impact->>'costSavings')::numeric ELSE 0 END), 0) as total_potential_savings,
    COALESCE(AVG(CASE WHEN status = 'implemented' THEN arp.feedback_rating END), 0) as average_feedback_rating,
    COUNT(DISTINCT user_id) as unique_users
FROM ai_recommendations ar
LEFT JOIN ai_recommendation_performance arp ON ar.id = arp.recommendation_id
WHERE ar.created_at >= NOW() - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', ar.created_at), ar.type, ar.priority
ORDER BY month DESC, ar.type, ar.priority;

-- Create view for user recommendation summary
CREATE OR REPLACE VIEW user_recommendation_summary AS
SELECT 
    ar.user_id,
    u.email,
    u.first_name,
    COUNT(*) as total_recommendations,
    COUNT(CASE WHEN ar.status = 'implemented' THEN 1 END) as implemented_count,
    COUNT(CASE WHEN ar.status = 'dismissed' THEN 1 END) as dismissed_count,
    COUNT(CASE WHEN ar.status = 'active' AND ar.valid_until > NOW() THEN 1 END) as active_count,
    AVG(ar.confidence) as average_confidence,
    COALESCE(SUM(CASE WHEN ar.status = 'implemented' THEN (ar.expected_impact->>'costSavings')::numeric ELSE 0 END), 0) as total_savings,
    COALESCE(AVG(arp.feedback_rating), 0) as average_feedback_rating,
    MAX(ar.created_at) as last_recommendation_date,
    COUNT(CASE WHEN ar.type = 'cost_optimization' THEN 1 END) as cost_optimization_count,
    COUNT(CASE WHEN ar.type = 'usage_pattern' THEN 1 END) as usage_pattern_count,
    COUNT(CASE WHEN ar.type = 'market_opportunity' THEN 1 END) as market_opportunity_count,
    COUNT(CASE WHEN ar.type = 'risk_mitigation' THEN 1 END) as risk_mitigation_count,
    COUNT(CASE WHEN ar.type = 'behavioral' THEN 1 END) as behavioral_count
FROM ai_recommendations ar
JOIN users u ON ar.user_id = u.user_id
LEFT JOIN ai_recommendation_performance arp ON ar.id = arp.recommendation_id
GROUP BY ar.user_id, u.email, u.first_name
ORDER BY total_savings DESC;

-- Create function to analyze user behavior patterns
CREATE OR REPLACE FUNCTION analyze_user_behavior_patterns(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_recent_activities RECORD;
    v_pattern_type VARCHAR;
    v_pattern_data JSONB;
    v_confidence DECIMAL;
BEGIN
    -- Analyze switching frequency pattern
    SELECT 
        COUNT(CASE WHEN activity_type = 'switch_completed' THEN 1 END)::FLOAT / 
        NULLIF(COUNT(CASE WHEN activity_type = 'comparison_viewed' THEN 1 END), 0) as switching_frequency,
        AVG(CASE WHEN activity_type = 'product_viewed' THEN 
            EXTRACT(EPOCH FROM (updated_at - created_at))/60 END) as avg_research_time,
        COUNT(CASE WHEN activity_type = 'price_alert_triggered' THEN 1 END) as price_alert_responses
    INTO v_recent_activities
    FROM user_activity_log
    WHERE user_id = p_user_id AND created_at >= NOW() - INTERVAL '90 days';

    -- Store switching frequency pattern
    IF v_recent_activities.switching_frequency IS NOT NULL THEN
        INSERT INTO user_behavior_patterns (user_id, pattern_type, pattern_data, confidence_score)
        VALUES (
            p_user_id,
            'switching_frequency',
            jsonb_build_object(
                'frequency', v_recent_activities.switching_frequency,
                'period_days', 90,
                'last_analyzed', NOW()
            ),
            LEAST(1.0, GREATEST(0.1, v_recent_activities.switching_frequency * 2))
        )
        ON CONFLICT (user_id, pattern_type) 
        DO UPDATE SET
            pattern_data = EXCLUDED.pattern_data,
            confidence_score = EXCLUDED.confidence_score,
            last_observed = NOW(),
            observation_count = user_behavior_patterns.observation_count + 1,
            updated_at = NOW();
    END IF;

    -- Store research depth pattern
    IF v_recent_activities.avg_research_time IS NOT NULL THEN
        INSERT INTO user_behavior_patterns (user_id, pattern_type, pattern_data, confidence_score)
        VALUES (
            p_user_id,
            'research_depth',
            jsonb_build_object(
                'avg_minutes', v_recent_activities.avg_research_time,
                'depth_score', LEAST(1.0, v_recent_activities.avg_research_time / 30),
                'last_analyzed', NOW()
            ),
            LEAST(1.0, GREATEST(0.1, v_recent_activities.avg_research_time / 30))
        )
        ON CONFLICT (user_id, pattern_type) 
        DO UPDATE SET
            pattern_data = EXCLUDED.pattern_data,
            confidence_score = EXCLUDED.confidence_score,
            last_observed = NOW(),
            observation_count = user_behavior_patterns.observation_count + 1,
            updated_at = NOW();
    END IF;

    -- Store price sensitivity pattern
    IF v_recent_activities.price_alert_responses IS NOT NULL THEN
        INSERT INTO user_behavior_patterns (user_id, pattern_type, pattern_data, confidence_score)
        VALUES (
            p_user_id,
            'price_sensitivity',
            jsonb_build_object(
                'alert_responses', v_recent_activities.price_alert_responses,
                'sensitivity_score', LEAST(1.0, v_recent_activities.price_alert_responses / 10),
                'last_analyzed', NOW()
            ),
            LEAST(1.0, GREATEST(0.1, v_recent_activities.price_alert_responses / 10))
        )
        ON CONFLICT (user_id, pattern_type) 
        DO UPDATE SET
            pattern_data = EXCLUDED.pattern_data,
            confidence_score = EXCLUDED.confidence_score,
            last_observed = NOW(),
            observation_count = user_behavior_patterns.observation_count + 1,
            updated_at = NOW();
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create function to cache market insights
CREATE OR REPLACE FUNCTION cache_market_insights(p_category VARCHAR, p_insight_type VARCHAR, p_insight_data JSONB, p_confidence DECIMAL, p_data_sources JSONB DEFAULT '[]'::jsonb)
RETURNS VOID AS $$
BEGIN
    INSERT INTO market_insights_cache (
        category, insight_type, insight_data, confidence, data_sources, valid_until
    ) VALUES (
        p_category,
        p_insight_type,
        p_insight_data,
        p_confidence,
        p_data_sources,
        NOW() + INTERVAL '7 days' -- Cache for 7 days
    )
    ON CONFLICT (category, insight_type, valid_from) 
    DO UPDATE SET
        insight_data = EXCLUDED.insight_data,
        confidence = EXCLUDED.confidence,
        data_sources = EXCLUDED.data_sources,
        valid_until = EXCLUDED.valid_until,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Create function to get user behavior patterns
CREATE OR REPLACE FUNCTION get_user_behavior_patterns(p_user_id UUID)
RETURNS TABLE (
    pattern_type VARCHAR,
    pattern_data JSONB,
    confidence_score DECIMAL,
    last_observed TIMESTAMP,
    observation_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ubp.pattern_type,
        ubp.pattern_data,
        ubp.confidence_score,
        ubp.last_observed,
        ubp.observation_count
    FROM user_behavior_patterns ubp
    WHERE ubp.user_id = p_user_id
    ORDER BY ubp.confidence_score DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function to get market insights for AI
CREATE OR REPLACE FUNCTION get_market_insights_for_ai(p_categories TEXT DEFAULT NULL)
RETURNS TABLE (
    category VARCHAR,
    insight_type VARCHAR,
    insight_data JSONB,
    confidence DECIMAL,
    valid_until TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mic.category,
        mic.insight_type,
        mic.insight_data,
        mic.confidence,
        mic.valid_until
    FROM market_insights_cache mic
    WHERE mic.valid_until > NOW()
      AND (p_categories IS NULL OR mic.category = ANY(string_to_array(p_categories, ',')))
    ORDER BY mic.confidence DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function to automatically expire old recommendations
CREATE OR REPLACE FUNCTION expire_old_recommendations()
RETURNS INTEGER AS $$
DECLARE
    v_expired_count INTEGER;
BEGIN
    UPDATE ai_recommendations 
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'active' AND valid_until < NOW();
    
    GET DIAGNOSTICS v_expired_count = ROW_COUNT;
    
    -- Log the expiration
    RAISE LOG 'Expired % old AI recommendations', v_expired_count;
    
    RETURN v_expired_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to clean up old behavior pattern data
CREATE OR REPLACE FUNCTION cleanup_behavior_patterns(p_keep_months INTEGER DEFAULT 12)
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    -- Delete behavior patterns older than specified months
    DELETE FROM user_behavior_patterns 
    WHERE last_observed < NOW() - INTERVAL '1 month' * p_keep_months
      AND observation_count < 5; -- Keep only patterns with sufficient data
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    -- Log the cleanup
    RAISE LOG 'Cleaned up % old behavior pattern records older than % months', v_deleted_count, p_keep_months;
    
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to analyze behavior patterns after user activity
CREATE OR REPLACE FUNCTION auto_analyze_behavior_patterns()
RETURNS TRIGGER AS $$
BEGIN
    -- Analyze behavior patterns every 10 activities
    PERFORM 1 FROM (
        SELECT COUNT(*) as activity_count
        FROM user_activity_log 
        WHERE user_id = NEW.user_id 
          AND created_at >= NOW() - INTERVAL '1 day'
    ) sub
    WHERE sub.activity_count % 10 = 0;
    
    IF FOUND THEN
        PERFORM analyze_user_behavior_patterns(NEW.user_id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic behavior pattern analysis
CREATE TRIGGER auto_analyze_behavior_patterns_trigger
    AFTER INSERT ON user_activity_log
    FOR EACH ROW
    EXECUTE FUNCTION auto_analyze_behavior_patterns();

-- Create function to schedule AI recommendation generation
CREATE OR REPLACE FUNCTION schedule_ai_recommendation_generation()
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
    WHERE fhs.next_review_date <= NOW() + INTERVAL '3 days'
      AND NOT EXISTS (
        SELECT 1 FROM ai_recommendations ar 
        WHERE ar.user_id = fhs.user_id 
          AND ar.status = 'active' 
          AND ar.created_at >= NOW() - INTERVAL '7 days'
      )
    ORDER BY priority, fhs.next_review_date;
END;
$$ LANGUAGE plpgsql;

-- Create function to get AI recommendation performance metrics
CREATE OR REPLACE FUNCTION get_ai_recommendation_metrics(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
    total_recommendations INTEGER,
    implemented_count INTEGER,
    dismissed_count INTEGER,
    implementation_rate DECIMAL,
    average_confidence DECIMAL,
    total_actual_savings DECIMAL,
    average_feedback_rating DECIMAL,
    top_recommendation_type VARCHAR,
    best_performing_type VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_recommendations,
        COUNT(CASE WHEN status = 'implemented' THEN 1 END) as implemented_count,
        COUNT(CASE WHEN status = 'dismissed' THEN 1 END) as dismissed_count,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                COUNT(CASE WHEN status = 'implemented' THEN 1 END)::DECIMAL / COUNT(*) * 100
            ELSE 0
        END as implementation_rate,
        AVG(confidence) as average_confidence,
        COALESCE(SUM(arp.actual_savings), 0) as total_actual_savings,
        COALESCE(AVG(arp.feedback_rating), 0) as average_feedback_rating,
        (SELECT type FROM ai_recommendations ar2 
         WHERE ar2.user_id = COALESCE(p_user_id, ar2.user_id) 
         GROUP BY type 
         ORDER BY COUNT(*) DESC 
         LIMIT 1) as top_recommendation_type,
        (SELECT ar3.type FROM ai_recommendations ar3
         JOIN ai_recommendation_performance arp3 ON ar3.id = arp3.recommendation_id
         WHERE ar3.user_id = COALESCE(p_user_id, ar3.user_id)
           AND arp3.feedback_rating >= 4
         GROUP BY ar3.type
         ORDER BY AVG(arp3.feedback_rating) DESC
         LIMIT 1) as best_performing_type
    FROM ai_recommendations ar
    LEFT JOIN ai_recommendation_performance arp ON ar.id = arp.recommendation_id
    WHERE (p_user_id IS NULL OR ar.user_id = p_user_id);
END;
$$ LANGUAGE plpgsql;

-- Insert initial market insights for common categories
INSERT INTO market_insights_cache (category, insight_type, insight_data, confidence, valid_until) VALUES
('streaming', 'price_trend', '{"trend": "stable", "change_percentage": 2.5, "competition_level": "high"}', 0.85, NOW() + INTERVAL '7 days'),
('insurance', 'price_trend', '{"trend": "increasing", "change_percentage": 8.2, "competition_level": "medium"}', 0.90, NOW() + INTERVAL '7 days'),
('utilities', 'price_trend', '{"trend": "decreasing", "change_percentage": -3.1, "competition_level": "high"}', 0.80, NOW() + INTERVAL '7 days'),
('software', 'price_trend', '{"trend": "stable", "change_percentage": 1.8, "competition_level": "very_high"}', 0.75, NOW() + INTERVAL '7 days'),
('telecom', 'price_trend', '{"trend": "increasing", "change_percentage": 5.5, "competition_level": "medium"}', 0.88, NOW() + INTERVAL '7 days')
ON CONFLICT (category, insight_type, valid_from) DO NOTHING;
