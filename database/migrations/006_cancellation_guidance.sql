-- Cancellation Guidance Migration
-- Creates tables for provider-specific cancellation guidance

-- Provider cancellation guidance table
CREATE TABLE IF NOT EXISTS provider_cancellation_guidance (
    id SERIAL PRIMARY KEY,
    provider_name VARCHAR(255) NOT NULL,
    product_type VARCHAR(50) NOT NULL,
    cancellation_methods JSONB NOT NULL,
    general_tips JSONB NOT NULL,
    important_notes JSONB NOT NULL,
    common_issues JSONB NOT NULL,
    alternative_options JSONB NOT NULL,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider_name, product_type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_provider_cancellation_guidance_provider_name ON provider_cancellation_guidance(provider_name);
CREATE INDEX IF NOT EXISTS idx_provider_cancellation_guidance_product_type ON provider_cancellation_guidance(product_type);
CREATE INDEX IF NOT EXISTS idx_provider_cancellation_guidance_last_updated ON provider_cancellation_guidance(last_updated);

-- Create trigger for updated_at
CREATE TRIGGER update_provider_cancellation_guidance_updated_at BEFORE UPDATE ON provider_cancellation_guidance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Cancellation guidance search tracking table
CREATE TABLE IF NOT EXISTS cancellation_guidance_searches (
    id SERIAL PRIMARY KEY,
    provider_name VARCHAR(255) NOT NULL,
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_cancellation_guidance_searches_provider_name ON cancellation_guidance_searches(provider_name);
CREATE INDEX IF NOT EXISTS idx_cancellation_guidance_searches_user_id ON cancellation_guidance_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_guidance_searches_searched_at ON cancellation_guidance_searches(searched_at);

-- Create view for popular providers
CREATE OR REPLACE VIEW popular_cancellation_providers AS
SELECT 
    provider_name,
    COUNT(*) as search_count,
    COUNT(DISTINCT user_id) as unique_users,
    MAX(searched_at) as last_searched
FROM cancellation_guidance_searches
WHERE searched_at > NOW() - INTERVAL '30 days'
GROUP BY provider_name
ORDER BY search_count DESC;

-- Create view for cancellation guidance analytics
CREATE OR REPLACE VIEW cancellation_guidance_analytics AS
SELECT 
    DATE_TRUNC('month', searched_at) as month,
    COUNT(*) as total_searches,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT provider_name) as unique_providers
FROM cancellation_guidance_searches
GROUP BY DATE_TRUNC('month', searched_at)
ORDER BY month DESC;

-- Create view for provider coverage
CREATE OR REPLACE VIEW provider_coverage_analysis AS
SELECT 
    pcg.product_type,
    COUNT(DISTINCT pcg.provider_name) as providers_with_guidance,
    COUNT(DISTINCT pr.provider_name) as total_providers,
    ROUND(
        (COUNT(DISTINCT pcg.provider_name)::decimal / NULLIF(COUNT(DISTINCT pr.provider_name), 0)) * 100, 
        2
    ) as coverage_percentage
FROM provider_cancellation_guidance pcg
FULL OUTER JOIN (
    SELECT DISTINCT provider_name, product_type 
    FROM product_records 
    WHERE status = 'active'
) pr ON pcg.provider_name = pr.provider_name AND pcg.product_type = pr.product_type
GROUP BY pcg.product_type
ORDER BY coverage_percentage DESC;

-- Insert general guidance for common product types
INSERT INTO provider_cancellation_guidance (provider_name, product_type, cancellation_methods, general_tips, important_notes, common_issues, alternative_options) VALUES
('GENERAL', 'broadband', 
 '[
   {
     "type": "phone",
     "label": "Call Customer Service",
     "instructions": "Call your broadband provider to request cancellation. Have your account number and personal details ready.",
     "contactInfo": "Check your latest bill for the customer service number",
     "hours": "Typically Monday-Friday 8am-8pm, Saturday 9am-5pm",
     "requirements": ["Account number", "Full name", "Service address", "Reason for cancellation"],
     "fees": "May apply if within minimum contract period",
     "noticePeriod": "Usually 14-30 days"
   },
   {
     "type": "online",
     "label": "Online Account",
     "instructions": "Log in to your online account and navigate to account settings to find cancellation options.",
     "url": "Visit your provider''s website",
     "requirements": ["Online account access", "Login credentials"],
     "noticePeriod": "Varies by provider"
   }
 ]',
 '[
   "Check your contract for early termination fees",
   "Get confirmation of cancellation in writing",
   "Return any equipment (router, set-top box) as instructed",
   "Note the final billing date",
   "Keep records of all cancellation communication"
 ]',
 '[
   "Most providers require 30 days notice",
   "Early termination fees can be significant",
   "You may need to return equipment within a specified timeframe",
   "Final bill may include charges up to the cancellation date",
   "Consider timing to avoid service gaps"
 ]',
 '[
   {"issue": "Long wait times on phone", "solution": "Try calling early morning or use live chat if available"},
   {"issue": "Website cancellation not working", "solution": "Clear browser cache or try a different browser"},
   {"issue": "Provider offers retention deal", "solution": "Compare with other providers before deciding"},
   {"issue": "Equipment return issues", "solution": "Get tracking number when returning equipment"}
 ]',
 '[
   {"option": "Downgrade to cheaper plan", "description": "Switch to a lower-speed or basic plan to reduce costs"},
   {"option": "Transfer service", "description": "Transfer service to new address if moving"},
   {"option": "Pause service", "description": "Some providers allow temporary suspension"}
 ]'),

