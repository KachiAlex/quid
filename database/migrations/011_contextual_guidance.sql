-- Contextual Guidance Migration
-- Creates tables for intelligent, context-aware help and recommendations

-- Contextual guidance items table
CREATE TABLE IF NOT EXISTS contextual_guidance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(20) NOT NULL CHECK (type IN ('tip', 'warning', 'success', 'info', 'tutorial', 'recommendation')),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    context JSONB NOT NULL DEFAULT '{
        "page": "",
        "section": "",
        "trigger": ""
    }'::jsonb,
    priority VARCHAR(10) NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
    actionable BOOLEAN NOT NULL DEFAULT true,
    actions JSONB NOT NULL DEFAULT '[]'::jsonb,
    timing JSONB NOT NULL DEFAULT '{
        "showAfter": 0,
        "duration": null,
        "cooldown": 0
    }'::jsonb,
    targeting JSONB NOT NULL DEFAULT '{
        "userSegment": [],
        "minScore": null,
        "maxScore": null,
        "requiredFeatures": [],
        "excludedFeatures": []
    }'::jsonb,
    content JSONB NOT NULL DEFAULT '{
        "icon": null,
        "image": null,
        "video": null,
        "steps": [],
        "examples": []
    }'::jsonb,
    analytics JSONB NOT NULL DEFAULT '{
        "shown": 0,
        "clicked": 0,
        "dismissed": 0,
        "completed": 0
    }'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_contextual_guidance_type ON contextual_guidance(type);
CREATE INDEX IF NOT EXISTS idx_contextual_guidance_priority ON contextual_guidance(priority);
CREATE INDEX IF NOT EXISTS idx_contextual_guidance_status ON contextual_guidance(status);
CREATE INDEX IF NOT EXISTS idx_contextual_guidance_context ON contextual_guidance USING GIN(context);
CREATE INDEX IF NOT EXISTS idx_contextual_guidance_targeting ON contextual_guidance USING GIN(targeting);
CREATE INDEX IF NOT EXISTS idx_contextual_guidance_created_at ON contextual_guidance(created_at);

-- Create trigger for updated_at
CREATE TRIGGER update_contextual_guidance_updated_at BEFORE UPDATE ON contextual_guidance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- User guidance state table
CREATE TABLE IF NOT EXISTS user_guidance_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    dismissed_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    completed_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    last_shown JSONB NOT NULL DEFAULT '{}'::jsonb,
    preferences JSONB NOT NULL DEFAULT '{
        "showTips": true,
        "showTutorials": true,
        "showRecommendations": true,
        "frequency": "medium"
    }'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_guidance_state_user_id ON user_guidance_state(user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_user_guidance_state_updated_at BEFORE UPDATE ON user_guidance_state FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Guidance action log table
CREATE TABLE IF NOT EXISTS guidance_action_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES contextual_guidance(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    action_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_guidance_action_log_user_id ON guidance_action_log(user_id);
CREATE INDEX IF NOT EXISTS idx_guidance_action_log_item_id ON guidance_action_log(item_id);
CREATE INDEX IF NOT EXISTS idx_guidance_action_log_action ON guidance_action_log(action);
CREATE INDEX IF NOT EXISTS idx_guidance_action_log_created_at ON guidance_action_log(created_at);

-- Guidance templates table (for reusable guidance)
CREATE TABLE IF NOT EXISTS guidance_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('tip', 'warning', 'success', 'info', 'tutorial', 'recommendation')),
    title_template VARCHAR(255) NOT NULL,
    description_template TEXT NOT NULL,
    context JSONB NOT NULL DEFAULT '{}'::jsonb,
    priority VARCHAR(10) NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
    actionable BOOLEAN NOT NULL DEFAULT true,
    actions JSONB NOT NULL DEFAULT '[]'::jsonb,
    timing JSONB NOT NULL DEFAULT '{}'::jsonb,
    targeting JSONB NOT NULL DEFAULT '{}'::jsonb,
    content JSONB NOT NULL DEFAULT '{}'::jsonb,
    variables JSONB NOT NULL DEFAULT '[]'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_guidance_templates_type ON guidance_templates(type);
CREATE INDEX IF NOT EXISTS idx_guidance_templates_status ON guidance_templates(status);

