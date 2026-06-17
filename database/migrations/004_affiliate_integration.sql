-- Affiliate Integration Migration
-- Creates tables for Awin affiliate network integration

-- Affiliate merchants table
CREATE TABLE IF NOT EXISTS affiliate_merchants (
    id SERIAL PRIMARY KEY,
    awin_merchant_id VARCHAR(50) UNIQUE NOT NULL,
    provider_name VARCHAR(255) NOT NULL,
    product_types TEXT[] NOT NULL,
    active BOOLEAN DEFAULT true,
    commission_rate DECIMAL(5,2),
    deep_link_supported BOOLEAN DEFAULT true,
    tracking_code VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_affiliate_merchants_provider_name ON affiliate_merchants(provider_name);
CREATE INDEX IF NOT EXISTS idx_affiliate_merchants_active ON affiliate_merchants(active);

-- Affiliate clicks tracking table
CREATE TABLE IF NOT EXISTS affiliate_clicks (
    id SERIAL PRIMARY KEY,
    tracking_id VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(user_id),
    merchant_id VARCHAR(50) NOT NULL,
    product_type VARCHAR(50) NOT NULL,
    click_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    destination_url TEXT,
    referrer_url TEXT,
    campaign_id VARCHAR(50),
    sub_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_tracking_id ON affiliate_clicks(tracking_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_user_id ON affiliate_clicks(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_merchant_id ON affiliate_clicks(merchant_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_timestamp ON affiliate_clicks(click_timestamp);

-- Affiliate conversions tracking table
CREATE TABLE IF NOT EXISTS affiliate_conversions (
    id SERIAL PRIMARY KEY,
    tracking_id VARCHAR(255) NOT NULL REFERENCES affiliate_clicks(tracking_id),
    user_id UUID NOT NULL REFERENCES users(user_id),
    merchant_id VARCHAR(50) NOT NULL,
    product_type VARCHAR(50) NOT NULL,
    conversion_type VARCHAR(20) NOT NULL CHECK (conversion_type IN ('lead', 'sale')),
    conversion_value DECIMAL(10,2) NOT NULL,
    commission_amount DECIMAL(10,2) NOT NULL,
    conversion_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    order_id VARCHAR(100),
    currency VARCHAR(3) DEFAULT 'GBP',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected')),
    webhook_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_affiliate_conversions_tracking_id ON affiliate_conversions(tracking_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_conversions_user_id ON affiliate_conversions(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_conversions_merchant_id ON affiliate_conversions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_conversions_status ON affiliate_conversions(status);
CREATE INDEX IF NOT EXISTS idx_affiliate_conversions_timestamp ON affiliate_conversions(conversion_timestamp);

-- User switches table (updated to include affiliate tracking)
CREATE TABLE IF NOT EXISTS user_switches (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id),
    product_record_id UUID REFERENCES product_records(record_id),
    old_provider VARCHAR(255) NOT NULL,
    new_provider VARCHAR(255) NOT NULL,
    product_type VARCHAR(50) NOT NULL,
    switch_intent_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmation_date TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'failed')),
    commission_earned DECIMAL(10,2) DEFAULT 0,
    affiliate_tracking_id VARCHAR(255) REFERENCES affiliate_clicks(tracking_id),
    estimated_savings DECIMAL(10,2),
    actual_savings DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_switches_user_id ON user_switches(user_id);
CREATE INDEX IF NOT EXISTS idx_user_switches_status ON user_switches(status);
CREATE INDEX IF NOT EXISTS idx_user_switches_tracking_id ON user_switches(affiliate_tracking_id);

-- Commission rates table (updated to include affiliate information)
ALTER TABLE commission_rates ADD COLUMN IF NOT EXISTS affiliate_network VARCHAR(50) DEFAULT 'awin';
ALTER TABLE commission_rates ADD COLUMN IF NOT EXISTS merchant_id VARCHAR(50);
ALTER TABLE commission_rates ADD COLUMN IF NOT EXISTS tracking_template VARCHAR(255);

-- Create index for merchant lookups
CREATE INDEX IF NOT EXISTS idx_commission_rates_merchant_id ON commission_rates(merchant_id);

-- Insert sample affiliate merchants
INSERT INTO affiliate_merchants (awin_merchant_id, provider_name, product_types, commission_rate, tracking_code) VALUES
('1234', 'Octopus Energy', ARRAY['energy'], 5.0, 'quid_octopus'),
('1235', 'British Gas', ARRAY['energy'], 4.5, 'quid_british_gas'),
('1236', 'EDF Energy', ARRAY['energy'], 4.0, 'quid_edf'),
('1237', 'E.ON Next', ARRAY['energy'], 4.2, 'quid_eon'),
('1238', 'ScottishPower', ARRAY['energy'], 4.3, 'quid_scottish_power'),
('1239', 'Sky Broadband', ARRAY['broadband'], 3.0, 'quid_sky'),
('1240', 'BT Broadband', ARRAY['broadband'], 2.5, 'quid_bt'),
('1241', 'Virgin Media', ARRAY['broadband'], 3.5, 'quid_virgin'),
('1242', 'TalkTalk', ARRAY['broadband'], 2.8, 'quid_talktalk'),
('1243', 'Admiral', ARRAY['car_insurance', 'home_insurance'], 15.0, 'quid_admiral'),
('1244', 'Direct Line', ARRAY['car_insurance', 'home_insurance'], 12.0, 'quid_direct_line'),
('1245', 'Aviva', ARRAY['car_insurance', 'home_insurance', 'life_insurance'], 10.0, 'quid_aviva')
ON CONFLICT (awin_merchant_id) DO NOTHING;

-- Update commission rates with merchant IDs
UPDATE commission_rates SET merchant_id = '1234' WHERE provider_name = 'Octopus Energy';
UPDATE commission_rates SET merchant_id = '1235' WHERE provider_name = 'British Gas';
UPDATE commission_rates SET merchant_id = '1236' WHERE provider_name = 'EDF Energy';
UPDATE commission_rates SET merchant_id = '1237' WHERE provider_name = 'E.ON Next';
UPDATE commission_rates SET merchant_id = '1238' WHERE provider_name = 'ScottishPower';
UPDATE commission_rates SET merchant_id = '1239' WHERE provider_name = 'Sky Broadband';
UPDATE commission_rates SET merchant_id = '1240' WHERE provider_name = 'BT Broadband';
UPDATE commission_rates SET merchant_id = '1241' WHERE provider_name = 'Virgin Media';
UPDATE commission_rates SET merchant_id = '1242' WHERE provider_name = 'TalkTalk';
UPDATE commission_rates SET merchant_id = '1243' WHERE provider_name = 'Admiral';
UPDATE commission_rates SET merchant_id = '1244' WHERE provider_name = 'Direct Line';
UPDATE commission_rates SET merchant_id = '1245' WHERE provider_name = 'Aviva';

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_affiliate_merchants_updated_at BEFORE UPDATE ON affiliate_merchants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_affiliate_conversions_updated_at BEFORE UPDATE ON affiliate_conversions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_switches_updated_at BEFORE UPDATE ON user_switches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create view for affiliate performance summary
CREATE OR REPLACE VIEW affiliate_performance_summary AS
SELECT 
    am.provider_name,
    am.awin_merchant_id,
    COUNT(DISTINCT ac.tracking_id) as total_clicks,
    COUNT(DISTINCT afc.tracking_id) as total_conversions,
    COALESCE(SUM(afc.commission_amount), 0) as total_commission,
    CASE 
        WHEN COUNT(DISTINCT ac.tracking_id) > 0 
        THEN ROUND((COUNT(DISTINCT afc.tracking_id)::decimal / COUNT(DISTINCT ac.tracking_id)) * 100, 2)
        ELSE 0 
    END as conversion_rate_percent,
    DATE_TRUNC('month', ac.click_timestamp) as month
FROM affiliate_merchants am
LEFT JOIN affiliate_clicks ac ON am.awin_merchant_id = ac.merchant_id
LEFT JOIN affiliate_conversions afc ON ac.tracking_id = afc.tracking_id
WHERE am.active = true
GROUP BY am.provider_name, am.awin_merchant_id, DATE_TRUNC('month', ac.click_timestamp)
ORDER BY month DESC, total_commission DESC;

-- Switch form data table
CREATE TABLE IF NOT EXISTS switch_form_data (
    id SERIAL PRIMARY KEY,
    switch_id INTEGER NOT NULL REFERENCES user_switches(id) ON DELETE CASCADE,
    form_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_switch_form_data_switch_id ON switch_form_data(switch_id);

-- Create trigger for updated_at
CREATE TRIGGER update_switch_form_data_updated_at BEFORE UPDATE ON switch_form_data FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Affiliate click analytics table
CREATE TABLE IF NOT EXISTS affiliate_click_analytics (
    id SERIAL PRIMARY KEY,
    tracking_id VARCHAR(255) NOT NULL,
    click_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    referrer TEXT,
    user_id UUID NOT NULL REFERENCES users(user_id),
    merchant_id VARCHAR(50) NOT NULL,
    product_type VARCHAR(50) NOT NULL,
    destination_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_affiliate_click_analytics_tracking_id ON affiliate_click_analytics(tracking_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_click_analytics_user_id ON affiliate_click_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_click_analytics_merchant_id ON affiliate_click_analytics(merchant_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_click_analytics_timestamp ON affiliate_click_analytics(click_timestamp);

-- Affiliate click statistics table
CREATE TABLE IF NOT EXISTS affiliate_click_statistics (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    merchant_id VARCHAR(50) NOT NULL,
    product_type VARCHAR(50) NOT NULL,
    click_count INTEGER DEFAULT 0,
    conversion_count INTEGER DEFAULT 0,
    commission_total DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date, merchant_id, product_type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_affiliate_click_statistics_date ON affiliate_click_statistics(date);
CREATE INDEX IF NOT EXISTS idx_affiliate_click_statistics_merchant_id ON affiliate_click_statistics(merchant_id);

-- Affiliate short URLs table
CREATE TABLE IF NOT EXISTS affiliate_short_urls (
    id SERIAL PRIMARY KEY,
    tracking_id VARCHAR(255) NOT NULL REFERENCES affiliate_clicks(tracking_id),
    short_code VARCHAR(20) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    click_count INTEGER DEFAULT 0
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_affiliate_short_urls_tracking_id ON affiliate_short_urls(tracking_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_short_urls_short_code ON affiliate_short_urls(short_code);
CREATE INDEX IF NOT EXISTS idx_affiliate_short_urls_expires_at ON affiliate_short_urls(expires_at);

-- Create triggers for updated_at
CREATE TRIGGER update_affiliate_click_statistics_updated_at BEFORE UPDATE ON affiliate_click_statistics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create view for user affiliate activity
CREATE OR REPLACE VIEW user_affiliate_activity AS
SELECT 
    u.user_id,
    u.email,
    COUNT(DISTINCT ac.tracking_id) as total_clicks,
    COUNT(DISTINCT afc.tracking_id) as total_conversions,
    COALESCE(SUM(afc.commission_amount), 0) as total_commission_earned,
    COUNT(DISTINCT us.id) as total_switches,
    COALESCE(SUM(us.estimated_savings), 0) as total_estimated_savings
FROM users u
LEFT JOIN affiliate_clicks ac ON u.user_id = ac.user_id
LEFT JOIN affiliate_conversions afc ON ac.tracking_id = afc.tracking_id
LEFT JOIN user_switches us ON u.user_id = us.user_id
GROUP BY u.user_id, u.email
ORDER BY total_commission_earned DESC;

-- Create view for affiliate link performance
CREATE OR REPLACE VIEW affiliate_link_performance AS
SELECT 
    aca.tracking_id,
    aca.user_id,
    aca.merchant_id,
    am.provider_name,
    aca.product_type,
    aca.click_timestamp,
    aca.ip_address,
    aca.referrer,
    CASE 
        WHEN afc.tracking_id IS NOT NULL THEN 'converted'
        WHEN aca.click_timestamp < NOW() - INTERVAL '30 days' THEN 'expired'
        ELSE 'pending'
    END as status,
    afc.conversion_timestamp,
    afc.commission_amount,
    asu.short_code,
    asu.expires_at
FROM affiliate_click_analytics aca
JOIN affiliate_merchants am ON aca.merchant_id = am.awin_merchant_id
LEFT JOIN affiliate_conversions afc ON aca.tracking_id = afc.tracking_id
LEFT JOIN affiliate_short_urls asu ON aca.tracking_id = asu.tracking_id
ORDER BY aca.click_timestamp DESC;
