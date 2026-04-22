import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from './supabase'

export async function guardarPrograma(userId, programa) {
  try {
    await AsyncStorage.setItem(`programa_${userId}`, JSON.stringify(programa))
  } catch (e) {
  }
}

export async function cargarPrograma(userId) {
  try {
    const data = await AsyncStorage.getItem(`programa_${userId}`)
    if (!data) {
      // Primera vez - retornar estructura vacía
      return { programas: [], dias: {} }
    }
    
    const programa = JSON.parse(data)
    
    // MIGRACIÓN AUTOMÁTICA: Estructura antigua → nueva
    if (programa.bloques && !programa.programas) {
      
      // Solo migrar si hay bloques
      const bloquesMigrar = programa.bloques || []
      
      const programaDefault = {
        id: 'prog_default',
        nombre: 'Mi Programa',
        objetivo: 'hipertrofia',
        duracionSemanas: 12,
        estado: 'activo',
        fechaInicio: new Date().toISOString(),
        bloques: bloquesMigrar,
        creado_en: new Date().toISOString()
      }
      
      const programaMigrado = {
        programas: [programaDefault],
        dias: programa.dias || {}
      }
      
      // Guardar nueva estructura
      await AsyncStorage.setItem(`programa_${userId}`, JSON.stringify(programaMigrado))
      
      return programaMigrado
    }
    
    // Si ya tiene la estructura nueva pero programas es undefined/null, inicializarlo
    if (!programa.programas) {
      programa.programas = []
    }
    
    return programa
  } catch (e) {
    // En caso de error, retornar estructura vacía válida
    return { programas: [], dias: {} }
  }
}

export async function sincronizarConSupabase(userId, programa) {
  try {
    // IMPORTANTE: upsert con onConflict especificando la columna única
    const { error } = await supabase
      .from('programas')
      .upsert(
        {
          usuario_id: userId,
          datos: programa,
          actualizado_en: new Date().toISOString()
        },
        { 
          onConflict: 'usuario_id' // ← CLAVE: especificar la columna de conflicto
        }
      )
    
    if (error) {
    }
  } catch (e) {
  }
}

export async function guardarYSincronizar(userId, programa) {
  await guardarPrograma(userId, programa)
  sincronizarConSupabase(userId, programa)
}

// ============================================
// MÉTRICAS CORPORALES
// ============================================
export async function guardarMetrica(userId, metrica) {
  try {
    const key = `metricas_${userId}`
    const data = await AsyncStorage.getItem(key)
    const metricas = data ? JSON.parse(data) : []
    const entrada = { ...metrica }
    if (!entrada.fecha) entrada.fecha = new Date().toISOString()
    metricas.unshift(entrada)
    await AsyncStorage.setItem(key, JSON.stringify(metricas))
  } catch (e) {
  }
}

export async function cargarMetricas(userId) {
  try {
    const data = await AsyncStorage.getItem(`metricas_${userId}`)
    return data ? JSON.parse(data) : []
  } catch (e) {
    return []
  }
}

export async function cargarUltimaMetrica(userId) {
  const metricas = await cargarMetricas(userId)
  return metricas.length > 0 ? metricas[0] : null
}

export async function eliminarMetrica(userId, index) {
  try {
    const key = `metricas_${userId}`
    const data = await AsyncStorage.getItem(key)
    const metricas = data ? JSON.parse(data) : []
    metricas.splice(index, 1)
    await AsyncStorage.setItem(key, JSON.stringify(metricas))
  } catch (e) {
  }
}

// ── Sesión activa ─────────────────────────────────────────────────
export async function iniciarSesion(userId, bloqueId, diaKey) {
  try {
    const key = `sesion_activa_${userId}`
    const sesion = {
      bloqueId,
      diaKey,
      inicio: new Date().toISOString(),
    }
    await AsyncStorage.setItem(key, JSON.stringify(sesion))
    return sesion
  } catch(e) {}
}

export async function obtenerSesionActiva(userId) {
  try {
    const key = `sesion_activa_${userId}`
    const data = await AsyncStorage.getItem(key)
    return data ? JSON.parse(data) : null
  } catch(e) { return null }
}

export async function terminarSesion(userId) {
  try {
    await AsyncStorage.removeItem(`sesion_activa_${userId}`)
  } catch(e) {}
}

export async function registrarSesionHistorial(userId, bloqueId, diaKey, duracionMinutos) {
  try {
    const key = `historial_sesiones_${userId}`
    const data = await AsyncStorage.getItem(key)
    const historial = data ? JSON.parse(data) : []
    historial.unshift({
      bloqueId,
      diaKey,
      fecha: new Date().toISOString(),
      duracion: duracionMinutos,
    })
    // Guardar máximo 90 días
    await AsyncStorage.setItem(key, JSON.stringify(historial.slice(0, 90)))
  } catch(e) {}
}

export async function cargarHistorialSesiones(userId) {
  try {
    const key = `historial_sesiones_${userId}`
    const data = await AsyncStorage.getItem(key)
    return data ? JSON.parse(data) : []
  } catch(e) { return [] }
}

// ── Métricas de salud ─────────────────────────────────────────────
export async function guardarSalud(userId, registro) {
  try {
    const key = `salud_${userId}`
    const data = await AsyncStorage.getItem(key)
    const registros = data ? JSON.parse(data) : []
    const entrada = { ...registro }
    if (!entrada.fecha) entrada.fecha = new Date().toISOString()
    registros.unshift(entrada)
    await AsyncStorage.setItem(key, JSON.stringify(registros.slice(0, 180)))
  } catch(e) {}
}

export async function cargarSalud(userId) {
  try {
    const key = `salud_${userId}`
    const data = await AsyncStorage.getItem(key)
    return data ? JSON.parse(data) : []
  } catch(e) { return [] }
}

export async function eliminarSalud(userId, index) {
  try {
    const key = `salud_${userId}`
    const data = await AsyncStorage.getItem(key)
    const registros = data ? JSON.parse(data) : []
    registros.splice(index, 1)
    await AsyncStorage.setItem(key, JSON.stringify(registros))
  } catch(e) {}
}
