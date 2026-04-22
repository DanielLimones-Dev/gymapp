// ============================================
// IASCREEN.JSX — Asistente IA RepForge
// Modo 1: Generar programa desde cero
// Modo 2: Ajustar programa existente
// ============================================
import { useState, useRef, useEffect, useCallback, useContext } from 'react'
import { CoachThemeContext, hexToRgb } from '../../../lib/coachTheme'
import {
  View, Text, StyleSheet, ScrollView,
  TextInput, Animated, ActivityIndicator,
  KeyboardAvoidingView, Platform
} from 'react-native'
import { TouchableOpacity, Pressable } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import ManagedModal from '../../../components/ManagedModal'
import DraggableSheet from '../../../components/DraggableSheet'
import { LinearGradient } from 'expo-linear-gradient'
import { AntDesign } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import AppleBentoCard from '../../../components/AppleBentoCard'
import { supabase } from '../../../lib/supabase'
import { cargarPrograma, guardarYSincronizar } from '../../../lib/storage'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { LAYOUT } from '../../../components/constans'
import { normalizarTipo } from '../../../lib/excelImport'

const NIVELES = ['Principiante', 'Intermedio', 'Avanzado', 'Élite']
const SPLITS = [
  { key: 'auto',        label: 'Auto',          desc: 'La IA decide' },
  { key: 'ppl',         label: 'Push/Pull/Legs', desc: 'Empuje · Jalón · Pierna' },
  { key: 'fullbody',    label: 'Full Body',      desc: 'Cuerpo completo' },
  { key: 'upper_lower', label: 'Upper/Lower',    desc: 'Superior · Inferior' },
  { key: 'hibrido',     label: 'Híbrido',        desc: 'Combinación flexible' },
]
const GRUPOS_MUSCULARES = ['Pecho', 'Espalda', 'Hombros', 'Bíceps', 'Tríceps', 'Cuádriceps', 'Femorales', 'Glúteos', 'Pantorrillas']
const COMPLEMENTOS = [
  { key: 'core',       label: 'Core / Abdomen' },
  { key: 'movilidad',  label: 'Movilidad' },
  { key: 'pliometria', label: 'Pliometría' },
]
const OBJETIVOS = [
  { key: 'hipertrofia', label: 'Hipertrofia', desc: 'Ganar masa muscular' },
  { key: 'fuerza', label: 'Fuerza', desc: 'Maximizar fuerza' },
  { key: 'definicion', label: 'Definición', desc: 'Perder grasa, mantener músculo' },
  { key: 'resistencia', label: 'Resistencia', desc: 'Cardio y aguante' },
  { key: 'recomposicion', label: 'Recomposición', desc: 'Perder grasa y ganar músculo' },
]
const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export default function IAScreen({ userId, onProgramaGenerado, inModal = false }) {
  const { accentColor, gradColors } = useContext(CoachThemeContext)
  const acRgb = hexToRgb(accentColor)
  const styles = createStyles(accentColor, acRgb, inModal)
  const GradWrap = inModal ? View : LinearGradient
  const gradWrapProps = inModal ? { style: { flex: 1 } } : { colors: gradColors, style: styles.gradient }

  const [modo, setModo] = useState(null) // 'generar' | 'ajustar' | 'importar'
  const [cargando, setCargando] = useState(false)
  const [segundosCargando, setSegundosCargando] = useState(0)
  const timerRef = useRef(null)
  const [perfil, setPerfil] = useState(null)
  const [programa, setPrograma] = useState(null)
  const [respuestaIA, setRespuestaIA] = useState(null)
  const [errorIA, setErrorIA] = useState(null)
  const [modalConfirm, setModalConfirm] = useState(false)
  const [mensajeExtra, setMensajeExtra] = useState('')
  const [progSeleccionado, setProgSeleccionado] = useState(null)
  const [carruselIdx, setCarruselIdx] = useState(0)
  const carruselAnim = useRef(new Animated.Value(0)).current
  const iaConfig = useRef({ modelo: 'claude-sonnet-4-6', proveedor: 'anthropic', key: '' })

  // Formulario Generar
  const [formGen, setFormGen] = useState({
    objetivo: '',
    nivel: '',
    diasSeleccionados: [],
    semanas: '12',
    equipamento: 'gimnasio', // gimnasio | casa | calistenia
    split: 'auto',           // auto | ppl | fullbody | upper_lower | hibrido
    gruposPrioridad: [],     // subconjunto de GRUPOS_MUSCULARES
    complementos: [],        // core | movilidad | pliometria
    notas: '',
  })

  // Formulario Importar
  const [formImportar, setFormImportar] = useState({
    texto: '',
    nombrePrograma: '',
  })



  // Animaciones
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current

  // Carga inicial garantizada al montar (PagerTabs lazy-mount no dispara useFocusEffect a tiempo)
  useEffect(() => { cargarDatos() }, [])

  useFocusEffect(useCallback(() => {
    cargarDatos()
    // Suscripción Realtime: actualiza iaConfig en vivo si el superadmin cambia la config
    const sub = supabase
      .channel('configuracion_ia')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'configuracion_ia' }, ({ new: row }) => {
        if (!row) return
        const cur = iaConfig.current
        if (row.clave === 'ia_modelo')    iaConfig.current = { ...cur, modelo:    row.valor }
        if (row.clave === 'ia_proveedor') iaConfig.current = { ...cur, proveedor: row.valor, key: '' }
        if (row.clave?.startsWith('ia_key_')) {
          const prov = row.clave.replace('ia_key_', '')
          if (prov === iaConfig.current.proveedor) iaConfig.current = { ...cur, key: row.valor }
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(sub) }
  }, []))

  useEffect(() => {
    if (modo) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]).start()
    }
  }, [modo])

  function navCarrusel(dir, total) {
    const newIdx = Math.max(0, Math.min(carruselIdx + dir, total - 1))
    if (newIdx === carruselIdx) return
    const fromX = dir > 0 ? 60 : -60
    carruselAnim.setValue(fromX)
    setCarruselIdx(newIdx)
    const prog = (programa?.programas?.filter(p => p.estado !== 'archivado') || [])[newIdx]
    if (prog) setProgSeleccionado(prog)
    Animated.spring(carruselAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 120,
      friction: 8,
    }).start()
  }

  async function cargarDatos() {
    const KEY_STORAGE = {
      anthropic:   '@repforge_anthropic_key',
      openai:      '@repforge_openai_key',
      google:      '@repforge_google_key',
      moonshot:    '@repforge_moonshot_key',
      deepseek:    '@repforge_deepseek_key',
      huggingface: '@repforge_hf_key',
      openrouter:  '@repforge_openrouter_key',
      groq:        '@repforge_groq_key',
    }
    try {
      const [{ data: p }, prog, { data: cfgRows }] = await Promise.all([
        supabase.from('perfiles').select('*').eq('id', userId).single(),
        cargarPrograma(userId),
        supabase.from('configuracion_ia').select('clave, valor'),
      ])
      setPerfil(p)
      setPrograma(prog)
      const activo = prog?.programas?.find(pr => pr.estado === 'activo')
      if (activo) setProgSeleccionado(activo)
      if (p) {
        setFormGen(prev => ({
          ...prev,
          objetivo: p.objetivo || '',
          nivel: p.nivel_experiencia || p.nivel || '',
        }))
      }
      const cfg = {}
      if (cfgRows) cfgRows.forEach(r => { cfg[r.clave] = r.valor })
      const proveedor = cfg.ia_proveedor || 'anthropic'
      const modelo    = cfg.ia_modelo    || 'claude-sonnet-4-6'
      let key = cfg[`ia_key_${proveedor}`] || ''
      if (!key && KEY_STORAGE[proveedor]) {
        key = (await AsyncStorage.getItem(KEY_STORAGE[proveedor])) || ''
      }
      iaConfig.current = { modelo, proveedor, key }
    } catch {
      // Supabase falló — intentar solo desde AsyncStorage
      try {
        const proveedor = (await AsyncStorage.getItem('@repforge_ia_proveedor')) || 'anthropic'
        const modelo    = (await AsyncStorage.getItem('@repforge_ia_model'))     || 'claude-sonnet-4-6'
        const key       = KEY_STORAGE[proveedor] ? (await AsyncStorage.getItem(KEY_STORAGE[proveedor])) || '' : ''
        iaConfig.current = { modelo, proveedor, key }
      } catch {}
    }
  }

  function toggleDia(idx) {
    setFormGen(prev => ({
      ...prev,
      diasSeleccionados: prev.diasSeleccionados.includes(idx)
        ? prev.diasSeleccionados.filter(d => d !== idx)
        : [...prev.diasSeleccionados, idx].sort()
    }))
  }

  // ── Construir prompt para generar programa ──────────────────────
  function buildPromptGenerar() {
    const diasNombres = formGen.diasSeleccionados.map(i => DIAS_SEMANA[i]).join(', ')
    const obj = OBJETIVOS.find(o => o.key === formGen.objetivo)

    // Calcular edad si hay fecha de nacimiento
    let edad = perfil?.edad
    if (!edad && perfil?.fecha_nacimiento) {
      const hoy = new Date()
      const nac = new Date(perfil.fecha_nacimiento)
      edad = hoy.getFullYear() - nac.getFullYear()
    }

    const lineaLesiones = perfil?.tiene_lesiones && perfil?.lesiones_descripcion
      ? `- LESIONES / RESTRICCIONES: ${perfil.lesiones_descripcion} (adaptar ejercicios para evitar agravar)`
      : ''
    const lineaCompite = perfil?.compite
      ? `- Compite activamente: sí (considerar picos de rendimiento y peaking)`
      : ''
    const lineaGenero = perfil?.genero ? `- Género: ${perfil.genero}` : ''
    const lineaAltura = perfil?.altura ? `- Altura: ${perfil.altura} cm` : ''

    return `Eres un experto en periodización de entrenamiento con resistencia, especializado en metodología RP Strength (Renaissance Periodization). Diseña programas científicamente fundamentados adaptados al perfil exacto del atleta.

PERFIL DEL ATLETA:
- Nombre: ${perfil?.nombre_completo || 'Atleta'}
- Edad: ${edad ? edad + ' años' : 'No especificada'}
- Peso: ${perfil?.peso ? perfil.peso + ' kg' : 'No especificado'}
${lineaAltura}
${lineaGenero}
- Nivel de experiencia: ${formGen.nivel}
${lineaCompite}
${lineaLesiones}

PARÁMETROS DEL PROGRAMA:
- Objetivo principal: ${obj?.label || formGen.objetivo} — ${obj?.desc || ''}
- Días de entrenamiento: ${diasNombres} (${formGen.diasSeleccionados.length} días/semana)
- Duración total: ${formGen.semanas} semanas
- Equipamiento: ${formGen.equipamento}
- Tipo de split: ${SPLITS.find(s => s.key === formGen.split)?.label || 'Auto'} — ${SPLITS.find(s => s.key === formGen.split)?.desc || ''}
${formGen.gruposPrioridad.length > 0 ? `- Grupos musculares prioritarios (dar más volumen y frecuencia): ${formGen.gruposPrioridad.join(', ')}` : ''}
${formGen.complementos.length > 0 ? `- Complementos a distribuir en la rutina: ${formGen.complementos.map(c => COMPLEMENTOS.find(x => x.key === c)?.label).join(', ')}` : ''}
${formGen.notas ? `- Indicaciones especiales del atleta: ${formGen.notas}` : ''}

INSTRUCCIONES DE DISEÑO (seguir estrictamente):

ESTRUCTURA DE BLOQUES (CRÍTICO — leer con atención):
- Periodizar en fases: Acumulación → Intensificación → Peaking → Descarga
- La suma de semanas de TODOS los bloques debe ser EXACTAMENTE ${formGen.semanas} semanas. Sin excepción.
- Distribuir las ${formGen.semanas} semanas así (ajustar proporciones según el total):
  ${formGen.semanas <= 8
    ? `${formGen.semanas} semanas cortas: Acumulación ${Math.round(formGen.semanas*0.4)} · Intensificación ${Math.round(formGen.semanas*0.35)} · Descarga ${formGen.semanas - Math.round(formGen.semanas*0.4) - Math.round(formGen.semanas*0.35)}`
    : `Acumulación ${Math.round(formGen.semanas*0.35)} · Intensificación ${Math.round(formGen.semanas*0.30)} · Peaking ${Math.round(formGen.semanas*0.20)} · Descarga ${formGen.semanas - Math.round(formGen.semanas*0.35) - Math.round(formGen.semanas*0.30) - Math.round(formGen.semanas*0.20)}`
  }
- Verificar antes de responder: suma de "semanas" en todos los bloques = ${formGen.semanas}
- RIR por fase: Acumulación 3-4 · Intensificación 1-2 · Peaking 0-1 · Descarga 4-5

VOLUMEN SEMANAL POR GRUPO MUSCULAR (rangos RP Strength MEV→MAV):
- Pecho: 10-20 series/semana | Espalda: 14-22 | Hombros: 12-20
- Bíceps: 12-20 | Tríceps: 10-18 | Cuádriceps: 12-18
- Femorales: 10-16 | Glúteos: 6-14 | Pantorrillas: 8-16 | Abdomen: 8-16
- En Acumulación usar el extremo bajo-medio; en Intensificación/Peaking el medio-alto

ESTRUCTURA DE CADA SESIÓN (obligatorio):
- MÍNIMO 5 ejercicios por día, MÁXIMO 8
- Empezar siempre con 1-2 movimientos compuestos principales (sentadilla, press banca, peso muerto, press militar, remo, etc.)
- Continuar con 1-2 movimientos compuestos secundarios o variantes
- Terminar con 2-3 ejercicios de aislamiento para los grupos trabajados ese día
- Series por ejercicio: 3-5 (compuestos) · 3-4 (aislamiento)
- Progresión de series entre bloques: aumentar 1-2 series por ejercicio en Intensificación vs Acumulación

DISTRIBUCIÓN DEL SPLIT:
- Aplicar el split indicado: ${SPLITS.find(s => s.key === formGen.split)?.label || 'Auto'}
- Distribuir los grupos musculares equilibradamente entre los días disponibles
- Ningún grupo muscular principal puede quedar sin trabajar en la semana salvo restricción médica
- Frecuencia óptima: 2x/semana por grupo muscular si los días lo permiten
${formGen.gruposPrioridad.length > 0 ? `- PRIORIDAD: ${formGen.gruposPrioridad.join(', ')} → frecuencia 2x/semana obligatoria + 20-30% más series que los demás grupos` : ''}

SELECCIÓN DE EJERCICIOS:
- Usar ejercicios apropiados para el equipamiento: ${formGen.equipamento}
- Variar los ejercicios entre bloques (no repetir exactamente los mismos en todos los bloques)
- Compuestos primero, luego accesorios, luego aislamiento
- No repetir el mismo ejercicio dos veces en la misma sesión
${formGen.complementos.includes('core') ? `- CORE (OBLIGATORIO): incluir 2-3 ejercicios con grupo="Abdomen" en CADA sesión de entrenamiento. Ejemplos: Plancha, Crunch con Cable, Elevación de Piernas Colgado, Ab Wheel, Pallof Press, Dragon Flag. Colocarlos al final de la sesión.` : ''}
${formGen.complementos.includes('movilidad') ? `- MOVILIDAD (OBLIGATORIO): incluir 2 ejercicios con grupo="Movilidad" al final de CADA sesión. Ejemplos: Hip Flexor Stretch, Thoracic Rotation, Pigeon Pose, World's Greatest Stretch, Ankle Mobility Drill, Cat-Cow. series=2, repsMin=30, repsMax=45 (segundos), rir=0.` : ''}
${formGen.complementos.includes('pliometria') ? `- PLIOMETRÍA (OBLIGATORIO): incluir 2 ejercicios con grupo="Pliometría" al INICIO de CADA sesión de pierna o de cuerpo completo. Ejemplos: Box Jump, Broad Jump, Depth Jump, Tuck Jump, Split Jump. series=3, repsMin=5, repsMax=8, rir=1.` : ''}
- Si hay lesiones, excluir completamente los ejercicios que las afecten y sustituirlos por variantes seguras

Responde ÚNICAMENTE con este JSON válido, sin texto adicional ni markdown:
{
  "nombrePrograma": "string",
  "descripcion": "string (2-3 oraciones con la lógica del programa)",
  "bloques": [
    {
      "nombre": "string (ej: Bloque 1 - Acumulación)",
      "tipo": "string (Adaptativo|Acumulación|Intensificación|Peaking|Descarga)",
      "semanas": number,
      "etiquetasPorDia": {
        "0": "string (PUSH|PULL|LEGS|UPPER|LOWER|FULLBODY|ARMS|CORE — asignar según los grupos trabajados ese día)"
      },
      "ejerciciosPorDia": {
        "0": [
          {
            "nombre": "string",
            "grupo": "string (Pecho|Espalda|Hombros|Bíceps|Tríceps|Cuádriceps|Femorales|Glúteos|Pantorrillas|Abdomen|Movilidad|Pliometría)",
            "series": number,
            "repsMin": number,
            "repsMax": number,
            "rir": number,
            "peso": ""
          }
        ]
      }
    }
  ]
}

Los índices de ejerciciosPorDia y etiquetasPorDia son los días seleccionados: ${formGen.diasSeleccionados.join(', ')} (0=Lunes, 6=Domingo). Incluye ejercicios Y etiqueta para CADA uno de esos días en CADA bloque. La etiqueta debe reflejar los grupos entrenados ese día (ej. Pecho+Tríceps+Hombros → PUSH, Espalda+Bíceps → PULL, Cuádriceps+Femorales+Glúteos → LEGS, etc.).`
  }

  // ── Construir prompt para ajustar programa existente ────────────
  function buildPromptAjustar() {
    const progActivo = progSeleccionado
    if (!progActivo) return null

    const ejerciciosPorBloque = progActivo.bloques?.map(b => {
      const dias = {}
      ;[0,1,2,3,4,5,6].forEach(d => {
        const ejs = programa?.dias?.[`ejercicios_${b.id}_${d}`] || []
        if (ejs.length > 0) dias[d] = ejs
      })
      return { bloque: b.nombre, tipo: b.tipo, ejercicios: dias }
    })

    return `Eres un experto en periodización de entrenamiento con metodología RP Strength.

El usuario tiene este perfil:
- Nombre: ${perfil?.nombre_completo || 'Atleta'}
- Nivel: ${perfil?.nivel_experiencia || perfil?.nivel || 'No especificado'}
- Objetivo actual: ${perfil?.objetivo || 'No especificado'}
- Peso actual: ${perfil?.peso ? perfil.peso + ' kg' : 'No especificado'}

Su programa activo se llama "${progActivo.nombre}" y tiene esta estructura:
${JSON.stringify(ejerciciosPorBloque, null, 2)}

${mensajeExtra ? `El usuario solicita específicamente: ${mensajeExtra}` : ''}

Analiza el programa y proporciona ajustes concretos en formato JSON:
{
  "analisis": "string (2-3 oraciones analizando el programa actual)",
  "ajustes": [
    {
      "bloque": "string",
      "dia": number,
      "ejercicioActual": "string",
      "cambio": "string (reemplazar|modificar|agregar|eliminar)",
      "ejercicioNuevo": "string (si aplica)",
      "seriesNuevas": number,
      "repsMinNuevas": number,
      "repsMaxNuevas": number,
      "rirNuevo": number,
      "razon": "string (explicación breve)"
    }
  ],
  "recomendacionGeneral": "string (consejo principal)"
}

Sé específico y fundamentado en principios de periodización. Responde SOLO con el JSON válido.`
  }

  // ── Construir prompt para importar desde texto ──────────────────
  function buildPromptImportar() {
    const MAX_CHARS = 8000
    const textoRaw = formImportar.texto
    const texto = textoRaw.length > MAX_CHARS
      ? textoRaw.slice(0, MAX_CHARS) + '\n[texto truncado por longitud]'
      : textoRaw
    return `Eres un experto en periodización de entrenamiento. Tu tarea es leer una rutina de entrenamiento escrita en texto libre (puede venir de un Excel, PDF, notas o cualquier formato) y convertirla exactamente al formato JSON del sistema RepForge.

RUTINA A IMPORTAR:
"""
${texto}
"""

INSTRUCCIONES:
- Si el texto tiene formato "series=[S1,S2,...SN]": crea UN bloque por cada posición del array. Bloque 1 usa S1, Bloque 2 usa S2, etc. Todos los bloques tienen los mismos ejercicios y días.
- Si el texto tiene formato libre (sin arrays): agrupa los días en bloques lógicos. Si no hay bloques claros, crea uno solo llamado "Bloque Principal".
- Extrae TODOS los ejercicios y días tal como están escritos. No inventes ejercicios ni omitas ninguno.
- Si falta algún dato (series, reps, RIR), usa valores razonables: series 3, reps 8-12, RIR 2.
- Asigna el grupo muscular correcto a cada ejercicio.
- Asigna la etiqueta del día según los músculos entrenados (PUSH/PULL/LEGS/UPPER/LOWER/FULLBODY/ARMS/CORE).
- Mapea los días al índice de día de la semana más lógico (0=Lun, 1=Mar, 2=Mié, 3=Jue, 4=Vie, 5=Sáb).
- El campo "peso" siempre va vacío "".

Responde ÚNICAMENTE con este JSON válido, sin texto adicional ni markdown:
{
  "nombrePrograma": "${formImportar.nombrePrograma.trim() || 'Programa Importado'}",
  "descripcion": "string (describe brevemente la rutina importada)",
  "bloques": [
    {
      "nombre": "string",
      "tipo": "string (Adaptativo|Acumulación|Intensificación|Peaking|Descarga)",
      "semanas": number,
      "etiquetasPorDia": {
        "0": "string (PUSH|PULL|LEGS|UPPER|LOWER|FULLBODY|ARMS|CORE)"
      },
      "ejerciciosPorDia": {
        "0": [
          {
            "nombre": "string",
            "grupo": "string (Pecho|Espalda|Hombros|Bíceps|Tríceps|Cuádriceps|Femorales|Glúteos|Pantorrillas|Abdomen|Movilidad|Pliometría)",
            "series": number,
            "repsMin": number,
            "repsMax": number,
            "rir": number,
            "peso": ""
          }
        ]
      }
    }
  ]
}`
  }

  // ── Llamar a la IA (multi-proveedor) ────────────────────────────
  async function llamarIA(prompt) {
    const { modelo, proveedor, key } = iaConfig.current
    if (!key) throw new Error('Sin API key configurada. Contacta al administrador.')

    const TIMEOUT_MS = 180_000 // 3 min — modelos gratuitos son lentos
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

    function errorHttp(status, body) {
      if (status === 504 || status === 503) return 'El modelo tardó demasiado. Intenta de nuevo o usa un modelo más rápido.'
      if (status === 429) return 'Límite de peticiones alcanzado. Espera un momento.'
      if (status === 401 || status === 403) return 'API key inválida o sin permisos.'
      const msg = body?.error?.message || body?.error
      return typeof msg === 'string' ? msg.slice(0, 120) : `Error HTTP ${status}`
    }

    let rawText = ''

    try {

    if (proveedor === 'anthropic') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: modelo, max_tokens: 16000, messages: [{ role: 'user', content: prompt }] }),
        signal: controller.signal,
      })
      if (!res.ok) {
        let body = {}
        try { body = await res.json() } catch {}
        throw new Error(errorHttp(res.status, body))
      }
      const data = await res.json()
      rawText = data.content?.find(b => b.type === 'text')?.text || ''
    } else if (proveedor === 'google') {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 16000 } }),
        signal: controller.signal,
      })
      if (!res.ok) {
        let body = {}
        try { body = await res.json() } catch {}
        throw new Error(errorHttp(res.status, body))
      }
      const data = await res.json()
      rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    } else {
      const baseUrl = proveedor === 'openai'      ? 'https://api.openai.com'
                    : proveedor === 'moonshot'    ? 'https://api.moonshot.cn'
                    : proveedor === 'huggingface' ? 'https://router.huggingface.co'
                    : proveedor === 'openrouter'  ? 'https://openrouter.ai/api'
                    : proveedor === 'groq'        ? 'https://api.groq.com/openai'
                    :                               'https://api.deepseek.com'
      const res = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({ model: modelo, max_tokens: 16000, messages: [{ role: 'user', content: prompt }] }),
        signal: controller.signal,
      })
      if (!res.ok) {
        let body = {}
        try { body = await res.json() } catch {}
        throw new Error(errorHttp(res.status, body))
      }
      const data = await res.json()
      rawText = data.choices?.[0]?.message?.content || ''
    }

    } catch (e) {
      if (e.name === 'AbortError') throw new Error('Tiempo de espera agotado (3 min). El modelo está lento — intenta de nuevo.')
      throw e
    } finally {
      clearTimeout(timeoutId)
    }

    if (!rawText) throw new Error('La IA no devolvió respuesta. Intenta de nuevo.')
    const clean = rawText.replace(/```json\n?|\n?```/g, '').trim()
    let parsed
    try {
      parsed = JSON.parse(clean)
    } catch {
      // Intentar extraer el JSON aunque esté truncado
      const match = clean.match(/\{[\s\S]*/)
      if (!match) throw new Error('Respuesta inválida de la IA. Intenta de nuevo.')
      let fragment = match[0]
      // Cerrar arrays y objetos abiertos para reparar JSON truncado
      let opens = 0
      for (const ch of fragment) { if (ch === '{' || ch === '[') opens++; else if (ch === '}' || ch === ']') opens-- }
      while (opens > 0) { fragment += fragment.lastIndexOf('[') > fragment.lastIndexOf('{') ? ']' : '}'; opens-- }
      try { parsed = JSON.parse(fragment) } catch { throw new Error('Respuesta incompleta de la IA. Sube max_tokens o usa un modelo más potente.') }
    }
    return parsed
  }

  async function generarPrograma() {
    if (!formGen.objetivo || !formGen.nivel || formGen.diasSeleccionados.length === 0) return
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    setCargando(true)
    setSegundosCargando(0)
    setErrorIA(null)
    timerRef.current = setInterval(() => setSegundosCargando(s => s + 1), 1000)
    try {
      const prompt = buildPromptGenerar()
      const resultado = await llamarIA(prompt)
      setRespuestaIA({ tipo: 'generar', datos: resultado })
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      setModalConfirm(true)
    } catch (e) {
      setErrorIA(e?.message || 'Error al conectar con la IA. Verifica tu conexión.')
    } finally {
      clearInterval(timerRef.current)
      setCargando(false)
    }
  }

  async function ajustarPrograma() {
    const progActivo = progSeleccionado
    if (!progActivo) return
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    setCargando(true)
    setSegundosCargando(0)
    setErrorIA(null)
    timerRef.current = setInterval(() => setSegundosCargando(s => s + 1), 1000)
    try {
      const prompt = buildPromptAjustar()
      const resultado = await llamarIA(prompt)
      setRespuestaIA({ tipo: 'ajustar', datos: resultado })
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      setModalConfirm(true)
    } catch (e) {
      setErrorIA(e?.message || 'Error al conectar con la IA. Verifica tu conexión.')
    } finally {
      clearInterval(timerRef.current)
      setCargando(false)
    }
  }



  async function importarPrograma() {
    if (!formImportar.texto.trim()) return
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    setErrorIA(null)

    // Texto libre → IA con spinner
    setCargando(true)
    setSegundosCargando(0)
    timerRef.current = setInterval(() => setSegundosCargando(s => s + 1), 1000)
    try {
      const prompt = buildPromptImportar()
      const resultado = await llamarIA(prompt)
      setRespuestaIA({ tipo: 'importar', datos: resultado })
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      setModalConfirm(true)
    } catch (e) {
      setErrorIA(e?.message || 'Error al conectar con la IA. Verifica tu conexión.')
    } finally {
      clearInterval(timerRef.current)
      setCargando(false)
    }
  }

  async function aplicarPrograma() {
    if (!respuestaIA || (respuestaIA.tipo !== 'generar' && respuestaIA.tipo !== 'importar')) return
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    const datos = respuestaIA.datos
    try {
      const duracion = respuestaIA.tipo === 'importar'
        ? datos.bloques.reduce((sum, b) => sum + (b.semanas || 4), 0)
        : parseInt(formGen.semanas)

      // Calcular fechaInicio sin colisión con programas existentes
      const progActualPrevio = await cargarPrograma(userId)
      const programasExistentes = progActualPrevio?.programas || []
      let fechaInicioDate = new Date()
      programasExistentes.forEach(p => {
        if (p.fechaFin) {
          const fin = new Date(p.fechaFin + 'T12:00:00')
          fin.setDate(fin.getDate() + 1) // día siguiente al fin del programa
          if (fin > fechaInicioDate) fechaInicioDate = fin
        }
      })
      const fechaInicio = fechaInicioDate.toISOString().split('T')[0]
      const fechaFinDate = new Date(fechaInicioDate)
      fechaFinDate.setDate(fechaFinDate.getDate() + duracion * 7)
      const nuevoProg = {
        id: Date.now().toString(),
        nombre: datos.nombrePrograma,
        objetivo: formGen.objetivo,
        estado: 'activo',
        fechaInicio,
        fechaFin: fechaFinDate.toISOString().split('T')[0],
        duracionSemanas: duracion,
        semanas: duracion,
        bloques: datos.bloques.map((b, i) => ({
          id: `bloque_${Date.now()}_${i}`,
          nombre: b.nombre,
          tipo: normalizarTipo(b.tipo),
          semanas: b.semanas,
          orden: i,
        }))
      }

      const progActual = await cargarPrograma(userId)
      const programas = progActual?.programas || []
      programas.push(nuevoProg)

      // Guardar ejercicios por día por bloque
      const dias = { ...progActual?.dias }
      nuevoProg.bloques.forEach((bloque, bi) => {
        const bloqueData = datos.bloques[bi]
        Object.entries(bloqueData.ejerciciosPorDia || {}).forEach(([diaIdx, ejercs]) => {
          const key = `ejercicios_${bloque.id}_${diaIdx}`
          dias[key] = ejercs.map(e => ({
            id: `${Date.now()}_${Math.random()}`,
            nombre: e.nombre,
            grupo: e.grupo,
            series: e.series,
            reps: e.reps || (e.repsMin === e.repsMax ? String(e.repsMin) : `${e.repsMin}-${e.repsMax}`),
            repsMin: e.repsMin,
            repsMax: e.repsMax,
            rir: e.rir,
            peso: '',
            historial: [],
          }))
        })
        // Configurar días activos y etiquetas
        const diasActivos = respuestaIA.tipo === 'importar'
          ? Object.keys(bloqueData.ejerciciosPorDia || {}).map(Number)
          : formGen.diasSeleccionados
        dias[`dias_${bloque.id}`] = diasActivos
        if (bloqueData.etiquetasPorDia) {
          dias[`etiquetas_${bloque.id}`] = bloqueData.etiquetasPorDia
        }
      })

      await guardarYSincronizar(userId, { programas, dias })
      setModalConfirm(false)
      setModo(null)
      setRespuestaIA(null)
      if (onProgramaGenerado) onProgramaGenerado()
    } catch (e) {
      setErrorIA('Error al guardar el programa.')
    }
  }

  // ── Pantalla de selección de modo ──────────────────────────────
  if (!modo) {
    const progActivo = programa?.programas?.find(p => p.estado === 'activo')
    return (
      <GradWrap {...gradWrapProps}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={inModal
            ? { padding: 20, paddingTop: 8, paddingBottom: 32 }
            : [styles.container, { paddingBottom: LAYOUT.bottomTabSpace }]
          }
          nestedScrollEnabled
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iaBadge}>
              <Text style={styles.iaBadgeText}>✦ IA</Text>
            </View>
            <Text style={styles.titulo}>Asistente RepForge</Text>
            <Text style={styles.subtitulo}>
              Crea o ajusta tu programa con inteligencia artificial basada en periodización RP Strength
            </Text>
          </View>

          {/* Modo 1 — Generar */}
          <Pressable
            style={({ pressed }) => [styles.modoCard, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
            onPress={() => setModo('generar')}
          >
            <View style={styles.modoGradient}>
              <View style={styles.modoIconWrap}>
                <Text style={styles.modoEmoji}>✨</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modoTitulo}>Generar programa</Text>
                <Text style={styles.modoDesc}>
                  La IA crea un programa completo con bloques, ejercicios, series y RIR según tu perfil y objetivo
                </Text>
              </View>
              <AntDesign name="right" size={16} color="#9933ff" />
            </View>
          </Pressable>

          {/* Modo 2 — Ajustar */}
          {(() => {
            const disponibles = programa?.programas?.filter(p => p.estado !== 'archivado') || []
            const hayProgramas = disponibles.length > 0
            return (
              <Pressable
                style={({ pressed }) => [
                  styles.modoCard,
                  !hayProgramas && styles.modoCardDisabled,
                  pressed && hayProgramas && { opacity: 0.85, transform: [{ scale: 0.98 }] }
                ]}
                onPress={() => hayProgramas && setModo('ajustar')}
                disabled={!hayProgramas}
              >
                <View style={styles.modoGradient}>
                  <View style={styles.modoIconWrap}>
                    <AntDesign name="setting" size={22} color={hayProgramas ? accentColor : '#8E8E93'} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modoTitulo, !hayProgramas && { color: '#8E8E93' }]}>
                      Ajustar programa
                    </Text>
                    <Text style={styles.modoDesc}>
                      {hayProgramas
                        ? disponibles.length + ' programa' + (disponibles.length > 1 ? 's disponibles' : ' disponible')
                        : 'No tienes programas disponibles'}
                    </Text>
                  </View>
                  <AntDesign name="right" size={16} color={hayProgramas ? accentColor : '#8E8E93'} />
                </View>
              </Pressable>
            )
          })()}

          {/* Info */}
          <AppleBentoCard style={styles.infoCard}>
            <AntDesign name="info-circle" size={14} color="#8E8E93" />
            <Text style={styles.infoText}>
              La IA usa tu perfil del onboarding, historial y métricas para personalizar cada recomendación
            </Text>
          </AppleBentoCard>
        </ScrollView>
      </GradWrap>
    )
  }

  // ── Loading — early returns antes de cualquier check de modo ──


  // ── Formulario Generar ──────────────────────────────────────────
  if (modo === 'generar') {
    const puedeGenerar = formGen.objetivo && formGen.nivel && formGen.diasSeleccionados.length > 0
    const containerStyle = inModal ? { padding: 20, paddingTop: 8, paddingBottom: 32 } : styles.container
    return (
      <GradWrap {...gradWrapProps}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={inModal ? 80 : 0}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={containerStyle}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <Pressable
                style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
                onPress={() => setModo(null)}
              >
                <AntDesign name="left" size={16} color={accentColor} />
              </Pressable>
              <Text style={styles.titulo}>Nuevo programa con IA</Text>
            </View>

            {/* Objetivo */}
            <Text style={styles.sectionLabel}>OBJETIVO</Text>
            <View style={styles.opcionesGrid}>
              {OBJETIVOS.map(o => (
                <Pressable
                  key={o.key}
                  style={({ pressed }) => [
                    styles.opcionBtn,
                    formGen.objetivo === o.key && styles.opcionBtnActivo,
                    pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] }
                  ]}
                  onPress={() => setFormGen(p => ({ ...p, objetivo: o.key }))}
                >
                  <Text style={[styles.opcionLabel, formGen.objetivo === o.key && { color: '#9933ff' }]}>
                    {o.label}
                  </Text>
                  <Text style={styles.opcionDesc}>{o.desc}</Text>
                </Pressable>
              ))}
            </View>

            {/* Nivel */}
            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>NIVEL DE EXPERIENCIA</Text>
            <View style={styles.nivelRow}>
              {NIVELES.map(n => (
                <Pressable
                  key={n}
                  style={({ pressed }) => [
                    styles.nivelBtn,
                    formGen.nivel === n && styles.nivelBtnActivo,
                    pressed && { opacity: 0.8 }
                  ]}
                  onPress={() => setFormGen(p => ({ ...p, nivel: n }))}
                >
                  <Text style={[styles.nivelText, formGen.nivel === n && { color: '#9933ff' }]}>{n}</Text>
                </Pressable>
              ))}
            </View>

            {/* Días */}
            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>DÍAS DE ENTRENAMIENTO</Text>
            <View style={styles.diasRow}>
              {DIAS_SEMANA.map((d, i) => (
                <Pressable
                  key={i}
                  style={({ pressed }) => [
                    styles.diaBtn,
                    formGen.diasSeleccionados.includes(i) && styles.diaBtnActivo,
                    pressed && { opacity: 0.8 }
                  ]}
                  onPress={() => toggleDia(i)}
                >
                  <Text style={[styles.diaText, formGen.diasSeleccionados.includes(i) && { color: '#fff' }]}>
                    {d}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Semanas */}
            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>DURACIÓN (SEMANAS)</Text>
            <View style={styles.semanasRow}>
              {['8', '10', '12', '16', '20'].map(s => (
                <Pressable
                  key={s}
                  style={({ pressed }) => [
                    styles.semanaBtn,
                    formGen.semanas === s && styles.semanaBtnActivo,
                    pressed && { opacity: 0.8 }
                  ]}
                  onPress={() => setFormGen(p => ({ ...p, semanas: s }))}
                >
                  <Text style={[styles.semanaText, formGen.semanas === s && { color: '#9933ff' }]}>{s}</Text>
                </Pressable>
              ))}
            </View>

            {/* Equipamento */}
            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>EQUIPAMENTO</Text>
            <View style={styles.equipRow}>
              {[
                { key: 'gimnasio', label: 'Gimnasio' },
                { key: 'casa', label: 'Casa' },
                { key: 'calistenia', label: '🤸 Calistenia' },
              ].map(e => (
                <Pressable
                  key={e.key}
                  style={({ pressed }) => [
                    styles.equipBtn,
                    formGen.equipamento === e.key && styles.equipBtnActivo,
                    pressed && { opacity: 0.8 }
                  ]}
                  onPress={() => setFormGen(p => ({ ...p, equipamento: e.key }))}
                >
                  <Text style={[styles.equipText, formGen.equipamento === e.key && { color: '#9933ff' }]}>
                    {e.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Split */}
            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>TIPO DE SPLIT</Text>
            <View style={styles.chipRow}>
              {SPLITS.map(s => {
                const activo = formGen.split === s.key
                return (
                  <Pressable
                    key={s.key}
                    style={({ pressed }) => [styles.chip, activo && styles.chipActivo, pressed && { opacity: 0.75 }]}
                    onPress={() => setFormGen(p => ({ ...p, split: s.key }))}
                  >
                    <Text style={[styles.chipLabel, activo && styles.chipLabelActivo]}>{s.label}</Text>
                    <Text style={styles.chipDesc}>{s.desc}</Text>
                  </Pressable>
                )
              })}
            </View>

            {/* Grupos prioritarios */}
            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>GRUPOS PRIORITARIOS <Text style={{ color: 'rgba(255,255,255,0.25)', fontWeight: '400' }}>(opcional)</Text></Text>
            <View style={styles.chipRow}>
              {GRUPOS_MUSCULARES.map(g => {
                const activo = formGen.gruposPrioridad.includes(g)
                return (
                  <Pressable
                    key={g}
                    style={({ pressed }) => [styles.chip, activo && styles.chipActivo, pressed && { opacity: 0.75 }]}
                    onPress={() => setFormGen(p => ({
                      ...p,
                      gruposPrioridad: activo
                        ? p.gruposPrioridad.filter(x => x !== g)
                        : [...p.gruposPrioridad, g],
                    }))}
                  >
                    <Text style={[styles.chipLabel, activo && styles.chipLabelActivo]}>{g}</Text>
                  </Pressable>
                )
              })}
            </View>

            {/* Complementos */}
            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>COMPLEMENTOS <Text style={{ color: 'rgba(255,255,255,0.25)', fontWeight: '400' }}>(opcional)</Text></Text>
            <View style={styles.chipRow}>
              {COMPLEMENTOS.map(c => {
                const activo = formGen.complementos.includes(c.key)
                return (
                  <Pressable
                    key={c.key}
                    style={({ pressed }) => [styles.chip, activo && styles.chipActivo, pressed && { opacity: 0.75 }]}
                    onPress={() => setFormGen(p => ({
                      ...p,
                      complementos: activo
                        ? p.complementos.filter(x => x !== c.key)
                        : [...p.complementos, c.key],
                    }))}
                  >
                    <Text style={[styles.chipLabel, activo && styles.chipLabelActivo]}>{c.label}</Text>
                  </Pressable>
                )
              })}
            </View>

            {/* Notas */}
            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>NOTAS ADICIONALES (OPCIONAL)</Text>
            <TextInput
              style={styles.notasInput}
              placeholder="Ej: tengo dolor de rodilla, prefiero no hacer sentadilla..."
              placeholderTextColor="rgba(255,255,255,0.15)"
              multiline
              numberOfLines={3}
              value={formGen.notas}
              onChangeText={t => setFormGen(p => ({ ...p, notas: t }))}
            />

            {/* Error */}
            {errorIA && (
              <View style={styles.errorBox}>
                <AntDesign name="exclamation-circle" size={14} color="#ff3355" />
                <Text style={styles.errorText}>{errorIA}</Text>
              </View>
            )}

            {/* Botón generar */}
            <Pressable
              style={({ pressed }) => [
                styles.generarBtn,
                !puedeGenerar && { opacity: 0.4 },
                pressed && puedeGenerar && { opacity: 0.85, transform: [{ scale: 0.98 }] }
              ]}
              onPress={generarPrograma}
              disabled={!puedeGenerar || cargando}
            >
              <LinearGradient colors={[accentColor, accentColor + 'cc']} style={styles.generarGradient}>
                {cargando ? (
                  <>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={styles.generarText}>Generando con IA... {segundosCargando}s</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.generarText}>Generar programa</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>

            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Modal preview resultado */}
        <ManagedModal visible={modalConfirm} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <Pressable style={{ flex: 1 }} onPress={() => setModalConfirm(false)} />
            <View style={styles.modalBox}>
              <View style={styles.modalHandle} />
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalIaBadge}>
                  <Text style={styles.modalIaBadgeText}>GENERADO POR IA</Text>
                </View>
                {respuestaIA?.datos && (
                  <>
                    <Text style={styles.modalTitulo}>{respuestaIA.datos.nombrePrograma}</Text>
                    <Text style={styles.modalDesc}>{respuestaIA.datos.descripcion}</Text>

                    <Text style={[styles.sectionLabel, { marginTop: 16 }]}>BLOQUES</Text>
                    {respuestaIA.datos.bloques?.map((b, i) => (
                      <AppleBentoCard key={i} style={styles.bloquePreview}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                          <Text style={styles.bloqueNombre}>{b.nombre}</Text>
                          <Text style={styles.bloqueSemanas}>{b.semanas} sem</Text>
                        </View>
                        <Text style={styles.bloqueTipo}>{b.tipo}</Text>
                        {Object.entries(b.ejerciciosPorDia || {}).map(([dia, ejs]) => (
                          <View key={dia} style={{ marginTop: 8 }}>
                            <Text style={styles.bloqueEjsTitulo}>
                              {DIAS_SEMANA[parseInt(dia)]} {b.etiquetasPorDia?.[dia] ? `— ${b.etiquetasPorDia[dia]}` : ''} · {ejs.length} ejercicios
                            </Text>
                            {ejs.map((e, j) => (
                              <Text key={j} style={styles.bloqueEj}>
                                · {e.nombre} — {e.series}×{e.repsMin}-{e.repsMax} RIR{e.rir}
                              </Text>
                            ))}
                          </View>
                        ))}
                      </AppleBentoCard>
                    ))}
                  </>
                )}

                {errorIA && (
                  <Text style={{ color: '#ff4455', fontSize: 13, marginTop: 12, textAlign: 'center' }}>{errorIA}</Text>
                )}
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
                  <Pressable
                    style={({ pressed }) => [styles.modalCancelarBtn, pressed && { opacity: 0.7 }]}
                    onPress={() => { setModalConfirm(false); setErrorIA(null) }}
                  >
                    <Text style={styles.modalCancelarText}>Descartar</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.modalAplicarBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
                    onPress={aplicarPrograma}
                  >
                    <LinearGradient colors={['#9933ff', '#6600cc']} style={styles.modalAplicarGradient}>
                      <AntDesign name="check" size={15} color="#fff" />
                      <Text style={styles.modalAplicarText}>Aplicar programa</Text>
                    </LinearGradient>
                  </Pressable>
                </View>
                <View style={{ height: 20 }} />
              </ScrollView>
            </View>
          </View>
        </ManagedModal>
      </GradWrap>
    )
  }

  // ── Pantalla Importar ──────────────────────────────────────────
  if (modo === 'importar') {
    const puedeImportar = formImportar.texto.trim().length > 20
    const containerStyle = inModal ? { padding: 20, paddingTop: 8, paddingBottom: 32 } : styles.container
    return (
      <GradWrap {...gradWrapProps}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={inModal ? 80 : 0}>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={containerStyle} keyboardShouldPersistTaps="handled" nestedScrollEnabled>

            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <Pressable
                style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
                onPress={() => { setModo(null); setErrorIA(null); setFormImportar({ texto: '', nombrePrograma: '' }) }}
              >
                <AntDesign name="arrow-left" size={18} color="#fff" />
              </Pressable>
              <Text style={styles.titulo}>Importar Rutina</Text>
            </View>

            {/* Nombre del programa (opcional) */}
            <Text style={styles.sectionLabel}>NOMBRE DEL PROGRAMA <Text style={{ color: 'rgba(255,255,255,0.25)', fontWeight: '400' }}>(opcional)</Text></Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                placeholder="ej. Rutina PPL de YouTube"
                placeholderTextColor="rgba(255,255,255,0.2)"
                value={formImportar.nombrePrograma}
                onChangeText={v => setFormImportar(p => ({ ...p, nombrePrograma: v }))}
              />
            </View>

            {/* Área de texto */}
            <Text style={styles.sectionLabel}>RUTINA <Text style={{ color: '#ff3355' }}>*</Text></Text>
            <View style={[styles.inputWrap, { padding: 0 }]}>
              <TextInput
                style={[styles.input, { height: 240, textAlignVertical: 'top', padding: 14 }]}
                placeholder={`Ejemplo:\nDía 1 - Pecho\nPress banca 4x8-10\nAperturas 3x12-15\nFondos 3x10\n\nDía 2 - Espalda\nDominadas 4x8\nRemo con barra 4x10...`}
                placeholderTextColor="rgba(255,255,255,0.15)"
                value={formImportar.texto}
                onChangeText={v => setFormImportar(p => ({ ...p, texto: v }))}
                multiline
                autoCorrect={false}
                autoCapitalize="none"
              />
            </View>

            <AppleBentoCard style={[styles.infoCard, { marginTop: 8 }]}>
              <AntDesign name="info-circle" size={14} color="#00cc88" />
              <Text style={[styles.infoText, { color: '#00cc88' }]}>
                Cualquier formato funciona — tablas, listas, texto libre. Copia directamente desde el PDF o Excel.
              </Text>
            </AppleBentoCard>

            {errorIA && (
              <View style={styles.errorBox}>
                <AntDesign name="exclamation-circle" size={14} color="#ff3355" />
                <Text style={styles.errorText}>{errorIA}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.generateBtn, !puedeImportar && { opacity: 0.4 }]}
              onPress={importarPrograma}
              disabled={!puedeImportar || cargando}
            >
              <LinearGradient colors={['#00aa66', '#007744']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.generateBtnGrad}>
                {cargando ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={styles.generateBtnText}>TRANSCRIBIENDO... {segundosCargando}s</Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <AntDesign name="file-text" size={16} color="#fff" />
                    <Text style={styles.generateBtnText}>TRANSCRIBIR CON IA</Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>

          </ScrollView>
        </KeyboardAvoidingView>

        {/* Modal preview resultado importar */}
        <ManagedModal visible={modalConfirm} transparent animationType="none">
          <DraggableSheet
            onClose={() => { setModalConfirm(false); setErrorIA(null) }}
            scrollable={true}
          >
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 12 }}>
              <View style={styles.modalIaBadge}>
                <AntDesign name="thunderbolt" size={11} color="#9933ff" />
                <Text style={styles.modalIaBadgeText}>TRANSCRITO POR IA</Text>
              </View>
              {respuestaIA?.datos && (
                <>
                  <Text style={styles.modalTitulo}>{respuestaIA.datos.nombrePrograma}</Text>
                  <Text style={styles.modalDesc}>{respuestaIA.datos.descripcion}</Text>

                  <Text style={[styles.sectionLabel, { marginTop: 16 }]}>BLOQUES</Text>
                  {respuestaIA.datos.bloques?.map((b, i) => (
                    <AppleBentoCard key={i} style={styles.bloquePreview}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text style={styles.bloqueNombre}>{b.nombre}</Text>
                        <Text style={styles.bloqueSemanas}>{b.semanas} sem</Text>
                      </View>
                      <Text style={styles.bloqueTipo}>{b.tipo}</Text>
                      {Object.entries(b.ejerciciosPorDia || {}).map(([dia, ejs]) => (
                        <View key={dia} style={{ marginTop: 8 }}>
                          <Text style={styles.bloqueEjsTitulo}>
                            {DIAS_SEMANA[parseInt(dia)]} {b.etiquetasPorDia?.[dia] ? `— ${b.etiquetasPorDia[dia]}` : ''} · {ejs.length} ejercicios
                          </Text>
                          {ejs.map((e, j) => (
                            <Text key={j} style={styles.bloqueEj}>
                              · {e.nombre} — {e.series}×{e.repsMin}-{e.repsMax} RIR{e.rir}
                            </Text>
                          ))}
                        </View>
                      ))}
                    </AppleBentoCard>
                  ))}
                </>
              )}

              {errorIA && (
                <Text style={{ color: '#ff4455', fontSize: 13, marginTop: 12, textAlign: 'center' }}>{errorIA}</Text>
              )}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
                <Pressable
                  style={({ pressed }) => [styles.modalCancelarBtn, pressed && { opacity: 0.7 }]}
                  onPress={() => { setModalConfirm(false); setErrorIA(null) }}
                >
                  <Text style={styles.modalCancelarText}>Descartar</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.modalAplicarBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
                  onPress={aplicarPrograma}
                >
                  <LinearGradient colors={['#00aa66', '#007744']} style={styles.modalAplicarGradient}>
                    <AntDesign name="check" size={15} color="#fff" />
                    <Text style={styles.modalAplicarText}>Aplicar rutina</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </ScrollView>
          </DraggableSheet>
        </ManagedModal>
      </GradWrap>
    )
  }

  // ── Pantalla Ajustar ────────────────────────────────────────────
  if (modo === 'ajustar') {
    const progActivo = programa?.programas?.find(p => p.estado === 'activo')
    const containerStyle = inModal ? { padding: 20, paddingTop: 8, paddingBottom: 32 } : styles.container
    return (
      <GradWrap {...gradWrapProps}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={inModal ? 80 : 0}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={containerStyle}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <Pressable
                style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
                onPress={() => setModo(null)}
              >
                <AntDesign name="left" size={16} color={accentColor} />
              </Pressable>
              <Text style={styles.titulo}>Ajustar con IA</Text>
            </View>

            {/* Selector de programa — carrusel */}
            <Text style={styles.sectionLabel}>PROGRAMA A ANALIZAR</Text>
            {(() => {
              const disponibles = programa?.programas?.filter(p => p.estado !== 'archivado') || []
              if (!disponibles.length) return null
              const idx = Math.min(carruselIdx, disponibles.length - 1)
              const prog = disponibles[idx]
              return (
                <View style={styles.carruselWrap}>
                  {/* Flecha izquierda */}
                  <Pressable
                    style={({ pressed }) => [styles.carruselArrow, idx === 0 && styles.carruselArrowDis, pressed && { opacity: 0.6 }]}
                    onPress={() => navCarrusel(-1, disponibles.length)}
                    disabled={idx === 0}
                  >
                    <AntDesign name="left" size={16} color={idx === 0 ? 'rgba(255,255,255,0.1)' : accentColor} />
                  </Pressable>

                  {/* Card animada */}
                  <Animated.View style={[styles.carruselCard, { transform: [{ translateX: carruselAnim }] }]}>
                    <Text style={styles.carruselNombre}>{prog.nombre}</Text>
                    <Text style={styles.carruselMeta}>
                      {prog.bloques?.length || 0} bloques · {prog.semanas} sem
                    </Text>
                    <View style={styles.carruselEstadoBadge}>
                      <Text style={styles.carruselEstadoText}>{prog.estado}</Text>
                    </View>
                  </Animated.View>

                  {/* Flecha derecha */}
                  <Pressable
                    style={({ pressed }) => [styles.carruselArrow, idx >= disponibles.length - 1 && styles.carruselArrowDis, pressed && { opacity: 0.6 }]}
                    onPress={() => navCarrusel(1, disponibles.length)}
                    disabled={idx >= disponibles.length - 1}
                  >
                    <AntDesign name="right" size={16} color={idx === disponibles.length - 1 ? 'rgba(255,255,255,0.1)' : accentColor} />
                  </Pressable>
                </View>
              )
            })()}
            {/* Indicadores de posición */}
            {(() => {
              const disponibles = programa?.programas?.filter(p => p.estado !== 'archivado') || []
              if (disponibles.length <= 1) return null
              return (
                <View style={styles.carruselDots}>
                  {disponibles.map((_, i) => (
                    <View key={i} style={[styles.carruselDot, i === carruselIdx && styles.carruselDotActivo]} />
                  ))}
                </View>
              )
            })()}

            {/* Qué quiere ajustar */}
            <Text style={styles.sectionLabel}>¿QUÉ QUIERES MEJORAR?</Text>
            <TextInput
              style={[styles.notasInput, { minHeight: 100 }]}
              placeholder="Ej: quiero más volumen en piernas, reducir ejercicios de bíceps, ajustar el RIR para las últimas semanas..."
              placeholderTextColor="rgba(255,255,255,0.15)"
              multiline
              value={mensajeExtra}
              onChangeText={setMensajeExtra}
            />

            <View style={styles.infoCard}>
              <AntDesign name="info-circle" size={13} color="#8E8E93" />
              <Text style={styles.infoText}>
                La IA analizará tu programa completo y propondrá ajustes específicos con justificación de cada cambio
              </Text>
            </View>

            {errorIA && (
              <View style={styles.errorBox}>
                <AntDesign name="exclamation-circle" size={14} color="#ff3355" />
                <Text style={styles.errorText}>{errorIA}</Text>
              </View>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.generarBtn,
                pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }
              ]}
              onPress={ajustarPrograma}
              disabled={cargando}
            >
              <LinearGradient colors={[accentColor, accentColor + 'cc']} style={styles.generarGradient}>
                {cargando ? (
                  <>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={styles.generarText}>Analizando programa... {segundosCargando}s</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.generarText}>Analizar y ajustar</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Modal resultado ajustes */}
        <ManagedModal visible={modalConfirm} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <Pressable style={{ flex: 1 }} onPress={() => setModalConfirm(false)} />
            <View style={styles.modalBox}>
              <View style={styles.modalHandle} />
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={[styles.modalIaBadge, { backgroundColor: accentColor + '22', borderColor: accentColor + 'cc' }]}>
                  <Text style={[styles.modalIaBadgeText, { color: accentColor }]}>ANÁLISIS IA</Text>
                </View>

                {respuestaIA?.datos && (
                  <>
                    <Text style={styles.modalTitulo}>Análisis del programa</Text>
                    <Text style={styles.modalDesc}>{respuestaIA.datos.analisis}</Text>

                    <Text style={[styles.sectionLabel, { marginTop: 16 }]}>
                      AJUSTES PROPUESTOS ({respuestaIA.datos.ajustes?.length || 0})
                    </Text>
                    {respuestaIA.datos.ajustes?.map((a, i) => (
                      <AppleBentoCard key={i} style={styles.ajusteCard}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                          <Text style={styles.ajusteBloque}>{a.bloque} · {DIAS_SEMANA[a.dia]}</Text>
                          <View style={[styles.ajusteTipoBadge, {
                            backgroundColor: a.cambio === 'reemplazar' ? '#ff660022' :
                              a.cambio === 'agregar' ? '#00cc4422' :
                              a.cambio === 'eliminar' ? '#ff335522' : accentColor + '22'
                          }]}>
                            <Text style={[styles.ajusteTipoText, {
                              color: a.cambio === 'reemplazar' ? '#ff6600' :
                                a.cambio === 'agregar' ? '#00cc44' :
                                a.cambio === 'eliminar' ? '#ff3355' : accentColor
                            }]}>{a.cambio}</Text>
                          </View>
                        </View>
                        {a.ejercicioActual && (
                          <Text style={styles.ajusteEjActual}>
                            Actual: {a.ejercicioActual}
                          </Text>
                        )}
                        {a.ejercicioNuevo && (
                          <Text style={styles.ajusteEjNuevo}>
                            → {a.ejercicioNuevo} · {a.seriesNuevas}×{a.repsMinNuevas}-{a.repsMaxNuevas} RIR{a.rirNuevo}
                          </Text>
                        )}
                        <Text style={styles.ajusteRazon}>{a.razon}</Text>
                      </AppleBentoCard>
                    ))}

                    {respuestaIA.datos.recomendacionGeneral && (
                      <View style={styles.recomendacionCard}>
                        <Text style={styles.recomendacionLabel}>RECOMENDACIÓN GENERAL</Text>
                        <Text style={styles.recomendacionText}>{respuestaIA.datos.recomendacionGeneral}</Text>
                      </View>
                    )}
                  </>
                )}

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
                  <Pressable
                    style={({ pressed }) => [styles.modalCancelarBtn, pressed && { opacity: 0.7 }]}
                    onPress={() => setModalConfirm(false)}
                  >
                    <Text style={styles.modalCancelarText}>Cerrar</Text>
                  </Pressable>
                </View>
                <View style={{ height: 20 }} />
              </ScrollView>
            </View>
          </View>
        </ManagedModal>
      </GradWrap>
    )
  }

  return null
}

function createStyles(accent, acRgb, inModal = false) { return StyleSheet.create({
  gradient: { flex: 1 },
  container: { padding: 20, paddingTop: inModal ? 8 : 56, paddingBottom: inModal ? 32 : (LAYOUT.bottomTabSpace || 150) },

  // Header
  header: { alignItems: 'center', paddingVertical: 28 },
  iaBadge: {
    backgroundColor: 'rgba(153, 51, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(153, 51, 255, 0.25)',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 7,
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iaBadgeText: { color: '#9933ff', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  titulo: { fontSize: 26, fontWeight: '900', color: '#fff', marginBottom: 10, letterSpacing: -0.5 },
  subtitulo: { color: '#8E8E93', fontSize: 13, textAlign: 'center', lineHeight: 20, paddingHorizontal: 16, fontWeight: '500' },

  // Modos
  modoCard: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  modoCardDisabled: { borderColor: 'rgba(255,255,255,0.04)', opacity: 0.4 },
  modoGradient: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 16 },
  modoIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: 'rgba(153, 51, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(153, 51, 255, 0.15)',
  },
  modoEmoji: { fontSize: 24 },
  modoTitulo: { color: '#fff', fontSize: 16, fontWeight: '800', marginBottom: 4, letterSpacing: -0.2 },
  modoDesc: { color: '#8E8E93', fontSize: 12, lineHeight: 18, fontWeight: '500' },

  // Info
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 16,
    marginTop: 12,
  },
  infoText: { flex: 1, color: '#8E8E93', fontSize: 12, lineHeight: 18, fontWeight: '500' },

  // Back
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Sección labels
  sectionLabel: { color: '#8E8E93', fontSize: 10, fontWeight: '800', letterSpacing: 2, marginBottom: 12, textTransform: 'uppercase' },

  // Objetivos
  opcionesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  opcionBtn: {
    width: '47%',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
    gap: 8,
  },
  opcionBtnActivo: { borderColor: 'rgba(153, 51, 255, 0.35)', backgroundColor: 'rgba(153, 51, 255, 0.08)' },
  opcionLabel: { color: '#fff', fontSize: 14, fontWeight: '800' },
  opcionDesc: { color: '#8E8E93', fontSize: 11, textAlign: 'center', fontWeight: '500' },

  // Nivel
  nivelRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  nivelBtn: {
    flex: 1,
    minWidth: '45%',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
  },
  nivelBtnActivo: { borderColor: 'rgba(153, 51, 255, 0.35)', backgroundColor: 'rgba(153, 51, 255, 0.08)' },
  nivelText: { color: '#8E8E93', fontSize: 12, fontWeight: '700', textAlign: 'center' },

  // Días
  diasRow: { flexDirection: 'row', gap: 6 },
  diaBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
  },
  diaBtnActivo: { borderColor: 'rgba(153, 51, 255, 0.5)', backgroundColor: '#9933ff' },
  diaText: { color: '#8E8E93', fontSize: 12, fontWeight: '700' },

  // Semanas
  semanasRow: { flexDirection: 'row', gap: 8 },
  semanaBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
  },
  semanaBtnActivo: { borderColor: 'rgba(153, 51, 255, 0.35)', backgroundColor: 'rgba(153, 51, 255, 0.08)' },
  semanaText: { color: '#8E8E93', fontSize: 15, fontWeight: '800' },

  // Equipamento (flex:1 para 3 botones iguales en fila)
  equipRow: { flexDirection: 'row', gap: 8 },
  equipBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
  },
  equipBtnActivo: { borderColor: 'rgba(153, 51, 255, 0.35)', backgroundColor: 'rgba(153, 51, 255, 0.08)' },
  equipText: { color: '#8E8E93', fontSize: 13, fontWeight: '700' },

  // Chips para splits, grupos y complementos (auto-width, wrappable)
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
  },
  chipActivo: { borderColor: `rgba(${acRgb},0.4)`, backgroundColor: `rgba(${acRgb},0.1)` },
  chipLabel: { color: '#8E8E93', fontSize: 13, fontWeight: '600' },
  chipLabelActivo: { color: accent },
  chipDesc: { color: 'rgba(255,255,255,0.25)', fontSize: 10, marginTop: 2 },

  // Notas
  notasInput: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: 18,
    color: '#fff',
    fontSize: 14,
    lineHeight: 22,
    minHeight: 100,
    textAlignVertical: 'top',
    fontWeight: '500',
  },

  // Error
  errorBox: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 51, 85, 0.06)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 51, 85, 0.15)',
    padding: 16,
    marginVertical: 10,
  },
  errorText: { flex: 1, color: '#ff3355', fontSize: 12, fontWeight: '600' },

  // Botón generar
  generarBtn: { borderRadius: 20, overflow: 'hidden', marginTop: 28 },
  generarGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 18 },
  generarText: { color: '#fff', fontSize: 15, fontWeight: '900', letterSpacing: 1 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.85)', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: 'rgba(10, 12, 28, 0.98)',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderBottomWidth: 0,
    maxHeight: '88%',
  },
  modalHandle: { width: 36, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.12)', alignSelf: 'center', marginBottom: 16, marginTop: 4 },
  modalIaBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(153, 51, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(153, 51, 255, 0.25)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginBottom: 14,
  },
  modalIaBadgeText: { color: '#9933ff', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  modalTitulo: { fontSize: 24, fontWeight: '900', color: '#fff', marginBottom: 8, letterSpacing: -0.5 },
  modalDesc: { color: '#8E8E93', fontSize: 14, lineHeight: 22, marginBottom: 12, fontWeight: '500' },

  // Bloque preview
  bloquePreview: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 18,
    marginBottom: 12,
  },
  bloqueNombre: { color: '#fff', fontSize: 15, fontWeight: '800', marginBottom: 4 },
  bloqueSemanas: { color: '#9933ff', fontSize: 12, fontWeight: '700' },
  bloqueTipo: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 1, backgroundColor: 'rgba(153,51,255,0.25)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' },
  bloqueEjsTitulo: { color: accent, fontSize: 11, fontWeight: '800', marginBottom: 6, marginTop: 10 },
  bloqueEj: { color: '#8E8E93', fontSize: 12, marginBottom: 4, fontWeight: '500' },
  bloqueEjMas: { color: 'rgba(255,255,255,0.15)', fontSize: 11, fontStyle: 'italic', marginTop: 2 },

  // Botones modal
  modalCancelarBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
  },
  modalCancelarText: { color: '#8E8E93', fontWeight: '800', fontSize: 14 },
  modalAplicarBtn: { flex: 2, borderRadius: 16, overflow: 'hidden' },
  modalAplicarGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16 },
  modalAplicarText: { color: '#fff', fontWeight: '900', fontSize: 15, letterSpacing: 0.5 },

  // Ajustes
  ajusteCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 18,
    marginBottom: 12,
  },
  ajusteBloque: { color: accent, fontSize: 12, fontWeight: '800', marginBottom: 4 },
  ajusteTipoBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  ajusteTipoText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5, textTransform: 'uppercase' },
  ajusteEjActual: { color: 'rgba(255, 51, 85, 0.5)', fontSize: 13, marginBottom: 4, textDecorationLine: 'line-through', fontWeight: '500' },
  ajusteEjNuevo: { color: '#00cc44', fontSize: 14, fontWeight: '800', marginBottom: 8 },
  ajusteRazon: { color: '#8E8E93', fontSize: 12, lineHeight: 18, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 12, marginTop: 8, fontWeight: '500' },

  // Recomendación
  recomendacionCard: {
    backgroundColor: `rgba(${acRgb},0.04)`,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: `rgba(${acRgb},0.15)`,
    padding: 20,
    marginTop: 12,
  },
  recomendacionLabel: { color: accent, fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 10 },
  recomendacionText: { color: '#fff', fontSize: 14, lineHeight: 22, fontWeight: '500' },

  // Programa activo
  progActivoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: `rgba(${acRgb},0.15)`,
    padding: 18,
    marginBottom: 20,
  },
  progActivoLabel: { color: '#8E8E93', fontSize: 9, fontWeight: '800', letterSpacing: 1.5, marginBottom: 4 },
  progActivoNombre: { color: '#fff', fontSize: 18, fontWeight: '900', marginBottom: 2 },
  progActivoMeta: { color: accent, fontSize: 12, fontWeight: '700' },
  progSelectorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 20,
    padding: 18,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  progSelectorItemActivo: { borderColor: `rgba(${acRgb},0.3)`, backgroundColor: `rgba(${acRgb},0.06)` },
  progSelectorNombre: { color: '#fff', fontSize: 15, fontWeight: '800', marginBottom: 4 },
  progSelectorMeta: { color: '#8E8E93', fontSize: 12, fontWeight: '500' },
  carruselWrap: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  carruselArrow: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  carruselArrowDis: { borderColor: 'rgba(255,255,255,0.04)', backgroundColor: 'transparent', opacity: 0.3 },
  carruselCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 20,
  },
  carruselNombre: { color: '#fff', fontSize: 17, fontWeight: '900', marginBottom: 6, letterSpacing: -0.3 },
  carruselMeta: { color: '#8E8E93', fontSize: 13, marginBottom: 14, fontWeight: '500' },
  carruselEstadoBadge: {
    alignSelf: 'flex-start',
    backgroundColor: `rgba(${acRgb},0.08)`,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: `rgba(${acRgb},0.2)`,
  },
  carruselEstadoText: { color: accent, fontSize: 10, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  carruselDots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 20 },
  carruselDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.08)' },
  carruselDotActivo: { width: 22, backgroundColor: accent, borderRadius: 3 },

  // Importar
  inputWrap: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginBottom: 16,
  },
  input: {
    color: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    fontWeight: '500',
  },
  generateBtn: { borderRadius: 20, overflow: 'hidden', marginTop: 24 },
  generateBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 18 },
  generateBtnText: { color: '#fff', fontSize: 15, fontWeight: '900', letterSpacing: 1 },
  modalConfirmContent: { padding: 4 },
  modalConfirmTitle: { color: '#fff', fontSize: 20, fontWeight: '900', marginBottom: 8 },
  modalConfirmSub: { color: '#8E8E93', fontSize: 13, lineHeight: 20, fontWeight: '500' },
  modalBtn: {
    padding: 15, borderRadius: 16, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center',
  },
  modalBtnText: { color: '#8E8E93', fontWeight: '800', fontSize: 14 },
  modalBtnPrimary: { padding: 15, borderRadius: 16, backgroundColor: '#00aa66', alignItems: 'center' },
  modalBtnPrimaryText: { color: '#fff', fontWeight: '900', fontSize: 14 },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.06)' },
  dividerLabel: { color: 'rgba(255,255,255,0.2)', fontSize: 11, fontWeight: '600' },
}) }
