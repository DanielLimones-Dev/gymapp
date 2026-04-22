// ============================================
// SUPER ADMIN DASHBOARD v2
// Panel completo de administración global
// ============================================
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Pressable, Animated, TextInput, Alert, Image,
  KeyboardAvoidingView, Platform
} from 'react-native'
import { AntDesign } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../../lib/supabase'
import { invalidateFlags } from '../../lib/featureFlags'
import PagerTabs from '../../components/PagerTabs'
import { LinearGradient } from 'expo-linear-gradient'
import { rutinasNavigation } from '../../lib/rutinasRef'

const IA_MODEL_STORAGE  = '@repforge_ia_model'
const PROVIDERS = {
  anthropic: { label: 'Anthropic',     color: '#cc7700', keyStorage: '@repforge_anthropic_key',  placeholder: 'sk-ant-api03-...' },
  openai:    { label: 'OpenAI',        color: '#00a67e', keyStorage: '@repforge_openai_key',     placeholder: 'sk-proj-...'      },
  google:    { label: 'Google',        color: '#4285f4', keyStorage: '@repforge_google_key',     placeholder: 'AIza...'          },
  moonshot:  { label: 'Moonshot/Kimi', color: '#7c3aed', keyStorage: '@repforge_moonshot_key',  placeholder: 'sk-...'           },
  deepseek:    { label: 'DeepSeek',       color: '#2563eb', keyStorage: '@repforge_deepseek_key',    placeholder: 'sk-...'    },
  huggingface: { label: 'HuggingFace',   color: '#ff9d00', keyStorage: '@repforge_hf_key',          placeholder: 'hf_...'    },
  openrouter:  { label: 'OpenRouter',    color: '#6366f1', keyStorage: '@repforge_openrouter_key',   placeholder: 'sk-or-v1-...' },
  groq:        { label: 'Groq',          color: '#f55036', keyStorage: '@repforge_groq_key',          placeholder: 'gsk_...'      },
}
const IA_MODELS = [
  // Anthropic
  { id: 'claude-sonnet-4-6',          label: 'Claude Sonnet 4.6', desc: 'Último · equilibrio potencia/costo', provider: 'anthropic' },
  { id: 'claude-opus-4-6',            label: 'Claude Opus 4.6',   desc: 'Último · máxima capacidad',          provider: 'anthropic' },
  { id: 'claude-haiku-4-5-20251001',  label: 'Claude Haiku 4.5',  desc: 'Más rápido y económico',             provider: 'anthropic' },
  { id: 'claude-sonnet-4-5-20251001', label: 'Claude Sonnet 4.5', desc: 'Generación anterior',                provider: 'anthropic' },
  // OpenAI
  { id: 'gpt-4o',                     label: 'GPT-4o',             desc: 'Multimodal · alta capacidad',        provider: 'openai'    },
  { id: 'gpt-4o-mini',                label: 'GPT-4o mini',        desc: 'Rápido y económico',                 provider: 'openai'    },
  { id: 'gpt-4.1',                    label: 'GPT-4.1',            desc: 'Última generación OpenAI',           provider: 'openai'    },
  { id: 'o4-mini',                    label: 'o4-mini',            desc: 'Razonamiento avanzado · ligero',     provider: 'openai'    },
  // Google
  { id: 'gemini-2.5-pro',             label: 'Gemini 2.5 Pro',     desc: 'Máxima capacidad Google',            provider: 'google'    },
  { id: 'gemini-2.5-flash',           label: 'Gemini 2.5 Flash',   desc: 'Rápido y eficiente',                 provider: 'google'    },
  { id: 'gemini-2.0-flash',           label: 'Gemini 2.0 Flash',   desc: 'Anterior · estable',                 provider: 'google'    },
  { id: 'gemma-3-27b-it',             label: 'Gemma 3 27B',        desc: 'Open source · multimodal',           provider: 'google'    },
  { id: 'gemma-4-31b-it',             label: 'Gemma 4 31B',        desc: 'Última gen · razonamiento mejorado',  provider: 'google'    },
  // Moonshot / Kimi
  { id: 'kimi-k2',                    label: 'Kimi K2',            desc: 'Agentes · código avanzado',          provider: 'moonshot'  },
  { id: 'moonshot-v1-128k',           label: 'Moonshot 128k',      desc: 'Contexto ultra-largo',               provider: 'moonshot'  },
  // DeepSeek
  { id: 'deepseek-chat',              label: 'DeepSeek V3',           desc: 'Open source · muy eficiente',       provider: 'deepseek'    },
  { id: 'deepseek-reasoner',          label: 'DeepSeek R1',           desc: 'Razonamiento profundo',             provider: 'deepseek'    },
  // HuggingFace (Inference API — formato org/modelo)
  { id: 'google/gemma-3-27b-it',      label: 'Gemma 3 27B',           desc: 'Google · open source · instrucción', provider: 'huggingface' },
  { id: 'google/gemma-4-31B-it',      label: 'Gemma 4 31B',           desc: 'Google · última gen open source',    provider: 'huggingface' },
  { id: 'google/gemma-4-E4B-it',      label: 'Gemma 4 E4B',           desc: 'Google · eficiente · rápido',         provider: 'huggingface' },
  { id: 'meta-llama/Llama-3.3-70B-Instruct', label: 'Llama 3.3 70B', desc: 'Meta · alta capacidad',             provider: 'huggingface' },
  { id: 'meta-llama/Llama-3.1-8B-Instruct',  label: 'Llama 3.1 8B',  desc: 'Meta · rápido y ligero',            provider: 'huggingface' },
  { id: 'mistralai/Mistral-7B-Instruct-v0.3', label: 'Mistral 7B',   desc: 'Mistral · eficiente',               provider: 'huggingface' },
  { id: 'Qwen/Qwen2.5-72B-Instruct',  label: 'Qwen 2.5 72B',          desc: 'Alibaba · multilingüe',             provider: 'huggingface' },
  // OpenRouter
  { id: 'google/gemma-4-26b-a4b-it:free', label: 'Gemma 4 26B (free)',  desc: 'Google · gratis vía OpenRouter',    provider: 'openrouter'  },
  // Groq — inferencia ultrarrápida, free tier generoso
  { id: 'llama-3.3-70b-versatile',        label: 'Llama 3.3 70B',        desc: 'Rápido · gratis · recomendado',      provider: 'groq'        },
  { id: 'llama-3.1-8b-instant',           label: 'Llama 3.1 8B Instant', desc: 'Más rápido · contexto extenso',      provider: 'groq'        },
  { id: 'moonshotai/kimi-k2-instruct',    label: 'Kimi K2 (Groq)',        desc: 'Agentes · código · gratis en Groq',  provider: 'groq'        },
]

