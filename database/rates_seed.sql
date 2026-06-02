-- Rate Database Seed Data
-- This file contains sample market rates for UK insurance and energy providers
-- TODO: Replace with real data from provider APIs or comparison services

-- Clear existing rate data
TRUNCATE TABLE rate_records CASCADE;

-- Car Insurance Rates (Annual premiums for typical profile)
INSERT INTO rate_records (product_type, provider, annual_cost, effective_from, source) VALUES
('car_insurance', 'Aviva', 420.00, '2026-06-01', 'manual_seed'),
('car_insurance', 'Admiral', 450.00, '2026-06-01', 'manual_seed'),
('car_insurance', 'Direct Line', 435.00, '2026-06-01', 'manual_seed'),
('car_insurance', 'Churchill', 445.00, '2026-06-01', 'manual_seed'),
('car_insurance', 'LV', 425.00, '2026-06-01', 'manual_seed'),
('car_insurance', 'Churchill', 440.00, '2026-06-01', 'manual_seed'),
('car_insurance', 'Hastings Direct', 460.00, '2026-06-01', 'manual_seed'),
('car_insurance', 'More Than', 455.00, '2026-06-01', 'manual_seed'),
('car_insurance', 'Saga', 470.00, '2026-06-01', 'manual_seed'),
('car_insurance', 'AA', 465.00, '2026-06-01', 'manual_seed');

-- Home Insurance Rates (Annual premiums for typical 3-bed house)
INSERT INTO rate_records (product_type, provider, annual_cost, effective_from, source) VALUES
('home_insurance', 'Aviva', 180.00, '2026-06-01', 'manual_seed'),
('home_insurance', 'Direct Line', 195.00, '2026-06-01', 'manual_seed'),
('home_insurance', 'Churchill', 190.00, '2026-06-01', 'manual_seed'),
('home_insurance', 'LV', 185.00, '2026-06-01', 'manual_seed'),
('home_insurance', 'Hiscox', 210.00, '2026-06-01', 'manual_seed'),
('home_insurance', 'John Lewis', 200.00, '2026-06-01', 'manual_seed'),
('home_insurance', 'Nationwide', 175.00, '2026-06-01', 'manual_seed'),
('home_insurance', 'Saga', 205.00, '2026-06-01', 'manual_seed'),
('home_insurance', 'AA', 192.00, '2026-06-01', 'manual_seed'),
('home_insurance', 'Lloyds Bank', 188.00, '2026-06-01', 'manual_seed');

-- Life Insurance Rates (Annual premiums for £200k cover, 30-year term)
INSERT INTO rate_records (product_type, provider, annual_cost, effective_from, source) VALUES
('life_insurance', 'Aviva', 15.00, '2026-06-01', 'manual_seed'),
('life_insurance', 'Legal & General', 14.50, '2026-06-01', 'manual_seed'),
('life_insurance', 'Scottish Widows', 15.50, '2026-06-01', 'manual_seed'),
('life_insurance', 'Vitality', 18.00, '2026-06-01', 'manual_seed'),
('life_insurance', 'Aegon', 14.00, '2026-06-01', 'manual_seed'),
('life_insurance', 'Royal London', 13.50, '2026-06-01', 'manual_seed'),
('life_insurance', 'Zurich', 16.00, '2026-06-01', 'manual_seed'),
('life_insurance', 'Prudential', 15.80, '2026-06-01', 'manual_seed'),
('life_insurance', 'SunLife', 14.20, '2026-06-01', 'manual_seed'),
('life_insurance', 'HSBC', 15.20, '2026-06-01', 'manual_seed');

-- Pet Insurance Rates (Annual premiums for dog, medium breed)
INSERT INTO rate_records (product_type, provider, annual_cost, effective_from, source) VALUES
('pet_insurance', 'Aviva', 280.00, '2026-06-01', 'manual_seed'),
('pet_insurance', 'Direct Line', 295.00, '2026-06-01', 'manual_seed'),
('pet_insurance', 'Churchill', 290.00, '2026-06-01', 'manual_seed'),
('pet_insurance', 'LV', 275.00, '2026-06-01', 'manual_seed'),
('pet_insurance', 'Petplan', 320.00, '2026-06-01', 'manual_seed'),
('pet_insurance', 'John Lewis', 285.00, '2026-06-01', 'manual_seed'),
('pet_insurance', 'ManyPets', 260.00, '2026-06-01', 'manual_seed'),
('pet_insurance', 'Animal Friends', 270.00, '2026-06-01', 'manual_seed'),
('pet_insurance', 'Sainsbury''s', 278.00, '2026-06-01', 'manual_seed'),
('pet_insurance', 'Tesco Bank', 282.00, '2026-06-01', 'manual_seed');

-- Energy Rates (Annual cost for typical 3-bed house, 12,000 kWh gas, 2,900 kWh electric)
INSERT INTO rate_records (product_type, provider, annual_cost, effective_from, source) VALUES
('energy', 'British Gas', 1350.00, '2026-06-01', 'manual_seed'),
('energy', 'Octopus Energy', 1280.00, '2026-06-01', 'manual_seed'),
('energy', 'EDF Energy', 1320.00, '2026-06-01', 'manual_seed'),
('energy', 'E.ON', 1295.00, '2026-06-01', 'manual_seed'),
('energy', 'ScottishPower', 1310.00, '2026-06-01', 'manual_seed'),
('energy', 'OVO Energy', 1275.00, '2026-06-01', 'manual_seed'),
('energy', 'Bulb', 1265.00, '2026-06-01', 'manual_seed'),
('energy', 'Shell Energy', 1300.00, '2026-06-01', 'manual_seed'),
('energy', 'Utility Warehouse', 1290.00, '2026-06-01', 'manual_seed'),
('energy', 'Npower', 1335.00, '2026-06-01', 'manual_seed');

-- Broadband Rates (Annual cost for typical 50Mbps fibre)
INSERT INTO rate_records (product_type, provider, annual_cost, effective_from, source) VALUES
('broadband', 'BT', 420.00, '2026-06-01', 'manual_seed'),
('broadband', 'Virgin Media', 450.00, '2026-06-01', 'manual_seed'),
('broadband', 'Sky', 400.00, '2026-06-01', 'manual_seed'),
('broadband', 'TalkTalk', 360.00, '2026-06-01', 'manual_seed'),
('broadband', 'Plusnet', 380.00, '2026-06-01', 'manual_seed'),
('broadband', 'Vodafone', 390.00, '2026-06-01', 'manual_seed'),
('broadband', 'Hyperoptic', 410.00, '2026-06-01', 'manual_seed'),
('broadband', 'Community Fibre', 370.00, '2026-06-01', 'manual_seed'),
('broadband', 'Zen Internet', 395.00, '2026-06-01', 'manual_seed'),
('broadband', 'EE', 385.00, '2026-06-01', 'manual_seed');

-- Verify insertion
SELECT product_type, COUNT(*) as provider_count, MIN(annual_cost) as cheapest, MAX(annual_cost) as most_expensive
FROM rate_records
GROUP BY product_type
ORDER BY product_type;
