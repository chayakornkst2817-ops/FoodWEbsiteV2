CREATE TABLE IF NOT EXISTS app_state (
  key text PRIMARY KEY CHECK (key IN ('imjai-demo-v2','imjai-merchant-catalog','imjai-governance-v5')),
  revision bigint NOT NULL CHECK (revision > 0),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS restaurant_defaults (id text PRIMARY KEY, payload jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS uploaded_files (
  id text PRIMARY KEY, name text NOT NULL, mime_type text NOT NULL,
  content bytea NOT NULL CHECK (octet_length(content) <= 5242880),
  sha256 text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);

-- The first database stage preserves the prototype snapshots, with readable views
-- for pgAdmin. These are projections, not an independent second source of truth.
CREATE OR REPLACE VIEW users AS
 SELECT a->>'id' AS id, a->>'name' AS name, a->>'email' AS email, a->>'phone' AS phone
 FROM app_state s CROSS JOIN LATERAL jsonb_array_elements(s.payload->'accounts') a
 WHERE s.key='imjai-demo-v2';
CREATE OR REPLACE VIEW orders AS
 SELECT o->>'id' AS id, o->>'userId' AS user_id, o->>'restaurantId' AS restaurant_id,
 o->>'restaurantName' AS restaurant_name, o->>'status' AS status,
 (o->>'total')::numeric AS total, o->>'pickupDate' AS pickup_date,
 o->>'pickupTime' AS pickup_time, o->>'phone' AS phone, o->>'note' AS note,
 o AS snapshot
 FROM app_state s CROSS JOIN LATERAL jsonb_array_elements(s.payload->'orders') o
 WHERE s.key='imjai-demo-v2';
CREATE OR REPLACE VIEW order_items AS
 SELECT o.id AS order_id, l.ordinality AS line_number, l.value->>'menuId' AS menu_id,
 l.value->>'name' AS name, (l.value->>'price')::numeric AS unit_price,
 (l.value->>'quantity')::integer AS quantity, l.value->'options' AS options
 FROM orders o CROSS JOIN LATERAL jsonb_array_elements(o.snapshot->'lines') WITH ORDINALITY AS l;
CREATE OR REPLACE VIEW chat_messages AS
 SELECT o.id AS order_id, m->>'id' AS id, m->>'role' AS role, m->>'text' AS text,
 m->>'status' AS status, m->>'fileId' AS file_id, m->>'at' AS sent_at
 FROM orders o CROSS JOIN LATERAL jsonb_array_elements(coalesce(o.snapshot->'messages','[]'::jsonb)) m;
CREATE OR REPLACE VIEW refunds AS
 SELECT o.id AS order_id, r->>'id' AS id, (r->>'amount')::numeric AS amount,
 r->>'reason' AS reason, r->>'status' AS status, r->>'proofId' AS proof_id
 FROM orders o CROSS JOIN LATERAL jsonb_array_elements(coalesce(o.snapshot->'refunds','[]'::jsonb)) r;
CREATE OR REPLACE VIEW shop_applications AS
 SELECT a->>'id' AS id, a->>'ownerId' AS owner_id, a->>'name' AS name,
 a->>'status' AS status, a->>'reason' AS reason, a AS snapshot
 FROM app_state s CROSS JOIN LATERAL jsonb_array_elements(s.payload->'applications') a
 WHERE s.key='imjai-governance-v5';
CREATE OR REPLACE VIEW restaurants AS
 WITH base AS (
   SELECT id,payload FROM restaurant_defaults
   UNION ALL SELECT id,snapshot FROM shop_applications a WHERE NOT EXISTS(SELECT 1 FROM restaurant_defaults d WHERE d.id=a.id)
 ), records AS (
   SELECT b.id, b.payload || coalesce((SELECT s.payload->b.id FROM app_state s WHERE s.key='imjai-merchant-catalog'),'{}'::jsonb) AS data FROM base b
 )
 SELECT id, data->>'name' AS name, data->>'phone' AS phone,
 coalesce((data->>'open')::boolean,false)
 AND NOT EXISTS(SELECT 1 FROM shop_applications a WHERE a.id=records.id AND a.status<>'approved')
 AND NOT EXISTS(SELECT 1 FROM app_state g WHERE g.key='imjai-governance-v5' AND g.payload->'suspendedShops' ? records.id)
 AS is_open, data AS configuration FROM records WHERE records.id='pa-noi';
CREATE OR REPLACE VIEW menu_items AS
 SELECT r.id AS restaurant_id, m->>'id' AS id, m->>'name' AS name,
 (m->>'price')::numeric AS price, (m->>'stock')::integer AS daily_stock,
 coalesce((m->>'enabled')::boolean,true) AS enabled, m->'options' AS options
 FROM restaurants r CROSS JOIN LATERAL jsonb_array_elements(coalesce(r.configuration->'menus','[]'::jsonb)) m;
