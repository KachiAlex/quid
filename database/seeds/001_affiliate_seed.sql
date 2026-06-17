-- Seed affiliate merchants and commission rates
-- Update awin_merchant_id values when real Awin IDs are available

INSERT INTO affiliate_merchants (provider_name, awin_merchant_id, product_types)
VALUES
  ('Aviva', '12345', ARRAY['car_insurance', 'home_insurance']),
  ('Admiral', '12346', ARRAY['car_insurance']),
  ('Direct Line', '12347', ARRAY['car_insurance', 'home_insurance']),
  ('Churchill', '12348', ARRAY['car_insurance', 'home_insurance']),
  ('LV', '12349', ARRAY['car_insurance', 'home_insurance']),
  ('Hiscox', '12350', ARRAY['home_insurance']),
  ('Saga', '12351', ARRAY['car_insurance', 'home_insurance']),
  ('British Gas', '22345', ARRAY['energy']),
  ('Octopus Energy', '22346', ARRAY['energy']),
  ('EDF Energy', '22347', ARRAY['energy']),
  ('E.ON', '22348', ARRAY['energy']),
  ('ScottishPower', '22349', ARRAY['energy']),
  ('Shell Energy', '22350', ARRAY['energy']),
  ('OVO Energy', '22351', ARRAY['energy']),
  ('BT', '32345', ARRAY['broadband']),
  ('Sky', '32346', ARRAY['broadband']),
  ('Virgin Media', '32347', ARRAY['broadband']),
  ('TalkTalk', '32348', ARRAY['broadband']),
  ('Plusnet', '32349', ARRAY['broadband']),
  ('Petplan', '42345', ARRAY['pet_insurance']),
  ('Animal Friends', '42346', ARRAY['pet_insurance']),
  ('Bupa', '52345', ARRAY['life_insurance']),
  ('Legal & General', '52346', ARRAY['life_insurance']),
  ('Aviva Life', '52347', ARRAY['life_insurance'])
ON CONFLICT (provider_name) DO NOTHING;

INSERT INTO commission_rates (provider_name, product_type, rate_percent)
VALUES
  ('Aviva', 'car_insurance', 15.00),
  ('Admiral', 'car_insurance', 12.50),
  ('Direct Line', 'car_insurance', 14.00),
  ('Churchill', 'car_insurance', 13.00),
  ('LV', 'car_insurance', 14.50),
  ('Saga', 'car_insurance', 12.00),
  ('Hiscox', 'home_insurance', 18.00),
  ('Aviva', 'home_insurance', 16.00),
  ('Direct Line', 'home_insurance', 15.00),
  ('Churchill', 'home_insurance', 14.50),
  ('LV', 'home_insurance', 15.50),
  ('Saga', 'home_insurance', 13.00),
  ('British Gas', 'energy', 8.00),
  ('Octopus Energy', 'energy', 10.00),
  ('EDF Energy', 'energy', 7.50),
  ('E.ON', 'energy', 8.00),
  ('ScottishPower', 'energy', 7.00),
  ('Shell Energy', 'energy', 9.00),
  ('OVO Energy', 'energy', 8.50),
  ('BT', 'broadband', 12.00),
  ('Sky', 'broadband', 14.00),
  ('Virgin Media', 'broadband', 13.00),
  ('TalkTalk', 'broadband', 11.00),
  ('Plusnet', 'broadband', 10.00),
  ('Petplan', 'pet_insurance', 18.00),
  ('Animal Friends', 'pet_insurance', 16.00),
  ('Bupa', 'life_insurance', 22.00),
  ('Legal & General', 'life_insurance', 20.00),
  ('Aviva Life', 'life_insurance', 21.00)
ON CONFLICT (provider_name, product_type) DO NOTHING;
