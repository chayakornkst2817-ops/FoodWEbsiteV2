-- Only accepted orders receive an idempotency record. Rejected requests reserve nothing.
CREATE TABLE IF NOT EXISTS order_submissions (
 customer_id text NOT NULL,
 request_key uuid NOT NULL,
 request_hash text NOT NULL,
 order_id text NOT NULL UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(customer_id,request_key)
);