-- Create trigger for updated_at
CREATE TRIGGER update_guidance_templates_updated_at BEFORE UPDATE ON guidance_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create view for guidance analytics
CREATE OR REPLACE VIEW guidance_analytics AS
SELECT 
    DATE_TRUNC('day', created_at) as date,
    type,
    priority,
    COUNT(*) as total_items,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_items,
    SUM((analytics->>'shown')::int) as total_shown,
    SUM((analytics->>'clicked')::int) as total_clicked,
    SUM((analytics->>'dismissed')::int) as total_dismissed,
    SUM((analytics->>'completed')::int) as total_completed,
    CASE 
        WHEN SUM((analytics->>'shown')::int) > 0 
        THEN ROUND(SUM((analytics->>'clicked')::int)::numeric / SUM((analytics->>'shown')::int) * 100, 2)
        ELSE 0 
    END as engagement_rate,
    COUNT(DISTINCT user_id) as unique_users
FROM contextual_guidance cg
LEFT JOIN guidance_action_log gal ON cg.id = gal.item_id
WHERE cg.created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', cg.created_at), cg.type, cg.priority
ORDER BY date DESC, cg.type, cg.priority;

-- Create view for user guidance summary
CREATE OR REPLACE VIEW user_guidance_summary AS
SELECT 
    ugs.user_id,
    u.email,
    u.first_name,
    COUNT(cg.id) as total_available,
    COUNT(CASE WHEN cg.id = ANY(ugs.dismissed_items) THEN 1 END) as dismissed_count,
    COUNT(CASE WHEN cg.id = ANY(ugs.completed_items) THEN 1 END) as completed_count,
    COUNT(CASE WHEN cg.id NOT IN (SELECT unnest(ugs.dismissed_items || ugs.completed_items)) THEN 1 END) as remaining_count,
    (ugs.preferences->>'showTips')::boolean as show_tips,
    (ugs.preferences->>'showTutorials')::boolean as show_tutorials,
    (ugs.preferences->>'showRecommendations')::boolean as show_recommendations,
    (ugs.preferences->>'frequency') as preference_frequency,
    MAX(gal.created_at) as last_interaction,
    COUNT(gal.id) as total_interactions
FROM user_guidance_state ugs
JOIN users u ON ugs.user_id = u.user_id
LEFT JOIN contextual_guidance cg ON cg.status = 'active'
LEFT JOIN guidance_action_log gal ON ugs.user_id = gal.user_id
GROUP BY ugs.user_id, u.email, u.first_name
ORDER BY total_interactions DESC;

