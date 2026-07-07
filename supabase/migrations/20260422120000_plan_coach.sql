-- Agregar columna plan_coach a perfiles
-- Planes: free (3 clientes), starter (10), pro (30), elite (ilimitado)
ALTER TABLE perfiles
  ADD COLUMN IF NOT EXISTS plan_coach TEXT DEFAULT 'free'
  CHECK (plan_coach IN ('free', 'starter', 'pro', 'elite'));
