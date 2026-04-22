// ── Feature Flags singleton ──────────────────────────────────────
// Cache en memoria. Llama invalidateFlags() tras cada toggle para
// que la próxima lectura fuerce un re-fetch desde Supabase.
import { supabase } from './supabase'

let _cache   = null
let _promise = null

export async function fetchFlags() {
  if (_cache)   return _cache
  if (_promise) return _promise
  _promise = supabase
    .from('feature_flags')
    .select('id, habilitado')
    .then(({ data }) => {
      _cache = {}
      if (data) data.forEach(f => { _cache[f.id] = f.habilitado })
      _promise = null
      return _cache
    })
    .catch(() => {
      _promise = null
      return _cache || {}
    })
  return _promise
}

// Llama esto después de cada toggleFeature en SuperAdmin
export function invalidateFlags() {
  _cache = null
}