-- Create function to create guidance from template
CREATE OR REPLACE FUNCTION create_guidance_from_template(
    p_template_id UUID,
    p_variables JSONB DEFAULT '{}'::jsonb,
    p_context JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
    v_template RECORD;
    v_guidance_id UUID;
    v_title TEXT;
    v_description TEXT;
BEGIN
    -- Get template
    SELECT * INTO v_template 
    FROM guidance_templates 
    WHERE id = p_template_id AND status = 'active';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Template not found or inactive';
    END IF;
    
    -- Replace variables in title and description
    v_title := v_template.title_template;
    v_description := v_template.description_template;
    
    -- Simple variable replacement (could be enhanced with proper templating)
    FOR var IN SELECT jsonb_array_elements_text(v_template.variables) AS var_name
    LOOP
        v_title := REPLACE(v_title, CONCAT('{{', var.var_name, '}}'), 
                         COALESCE((p_variables->>var.var_name), ''));
        v_description := REPLACE(v_description, CONCAT('{{', var.var_name, '}}'), 
                              COALESCE((p_variables->>var.var_name), ''));
    END LOOP;
    
    -- Create guidance item
    INSERT INTO contextual_guidance (
        type, title, description, context, priority, actionable, actions,
        timing, targeting, content, status
    ) VALUES (
        v_template.type,
        v_title,
        v_description,
        COALESCE(p_context, v_template.context),
        v_template.priority,
        v_template.actionable,
        v_template.actions,
        v_template.timing,
        v_template.targeting,
        v_template.content,
        'active'
    ) RETURNING id INTO v_guidance_id;
    
    RETURN v_guidance_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to get contextual guidance for user
CREATE OR REPLACE FUNCTION get_contextual_guidance(
    p_user_id UUID,
    p_page VARCHAR DEFAULT NULL,
    p_section VARCHAR DEFAULT NULL,
    p_limit INTEGER DEFAULT 10
) RETURNS TABLE (
    id UUID,
    type VARCHAR,
    title VARCHAR,
    description TEXT,
    context JSONB,
    priority VARCHAR,
    actionable BOOLEAN,
    actions JSONB,
    timing JSONB,
    targeting JSONB,
    content JSONB,
    analytics JSONB,
    status VARCHAR,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    WITH user_state AS (
        SELECT 
            dismissed_items,
            completed_items,
            last_shown,
            preferences
        FROM user_guidance_state
        WHERE user_id = p_user_id
    ),
    user_profile AS (
        SELECT 
            up.estimated_annual_income,
            up.monthly_budget,
            up.risk_tolerance,
            fhs.overall_score,
            fhs.score_category
        FROM user_profiles up
        LEFT JOIN financial_health_scores fhs ON up.user_id = fhs.user_id
        WHERE up.user_id = p_user_id
        ORDER BY fhs.calculated_at DESC
        LIMIT 1
    )
    SELECT 
        cg.*,
        -- Update analytics for shown items
        pg_catalog.jsonb_set(cg.analytics, '{shown}', ((cg.analytics->>'shown')::int + 1)::text::jsonb)
    FROM contextual_guidance cg
    CROSS JOIN user_state us
    CROSS JOIN user_profile up
    WHERE cg.status = 'active'
      AND (p_page IS NULL OR cg.context->>'page' = p_page)
      AND (p_section IS NULL OR cg.context->>'section' = p_section)
      AND NOT cg.id = ANY(us.dismissed_items)
      AND NOT cg.id = ANY(us.completed_items)
      AND (
          cg.timing->>'cooldown' IS NULL OR
          cg.timing->>'cooldown' = '0' OR
          (EXTRACT(EPOCH FROM NOW()) - COALESCE((us.last_shown->>cg.id::text)::bigint, 0)) > (cg.timing->>'cooldown')::int
      )
      AND (
          cg.targeting->>'minScore' IS NULL OR
          up.overall_score IS NULL OR
          up.overall_score >= (cg.targeting->>'minScore')::int
      )
      AND (
          cg.targeting->>'maxScore' IS NULL OR
          up.overall_score IS NULL OR
          up.overall_score <= (cg.targeting->>'maxScore')::int
      )
      AND (
          cg.type = 'info' OR
          (cg.type = 'tip' AND (us.preferences->>'showTips')::boolean) OR
          (cg.type = 'tutorial' AND (us.preferences->>'showTutorials')::boolean) OR
          (cg.type = 'recommendation' AND (us.preferences->>'showRecommendations')::boolean)
      )
    ORDER BY 
        CASE cg.priority 
            WHEN 'high' THEN 1 
            WHEN 'medium' THEN 2 
            ELSE 3 
        END,
        cg.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Create function to update guidance analytics
CREATE OR REPLACE FUNCTION update_guidance_analytics(
    p_item_ids UUID[],
    p_action VARCHAR
) RETURNS VOID AS $$
BEGIN
    UPDATE contextual_guidance 
    SET analytics = jsonb_set(analytics, p_action, ((analytics->>p_action)::int + 1)::text::jsonb),
        updated_at = NOW()
    WHERE id = ANY(p_item_ids);
END;
$$ LANGUAGE plpgsql;

-- Create function to automatically generate contextual guidance
CREATE OR REPLACE FUNCTION auto_generate_contextual_guidance(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_user_profile RECORD;
    v_guidance_count INTEGER;
BEGIN
    -- Get user profile
    SELECT 
        up.estimated_annual_income,
        up.monthly_budget,
        up.risk_tolerance,
        fhs.overall_score,
        fhs.score_category,
        COUNT(pr.record_id) as subscription_count,
        COALESCE(SUM(pr.annual_cost), 0) as total_cost,
        COALESCE(SUM(ps.potential_savings), 0) as total_savings
    INTO v_user_profile
    FROM user_profiles up
    LEFT JOIN financial_health_scores fhs ON up.user_id = fhs.user_id
    LEFT JOIN product_records pr ON up.user_id = pr.user_id AND pr.status = 'active'
    LEFT JOIN product_statistics ps ON pr.record_id = ps.record_id
    WHERE up.user_id = p_user_id
    GROUP BY up.estimated_annual_income, up.monthly_budget, up.risk_tolerance, fhs.overall_score, fhs.score_category;
    
    -- Check if user needs guidance
    SELECT COUNT(*) INTO v_guidance_count
    FROM contextual_guidance cg
    JOIN user_guidance_state ugs ON cg.id != ANY(ugs.dismissed_items || ugs.completed_items)
    WHERE cg.status = 'active'
      AND ugs.user_id = p_user_id
      AND cg.created_at >= NOW() - INTERVAL '7 days';
    
    -- Generate guidance if needed
    IF v_guidance_count < 3 THEN
        -- Low financial health score guidance
        IF v_user_profile.overall_score < 60 THEN
            INSERT INTO contextual_guidance (
                type, title, description, context, priority, actionable, actions,
                timing, targeting, content, status
            ) VALUES (
                'recommendation',
                'Improve Your Financial Health',
                FORMAT('Your financial health score is %s. Take action to improve your financial wellbeing.', v_user_profile.overall_score),
                '{"page": "financial-health", "section": "overview", "trigger": "low_score"}',
                'high',
                true,
                '[{"label": "View Recommendations", "type": "primary", "action": "view_recommendations"}]',
                '{"showAfter": 5, "cooldown": 604800}',
                '{"maxScore": 60}',
                '{"icon": "target", "steps": ["Review your subscriptions", "Optimize high-cost items", "Set up alerts", "Monitor trends"]}',
                'active'
            );
        END IF;
        
        -- High savings potential guidance
        IF v_user_profile.total_savings > 100 THEN
            INSERT INTO contextual_guidance (
                type, title, description, context, priority, actionable, actions,
                timing, targeting, content, status
            ) VALUES (
                'tip',
                'Significant Savings Available',
                FORMAT('You could save £%s annually by optimizing your subscriptions.', ROUND(v_user_profile.total_savings)),
                '{"page": "dashboard", "section": "savings", "trigger": "high_savings"}',
                'high',
                true,
                '[{"label": "View Opportunities", "type": "primary", "action": "view_savings"}]',
                '{"showAfter": 10, "cooldown": 86400}',
                '{}',
                '{"icon": "trending-up", "examples": [{"title": "Top Opportunity", "description": "Your most expensive subscription", "result": "Save up to 40%"}]}',
                'active'
            );
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create function to clean up old guidance data
CREATE OR REPLACE FUNCTION cleanup_guidance_data(p_keep_months INTEGER DEFAULT 6)
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    -- Delete old action logs
    DELETE FROM guidance_action_log 
    WHERE created_at < NOW() - INTERVAL '1 month' * p_keep_months;
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    -- Archive old guidance items
    UPDATE contextual_guidance 
    SET status = 'archived', updated_at = NOW()
    WHERE status = 'active' 
      AND created_at < NOW() - INTERVAL '1 month' * p_keep_months
      AND analytics->>'shown' = '0';
    
    -- Log the cleanup
    RAISE LOG 'Cleaned up % old guidance action log records older than % months', v_deleted_count, p_keep_months;
    
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Insert default guidance templates
INSERT INTO guidance_templates (name, type, title_template, description_template, context, priority, actionable, actions, timing, targeting, content, variables) VALUES
('welcome_tour', 'tutorial', 'Welcome to Quid! Let''s get you started', 'Follow our quick tour to learn how to save money on your subscriptions.', '{"page": "dashboard", "section": "overview", "trigger": "new_user"}', 'high', true, '[{"label": "Start Tour", "type": "primary", "action": "start_tour"}, {"label": "Skip", "type": "secondary", "action": "skip"}]', '{"showAfter": 0, "cooldown": 86400}', '{}', '{"icon": "sparkles", "steps": ["Connect your bank account", "Review your analysis", "Set up alerts", "Explore recommendations"]}', '[]'),
('low_score_warning', 'recommendation', 'Improve Your Financial Health Score', 'Your current score is {{score}}. Here are personalized recommendations to improve it.', '{"page": "financial-health", "section": "overview", "trigger": "low_score"}', 'high', true, '[{"label": "View Recommendations", "type": "primary", "action": "view_recommendations"}]', '{"showAfter": 5, "cooldown": 604800}', '{"maxScore": {{maxScore}}}', '{"icon": "target", "examples": [{"title": "Cost Optimization", "description": "Switch to better deals", "result": "Potential savings: £{{savings}}/year"}]}', '["score", "maxScore", "savings"]'),
('high_savings_opportunity', 'tip', 'Significant Savings Available', 'You could save £{{savings}} annually by optimizing your subscriptions.', '{"page": "dashboard", "section": "savings", "trigger": "high_savings"}', 'high', true, '[{"label": "View Opportunities", "type": "primary", "action": "view_savings"}]', '{"showAfter": 10, "cooldown": 86400}', '{}', '{"icon": "trending-up", "examples": [{"title": "Top Opportunity", "description": "Your most expensive subscription", "result": "Save up to {{percentage}}%"}]}', '["savings", "percentage"]'),
('comparison_without_action', 'tip', 'Ready to Make a Switch?', 'You''ve been comparing options but haven''t made any switches yet. Take action on your research!', '{"page": "comparison", "section": "results", "trigger": "comparison_without_action"}', 'medium', true, '[{"label": "View Switch Options", "type": "primary", "action": "view_switches"}]', '{"showAfter": 15, "cooldown": 172800}', '{}', '{"icon": "zap", "steps": ["Review results", "Check costs", "Complete switch", "Track savings"]}', '[]')
ON CONFLICT (name) DO NOTHING;
