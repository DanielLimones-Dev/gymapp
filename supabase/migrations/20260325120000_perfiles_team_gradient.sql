-- Añade team_name y tema_gradient al perfil del coach
ALTER TABLE perfiles
  ADD COLUMN IF NOT EXISTS team_name     text,
  ADD COLUMN IF NOT EXISTS tema_gradient text DEFAULT 'midnight';
