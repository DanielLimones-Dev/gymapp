import { supabase } from './supabase'

export const DEFAULT_PLANES = [
  { key: 'free',    label: 'Free',    precio: 0,     maxClientes: 3,    color: '#8E8E93', descuento: 0 },
  { key: 'starter', label: 'Starter', precio: 9.99,  maxClientes: 10,   color: '#4488ff', descuento: 0 },
  { key: 'pro',     label: 'Pro',     precio: 19.99, maxClientes: 30,   color: '#9933ff', descuento: 0 },
  { key: 'elite',   label: 'Elite',   precio: 39.99, maxClientes: null, color: '#ffaa00', descuento: 0 },
]

export const DEFAULT_PLANES_CLIENTE = [
  { key: 'free',       label: 'Prueba Gratis', precio: 0,     periodo: null,       color: '#8E8E93', descuento: 0, diasTrial: 20 },
  { key: 'mensual',    label: 'Mensual',        precio: 9.99,  periodo: 'mes',      color: '#4488ff', descuento: 0 },
  { key: 'trimestral', label: 'Trimestral',     precio: 24.99, periodo: 'trimestre', color: '#9933ff', descuento: 0 },
  { key: 'anual',      label: 'Anual',          precio: 79.99, periodo: 'a\u00f1o',      color: '#ffaa00', descuento: 0 },
]

export async function cargarPlanesCoach() {
  try {
    const { data } = await supabase
      .from('configuracion_ia')
      .select('valor')
      .eq('clave', 'planes_coach')
      .single()
    if (data?.valor) return JSON.parse(data.valor)
  } catch (e) { console.warn('[planesCoach] cargarPlanesCoach', e) }
  return DEFAULT_PLANES
}

export async function cargarPlanesCliente() {
  try {
    const { data } = await supabase
      .from('configuracion_ia')
      .select('valor')
      .eq('clave', 'planes_cliente')
      .single()
    if (data?.valor) return JSON.parse(data.valor)
  } catch (e) { console.warn('[planesCoach] cargarPlanesCliente', e) }
  return DEFAULT_PLANES_CLIENTE
}

export function planesAMapa(planes) {
  return planes.reduce((acc, p) => { acc[p.key] = p; return acc }, {})
}

// Retorna el precio con descuento aplicado, o null si no hay descuento activo o fuera de vigencia
export function precioConDescuento(plan) {
  if (!plan.descuento || plan.descuento <= 0 || plan.precio === 0) return null
  const now = new Date()
  if (plan.descuentoDesde && new Date(plan.descuentoDesde) > now) return null
  if (plan.descuentoHasta && new Date(plan.descuentoHasta) < now) return null
  return Math.round(plan.precio * (1 - plan.descuento / 100) * 100) / 100
}

export const DIAS_TRIAL = 20

// D\u00edas restantes de prueba (puede ser negativo si ya expir\u00f3)
export function diasTrialRestantes(perfil) {
  if (!perfil?.created_at) return DIAS_TRIAL
  const dias = (Date.now() - new Date(perfil.created_at).getTime()) / (1000 * 60 * 60 * 24)
  return Math.ceil(DIAS_TRIAL - dias)
}

// true si el plan free ya super\u00f3 los DIAS_TRIAL d\u00edas
export function trialExpirado(perfil, campoPlan = 'plan_coach') {
  if (!perfil) return false
  // Superadmins siempre tienen acceso completo
  if (perfil.rol === 'superadmin') return false
  // Clientes con coach asignado no necesitan suscripci\u00f3n propia
  if (campoPlan === 'plan_cliente' && perfil.coach_id) return false
  if ((perfil[campoPlan] || 'free') !== 'free') return false
  return diasTrialRestantes(perfil) < 0
}