('GENERAL', 'mobile',
 '[
   {
     "type": "phone",
     "label": "Call Customer Service",
     "instructions": "Call your mobile provider to cancel. You''ll need to verify your identity for security.",
     "contactInfo": "Dial customer service from your mobile or use landline",
     "hours": "Usually 7 days a week, 8am-8pm",
     "requirements": ["Account number or phone number", "Security information", "Reason for cancellation"],
     "fees": "May apply if within contract term",
     "noticePeriod": "Usually 30 days"
   },
   {
     "type": "text",
     "label": "Text Message",
     "instructions": "Some providers allow cancellation via text message. Check with your provider first.",
     "contactInfo": "Usually requires sending PAC to specific number",
     "requirements": ["Account verification", "PAC code if switching networks"],
     "noticePeriod": "30 days from PAC request"
   }
 ]',
 '[
   "Request a PAC code if switching networks",
   "Keep your number if you want to port it",
   "Check for early termination charges",
   "Cancel any direct debits after final bill",
   "Unlock your phone if needed"
 ]',
 '[
   "30-day notice is standard across providers",
   "PAC code is valid for 30 days",
   "Early termination fees can equal remaining contract value",
   "Final bill includes charges up to cancellation date",
   "Phone unlocking may be required for network switching"
 ]',
 '[
   {"issue": "Provider won''t cancel without PAC", "solution": "Explain if you''re not switching networks or request PAC for future use"},
   {"issue": "High early termination fees", "solution": "Ask if they can be waived or reduced"},
   {"issue": "Phone locked to network", "solution": "Request unlocking code after contract ends"},
   {"issue": "Final bill charges", "solution": "Review carefully and dispute if incorrect"}
 ]',
 '[
   {"option": "Switch to SIM-only", "description": "Keep your phone and switch to cheaper SIM-only plan"},
   {"option": "Transfer ownership", "description": "Transfer contract to another person if allowed"},
   {"option": "Downgrade plan", "description": "Switch to a cheaper monthly plan"}
 ]'),

