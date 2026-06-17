-- Clear all users and related data (CASCADE will delete all dependent records)
-- WARNING: This is destructive and cannot be undone

BEGIN;

-- Delete all users (CASCADE will handle all related tables)
DELETE FROM users;

COMMIT;

-- Verify count
SELECT 'Users deleted. Remaining count:' as status, COUNT(*) as count FROM users;