// ============================================
// COMPONENTE: ADMIN TAB (Superadmin)
// ============================================
function SuperAdminTab({ userId }) {
  const [seccion, setSeccion] = useState('dashboard')

  // API config state
  const [apiKeys, setApiKeys]       = useState({}) // { anthropic: '...', openai: '...', ... }
  const [apiKeysSaved, setApiKeysSaved] = useState({})
  const [iaModel, setIaModel]       = useState(IA_MODELS[0].id)
  const [customModel, setCustomModel] = useState('')   // modelo personalizado (override)
  const [showKeys, setShowKeys]     = useState({}) // { anthropic: bool, ... }
  const [expandedProvider, setExpandedProvider] = useState(null)
  const [guardandoApi, setGuardandoApi] = useState(false)
  const [testandoApi, setTestandoApi]   = useState(false)
  const [testResult, setTestResult]     = useState(null) // null | 'ok' | 'error'

  // Si hay modelo personalizado, ese es el que se usa; si no, el seleccionado de la lista
  const modeloActivo   = customModel.trim() || iaModel
  const activeProvider = IA_MODELS.find(m => m.id === iaModel)?.provider || 'anthropic'

  useEffect(() => {
    cargarConfigIA()
  }, [])

  async function cargarConfigIA() {
    // 1. Cargar de Supabase (fuente de verdad)
    const { data: rows } = await supabase.from('configuracion_ia').select('clave, valor')
    const remoto = {}
    rows?.forEach(r => { remoto[r.clave] = r.valor })

    const keys = {}
    Object.keys(PROVIDERS).forEach(id => {
      const val = remoto[`ia_key_${id}`]
      if (val) keys[id] = val
    })
    // 2. Fallback a AsyncStorage para keys no guardadas aún en Supabase
    await Promise.all(
      Object.entries(PROVIDERS).map(([id, p]) => {
        if (keys[id]) return Promise.resolve()
        return AsyncStorage.getItem(p.keyStorage).then(k => { if (k) keys[id] = k })
      })
    )
    setApiKeys(keys)
    setApiKeysSaved({ ...keys })
    if (remoto.ia_modelo) {
      const known = IA_MODELS.find(m => m.id === remoto.ia_modelo)
      if (known) { setIaModel(remoto.ia_modelo) }
      else        { setCustomModel(remoto.ia_modelo) }
    }
  }

  async function guardarApiConfig(silent = false) {
    setGuardandoApi(true)
    try {
      const upserts = []
      Object.entries(PROVIDERS).forEach(([id]) => {
        const k = (apiKeys[id] || '').trim()
        if (k) upserts.push({ clave: `ia_key_${id}`, valor: k, actualizado_en: new Date().toISOString() })
      })
      upserts.push({ clave: 'ia_modelo',    valor: modeloActivo,  actualizado_en: new Date().toISOString() })
      upserts.push({ clave: 'ia_proveedor', valor: activeProvider, actualizado_en: new Date().toISOString() })

      const { error } = await supabase.rpc('guardar_config_ia', { p_filas: upserts })
      if (error) throw error

      await Promise.all(
        Object.entries(PROVIDERS).map(([id, p]) => {
          const k = (apiKeys[id] || '').trim()
          return k ? AsyncStorage.setItem(p.keyStorage, k) : Promise.resolve()
        })
      )
      await AsyncStorage.setItem(IA_MODEL_STORAGE, modeloActivo)

      setApiKeysSaved({ ...apiKeys })
      setTestResult(null)
      if (!silent) {
        const modelLabel = IA_MODELS.find(m => m.id === modeloActivo)?.label || modeloActivo
        mostrarToggleToast({ ok: true, texto: 'Configuración guardada', sub: `Modelo: ${modelLabel}`, icon: 'check-circle', color: '#00cc66' })
      }
    } catch (e) {
      if (!silent) {
        mostrarToggleToast({ ok: false, texto: 'Error al guardar', sub: e?.message?.slice(0, 60) || 'Intenta de nuevo', icon: 'exclamationcircle', color: '#ff3355' })
      }
    } finally {
      setGuardandoApi(false)
    }
  }

  async function testearConexion() {
    const key = (apiKeys[activeProvider] || '').trim()
    if (!key) {
      mostrarToggleToast({ ok: false, texto: 'API key requerida', sub: `Agrega la key de ${PROVIDERS[activeProvider].label}`, icon: 'lock', color: PROVIDERS[activeProvider].color })
      return
    }
    setTestandoApi(true)
    setTestResult(null)
    try {
      let res
      if (activeProvider === 'anthropic') {
        res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({ model: modeloActivo, max_tokens: 10, messages: [{ role: 'user', content: 'di hola' }] }),
        })
      } else if (activeProvider === 'google') {
        res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modeloActivo}:generateContent?key=${key}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: 'di hola' }] }], generationConfig: { maxOutputTokens: 10 } }),
        })
      } else {
        const baseUrl = activeProvider === 'openai'        ? 'https://api.openai.com'
                      : activeProvider === 'moonshot'      ? 'https://api.moonshot.cn'
                      : activeProvider === 'huggingface'   ? 'https://router.huggingface.co'
                      : activeProvider === 'openrouter'    ? 'https://openrouter.ai/api'
                      : activeProvider === 'groq'          ? 'https://api.groq.com/openai'
                      :                                      'https://api.deepseek.com'
        res = await fetch(`${baseUrl}/v1/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
          body: JSON.stringify({ model: modeloActivo, max_tokens: 10, messages: [{ role: 'user', content: 'di hola' }] }),
        })
      }

      if (res.ok) {
        setTestResult('ok')
        await guardarApiConfig(true)  // auto-guardar silencioso; el toast lo muestra el test
        mostrarToggleToast({
          ok: true,
          texto: `Conexión exitosa · guardado`,
          sub: IA_MODELS.find(m => m.id === modeloActivo)?.label || modeloActivo,
          icon: 'check-circle',
          color: '#00cc66',
        })
      } else {
        setTestResult('error')
        let body = {}
        try { body = await res.json() } catch {}
        mostrarToggleToast({
          ok: false,
          texto: parsearErrorAPI(res.status, body, activeProvider),
          sub: `HTTP ${res.status} · ${PROVIDERS[activeProvider].label}`,
          icon: 'close-circle',
          color: '#ff3355',
        })
      }
    } catch (e) {
      setTestResult('error')
      mostrarToggleToast({
        ok: false,
        texto: 'Sin conexión a internet',
        sub: e?.message?.slice(0, 60) || 'Verifica tu red',
        icon: 'disconnect',
        color: '#ff3355',
      })
    }
    setTestandoApi(false)
  }

  function parsearErrorAPI(status, body, provider) {
    // Anthropic: { error: { type, message } }
    if (provider === 'anthropic') {
      const tipo = body?.error?.type || ''
      if (status === 401 || tipo === 'authentication_error') return 'API key incorrecta o expirada'
      if (status === 403)                                    return 'Key sin permisos para este modelo'
      if (status === 404 || tipo === 'not_found_error')      return 'Modelo no encontrado — verifica el ID'
      if (status === 429)                                    return 'Límite de peticiones alcanzado'
      if (status === 400)                                    return `Petición inválida · ${body?.error?.message?.slice(0, 50) || ''}`
    }
    // Google: { error: { code, status, message } }
    if (provider === 'google') {
      const st = body?.error?.status || ''
      if (status === 400 || st === 'INVALID_ARGUMENT')  return 'API key inválida o formato incorrecto'
      if (status === 401 || st === 'UNAUTHENTICATED')   return 'API key incorrecta o expirada'
      if (status === 403 || st === 'PERMISSION_DENIED') return 'Key sin acceso a este modelo'
      if (status === 404 || st === 'NOT_FOUND')         return 'Modelo no encontrado — verifica el ID'
      if (status === 429 || st === 'RESOURCE_EXHAUSTED') return 'Cuota agotada — revisa tu plan'
    }
    // HuggingFace: puede devolver { error: string } o { error: { message } } o HTTP 503 (model loading)
    if (provider === 'huggingface') {
      const errMsg = typeof body?.error === 'string' ? body.error : body?.error?.message || ''
      if (status === 401 || status === 403)  return 'Token HuggingFace inválido o sin permisos'
      if (status === 404)                    return 'Modelo no encontrado — verifica el ID'
      if (status === 503)                    return 'Modelo cargando — espera unos segundos e intenta de nuevo'
      if (status === 429)                    return 'Límite de peticiones alcanzado'
      if (errMsg)                            return errMsg.slice(0, 60)
    }
    // OpenAI-compatible (openai, moonshot, deepseek): { error: { code, message } }
    const code = body?.error?.code || ''
    const msg  = body?.error?.message || ''
    if (status === 401 || code === 'invalid_api_key')    return 'API key incorrecta o expirada'
    if (status === 403)                                  return 'Key sin permisos para este modelo'
    if (status === 404 || code === 'model_not_found')    return 'Modelo no encontrado — verifica el ID'
    if (status === 429 || code === 'rate_limit_exceeded') return 'Límite de peticiones alcanzado'
    if (status === 402)                                  return 'Saldo insuficiente — recarga tu cuenta'
    if (msg) return msg.slice(0, 60)
    return `Error inesperado (${status})`
  }

  const [metricas, setMetricas] = useState({
    totalUsuarios: 0, totalCoaches: 0, totalClientes: 0,
    coachesActivos: 0, clientesActivos: 0, promedioClientesPorCoach: 0,
  })
  const [cargandoMetricas, setCargandoMetricas] = useState(true)
  const [coaches, setCoaches] = useState([])
  const [cargandoCoaches, setCargandoCoaches] = useState(true)
  const [expandedCoach, setExpandedCoach] = useState(null)
  const [busquedaCoach, setBusquedaCoach] = useState('')
  const [funciones, setFunciones] = useState([])
  const [cargandoFunciones, setCargandoFunciones] = useState(true)
  const [toggleToast, setToggleToast] = useState(null) // { ok: bool, texto: string }
  const toastAnim    = useRef(new Animated.Value(-420)).current
  const toastOpacity = useRef(new Animated.Value(0)).current

  useEffect(() => { cargarDatos() }, [])

  async function cargarDatos() {
    setCargandoMetricas(true)
    setCargandoCoaches(true)
    setCargandoFunciones(true)

    // Perfiles — sin email (viene de auth.users, no de perfiles)
    const { data: perfiles, error: errPerf } = await supabase
      .from('perfiles')
      .select('id, rol, nombre_completo, avatar_url, coach_id, ultima_sesion, creado_en, plan_coach')

    if (!errPerf && perfiles) {
      const listaCoaches  = perfiles.filter(p => p.rol === 'coach')
      const listaClientes = perfiles.filter(p => p.rol === 'cliente')
      const ahora = Date.now()
      const hace30dias = ahora - (30 * 24 * 60 * 60 * 1000)

      const coachesActivos  = listaCoaches.filter(c => c.ultima_sesion && new Date(c.ultima_sesion).getTime() > hace30dias).length
      const clientesActivos = listaClientes.filter(c => c.ultima_sesion && new Date(c.ultima_sesion).getTime() > hace30dias).length

      const coachesConClientes = listaCoaches.map(c => ({
        ...c,
        clientes:       listaClientes.filter(cli => cli.coach_id === c.id),
        clientesActivos: listaClientes.filter(cli =>
          cli.coach_id === c.id &&
          cli.ultima_sesion &&
          new Date(cli.ultima_sesion).getTime() > hace30dias
        ).length,
      }))

      setMetricas({
        totalUsuarios: perfiles.length,
        totalCoaches:  listaCoaches.length,
        totalClientes: listaClientes.length,
        coachesActivos,
        clientesActivos,
        promedioClientesPorCoach: listaCoaches.length > 0
          ? (listaClientes.filter(c => c.coach_id).length / listaCoaches.length).toFixed(1)
          : 0,
      })
      setCoaches(coachesConClientes.sort((a, b) => b.clientes.length - a.clientes.length))
    }

    // Feature flags
    const { data: flags, error: errFlags } = await supabase.from('feature_flags').select('*').order('id')
    if (!errFlags && flags) setFunciones(flags)

    setCargandoMetricas(false)
    setCargandoCoaches(false)
    setCargandoFunciones(false)
  }

  const PLANES_COACH = {
    free:    { label: 'Free',    maxClientes: 3,    color: '#8E8E93' },
    starter: { label: 'Starter', maxClientes: 10,   color: '#4488ff' },
    pro:     { label: 'Pro',     maxClientes: 30,   color: '#9933ff' },
    elite:   { label: 'Elite',   maxClientes: null, color: '#ffaa00' },
  }

  async function cambiarPlanCoach(coachId, plan) {
    const { error } = await supabase.from('perfiles').update({ plan_coach: plan }).eq('id', coachId)
    if (!error) {
      setCoaches(prev => prev.map(c => c.id === coachId ? { ...c, plan_coach: plan } : c))
      mostrarToggleToast({ ok: true, texto: `Plan actualizado a ${PLANES_COACH[plan].label}` })
    } else {
      mostrarToggleToast({ ok: false, texto: 'Error al actualizar plan' })
    }
  }

  async function toggleFeature(flagId, valorActual) {
    const nuevoValor = !valorActual
    setFunciones(prev => prev.map(f => f.id === flagId ? { ...f, habilitado: nuevoValor } : f))
    const { error } = await supabase.from('feature_flags').update({ habilitado: nuevoValor }).eq('id', flagId)
    if (error) {
      setFunciones(prev => prev.map(f => f.id === flagId ? { ...f, habilitado: valorActual } : f))
      mostrarToggleToast({ ok: false, texto: `Error al actualizar "${flagId}"` })
    } else {
      invalidateFlags()
      mostrarToggleToast({ ok: true, texto: nuevoValor ? `"${flagId}" activada` : `"${flagId}" desactivada` })
    }
  }

  function mostrarToggleToast({ ok, texto, sub, icon, color }) {
    setToggleToast({ ok, texto, sub, icon, color })
    toastAnim.setValue(0)
    toastOpacity.setValue(0)
    Animated.parallel([
      Animated.spring(toastAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 12 }),
      Animated.timing(toastOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start()
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(toastAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
        Animated.timing(toastOpacity, { toValue: 0, duration: 280, useNativeDriver: true }),
      ]).start(() => setToggleToast(null))
    }, 2800)
  }

  async function eliminarCoach(coach) {
    Alert.alert(
      'Eliminar Coach',
      `¿Eliminar a ${coach.nombre_completo}?\n\nSus clientes quedarán sin coach.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: async () => {
          await supabase.from('perfiles').update({ coach_id: null }).eq('coach_id', coach.id)
          await supabase.from('perfiles').delete().eq('id', coach.id)
          cargarDatos()
        }}
      ]
    )
  }

  function renderDashboard() {
    if (cargandoMetricas) return <ActivityIndicator color="#ff3355" style={{ marginTop: 40 }} />
    return (
      <View style={{ gap: 16 }}>
        <View style={styles.metricasGrid}>
          <MetricCard label="Total Usuarios"   value={metricas.totalUsuarios}            icon="team"     color="#4488ff" subtitle={`${metricas.totalCoaches} coaches · ${metricas.totalClientes} clientes`} />
          <MetricCard label="Coaches Activos"  value={metricas.coachesActivos}           icon="user"     color="#00cc44" subtitle={`de ${metricas.totalCoaches} totales`}  progress={metricas.totalCoaches  > 0 ? metricas.coachesActivos  / metricas.totalCoaches  : 0} />
          <MetricCard label="Clientes Activos" value={metricas.clientesActivos}          icon="user"     color="#ff6600" subtitle={`de ${metricas.totalClientes} totales`}  progress={metricas.totalClientes > 0 ? metricas.clientesActivos / metricas.totalClientes : 0} />
          <MetricCard label="Promedio"          value={metricas.promedioClientesPorCoach} icon="bars"     color="#9933ff" subtitle="clientes por coach" />
        </View>


        <View style={styles.topCoachesCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <Text style={styles.topCoachesTitle}>Top Coaches</Text>
            <TouchableOpacity onPress={() => setSeccion('coaches')}>
              <Text style={styles.verTodosBtn}>Ver todos →</Text>
            </TouchableOpacity>
          </View>
          {coaches.slice(0, 5).map((coach, index) => (
            <View key={coach.id} style={styles.topCoachRow}>
              <View style={styles.topCoachRank}><Text style={styles.topCoachRankNum}>#{index + 1}</Text></View>
              <View style={styles.topCoachAvatar}>
                {coach.avatar_url
                  ? <Image source={{ uri: coach.avatar_url }} style={{ width: 36, height: 36, borderRadius: 10 }} />
                  : <Text style={styles.topCoachAvatarTxt}>{coach.nombre_completo?.[0] || '?'}</Text>
                }
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.topCoachNombre}>{coach.nombre_completo || 'Sin nombre'}</Text>
                {coach.clientesActivos > 0 && (
                  <Text style={{ color: '#00cc44', fontSize: 9, fontWeight: '700' }}>{coach.clientesActivos} activos este mes</Text>
                )}
              </View>
              <View style={styles.topCoachBadge}>
                <Text style={styles.topCoachBadgeNum}>{coach.clientes.length}</Text>
                <Text style={styles.topCoachBadgeLabel}>clientes</Text>
              </View>
            </View>
          ))}
          {coaches.length === 0 && (
            <Text style={{ color: '#2a4488', textAlign: 'center', paddingVertical: 20 }}>No hay coaches registrados</Text>
          )}
        </View>
      </View>
    )
  }

  function renderCoaches() {
    if (cargandoCoaches) return <ActivityIndicator color="#ff3355" style={{ marginTop: 40 }} />

    const coachesFiltrados = coaches.filter(c =>
      c.nombre_completo?.toLowerCase().includes(busquedaCoach.toLowerCase())
    )

    return (
      <View style={{ gap: 14 }}>
        <View style={styles.searchBox}>
          <AntDesign name="search" size={16} color="#2a4488" style={{ marginRight: 10 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar coach por nombre..."
            placeholderTextColor="#2a4488"
            value={busquedaCoach}
            onChangeText={setBusquedaCoach}
          />
          {busquedaCoach.length > 0 && (
            <TouchableOpacity onPress={() => setBusquedaCoach('')}>
              <AntDesign name="close" size={16} color="#2a4488" />
            </TouchableOpacity>
          )}
        </View>

        {coachesFiltrados.map(c => {
          const isExpanded = expandedCoach === c.id
          return (
            <View key={c.id} style={[styles.coachCard, isExpanded && styles.coachCardExpanded]}>
              <Pressable style={styles.coachHeader} onPress={() => setExpandedCoach(isExpanded ? null : c.id)}>
                <View style={styles.coachAvatar}>
                  {c.avatar_url
                    ? <Image source={{ uri: c.avatar_url }} style={{ width: 44, height: 44, borderRadius: 14 }} />
                    : <Text style={styles.coachAvatarTxt}>{c.nombre_completo?.[0] || '?'}</Text>
                  }
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.coachNombre}>{c.nombre_completo || 'Sin nombre'}</Text>
                  {c.clientesActivos > 0 && (
                    <Text style={styles.coachActivosBadge}>{c.clientesActivos} activos · {c.clientes.length} total</Text>
                  )}
                </View>
                <View style={styles.coachCountBadge}>
                  <Text style={styles.coachCountNum}>{c.clientes.length}</Text>
                  <Text style={styles.coachCountLabel}>clientes</Text>
                </View>
                <AntDesign name={isExpanded ? 'up' : 'down'} size={16} color="#4488ff" style={{ marginLeft: 6 }} />
              </Pressable>

              {isExpanded && (
                <View style={styles.coachDetails}>
                  {/* SELECTOR DE PLAN */}
                  <View style={{ marginBottom: 14 }}>
                    <Text style={[styles.clientesListTitle, { marginBottom: 8 }]}>Plan de suscripción:</Text>
                    <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                      {Object.entries(PLANES_COACH).map(([key, plan]) => {
                        const activo = (c.plan_coach || 'free') === key
                        return (
                          <TouchableOpacity
                            key={key}
                            onPress={() => cambiarPlanCoach(c.id, key)}
                            style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1.5, borderColor: activo ? plan.color : '#2a2a4a', backgroundColor: activo ? plan.color + '22' : 'transparent' }}
                          >
                            <Text style={{ color: activo ? plan.color : '#5a5a8a', fontSize: 11, fontWeight: '800' }}>
                              {plan.label}{plan.maxClientes ? ` · ${plan.maxClientes}` : ' · ∞'}
                            </Text>
                          </TouchableOpacity>
                        )
                      })}
                    </View>
                    <Text style={{ color: '#3a3a6a', fontSize: 10, marginTop: 6 }}>
                      {c.clientes.length} / {PLANES_COACH[c.plan_coach || 'free'].maxClientes ?? '∞'} clientes usados
                    </Text>
                  </View>
                  <View style={styles.coachActions}>
                    <TouchableOpacity style={styles.coachActionBtn} onPress={() => eliminarCoach(c)}>
                      <AntDesign name="delete" size={14} color="#ff4444" />
                      <Text style={[styles.coachActionBtnText, { color: '#ff4444' }]}>Eliminar coach</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.clientesListTitle}>
                    {c.clientes.length === 0 ? 'Sin clientes' : `${c.clientes.length} clientes:`}
                  </Text>
                  {c.clientes.length === 0 ? (
                    <Text style={styles.clientesEmpty}>Este coach no tiene clientes.</Text>
                  ) : (
                    c.clientes.map(cli => {
                      const hace30dias = Date.now() - (30 * 24 * 60 * 60 * 1000)
                      const esActivo   = cli.ultima_sesion && new Date(cli.ultima_sesion).getTime() > hace30dias
                      return (
                        <View key={cli.id} style={styles.clienteItem}>
                          <View style={styles.clienteAvatarMini}>
                            <Text style={styles.clienteAvatarMiniTxt}>{cli.nombre_completo?.[0] || '?'}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.clienteNombre}>{cli.nombre_completo || 'Sin nombre'}</Text>
                          </View>
                          {esActivo && (
                            <View style={styles.clienteActivoBadge}>
                              <View style={styles.clienteActivoDot} />
                              <Text style={styles.clienteActivoText}>Activo</Text>
                            </View>
                          )}
                        </View>
                      )
                    })
                  )}
                </View>
              )}
            </View>
          )
        })}

        {coachesFiltrados.length === 0 && (
          <Text style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: 30 }}>
            {busquedaCoach ? 'No se encontraron coaches' : 'No hay coaches en la plataforma.'}
          </Text>
        )}
      </View>
    )
  }

  function renderFunciones() {
    if (cargandoFunciones) return <ActivityIndicator color="#ff3355" style={{ marginTop: 40 }} />
    return (
      <View style={{ gap: 12 }}>
        <Text style={styles.funcionesHeader}>Control de funcionalidades de la aplicación</Text>
        {funciones.map(f => (
          <View key={f.id} style={styles.featureCard}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Text style={styles.featureNombre}>{f.nombre}</Text>
              <Text style={styles.featureDesc}>{f.descripcion}</Text>
              <Text style={styles.featureId}>ID: {f.id}</Text>
              {f.actualizado_en && (
                <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9, marginTop: 2 }}>
                  Actualizado: {new Date(f.actualizado_en).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </Text>
              )}
            </View>
            <Pressable
              style={[styles.switchTrack, f.habilitado && styles.switchTrackOn]}
              onPress={() => toggleFeature(f.id, f.habilitado)}
            >
              <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 2 }}>
                <View style={[styles.switchThumb, f.habilitado && styles.switchThumbOn]} />
              </View>
            </Pressable>
          </View>
        ))}
        {funciones.length === 0 && (
          <View style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 18, padding: 24, alignItems: 'center', gap: 10 }}>
            <AntDesign name="setting" size={36} color="rgba(255,255,255,0.15)" />
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '900' }}>Sin feature flags</Text>
            <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, textAlign: 'center', lineHeight: 18 }}>
              Ejecuta el SQL de feature_flags en Supabase para activar esta sección.
            </Text>
          </View>
        )}
      </View>
    )
  }

  function renderAPI() {
    const prov = PROVIDERS[activeProvider]
    const activeKey = apiKeys[activeProvider] || ''
    const activeSaved = apiKeysSaved[activeProvider] || ''
    const configuredCount = Object.entries(PROVIDERS).filter(([id]) => (apiKeys[id] || apiKeysSaved[id] || '').length > 0).length

    // Agrupar modelos por proveedor
    const groups = Object.entries(PROVIDERS).map(([id, p]) => ({
      id, ...p, models: IA_MODELS.filter(m => m.provider === id),
    }))

    return (
      <View style={{ gap: 16 }}>

        {/* Estado global */}
        <View style={styles.apiStatusCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={[styles.apiStatusDot, { backgroundColor: configuredCount > 0 ? '#00cc44' : '#ff3355' }]} />
            <Text style={styles.apiStatusText}>
              {configuredCount > 0 ? `${configuredCount} proveedor${configuredCount > 1 ? 'es' : ''} configurado${configuredCount > 1 ? 's' : ''}` : 'Sin API keys — IA deshabilitada'}
            </Text>
          </View>
          {configuredCount > 0 && (
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              {Object.entries(PROVIDERS).map(([id, p]) => (apiKeys[id] || apiKeysSaved[id] || '').length > 0 && (
                <View key={id} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: p.color + '18', borderWidth: 1, borderColor: p.color + '44', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                  <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: p.color }} />
                  <Text style={{ color: p.color, fontSize: 10, fontWeight: '800' }}>{p.label}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Modelo activo + proveedor */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: prov.color + '12', borderWidth: 1, borderColor: prov.color + '40', borderRadius: 14, padding: 14 }}>
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: prov.color + '22', borderWidth: 1, borderColor: prov.color + '44', justifyContent: 'center', alignItems: 'center' }}>
            <AntDesign name="api" size={16} color={prov.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>
              {IA_MODELS.find(m => m.id === modeloActivo)?.label || modeloActivo}
            </Text>
            {customModel.trim() !== '' && (
              <Text style={{ color: prov.color, fontSize: 9, fontWeight: '700', marginTop: 1 }}>PERSONALIZADO</Text>
            )}
            <Text style={{ color: prov.color, fontSize: 10, fontWeight: '700', marginTop: 1 }}>{prov.label}</Text>
          </View>
          {activeSaved && (
            <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>••••{activeSaved.slice(-4)}</Text>
          )}
        </View>

        {/* API Key del proveedor activo */}
        <Text style={styles.apiSectionLabel}>{prov.label.toUpperCase()} API KEY</Text>
        <View style={[styles.apiInputWrap, { flexDirection: 'row', alignItems: 'center' }]}>
          <TextInput
            style={[styles.apiInput, { flex: 1 }]}
            placeholder={prov.placeholder}
            placeholderTextColor="rgba(255,255,255,0.2)"
            value={activeKey}
            onChangeText={v => setApiKeys(prev => ({ ...prev, [activeProvider]: v }))}
            secureTextEntry={!showKeys[activeProvider]}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            onPress={() => setShowKeys(prev => ({ ...prev, [activeProvider]: !prev[activeProvider] }))}
            style={{ paddingHorizontal: 14 }}
          >
            <AntDesign name={showKeys[activeProvider] ? 'eye' : 'eye-invisible'} size={18} color="rgba(255,255,255,0.3)" />
          </TouchableOpacity>
        </View>

        {/* Modelos agrupados por proveedor — select compacto */}
        <Text style={styles.apiSectionLabel}>MODELO</Text>
        {groups.map(g => {
          const selectedInGroup = g.models.find(m => m.id === iaModel)
          const isOpen = expandedProvider === g.id
          return (
            <View key={g.id}>
              {/* Cabecera / selector */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setExpandedProvider(isOpen ? null : g.id)}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 10,
                  backgroundColor: selectedInGroup ? g.color + '12' : 'rgba(255,255,255,0.04)',
                  borderWidth: 1,
                  borderColor: selectedInGroup ? g.color + '55' : 'rgba(255,255,255,0.08)',
                  borderRadius: 12, borderBottomLeftRadius: isOpen ? 0 : 12, borderBottomRightRadius: isOpen ? 0 : 12,
                  padding: 12,
                }}
              >
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: g.color }} />
                <Text style={{ color: g.color, fontSize: 10, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase', width: 80 }}>{g.label}</Text>
                <View style={{ flex: 1 }}>
                  {selectedInGroup
                    ? <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{selectedInGroup.label}</Text>
                    : <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>Sin seleccionar</Text>
                  }
                </View>
                <AntDesign name={isOpen ? 'up' : 'down'} size={12} color="rgba(255,255,255,0.3)" />
              </TouchableOpacity>

              {/* Dropdown */}
              {isOpen && (
                <View style={{ borderWidth: 1, borderTopWidth: 0, borderColor: g.color + '55', borderBottomLeftRadius: 12, borderBottomRightRadius: 12, overflow: 'hidden' }}>
                  {g.models.map((m, idx) => (
                    <TouchableOpacity
                      key={m.id}
                      activeOpacity={0.7}
                      onPress={() => { setIaModel(m.id); setTestResult(null); setExpandedProvider(null) }}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 10,
                        padding: 12, paddingLeft: 14,
                        backgroundColor: iaModel === m.id ? g.color + '18' : 'rgba(255,255,255,0.03)',
                        borderTopWidth: idx > 0 ? 1 : 0,
                        borderTopColor: 'rgba(255,255,255,0.05)',
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: iaModel === m.id ? g.color : '#fff', fontSize: 13, fontWeight: iaModel === m.id ? '800' : '500' }}>{m.label}</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 1 }}>{m.desc}</Text>
                      </View>
                      {iaModel === m.id && <AntDesign name="check-circle" size={15} color={g.color} />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )
        })}

        {/* Modelo personalizado */}
        <View style={{ gap: 6 }}>
          <Text style={styles.apiSectionLabel}>MODELO PERSONALIZADO (OPCIONAL)</Text>
          <View style={[styles.apiInputWrap, { flexDirection: 'row', alignItems: 'center',
            borderColor: customModel.trim() ? prov.color + '66' : 'rgba(255,255,255,0.08)' }]}>
            <TextInput
              style={[styles.apiInput, { flex: 1 }]}
              placeholder={`ej. gemma-4-31b-it, gpt-4.5-preview…`}
              placeholderTextColor="rgba(255,255,255,0.2)"
              value={customModel}
              onChangeText={v => setCustomModel(v)}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {customModel.trim() !== '' && (
              <TouchableOpacity onPress={() => setCustomModel('')} style={{ paddingHorizontal: 14 }}>
                <AntDesign name="close" size={15} color="rgba(255,255,255,0.3)" />
              </TouchableOpacity>
            )}
          </View>
          {customModel.trim() !== '' && (
            <Text style={{ color: prov.color, fontSize: 10, fontWeight: '700', marginTop: 2 }}>
              ✓ Usando modelo personalizado · anula la selección de la lista
            </Text>
          )}
        </View>

        {/* Botones */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
          <TouchableOpacity
            style={[styles.apiBtn, { flex: 1, borderColor: 'rgba(255,51,85,0.3)' }]}
            onPress={() => guardarApiConfig(false)}
            disabled={guardandoApi}
          >
            {guardandoApi
              ? <ActivityIndicator size={16} color="#ff3355" />
              : <><AntDesign name="save" size={15} color="#ff3355" /><Text style={styles.apiBtnText}>Guardar todo</Text></>
            }
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.apiBtn, { flex: 1, borderColor: prov.color + '55' }]}
            onPress={testearConexion}
            disabled={testandoApi}
          >
            {testandoApi
              ? <ActivityIndicator size={16} color={prov.color} />
              : <><AntDesign name="api" size={15} color={prov.color} /><Text style={[styles.apiBtnText, { color: prov.color }]}>Probar</Text></>
            }
          </TouchableOpacity>
        </View>

        {testResult && (
          <View style={[styles.testResultCard, { borderColor: testResult === 'ok' ? 'rgba(0,204,68,0.3)' : 'rgba(255,51,85,0.3)' }]}>
            <AntDesign name={testResult === 'ok' ? 'check-circle' : 'close-circle'} size={18} color={testResult === 'ok' ? '#00cc44' : '#ff3355'} />
            <Text style={{ color: testResult === 'ok' ? '#00cc44' : '#ff3355', fontWeight: '700', fontSize: 13 }}>
              {testResult === 'ok' ? `Conexión ${prov.label} exitosa ✓` : `Error — verifica la key de ${prov.label}`}
            </Text>
          </View>
        )}
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.rfRow}>
          <Text style={styles.rfR}>SUPER </Text>
          <Text style={styles.rfF}>ADMIN</Text>
        </View>
        <Text style={styles.headerSub}>PANEL DE CONTROL GLOBAL</Text>
      </View>

      <View style={styles.selectorRow}>
        {[
          { key: 'dashboard', label: 'Inicio',    icon: 'dashboard' },
          { key: 'coaches',   label: 'Coaches',   icon: 'team'      },
          { key: 'funciones', label: 'Features',  icon: 'setting'   },
          { key: 'api',       label: 'API IA',    icon: 'api'       },
        ].map(s => (
          <Pressable
            key={s.key}
            style={[styles.selectorBtn, seccion === s.key && styles.selectorBtnActivo]}
            onPress={() => setSeccion(s.key)}
          >
            <AntDesign name={s.icon} size={14} color={seccion === s.key ? '#ff3355' : '#8E8E93'} />
            <Text style={[styles.selectorTxt, seccion === s.key && styles.selectorTxtActivo]}>{s.label}</Text>
          </Pressable>
        ))}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 150 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {seccion === 'dashboard' && renderDashboard()}
          {seccion === 'coaches'   && renderCoaches()}
          {seccion === 'funciones' && renderFunciones()}
          {seccion === 'api'       && renderAPI()}
        </ScrollView>
      </KeyboardAvoidingView>

      {toggleToast && (() => {
        const tc = toggleToast.color || (toggleToast.ok ? '#00cc66' : '#e63560')
        const ti = toggleToast.icon  || (toggleToast.ok ? 'check-circle' : 'close-circle')
        return (
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute', bottom: 100, left: 20, right: 20, zIndex: 99999,
              opacity: toastOpacity,
              transform: [{ scale: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }],
            }}
          >
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 12,
              paddingHorizontal: 16, paddingVertical: 13, borderRadius: 18,
              backgroundColor: 'rgba(6,6,18,0.97)',
              borderWidth: 1, borderColor: tc + '44',
              shadowColor: tc, shadowOpacity: 0.3, shadowRadius: 16,
              shadowOffset: { width: 0, height: 6 }, elevation: 18,
            }}>
              {/* Icono con fondo */}
              <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: tc + '18', borderWidth: 1, borderColor: tc + '44', justifyContent: 'center', alignItems: 'center' }}>
                <AntDesign name={ti} size={16} color={tc} />
              </View>
              {/* Textos */}
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13, letterSpacing: -0.2 }}>{toggleToast.texto}</Text>
                {toggleToast.sub && <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, marginTop: 2 }}>{toggleToast.sub}</Text>}
              </View>
              {/* Dot de color */}
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: tc }} />
            </View>
          </Animated.View>
        )
      })()}
    </View>
  )
}

