-- Thêm cột quản lý vòng đời token
ALTER TABLE integrations
  ADD COLUMN IF NOT EXISTS expires_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_error  TEXT;

-- Index để tìm nhanh các kênh sắp hết hạn (cho cron job refresh)
CREATE INDEX IF NOT EXISTS idx_integrations_expires_at
  ON integrations (expires_at)
  WHERE status = 'CONNECTED';

-- Cron job (Supabase pg_cron): kiểm tra token hết hạn mỗi 6 tiếng
-- Cần enable extension: CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule(
--   'check-expired-tokens',
--   '0 */6 * * *',
--   $$
--     UPDATE integrations
--     SET status = 'ERROR',
--         last_error = 'Token expired — reconnect required'
--     WHERE status = 'CONNECTED'
--       AND expires_at < NOW() - INTERVAL '1 day'
--   $$
-- );
