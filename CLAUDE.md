# CLAUDE.md — RepForge (gymapp2)

## Proyecto
- **Nombre:** RepForge
- **Ruta local:** `D:\Escritorio\Daniel\ReactNative\gymapp2`
- **Stack:** React Native (Expo) · Supabase · Claude API · AsyncStorage · Sentry

## Vault de Obsidian
Ruta: `D:\Escritorio\Daniel\NOTAS_DANIEL`

Archivos del proyecto — leer al inicio de cada sesión:
- `Proyectos/gymapp2/gymapp2.md` — nota principal (registro de sesiones)
- `Proyectos/gymapp2/Arquitectura.md` — estructura completa, stack, archivos, Sentry
- `Proyectos/gymapp2/Bugs Corregidos.md` — registro de bugs confirmados (leer para no repetir)
- `Proyectos/gymapp2/Supabase.md` — historial de migraciones aplicadas
- `Proyectos/gymapp2/Sentry Errores.md` — issues activos y resueltos (auto-sync cada hora)

## ⚡ Comportamientos Automáticos

### 1. Cuando el usuario confirma que un fix funciona
Hacer ambas cosas sin que el usuario lo pida:

**A) Añadir entrada en `gymapp2 - Bugs Corregidos.md`**:
```
## ✅ BUG-XXX — Descripción corta
**Fecha:** YYYY-MM-DD
**Archivo:** ruta/al/archivo.jsx
**Síntoma:** Qué veía el usuario
**Causa raíz:** Por qué ocurría
**Fix aplicado:** Código relevante
**Patrón a recordar:** Lección generalizable
```

**B) Añadir línea en el registro de sesión de `gymapp2.md`**:
```
- [x] Fix: descripción breve del fix
```

### 2. Al analizar el codebase o aprender algo nuevo de la arquitectura
Actualizar `gymapp2 - Arquitectura.md` si hay información nueva o incorrecta.

### 3. Al modificar el schema de Supabase
1. Crear migración en `D:\Escritorio\Daniel\NOTAS_DANIEL\supabase\migrations\` (formato `YYYYMMDDHHMMSS_descripcion.sql`)
2. Ejecutar `cd "D:\Escritorio\Daniel\NOTAS_DANIEL" && npx supabase db push`
3. Añadir entrada en `Proyectos/gymapp2/Supabase.md`
4. Actualizar tabla de migraciones en `Proyectos/gymapp2/Arquitectura.md`

### 4. Al inicio de cada sesión
Leer `gymapp2 - Bugs Corregidos.md` y `gymapp2 - Arquitectura.md` para tener contexto completo.

## 🏗️ Arquitectura Resumida

### Tabs cliente (índices fijos — no reordenar)
- 0: Inicio · 1: Rutina · 2: Progreso · 3: IA · 4: Comunidad
- `goToTab(1)` → Rutina

### Tabs coach (índices fijos — no reordenar)
- 0: Inicio · 1: Clientes · 2: Comunidad · 3: Rutina · 4: Progreso
- `goToTab(3)` → Rutina del coach

### rutinasNavigation (singleton en lib/rutinasRef.js)
- `goToTab` lo registra cada dashboard en su `useEffect`
- Effects de hijos corren ANTES que los de padres → el padre puede sobreescribir al hijo
- `setCliente` lo registra `ListaProgramas` en su `useEffect` (lazy mount en stack navigator)
- Usar `pendingCliente` para diferir si `ListaProgramas` aún no montó

## 🔴 Sentry
- **DSN:** `https://b3ca4badda5c72a36d3b7c41826da8ea@o4511081907224576.ingest.us.sentry.io/4511081936650240`
- **Org:** `daniel-developer` · **Proyecto:** `react-native`
- **Credenciales:** `sentry.properties` (en `.gitignore` — no subir a git)
- **Sync automático:** Task Scheduler Windows → `scripts/sync-sentry.js` cada hora
- **Consultar issues:** `npx @sentry/cli issues list --org daniel-developer --project react-native`

## 📋 Normas de Código
- No añadir console.log de debug al código final
- No crear helpers/abstracciones para uso único
- No añadir manejo de errores para escenarios imposibles
- Respuestas concisas, cambios mínimos necesarios
