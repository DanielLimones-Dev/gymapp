-- Columna plan_cliente para suscripciones de clientes sin coach
ALTER TABLE perfiles
  ADD COLUMN IF NOT EXISTS plan_cliente TEXT DEFAULT 'free'
  CHECK (plan_cliente IN ('free', 'mensual', 'trimestral', 'anual'));
