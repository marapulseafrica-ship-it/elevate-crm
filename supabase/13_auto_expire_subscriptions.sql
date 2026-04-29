-- Migration: Auto-expire subscriptions via daily cron job
-- Runs every day at midnight UTC

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION expire_overdue_subscriptions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_count integer;
BEGIN
  UPDATE restaurants
  SET subscription_status = 'expired'
  WHERE subscription_status = 'active'
    AND subscription_expires_at IS NOT NULL
    AND subscription_expires_at < NOW();

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$;

-- Schedule: every day at midnight UTC
SELECT cron.schedule(
  'expire-overdue-subscriptions',
  '0 0 * * *',
  $$SELECT expire_overdue_subscriptions()$$
);