('GENERAL', 'energy',
 '[
   {
     "type": "phone",
     "label": "Call Supplier",
     "instructions": "Call your energy supplier to cancel. You''ll need your MPAN or MPRN number.",
     "contactInfo": "Number on your energy bill",
     "hours": "Usually Monday-Friday 8am-6pm",
     "requirements": ["MPAN/MPRN number", "Account number", "Moving date if applicable"],
     "fees": "Usually no exit fees if switching supplier",
     "noticePeriod": "Usually 14 days"
   },
   {
     "type": "online",
     "label": "Online Portal",
     "instructions": "Many suppliers allow cancellation through their online portal.",
     "url": "Log in to your supplier''s website",
     "requirements": ["Online account access", "Meter details"],
     "noticePeriod": "14-28 days depending on supplier"
   }
 ]',
 '[
   "Have meter readings ready for final bill",
   "Take final meter readings on moving day",
   "Provide forwarding address for final bill",
   "Check if you''re in a fixed-term contract",
   "Compare deals before switching"
 ]',
 '[
   "Energy market is deregulated - easy to switch",
   "No cooling off period for energy switches",
   "Final bill must be paid within 28 days",
   "Suppliers can''t charge exit fees for switching",
   "Take photos of meter readings"
 ]',
 '[
   {"issue": "Supplier won''t cancel without final reading", "solution": "Provide estimated reading and arrange for actual reading"},
   {"issue": "Final bill disputes", "solution": "Contact supplier within 28 days of final bill"},
   {"issue": "Switching delays", "solution": "Confirm switch date with both old and new suppliers"},
   {"issue": "Credit balance issues", "solution": "Request refund of any credit balance"}
 ]',
 '[
   {"option": "Switch to cheaper tariff", "description": "Switch to a cheaper tariff with same supplier"},
   {"option": "Green energy options", "description": "Consider renewable energy tariffs"},
   {"option": "Fixed vs variable rates", "description": "Choose between price security and flexibility"}
 ]'),

('GENERAL', 'insurance',
 '[
   {
     "type": "phone",
     "label": "Call Insurer",
     "instructions": "Call your insurance provider to cancel. Have your policy number ready.",
     "contactInfo": "Number on your insurance documents",
     "hours": "Usually Monday-Friday 9am-5pm",
     "requirements": ["Policy number", "Personal identification", "Reason for cancellation"],
     "fees": "May apply depending on policy terms",
     "noticePeriod": "Usually 14-30 days"
   },
   {
     "type": "email",
     "label": "Email Request",
     "instructions": "Send written cancellation request via email for record keeping.",
     "contactInfo:": "Check policy documents for cancellation email",
     "requirements": ["Policy number", "Full name", "Cancellation date", "Reason"],
     "noticePeriod": "Follow policy terms"
   }
 ]',
 '[
   "Check policy for cancellation terms and fees",
   "Get confirmation in writing",
   "Arrange alternative coverage before cancellation",
   "Check for refunds of prepaid premiums",
   "Consider timing (avoid coverage gaps)"
 ]',
 '[
   "Cancellation fees vary by policy type",
   "Some policies have minimum terms",
   "Refunds may be pro-rated",
   "No claims bonus may be affected",
   "Coverage continues until end of paid period"
 ]',
 '[
   {"issue": "High cancellation fees", "solution": "Check if fees are proportional to remaining term"},
   {"issue": "Refund delays", "solution": "Follow up if refund not received within 30 days"},
   {"issue": "Coverage gaps", "solution": "Ensure new coverage starts before old ends"},
   {"issue": "No claims bonus impact", "solution": "Ask about preserving no claims bonus"}
 ]',
 '[
   {"option": "Reduce coverage", "description": "Lower coverage limits or increase deductibles"},
   {"option": "Shop around", "description": "Compare quotes from other insurers"},
   {"option": "Bundle policies", "description": "Combine multiple policies for discounts"}
 ]')
ON CONFLICT (provider_name, product_type) DO NOTHING;

-- Create function to update search analytics
CREATE OR REPLACE FUNCTION update_cancellation_search_analytics()
RETURNS TRIGGER AS $$
BEGIN
    -- This trigger can be used to update analytics tables
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for search analytics
CREATE TRIGGER update_cancellation_search_analytics_trigger
    AFTER INSERT ON cancellation_guidance_searches
    FOR EACH ROW
    EXECUTE FUNCTION update_cancellation_search_analytics();
