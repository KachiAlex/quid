-- Seed data for local development
-- Rate records (sample)

INSERT INTO rate_records (product_type, provider, annual_cost, effective_from, source) VALUES
('car_insurance', 'Admiral', 450.00, '2026-05-01', 'manual'),
('car_insurance', 'Aviva', 420.00, '2026-05-01', 'manual'),
('car_insurance', 'Direct Line', 480.00, '2026-05-01', 'manual'),
('home_insurance', 'Aviva', 280.00, '2026-05-01', 'manual'),
('home_insurance', 'Direct Line', 310.00, '2026-05-01', 'manual'),
('home_insurance', 'Admiral', 265.00, '2026-05-01', 'manual'),
('energy', 'Octopus Energy', 1200.00, '2026-05-01', 'manual'),
('energy', 'British Gas', 1350.00, '2026-05-01', 'manual'),
('broadband', 'BT', 360.00, '2026-05-01', 'manual'),
('broadband', 'Sky', 420.00, '2026-05-01', 'manual'),
('broadband', 'Virgin Media', 480.00, '2026-05-01', 'manual')
ON CONFLICT (product_type, provider) DO NOTHING;
