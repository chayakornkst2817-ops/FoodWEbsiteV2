-- Archive shop metadata without removing orders, accounts or historical payouts.
CREATE TABLE IF NOT EXISTS restaurant_archive (
  id text PRIMARY KEY,
  payload jsonb NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO restaurant_archive(id,payload)
SELECT id,payload FROM restaurant_defaults WHERE id <> 'pa-noi'
ON CONFLICT(id) DO NOTHING;
DELETE FROM restaurant_defaults WHERE id <> 'pa-noi';
UPDATE restaurant_defaults SET payload=jsonb_set(payload,'{name}','"ร้านป้าหน่อย"'::jsonb)
WHERE id='pa-noi' AND payload->>'name' IS DISTINCT FROM 'ร้านป้าหน่อย';
UPDATE app_state SET payload=jsonb_set(payload,'{pa-noi,name}','"ร้านป้าหน่อย"'::jsonb),
revision=revision+1, updated_at=now()
WHERE key='imjai-merchant-catalog' AND payload ? 'pa-noi'
AND payload#>>'{pa-noi,name}' IS DISTINCT FROM 'ร้านป้าหน่อย';
