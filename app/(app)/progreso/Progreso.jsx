// ============================================
// PROGRESO.JSX — Análisis de progreso real
// ============================================
import { useState, useRef, useEffect, useContext, useMemo } from 'react'
import { View, Text, StyleSheet, ScrollView, Dimensions, ActivityIndicator, TextInput, Animated, Easing, Platform, Vibration, TouchableOpacity, Pressable, Keyboard, LayoutAnimation } from 'react-native'

import { LinearGradient } from 'expo-linear-gradient'
import ManagedModal from '../../../components/ManagedModal'
import DraggableSheet from '../../../components/DraggableSheet'
import CardEntrance from '../../../components/CardEntrance'
import StaggerChildren from '../../../components/StaggerChildren'
import { AntDesign } from '@expo/vector-icons'
import { LineChart } from 'react-native-chart-kit'
import { useFocusEffect } from '@react-navigation/native'
import { useCallback } from 'react'
import { cargarPrograma, guardarYSincronizar, guardarMetrica, cargarMetricas, eliminarMetrica, guardarSalud, cargarSalud, eliminarSalud } from '../../../lib/storage'
import { supabase } from '../../../lib/supabase'
import { LAYOUT } from '../../../components/constans'
import AppleBentoCard from '../../../components/AppleBentoCard'
import DeleteConfirmModal from '../../../components/DeleteConfirmModal'
import * as Haptics from 'expo-haptics'
import { CoachThemeContext, hexToRgb } from '../../../lib/coachTheme'

const screenWidth = Dimensions.get('window').width

// ─── Calendario selector (compartido con ListaProgramas) ──────────
function CalendarioSelector({ fechaInicio, onSeleccionar, onCerrar }) {
  const { accentColor, gradColors } = useContext(CoachThemeContext)
  const acRgb = hexToRgb(accentColor)
  const [año, mes, dia] = fechaInicio.split('-').map(Number)
  const fechaSeleccionada = new Date(año, mes - 1, dia)
  const [mesActual, setMesActual] = useState(new Date(fechaSeleccionada))
  const hoy = new Date()
  const primerDia = new Date(mesActual.getFullYear(), mesActual.getMonth(), 1)
  const ultimoDia = new Date(mesActual.getFullYear(), mesActual.getMonth() + 1, 0)
  const diasEnMes = ultimoDia.getDate()
  const primerDiaSemana = primerDia.getDay()
  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  function cambiarMes(dir) {
    const n = new Date(mesActual); n.setMonth(mesActual.getMonth() + dir); setMesActual(n)
  }
  function seleccionarFecha(d) {
    const nueva = new Date(mesActual.getFullYear(), mesActual.getMonth(), d)
    const a = nueva.getFullYear()
    const m = String(nueva.getMonth() + 1).padStart(2, '0')
    const ds = String(nueva.getDate()).padStart(2, '0')
    onSeleccionar(`${a}-${m}-${ds}`); onCerrar()
  }
  return (
    <>
      <View style={calStyles.nav}>
        <TouchableOpacity onPress={() => cambiarMes(-1)} style={[calStyles.navBtn, { borderColor: `rgba(${acRgb},0.3)`, backgroundColor: `rgba(${acRgb},0.1)` }]}><AntDesign name="left" size={16} color={accentColor} /></TouchableOpacity>
        <Text style={calStyles.mesAnio}>{meses[mesActual.getMonth()]} {mesActual.getFullYear()}</Text>
        <TouchableOpacity onPress={() => cambiarMes(1)} style={[calStyles.navBtn, { borderColor: `rgba(${acRgb},0.3)`, backgroundColor: `rgba(${acRgb},0.1)` }]}><AntDesign name="right" size={16} color={accentColor} /></TouchableOpacity>
      </View>
      <View style={calStyles.semana}>
        {['D','L','M','M','J','V','S'].map((d,i) => <Text key={i} style={[calStyles.semanaText, { color: `rgba(${acRgb},0.45)` }]}>{d}</Text>)}
      </View>
      <View style={calStyles.grid}>
        {Array.from({ length: primerDiaSemana }).map((_,i) => <View key={`e-${i}`} style={calStyles.vacio} />)}
        {Array.from({ length: diasEnMes }).map((_,i) => {
          const d = i + 1
          const fecha = new Date(mesActual.getFullYear(), mesActual.getMonth(), d)
          const esHoy = fecha.toDateString() === hoy.toDateString()
          const esSel = fecha.toDateString() === fechaSeleccionada.toDateString()
          return (
            <TouchableOpacity key={d} style={[calStyles.dia, esHoy && [calStyles.diaHoy, { backgroundColor: `rgba(${acRgb},0.15)`, borderColor: `rgba(${acRgb},0.5)` }], esSel && [calStyles.diaSel, { backgroundColor: accentColor, shadowColor: accentColor }]]} onPress={() => seleccionarFecha(d)}>
              <Text style={[calStyles.diaText, esHoy && [calStyles.diaHoyText, { color: accentColor }], esSel && calStyles.diaSelText]}>{d}</Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </>
  )
}
const calStyles = StyleSheet.create({
  nav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  navBtn: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
  mesAnio: { fontSize: 16, fontWeight: '900', color: '#fff' },
  semana: { flexDirection: 'row', marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#0f1a3a' },
  semanaText: { flex: 1, textAlign: 'center', color: '#2a4488', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  vacio: { width: '14.28%', aspectRatio: 1 },
  dia: { width: '13.5%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 10, margin: '0.35%', backgroundColor: 'rgba(255,255,255,0.03)' },
  diaHoy: { borderWidth: 1 },
  diaSel: { shadowOpacity: 0.6, shadowRadius: 8, elevation: 6 },
  diaText: { color: 'rgba(200,210,230,0.7)', fontSize: 12, fontWeight: '600' },
  diaHoyText: { fontWeight: '900' },
  diaSelText: { color: '#fff', fontWeight: '900' },
})

// ─── Perfiles clínicos ───────────────────────────────────────────────────────
// AVISO: Los rangos "culturista" y "avanzado" son "Rango Objetivo" del usuario,
// NO referencias médicas estándar. La responsabilidad es del usuario y su equipo.
const PERFILES_SALUD = {
  recreativo: {
    label: 'Recreativo',
    glucosa: {
      Ayunas:           { lo: 70,  hi: 99,  hiHipo: 70  },
      '2h post-comida': { lo: null, hi: 140, hiHipo: 70  },
      'Post-ejercicio': { lo: null, hi: 140, hiHipo: 70  },
      Aleatoria:        { lo: 70,  hi: 140, hiHipo: 70  },
    },
    presion: { s_lo: null, s_hi: 120, d_lo: null, d_hi: 80 },
  },
  culturista: {
    label: 'Culturista / Prep',
    glucosa: {
      Ayunas:           { lo: 65,  hi: 90,  hiHipo: 60  },
      '2h post-comida': { lo: null, hi: 120, hiHipo: 60  },
      'Post-ejercicio': { lo: null, hi: 120, hiHipo: 60  },
      Aleatoria:        { lo: 65,  hi: 120, hiHipo: 60  },
    },
    presion: { s_lo: 110, s_hi: 125, d_lo: null, d_hi: 80 },
  },
  avanzado: {
    label: 'Avanzado',
    glucosa: {
      Ayunas:           { lo: 75,  hi: 105, hiHipo: 70  },
      '2h post-comida': { lo: null, hi: 160, hiHipo: 70  },
      'Post-ejercicio': { lo: null, hi: 160, hiHipo: 70  },
      Aleatoria:        { lo: 70,  hi: 160, hiHipo: 70  },
    },
    presion: { s_lo: 115, s_hi: 130, d_lo: null, d_hi: 85 },
  },
}

// Devuelve { lo, hi, hiHipo, refText, isPersonalizada }
function getGlucosaRef(ctx, perfil, manuales) {
  const base = PERFILES_SALUD[perfil]?.glucosa?.[ctx] || PERFILES_SALUD.recreativo.glucosa.Ayunas
  const mKey = `glucosa_${ctx}`
  const lo   = manuales[mKey + '_lo'] != null ? Number(manuales[mKey + '_lo']) : base.lo
  const hi   = manuales[mKey + '_hi'] != null ? Number(manuales[mKey + '_hi']) : base.hi
  const isPersonalizada = manuales[mKey + '_lo'] != null || manuales[mKey + '_hi'] != null
  const refText = isPersonalizada ? 'Ref. Personalizada'
    : perfil !== 'recreativo' ? 'Rango Objetivo'
    : 'Ref. Médica'
  return { lo, hi, hiHipo: base.hiHipo, refText, isPersonalizada }
}

// Devuelve { s_lo, s_hi, d_hi, refText, isPersonalizada } + zonas para CandleChart
function getPresionRef(perfil, manuales) {
  const base = PERFILES_SALUD[perfil]?.presion || PERFILES_SALUD.recreativo.presion
  const s_lo = manuales.presion_s_lo != null ? Number(manuales.presion_s_lo) : base.s_lo
  const s_hi = manuales.presion_s_hi != null ? Number(manuales.presion_s_hi) : base.s_hi
  const d_hi = manuales.presion_d_hi != null ? Number(manuales.presion_d_hi) : base.d_hi
  const isPersonalizada = Object.keys(manuales).some(k => k.startsWith('presion_'))
  const refText = isPersonalizada ? 'Ref. Personalizada'
    : perfil !== 'recreativo' ? 'Rango Objetivo'
    : 'Ref. Médica'
  return { s_lo, s_hi, d_hi, refText, isPersonalizada }
}

// Calcula baseline HRV (promedio móvil últimos 14 registros) y zona del valor dado
function getHrvZone(value, registrosSalud, ctxFiltro) {
  const ctxKey = 'hrv_ctx'
  const vals = registrosSalud
    .filter(r => r.hrv != null && (!ctxFiltro || r[ctxKey] === ctxFiltro))
    .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))
    .slice(0, 14)
    .map(r => Number(r.hrv))
    .filter(v => !isNaN(v))
  if (vals.length < 3) return { baseline: null, zona: null }
  const baseline = vals.reduce((a, b) => a + b, 0) / vals.length
  const pct = (baseline - value) / baseline
  const zona = pct < 0.05 ? 'verde' : pct < 0.10 ? 'amarillo' : 'rojo'
  return { baseline: Math.round(baseline), zona }
}

const METRICAS_SALUD = [
  { key: 'glucosa',     label: 'Glucosa',     unit: 'mg/dL', color: '#ff6600', tipo: 'glucosa', placeholder: '95',  ref: '70-100',
    desc: 'Nivel de azúcar en sangre. Indica cómo tu cuerpo regula la energía. Valores altos sostenidos aumentan el riesgo metabólico.',
    refsCtx: { 'Ayunas': '70-100', '2h post-comida': '<140', 'Post-ejercicio': '<140', 'Aleatoria': '70-140' },
    contextos: ['Ayunas', '2h post-comida', 'Post-ejercicio', 'Aleatoria'] },
  { key: 'presion',     label: 'Presión',     unit: 'mmHg',  color: '#ff3355', tipo: 'presion', placeholder: '120/80', ref: '<120/80',
    desc: 'Fuerza que ejerce la sangre sobre las arterias. La primera cifra es sistólica (contracción) y la segunda diastólica (reposo). Ref: <120/80 mmHg.',
    contextos: ['Mañana', 'Tarde', 'Noche', 'Post-ejercicio'] },
  { key: 'sueno',       label: 'Sueño',       unit: 'hrs',   color: '#9933ff', tipo: 'number', placeholder: '7.5', ref: '7-9',
    desc: 'Horas de sueño por noche. Dormir menos de 7h afecta la recuperación muscular, el cortisol y la composición corporal.',
    contextos: null },
  { key: 'hidratacion', label: 'Hidratación', unit: 'L',     color: '#4488ff', tipo: 'number', placeholder: '2.5', ref: '2-3',
    desc: 'Litros de agua consumidos al día. Una hidratación adecuada mejora el rendimiento, la recuperación y la función cognitiva.',
    contextos: null },
  { key: 'energia',     label: 'Energía',     unit: '/10',   color: '#ffcc00', tipo: 'escala', placeholder: '',    ref: '',
    desc: 'Percepción subjetiva de energía del día (1-10). Útil para correlacionar con sueño, nutrición y carga de entrenamiento.',
    contextos: null },
  { key: 'doms',        label: 'DOMS',        unit: '/10',   color: '#ff9900', tipo: 'escala', placeholder: '',    ref: '',
    desc: 'Dolor muscular de aparición tardía (1-10). Valores altos sostenidos indican recuperación insuficiente o sobreentrenamiento.',
    contextos: null },
  { key: 'hrv',         label: 'HRV',         unit: 'ms',    color: '#00cc44', tipo: 'number', placeholder: '65',  ref: '>50',
    desc: 'Variabilidad de frecuencia cardíaca. Mide la capacidad de recuperación del sistema nervioso autónomo. Mayor HRV = mejor estado de recuperación.',
    contextos: null },
]
const CONTEXTOS_INICIALES = Object.fromEntries(
  METRICAS_SALUD.filter(m => m.contextos).map(m => [m.key, [...m.contextos]])
)

// ─── WaveCard — emerge del fondo con spring Apple-compliant ───────────────
// stiffness:150 damping:20 translateY:8px — sin scale para no "volar"
function WaveCard({ delay = 0, style, children }) {
  const opacity    = useRef(new Animated.Value(0)).current
  const translateY = useRef(new Animated.Value(6)).current
  useEffect(() => {
    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity,    { toValue: 1, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, stiffness: 150, damping: 20, useNativeDriver: true }),
      ]).start()
    }, delay)
    return () => clearTimeout(t)
  }, [])
  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  )
}


// ─── PresionCandleChart — gráfica de velas para presión arterial ──────────────
// Zonas de referencia clínica (mmHg):
//   Verde  : sistólica <120 y diastólica <80  (normal/óptima)
//   Amarillo: sistólica 120-129               (elevada)
//   Naranja : sistólica 130-139               (HTA grado 1)
//   Rojo    : sistólica ≥140                  (HTA grado 2+)
const PRES_ZONES = [
  { lo: 0,   hi: 80,  fill: 'rgba(0,204,68,0.07)',   line: null },
  { lo: 80,  hi: 120, fill: 'rgba(0,204,68,0.05)',   line: { val: 120, label: '120', color: 'rgba(0,204,68,0.5)' } },
  { lo: 120, hi: 130, fill: 'rgba(255,204,0,0.07)',  line: { val: 130, label: '130', color: 'rgba(255,204,0,0.4)' } },
  { lo: 130, hi: 140, fill: 'rgba(255,153,0,0.06)',  line: { val: 140, label: '140', color: 'rgba(255,153,0,0.4)' } },
  { lo: 140, hi: 999, fill: 'rgba(255,51,85,0.06)',  line: null },
]