function MetricCard({ label, value, icon, color, subtitle, progress }) {
  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricIcon, { backgroundColor: color + '15', borderColor: color + '33' }]}>
        <AntDesign name={icon} size={20} color={color} />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
      {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
      {progress !== undefined && (
        <View style={styles.metricProgressBar}>
          <View style={[styles.metricProgressFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: color }]} />
        </View>
      )}
    </View>
  )
}

const ACC = '#e63560'   // acento principal — crimson premium
const ACC2 = '#ff6b8a'  // acento claro

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent', padding: 20, paddingTop: 56 },
  header: { marginBottom: 20 },
  rfRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 4 },
  rfR: { fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  rfF: { fontSize: 26, fontWeight: '900', color: ACC, letterSpacing: 1 },
  headerSub: { color: ACC2, fontSize: 9, letterSpacing: 3, fontWeight: '800', opacity: 0.8 },

  selectorRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 4, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', gap: 3 },
  selectorBtn: { flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 9, borderRadius: 10 },
  selectorBtnActivo: { backgroundColor: 'rgba(230,53,96,0.15)', borderWidth: 1, borderColor: 'rgba(230,53,96,0.35)' },
  selectorTxt: { color: '#8E8E93', fontWeight: '700', fontSize: 10 },
  selectorTxtActivo: { color: ACC2, fontWeight: '900' },

  metricasGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metricCard: { width: '48%', backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 20, padding: 18, alignItems: 'center' },
  metricIcon: { width: 46, height: 46, borderRadius: 14, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  metricValue: { fontSize: 32, fontWeight: '900', color: '#fff', marginBottom: 4 },
  metricLabel: { fontSize: 10, fontWeight: '800', color: '#8E8E93', letterSpacing: 1, textAlign: 'center', textTransform: 'uppercase' },
  metricSubtitle: { fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 4, textAlign: 'center' },
  metricProgressBar: { width: '100%', height: 3, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, marginTop: 10, overflow: 'hidden' },
  metricProgressFill: { height: '100%', borderRadius: 2 },

  soonBadge: { position: 'absolute', top: -6, right: -6, backgroundColor: '#ff6600', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  soonText: { fontSize: 7, fontWeight: '900', color: '#fff' },

  topCoachesCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 20, padding: 18 },
  topCoachesTitle: { fontSize: 14, fontWeight: '900', color: '#fff', letterSpacing: 0.3 },
  verTodosBtn: { fontSize: 12, fontWeight: '700', color: ACC },
  topCoachRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  topCoachRank: { width: 30, height: 30, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  topCoachRankNum: { fontSize: 11, fontWeight: '900', color: 'rgba(255,255,255,0.3)' },
  topCoachAvatar: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(230,53,96,0.1)', borderWidth: 1.5, borderColor: 'rgba(230,53,96,0.3)', justifyContent: 'center', alignItems: 'center', marginRight: 10, overflow: 'hidden' },
  topCoachAvatarTxt: { color: ACC, fontWeight: '900', fontSize: 14 },
  topCoachNombre: { color: '#fff', fontSize: 13, fontWeight: '800', marginBottom: 2 },
  topCoachBadge: { alignItems: 'center', backgroundColor: 'rgba(230,53,96,0.1)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(230,53,96,0.25)' },
  topCoachBadgeNum: { color: ACC, fontSize: 15, fontWeight: '900' },
  topCoachBadgeLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 8, fontWeight: '800' },

  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13 },
  searchInput: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '500' },

  coachCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 18, overflow: 'hidden' },
  coachCardExpanded: { borderColor: 'rgba(230,53,96,0.35)' },
  coachHeader: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  coachAvatar: { width: 46, height: 46, borderRadius: 14, backgroundColor: 'rgba(230,53,96,0.1)', borderWidth: 1.5, borderColor: 'rgba(230,53,96,0.35)', justifyContent: 'center', alignItems: 'center', marginRight: 12, overflow: 'hidden' },
  coachAvatarTxt: { color: ACC, fontWeight: '900', fontSize: 17 },
  coachNombre: { color: '#fff', fontSize: 15, fontWeight: '800', marginBottom: 3 },
  coachActivosBadge: { color: '#00cc44', fontSize: 10, fontWeight: '700' },
  coachCountBadge: { alignItems: 'center', backgroundColor: 'rgba(230,53,96,0.1)', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(230,53,96,0.25)' },
  coachCountNum: { color: ACC, fontSize: 18, fontWeight: '900' },
  coachCountLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 9, fontWeight: '800' },
  coachDetails: { padding: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', backgroundColor: 'rgba(0,0,0,0.25)' },
  coachActions: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  coachActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(255,68,68,0.2)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  coachActionBtnText: { fontSize: 12, fontWeight: '700' },

  clientesListTitle: { color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 12, textTransform: 'uppercase' },
  clientesEmpty: { color: 'rgba(255,255,255,0.3)', fontSize: 12, fontStyle: 'italic', paddingVertical: 8 },
  clienteItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 12, marginBottom: 8 },
  clienteAvatarMini: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(153,51,255,0.1)', borderWidth: 1, borderColor: 'rgba(153,51,255,0.25)', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  clienteAvatarMiniTxt: { color: '#b066ff', fontWeight: '900', fontSize: 13 },
  clienteNombre: { color: '#fff', fontSize: 13, fontWeight: '600' },
  clienteActivoBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,204,68,0.08)', borderWidth: 1, borderColor: 'rgba(0,204,68,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  clienteActivoDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00cc44' },
  clienteActivoText: { fontSize: 9, fontWeight: '800', color: '#00cc44' },

  funcionesHeader: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '600', marginBottom: 4, lineHeight: 18 },
  featureCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 18, padding: 18 },
  featureNombre: { color: '#fff', fontSize: 15, fontWeight: '900', marginBottom: 4 },
  featureDesc: { color: 'rgba(255,255,255,0.45)', fontSize: 12, lineHeight: 18, marginBottom: 8 },
  featureId: { color: ACC, fontSize: 9, fontWeight: '900', backgroundColor: 'rgba(230,53,96,0.1)', alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  switchTrack: { width: 50, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  switchTrackOn: { backgroundColor: ACC, borderColor: 'rgba(230,53,96,0.6)' },
  switchThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.25)' },
  switchThumbOn: { backgroundColor: '#fff', transform: [{ translateX: 22 }] },

  // API section
  apiStatusCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 18, padding: 16, gap: 6 },
  apiStatusDot: { width: 8, height: 8, borderRadius: 4 },
  apiStatusText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  apiKeyPreview: { color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 2 },
  apiSectionLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 9, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase' },
  apiInputWrap: { backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 16 },
  apiInput: { color: '#fff', paddingHorizontal: 16, paddingVertical: 14, fontSize: 14, fontWeight: '500' },
  modelCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 14 },
  modelCardActive: { borderColor: 'rgba(230,53,96,0.4)', backgroundColor: 'rgba(230,53,96,0.07)' },
  modelLabel: { color: '#fff', fontWeight: '800', fontSize: 14, marginBottom: 2 },
  modelDesc: { color: 'rgba(255,255,255,0.4)', fontSize: 11 },
  apiBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderRadius: 14, paddingVertical: 14 },
  apiBtnText: { color: ACC, fontWeight: '700', fontSize: 14 },
  testResultCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderRadius: 14, padding: 14 },
})

