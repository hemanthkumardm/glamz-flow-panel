-- S M Glamz – full database schema
-- Use CREATE TABLE IF NOT EXISTS to avoid data loss.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users (Staff)
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone       TEXT UNIQUE NOT NULL,
  password    TEXT NOT NULL,        -- bcrypt hash
  full_name   TEXT NOT NULL DEFAULT '',
  role        TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin','staff')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Customers
CREATE TABLE IF NOT EXISTS customers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  phone           TEXT NOT NULL,
  email           TEXT,
  wallet_balance  NUMERIC(12,2) NOT NULL DEFAULT 0,
  plan_id         UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Plans (prepaid membership plans)
CREATE TABLE IF NOT EXISTS plans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  price         NUMERIC(12,2) NOT NULL,
  credit_value  NUMERIC(12,2) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Services (salon service catalog)
CREATE TABLE IF NOT EXISTS services (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code       TEXT,
  name       TEXT NOT NULL,
  price      NUMERIC(12,2) NOT NULL,
  active     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id         UUID REFERENCES customers(id) ON DELETE SET NULL,
  staff_name          TEXT NOT NULL,
  customer_name       TEXT, -- For walk-ins
  customer_phone      TEXT, -- For walk-ins
  subtotal            NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_pct        NUMERIC(5,2)  NOT NULL DEFAULT 0,
  discount_flat       NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
  gst_applied         BOOLEAN       NOT NULL DEFAULT true,
  cgst_amount         NUMERIC(12,2) NOT NULL DEFAULT 0,
  sgst_amount         NUMERIC(12,2) NOT NULL DEFAULT 0,
  total               NUMERIC(12,2) NOT NULL DEFAULT 0,
  cash_amount         NUMERIC(12,2) NOT NULL DEFAULT 0,
  upi_amount          NUMERIC(12,2) NOT NULL DEFAULT 0,
  wallet_amount       NUMERIC(12,2) NOT NULL DEFAULT 0,
  wallet_balance_after NUMERIC(12,2),
  upi_txn_id          TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Handle missing columns if tables already exist
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='customer_name') THEN
    ALTER TABLE transactions ADD COLUMN customer_name TEXT;
  END IF;
END $$;

-- Transaction line items
CREATE TABLE IF NOT EXISTS transaction_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id  UUID REFERENCES transactions(id) ON DELETE CASCADE,
  service_id      UUID REFERENCES services(id) ON DELETE SET NULL,
  service_name    TEXT NOT NULL,
  staff_name      TEXT,
  price           NUMERIC(12,2) NOT NULL,
  quantity        INT  NOT NULL DEFAULT 1
);

-- Store settings
CREATE TABLE IF NOT EXISTS store_settings (
  id                  INT PRIMARY KEY DEFAULT 1,
  business_name       TEXT NOT NULL DEFAULT 'S M Glamz',
  address             TEXT NOT NULL DEFAULT '',
  phone               TEXT NOT NULL DEFAULT '',
  gstin               TEXT NOT NULL DEFAULT '',
  gst_default_on      BOOLEAN NOT NULL DEFAULT true,
  whatsapp_enabled    BOOLEAN NOT NULL DEFAULT false,
  whatsapp_api_key    TEXT,
  whatsapp_phone_number_id TEXT
);

-- Seed default settings row
INSERT INTO store_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- Handle missing columns for WhatsApp
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_settings' AND column_name='whatsapp_enabled') THEN
    ALTER TABLE store_settings ADD COLUMN whatsapp_enabled BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='customer_phone') THEN
    ALTER TABLE transactions ADD COLUMN customer_phone TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transaction_items' AND column_name='staff_name') THEN
    ALTER TABLE transaction_items ADD COLUMN staff_name TEXT;
  END IF;
END $$;
