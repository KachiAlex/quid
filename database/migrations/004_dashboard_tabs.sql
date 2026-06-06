-- Migration: Dashboard tabs support (alerts, activity, goals, insights, community)

-- =============================================
-- User Alerts
-- =============================================
CREATE TABLE IF NOT EXISTS user_alerts (
    alert_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('Urgent', 'Savings', 'Price Hike', 'Renewal', 'System')),
    title VARCHAR(255) NOT NULL,
    detail TEXT,
    icon_category VARCHAR(50) NOT NULL DEFAULT 'generic',
    is_read BOOLEAN NOT NULL DEFAULT false,
    is_dismissed BOOLEAN NOT NULL DEFAULT false,
    action_url VARCHAR(255),
    action_label VARCHAR(100),
    urgency VARCHAR(20) NOT NULL DEFAULT 'Medium' CHECK (urgency IN ('Very High', 'High', 'Medium', 'Low')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_alerts_user_id ON user_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_alerts_unread ON user_alerts(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_user_alerts_active ON user_alerts(user_id, is_dismissed) WHERE is_dismissed = false;
CREATE INDEX IF NOT EXISTS idx_user_alerts_created_at ON user_alerts(created_at DESC);

-- =============================================
-- Activity Log
-- =============================================
CREATE TABLE IF NOT EXISTS activity_log (
    activity_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN ('scan', 'alert', 'switch', 'classification', 'shield', 'goal')),
    title VARCHAR(255) NOT NULL,
    detail TEXT,
    icon_category VARCHAR(50) NOT NULL DEFAULT 'generic',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);

-- =============================================
-- User Goals
-- =============================================
CREATE TABLE IF NOT EXISTS user_goals (
    goal_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    target_amount DECIMAL(12, 2) NOT NULL,
    current_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    icon_category VARCHAR(50) NOT NULL DEFAULT 'generic',
    deadline DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_goals_user_id ON user_goals(user_id);

CREATE TRIGGER IF NOT EXISTS update_user_goals_updated_at
    BEFORE UPDATE ON user_goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- User Insights
-- =============================================
CREATE TABLE IF NOT EXISTS user_insights (
    insight_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    insight_type VARCHAR(50) NOT NULL CHECK (insight_type IN ('Savings', 'Trend', 'Positive', 'Warning')),
    title VARCHAR(255) NOT NULL,
    detail TEXT,
    impact VARCHAR(50),
    icon_category VARCHAR(50) NOT NULL DEFAULT 'generic',
    is_actioned BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_insights_user_id ON user_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_user_insights_unactioned ON user_insights(user_id, is_actioned) WHERE is_actioned = false;

-- =============================================
-- Community Discussions
-- =============================================
CREATE TABLE IF NOT EXISTS community_discussions (
    discussion_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    author_name VARCHAR(100) NOT NULL,
    icon_category VARCHAR(50) NOT NULL DEFAULT 'generic',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_discussions_created_at ON community_discussions(created_at DESC);

-- =============================================
-- Community Posts (replies)
-- =============================================
CREATE TABLE IF NOT EXISTS community_posts (
    post_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    discussion_id UUID NOT NULL REFERENCES community_discussions(discussion_id) ON DELETE CASCADE,
    author_name VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_posts_discussion_id ON community_posts(discussion_id);
