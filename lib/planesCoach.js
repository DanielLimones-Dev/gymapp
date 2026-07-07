import { supabase } from './supabase'

export const DEFAULT_PLANES = [
  { key: 'free',    label: 'Free',    precio: 0,     maxClientes: 3,    color: '#8E8E93', descuento: 0 },
  { key: 'starter', label: 'Starter', precio: 199,  maxClientes: 10,   color: '#4488ff', descuento: 0 },
  { key: 'pro',     label: 'Pro',     precio: 399, maxClientes: 30,   color: '#9933ff', descuento: 0 },
  { key: 'elite',   label: 'Elite',   precio: 799, maxClientes: null, color: '#ffaa00', descuento: 0 },
]

export const DEFAULT_PLANES_CLIENTE = [
  { key: 'free',       label: 'Prueba Gratis', precio: 0,     periodo: null,       color: '#8E8E93', descuento: 0, diasTrial: 20 },
  { key: 'mensual',    label: 'Mensual',        precio: 199,  periodo: 'mes',      color: '#4488ff', descuento: 0 },
  { key: 'trimestral', label: 'Trimestral',     precio: 499, periodo: 'trimestre', color: '#9933ff', descuento: 0 },
  { key: 'anual',      label: 'Anual',          precio: 1599, periodo: 'a\u00f1o',      color: '#ffaa00', descuento: 0 },
]
