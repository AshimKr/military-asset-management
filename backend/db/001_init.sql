CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('ADMIN', 'BASE_COMMANDER', 'LOGISTICS_OFFICER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ledger_event_type AS ENUM (
    'OPENING_BALANCE', 'PURCHASE', 'TRANSFER_IN', 'TRANSFER_OUT',
    'ASSIGNMENT', 'EXPENDITURE', 'RETURN'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS bases (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  code VARCHAR(30) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS equipment_types (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  category VARCHAR(80) NOT NULL,
  code VARCHAR(40) NOT NULL UNIQUE,
  unit VARCHAR(30) NOT NULL DEFAULT 'unit',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  email VARCHAR(200) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL,
  base_id BIGINT REFERENCES bases(id),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((role = 'ADMIN') OR (base_id IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS purchases (
  id BIGSERIAL PRIMARY KEY,
  base_id BIGINT NOT NULL REFERENCES bases(id),
  equipment_type_id BIGINT NOT NULL REFERENCES equipment_types(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  purchase_date DATE NOT NULL,
  supplier_reference VARCHAR(160),
  notes TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transfers (
  id BIGSERIAL PRIMARY KEY,
  from_base_id BIGINT NOT NULL REFERENCES bases(id),
  to_base_id BIGINT NOT NULL REFERENCES bases(id),
  equipment_type_id BIGINT NOT NULL REFERENCES equipment_types(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  transferred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (from_base_id <> to_base_id)
);

CREATE TABLE IF NOT EXISTS assignments (
  id BIGSERIAL PRIMARY KEY,
  base_id BIGINT NOT NULL REFERENCES bases(id),
  equipment_type_id BIGINT NOT NULL REFERENCES equipment_types(id),
  personnel_reference VARCHAR(120) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expenditures (
  id BIGSERIAL PRIMARY KEY,
  base_id BIGINT NOT NULL REFERENCES bases(id),
  equipment_type_id BIGINT NOT NULL REFERENCES equipment_types(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  expended_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason VARCHAR(200),
  notes TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_ledger (
  id BIGSERIAL PRIMARY KEY,
  base_id BIGINT NOT NULL REFERENCES bases(id),
  equipment_type_id BIGINT NOT NULL REFERENCES equipment_types(id),
  event_type ledger_event_type NOT NULL,
  quantity_delta INTEGER NOT NULL CHECK (quantity_delta <> 0),
  occurred_at TIMESTAMPTZ NOT NULL,
  reference_table VARCHAR(50),
  reference_id BIGINT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  action VARCHAR(80) NOT NULL,
  entity_type VARCHAR(60) NOT NULL,
  entity_id VARCHAR(80),
  base_id BIGINT REFERENCES bases(id),
  request_id UUID NOT NULL DEFAULT gen_random_uuid(),
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_base_equipment_time
  ON inventory_ledger(base_id, equipment_type_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_purchases_filters
  ON purchases(base_id, equipment_type_id, purchase_date DESC);
CREATE INDEX IF NOT EXISTS idx_transfers_from_time
  ON transfers(from_base_id, transferred_at DESC);
CREATE INDEX IF NOT EXISTS idx_transfers_to_time
  ON transfers(to_base_id, transferred_at DESC);
CREATE INDEX IF NOT EXISTS idx_assignments_filters
  ON assignments(base_id, equipment_type_id, assigned_at DESC);
CREATE INDEX IF NOT EXISTS idx_expenditures_filters
  ON expenditures(base_id, equipment_type_id, expended_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_created_at
  ON audit_logs(created_at DESC);