function PresionCandleChart({ data, color, width, zones }) {
  if (!data.length) return null
  const CHART_H   = 220
  const BAR_W     = 10
  const TICK_W    = 20
  const LABEL_COL = 28   // ancho reservado para etiquetas de zona izquierda
  const allVals   = data.flatMap(d => [d.s, d.d])
  const minY      = Math.min(...allVals) - 12
  const maxY      = Math.max(...allVals) + 12
  const range     = maxY - minY || 1
  const chartW    = width - LABEL_COL
  const ITEM_W    = Math.max(44, chartW / Math.min(data.length, 8))
  const ACTIVE_ZONES = zones || PRES_ZONES  // usa zonas dinámicas del perfil, o las estáticas por defecto

  function toY(val) { return CHART_H * (1 - (val - minY) / range) }

  // Construir franjas y líneas de referencia visibles en el rango actual
  const bandas = ACTIVE_ZONES.map(z => {
    const hi = Math.min(z.hi, maxY)
    const lo = Math.max(z.lo, minY)
    if (hi <= lo) return null
    const top = toY(hi)
    const bot = toY(lo)
    return { top, height: Math.max(bot - top, 0), fill: z.fill, line: z.line && z.line.val >= minY && z.line.val <= maxY ? z.line : null }
  }).filter(Boolean)

  const totalW = Math.max(data.length * ITEM_W, chartW)

  return (
    <View style={{ flexDirection: 'row' }}>
      {/* Columna izquierda — etiquetas de zona */}
      <View style={{ width: LABEL_COL, height: CHART_H, position: 'relative' }}>
        {bandas.map((b, i) => b.line && (
          <Text key={i} style={{ position: 'absolute', top: b.line ? toY(b.line.val) - 7 : 0, right: 4, fontSize: 8, fontWeight: '700', color: b.line.color }}>
            {b.line.label}
          </Text>
        ))}
      </View>

      {/* Gráfica scrollable */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
        <View style={{ width: totalW, height: CHART_H + 36 }}>
          {/* Franjas de fondo */}
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: CHART_H }}>
            {bandas.map((b, i) => (
              <View key={i} style={{ position: 'absolute', top: b.top, left: 0, right: 0, height: b.height, backgroundColor: b.fill }} />
            ))}
            {/* Líneas horizontales de referencia */}
            {bandas.map((b, i) => b.line && (
              <View key={`l${i}`} style={{ position: 'absolute', top: toY(b.line.val), left: 0, right: 0, height: 1, backgroundColor: b.line.color }} />
            ))}
          </View>

          {/* Velas */}
          <View style={{ flexDirection: 'row', height: CHART_H }}>
            {data.map((d, i) => {
              const yTop  = toY(d.s)
              const yBot  = toY(d.d)
              const barH  = Math.max(yBot - yTop, 4)
              const label = new Date(d.fecha.includes('T') ? d.fecha : d.fecha + 'T12:00:00')
                .toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }).replace('.', '')
              return (
                <View key={i} style={{ width: ITEM_W, alignItems: 'center', position: 'relative' }}>
                  {/* Barra vertical */}
                  <View style={{ position: 'absolute', top: yTop, left: (ITEM_W - BAR_W) / 2, width: BAR_W, height: barH, borderRadius: 5, backgroundColor: color + 'bb' }} />
                  {/* Tick superior (sistólica) */}
                  <View style={{ position: 'absolute', top: yTop - 2, left: (ITEM_W - TICK_W) / 2, width: TICK_W, height: 4, borderRadius: 2, backgroundColor: color }} />
                  {/* Valor sistólica */}
                  <Text style={{ position: 'absolute', top: yTop - 16, left: 0, width: ITEM_W, textAlign: 'center', color, fontSize: 9, fontWeight: '800' }}>{d.s}</Text>
                  {/* Tick inferior (diastólica) */}
                  <View style={{ position: 'absolute', top: yBot - 2, left: (ITEM_W - TICK_W) / 2, width: TICK_W, height: 4, borderRadius: 2, backgroundColor: color + '77' }} />
                  {/* Valor diastólica */}
                  <Text style={{ position: 'absolute', top: yBot + 4, left: 0, width: ITEM_W, textAlign: 'center', color: color + 'aa', fontSize: 9, fontWeight: '700' }}>{d.d}</Text>
                </View>
              )
            })}
          </View>

          {/* Etiquetas fecha + contexto */}
          <View style={{ flexDirection: 'row', height: 36, alignItems: 'flex-start', paddingTop: 4 }}>
            {data.map((d, i) => {
              const label = new Date(d.fecha.includes('T') ? d.fecha : d.fecha + 'T12:00:00')
                .toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }).replace('.', '')
              return (
                <View key={i} style={{ width: ITEM_W, alignItems: 'center' }}>
                  <Text style={{ fontSize: 9, color: 'rgba(142,142,147,0.8)', textAlign: 'center' }}>{label}</Text>
                  {d.ctx && <Text style={{ fontSize: 8, color: color + '88', textAlign: 'center' }}>{d.ctx.split(' ')[0]}</Text>}
                </View>
              )
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

export default function Progreso({ userId, modoCoach = false }) {
  const { accentColor, gradColors } = useContext(CoachThemeContext)
  const acRgb = hexToRgb(accentColor)
  const styles = useMemo(() => createStyles(accentColor, acRgb), [accentColor])
  const [tabActivo, setTabActivo] = useState('ejercicios')
  const [programa, setPrograma] = useState({ programas: [], dias: {} })
  const [programaSeleccionado, setProgramaSeleccionado] = useState('todos')
  const [bloqueSeleccionado, setBloqueSeleccionado] = useState('todos')
  const [ejercicioSeleccionado, setEjercicioSeleccionado] = useState(null)
  const [metricaSeleccionada, setMetricaSeleccionada] = useState('peso')
  const [mostrarSelectorEjercicios, setMostrarSelectorEjercicios] = useState(false)
  const [sesionAEliminar, setSesionAEliminar] = useState(null)
  const [sesionActivaIndex, setSesionActivaIndex] = useState(0)
  const [mostrarFiltroDropdown, setMostrarFiltroDropdown] = useState(false)
  const [progExpandido, setProgExpandido] = useState(null)
  const [cargando, setCargando] = useState(true)

  // Métricas corporales
  const [metricas, setMetricas] = useState([])
  const [metricaCuerpo, setMetricaCuerpo] = useState('peso')
  const [formVisible, setFormVisible] = useState(false)
  const [nuevaMetrica, setNuevaMetrica] = useState({ peso: '', grasaPct: '', musculoPct: '', unidad: 'kg' })
  const [fechaMetrica, setFechaMetrica] = useState(new Date().toISOString().split('T')[0])
  const [mostrarCalendarioCuerpo, setMostrarCalendarioCuerpo] = useState(false)
  const [metricaAEliminar, setMetricaAEliminar] = useState(null)
  const [registrosSalud, setRegistrosSalud] = useState([])
  const [lastSaludKey, setLastSaludKey] = useState(null)
  const [saludFormVisible, setSaludFormVisible] = useState(false)
  const saludOverlayAnim = useRef(new Animated.Value(0)).current
  const saludBtnRef       = useRef(null)
  const saludCardRef      = useRef(null)
  const [saludOriginRect, setSaludOriginRect]         = useState(null)
  const cuerpoOverlayAnim = useRef(new Animated.Value(0)).current
  const cuerpoRegistrarBtnRef = useRef(null)
  const cuerpoCardRef     = useRef(null)
  const cuerpoFormClosingRef = useRef(false)
  const [cuerpoRegistrarOriginRect, setCuerpoRegistrarOriginRect] = useState(null)
  const filtroBtnRef      = useRef(null)
  const filtroModalCardRef= useRef(null)
  const [filtroOriginRect, setFiltroOriginRect]       = useState(null)
  const ejercicioBtnRef   = useRef(null)
  const ejercicioModalCardRef = useRef(null)
  const [ejercicioOriginRect, setEjercicioOriginRect] = useState(null)
  const filtroCal1Ref     = useRef(null)
  const filtroCal2Ref     = useRef(null)
  const calCuerpoModalRef = useRef(null)
  const [saludAEliminar, setSaludAEliminar] = useState(null) // { indices: [], fechaKey: '' }
  const [filtroFechaDesde, setFiltroFechaDesde] = useState(null)
  const [filtroFechaHasta, setFiltroFechaHasta] = useState(null)
  const [mostrarFiltroFecha, setMostrarFiltroFecha] = useState(false)
  const [filtroCalendarioActivo, setFiltroCalendarioActivo] = useState(null) // 'desde' | 'hasta'
  const [historialExpandido, setHistorialExpandido] = useState(false)
  const [cuerpoExpandido, setCuerpoExpandido] = useState(false)
  const [filtroFechaDesdeCuerpo, setFiltroFechaDesdeCuerpo] = useState(null)
  const [filtroFechaHastaCuerpo, setFiltroFechaHastaCuerpo] = useState(null)
  const [mostrarFiltroCuerpo, setMostrarFiltroCuerpo] = useState(false)
  const [filtroCalCuerpoActivo, setFiltroCalCuerpoActivo] = useState(null)
  const [metricaSaludGrafica, setMetricaSaludGrafica] = useState('glucosa')
  const [filtroContextoGrafica, setFiltroContextoGrafica] = useState(null)
  const [filtroRangoGrafica, setFiltroRangoGrafica] = useState('mes') // 'semana' | 'mes' | 'todo'
  const [metricaTooltip, setMetricaTooltip] = useState(null) // { key, desc, color, label, y }
  const metricaBtnRefs = useRef({})
  const tooltipTimer = useRef(null)
  const tooltipAnim = useRef(new Animated.Value(0)).current
  const [metricasHabilitadas, setMetricasHabilitadas] = useState(METRICAS_SALUD.map(m => m.key).filter(k => k !== 'hrv'))
  const [contextosHabilitados, setContextosHabilitados] = useState(CONTEXTOS_INICIALES)
  const [modalMetricasConfig, setModalMetricasConfig] = useState(false)
  const [metricaExpandida, setMetricaExpandida] = useState(null)
  const [perfilSalud, setPerfilSalud] = useState('recreativo')
  const [limitesManuales, setLimitesManuales] = useState({})
  const expandAnims = useRef(
    Object.fromEntries(METRICAS_SALUD.filter(m => m.contextos).map(m => [m.key, new Animated.Value(0)]))
  ).current
  const [metricasSeleccionadas, setMetricasSeleccionadas] = useState([])
  const [nuevaSalud, setNuevaSalud] = useState({
    glucosa: '', presion_sistolica: '', presion_diastolica: '',
    sueno: '', hidratacion: '', hrv: '', energia: '', doms: ''
  })
  const [contextosSalud, setContextosSalud] = useState({})
  const [fechaSalud, setFechaSalud] = useState(new Date().toISOString().split('T')[0])
  const [mostrarCalendarioSalud, setMostrarCalendarioSalud] = useState(false)
  const [kbHeight, setKbHeight] = useState(0)
  const formAnim = useRef(new Animated.Value(0)).current
  const formHeight = useRef(new Animated.Value(0)).current
  const saludCalendarRef  = useRef(null)
  const saludCampoRefs    = useRef({})
  const guardarBtnRef     = useRef(null)
  const cuerpoFiltroRef   = useRef(null)
  const saludFiltroRef    = useRef(null)
  const bloquesRefs      = useRef({})
  const [showGuardar, setShowGuardar] = useState(false)
  // Haptic suave cuando la gráfica termina de entrar (~200ms delay + ~300ms spring)
  useEffect(() => {
    const t = setTimeout(() => {
      if (Platform.OS === 'android') Vibration.vibrate(30)
    }, 500)
    return () => clearTimeout(t)
  }, [tabActivo])

  useEffect(() => {
    const meta = METRICAS_SALUD.find(m => m.key === metricaSaludGrafica)
    if (meta?.contextos?.length) {
      const ctxKey = metricaSaludGrafica === 'glucosa' ? 'glucosa_ctx'
        : metricaSaludGrafica === 'presion' ? 'presion_ctx'
        : metricaSaludGrafica === 'hrv' ? 'hrv_ctx' : null
      if (ctxKey) {
        const ctxHabilitados = contextosHabilitados[metricaSaludGrafica] || meta.contextos
        const ctxOrdenados = (meta.contextos || []).filter(ctx => ctxHabilitados.includes(ctx))
        const firstCtx = ctxOrdenados.find(ctx => registrosSalud.some(r => r[ctxKey] === ctx))
        setFiltroContextoGrafica(firstCtx || null)
        return
      }
    }
    setFiltroContextoGrafica(null)
  }, [metricaSaludGrafica, registrosSalud])

  useFocusEffect(useCallback(() => {
    if (!userId) return
    cargarDatos()
  }, [userId]))

  useEffect(() => {
    if (!userId) return
    cargarDatos()
  }, [userId])

  useEffect(() => {
    const modalAbierto = formVisible || saludFormVisible
    if (!modalAbierto) { setKbHeight(0); return }
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'
    const subShow = Keyboard.addListener(showEvent, e => setKbHeight(e.endCoordinates.height))
    const subHide = Keyboard.addListener(hideEvent, () => setKbHeight(0))
    return () => { subShow.remove(); subHide.remove() }
  }, [formVisible, saludFormVisible])

  // Recargar cuando guardarSesion escribe el flag (sin necesitar focus)
  useEffect(() => {
    if (!userId) return
    let ultimo = null
    const intervalo = setInterval(async () => {
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default
        const val = await AsyncStorage.getItem('repforge_refresh_progreso')
        if (val && val !== ultimo) {
          ultimo = val
          cargarDatos()
        }
      } catch(e) {}
    }, 800)
    return () => clearInterval(intervalo)
  }, [userId])

  async function cargarDatos() {
    setCargando(true)
    const data = await cargarPrograma(userId)
    setPrograma(data)
    const mets = await cargarMetricas(userId)
    setMetricas(mets)

    const saludRaw = await cargarSalud(userId)
    // Migración: separar registros que mezclan glucosa/presión con otras métricas
    const saludMigrada = []
    const AsyncStorage = require('@react-native-async-storage/async-storage').default
    let necesitaMigrar = false
    saludRaw.forEach(r => {
      const tieneGlucosaOPresion = r.glucosa != null || r.presion
      const tieneOtras = r.sueno != null || r.hidratacion != null || r.hrv != null || r.energia != null || r.doms != null
      if (tieneGlucosaOPresion && tieneOtras) {
        // Separar en dos registros
        necesitaMigrar = true
        const regGlucosaPresion = { fecha: r.fecha }
        const regOtros = { fecha: r.fecha }
        if (r.glucosa != null) { regGlucosaPresion.glucosa = r.glucosa; if (r.glucosa_ctx) regGlucosaPresion.glucosa_ctx = r.glucosa_ctx }
        if (r.presion) { regGlucosaPresion.presion = r.presion; regGlucosaPresion.presion_s = r.presion_s; regGlucosaPresion.presion_d = r.presion_d; if (r.presion_ctx) regGlucosaPresion.presion_ctx = r.presion_ctx }
        if (r.sueno != null) regOtros.sueno = r.sueno
        if (r.hidratacion != null) regOtros.hidratacion = r.hidratacion
        if (r.hrv != null) regOtros.hrv = r.hrv
        if (r.energia != null) regOtros.energia = r.energia
        if (r.doms != null) regOtros.doms = r.doms
        saludMigrada.push(regGlucosaPresion, regOtros)
      } else {
        saludMigrada.push(r)
      }
    })
    if (necesitaMigrar) {
      await AsyncStorage.setItem(`salud_${userId}`, JSON.stringify(saludMigrada))
    }
    setRegistrosSalud(necesitaMigrar ? saludMigrada : saludRaw)
    const metConf = await AsyncStorage.getItem(`metricas_habilitadas_${userId}`)
    const tieneHrvData = (necesitaMigrar ? saludMigrada : saludRaw).some(r => r.hrv != null)
    if (metConf) {
      const parsed = JSON.parse(metConf)
      const eraDefault = METRICAS_SALUD.every(m => parsed.includes(m.key))
      // Si era el default antiguo, recalcular según si hay datos de HRV
      const final = eraDefault
        ? parsed.filter(k => k !== 'hrv').concat(tieneHrvData ? ['hrv'] : [])
        : parsed
      setMetricasHabilitadas(final)
      if (eraDefault) await AsyncStorage.setItem(`metricas_habilitadas_${userId}`, JSON.stringify(final))
    } else {
      // Sin config guardada: activar HRV solo si tiene datos
      const defaultMets = METRICAS_SALUD.map(m => m.key).filter(k => k !== 'hrv').concat(tieneHrvData ? ['hrv'] : [])
      setMetricasHabilitadas(defaultMets)
    }
    const ctxConf = await AsyncStorage.getItem(`contextos_habilitados_${userId}`)
    if (ctxConf) setContextosHabilitados({ ...CONTEXTOS_INICIALES, ...JSON.parse(ctxConf) })
    const perfilConf = await AsyncStorage.getItem(`perfil_salud_${userId}`)
    if (perfilConf && PERFILES_SALUD[perfilConf]) setPerfilSalud(perfilConf)
    const limitesConf = await AsyncStorage.getItem(`limites_manuales_${userId}`)
    if (limitesConf) setLimitesManuales(JSON.parse(limitesConf))

    // Auto-seleccionar primer programa
    if (data.programas?.length > 0) {
      const primerProgId = data.programas[0].id
      setProgramaSeleccionado(primerProgId)

      // Auto-seleccionar primer bloque del primer programa
      const bloques = data.programas[0].bloques || []
      if (bloques.length > 0) {
        setBloqueSeleccionado(bloques[0].id)
      }
    }

    const ejercicios = obtenerEjerciciosConHistorial(data)
    if (ejercicios[0]) setEjercicioSeleccionado(ejercicios[0])
    setCargando(false)
  }

  function obtenerBloques() {
    if (programaSeleccionado === 'todos') return programa.programas?.flatMap(p => p.bloques || []) || []
    return programa.programas?.find(p => p.id === programaSeleccionado)?.bloques || []
  }

  function obtenerEjerciciosConHistorial(data = programa) {
    const result = []
    Object.keys(data.dias).forEach(key => {
      if (!key.startsWith('ejercicios_')) return
      const sinPrefijo = key.slice('ejercicios_'.length)
      const bloqueId = sinPrefijo.slice(0, sinPrefijo.lastIndexOf('_'))
      if (bloqueSeleccionado !== 'todos' && bloqueId !== bloqueSeleccionado) return
      if (programaSeleccionado !== 'todos') {
        const prog = data.programas?.find(p => p.bloques?.some(b => b.id === bloqueId))
        if (!prog || prog.id !== programaSeleccionado) return
      }
      // Buscar nombre del programa y bloque para contexto
      const progParent = data.programas?.find(p => p.bloques?.some(b => b.id === bloqueId))
      const bloqueParent = progParent?.bloques?.find(b => b.id === bloqueId)
      ;(data.dias[key] || []).forEach(ej => {
        if (ej.historial?.length > 0) result.push({
          ...ej,
          bloqueId,
          key,
          programaNombre: progParent?.nombre || '',
          bloqueNombre: bloqueParent?.nombre || '',
        })
      })
    })
    return result
  }

  function aKg(peso, unidad) {
    const p = parseFloat(peso) || 0
    if (unidad === 'lbs') return p * 0.453592
    if (unidad === 'placas') return p * 4.5
    return p
  }

  function obtenerDatosGrafica() {
    const h = ejercicioSeleccionado?.historial
    if (!h?.length) return { labels: [], datasets: [{ data: [0] }] }
    const sorted = [...h].sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
    const data = sorted.map(s =>
      metricaSeleccionada === 'peso'
        ? Math.max(...s.series.map(x => aKg(x.peso, s.unidadPeso)))
        : s.series.reduce((acc, x) => acc + (parseInt(x.reps) || 0), 0)
    )
    return { labels: sorted.map((_, i) => `S${i + 1}`), datasets: [{ data: data.length ? data : [0] }] }
  }

  function calcularStats() {
    const empty = { prPeso: 0, repsMax: 0, progresoKg: 0, promedioFeedback: { pump: 0, soreness: 0, dificultad: 0 } }
    const h = ejercicioSeleccionado?.historial
    if (!h?.length) return empty
    let prPeso = 0
    h.forEach(s => s.series.forEach(x => { const p = aKg(x.peso, s.unidadPeso); if (p > prPeso) prPeso = p }))
    const repsMax = Math.max(...h.map(s => s.series.reduce((a, x) => a + (parseInt(x.reps) || 0), 0)))
    const pesoInicial = Math.max(...h[0].series.map(s => aKg(s.peso, h[0].unidadPeso)))
    const pesoActual = Math.max(...h[h.length - 1].series.map(s => aKg(s.peso, h[h.length - 1].unidadPeso)))
    const con = h.filter(s => s.feedback)
    const promedioFeedback = con.length ? {
      pump: Math.round(con.reduce((a, s) => a + (s.feedback.pump || 0), 0) / con.length * 10) / 10,
      soreness: Math.round(con.reduce((a, s) => a + (s.feedback.soreness || 0), 0) / con.length * 10) / 10,
      dificultad: Math.round(con.reduce((a, s) => a + (s.feedback.dificultad || 0), 0) / con.length * 10) / 10,
    } : empty.promedioFeedback
    return { prPeso, repsMax, progresoKg: pesoActual - pesoInicial, promedioFeedback }
  }

  function pedirEliminarSesion(sesion, idx) { setSesionAEliminar({ sesion, idx }) }

  async function confirmarEliminarSesion() {
    if (!sesionAEliminar || !ejercicioSeleccionado) return
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    const nuevoHistorial = ejercicioSeleccionado.historial.filter(s => s.fecha !== sesionAEliminar.sesion.fecha)
    const nuevosDias = { ...programa.dias }
    Object.keys(nuevosDias).forEach(key => {
      if (key.startsWith('ejercicios_'))
        nuevosDias[key] = (nuevosDias[key] || []).map(ej =>
          ej.id === ejercicioSeleccionado.id ? { ...ej, historial: nuevoHistorial } : ej
        )
    })
    const programaActualizado = { ...programa, dias: nuevosDias }
    setPrograma(programaActualizado)
    await guardarYSincronizar(userId, programaActualizado)
    setEjercicioSeleccionado({ ...ejercicioSeleccionado, historial: nuevoHistorial })
    setSesionAEliminar(null)
    setSesionActivaIndex(0)
  }

  const ejerciciosConHistorial = obtenerEjerciciosConHistorial()
  const datosGrafica = obtenerDatosGrafica()
  const stats = calcularStats()
  const bloques = obtenerBloques()
  const totalSesiones = ejercicioSeleccionado?.historial?.length || 0
  const historialInvertido = ejercicioSeleccionado?.historial ? [...ejercicioSeleccionado.historial].reverse() : []
  const sesionActiva = historialInvertido[sesionActivaIndex] || null

  // Color del progreso
  const progColor = stats.progresoKg > 0 ? '#00e676' : stats.progresoKg < 0 ? '#ff4444' : accentColor
  const progPrefix = stats.progresoKg > 0 ? '+' : ''

  async function confirmarEliminarMetrica() {
    if (metricaAEliminar === null) return
    await eliminarMetrica(userId, metricaAEliminar)
    const mets = await cargarMetricas(userId)
    setMetricas(mets)
    setMetricaAEliminar(null)
  }

  function abrirSaludForm() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    saludBtnRef.current?.measureInWindow((x, y, width, height) => {
      setSaludOriginRect({ x, y, width, height })
      saludOverlayAnim.setValue(0)
      Animated.timing(saludOverlayAnim, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start()
      setMetricasSeleccionadas([])
      setShowGuardar(false)
      setContextosSalud({})
      setFechaSalud(new Date().toISOString().split('T')[0])
      setNuevaSalud({ glucosa: '', presion_sistolica: '', presion_diastolica: '', sueno: '', hidratacion: '', hrv: '', energia: '', doms: '' })
      setMostrarCalendarioSalud(false)
      setSaludFormVisible(true)
    })
  }

  function toggleSaludForm() {
    if (saludFormVisible) {
      Animated.timing(saludOverlayAnim, { toValue: 0, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start()
      saludCardRef.current?.animateOut(() => setSaludFormVisible(false))
    } else {
      abrirSaludForm()
    }
  }

  function abrirCuerpoForm() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    cuerpoRegistrarBtnRef.current?.measureInWindow((x, y, width, height) => {
      cuerpoFormClosingRef.current = false
      setCuerpoRegistrarOriginRect({ x, y, width, height })
      cuerpoOverlayAnim.setValue(0)
      Animated.timing(cuerpoOverlayAnim, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start()
      setNuevaMetrica({ peso: '', grasaPct: '', musculoPct: '', unidad: 'kg' })
      setFechaMetrica(new Date().toISOString().split('T')[0])
      setMostrarCalendarioCuerpo(false)
      setFormVisible(true)
    })
  }

  function cerrarCuerpoForm() {
    cuerpoFormClosingRef.current = true
    Animated.timing(cuerpoOverlayAnim, { toValue: 0, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start()
    cuerpoCardRef.current?.animateOut(() => {
      if (cuerpoFormClosingRef.current) setFormVisible(false)
    })
  }

  function cerrarFiltroModal() {
    filtroModalCardRef.current?.animateOut(() => {
      setMostrarFiltroDropdown(false)
      setProgExpandido(null)
    })
  }

  function cerrarSelectorEjercicios() {
    ejercicioModalCardRef.current?.animateOut(() => setMostrarSelectorEjercicios(false))
  }

  function toggleMetrica(key) {
    if (metricasSeleccionadas.includes(key)) {
      if (metricasSeleccionadas.length === 1) {
        // último campo — animar botón también
        guardarBtnRef.current?.animateOut(() => setShowGuardar(false))
      }
      saludCampoRefs.current[key]?.animateOut(() =>
        setMetricasSeleccionadas(prev => prev.filter(k => k !== key))
      )
    } else {
      if (metricasSeleccionadas.length === 0) setShowGuardar(true)
      setMetricasSeleccionadas(prev => [...prev, key])
    }
  }

  async function guardarNuevaSalud() {
    const nuevoReg = {}
    const tieneGlucosa = !!nuevaSalud.glucosa
    const tienePresion = !!(nuevaSalud.presion_sistolica && nuevaSalud.presion_diastolica)

    if (tieneGlucosa) {
      nuevoReg.glucosa = parseFloat(nuevaSalud.glucosa)
      if (contextosSalud.glucosa) nuevoReg.glucosa_ctx = contextosSalud.glucosa
    }
    if (tienePresion) {
      nuevoReg.presion = `${nuevaSalud.presion_sistolica}/${nuevaSalud.presion_diastolica}`
      nuevoReg.presion_s = parseFloat(nuevaSalud.presion_sistolica)
      nuevoReg.presion_d = parseFloat(nuevaSalud.presion_diastolica)
      if (contextosSalud.presion) nuevoReg.presion_ctx = contextosSalud.presion
    }
    if (nuevaSalud.sueno) nuevoReg.sueno = parseFloat(nuevaSalud.sueno)
    if (nuevaSalud.hidratacion) nuevoReg.hidratacion = parseFloat(nuevaSalud.hidratacion)
    if (nuevaSalud.hrv) nuevoReg.hrv = parseFloat(nuevaSalud.hrv)
    if (nuevaSalud.energia) nuevoReg.energia = parseInt(nuevaSalud.energia)
    if (nuevaSalud.doms) nuevoReg.doms = parseInt(nuevaSalud.doms)
    if (Object.keys(nuevoReg).length === 0) return

    const AsyncStorage = require('@react-native-async-storage/async-storage').default
    const salud = await cargarSalud(userId)

    // Glucosa y presión: siempre registro nuevo (múltiples por día según contexto)
    // El resto: merge con el registro del mismo día si existe
    const soloGlucosaOPresion = (tieneGlucosa || tienePresion) &&
      !nuevaSalud.sueno && !nuevaSalud.hidratacion && !nuevaSalud.hrv && !nuevaSalud.energia && !nuevaSalud.doms

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    if (soloGlucosaOPresion) {
      // Registro independiente con hora actual para distinguirlo
      nuevoReg.fecha = new Date(fechaSalud + 'T12:00:00').toISOString()
      await guardarSalud(userId, nuevoReg)
    } else {
      // Para otras métricas: merge por día
      const idxMismoDia = salud.findIndex(r =>
        r.fecha?.startsWith(fechaSalud) && !r.glucosa && !r.presion
      )
      if (idxMismoDia >= 0) {
        salud[idxMismoDia] = { ...salud[idxMismoDia], ...nuevoReg }
        await AsyncStorage.setItem(`salud_${userId}`, JSON.stringify(salud))
      } else {
        nuevoReg.fecha = new Date(fechaSalud + 'T12:00:00').toISOString()
        await guardarSalud(userId, nuevoReg)
      }
    }

    const saludActualizada = await cargarSalud(userId)
    setRegistrosSalud(saludActualizada)
    setLastSaludKey(fechaSalud)
    toggleSaludForm()
  }

  async function confirmarEliminarSalud() {
    if (!saludAEliminar) return
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    const salud = await cargarSalud(userId)
    // Eliminar todos los índices del grupo (ordenados de mayor a menor para no desplazar)
    const indices = [...saludAEliminar.indices].sort((a, b) => b - a)
    indices.forEach(idx => salud.splice(idx, 1))
    const AsyncStorage = require('@react-native-async-storage/async-storage').default
    await AsyncStorage.setItem(`salud_${userId}`, JSON.stringify(salud))
    const saludActualizada = await cargarSalud(userId)
    setRegistrosSalud(saludActualizada)
    setSaludAEliminar(null)
  }

  async function guardarNuevaMetrica() {
    const tieneDato = nuevaMetrica.peso || nuevaMetrica.grasaPct || nuevaMetrica.musculoPct
    if (!tieneDato) return
    const AsyncStorage = require('@react-native-async-storage/async-storage').default
    const metsActuales = await cargarMetricas(userId)
    const idxMismoDia = metsActuales.findIndex(m => m.fecha?.startsWith(fechaMetrica))
    const nuevoReg = {
      peso: nuevaMetrica.peso ? parseFloat(nuevaMetrica.peso) : undefined,
      grasaPct: nuevaMetrica.grasaPct ? parseFloat(nuevaMetrica.grasaPct) : undefined,
      musculoPct: nuevaMetrica.musculoPct ? parseFloat(nuevaMetrica.musculoPct) : undefined,
      unidad: nuevaMetrica.unidad,
      fecha: new Date(fechaMetrica + 'T12:00:00').toISOString(),
    }
    // Limpiar undefined
    Object.keys(nuevoReg).forEach(k => nuevoReg[k] === undefined && delete nuevoReg[k])
    if (idxMismoDia >= 0) {
      metsActuales[idxMismoDia] = { ...metsActuales[idxMismoDia], ...nuevoReg }
      await AsyncStorage.setItem('metricas_' + userId, JSON.stringify(metsActuales))
    } else {
      await guardarMetrica(userId, nuevoReg)
    }
    const mets = await cargarMetricas(userId)
    setMetricas(mets)
    // P6: Sobreescribir peso en perfil de Supabase siempre que se registre uno nuevo
    if (nuevaMetrica.peso) {
      await supabase.from('perfiles').update({ peso: parseFloat(nuevaMetrica.peso) }).eq('id', userId)
    }
    setNuevaMetrica({ peso: '', grasaPct: '', musculoPct: '', unidad: 'kg' })
    setFechaMetrica(new Date().toISOString().split('T')[0])
    cerrarCuerpoForm()
  }

  if (cargando) return (
    <LinearGradient colors={gradColors} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator color={accentColor} size="large" />
    </LinearGradient>
  )

  return (
    <LinearGradient colors={gradColors} style={styles.gradient}>
      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: 120 }]} showsVerticalScrollIndicator={false}>

        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.titulo}>Progreso</Text>
        </View>

        {/* TABS */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabBtn, tabActivo === 'ejercicios' && styles.tabBtnActivo]}
            onPress={() => setTabActivo('ejercicios')}
          >
            <AntDesign name="calendar" size={14} color={tabActivo === 'ejercicios' ? accentColor : `rgba(${acRgb},0.35)`} />
            <Text style={[styles.tabBtnText, tabActivo === 'ejercicios' && styles.tabBtnTextActivo]}>Ejercicios</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tabActivo === 'cuerpo' && styles.tabBtnActivo]}
            onPress={() => setTabActivo('cuerpo')}
          >
            <AntDesign name="user" size={14} color={tabActivo === 'cuerpo' ? '#cf9f00' : `rgba(${acRgb},0.35)`} />
            <Text style={[styles.tabBtnText, tabActivo === 'cuerpo' && styles.tabBtnTextActivo]}>Cuerpo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tabActivo === 'salud' && styles.tabBtnActivo]}
            onPress={() => setTabActivo('salud')}
          >
            <AntDesign name="heart" size={14} color={tabActivo === 'salud' ? '#ff3355' : `rgba(${acRgb},0.35)`} />
            <Text style={[styles.tabBtnText, tabActivo === 'salud' && styles.tabBtnTextActivo]}>Salud</Text>
          </TouchableOpacity>
        </View>

        {tabActivo === 'cuerpo' && (
          <View>
            {/* HEADER CUERPO */}
            <WaveCard delay={0} style={styles.cuerpoHeader}>
              <View>
                {metricas.length > 0 ? (
                  <>
                    <Text style={styles.cuerpoValorPrincipal}>
                      {metricas[0].peso} {metricas[0].unidad || 'kg'}
                    </Text>
                    <Text style={styles.cuerpoFecha}>
                      Último registro: {new Date(metricas[0].fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.cuerpoVacio}>Sin registros aún</Text>
                )}
              </View>
              <TouchableOpacity
                ref={cuerpoRegistrarBtnRef}
                style={styles.cuerpoAddBtn}
                onPress={abrirCuerpoForm}
              >
                <AntDesign name="plus" size={15} color={accentColor} />
                <Text style={styles.cuerpoAddText}>Registrar</Text>
              </TouchableOpacity>
            </WaveCard>


            {/* SELECTOR MÉTRICA */}
            {metricas.length > 0 && (
              <>
                <WaveCard delay={0} style={styles.metricaSelector}>
                  {[
                    { key: 'peso',    label: 'Peso',      color: accentColor },
                    { key: 'grasa',   label: '% Grasa',   color: '#ff6600' },
                    { key: 'musculo', label: '% Músculo', color: '#00cc44' },
                  ].map(m => {
                    const activo = metricaCuerpo === m.key
                    return (
                      <TouchableOpacity
                        key={m.key}
                        style={[styles.metricaSelectorBtn, activo && { borderColor: m.color, backgroundColor: m.color + '22' }]}
                        onPress={() => setMetricaCuerpo(m.key)}
                      >
                        <Text style={[styles.metricaSelectorText, { color: activo ? m.color : '#2a4488' }]}>
                          {m.label}
                        </Text>
                      </TouchableOpacity>
                    )
                  })}
                </WaveCard>

                {/* GRÁFICA */}
                {(() => {
                  const datos = metricas
                    .slice(0, 8)
                    .reverse()
                    .map(m => {
                      if (metricaCuerpo === 'peso') return m.peso || 0
                      if (metricaCuerpo === 'grasa') return m.grasaPct || 0
                      return m.musculoPct || 0
                    })
                  const labels = metricas
                    .slice(0, 8)
                    .reverse()
                    .map(m => new Date(m.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }).replace('.', ''))

                  if (datos.every(d => d === 0)) return (
                    <View style={styles.emptyChart}>
                      <Text style={styles.emptyChartText}>Sin datos para esta métrica</Text>
                    </View>
                  )

                  const CUERPO_COLOR = { peso: accentColor, grasa: '#ff6600', musculo: '#00cc44' }
                  const colorActivo  = CUERPO_COLOR[metricaCuerpo] || accentColor
                  const conPeso2    = metricas.filter(m => m.peso)
                  const conGrasa2   = metricas.filter(m => m.grasaPct)
                  const conMusculo2 = metricas.filter(m => m.musculoPct)
                  const calcDelta   = (arr, key) => arr.length >= 2 ? (arr[0][key] - arr[arr.length - 1][key]).toFixed(1) : null
                  const dPeso    = calcDelta(conPeso2, 'peso')
                  const dGrasa   = calcDelta(conGrasa2, 'grasaPct')
                  const dMusculo = calcDelta(conMusculo2, 'musculoPct')
                  const deltaItems = [
                    dPeso    && { label: 'Peso',    val: dPeso,    color: accentColor,  neg: parseFloat(dPeso) <= 0 },
                    dGrasa   && { label: 'Grasa',   val: dGrasa,   color: '#ff6600',  neg: parseFloat(dGrasa) <= 0 },
                    dMusculo && { label: 'Músculo', val: dMusculo, color: '#00cc44',  neg: parseFloat(dMusculo) >= 0 },
                  ].filter(Boolean)

                  return (
                    <CardEntrance animate key={metricaCuerpo} style={{ marginBottom: 14 }}>
                      <AppleBentoCard style={{ padding: 14, backgroundColor: 'transparent' }}>
                      <LineChart
                        data={{ labels, datasets: [{ data: datos }] }}
                        width={screenWidth - 80}
                        height={175}
                        chartConfig={{
                          backgroundColor: 'transparent',
                          backgroundGradientFrom: '#000',
                          backgroundGradientFromOpacity: 0,
                          backgroundGradientTo: '#000',
                          backgroundGradientToOpacity: 0,
                          decimalPlaces: 1,
                          color: () => colorActivo,
                          labelColor: () => 'rgba(142, 142, 147, 0.8)',
                          strokeWidth: 3,
                          fillShadowGradient: colorActivo,
                          fillShadowGradientOpacity: 0.2,
                          propsForDots: {
                            r: "4",
                            strokeWidth: "0",
                            fill: colorActivo
                          },
                          propsForBackgroundLines: {
                            stroke: "rgba(255, 255, 255, 0.05)",
                          }
                        }}
                        withHorizontalLines={false}
                        withVerticalLines={false}
                        withXLabels={true}
                        withYLabels={false}
                        bezier
                        renderDotContent={({ x, y, index: i, indexData }) => (
                          <Text key={i} style={{ position: 'absolute', top: y - 17, left: x - 14, color: colorActivo, fontSize: 9, fontWeight: '700', width: 28, textAlign: 'center' }}>
                            {typeof indexData === 'number' ? (indexData % 1 === 0 ? indexData : indexData.toFixed(1)) : indexData}
                          </Text>
                        )}
                      />
                      {deltaItems.length > 0 && (
                        <View style={styles.cuerpoChartDeltaRow}>
                          {deltaItems.map(d => (
                            <View key={d.label} style={styles.cuerpoChartDeltaItem}>
                              <Text style={[styles.cuerpoChartDeltaVal, { color: d.neg ? '#00cc44' : '#ff3355' }]}>
                                {parseFloat(d.val) > 0 ? '+' : ''}{d.val}
                              </Text>
                              <Text style={[styles.cuerpoChartDeltaLabel, { color: d.color }]}>{d.label}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                      </AppleBentoCard>
                    </CardEntrance>
                  )
                })()}

                {/* STATS CUERPO */}
                {(() => {
                  const conPeso = metricas.filter(m => m.peso)
                  const conGrasa = metricas.filter(m => m.grasaPct)
                  const conMusculo = metricas.filter(m => m.musculoPct)
                  const delta = (arr, key) => arr.length >= 2
                    ? (arr[0][key] - arr[arr.length - 1][key]).toFixed(1)
                    : null
                  const deltaPeso = delta(conPeso, 'peso')
                  const deltaGrasa = delta(conGrasa, 'grasaPct')
                  const deltaMusculo = delta(conMusculo, 'musculoPct')
                  return (
                    <View style={styles.cuerpoStatsRow}>
                      <CardEntrance animate delay={100} style={{ flex: 1 }}>
                        <AppleBentoCard style={styles.statCard} accentColor={accentColor}>
                          <Text style={styles.statCardLabel}>PESO</Text>
                          <Text style={styles.statCardVal}>{conPeso[0]?.peso || '—'}</Text>
                          <Text style={styles.statCardUnit}>{conPeso[0]?.unidad || 'kg'}</Text>
                          <View style={[styles.statCardBar, { backgroundColor: accentColor }]} />
                        </AppleBentoCard>
                      </CardEntrance>
                      <CardEntrance animate delay={150} style={{ flex: 1 }}>
                        <AppleBentoCard style={styles.statCard} accentColor="#ff6600">
                          <Text style={styles.statCardLabel}>GRASA</Text>
                          <Text style={styles.statCardVal}>{conGrasa[0]?.grasaPct || '—'}</Text>
                          <Text style={styles.statCardUnit}>%</Text>
                          <View style={[styles.statCardBar, { backgroundColor: '#ff6600' }]} />
                        </AppleBentoCard>
                      </CardEntrance>
                      <CardEntrance animate delay={200} style={{ flex: 1 }}>
                        <AppleBentoCard style={styles.statCard} accentColor="#00cc44">
                          <Text style={styles.statCardLabel}>MÚSCULO</Text>
                          <Text style={styles.statCardVal}>{conMusculo[0]?.musculoPct || '—'}</Text>
                          <Text style={styles.statCardUnit}>%</Text>
                          <View style={[styles.statCardBar, { backgroundColor: '#00cc44' }]} />
                        </AppleBentoCard>
                      </CardEntrance>
                    </View>
                  )
                })()}

                {/* HISTORIAL — agrupado por día con filtro y Ver más */}
                {(() => {
                  const porDia = {}
                  metricas.forEach((m, idx) => {
                    const fechaKey = m.fecha?.split('T')[0] || 'sin-fecha'
                    if (!porDia[fechaKey]) porDia[fechaKey] = { fecha: m.fecha, registros: [], indices: [] }
                    porDia[fechaKey].registros.push(m)
                    porDia[fechaKey].indices.push(idx)
                  })
                  let entradas = Object.entries(porDia).sort(([a],[b]) => b.localeCompare(a))
                  if (filtroFechaDesdeCuerpo) entradas = entradas.filter(([k]) => k >= filtroFechaDesdeCuerpo)
                  if (filtroFechaHastaCuerpo) entradas = entradas.filter(([k]) => k <= filtroFechaHastaCuerpo)
                  const total = entradas.length
                  const VISIBLE = 3
                  const visibles = cuerpoExpandido ? entradas : entradas.slice(0, VISIBLE)
                  return (
                    <WaveCard delay={300}>
                      {/* Header con filtro */}
                      <View style={styles.saludHistorialHeaderRow}>
                        <Text style={styles.cuerpoHistorialTitulo}>HISTORIAL</Text>
                        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                          {(filtroFechaDesdeCuerpo || filtroFechaHastaCuerpo) && (
                            <TouchableOpacity onPress={() => { setFiltroFechaDesdeCuerpo(null); setFiltroFechaHastaCuerpo(null); setMostrarFiltroCuerpo(false) }}>
                              <Text style={{ color: '#ff3355', fontSize: 11, fontWeight: '700' }}>Limpiar</Text>
                            </TouchableOpacity>
                          )}
                          {total > 3 && (
                            <Pressable
                              style={({ pressed }) => [styles.saludFiltroBtn, mostrarFiltroCuerpo && { borderColor: accentColor, backgroundColor: `rgba(${acRgb},0.08)` }, pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] }]}
                              onPress={() => {
                                if (mostrarFiltroCuerpo) {
                                  cuerpoFiltroRef.current?.animateOut(() => setMostrarFiltroCuerpo(false))
                                } else {
                                  setMostrarFiltroCuerpo(true)
                                }
                              }}
                            >
                              <AntDesign name="filter" size={13} color={mostrarFiltroCuerpo ? accentColor : `rgba(${acRgb},0.4)`} />
                              <Text style={[styles.saludFiltroBtnText, mostrarFiltroCuerpo && { color: accentColor }]}>Filtrar</Text>
                            </Pressable>
                          )}
                        </View>
                      </View>
                      {/* Panel filtro */}
                      {mostrarFiltroCuerpo && (
                        <CardEntrance animate ref={cuerpoFiltroRef} style={styles.saludFiltroPanel}>
                          <View style={{ flexDirection: 'row', gap: 10 }}>
                            {['desde', 'hasta'].map(tipo => (
                              <View key={tipo} style={{ flex: 1 }}>
                                <Text style={styles.saludFiltroLabel}>{tipo === 'desde' ? 'DESDE' : 'HASTA'}</Text>
                                <TouchableOpacity
                                  style={[styles.saludFiltroFechaBtn, filtroCalCuerpoActivo === tipo && { borderColor: accentColor }]}
                                  onPress={() => {
                                    if (filtroCalCuerpoActivo === tipo) {
                                      filtroCal1Ref.current?.animateOut(() => setFiltroCalCuerpoActivo(null))
                                    } else {
                                      setFiltroCalCuerpoActivo(tipo)
                                    }
                                  }}
                                >
                                  <Text style={styles.saludFiltroFechaText}>
                                    {tipo === 'desde'
                                      ? filtroFechaDesdeCuerpo ? new Date(filtroFechaDesdeCuerpo + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : 'Inicio'
                                      : filtroFechaHastaCuerpo ? new Date(filtroFechaHastaCuerpo + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : 'Hoy'}
                                  </Text>
                                  <AntDesign name={filtroCalCuerpoActivo === tipo ? 'up' : 'down'} size={11} color={`rgba(${acRgb},0.4)`} />
                                </TouchableOpacity>
                              </View>
                            ))}
                          </View>
                          {filtroCalCuerpoActivo && (
                            <CardEntrance animate ref={filtroCal1Ref} style={[styles.saludCalendarioWrap, { marginTop: 10 }]}>
                              <CalendarioSelector
                                fechaInicio={filtroCalCuerpoActivo === 'desde' ? (filtroFechaDesdeCuerpo || new Date().toISOString().split('T')[0]) : (filtroFechaHastaCuerpo || new Date().toISOString().split('T')[0])}
                                onSeleccionar={f => {
                                  if (filtroCalCuerpoActivo === 'desde') setFiltroFechaDesdeCuerpo(f)
                                  else setFiltroFechaHastaCuerpo(f)
                                  filtroCal1Ref.current?.animateOut(() => setFiltroCalCuerpoActivo(null))
                                }}
                                onCerrar={() => filtroCal1Ref.current?.animateOut(() => setFiltroCalCuerpoActivo(null))}
                              />
                            </CardEntrance>
                          )}
                        </CardEntrance>
                      )}
                      {/* Cards */}
                      <AppleBentoCard style={{ padding: 0, overflow: 'hidden' }}>
                          {visibles.map(([fechaKey, grupo], index) => {
                            const fechaDisplay = new Date(grupo.fecha?.includes('T') ? grupo.fecha : grupo.fecha + 'T12:00:00');
                            const merged = {};
                            grupo.registros.forEach(r => Object.assign(merged, r));

                            return (
                              <View key={fechaKey}>
                                {/* 2. EL SEPARADOR: Solo aparece entre elementos, no al principio */}
                                {index > 0 && (
                                  <View style={{ height: 0.5, backgroundColor: 'rgba(255,255,255,0.1)', marginLeft: 16 }} />
                                )}
                                
                                <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center' }}>
                                  {/* Indicador lateral azul sutil */}
                                  <View style={{ width: 3, height: 26, backgroundColor: accentColor, borderRadius: 2, marginRight: 12 }} />

                                  <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                      <Text style={{ color: '#8E8E93', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2 }}>
                                        {fechaDisplay.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                                      </Text>

                                      <TouchableOpacity 
                                        onPress={() => setMetricaAEliminar(grupo.indices[0])} 
                                        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                                        style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255, 51, 85, 0.1)', alignItems: 'center', justifyContent: 'center' }}
                                      >
                                        <AntDesign name="delete" size={12} color="#ff3355" />
                                      </TouchableOpacity>
                                    </View>

                                    <View style={{ flexDirection: 'row', gap: 6 }}>
                                      {merged.peso && (
                                        <View style={[styles.cuerpoMetricaTag, { backgroundColor: `rgba(${acRgb},0.1)` }]}>
                                          <Text style={styles.cuerpoMetricaVal}>{merged.peso} kg</Text>
                                        </View>
                                      )}
                                      {merged.grasaPct && (
                                        <View style={[styles.cuerpoMetricaTag, { backgroundColor: 'rgba(255,102,0,0.1)' }]}>
                                          <Text style={[styles.cuerpoMetricaVal, { color: '#ff6600' }]}>{merged.grasaPct}% grasa</Text>
                                        </View>
                                      )}
                                      {merged.musculoPct && (
                                        <View style={[styles.cuerpoMetricaTag, { backgroundColor: 'rgba(0,204,68,0.1)' }]}>
                                          <Text style={[styles.cuerpoMetricaVal, { color: '#00cc44' }]}>{merged.musculoPct}% musc</Text>
                                        </View>
                                      )}
                                    </View>
                                  </View>
                                </View>
                              </View>
                            );
                          })}
                          {/* Ver más / Ver menos integrado en AppleBentoCard */}
                          {total > VISIBLE && (
                            <Pressable
                              style={({ pressed }) => [
                                { paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: `rgba(${acRgb},0.05)`, gap: 6 },
                                pressed && { backgroundColor: `rgba(${acRgb},0.08)` }
                              ]}
                              onPress={() => setCuerpoExpandido(!cuerpoExpandido)}
                            >
                              <Text style={{ color: accentColor, fontSize: 13, fontWeight: '700' }}>
                                {cuerpoExpandido ? 'Ver menos' : 'Ver ' + (total - VISIBLE) + ' más'}
                              </Text>
                              <AntDesign name="right" size={12} color={accentColor} />
                            </Pressable>
                          )}
                        </AppleBentoCard>
                    </WaveCard>
                  )
                })()}
              </>
            )}

            {metricas.length === 0 && !formVisible && (
              <View style={styles.emptyBox}>
                <AntDesign name="user" size={36} color={`rgba(${acRgb},0.4)`} />
                <Text style={styles.emptyTitulo}>Sin registros corporales</Text>
                <Text style={styles.emptySub}>Toca "Registrar" para agregar tu peso y composición corporal</Text>
              </View>
            )}
          </View>
        )}

        {tabActivo === 'ejercicios' && (
          <>
            {programa.programas?.length > 0 && (() => {
          const progActivo = programa.programas.find(p => p.id === programaSeleccionado)
          const bloqueActivo = progActivo?.bloques?.find(b => b.id === bloqueSeleccionado)
          const labelBtn = progActivo
            ? `${progActivo.nombre}  ›  ${bloqueActivo ? bloqueActivo.nombre : 'Todos'}`
            : 'Todos los programas'

          return (
            <>
              <CardEntrance animate>
              <TouchableOpacity
                ref={filtroBtnRef}
                style={styles.filtroDropdownBtn}
                onPress={() => {
                  setProgExpandido(null)
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                  filtroBtnRef.current?.measureInWindow((x, y, w, h) => {
                    setFiltroOriginRect({ x, y, width: w, height: h })
                    setMostrarFiltroDropdown(true)
                  })
                }}
              >
                <AntDesign name="filter" size={13} color={accentColor} />
                <Text style={styles.filtroDropdownLabel} numberOfLines={1}>{labelBtn}</Text>
                <AntDesign name="down" size={12} color={accentColor} />
              </TouchableOpacity>
              </CardEntrance>

              <ManagedModal visible={mostrarFiltroDropdown} transparent animationType="none">
                <TouchableOpacity
                  style={styles.filtroModalOverlay}
                  activeOpacity={1}
                  onPress={cerrarFiltroModal}
                >
                  <CardEntrance ref={filtroModalCardRef} trigger={mostrarFiltroDropdown} originRect={filtroOriginRect} style={styles.filtroModalBox}>
                      <View style={styles.filtroModalHeader}>
                        <Text style={styles.filtroModalTitulo}>Filtrar por</Text>
                        <TouchableOpacity onPress={cerrarFiltroModal}>
                          <AntDesign name="close" size={16} color="#fff" />
                        </TouchableOpacity>
                      </View>

                      <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
                        {/* Opción Todos */}
                        <Pressable
                          style={({ pressed }) => [styles.filtroProgRow, pressed && { opacity: 0.7 }]}
                          onPress={() => {
                            setProgramaSeleccionado('todos')
                            setBloqueSeleccionado('todos')
                            cerrarFiltroModal()
                          }}
                        >
                          <AntDesign name="appstore" size={14} color={programaSeleccionado === 'todos' ? accentColor : '#8E8E93'} />
                          <Text style={[styles.filtroProgNombre, programaSeleccionado === 'todos' && { color: '#fff' }]}>
                            Todos los programas
                          </Text>
                          {programaSeleccionado === 'todos' && <AntDesign name="check" size={18} color={accentColor} />}
                        </Pressable>

                        {/* Cada programa con sus bloques */}
                        {programa.programas.map((prog, pIndex) => {
                          const bloquesProg = prog.bloques || []
                          const esteProgActivo = programaSeleccionado === prog.id
                          return (
                            <View key={prog.id}>
                              <View style={{ height: 1, backgroundColor: `rgba(${acRgb},0.15)`, marginLeft: 20 }} />
                              {/* Header programa */}
                              <Pressable
                                style={({ pressed }) => [styles.filtroProgRow, pressed && { opacity: 0.7 }]}
                                onPress={() => {
                                  if (progExpandido === prog.id) {
                                    bloquesRefs.current[prog.id]?.animateOut(() => setProgExpandido(null))
                                  } else {
                                    setProgExpandido(prog.id)
                                  }
                                }}
                              >
                                <AntDesign name="folder" size={14} color={esteProgActivo ? accentColor : '#8E8E93'} />
                                <Text style={[styles.filtroProgNombre, esteProgActivo && { color: '#fff' }]}>
                                  {prog.nombre}
                                </Text>
                                {progExpandido === prog.id
                                  ? <AntDesign name="up" size={12} color="#8E8E93" />
                                  : <AntDesign name="down" size={12} color="#8E8E93" />
                                }
                              </Pressable>

                              {/* Bloques — solo si está expandido */}
                              {progExpandido === prog.id && bloquesProg.length > 0 && (
                                <CardEntrance animate ref={r => { bloquesRefs.current[prog.id] = r }}>
                                  {bloquesProg.map((b, bIndex) => (
                                    <View key={b.id}>
                                      <View style={{ height: 1, backgroundColor: `rgba(${acRgb},0.15)`, marginLeft: 48 }} />
                                      <Pressable
                                        style={({ pressed }) => [styles.filtroBloqueRow, pressed && { opacity: 0.7 }]}
                                        onPress={() => {
                                          setProgramaSeleccionado(prog.id)
                                          setBloqueSeleccionado(b.id)
                                          cerrarFiltroModal()
                                        }}
                                      >
                                        <View style={styles.filtroBloqueIndent} />
                                        <AntDesign name="minus" size={10} color={bloqueSeleccionado === b.id && esteProgActivo ? accentColor : '#8E8E93'} />
                                        <Text style={[styles.filtroBloqueName, bloqueSeleccionado === b.id && esteProgActivo && { color: '#fff' }]}>
                                          {b.nombre}
                                        </Text>
                                        {bloqueSeleccionado === b.id && esteProgActivo && <AntDesign name="check" size={18} color={accentColor} />}
                                      </Pressable>
                                    </View>
                                  ))}
                                </CardEntrance>
                              )}
                            </View>
                          )
                        })}
                      </ScrollView>
                  </CardEntrance>
                </TouchableOpacity>
              </ManagedModal>
            </>
          )
        })()}

        {ejerciciosConHistorial.length === 0 ? (
          <View style={styles.emptyBox}>
            <AntDesign name="folder" size={40} color={`rgba(${acRgb},0.4)`} />
            <Text style={styles.emptyTitulo}>Sin datos de progreso</Text>
            <Text style={styles.emptySub}>Registra sesiones para ver tu progreso</Text>
          </View>
        ) : (
          <>
            {/* EJERCICIO selector */}
            <CardEntrance animate key={ejercicioSeleccionado?.id || 'none'}>
            <TouchableOpacity
              ref={ejercicioBtnRef}
              style={styles.ejercicioBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                ejercicioBtnRef.current?.measureInWindow((x, y, w, h) => {
                  setEjercicioOriginRect({ x, y, width: w, height: h })
                  setMostrarSelectorEjercicios(true)
                })
              }}
            >
              <View>
                <Text style={styles.ejercicioBtnNombre}>{ejercicioSeleccionado?.nombre || '—'}</Text>
                <Text style={styles.ejercicioBtnSub}>{totalSesiones} sesiones registradas</Text>
              </View>
              <AntDesign name="down" size={14} color={accentColor} />
            </TouchableOpacity>
            </CardEntrance>

            {/* STATS — 3 cards grandes y atractivas */}
            <View style={styles.statsRow}>
              {/* PR de Peso */}
              <CardEntrance animate key={(ejercicioSeleccionado?.id || '') + '-s1'} delay={100} style={{ flex: 1 }}>
              <AppleBentoCard style={styles.statCard} accentColor={accentColor}>
                <Text style={styles.statCardLabel}>PR PESO</Text>
                <Text style={styles.statCardVal}>{stats.prPeso}</Text>
                <Text style={styles.statCardUnit}>kg</Text>
                <View style={[styles.statCardBar, { backgroundColor: accentColor }]} />
              </AppleBentoCard>
              </CardEntrance>

              {/* Reps máx */}
              <CardEntrance animate key={(ejercicioSeleccionado?.id || '') + '-s2'} delay={150} style={{ flex: 1 }}>
              <AppleBentoCard style={styles.statCard} accentColor="#aa44ff">
                <Text style={styles.statCardLabel}>REPS MÁX</Text>
                <Text style={styles.statCardVal}>{stats.repsMax}</Text>
                <Text style={styles.statCardUnit}>reps</Text>
                <View style={[styles.statCardBar, { backgroundColor: '#aa44ff' }]} />
              </AppleBentoCard>
              </CardEntrance>

              {/* Progreso */}
              <CardEntrance animate key={(ejercicioSeleccionado?.id || '') + '-s3'} delay={200} style={{ flex: 1 }}>
              <AppleBentoCard style={styles.statCard} accentColor={progColor}>
                <Text style={styles.statCardLabel}>PROGRESO</Text>
                <Text style={[styles.statCardVal, { color: progColor }]}>{progPrefix}{stats.progresoKg}</Text>
                <Text style={[styles.statCardUnit, { color: progColor }]}>kg</Text>
                <View style={[styles.statCardBar, { backgroundColor: progColor }]} />
              </AppleBentoCard>
              </CardEntrance>
            </View>

            {/* FEEDBACK compacto */}
            {stats.promedioFeedback.pump > 0 && (
              <WaveCard delay={150} style={styles.feedbackInline}>
                <Text style={styles.feedbackInlineLabel}>AVG</Text>
                <View style={styles.feedbackInlineVals}>
                  <Text style={styles.feedbackInlineItem}>Pump <Text style={styles.feedbackInlineNum}>{stats.promedioFeedback.pump}/5</Text></Text>
                  <Text style={styles.feedbackInlineItem}>Fatiga <Text style={styles.feedbackInlineNum}>{stats.promedioFeedback.soreness}/5</Text></Text>
                  <Text style={styles.feedbackInlineItem}>Dific. <Text style={styles.feedbackInlineNum}>{stats.promedioFeedback.dificultad}/5</Text></Text>
                </View>
              </WaveCard>
            )}

            {/* GRÁFICA — botones Peso/Reps dentro */}
            {datosGrafica.labels.length > 0 && datosGrafica.datasets[0].data[0] !== 0 ? (
              <CardEntrance animate key={metricaSeleccionada} style={{ marginBottom: 14 }}>
                <AppleBentoCard style={{ padding: 14, backgroundColor: 'transparent' }}>
                {/* Título + botones dentro de la gráfica */}
                <View style={styles.chartHeader}>
                  <Text style={styles.chartTitulo}>
                    {metricaSeleccionada === 'peso' ? 'Peso Máx / Sesión' : 'Reps Totales / Sesión'}
                  </Text>
                  <View style={styles.chartMetricRow}>
                    <TouchableOpacity
                      style={[styles.chartMetricBtn, metricaSeleccionada === 'peso' && styles.chartMetricBtnActivo]}
                      onPress={() => setMetricaSeleccionada('peso')}
                    >
                      <Text style={[styles.chartMetricText, metricaSeleccionada === 'peso' && styles.chartMetricTextActivo]}>kg</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.chartMetricBtn, metricaSeleccionada === 'reps' && styles.chartMetricBtnActivo]}
                      onPress={() => setMetricaSeleccionada('reps')}
                    >
                      <Text style={[styles.chartMetricText, metricaSeleccionada === 'reps' && styles.chartMetricTextActivo]}>reps</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <LineChart
                  data={datosGrafica}
                  width={screenWidth - 80}
                  height={175}
                  chartConfig={{
                    backgroundColor: 'transparent',
                    backgroundGradientFrom: '#000',
                    backgroundGradientFromOpacity: 0,
                    backgroundGradientTo: '#000',
                    backgroundGradientToOpacity: 0,
                    decimalPlaces: 0,
                    color: (o = 1) => `rgba(${acRgb}, ${o})`,
                    labelColor: () => 'rgba(142, 142, 147, 0.8)',
                    strokeWidth: 3,
                    propsForDots: { r: '4', strokeWidth: '0', fill: accentColor },
                    propsForBackgroundLines: { stroke: 'rgba(255, 255, 255, 0.05)' },
                    fillShadowGradient: accentColor,
                    fillShadowGradientOpacity: 0.2,
                  }}
                  bezier
                  withHorizontalLines={false}
                  withVerticalLines={false}
                  withXLabels={true}
                  withYLabels={false}
                  renderDotContent={({ x, y, index: i, indexData }) => (
                    <Text key={i} style={{ position: 'absolute', top: y - 17, left: x - 14, color: accentColor, fontSize: 9, fontWeight: '700', width: 28, textAlign: 'center' }}>
                      {indexData}
                    </Text>
                  )}
                  style={{ borderRadius: 12 }}
                />
                </AppleBentoCard>
              </CardEntrance>
            ) : (
              <View style={styles.emptyChart}>
                <Text style={styles.emptyChartText}>Sin datos suficientes para gráfica</Text>
              </View>
            )}

            {/* HISTORIAL */}
            <WaveCard delay={300}>
            <View style={styles.historialHeader}>
              <Text style={styles.sectionLabel}>HISTORIAL</Text>
            </View>

            {historialInvertido.length > 0 ? (
              <CardEntrance animate key={ejercicioSeleccionado.id} style={{ marginBottom: 12 }}>
                <AppleBentoCard style={{ padding: 0, overflow: 'hidden' }}>
                  {historialInvertido.map((sesion, index) => {
                    const fechaDisplay = new Date(sesion.fecha);
                    return (
                      <View key={sesion.fecha}>
                        {index > 0 && (
                          <View style={{ height: 0.5, backgroundColor: 'rgba(255,255,255,0.1)', marginLeft: 16 }} />
                        )}
                        <Pressable 
                          style={({ pressed }) => [
                            { padding: 16, flexDirection: 'row', alignItems: 'flex-start' },
                            pressed && { backgroundColor: 'rgba(255,255,255,0.03)' }
                          ]}
                        >
                          <View style={{ width: 3, minHeight: 26, backgroundColor: '#aa44ff', borderRadius: 2, marginRight: 12, marginTop: 2, alignSelf: 'stretch' }} />

                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                              <Text style={{ color: '#8E8E93', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2 }}>
                                {fechaDisplay.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </Text>
                              <TouchableOpacity 
                                onPress={() => pedirEliminarSesion(sesion, index)} 
                                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                                style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255, 51, 85, 0.1)', alignItems: 'center', justifyContent: 'center' }}
                              >
                                <AntDesign name="delete" size={12} color="#ff3355" />
                              </TouchableOpacity>
                            </View>

                            <View style={styles.sesionStats}>
                              <Text style={styles.sesionStat}>{Math.max(...sesion.series.map(s => parseFloat(s.peso) || 0))} kg máx</Text>
                              <View style={styles.sesionStatDivider} />
                              <Text style={styles.sesionStat}>{sesion.series.reduce((a, s) => a + (parseInt(s.reps) || 0), 0)} reps</Text>
                              <View style={styles.sesionStatDivider} />
                              <Text style={styles.sesionStat}>{sesion.series.length} series</Text>
                            </View>

                            <View style={{ gap: 5 }}>
                              {sesion.series.map((serie, si) => (
                                <View key={si}>
                                  {si > 0 && <View style={{ height: 0.5, backgroundColor: 'rgba(255,255,255,0.08)' }} />}
                                  <View style={styles.serieRow}>
                                    <Text style={styles.serieNum}>{si + 1}</Text>
                                    <Text style={styles.serieVal}>{serie.peso} kg</Text>
                                    <Text style={styles.serieVal}>{serie.reps} reps</Text>
                                    <Text style={styles.serieVal}>RIR {serie.rir}</Text>
                                  </View>
                                </View>
                              ))}
                              {sesion.feedback && (sesion.feedback.pump > 0 || sesion.feedback.soreness > 0) && (
                                <View style={styles.sesionFeedback}>
                                  <Text style={styles.feedbackText}>Pump: {sesion.feedback.pump}/5</Text>
                                  <Text style={styles.feedbackText}>Fatiga: {sesion.feedback.soreness}/5</Text>
                                  <Text style={styles.feedbackText}>Dificultad: {sesion.feedback.dificultad}/5</Text>
                                </View>
                              )}
                            </View>
                          </View>
                        </Pressable>
                      </View>
                    );
                  })}
                </AppleBentoCard>
              </CardEntrance>
            ) : (
              <View style={styles.emptyChart}>
                <Text style={styles.emptyChartText}>Sin sesiones registradas</Text>
              </View>
            )}
            </WaveCard>
          </>
        )}
        </>
        )}

        {/* ── TAB SALUD ─────────────────────────────────── */}
        {tabActivo === 'salud' && (
          <View style={{ paddingBottom: 20 }}>

            {/* SELECTOR MÉTRICA GRÁFICA */}
            <WaveCard delay={0}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 4 }}>
                {METRICAS_SALUD.filter(m => metricasHabilitadas.includes(m.key)).map(m => {
                  const activa = metricaSaludGrafica === m.key
                  const tieneData = registrosSalud.some(r => r[m.key] != null || (m.key === 'presion' && r.presion != null))
                  return (
                    <TouchableOpacity
                      key={m.key}
                      ref={r => { metricaBtnRefs.current[m.key] = r }}
                      style={[styles.saludMetricaBtn, activa && { borderColor: m.color, backgroundColor: m.color + '15' }]}
                      onPress={() => setMetricaSaludGrafica(m.key)}
                      onLongPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
                        metricaBtnRefs.current[m.key]?.measureInWindow((x, y) => {
                          tooltipAnim.setValue(0)
                          setMetricaTooltip({ key: m.key, desc: m.desc, color: m.color, label: m.label, y })
                          Animated.parallel([
                            Animated.timing(tooltipAnim, { toValue: 1, duration: 320, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }),
                          ]).start()
                          clearTimeout(tooltipTimer.current)
                          tooltipTimer.current = setTimeout(() => {
                            Animated.timing(tooltipAnim, { toValue: 0, duration: 180, easing: Easing.in(Easing.cubic), useNativeDriver: true })
                              .start(() => setMetricaTooltip(null))
                          }, 3500)
                        })
                      }}
                      delayLongPress={400}
                    >
                      <Text style={[styles.saludMetricaBtnText, { color: activa ? m.color : '#8E8E93' }]}>{m.label}</Text>
                      {tieneData && <View style={[styles.saludMetricaDot, { backgroundColor: m.color }]} />}
                    </TouchableOpacity>
                  )
                })}
              </View>
              </ScrollView>
              <TouchableOpacity
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setModalMetricasConfig(true) }}
                style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: `rgba(${acRgb},0.08)`, borderWidth: 1, borderColor: `rgba(${acRgb},0.2)`, justifyContent: 'center', alignItems: 'center', marginLeft: 8 }}
              >
                <AntDesign name="setting" size={14} color={accentColor} />
              </TouchableOpacity>
            </View>
            </WaveCard>

            {/* GRÁFICA — siempre visible */}
            {(() => {
              const meta = METRICAS_SALUD.find(m => m.key === metricaSaludGrafica)
              const esPresion = metricaSaludGrafica === 'presion'
              const key = esPresion ? 'presion' : metricaSaludGrafica
              const ctxKey = metricaSaludGrafica === 'glucosa' ? 'glucosa_ctx'
                : esPresion ? 'presion_ctx'
                : metricaSaludGrafica === 'hrv' ? 'hrv_ctx' : null
              const tieneContextos = meta?.contextos?.length > 0

              // Filtrar por contexto si aplica
              let datosFiltrados = registrosSalud.filter(r => r[key] != null)
              if (filtroContextoGrafica && ctxKey) {
                datosFiltrados = datosFiltrados.filter(r => r[ctxKey] === filtroContextoGrafica)
              }
              // Filtrar por rango de fechas
              if (filtroRangoGrafica !== 'todo') {
                const hoy = new Date()
                const dias = filtroRangoGrafica === 'semana' ? 7 : 30
                const desde = new Date(hoy); desde.setDate(hoy.getDate() - dias)
                const desdeStr = desde.toISOString().split('T')[0]
                datosFiltrados = datosFiltrados.filter(r => (r.fecha?.split('T')[0] || '') >= desdeStr)
              }
              // Dedup por fecha + contexto — mismo día y mismo grupo se reemplaza, distinto grupo coexiste
              const _seenKeys = new Set()
              datosFiltrados = datosFiltrados.filter(r => {
                const ctxVal = ctxKey ? (r[ctxKey] || '') : ''
                const dk = (r.fecha?.split('T')[0] || '') + '|' + ctxVal
                if (_seenKeys.has(dk)) return false
                _seenKeys.add(dk); return true
              })
              const datos = datosFiltrados.slice().reverse()
              const sinDatos = datos.length === 0

              // ── Ref del perfil para esta métrica/contexto ──
              const glucosaRef = metricaSaludGrafica === 'glucosa' && filtroContextoGrafica
                ? getGlucosaRef(filtroContextoGrafica, perfilSalud, limitesManuales) : null
              const presionRef = esPresion ? getPresionRef(perfilSalud, limitesManuales) : null
              const hrvInfo   = metricaSaludGrafica === 'hrv' && datos.length > 0
                ? getHrvZone(datos[datos.length - 1]?.hrv, registrosSalud, filtroContextoGrafica) : null

              // Etiqueta de ref para el header
              const refLabel = glucosaRef
                ? `${glucosaRef.lo != null ? glucosaRef.lo + '-' : '<'}${glucosaRef.hi} mg/dL · ${glucosaRef.refText}`
                : presionRef
                ? `<${presionRef.s_hi}/${presionRef.d_hi} mmHg · ${presionRef.refText}`
                : hrvInfo?.baseline != null
                ? `Baseline ${hrvInfo.baseline} ms`
                : (meta?.refsCtx?.[filtroContextoGrafica] ?? meta?.ref)
                ? `Ref: ${meta?.refsCtx?.[filtroContextoGrafica] ?? meta?.ref} ${meta?.unit}`
                : null

              // Zonas dinámicas para CandleChart (presión)
              const candleZones = presionRef ? [
                { lo: 0,              hi: presionRef.d_hi,  fill: 'rgba(0,204,68,0.07)',  line: null },
                { lo: presionRef.d_hi, hi: presionRef.s_hi, fill: 'rgba(0,204,68,0.05)',  line: { val: presionRef.s_hi, label: String(presionRef.s_hi), color: 'rgba(0,204,68,0.5)' } },
                { lo: presionRef.s_hi, hi: presionRef.s_hi + 10, fill: 'rgba(255,204,0,0.07)', line: { val: presionRef.s_hi + 10, label: String(presionRef.s_hi + 10), color: 'rgba(255,204,0,0.4)' } },
                { lo: presionRef.s_hi + 10, hi: 999, fill: 'rgba(255,51,85,0.06)',  line: null },
              ] : undefined

              // Datos para gráfica de velas (presión)
              const candleData = esPresion ? datos.map(r => {
                const parts = String(r.presion || '').split('/')
                return { fecha: r.fecha, s: Number(parts[0]) || 0, d: Number(parts[1]) || 0, ctx: r.presion_ctx }
              }) : []

              // Datos para LineChart (resto de métricas)
              const chartDatosRaw = !esPresion && datos.length === 1 ? [...datos, ...datos] : datos
              const chartData = sinDatos
                ? { labels: ['—', '—'], datasets: [{ data: [0, 0] }] }
                : {
                    labels: chartDatosRaw.map((r, i) => (!esPresion && datos.length === 1 && i === 1) ? '' : new Date(r.fecha.includes('T') ? r.fecha : r.fecha + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }).replace('.', '')),
                    datasets: [{ data: chartDatosRaw.map(r => Number(r[key]) || 0) }]
                  }

              // Línea de referencia superpuesta en LineChart (glucosa hi / HRV baseline)
              const refLineVal = glucosaRef?.hi ?? (hrvInfo?.baseline ?? null)
              const refLineColor = glucosaRef ? '#00cc44' : '#00cc44'

              return (
                <CardEntrance animate key={metricaSaludGrafica} style={{ marginBottom: 16 }}>
                  <AppleBentoCard style={{ padding: 14, backgroundColor: 'transparent' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 }}>
                    <Text style={[styles.saludGraficaTitulo, { color: meta?.color }]}>{meta?.label}</Text>
                    {refLabel ? <Text style={[styles.saludGraficaRef, { flex: 1 }]} numberOfLines={1}>{refLabel}</Text> : <View style={{ flex: 1 }} />}
                    <View style={{ flexDirection: 'row', gap: 4 }}>
                      {[{ key: 'semana', label: '7D' }, { key: 'mes', label: '30D' }, { key: 'todo', label: 'Todo' }].map(f => (
                        <TouchableOpacity
                          key={f.key}
                          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setFiltroRangoGrafica(f.key) }}
                          style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1,
                            borderColor: filtroRangoGrafica === f.key ? meta?.color : 'rgba(255,255,255,0.08)',
                            backgroundColor: filtroRangoGrafica === f.key ? (meta?.color + '22') : 'rgba(255,255,255,0.02)' }}
                        >
                          <Text style={{ fontSize: 10, fontWeight: '700', color: filtroRangoGrafica === f.key ? meta?.color : '#8E8E93' }}>{f.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  {/* HRV: badge de zona */}
                  {metricaSaludGrafica === 'hrv' && (
                    <View style={{ marginBottom: 8, gap: 4 }}>
                      {hrvInfo?.zona ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: hrvInfo.zona === 'verde' ? '#00cc44' : hrvInfo.zona === 'amarillo' ? '#ffcc00' : '#ff3355' }} />
                          <Text style={{ color: '#8E8E93', fontSize: 11 }}>
                            {hrvInfo.zona === 'verde' ? 'Recuperado — apto para entrenar fuerte' : hrvInfo.zona === 'amarillo' ? 'Fatiga residual — entrena con moderación' : 'Alerta — prioriza descanso'}
                          </Text>
                        </View>
                      ) : (
                        <Text style={{ color: 'rgba(142,142,147,0.5)', fontSize: 10, fontStyle: 'italic' }}>
                          {`El análisis de zona se activa con 3+ registros. Para mayor precisión, registra diariamente hasta acumular 14.`}
                        </Text>
                      )}
                    </View>
                  )}
                  {/* Filtros de contexto para glucosa, presión y hrv */}
                  {tieneContextos && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {(meta.contextos || []).filter(ctx => (contextosHabilitados[meta.key] || meta.contextos).includes(ctx)).map(ctx => (
                          <TouchableOpacity
                            key={ctx}
                            style={[styles.saludCtxBtn, filtroContextoGrafica === ctx && { borderColor: meta.color, backgroundColor: meta.color + '22' }]}
                            onPress={() => setFiltroContextoGrafica(filtroContextoGrafica === ctx ? null : ctx)}
                          >
                            <Text style={[styles.saludCtxText, filtroContextoGrafica === ctx && { color: meta.color }]}>{ctx}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  )}
                  <View style={{ position: 'relative', borderRadius: 12, overflow: 'hidden' }}>
                  {esPresion ? (
                    <View style={{ opacity: sinDatos ? 0.12 : 1, minHeight: 256, justifyContent: 'center' }}>
                      <PresionCandleChart data={candleData} color={meta?.color || '#ff3355'} width={screenWidth - 96} zones={candleZones} />
                    </View>
                  ) : (
                  <View style={{ opacity: sinDatos ? 0.12 : 1, overflow: 'hidden', borderRadius: 12 }}>
                    <LineChart
                      data={chartData}
                      width={screenWidth - 68}
                      height={180}
                      chartConfig={{
                        backgroundColor: 'transparent',
                        backgroundGradientFrom: '#000',
                        backgroundGradientFromOpacity: 0,
                        backgroundGradientTo: '#000',
                        backgroundGradientToOpacity: 0,
                        color: () => datos.length === 1 ? 'transparent' : (meta?.color || '#ff6600'),
                        labelColor: () => 'rgba(142, 142, 147, 0.8)',
                        strokeWidth: 3,
                        propsForDots: datos.length === 1
                          ? { r: '0' }
                          : { r: '4', strokeWidth: '0', fill: meta?.color || '#ff6600' },
                        propsForBackgroundLines: { stroke: 'rgba(255, 255, 255, 0.05)' },
                        fillShadowGradient: meta?.color || '#ff6600',
                        fillShadowGradientOpacity: datos.length === 1 ? 0 : 0.2,
                      }}
                      bezier
                      withHorizontalLines={false}
                      withVerticalLines={false}
                      withXLabels={true}
                      withYLabels={false}
                      renderDotContent={sinDatos ? undefined : ({ x, y, index: i, indexData }) => {
                        if (datos.length === 1 && i === 1) return null
                        const label = typeof indexData === 'number' ? (indexData % 1 === 0 ? indexData : indexData.toFixed(1)) : indexData
                        if (datos.length === 1) {
                          return (
                            <View key={i} style={{ position: 'absolute', top: y - 22, left: x - 20, alignItems: 'center', width: 40 }}>
                              <Text style={{ color: meta?.color || '#ff6600', fontSize: 9, fontWeight: '700' }}>{label}</Text>
                              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: meta?.color || '#ff6600', marginTop: 5 }} />
                            </View>
                          )
                        }
                        return (
                          <Text key={i} style={{ position: 'absolute', top: y - 17, left: x - 14, color: meta?.color || '#ff6600', fontSize: 9, fontWeight: '700', width: 28, textAlign: 'center' }}>
                            {label}
                          </Text>
                        )
                      }}
                      style={{ borderRadius: 12 }}
                    />
                  </View>
                  )}
                  {/* Línea de referencia superpuesta (glucosa hi / HRV baseline) */}
                  {!sinDatos && !esPresion && refLineVal != null && (() => {
                    const dataVals = chartDatosRaw.map(r => Number(r[key]) || 0)
                    const dMin = Math.min(...dataVals); const dMax = Math.max(...dataVals)
                    const pad = (dMax - dMin) * 0.15 || 5
                    const aMin = dMin - pad; const aMax = dMax + pad; const aRange = aMax - aMin
                    const H = 180; const PT = 16; const LH = 30; const drawH = H - PT - LH
                    const yRef = PT + drawH * (1 - (refLineVal - aMin) / aRange)
                    if (yRef < PT || yRef > H - LH) return null
                    return (
                      <View style={{ position: 'absolute', top: yRef, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', pointerEvents: 'none' }}>
                        <View style={{ flex: 1, height: 1.5, backgroundColor: refLineColor + '66' }} />
                        <Text style={{ color: refLineColor, fontSize: 8, fontWeight: '700', marginLeft: 4, marginRight: 2 }}>{refLineVal}</Text>
                      </View>
                    )
                  })()}
                  {sinDatos && (
                    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }}>
                      <Text style={{ color: meta?.color || '#ff6600', fontSize: 12, fontWeight: '700', textAlign: 'center', opacity: 0.7 }}>
                        {filtroContextoGrafica ? `Sin datos — ${filtroContextoGrafica}` : `Sin datos de ${meta?.label} aún`}
                      </Text>
                    </View>
                  )}
                  </View>
                  </AppleBentoCard>
                </CardEntrance>
              )
            })()}

            {/* ÚLTIMO REGISTRO */}
            {registrosSalud.length > 0 && (() => {
              // Tomar TODOS los registros del día más reciente
              const fechaHoy = registrosSalud[0].fecha?.split('T')[0]
              const registrosHoy = registrosSalud.filter(r => r.fecha?.split('T')[0] === fechaHoy)

              // Combinar todas las métricas del día
              const diaCompleto = {}
              registrosHoy.forEach(r => Object.assign(diaCompleto, r))

              const items = METRICAS_SALUD.flatMap(m => {
                if (m.tipo === 'presion') {
                  const ctxOrder = m.contextos || []
                  const seen = new Set()
                  return [...registrosHoy.filter(r => r.presion)]
                    .filter(r => { const k = r.presion_ctx || ''; if (seen.has(k)) return false; seen.add(k); return true })
                    .sort((a, b) => ctxOrder.indexOf(a.presion_ctx) - ctxOrder.indexOf(b.presion_ctx))
                    .map((r, i) => ({ ...m, key: `presion_${i}`, value: r.presion, ctx: r.presion_ctx }))
                }
                if (m.tipo === 'glucosa') {
                  const ctxOrder = m.contextos || []
                  const seen = new Set()
                  return [...registrosHoy.filter(r => r.glucosa !== undefined && r.glucosa !== null)]
                    .filter(r => { const k = r.glucosa_ctx || ''; if (seen.has(k)) return false; seen.add(k); return true })
                    .sort((a, b) => ctxOrder.indexOf(a.glucosa_ctx) - ctxOrder.indexOf(b.glucosa_ctx))
                    .map((r, i) => ({ ...m, key: `glucosa_${i}`, value: r.glucosa, ctx: r.glucosa_ctx }))
                }
                if (m.key === 'hrv') {
                  const ctxOrder = m.contextos || []
                  const seen = new Set()
                  return [...registrosHoy.filter(r => r.hrv !== undefined && r.hrv !== null)]
                    .filter(r => { const k = r.hrv_ctx || ''; if (seen.has(k)) return false; seen.add(k); return true })
                    .sort((a, b) => ctxOrder.indexOf(a.hrv_ctx) - ctxOrder.indexOf(b.hrv_ctx))
                    .map((r, i) => ({ ...m, key: `hrv_${i}`, value: r.hrv, ctx: r.hrv_ctx }))
                }
                const val = diaCompleto[m.key]
                if (val === undefined || val === null) return []
                return [{ ...m, value: val, ctx: null }]
              })

              if (!items.length) return null
              const fechaDisplay = new Date((fechaHoy || '') + 'T12:00:00')
              const glucosaItems = items.filter(it => it.tipo === 'glucosa')
              const presionItems = items.filter(it => it.tipo === 'presion')
              const hrvItems     = items.filter(it => it.key === 'hrv' || it.key?.startsWith('hrv_'))
              const otrosItems   = items.filter(it => it.tipo !== 'glucosa' && it.tipo !== 'presion' && it.key !== 'hrv' && !it.key?.startsWith('hrv_'))
              function ItemCard({ item }) {
                return (
                  <View style={[styles.saludUltimoItem, { borderColor: item.color + '55' }]}>
                    <Text style={[styles.saludUltimoValor, { color: item.color }]}>{item.value}</Text>
                    <Text style={styles.saludUltimoUnit}>{item.unit}</Text>
                    <Text style={styles.saludUltimoLabel}>{item.label}</Text>
                    {item.ctx && <Text style={[styles.saludUltimoRef, { color: item.color + 'aa' }]}>{item.ctx}</Text>}
                    {item.ref ? <Text style={styles.saludUltimoRef}>ref: {item.ref}</Text> : null}
                  </View>
                )
              }
              return (
                <WaveCard delay={200} style={{ marginBottom: 16 }}>
                  <AppleBentoCard style={styles.saludUltimoCard}>
                  <Text style={styles.saludUltimoTitulo}>
                    ÚLTIMO DÍA · {fechaDisplay.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                  <View style={{ gap: 6 }}>
                    {glucosaItems.length > 0 && <View style={styles.saludUltimoGrid}>{glucosaItems.map(it => <ItemCard key={it.key} item={it} />)}</View>}
                    {presionItems.length > 0 && <View style={styles.saludUltimoGrid}>{presionItems.map(it => <ItemCard key={it.key} item={it} />)}</View>}
                    {hrvItems.length > 0    && <View style={styles.saludUltimoGrid}>{hrvItems.map(it => <ItemCard key={it.key} item={it} />)}</View>}
                    {otrosItems.length > 0  && <View style={styles.saludUltimoGrid}>{otrosItems.map(it => <ItemCard key={it.key} item={it} />)}</View>}
                  </View>
                  </AppleBentoCard>
                </WaveCard>
              )
            })()}

            {/* BOTÓN NUEVO REGISTRO — arriba */}
            <WaveCard delay={300}>
            <Pressable
              ref={saludBtnRef}
              style={({ pressed }) => [styles.saludAddBtn, pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]}
              onPress={toggleSaludForm}
            >
              <LinearGradient
                colors={['rgba(255, 51, 85, 0.15)', 'rgba(255, 51, 85, 0.05)']}
                style={styles.saludAddGradient}
              >
                <AntDesign name="plus-circle" size={16} color="#ff3355" />
                <Text style={styles.saludAddText}>Nuevo registro</Text>
              </LinearGradient>
            </Pressable>
            </WaveCard>

            {/* HISTORIAL */}
            {registrosSalud.length > 0 && (() => {
              // Agrupar todos los registros por día
              const porDia = {}
              registrosSalud.forEach((r, idx) => {
                const fechaKey = r.fecha ? r.fecha.split('T')[0] : 'sin-fecha'
                if (!porDia[fechaKey]) {
                  porDia[fechaKey] = { fecha: r.fecha, glucosas: [], presiones: [], hrvs: [], otros: {}, indices: [] }
                }
                // Glucosa — acepta número o string; deduplica por ctx (queda el más reciente)
                const gVal = r.glucosa !== undefined && r.glucosa !== null && r.glucosa !== '' ? Number(r.glucosa) : null
                if (gVal !== null && !isNaN(gVal) && !porDia[fechaKey].glucosas.some(g => g.ctx === (r.glucosa_ctx || null))) {
                  porDia[fechaKey].glucosas.push({ valor: gVal, ctx: r.glucosa_ctx || null, idx })
                }
                // Presión — deduplica por ctx
                if (r.presion && !porDia[fechaKey].presiones.some(p => p.ctx === (r.presion_ctx || null))) {
                  porDia[fechaKey].presiones.push({ valor: r.presion, ctx: r.presion_ctx || null, idx })
                }
                // HRV — deduplica por ctx
                const hrvVal = r.hrv !== undefined && r.hrv !== null && r.hrv !== '' ? Number(r.hrv) : null
                if (hrvVal !== null && !isNaN(hrvVal) && !porDia[fechaKey].hrvs.some(h => h.ctx === (r.hrv_ctx || null))) {
                  porDia[fechaKey].hrvs.push({ valor: hrvVal, ctx: r.hrv_ctx || null, idx })
                }
                // Otras métricas
                if (r.sueno !== undefined && r.sueno !== null) porDia[fechaKey].otros.sueno = r.sueno
                if (r.hidratacion !== undefined && r.hidratacion !== null) porDia[fechaKey].otros.hidratacion = r.hidratacion
                if (r.energia !== undefined && r.energia !== null) porDia[fechaKey].otros.energia = r.energia
                if (r.doms !== undefined && r.doms !== null) porDia[fechaKey].otros.doms = r.doms
                porDia[fechaKey].indices.push(idx)
              })

              // Filtrar por rango de fechas
              let entradasOrdenadas = Object.entries(porDia).sort(([a],[b]) => b.localeCompare(a))
              if (filtroFechaDesde) entradasOrdenadas = entradasOrdenadas.filter(([k]) => k >= filtroFechaDesde)
              if (filtroFechaHasta) entradasOrdenadas = entradasOrdenadas.filter(([k]) => k <= filtroFechaHasta)
              const totalDias = Object.keys(porDia).length

              return (
                <>
                  {/* Header historial con filtro */}
                  <View style={styles.saludHistorialHeaderRow}>
                    <Text style={styles.sectionLabel}>HISTORIAL</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {(filtroFechaDesde || filtroFechaHasta) && (
                        <TouchableOpacity onPress={() => { setFiltroFechaDesde(null); setFiltroFechaHasta(null); setMostrarFiltroFecha(false) }}>
                          <Text style={{ color: '#ff3355', fontSize: 11, fontWeight: '700' }}>Limpiar</Text>
                        </TouchableOpacity>
                      )}
                      {totalDias > 3 && (
                        <Pressable
                          style={({ pressed }) => [styles.saludFiltroBtn, mostrarFiltroFecha && { borderColor: accentColor, backgroundColor: `rgba(${acRgb},0.08)` }, pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] }]}
                          onPress={() => {
                            if (mostrarFiltroFecha) {
                              saludFiltroRef.current?.animateOut(() => setMostrarFiltroFecha(false))
                            } else {
                              setMostrarFiltroFecha(true)
                            }
                          }}
                        >
                          <AntDesign name="filter" size={13} color={mostrarFiltroFecha ? accentColor : `rgba(${acRgb},0.4)`} />
                          <Text style={[styles.saludFiltroBtnText, mostrarFiltroFecha && { color: accentColor }]}>Filtrar</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>

                  {/* Panel filtro por fechas */}
                  {mostrarFiltroFecha && (
                    <CardEntrance animate ref={saludFiltroRef} style={styles.saludFiltroPanel}>
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        {['desde', 'hasta'].map(tipo => (
                          <View key={tipo} style={{ flex: 1 }}>
                            <Text style={styles.saludFiltroLabel}>{tipo === 'desde' ? 'DESDE' : 'HASTA'}</Text>
                            <TouchableOpacity
                              style={[styles.saludFiltroFechaBtn, filtroCalendarioActivo === tipo && { borderColor: accentColor }]}
                              onPress={() => {
                                if (filtroCalendarioActivo === tipo) {
                                  filtroCal2Ref.current?.animateOut(() => setFiltroCalendarioActivo(null))
                                } else {
                                  setFiltroCalendarioActivo(tipo)
                                }
                              }}
                            >
                              <Text style={styles.saludFiltroFechaText}>
                                {tipo === 'desde'
                                  ? filtroFechaDesde ? new Date(filtroFechaDesde + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : 'Inicio'
                                  : filtroFechaHasta ? new Date(filtroFechaHasta + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : 'Hoy'}
                              </Text>
                              <AntDesign name={filtroCalendarioActivo === tipo ? 'up' : 'down'} size={11} color={`rgba(${acRgb},0.4)`} />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                      {filtroCalendarioActivo && (
                        <CardEntrance animate ref={filtroCal2Ref} style={[styles.saludCalendarioWrap, { marginTop: 10 }]}>
                          <CalendarioSelector
                            fechaInicio={filtroCalendarioActivo === 'desde' ? (filtroFechaDesde || new Date().toISOString().split('T')[0]) : (filtroFechaHasta || new Date().toISOString().split('T')[0])}
                            onSeleccionar={f => {
                              if (filtroCalendarioActivo === 'desde') setFiltroFechaDesde(f)
                              else setFiltroFechaHasta(f)
                              filtroCal2Ref.current?.animateOut(() => setFiltroCalendarioActivo(null))
                            }}
                            onCerrar={() => filtroCal2Ref.current?.animateOut(() => setFiltroCalendarioActivo(null))}
                          />
                        </CardEntrance>
                      )}
                    </CardEntrance>
                  )}

                  {/* Cards */}
                  {entradasOrdenadas.length === 0 ? (
                    <Text style={{ color: '#2a4488', textAlign: 'center', paddingVertical: 16, fontSize: 13 }}>
                      Sin registros en el período seleccionado
                    </Text>
                  ) : (() => {
                    const VISIBLE = 3
                    const visibles = historialExpandido ? entradasOrdenadas : entradasOrdenadas.slice(0, VISIBLE)
                    const hayMas = entradasOrdenadas.length > VISIBLE
                    return (
                      <>
                        <AppleBentoCard style={{ padding: 0, overflow: 'hidden' }}>
                        {visibles.map(([fechaKey, grupo], index) => {
                    const fechaDisplay = new Date(grupo.fecha.includes('T') ? grupo.fecha : grupo.fecha + 'T12:00:00')
                    const tieneGlucosa = grupo.glucosas.length > 0
                    const tienePresion = grupo.presiones.length > 0
                    const tieneHrv = (grupo.hrvs || []).length > 0
                    const tieneOtros = Object.keys(grupo.otros).length > 0
                    return (
                      <View key={fechaKey}>
                        {index > 0 && (
                          <View style={{ height: 0.5, backgroundColor: 'rgba(255,255,255,0.1)', marginLeft: 16 }} />
                        )}
                        <Pressable 
                          style={({ pressed }) => [
                            { padding: 16, flexDirection: 'row', alignItems: 'flex-start' },
                            pressed && { backgroundColor: 'rgba(255,255,255,0.03)' }
                          ]}
                        >
                          <View style={{ width: 3, minHeight: 26, backgroundColor: '#ff6600', borderRadius: 2, marginRight: 12, marginTop: 2, alignSelf: 'stretch' }} />

                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                              <Text style={{ color: '#8E8E93', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2 }}>
                                {fechaDisplay.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </Text>
                              <TouchableOpacity 
                                onPress={() => setSaludAEliminar({ indices: grupo.indices, fechaKey })} 
                                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                                style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255, 51, 85, 0.1)', alignItems: 'center', justifyContent: 'center' }}
                              >
                                <AntDesign name="delete" size={12} color="#ff3355" />
                              </TouchableOpacity>
                            </View>

                        {/* Contenido — filas por tipo: glucosa → presión → HRV → otros */}
                        <View style={{ gap: 6 }}>
                          {tieneGlucosa && (
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                              {grupo.glucosas.map((g, i) => (
                                <View key={i} style={[styles.saludTagWrap, { backgroundColor: 'rgba(255, 102, 0, 0.1)' }]}>
                                  <Text style={[styles.saludTag, { color: '#ff6600', fontWeight: '800' }]}>{g.valor} mg/dL</Text>
                                  {g.ctx && <Text style={[styles.saludTagCtx, { color: '#ff660088' }]}>{g.ctx}</Text>}
                                </View>
                              ))}
                            </View>
                          )}
                          {tienePresion && (
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                              {grupo.presiones.map((p, i) => (
                                <View key={i} style={[styles.saludTagWrap, { backgroundColor: 'rgba(255, 51, 85, 0.1)' }]}>
                                  <Text style={[styles.saludTag, { color: '#ff3355', fontWeight: '800' }]}>{p.valor} mmHg</Text>
                                  {p.ctx && <Text style={[styles.saludTagCtx, { color: '#ff335588' }]}>{p.ctx}</Text>}
                                </View>
                              ))}
                            </View>
                          )}
                          {tieneHrv && (
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                              {(grupo.hrvs || []).map((h, i) => (
                                <View key={i} style={[styles.saludTagWrap, { backgroundColor: 'rgba(0, 204, 68, 0.1)' }]}>
                                  <Text style={[styles.saludTag, { color: '#00cc44', fontWeight: '800' }]}>{h.valor} ms</Text>
                                  {h.ctx && <Text style={[styles.saludTagCtx, { color: '#00cc4488' }]}>{h.ctx}</Text>}
                                </View>
                              ))}
                            </View>
                          )}
                          {tieneOtros && (
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                              {grupo.otros.sueno != null && (
                                <View style={[styles.saludTagWrap, { backgroundColor: 'rgba(153, 51, 255, 0.1)' }]}>
                                  <Text style={[styles.saludTag, { color: '#9933ff', fontWeight: '800' }]}>Sueño {grupo.otros.sueno}h</Text>
                                </View>
                              )}
                              {grupo.otros.hidratacion != null && (
                                <View style={[styles.saludTagWrap, { backgroundColor: `rgba(${acRgb},0.1)` }]}>
                                  <Text style={[styles.saludTag, { color: accentColor, fontWeight: '800' }]}>H₂O {grupo.otros.hidratacion}L</Text>
                                </View>
                              )}
                              {grupo.otros.energia != null && (
                                <View style={[styles.saludTagWrap, { backgroundColor: 'rgba(255, 204, 0, 0.1)' }]}>
                                  <Text style={[styles.saludTag, { color: '#ffcc00', fontWeight: '800' }]}>Energía {grupo.otros.energia}/10</Text>
                                </View>
                              )}
                              {grupo.otros.doms != null && (
                                <View style={[styles.saludTagWrap, { backgroundColor: 'rgba(255, 153, 0, 0.1)' }]}>
                                  <Text style={[styles.saludTag, { color: '#ff9900', fontWeight: '800' }]}>DOMS {grupo.otros.doms}/10</Text>
                                </View>
                              )}
                            </View>
                          )}
                        </View>
                          </View>
                        </Pressable>
                      </View>
                    )
                  })}
                  {/* Ver más / Ver menos integrado en AppleBentoCard */}
                  {hayMas && (
                    <Pressable
                      style={({ pressed }) => [
                        { paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: `rgba(${acRgb},0.05)`, gap: 6 },
                        pressed && { backgroundColor: `rgba(${acRgb},0.08)` }
                      ]}
                      onPress={() => setHistorialExpandido(!historialExpandido)}
                    >
                      <Text style={{ color: accentColor, fontSize: 13, fontWeight: '700' }}>
                        {historialExpandido
                          ? 'Ver menos'
                          : `Ver ${entradasOrdenadas.length - VISIBLE} más`}
                      </Text>
                      <AntDesign name="right" size={12} color={accentColor} />
                    </Pressable>
                  )}
                        </AppleBentoCard>
                      </>
                    )
                  })()}
                </>
              )
            })()}
            {registrosSalud.length === 0 && !saludFormVisible && (
              <View style={styles.saludEmpty}>
                <Text style={styles.saludEmptyText}>Sin registros de salud</Text>
                <Text style={styles.saludEmptySub}>Toca "Nuevo registro" para empezar</Text>
              </View>
            )}

          </View>
        )}
      {/* MODAL REGISTRO CUERPO — COMPACTO PREMIUM 2026 */}
      <ManagedModal visible={formVisible} transparent animationType="none">
        <Animated.View style={[styles.saludModalOverlay, { opacity: cuerpoOverlayAnim, paddingBottom: kbHeight }]}>
          <View style={StyleSheet.absoluteFill} onTouchEnd={cerrarCuerpoForm} />
          
          <CardEntrance ref={cuerpoCardRef} trigger={formVisible} originRect={cuerpoRegistrarOriginRect} style={[styles.saludModalBox, { paddingHorizontal: 20, paddingBottom: 24, width: '90%', maxWidth: 340 }]}>
            <View style={styles.saludModalHandle} />
            
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <StaggerChildren trigger={formVisible} delay={60} step={40}>

                {/* HEADER COMPACTO */}
                <View style={{ marginTop: 5, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
                    <Text style={{ fontSize: 9, fontWeight: '900', color: '#8E8E93', letterSpacing: 1.5 }}>NUEVO REGISTRO</Text>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: '#fff', marginTop: 2 }}>Estado Físico</Text>
                  </View>
                  <TouchableOpacity onPress={cerrarCuerpoForm} style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' }}>
                    <AntDesign name="close" size={14} color="#fff" />
                  </TouchableOpacity>
                </View>

                {/* CAMPO: PESO HERO COMPACTO */}
                <View style={{ marginBottom: 24 }}>
                  <Text style={{ fontSize: 9, fontWeight: '800', color: accentColor, letterSpacing: 1.2, marginBottom: 4 }}>PESO ACTUAL</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                    <TextInput
                      style={{ fontSize: 48, fontWeight: '300', color: '#fff', letterSpacing: -1.5 }}
                      placeholder="0.0"
                      placeholderTextColor="rgba(255,255,255,0.05)"
                      keyboardType="decimal-pad"
                      value={nuevaMetrica.peso}
                      onChangeText={t => setNuevaMetrica(p => ({ ...p, peso: t }))}
                    />
                    <View style={{ flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 3 }}>
                      {['kg', 'lbs'].map(u => (
                        <TouchableOpacity 
                          key={u}
                          onPress={() => setNuevaMetrica(p => ({ ...p, unidad: u }))}
                          style={[{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7 }, nuevaMetrica.unidad === u && { backgroundColor: accentColor }]}
                        >
                          <Text style={{ color: nuevaMetrica.unidad === u ? '#fff' : '#8E8E93', fontWeight: '800', fontSize: 9 }}>{u.toUpperCase()}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>

                {/* COLUMNAS: GRASA Y MÚSCULO COMPACTAS */}
                <View style={{ flexDirection: 'row', gap: 20, marginBottom: 24 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 9, fontWeight: '800', color: '#ff3355', letterSpacing: 1.2, marginBottom: 6 }}>GRASA %</Text>
                    <TextInput
                      style={{ fontSize: 24, fontWeight: '300', color: '#fff', borderBottomWidth: 1, borderBottomColor: 'rgba(255,51,85,0.2)', paddingBottom: 4 }}
                      placeholder="0.0"
                      placeholderTextColor="rgba(255,255,255,0.05)"
                      keyboardType="decimal-pad"
                      value={nuevaMetrica.grasaPct}
                      onChangeText={t => setNuevaMetrica(p => ({ ...p, grasaPct: t }))}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 9, fontWeight: '800', color: '#00cc44', letterSpacing: 1.2, marginBottom: 6 }}>MÚSCULO %</Text>
                    <TextInput
                      style={{ fontSize: 24, fontWeight: '300', color: '#fff', borderBottomWidth: 1, borderBottomColor: 'rgba(0,204,68,0.2)', paddingBottom: 4 }}
                      placeholder="0.0"
                      placeholderTextColor="rgba(255,255,255,0.05)"
                      keyboardType="decimal-pad"
                      value={nuevaMetrica.musculoPct}
                      onChangeText={t => setNuevaMetrica(p => ({ ...p, musculoPct: t }))}
                    />
                  </View>
                </View>

                {/* FECHA COMPACTA */}
                <TouchableOpacity 
                  onPress={() => setMostrarCalendarioCuerpo(!mostrarCalendarioCuerpo)}
                  style={{ paddingVertical: 14, borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}
                >
                  <Text style={{ color: '#8E8E93', fontSize: 13, fontWeight: '600' }}>Fecha</Text>
                  <Text style={{ color: accentColor, fontSize: 13, fontWeight: '700' }}>
                    {new Date(fechaMetrica + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                  </Text>
                </TouchableOpacity>

                {mostrarCalendarioCuerpo && (
                  <CardEntrance animate ref={calCuerpoModalRef} style={[styles.saludCalendarioWrap, { marginTop: -15, marginBottom: 20 }]}>
                    <CalendarioSelector
                      fechaInicio={fechaMetrica}
                      onSeleccionar={f => {
                        setFechaMetrica(f)
                        calCuerpoModalRef.current?.animateOut(() => setMostrarCalendarioCuerpo(false))
                      }}
                      onCerrar={() => calCuerpoModalRef.current?.animateOut(() => setMostrarCalendarioCuerpo(false))}
                    />
                  </CardEntrance>
                )}

                {/* BOTÓN REGISTRAR: COMPACT PILL */}
                <TouchableOpacity 
                  onPress={guardarNuevaMetrica} 
                  activeOpacity={0.8}
                  style={{ alignSelf: 'center', width: '100%' }}
                >
                  <LinearGradient 
                    colors={[accentColor, accentColor]} 
                    start={{x:0, y:0}} 
                    end={{x:1, y:0}} 
                    style={{ height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 1 }}>FINALIZAR</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity onPress={cerrarCuerpoForm} style={{ marginTop: 16, alignSelf: 'center' }}>
                  <Text style={{ color: 'rgba(255,255,255,0.3)', fontWeight: '700', fontSize: 11, letterSpacing: 1 }}>CANCELAR</Text>
                </TouchableOpacity>

              </StaggerChildren>
            </ScrollView>
          </CardEntrance>
        </Animated.View>
      </ManagedModal>

      {/* MODAL REGISTRO SALUD — COMPACTO PREMIUM 2026 */}
      <ManagedModal visible={saludFormVisible} transparent animationType="none">
        <Animated.View style={[styles.saludModalOverlay, { opacity: saludOverlayAnim, paddingBottom: kbHeight }]}>
          <View style={StyleSheet.absoluteFill} onTouchEnd={toggleSaludForm} />
          
          <CardEntrance ref={saludCardRef} trigger={saludFormVisible} originRect={saludOriginRect} style={[styles.saludModalBox, { paddingHorizontal: 20, paddingBottom: 24, width: '90%', maxWidth: 340 }]}>
            <View style={styles.saludModalHandle} />
            
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <StaggerChildren trigger={saludFormVisible} delay={60} step={40}>

                {/* HEADER COMPACTO */}
                <View style={{ marginTop: 5, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
                    <Text style={{ fontSize: 9, fontWeight: '900', color: '#8E8E93', letterSpacing: 1.5 }}>NUEVO REGISTRO</Text>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: '#fff', marginTop: 2 }}>Signos y Salud</Text>
                  </View>
                  <TouchableOpacity onPress={toggleSaludForm} style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' }}>
                    <AntDesign name="close" size={14} color="#fff" />
                  </TouchableOpacity>
                </View>

                {/* FECHA COMPACTA */}
                <TouchableOpacity 
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                    setMostrarCalendarioSalud(!mostrarCalendarioSalud)
                  }}
                  style={{ paddingVertical: 14, borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}
                >
                  <Text style={{ color: '#8E8E93', fontSize: 13, fontWeight: '600' }}>Fecha del registro</Text>
                  <Text style={{ color: accentColor, fontSize: 13, fontWeight: '700' }}>
                    {new Date(fechaSalud + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                  </Text>
                </TouchableOpacity>

                {mostrarCalendarioSalud && (
                  <CardEntrance ref={saludCalendarRef} animate style={[styles.saludCalendarioWrap, { marginTop: -15, marginBottom: 20 }]}>
                    <CalendarioSelector
                      fechaInicio={fechaSalud}
                      onSeleccionar={f => { 
                        setFechaSalud(f); 
                        saludCalendarRef.current?.animateOut(() => setMostrarCalendarioSalud(false)) 
                      }}
                      onCerrar={() => saludCalendarRef.current?.animateOut(() => setMostrarCalendarioSalud(false))}
                    />
                  </CardEntrance>
                )}

                {/* SELECCIÓN DE MÉTRICAS COMPACTA */}
                <View style={{ marginBottom: 24 }}>
                  <Text style={{ fontSize: 9, fontWeight: '800', color: '#8E8E93', letterSpacing: 1.2, marginBottom: 10 }}>¿QUÉ DESEAS REGISTRAR?</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {METRICAS_SALUD.map(m => {
                      const sel = metricasSeleccionadas.includes(m.key)
                      return (
                        <TouchableOpacity
                          key={m.key}
                          style={[{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', backgroundColor: 'rgba(255,255,255,0.02)' },
                            sel && { borderColor: m.color, backgroundColor: m.color + '15' }
                          ]}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                            toggleMetrica(m.key)
                          }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '700', color: sel ? m.color : '#8E8E93' }}>{m.label.toUpperCase()}</Text>
                        </TouchableOpacity>
                      )
                    })}
                  </View>
                </View>

                {/* CAMPOS DINÁMICOS COMPACTOS */}
                {metricasSeleccionadas.length > 0 && (
                  <View style={{ gap: 10, marginBottom: 30 }}>
                    {metricasSeleccionadas.map(key => {
                      const meta = METRICAS_SALUD.find(m => m.key === key)
                      if (!meta) return null
                      return (
                        <CardEntrance key={key} animate ref={r => { saludCampoRefs.current[key] = r }} style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: meta.color + '33' }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <Text style={{ fontSize: 9, fontWeight: '900', color: meta.color, letterSpacing: 1 }}>{meta.label.toUpperCase()}</Text>
                            {meta.ref && <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>REF: {meta.ref}</Text>}
                          </View>

                          {/* Selector de contexto (Ayunas, Mañana, etc) */}
                          {meta.contextos && (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                              <View style={{ flexDirection: 'row', gap: 6 }}>
                                {meta.contextos.map(ctx => {
                                  const esActivo = contextosSalud[key] === ctx
                                  return (
                                    <TouchableOpacity
                                      key={ctx}
                                      onPress={() => setContextosSalud(p => ({ ...p, [key]: ctx }))}
                                      style={[{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }, esActivo && { borderColor: meta.color, backgroundColor: meta.color + '15' }]}
                                    >
                                      <Text style={{ fontSize: 10, fontWeight: '700', color: esActivo ? meta.color : '#8E8E93' }}>{ctx}</Text>
                                    </TouchableOpacity>
                                  )
                                })}
                              </View>
                            </ScrollView>
                          )}

                          {meta.tipo === 'presion' ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                              <TextInput style={{ fontSize: 28, fontWeight: '300', color: '#fff', textAlign: 'center', width: 60 }}
                                placeholder="120" placeholderTextColor="rgba(255,255,255,0.05)" keyboardType="decimal-pad"
                                value={nuevaSalud.presion_sistolica}
                                onChangeText={t => setNuevaSalud(p => ({ ...p, presion_sistolica: t }))} />
                              <Text style={{ color: 'rgba(255,255,255,0.1)', fontSize: 20 }}>/</Text>
                              <TextInput style={{ fontSize: 28, fontWeight: '300', color: '#fff', textAlign: 'center', width: 60 }}
                                placeholder="80" placeholderTextColor="rgba(255,255,255,0.05)" keyboardType="decimal-pad"
                                value={nuevaSalud.presion_diastolica}
                                onChangeText={t => setNuevaSalud(p => ({ ...p, presion_diastolica: t }))} />
                              <Text style={{ color: '#8E8E93', fontSize: 11, fontWeight: '600' }}>mmHg</Text>
                            </View>
                          ) : meta.tipo === 'escala' ? (
                            <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
                              {[1,2,3,4,5,6,7,8,9,10].map(n => (
                                <TouchableOpacity
                                  key={n}
                                  style={[{ width: 28, height: 28, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' }, nuevaSalud[key] === String(n) && { backgroundColor: meta.color, borderColor: meta.color }]}
                                  onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                                    setNuevaSalud(p => ({ ...p, [key]: String(n) }))
                                  }}
                                >
                                  <Text style={{ fontSize: 11, fontWeight: '800', color: nuevaSalud[key] === String(n) ? '#fff' : '#8E8E93' }}>{n}</Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          ) : (
                            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 6 }}>
                              <TextInput
                                style={{ fontSize: 32, fontWeight: '300', color: '#fff', textAlign: 'center', minWidth: 80 }}
                                placeholder={meta.placeholder} placeholderTextColor="rgba(255,255,255,0.05)" keyboardType="decimal-pad"
                                value={nuevaSalud[key]}
                                onChangeText={t => setNuevaSalud(p => ({ ...p, [key]: t }))} />
                              <Text style={{ color: '#8E8E93', fontSize: 12, fontWeight: '600' }}>{meta.unit}</Text>
                            </View>
                          )}
                        </CardEntrance>
                      )
                    })}
                  </View>
                )}

                {/* BOTÓN FINAL COMPACTO */}
                {showGuardar && (
                  <TouchableOpacity 
                    onPress={guardarNuevaSalud} 
                    activeOpacity={0.8}
                    style={{ alignSelf: 'center', width: '100%' }}
                  >
                    <LinearGradient 
                      colors={[accentColor, accentColor]} 
                      start={{x:0, y:0}} 
                      end={{x:1, y:0}} 
                      style={{ height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Text style={{ color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 1.5 }}>FINALIZAR</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}

                <TouchableOpacity onPress={toggleSaludForm} style={{ marginTop: 16, alignSelf: 'center' }}>
                  <Text style={{ color: 'rgba(255,255,255,0.3)', fontWeight: '700', fontSize: 11, letterSpacing: 1 }}>CANCELAR</Text>
                </TouchableOpacity>

              </StaggerChildren>
            </ScrollView>
          </CardEntrance>
        </Animated.View>
      </ManagedModal>
      </ScrollView>

      {/* MODAL CONFIRMAR ELIMINAR SALUD */}
      <DeleteConfirmModal
        visible={!!saludAEliminar}
        onCancel={() => setSaludAEliminar(null)}
        onConfirm={confirmarEliminarSalud}
        title="¿Eliminar registro del día?"
        subtitle={saludAEliminar?.fechaKey ? new Date(saludAEliminar.fechaKey + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
        warning={`Se eliminarán ${saludAEliminar?.indices?.length || 1} registro${(saludAEliminar?.indices?.length || 1) > 1 ? 's' : ''} de este día. Esta acción no se puede deshacer.`}
      />

      {/* MODAL CONFIRMAR ELIMINAR MÉTRICA */}
      <DeleteConfirmModal
        visible={metricaAEliminar !== null}
        onCancel={() => setMetricaAEliminar(null)}
        onConfirm={confirmarEliminarMetrica}
        title="¿Eliminar registro?"
        subtitle={metricaAEliminar !== null && metricas[metricaAEliminar] ? new Date(metricas[metricaAEliminar].fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
        warning="Esta acción no se puede deshacer."
      />

      {/* MODAL SELECTOR EJERCICIO */}
      <ManagedModal visible={mostrarSelectorEjercicios} transparent animationType="none">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={cerrarSelectorEjercicios}>
          <CardEntrance ref={ejercicioModalCardRef} trigger={mostrarSelectorEjercicios} originRect={ejercicioOriginRect} style={styles.selectorModal}>
              <View style={styles.selectorHeader}>
                  <Text style={styles.selectorTitulo}>Selecciona ejercicio</Text>
                  <TouchableOpacity onPress={cerrarSelectorEjercicios}>
                    <AntDesign name="close" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
                <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
                  {ejerciciosConHistorial.map((ej, index) => (
                    <View key={ej.id}>
                      {index > 0 && <View style={{ height: 1, backgroundColor: `rgba(${acRgb},0.15)`, marginLeft: 20 }} />}
                      <Pressable
                        style={({ pressed }) => [styles.selectorItem, pressed && { opacity: 0.7 }]}
                        onPress={() => { setEjercicioSeleccionado(ej); setSesionActivaIndex(0); cerrarSelectorEjercicios() }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.selectorItemNombre, ejercicioSeleccionado?.id === ej.id && { color: '#fff' }]}>{ej.nombre}</Text>
                          <Text style={styles.selectorItemSesiones}>{ej.historial.length} sesiones</Text>
                        </View>
                        {ejercicioSeleccionado?.id === ej.id && <AntDesign name="check" size={18} color={accentColor} />}
                      </Pressable>
                    </View>
                  ))}
                </ScrollView>
          </CardEntrance>
        </TouchableOpacity>
      </ManagedModal>

      {/* MODAL CONFIRMAR ELIMINAR */}
      <DeleteConfirmModal
        visible={!!sesionAEliminar}
        onCancel={() => setSesionAEliminar(null)}
        onConfirm={confirmarEliminarSesion}
        title="¿Eliminar sesión?"
        subtitle={sesionAEliminar && new Date(sesionAEliminar.sesion.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
        warning="Esta acción no se puede deshacer."
      />

      {/* MODAL CONFIG MÉTRICAS */}
      {modalMetricasConfig && (
        <ManagedModal visible={true} transparent animationType="none">
          <DraggableSheet
            onClose={() => { setMetricaExpandida(null); setModalMetricasConfig(false) }}
            gradientColors={[gradColors[0], gradColors[1] || gradColors[0]]}
            containerStyle={{ maxHeight: '80%' }}
            scrollable
            header={
              <View style={{ paddingHorizontal: 4, paddingBottom: 12 }}>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '900', marginBottom: 2 }}>Ajustes de salud</Text>
                <Text style={{ color: '#8E8E93', fontSize: 12 }}>Perfil, métricas y límites personalizados</Text>

                {/* Selector de perfil */}
                <View style={{ marginTop: 16 }}>
                  <Text style={{ color: '#8E8E93', fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 8 }}>PERFIL ATLÉTICO</Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {Object.entries(PERFILES_SALUD).map(([key, p]) => (
                      <TouchableOpacity
                        key={key}
                        style={{ flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1, alignItems: 'center',
                          borderColor: perfilSalud === key ? accentColor : 'rgba(255,255,255,0.1)',
                          backgroundColor: perfilSalud === key ? `rgba(${acRgb},0.15)` : 'rgba(255,255,255,0.03)' }}
                        onPress={async () => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                          setPerfilSalud(key)
                          const AsyncStorage = require('@react-native-async-storage/async-storage').default
                          await AsyncStorage.setItem(`perfil_salud_${userId}`, key)
                        }}
                      >
                        <Text style={{ color: perfilSalud === key ? accentColor : '#8E8E93', fontSize: 11, fontWeight: '700' }}>{p.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {perfilSalud !== 'recreativo' && (
                    <Text style={{ color: '#8E8E93', fontSize: 9, marginTop: 8, fontStyle: 'italic', lineHeight: 13 }}>
                      ⚠ Los rangos de este perfil son "Rango Objetivo" definidos por el usuario, no referencias médicas estándar.
                    </Text>
                  )}
                </View>

                {/* Overrides manuales de presión */}
                <View style={{ marginTop: 16 }}>
                  <Text style={{ color: '#8E8E93', fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 8 }}>LÍMITES PERSONALIZADOS — PRESIÓN</Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    {[
                      { key: 'presion_s_lo', label: 'Sistólica Lo' },
                      { key: 'presion_s_hi', label: 'Sistólica Hi' },
                      { key: 'presion_d_hi', label: 'Diastólica Hi' },
                    ].map(({ key: lk, label }) => (
                      <View key={lk} style={{ flex: 1 }}>
                        <Text style={{ color: '#8E8E93', fontSize: 9, marginBottom: 4 }}>{label}</Text>
                        <TextInput
                          value={limitesManuales[lk] != null ? String(limitesManuales[lk]) : ''}
                          onChangeText={async txt => {
                            const nuevo = { ...limitesManuales }
                            if (txt === '') { delete nuevo[lk] } else { nuevo[lk] = txt }
                            setLimitesManuales(nuevo)
                            const AsyncStorage = require('@react-native-async-storage/async-storage').default
                            await AsyncStorage.setItem(`limites_manuales_${userId}`, JSON.stringify(nuevo))
                          }}
                          keyboardType="numeric"
                          placeholder={String(getPresionRef(perfilSalud, {})[lk.replace('presion_', '')] || '—')}
                          placeholderTextColor="#444"
                          style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, color: '#fff', fontSize: 12, textAlign: 'center' }}
                        />
                      </View>
                    ))}
                  </View>
                </View>

                {/* Overrides manuales de glucosa (solo ayunas para simplificar) */}
                <View style={{ marginTop: 12 }}>
                  <Text style={{ color: '#8E8E93', fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 8 }}>LÍMITES PERSONALIZADOS — GLUCOSA (AYUNAS)</Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    {[
                      { key: 'glucosa_Ayunas_lo', label: 'Lo' },
                      { key: 'glucosa_Ayunas_hi', label: 'Hi' },
                    ].map(({ key: lk, label }) => (
                      <View key={lk} style={{ flex: 1 }}>
                        <Text style={{ color: '#8E8E93', fontSize: 9, marginBottom: 4 }}>{label}</Text>
                        <TextInput
                          value={limitesManuales[lk] != null ? String(limitesManuales[lk]) : ''}
                          onChangeText={async txt => {
                            const nuevo = { ...limitesManuales }
                            if (txt === '') { delete nuevo[lk] } else { nuevo[lk] = txt }
                            setLimitesManuales(nuevo)
                            const AsyncStorage = require('@react-native-async-storage/async-storage').default
                            await AsyncStorage.setItem(`limites_manuales_${userId}`, JSON.stringify(nuevo))
                          }}
                          keyboardType="numeric"
                          placeholder={String(getGlucosaRef('Ayunas', perfilSalud, {})[lk.includes('_lo') ? 'lo' : 'hi'] || '—')}
                          placeholderTextColor="#444"
                          style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, color: '#fff', fontSize: 12, textAlign: 'center' }}
                        />
                      </View>
                    ))}
                  </View>
                </View>

                <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginTop: 16 }} />
                <Text style={{ color: '#8E8E93', fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginTop: 14 }}>MÉTRICAS VISIBLES EN GRÁFICA</Text>
              </View>
            }
          >
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Pressable onPress={() => {
              if (metricaExpandida) {
                Animated.timing(expandAnims[metricaExpandida], { toValue: 0, duration: 180, easing: Easing.in(Easing.cubic), useNativeDriver: false }).start()
                setMetricaExpandida(null)
              }
            }}>
              <View style={{ gap: 2 }}>
                {METRICAS_SALUD.map((m, i, arr) => {
                  const activa = metricasHabilitadas.includes(m.key)
                  const expandida = metricaExpandida === m.key
                  const ctxsActivos = contextosHabilitados[m.key] || []
                  return (
                    <Pressable key={m.key} onPress={() => {}}>
                      <TouchableOpacity
                        style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 14 }}
                        onPress={async () => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                          const nuevas = activa
                            ? metricasHabilitadas.filter(k => k !== m.key)
                            : [...metricasHabilitadas, m.key]
                          setMetricasHabilitadas(nuevas)
                          const AsyncStorage = require('@react-native-async-storage/async-storage').default
                          await AsyncStorage.setItem(`metricas_habilitadas_${userId}`, JSON.stringify(nuevas))
                          if (!nuevas.includes(metricaSaludGrafica) && nuevas.length > 0) setMetricaSaludGrafica(nuevas[0])
                        }}
                      >
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: m.color }} />
                        <Text style={{ flex: 1, color: activa ? '#fff' : '#8E8E93', fontSize: 14, fontWeight: '600' }}>{m.label}</Text>
                        <Text style={{ color: '#8E8E93', fontSize: 12, marginRight: 8 }}>{m.unit}</Text>
                        {m.contextos && (
                          <TouchableOpacity
                            onPress={() => {
                              const opening = !expandida
                              if (opening) {
                                // Cerrar cualquier otro abierto
                                if (metricaExpandida && metricaExpandida !== m.key) {
                                  Animated.timing(expandAnims[metricaExpandida], { toValue: 0, duration: 160, easing: Easing.in(Easing.cubic), useNativeDriver: false }).start()
                                }
                                setMetricaExpandida(m.key)
                                requestAnimationFrame(() => {
                                  Animated.timing(expandAnims[m.key], { toValue: 1, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start()
                                })
                              } else {
                                Animated.timing(expandAnims[m.key], { toValue: 0, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: false }).start(() => setMetricaExpandida(null))
                              }
                            }}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            style={{ marginRight: 8 }}
                          >
                            <AntDesign name={expandida ? 'up' : 'down'} size={11} color={activa ? m.color : '#8E8E93'} />
                          </TouchableOpacity>
                        )}
                        <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: activa ? m.color : 'rgba(255,255,255,0.15)', backgroundColor: activa ? m.color + '33' : 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                          {activa && <AntDesign name="check" size={11} color={m.color} />}
                        </View>
                      </TouchableOpacity>
                      {m.contextos && (
                        <Animated.View style={{
                          height: expandAnims[m.key]?.interpolate({ inputRange: [0, 1], outputRange: [0, m.contextos.length * 38 + 10] }),
                          opacity: expandAnims[m.key],
                          overflow: 'hidden',
                        }}>
                          <View style={{ paddingLeft: 24, paddingBottom: 10, gap: 2 }}>
                            {m.contextos.map(ctx => {
                              const ctxActivo = ctxsActivos.includes(ctx)
                              return (
                                <TouchableOpacity
                                  key={ctx}
                                  style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 9, gap: 12 }}
                                  onPress={async () => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                                    const nuevosCont = ctxActivo
                                      ? ctxsActivos.filter(c => c !== ctx)
                                      : [...ctxsActivos, ctx]
                                    const nuevosAll = { ...contextosHabilitados, [m.key]: nuevosCont }
                                    setContextosHabilitados(nuevosAll)
                                    const AsyncStorage = require('@react-native-async-storage/async-storage').default
                                    await AsyncStorage.setItem(`contextos_habilitados_${userId}`, JSON.stringify(nuevosAll))
                                  }}
                                >
                                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: ctxActivo ? m.color : 'rgba(255,255,255,0.15)' }} />
                                  <Text style={{ flex: 1, color: ctxActivo ? '#ccc' : '#555', fontSize: 13 }}>{ctx}</Text>
                                  {m.refsCtx?.[ctx] && <Text style={{ color: '#555', fontSize: 11 }}>Ref: {m.refsCtx[ctx]}</Text>}
                                  <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: ctxActivo ? m.color : 'rgba(255,255,255,0.1)', backgroundColor: ctxActivo ? m.color + '33' : 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                                    {ctxActivo && <AntDesign name="check" size={9} color={m.color} />}
                                  </View>
                                </TouchableOpacity>
                              )
                            })}
                          </View>
                        </Animated.View>
                      )}
                      {i < arr.length - 1 && <View style={{ height: 0.5, backgroundColor: 'rgba(255,255,255,0.06)' }} />}
                    </Pressable>
                  )
                })}
              </View>
            </Pressable>
            </ScrollView>
          </DraggableSheet>
        </ManagedModal>
      )}

      {/* TOOLTIP FLOTANTE — descripción de métrica */}
      {metricaTooltip && (
        <Pressable
          style={[StyleSheet.absoluteFillObject, { zIndex: 999 }]}
          onPress={() => {
            clearTimeout(tooltipTimer.current)
            Animated.timing(tooltipAnim, { toValue: 0, duration: 180, easing: Easing.in(Easing.cubic), useNativeDriver: true })
              .start(() => setMetricaTooltip(null))
          }}
        >
          <Animated.View style={{
            position: 'absolute',
            top: Math.max(metricaTooltip.y - 110, 60),
            left: 20, right: 20,
            backgroundColor: '#0d1022',
            borderRadius: 14,
            borderWidth: 1,
            borderColor: metricaTooltip.color + '44',
            padding: 14,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.4,
            shadowRadius: 16,
            elevation: 16,
            opacity: tooltipAnim,
            transform: [{
              scale: tooltipAnim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] })
            }, {
              translateY: tooltipAnim.interpolate({ inputRange: [0, 1], outputRange: [6, 0] })
            }],
          }}>
            <Text style={{ color: metricaTooltip.color, fontSize: 12, fontWeight: '800', marginBottom: 6 }}>
              {metricaTooltip.label}
            </Text>
            <Text style={{ color: 'rgba(200,210,230,0.75)', fontSize: 12, lineHeight: 18 }}>
              {metricaTooltip.desc}
            </Text>
          </Animated.View>
        </Pressable>
      )}

    </LinearGradient>
  )
}