// ============================================
// SUPER ADMIN DASHBOARD ROOT
// ============================================
export default function SuperAdminDashboard({ userId, onVolver, InicioScreen, RutinasTab, ProgresoScreen, ComunidadTab }) {
  const tabSwitcherRef = useRef(null)

  useEffect(() => {
    rutinasNavigation.goToTab = (i) => {
      const trySwitch = (attempts = 0) => {
        if (tabSwitcherRef.current) { tabSwitcherRef.current(i) }
        else if (attempts < 8) { setTimeout(() => trySwitch(attempts + 1), 60) }
      }
      trySwitch()
    }
    return () => { rutinasNavigation.goToTab = null }
  }, [])

  return (
    <LinearGradient colors={['#0a0a2e', '#050518', '#0d0d25']} style={{ flex: 1 }}>
      <PagerTabs
        switcherRef={tabSwitcherRef}
        tabs={[
          { name: 'Inicio',    icon: 'home',     component: InicioScreen },
          { name: 'Rutina',    icon: 'calendar', component: RutinasTab,
            onReselect: () => { rutinasNavigation.reset?.() }
          },
          { name: 'Progreso',  icon: 'bars',     component: ProgresoScreen },
          { name: 'Comunidad', icon: 'message',  component: ComunidadTab },
          { name: 'Admin',     icon: 'setting',  component: () => <SuperAdminTab userId={userId} /> },
        ]}
      />
    </LinearGradient>
  )
}
