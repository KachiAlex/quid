-- Seed data for dashboard tabs (assigns to the first user in the system)
-- Run AFTER 004_dashboard_tabs.sql migration and after users exist

DO $$
DECLARE
    demo_user_id UUID;
BEGIN
    -- Get first active user (fallback to a placeholder if none)
    SELECT user_id INTO demo_user_id FROM users WHERE deleted_at IS NULL LIMIT 1;

    -- If no user exists, skip seeding
    IF demo_user_id IS NULL THEN
        RAISE NOTICE 'No active user found; skipping dashboard seed.';
        RETURN;
    END IF;

    -- =============================================
    -- User Alerts
    -- =============================================
    INSERT INTO user_alerts (user_id, alert_type, title, detail, icon_category, is_read, urgency, created_at)
    VALUES
        (demo_user_id, 'Urgent', 'Car insurance renewal in 14 days', 'Your current provider quoted £1,240. We found 8 better deals starting at £528.', 'car_insurance', false, 'Very High', NOW() - INTERVAL '2 hours'),
        (demo_user_id, 'Savings', 'Broadband price increase detected', 'Virgin Media is increasing your monthly bill by £18 from next month.', 'broadband', false, 'High', NOW() - INTERVAL '5 hours'),
        (demo_user_id, 'Savings', 'Better energy tariff available', 'Octopus Energy Agile tariff could save you £438/year based on your usage.', 'energy', true, 'High', NOW() - INTERVAL '1 day'),
        (demo_user_id, 'Price Hike', 'Netflix subscription price increased', 'Standard plan went from £10.99 to £12.99. Consider downgrading or switching.', 'subscription', true, 'Medium', NOW() - INTERVAL '2 days'),
        (demo_user_id, 'Renewal', 'Home insurance renewal due soon', 'Renewal quote: £420. Last year you paid £340. Shop around now.', 'home_insurance', true, 'Medium', NOW() - INTERVAL '3 days'),
        (demo_user_id, 'Savings', '3 unused subscriptions found', 'You are paying for Disney+, Audible, and Duolingo but rarely use them.', 'subscription', true, 'Low', NOW() - INTERVAL '4 days');

    -- =============================================
    -- Activity Log
    -- =============================================
    INSERT INTO activity_log (user_id, activity_type, title, detail, icon_category, created_at)
    VALUES
        (demo_user_id, 'scan', 'Car insurance scan completed', 'Found 8 better quotes for you', 'car_insurance', NOW() - INTERVAL '2 hours'),
        (demo_user_id, 'shield', 'Energy tariff updated', 'Potential saving increased', 'energy', NOW() - INTERVAL '5 hours'),
        (demo_user_id, 'alert', 'Broadband price increase detected', 'Virgin Media increasing by £18/month', 'broadband', NOW() - INTERVAL '1 day'),
        (demo_user_id, 'scan', '3 unused subscriptions found', 'You could save £47/month', 'subscription', NOW() - INTERVAL '2 days'),
        (demo_user_id, 'switch', 'Switched energy provider', 'From British Gas to Octopus Energy — saving £438/year', 'energy', NOW() - INTERVAL '3 days'),
        (demo_user_id, 'shield', 'Home insurance renewal alert set', 'Monitoring 6 renewals', 'home_insurance', NOW() - INTERVAL '5 days');

    -- =============================================
    -- User Goals
    -- =============================================
    INSERT INTO user_goals (user_id, name, target_amount, current_amount, icon_category, deadline)
    VALUES
        (demo_user_id, 'Emergency Fund', 5000, 3200, 'emergency', '2026-12-31'),
        (demo_user_id, 'Holiday to Japan', 3500, 1200, 'holiday', '2027-04-30'),
        (demo_user_id, 'House Deposit', 40000, 8500, 'house', '2028-12-31'),
        (demo_user_id, 'New Car', 12000, 4500, 'car', '2027-06-30'),
        (demo_user_id, 'Masters Degree', 15000, 2000, 'education', '2027-09-01');

    -- =============================================
    -- User Insights
    -- =============================================
    INSERT INTO user_insights (user_id, insight_type, title, detail, impact, icon_category)
    VALUES
        (demo_user_id, 'Savings', 'Your car insurance is 37% higher than average', 'People in your area with similar cars pay £480 less. Consider getting new quotes.', '£480/year', 'car_insurance'),
        (demo_user_id, 'Trend', 'You spend 22% more on energy in winter', 'Consider a fixed tariff to smooth costs, or improve insulation.', 'High', 'energy'),
        (demo_user_id, 'Savings', 'Broadband speed vs price comparison', 'You are paying for 500Mbps but only use 45Mbps on average. Downgrading could save £15/month.', '£180/year', 'broadband'),
        (demo_user_id, 'Savings', 'Subscription stacking detected', 'You have Netflix, Disney+, Prime Video, and Apple TV+. Most people only use 2 regularly.', '£240/year', 'subscription'),
        (demo_user_id, 'Positive', 'Your savings rate is above average', 'You save 18% of income vs the UK average of 8%. Keep it up!', 'Great', 'trend'),
        (demo_user_id, 'Warning', 'Late bill payments affect your score', '2 late payments in the last 6 months. Set up direct debits to avoid fees.', 'Medium', 'shield');

    -- =============================================
    -- Community Discussions
    -- =============================================
    INSERT INTO community_discussions (title, author_name, icon_category, created_at)
    VALUES
        ('Best broadband deals right now?', 'Sarah M.', 'broadband', NOW() - INTERVAL '2 hours'),
        ('Should I switch energy provider before winter?', 'James L.', 'energy', NOW() - INTERVAL '5 hours'),
        ('Tips for haggling car insurance renewals', 'Priya R.', 'car_insurance', NOW() - INTERVAL '1 day'),
        ('Quid Shield just saved me £180!', 'Tom W.', 'shield', NOW() - INTERVAL '2 days');

END $$;