function createStyles(accentColor, acRgb) {
  return StyleSheet.create({
  gradient: { flex: 1 },
  container: { padding: 20, paddingTop: 56, paddingBottom: LAYOUT.bottomTabSpace || 150 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },

  // TABS
  tabsRow: { flexDirection: 'row', gap: 6, marginBottom: 20, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 16 },
  tabBtnActivo: { backgroundColor: `rgba(${acRgb},0.1)`, borderWidth: 1, borderColor: `rgba(${acRgb},0.3)` },
  tabBtnText: { color: '#8E8E93', fontSize: 13, fontWeight: '700' },
  tabBtnTextActivo: { color: accentColor },

  // CUERPO
  cuerpoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cuerpoValorPrincipal: { fontSize: 32, fontWeight: '900', color: '#fff' },
  cuerpoFecha: { color: `rgba(${acRgb},0.5)`, fontSize: 11, marginTop: 2 },
  cuerpoVacio: { color: `rgba(${acRgb},0.5)`, fontSize: 14 },
  cuerpoAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: `rgba(${acRgb},0.3)`, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: `rgba(${acRgb},0.1)` },
  cuerpoAddBtnActivo: { borderColor: 'rgba(255,51,85,0.3)', backgroundColor: 'rgba(255,51,85,0.1)' },
  cuerpoAddText: { color: accentColor, fontSize: 13, fontWeight: '700' },
  cuerpoForm: { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 20, padding: 20, marginBottom: 20, gap: 16 },
  unidadRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  unidadBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'transparent' },
  unidadBtnActivo: { borderColor: `rgba(${acRgb},0.3)`, backgroundColor: `rgba(${acRgb},0.1)` },
  unidadText: { color: '#8E8E93', fontWeight: '600', fontSize: 13 },
  unidadTextActivo: { color: accentColor, fontWeight: '700' },
  cuerpoFormRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  cuerpoInputWrap: { flex: 1 },
  cuerpoInputLabel: { color: '#8E8E93', fontSize: 9, fontWeight: '800', letterSpacing: 1, marginBottom: 6 },
  cuerpoInput: { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 14, color: '#fff', fontSize: 16, textAlign: 'center', fontWeight: '600' },
  cuerpoHistorialDelBtn: { width: 32, height: 32, borderRadius: 10, borderWidth: 1, borderColor: '#ff3355', backgroundColor: '#1a0005', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  cuerpoGuardarBtn: { borderRadius: 16, overflow: 'hidden', marginTop: 12 },
  cuerpoGuardarGradient: { padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  cuerpoGuardarText: { color: '#fff', fontWeight: '900', fontSize: 16, letterSpacing: 0.5 },
  metricaSelector: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  metricaSelectorBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'transparent', alignItems: 'center' },
  metricaSelectorBtnActivo: { borderColor: `rgba(${acRgb},0.3)`, backgroundColor: `rgba(${acRgb},0.1)` },
  metricaSelectorText: { color: '#8E8E93', fontSize: 13, fontWeight: '600' },
  metricaSelectorTextActivo: { color: accentColor, fontWeight: '700' },
  cuerpoStatsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  cuerpoStatCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 16, alignItems: 'center' },
  cuerpoStatLabel: { color: '#8E8E93', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 6 },
  cuerpoStatVal: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: -1.0 },
  cuerpoStatUnit: { color: accentColor, fontSize: 12, fontWeight: '600' },
  cuerpoStatDelta: { fontSize: 11, fontWeight: '700', marginTop: 4 },
  cuerpoHistorialTitulo: { color: '#8E8E93', fontSize: 10, fontWeight: '800', letterSpacing: 2, marginBottom: 10 },
  cuerpoHistorialItem: { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: `rgba(${acRgb},0.2)`, borderRadius: 16, padding: 16 },
  cuerpoHistorialTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 10, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.1)' },
  cuerpoHistorialFecha: { color: accentColor, fontSize: 13, fontWeight: '700' },
  cuerpoHistorialVals: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', alignItems: 'flex-start' },
  cuerpoMetricaTag: { alignSelf: 'flex-start', alignItems: 'center', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  cuerpoMetricaVal: { color: accentColor, fontSize: 13, fontWeight: '900' },
  cuerpoMetricaUnit: { color: '#8E8E93', fontSize: 9, fontWeight: '700', marginTop: 1 },
  cuerpoHistorialTag: { color: '#8E8E93', fontSize: 11, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  titulo: { fontSize: 28, fontWeight: '900', color: '#fff' },
  emptyBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 50, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginTop: 16, borderStyle: 'dashed' },
  emptyTitulo: { fontSize: 16, fontWeight: '700', color: '#fff', marginTop: 12, marginBottom: 6 },
  emptySub: { fontSize: 13, color: '#8E8E93', textAlign: 'center', paddingHorizontal: 32 },

  sectionLabel: { fontSize: 10, fontWeight: '800', color: '#8E8E93', letterSpacing: 2, marginBottom: 10 },

  // Filtro dropdown
  filtroDropdownBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 16
  },
  filtroDropdownLabel: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '600' },
  filtroModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 2, 15, 0.85)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  filtroModalBox: { backgroundColor: `rgba(${acRgb},0.08)`, borderRadius: 32, borderWidth: 1, borderColor: `rgba(${acRgb},0.3)`, width: '100%', overflow: 'hidden' },
  filtroModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 0 },
  filtroModalTitulo: { fontSize: 20, fontWeight: '700', color: '#fff' },
  filtroProgRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 0 },
  filtroProgRowActivo: { backgroundColor: 'transparent' },
  filtroProgNombre: { flex: 1, color: '#fff', fontSize: 15, fontWeight: '500' },
  filtroBloqueRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 16, paddingRight: 20, borderBottomWidth: 0 },
  filtroBloqueRowActivo: { backgroundColor: 'transparent' },
  filtroBloqueIndent: { width: 28 },
  filtroBloqueName: { flex: 1, color: '#8E8E93', fontSize: 14, fontWeight: '500' },

  // Ejercicio
  ejercicioBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: `rgba(${acRgb},0.1)`, borderWidth: 1, borderColor: `rgba(${acRgb},0.3)`,
    borderRadius: 20, padding: 16, marginBottom: 16 },
  ejercicioBtnNombre: { color: '#ffffff', fontSize: 16, fontWeight: '700', marginBottom: 2 },
  ejercicioBtnSub: { color: '#8E8E93', fontSize: 12, fontWeight: '500' },

  // Stats cards grandes y atractivas
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 12, alignItems: 'center', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  statCardLabel: { color: '#8E8E93', fontSize: 9, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  statCardVal: { color: '#ffffff', fontSize: 18, fontWeight: '900', lineHeight: 22, letterSpacing: -1.0 },
  statCardUnit: { color: accentColor, fontSize: 10, fontWeight: '700', marginTop: 1, marginBottom: 6 },
  statCardBar: { width: '100%', height: 2, borderRadius: 2, opacity: 0.6 },
  statCardDelta: { fontSize: 10, fontWeight: '700', marginTop: 3 },
  cuerpoChartDeltaRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 12, paddingTop: 10, borderTopWidth: 0.5, borderTopColor: '#0f1a3a' },
  cuerpoChartDeltaItem: { alignItems: 'center', gap: 2 },
  cuerpoChartDeltaVal: { fontSize: 15, fontWeight: '900', letterSpacing: -0.5 },
  cuerpoChartDeltaLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },

  // Feedback inline
  feedbackInline: { flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16 },
  feedbackInlineLabel: { color: '#8E8E93', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  feedbackInlineVals: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  feedbackInlineItem: { color: '#EBEBF5', fontSize: 12, fontWeight: '600' },
  feedbackInlineNum: { color: accentColor, fontWeight: '900' },

  // Gráfica
  chartBox: { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20, padding: 16, marginBottom: 16 },
  chartHeader: { flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 12 },
  chartTitulo: { color: '#fff', fontSize: 13, fontWeight: '700', flex: 1 },
  chartMetricRow: { flexDirection: 'row', gap: 6 },
  chartMetricBtn: { paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'transparent' },
  chartMetricBtnActivo: { borderColor: `rgba(${acRgb},0.3)`, backgroundColor: `rgba(${acRgb},0.1)` },
  chartMetricText: { color: '#8E8E93', fontSize: 12, fontWeight: '600' },
  chartMetricTextActivo: { color: accentColor, fontWeight: '700' },

  emptyChart: { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20, padding: 28, marginBottom: 16, alignItems: 'center' },
  emptyChartText: { color: '#8E8E93', fontSize: 14, fontWeight: '500' },

  // Historial
  historialHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'transparent', paddingHorizontal: 4, marginBottom: 12,
    justifyContent: 'space-between' },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navBtn: { padding: 8, borderWidth: 1, borderColor: `rgba(${acRgb},0.3)`, borderRadius: 12, backgroundColor: `rgba(${acRgb},0.1)` },
  navBtnDis: { borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'transparent', opacity: 0.5 },
  navLabel: { color: accentColor, fontSize: 13, fontWeight: '700', minWidth: 38, textAlign: 'center' },

  // Sesión
  sesionCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: `rgba(${acRgb},0.2)`, borderRadius: 16, padding: 16, marginBottom: 16 },
  sesionContexto: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  sesionContextoText: { color: '#6688bb', fontSize: 10, fontWeight: '600' },
  sesionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sesionFecha: { color: accentColor, fontSize: 13, fontWeight: '700', marginBottom: 2 },
  sesionFechaCompleta: { color: '#6688bb', fontSize: 11, fontWeight: '600' },
  eliminarBtn: { width: 32, height: 32, borderRadius: 10, borderWidth: 1, borderColor: '#ff3355', backgroundColor: '#1a0005', justifyContent: 'center', alignItems: 'center' },
  sesionStats: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  sesionStat: { color: '#aabbdd', fontSize: 12, fontWeight: '600' },
  sesionStatDivider: { width: 1, height: 12, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 10 },
  sesionDetalle: { gap: 5 },
  serieRow: { flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 6, paddingHorizontal: 10, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 10 },
  serieNum: { color: accentColor, fontWeight: '900', fontSize: 11, width: 18, textAlign: 'center' },
  serieVal: { color: '#fff', fontSize: 12, fontWeight: '600', flex: 1 },
  sesionFeedback: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8,
    marginTop: 6, borderTopWidth: 1, borderTopColor: '#0f1a3a' },
  feedbackText: { color: '#6688bb', fontSize: 10, fontWeight: '600', flex: 1, textAlign: 'center' },

  // Modal selector
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 2, 15, 0.85)', justifyContent: 'center', alignItems: 'center' },
  selectorModal: { backgroundColor: `rgba(${acRgb},0.08)`, borderRadius: 32, borderWidth: 1,
    borderColor: `rgba(${acRgb},0.3)`, width: '85%', overflow: 'hidden' },
  selectorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 0 },
  selectorTitulo: { fontSize: 20, fontWeight: '700', color: '#fff' },
  selectorItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 0 },
  selectorItemActivo: { backgroundColor: 'transparent' },
  selectorItemNombre: { color: '#fff', fontSize: 15, fontWeight: '500', marginBottom: 2 },
  selectorItemSesiones: { color: '#8E8E93', fontSize: 13 },

  saludModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 2, 15, 0.85)', justifyContent: 'center', alignItems: 'center' },
  saludModalBox: { backgroundColor: `rgba(${acRgb},0.08)`, borderRadius: 32, paddingHorizontal: 20, paddingBottom: 28, paddingTop: 6, borderWidth: 1, borderColor: `rgba(${acRgb},0.3)`, maxHeight: '88%', width: '90%', maxWidth: 360 },
  saludModalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.1)', alignSelf: 'center', marginTop: 6, marginBottom: 6 },
  saludModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 0, marginBottom: 18 },
  saludModalTitulo: { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  saludModalCerrarBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' },
  // SALUD
  saludAddBtn: { borderRadius: 16, overflow: 'hidden', marginBottom: 12 },
  saludAddGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderWidth: 1, borderColor: 'rgba(255, 51, 85, 0.3)', borderRadius: 16 },
  saludAddText: { color: '#ff3355', fontSize: 14, fontWeight: '800' },
  saludGraficaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  saludGraficaTitulo: { fontSize: 14, fontWeight: '800' },
  saludGraficaRef: { color: '#8E8E93', fontSize: 11 },
  saludGraficaOverlay: { position: 'absolute', top: 50, left: 0, right: 0, alignItems: 'center', gap: 4 },
  saludForm: { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 20, padding: 20, marginBottom: 20, gap: 16 },
  saludFormTitulo: { color: '#8E8E93', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 10 },
  saludFechaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: `rgba(${acRgb},0.2)` },
  saludFechaLabel: { flex: 1, color: '#aaccff', fontSize: 14, fontWeight: '600' },
  saludCalendarioWrap: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, borderWidth: 1, borderColor: `rgba(${acRgb},0.3)`, padding: 16, marginTop: 8 },
  saludChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  saludChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' },
  saludChipText: { fontSize: 13, fontWeight: '700' },
  saludCampoWrap: { gap: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  saludCtxBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'transparent' },
  saludCtxBtnActivo: { borderColor: accentColor, backgroundColor: `rgba(${acRgb},0.1)` },
  saludCtxText: { color: '#8E8E93', fontSize: 12, fontWeight: '600' },
  saludInputLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  saludInputLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  saludInputRef: { color: '#8E8E93', fontSize: 10, marginLeft: 'auto' },
  saludInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  saludInput: { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 14, color: '#fff', fontSize: 16, fontWeight: '700' },
  saludInputUnit: { color: '#8E8E93', fontSize: 12, fontWeight: '700', minWidth: 36 },
  saludEscalaBtn: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' },
  saludEscalaBtnActivo: { borderColor: accentColor, backgroundColor: `rgba(${acRgb},0.15)` },
  saludEscalaText: { color: '#8E8E93', fontSize: 15, fontWeight: '700' },
  saludGuardarBtn: {
    marginTop: 20,
    borderRadius: 28,
    overflow: 'visible',
    shadowColor: accentColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  saludGuardarGradient: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderColor: `rgba(${acRgb},0.5)`,
    borderRadius: 28
  },
  saludGuardarText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 0.8,
    textTransform: 'uppercase'
  },
  saludMetricaBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'transparent' },
  saludMetricaBtnText: { fontSize: 13, fontWeight: '700' },
  saludMetricaDot: { width: 6, height: 6, borderRadius: 3 },
  saludEmptyChart: { height: 120, justifyContent: 'center', alignItems: 'center', marginBottom: 16, gap: 8 },
  saludEmptyChartText: { color: '#8E8E93', fontSize: 13, textAlign: 'center' },
  saludUltimoCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 24, padding: 20, marginBottom: 16 },
  saludUltimoTitulo: { color: '#8E8E93', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 16 },
  saludUltimoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  saludUltimoItem: { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', borderRadius: 9, padding: 7, minWidth: 58, alignItems: 'center', gap: 1 },
  saludUltimoValor: { fontSize: 14, fontWeight: '900', letterSpacing: -0.5 },
  saludUltimoUnit: { color: '#8E8E93', fontSize: 8, fontWeight: '700' },
  saludUltimoLabel: { color: '#fff', fontSize: 9, fontWeight: '700' },
  saludUltimoRef: { color: '#8E8E93', fontSize: 8, fontWeight: '600' },
  saludEmpty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  saludEmptyText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  saludEmptySub: { color: '#8E8E93', fontSize: 13, textAlign: 'center' },
  saludHistorialItem: { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: `rgba(${acRgb},0.2)`, borderRadius: 16, padding: 16 },
  saludHistorialFechaCol: { minWidth: 52, paddingTop: 2 },
  saludHistorialFecha: { color: accentColor, fontSize: 13, fontWeight: '800' },
  saludHistorialAño: { color: '#8E8E93', fontSize: 10 },
  saludApiladoLabel: { color: '#8E8E93', fontSize: 9, fontWeight: '800', letterSpacing: 1.5, marginBottom: 4 },
  saludTagWrap: { alignSelf: 'flex-start', borderWidth: 0, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, gap: 2 },
  saludTag: { fontSize: 12, fontWeight: '800' },
  saludTagCtx: { color: '#8E8E93', fontSize: 10, fontWeight: '600' },
  saludDelBtn: { width: 32, height: 32, borderRadius: 10, borderWidth: 1, borderColor: '#ff3355', backgroundColor: '#1a0005', justifyContent: 'center', alignItems: 'center' },
  saludVerMasBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: `rgba(${acRgb},0.2)`, backgroundColor: 'transparent', marginTop: 4 },
  saludVerMasText: { color: accentColor, fontSize: 14, fontWeight: '700' },
  saludHistorialHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 12 },
  saludFiltroBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.03)' },
  saludFiltroBtnText: { color: accentColor, fontSize: 13, fontWeight: '700' },
  saludFiltroPanel: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 16, marginBottom: 16, gap: 0 },
  saludFiltroLabel: { color: '#8E8E93', fontSize: 9, fontWeight: '800', letterSpacing: 1.5, marginBottom: 8 },
  saludFiltroFechaBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 14, paddingVertical: 14 },
  saludFiltroFechaText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  })
}
