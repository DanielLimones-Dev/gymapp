-- Vistas separadas por rol (alternativa ligera a tablas separadas)
CREATE OR REPLACE VIEW vista_clientes AS
  SELECT * FROM perfiles WHERE rol = 'cliente';

CREATE OR REPLACE VIEW vista_coaches AS
  SELECT * FROM perfiles WHERE rol = 'coach';

-- Columnas para el perfil CV del coach
ALTER TABLE perfiles
  ADD COLUMN IF NOT EXISTS especialidad      text,
  ADD COLUMN IF NOT EXISTS bio               text,
  ADD COLUMN IF NOT EXISTS certificaciones   text,
  ADD COLUMN IF NOT EXISTS experiencia_anos  integer;
