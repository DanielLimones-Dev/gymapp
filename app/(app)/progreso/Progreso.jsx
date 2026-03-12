// ============================================
// PROGRESO.JSX — Análisis de progreso real
// ============================================
import { useState, useRef } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Modal, ActivityIndicator, TextInput, Animated, Pressable } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { AntDesign } from '@expo/vector-icons'
import { LineChart } from 'react-native-chart-kit'
import { useFocusEffect } from '@react-navigation/native'
import { useCallback } from 'react'
import { cargarPrograma, guardarYSincronizar, guardarMetrica, cargarMetricas, eliminarMetrica, guardarSalud, cargarSalud, eliminarSalud } from '../../../lib/storage'
import { supabase } from '../../../lib/supabase'
import { LAYOUT } from '../../../components/constans'

const screenWidth = Dimensions.get('window').width

// ─── Calendario selector (compartido con ListaProgramas) ──────────
function CalendarioSelector({ fechaInicio, onSeleccionar, onCerrar }) {
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
        <TouchableOpacity onPress={() => cambiarMes(-1)} style={calStyles.navBtn}><AntDesign name="left" size={16} color="#4488ff" /></TouchableOpacity>
        <Text style={calStyles.mesAnio}>{meses[mesActual.getMonth()]} {mesActual.getFullYear()}</Text>
        <TouchableOpacity onPress={() => cambiarMes(1)} style={calStyles.navBtn}><AntDesign name="right" size={16} color="#4488ff" /></TouchableOpacity>
      </View>
      <View style={calStyles.semana}>
        {['D','L','M','M','J','V','S'].map((d,i) => <Text key={i} style={calStyles.semanaText}>{d}</Text>)}
      </View>
      <View style={calStyles.grid}>
        {Array.from({ length: primerDiaSemana }).map((_,i) => <View key={`e-${i}`} style={calStyles.vacio} />)}
        {Array.from({ length: diasEnMes }).map((_,i) => {
          const d = i + 1
          const fecha = new Date(mesActual.getFullYear(), mesActual.getMonth(), d)
          const esHoy = fecha.toDateString() === hoy.toDateString()
          const esSel = fecha.toDateString() === fechaSeleccionada.toDateString()
          return (
            <TouchableOpacity key={d} style={[calStyles.dia, esHoy && calStyles.diaHoy, esSel && calStyles.diaSel]} onPress={() => seleccionarFecha(d)}>
              <Text style={[calStyles.diaText, esHoy && calStyles.diaHoyText, esSel && calStyles.diaSelText]}>{d}</Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </>
  )
}
const calStyles = StyleSheet.create({
  nav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  navBtn: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, borderColor: '#1a3aff', backgroundColor: '#05051f', justifyContent: 'center', alignItems: 'center' },
  mesAnio: { fontSize: 16, fontWeight: '900', color: '#fff' },
  semana: { flexDirection: 'row', marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#0f1a3a' },
  semanaText: { flex: 1, textAlign: 'center', color: '#2a4488', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  vacio: { width: '14.28%', aspectRatio: 1 },
  dia: { width: '13.5%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 10, margin: '0.35%', backgroundColor: '#05050f' },
  diaHoy: { backgroundColor: '#05103a', borderWidth: 1.5, borderColor: '#1a3aff' },
  diaSel: { backgroundColor: '#1a3aff', shadowColor: '#1a3aff', shadowOpacity: 0.6, shadowRadius: 8, elevation: 6 },
  diaText: { color: '#aabbdd', fontSize: 12, fontWeight: '600' },
  diaHoyText: { color: '#4488ff', fontWeight: '900' },
  diaSelText: { color: '#fff', fontWeight: '900' },
})

const METRICAS_SALUD = [
  { key: 'glucosa',     label: 'Glucosa',     unit: 'mg/dL', color: '#ff6600', tipo: 'glucosa', placeholder: '95',  ref: '70-100',
    contextos: ['Ayunas', '2h post-comida', 'Post-ejercicio', 'Aleatoria'] },
  { key: 'presion',     label: 'Presión',     unit: 'mmHg',  color: '#ff3355', tipo: 'presion', placeholder: '120/80', ref: '<120/80',
    contextos: ['Mañana', 'Tarde', 'Noche', 'Post-ejercicio'] },
  { key: 'sueno',       label: 'Sueño',       unit: 'hrs',   color: '#9933ff', tipo: 'number', placeholder: '7.5', ref: '7-9',
    contextos: null },
  { key: 'hidratacion', label: 'Hidratación', unit: 'L',     color: '#4488ff', tipo: 'number', placeholder: '2.5', ref: '2-3',
    contextos: null },
  { key: 'hrv',         label: 'HRV',         unit: 'ms',    color: '#00cc44', tipo: 'number', placeholder: '65',  ref: '>50',
    contextos: ['Mañana (reposo)', 'Post-ejercicio'] },
  { key: 'energia',     label: 'Energía',     unit: '/10',   color: '#ffcc00', tipo: 'escala', placeholder: '',    ref: '',
    contextos: null },
  { key: 'doms',        label: 'DOMS',        unit: '/10',   color: '#ff9900', tipo: 'escala', placeholder: '',    ref: '',
    contextos: null },
]

export default function Progreso({ userId, modoCoach = false }) {
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
  const [saludFormVisible, setSaludFormVisible] = useState(false)
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
  const [metricasSeleccionadas, setMetricasSeleccionadas] = useState([])
  const [nuevaSalud, setNuevaSalud] = useState({
    glucosa: '', presion_sistolica: '', presion_diastolica: '',
    sueno: '', hidratacion: '', hrv: '', energia: '', doms: ''
  })
  const [contextosSalud, setContextosSalud] = useState({})
  const [fechaSalud, setFechaSalud] = useState(new Date().toISOString().split('T')[0])
  const [mostrarCalendarioSalud, setMostrarCalendarioSalud] = useState(false)
  const formAnim = useRef(new Animated.Value(0)).current
  const formHeight = useRef(new Animated.Value(0)).current
  const cuerpoFormAnim = useRef(new Animated.Value(0)).current

  useFocusEffect(useCallback(() => {
    if (!userId) return
    cargarDatos()
  }, [userId]))

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
      const bloqueId = key.split('_')[1] + '_' + key.split('_')[2]
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

  function obtenerDatosGrafica() {
    const h = ejercicioSeleccionado?.historial
    if (!h?.length) return { labels: [], datasets: [{ data: [0] }] }
    const sorted = [...h].sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
    const data = sorted.map(s =>
      metricaSeleccionada === 'peso'
        ? Math.max(...s.series.map(x => parseFloat(x.peso) || 0))
        : s.series.reduce((acc, x) => acc + (parseInt(x.reps) || 0), 0)
    )
    return { labels: sorted.map((_, i) => `S${i + 1}`), datasets: [{ data: data.length ? data : [0] }] }
  }

  function calcularStats() {
    const empty = { prPeso: 0, repsMax: 0, progresoKg: 0, promedioFeedback: { pump: 0, soreness: 0, dificultad: 0 } }
    const h = ejercicioSeleccionado?.historial
    if (!h?.length) return empty
    let prPeso = 0
    h.forEach(s => s.series.forEach(x => { const p = parseFloat(x.peso) || 0; if (p > prPeso) prPeso = p }))
    const repsMax = Math.max(...h.map(s => s.series.reduce((a, x) => a + (parseInt(x.reps) || 0), 0)))
    const pesoInicial = Math.max(...h[0].series.map(s => parseFloat(s.peso) || 0))
    const pesoActual = Math.max(...h[h.length - 1].series.map(s => parseFloat(s.peso) || 0))
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
  const progColor = stats.progresoKg > 0 ? '#00e676' : stats.progresoKg < 0 ? '#ff4444' : '#4488ff'
  const progPrefix = stats.progresoKg > 0 ? '+' : ''

  async function confirmarEliminarMetrica() {
    if (metricaAEliminar === null) return
    await eliminarMetrica(userId, metricaAEliminar)
    const mets = await cargarMetricas(userId)
    setMetricas(mets)
    setMetricaAEliminar(null)
  }

  function toggleSaludForm() {
    if (saludFormVisible) {
      setSaludFormVisible(false)
    } else {
      setMetricasSeleccionadas([])
      setContextosSalud({})
      setFechaSalud(new Date().toISOString().split('T')[0])
      setNuevaSalud({ glucosa: '', presion_sistolica: '', presion_diastolica: '', sueno: '', hidratacion: '', hrv: '', energia: '', doms: '' })
      setMostrarCalendarioSalud(false)
      setSaludFormVisible(true)
    }
  }

  function toggleMetrica(key) {
    setMetricasSeleccionadas(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
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
    if (nuevaSalud.hrv) {
      nuevoReg.hrv = parseFloat(nuevaSalud.hrv)
      if (contextosSalud.hrv) nuevoReg.hrv_ctx = contextosSalud.hrv
    }
    if (nuevaSalud.energia) nuevoReg.energia = parseInt(nuevaSalud.energia)
    if (nuevaSalud.doms) nuevoReg.doms = parseInt(nuevaSalud.doms)
    if (Object.keys(nuevoReg).length === 0) return

    const AsyncStorage = require('@react-native-async-storage/async-storage').default
    const salud = await cargarSalud(userId)

    // Glucosa y presión: siempre registro nuevo (múltiples por día según contexto)
    // El resto: merge con el registro del mismo día si existe
    const soloGlucosaOPresion = (tieneGlucosa || tienePresion) &&
      !nuevaSalud.sueno && !nuevaSalud.hidratacion && !nuevaSalud.hrv && !nuevaSalud.energia && !nuevaSalud.doms

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
    toggleSaludForm()
  }

  async function confirmarEliminarSalud() {
    if (!saludAEliminar) return
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
    setFormVisible(false)
  }

  if (cargando) return (
    <LinearGradient colors={['#000000', '#050510', '#0a0a1f']} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator color="#4488ff" size="large" />
    </LinearGradient>
  )

  return (
    <LinearGradient colors={['#000000', '#050510', '#0a0a1f']} style={styles.gradient}>
      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: LAYOUT.bottomTabSpace }]} showsVerticalScrollIndicator={false}>

        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.titulo}>Progreso</Text>
          {modoCoach && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#0a1a3f', borderWidth: 1, borderColor: '#1a3aff33', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, marginTop: 8 }}>
              <AntDesign name="eye" size={13} color="#4488ff" />
              <Text style={{ color: '#4488ff', fontSize: 11, fontWeight: '700' }}>Vista de coach — solo lectura</Text>
            </View>
          )}
        </View>

        {/* TABS */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabBtn, tabActivo === 'ejercicios' && styles.tabBtnActivo]}
            onPress={() => setTabActivo('ejercicios')}
          >
            <AntDesign name="calendar" size={14} color={tabActivo === 'ejercicios' ? '#4488ff' : '#2a4488'} />
            <Text style={[styles.tabBtnText, tabActivo === 'ejercicios' && styles.tabBtnTextActivo]}>Ejercicios</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tabActivo === 'cuerpo' && styles.tabBtnActivo]}
            onPress={() => setTabActivo('cuerpo')}
          >
            <AntDesign name="user" size={14} color={tabActivo === 'cuerpo' ? '#4488ff' : '#2a4488'} />
            <Text style={[styles.tabBtnText, tabActivo === 'cuerpo' && styles.tabBtnTextActivo]}>Cuerpo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tabActivo === 'salud' && styles.tabBtnActivo]}
            onPress={() => setTabActivo('salud')}
          >
            <AntDesign name="heart" size={14} color={tabActivo === 'salud' ? '#ff3355' : '#2a4488'} />
            <Text style={[styles.tabBtnText, tabActivo === 'salud' && styles.tabBtnTextActivo]}>Salud</Text>
          </TouchableOpacity>
        </View>

        {tabActivo === 'cuerpo' && (
          <View>
            {/* HEADER CUERPO */}
            <View style={styles.cuerpoHeader}>
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
                style={[styles.cuerpoAddBtn, formVisible && styles.cuerpoAddBtnActivo]}
                onPress={() => {
                    const toValue = formVisible ? 0 : 1
                    setFormVisible(!formVisible)
                    Animated.timing(cuerpoFormAnim, { toValue, duration: 300, useNativeDriver: false }).start()
                    if (formVisible) {
                      setFechaMetrica(new Date().toISOString().split('T')[0])
                      setMostrarCalendarioCuerpo(false)
                    }
                  }}
              >
                <AntDesign name={formVisible ? 'close' : 'plus'} size={15} color="#4488ff" />
                <Text style={styles.cuerpoAddText}>{formVisible ? 'Cancelar' : 'Registrar'}</Text>
              </TouchableOpacity>
            </View>

            {/* FORMULARIO INLINE */}
            <Animated.View style={{ opacity: cuerpoFormAnim, transform: [{ translateY: cuerpoFormAnim.interpolate({ inputRange: [0,1], outputRange: [-10,0] }) }] }}>
            {formVisible && (
              <View style={styles.cuerpoForm}>
                {/* Fecha */}
                <TouchableOpacity style={styles.saludFechaRow} onPress={() => setMostrarCalendarioCuerpo(!mostrarCalendarioCuerpo)}>
                  <AntDesign name="calendar" size={14} color="#4488ff" />
                  <Text style={styles.saludFechaLabel}>
                    {new Date(fechaMetrica + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </Text>
                  <AntDesign name={mostrarCalendarioCuerpo ? 'up' : 'down'} size={12} color="#2a4488" />
                </TouchableOpacity>
                {mostrarCalendarioCuerpo && (
                  <View style={styles.saludCalendarioWrap}>
                    <CalendarioSelector
                      fechaInicio={fechaMetrica}
                      onSeleccionar={f => { setFechaMetrica(f); setMostrarCalendarioCuerpo(false) }}
                      onCerrar={() => setMostrarCalendarioCuerpo(false)}
                    />
                  </View>
                )}
                {/* Unidad */}
                <View style={styles.unidadRow}>
                  {['kg', 'lbs'].map(u => (
                    <TouchableOpacity
                      key={u}
                      style={[styles.unidadBtn, nuevaMetrica.unidad === u && styles.unidadBtnActivo]}
                      onPress={() => setNuevaMetrica(p => ({ ...p, unidad: u }))}
                    >
                      <Text style={[styles.unidadText, nuevaMetrica.unidad === u && styles.unidadTextActivo]}>{u}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.cuerpoFormRow}>
                  <View style={styles.cuerpoInputWrap}>
                    <Text style={styles.cuerpoInputLabel}>PESO</Text>
                    <TextInput
                      style={styles.cuerpoInput}
                      placeholder="75.0"
                      placeholderTextColor="#2a2a4a"
                      keyboardType="decimal-pad"
                      value={nuevaMetrica.peso}
                      onChangeText={t => setNuevaMetrica(p => ({ ...p, peso: t }))}
                    />
                  </View>
                  <View style={styles.cuerpoInputWrap}>
                    <Text style={styles.cuerpoInputLabel}>% GRASA</Text>
                    <TextInput
                      style={styles.cuerpoInput}
                      placeholder="18.0"
                      placeholderTextColor="#2a2a4a"
                      keyboardType="decimal-pad"
                      value={nuevaMetrica.grasaPct}
                      onChangeText={t => setNuevaMetrica(p => ({ ...p, grasaPct: t }))}
                    />
                  </View>
                  <View style={styles.cuerpoInputWrap}>
                    <Text style={styles.cuerpoInputLabel}>% MÚSCULO</Text>
                    <TextInput
                      style={styles.cuerpoInput}
                      placeholder="42.0"
                      placeholderTextColor="#2a2a4a"
                      keyboardType="decimal-pad"
                      value={nuevaMetrica.musculoPct}
                      onChangeText={t => setNuevaMetrica(p => ({ ...p, musculoPct: t }))}
                    />
                  </View>
                </View>

                <TouchableOpacity onPress={guardarNuevaMetrica} style={styles.cuerpoGuardarBtn}>
                  <LinearGradient colors={['#1a3aff', '#0022cc']} style={styles.cuerpoGuardarGradient}>
                    <AntDesign name="check" size={15} color="#fff" />
                    <Text style={styles.cuerpoGuardarText}>Guardar registro</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
            </Animated.View>

            {/* SELECTOR MÉTRICA */}
            {metricas.length > 0 && (
              <>
                <View style={styles.metricaSelector}>
                  {[
                    { key: 'peso', label: 'Peso' },
                    { key: 'grasa', label: '% Grasa' },
                    { key: 'musculo', label: '% Músculo' },
                  ].map(m => (
                    <TouchableOpacity
                      key={m.key}
                      style={[styles.metricaSelectorBtn, metricaCuerpo === m.key && styles.metricaSelectorBtnActivo]}
                      onPress={() => setMetricaCuerpo(m.key)}
                    >
                      <Text style={[styles.metricaSelectorText, metricaCuerpo === m.key && styles.metricaSelectorTextActivo]}>
                        {m.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

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

                  return (
                    <View style={styles.chartBox}>
                      <LineChart
                        data={{ labels, datasets: [{ data: datos }] }}
                        width={screenWidth - 40}
                        height={180}
                        chartConfig={{
                          backgroundColor: 'transparent',
                          backgroundGradientFrom: '#05050f',
                          backgroundGradientTo: '#05050f',
                          decimalPlaces: 1,
                          color: (o = 1) => `rgba(68,136,255,${o})`,
                          labelColor: () => '#2a4488',
                          propsForDots: { r: '4', strokeWidth: '2', stroke: '#ff9900', fill: '#ff9900' },
                          propsForBackgroundLines: { stroke: '#0f1a3a', strokeWidth: 1 },
                        }}
                        bezier={false}
                        style={{ borderRadius: 12, marginLeft: -16 }}
                        withInnerLines
                        withOuterLines={false}
                      />
                    </View>
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
                      <View style={styles.cuerpoStatCard}>
                        <Text style={styles.cuerpoStatLabel}>PESO ACTUAL</Text>
                        <Text style={styles.cuerpoStatVal}>{conPeso[0]?.peso || '—'} <Text style={styles.cuerpoStatUnit}>{conPeso[0]?.unidad || 'kg'}</Text></Text>
                        {deltaPeso && <Text style={[styles.cuerpoStatDelta, { color: parseFloat(deltaPeso) <= 0 ? '#00cc44' : '#ff3355' }]}>{parseFloat(deltaPeso) > 0 ? '+' : ''}{deltaPeso}</Text>}
                      </View>
                      <View style={styles.cuerpoStatCard}>
                        <Text style={styles.cuerpoStatLabel}>GRASA</Text>
                        <Text style={styles.cuerpoStatVal}>{conGrasa[0]?.grasaPct || '—'} <Text style={styles.cuerpoStatUnit}>%</Text></Text>
                        {deltaGrasa && <Text style={[styles.cuerpoStatDelta, { color: parseFloat(deltaGrasa) <= 0 ? '#00cc44' : '#ff3355' }]}>{parseFloat(deltaGrasa) > 0 ? '+' : ''}{deltaGrasa}%</Text>}
                      </View>
                      <View style={styles.cuerpoStatCard}>
                        <Text style={styles.cuerpoStatLabel}>MÚSCULO</Text>
                        <Text style={styles.cuerpoStatVal}>{conMusculo[0]?.musculoPct || '—'} <Text style={styles.cuerpoStatUnit}>%</Text></Text>
                        {deltaMusculo && <Text style={[styles.cuerpoStatDelta, { color: parseFloat(deltaMusculo) >= 0 ? '#00cc44' : '#ff3355' }]}>{parseFloat(deltaMusculo) > 0 ? '+' : ''}{deltaMusculo}%</Text>}
                      </View>
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
                    <>
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
                            <TouchableOpacity
                              style={[styles.saludFiltroBtn, mostrarFiltroCuerpo && { borderColor: '#4488ff', backgroundColor: '#05051f' }]}
                              onPress={() => setMostrarFiltroCuerpo(!mostrarFiltroCuerpo)}
                            >
                              <AntDesign name="filter" size={13} color={mostrarFiltroCuerpo ? '#4488ff' : '#2a4488'} />
                              <Text style={[styles.saludFiltroBtnText, mostrarFiltroCuerpo && { color: '#4488ff' }]}>Filtrar</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                      {/* Panel filtro */}
                      {mostrarFiltroCuerpo && (
                        <View style={styles.saludFiltroPanel}>
                          {['desde', 'hasta'].map(tipo => (
                            <View key={tipo} style={{ flex: 1 }}>
                              <Text style={styles.saludFiltroLabel}>{tipo === 'desde' ? 'DESDE' : 'HASTA'}</Text>
                              <TouchableOpacity
                                style={[styles.saludFiltroFechaBtn, filtroCalCuerpoActivo === tipo && { borderColor: '#4488ff' }]}
                                onPress={() => setFiltroCalCuerpoActivo(filtroCalCuerpoActivo === tipo ? null : tipo)}
                              >
                                <Text style={styles.saludFiltroFechaText}>
                                  {tipo === 'desde'
                                    ? filtroFechaDesdeCuerpo ? new Date(filtroFechaDesdeCuerpo + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : 'Inicio'
                                    : filtroFechaHastaCuerpo ? new Date(filtroFechaHastaCuerpo + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : 'Hoy'}
                                </Text>
                                <AntDesign name={filtroCalCuerpoActivo === tipo ? 'up' : 'down'} size={11} color="#2a4488" />
                              </TouchableOpacity>
                              {filtroCalCuerpoActivo === tipo && (
                                <View style={[styles.saludCalendarioWrap, { marginTop: 6 }]}>
                                  <CalendarioSelector
                                    fechaInicio={tipo === 'desde' ? (filtroFechaDesdeCuerpo || new Date().toISOString().split('T')[0]) : (filtroFechaHastaCuerpo || new Date().toISOString().split('T')[0])}
                                    onSeleccionar={f => {
                                      if (tipo === 'desde') setFiltroFechaDesdeCuerpo(f)
                                      else setFiltroFechaHastaCuerpo(f)
                                      setFiltroCalCuerpoActivo(null)
                                    }}
                                    onCerrar={() => setFiltroCalCuerpoActivo(null)}
                                  />
                                </View>
                              )}
                            </View>
                          ))}
                        </View>
                      )}
                      {/* Cards */}
                      {visibles.map(([fechaKey, grupo]) => {
                        const fechaDisplay = new Date(grupo.fecha?.includes('T') ? grupo.fecha : grupo.fecha + 'T12:00:00')
                        const merged = {}
                        grupo.registros.forEach(r => Object.assign(merged, r))
                        return (
                          <View key={fechaKey} style={styles.cuerpoHistorialItem}>
                            <View style={{ minWidth: 56 }}>
                              <Text style={styles.cuerpoHistorialFecha}>
                                {fechaDisplay.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                              </Text>
                              <Text style={{ color: '#2a4488', fontSize: 10 }}>{fechaDisplay.getFullYear()}</Text>
                            </View>
                            <View style={styles.cuerpoHistorialVals}>
                              {merged.peso ? (
                                <View style={styles.cuerpoMetricaTag}>
                                  <Text style={styles.cuerpoMetricaVal}>{merged.peso}</Text>
                                  <Text style={styles.cuerpoMetricaUnit}>{merged.unidad || 'kg'}</Text>
                                </View>
                              ) : null}
                              {merged.grasaPct ? (
                                <View style={[styles.cuerpoMetricaTag, { borderColor: '#ff660044' }]}>
                                  <Text style={[styles.cuerpoMetricaVal, { color: '#ff6600' }]}>{merged.grasaPct}%</Text>
                                  <Text style={styles.cuerpoMetricaUnit}>grasa</Text>
                                </View>
                              ) : null}
                              {merged.musculoPct ? (
                                <View style={[styles.cuerpoMetricaTag, { borderColor: '#00cc4444' }]}>
                                  <Text style={[styles.cuerpoMetricaVal, { color: '#00cc44' }]}>{merged.musculoPct}%</Text>
                                  <Text style={styles.cuerpoMetricaUnit}>músculo</Text>
                                </View>
                              ) : null}
                            </View>
                            <TouchableOpacity onPress={() => setMetricaAEliminar(grupo.indices[0])} style={styles.cuerpoHistorialDelBtn}>
                              <AntDesign name="delete" size={14} color="#ff3355" />
                            </TouchableOpacity>
                          </View>
                        )
                      })}
                      {/* Ver más / Ver menos */}
                      {total > VISIBLE && (
                        <TouchableOpacity style={styles.saludVerMasBtn} onPress={() => setCuerpoExpandido(!cuerpoExpandido)}>
                          <Text style={styles.saludVerMasText}>
                            {cuerpoExpandido ? 'Ver menos' : 'Ver ' + (total - VISIBLE) + ' más'}
                          </Text>
                          <AntDesign name={cuerpoExpandido ? 'up' : 'down'} size={12} color="#4488ff" />
                        </TouchableOpacity>
                      )}
                    </>
                  )
                })()}
              </>
            )}

            {metricas.length === 0 && !formVisible && (
              <View style={styles.emptyBox}>
                <AntDesign name="user" size={36} color="#2a4488" />
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
              <TouchableOpacity
                style={styles.filtroDropdownBtn}
                onPress={() => {
                  setProgExpandido(null)
                  setMostrarFiltroDropdown(true)
                }}
              >
                <AntDesign name="filter" size={13} color="#4488ff" />
                <Text style={styles.filtroDropdownLabel} numberOfLines={1}>{labelBtn}</Text>
                <AntDesign name="down" size={12} color="#4488ff" />
              </TouchableOpacity>

              <Modal visible={mostrarFiltroDropdown} transparent animationType="fade">
                <TouchableOpacity
                  style={styles.filtroModalOverlay}
                  activeOpacity={1}
                  onPress={() => { setMostrarFiltroDropdown(false); setProgExpandido(null) }}
                >
                  <View style={styles.filtroModalBox}>
                    <View style={styles.filtroModalHeader}>
                      <Text style={styles.filtroModalTitulo}>Filtrar por</Text>
                      <TouchableOpacity onPress={() => { setMostrarFiltroDropdown(false); setProgExpandido(null) }}>
                        <AntDesign name="close" size={16} color="#fff" />
                      </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
                      {/* Opción Todos */}
                      <TouchableOpacity
                        style={[styles.filtroProgRow, programaSeleccionado === 'todos' && styles.filtroProgRowActivo]}
                        onPress={() => {
                          setProgramaSeleccionado('todos')
                          setBloqueSeleccionado('todos')
                          setMostrarFiltroDropdown(false); setProgExpandido(null)
                        }}
                      >
                        <AntDesign name="appstore" size={14} color={programaSeleccionado === 'todos' ? '#4488ff' : '#2a4488'} />
                        <Text style={[styles.filtroProgNombre, programaSeleccionado === 'todos' && { color: '#4488ff' }]}>
                          Todos los programas
                        </Text>
                        {programaSeleccionado === 'todos' && <AntDesign name="check" size={14} color="#4488ff" />}
                      </TouchableOpacity>

                      {/* Cada programa con sus bloques */}
                      {programa.programas.map(prog => {
                        const bloquesProg = prog.bloques || []
                        const esteProgActivo = programaSeleccionado === prog.id
                        return (
                          <View key={prog.id}>
                            {/* Header programa */}
                            <TouchableOpacity
                              style={[styles.filtroProgRow, esteProgActivo && styles.filtroProgRowActivo]}
                              onPress={() => {
                                // Toggle expandir/colapsar
                                setProgExpandido(progExpandido === prog.id ? null : prog.id)
                              }}
                            >
                              <AntDesign name="folder" size={14} color={esteProgActivo ? '#4488ff' : '#2a4488'} />
                              <Text style={[styles.filtroProgNombre, esteProgActivo && { color: '#4488ff' }]}>
                                {prog.nombre}
                              </Text>
                              {progExpandido === prog.id
                                ? <AntDesign name="up" size={12} color="#4488ff" />
                                : <AntDesign name="down" size={12} color="#2a4488" />
                              }
                            </TouchableOpacity>

                            {/* Bloques — solo si está expandido */}
                            {progExpandido === prog.id && bloquesProg.map(b => (
                              <TouchableOpacity
                                key={b.id}
                                style={[styles.filtroBloqueRow, bloqueSeleccionado === b.id && esteProgActivo && styles.filtroBloqueRowActivo]}
                                onPress={() => {
                                  setProgramaSeleccionado(prog.id)
                                  setBloqueSeleccionado(b.id)
                                  setMostrarFiltroDropdown(false); setProgExpandido(null)
                                }}
                              >
                                <View style={styles.filtroBloqueIndent} />
                                <AntDesign name="minus" size={10} color={bloqueSeleccionado === b.id && esteProgActivo ? '#00cc44' : '#2a4488'} />
                                <Text style={[styles.filtroBloqueName, bloqueSeleccionado === b.id && esteProgActivo && { color: '#00cc44' }]}>
                                  {b.nombre}
                                </Text>
                                {bloqueSeleccionado === b.id && esteProgActivo && <AntDesign name="check" size={12} color="#00cc44" />}
                              </TouchableOpacity>
                            ))}
                          </View>
                        )
                      })}
                    </ScrollView>
                  </View>
                </TouchableOpacity>
              </Modal>
            </>
          )
        })()}

        {ejerciciosConHistorial.length === 0 ? (
          <View style={styles.emptyBox}>
            <AntDesign name="folder" size={40} color="#2a4488" />
            <Text style={styles.emptyTitulo}>Sin datos de progreso</Text>
            <Text style={styles.emptySub}>Registra sesiones para ver tu progreso</Text>
          </View>
        ) : (
          <>
            {/* EJERCICIO selector */}
            <TouchableOpacity style={styles.ejercicioBtn} onPress={() => setMostrarSelectorEjercicios(true)}>
              <View>
                <Text style={styles.ejercicioBtnNombre}>{ejercicioSeleccionado?.nombre || '—'}</Text>
                <Text style={styles.ejercicioBtnSub}>{totalSesiones} sesiones registradas</Text>
              </View>
              <AntDesign name="down" size={14} color="#4488ff" />
            </TouchableOpacity>

            {/* STATS — 3 cards grandes y atractivas */}
            <View style={styles.statsRow}>
              {/* PR de Peso */}
              <LinearGradient colors={['#0a1a3a', '#051030']} style={styles.statCard}>
                <Text style={styles.statCardLabel}>PR PESO</Text>
                <Text style={styles.statCardVal}>{stats.prPeso}</Text>
                <Text style={styles.statCardUnit}>kg</Text>
                <View style={[styles.statCardBar, { backgroundColor: '#1a3aff' }]} />
              </LinearGradient>

              {/* Reps máx */}
              <LinearGradient colors={['#1a0a3a', '#100530']} style={styles.statCard}>
                <Text style={styles.statCardLabel}>REPS MÁX</Text>
                <Text style={styles.statCardVal}>{stats.repsMax}</Text>
                <Text style={styles.statCardUnit}>reps</Text>
                <View style={[styles.statCardBar, { backgroundColor: '#aa44ff' }]} />
              </LinearGradient>

              {/* Progreso */}
              <LinearGradient
                colors={stats.progresoKg > 0 ? ['#001a10', '#002210'] : stats.progresoKg < 0 ? ['#1a0005', '#220008'] : ['#0a0a1f', '#050510']}
                style={styles.statCard}
              >
                <Text style={styles.statCardLabel}>PROGRESO</Text>
                <Text style={[styles.statCardVal, { color: progColor }]}>{progPrefix}{stats.progresoKg}</Text>
                <Text style={[styles.statCardUnit, { color: progColor }]}>kg</Text>
                <View style={[styles.statCardBar, { backgroundColor: progColor }]} />
              </LinearGradient>
            </View>

            {/* FEEDBACK compacto */}
            {stats.promedioFeedback.pump > 0 && (
              <View style={styles.feedbackInline}>
                <Text style={styles.feedbackInlineLabel}>AVG</Text>
                <View style={styles.feedbackInlineVals}>
                  <Text style={styles.feedbackInlineItem}>Pump <Text style={styles.feedbackInlineNum}>{stats.promedioFeedback.pump}/5</Text></Text>
                  <Text style={styles.feedbackInlineItem}>Fatiga <Text style={styles.feedbackInlineNum}>{stats.promedioFeedback.soreness}/5</Text></Text>
                  <Text style={styles.feedbackInlineItem}>Dific. <Text style={styles.feedbackInlineNum}>{stats.promedioFeedback.dificultad}/5</Text></Text>
                </View>
              </View>
            )}

            {/* GRÁFICA — botones Peso/Reps dentro */}
            {datosGrafica.labels.length > 0 && datosGrafica.datasets[0].data[0] !== 0 ? (
              <View style={styles.chartBox}>
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
                    backgroundGradientFrom: '#0a0a1f',
                    backgroundGradientTo: '#050510',
                    decimalPlaces: 0,
                    // Línea azul
                    color: (o = 1) => `rgba(68,136,255,${o})`,
                    labelColor: (o = 1) => `rgba(42,68,136,${o})`,
                    // Puntos naranja
                    propsForDots: {
                      r: '6',
                      strokeWidth: '2',
                      stroke: '#ff6600',
                      fill: '#ff9900',
                    },
                    strokeWidth: 2,
                  }}
                  // Línea recta (sin bezier)
                  style={{ borderRadius: 10, marginTop: 4 }}
                />
              </View>
            ) : (
              <View style={styles.emptyChart}>
                <Text style={styles.emptyChartText}>Sin datos suficientes para gráfica</Text>
              </View>
            )}

            {/* HISTORIAL */}
            <View style={styles.historialHeader}>
              <Text style={styles.sectionLabel}>HISTORIAL</Text>
              {totalSesiones > 0 && (
                <View style={styles.navRow}>
                  <TouchableOpacity
                    style={[styles.navBtn, sesionActivaIndex >= totalSesiones - 1 && styles.navBtnDis]}
                    onPress={() => setSesionActivaIndex(i => Math.min(i + 1, totalSesiones - 1))}
                    disabled={sesionActivaIndex >= totalSesiones - 1}
                  >
                    <AntDesign name="left" size={12} color={sesionActivaIndex >= totalSesiones - 1 ? '#1a1a3a' : '#4488ff'} />
                  </TouchableOpacity>
                  <Text style={styles.navLabel}>{totalSesiones - sesionActivaIndex} / {totalSesiones}</Text>
                  <TouchableOpacity
                    style={[styles.navBtn, sesionActivaIndex <= 0 && styles.navBtnDis]}
                    onPress={() => setSesionActivaIndex(i => Math.max(i - 1, 0))}
                    disabled={sesionActivaIndex <= 0}
                  >
                    <AntDesign name="right" size={12} color={sesionActivaIndex <= 0 ? '#1a1a3a' : '#4488ff'} />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {sesionActiva ? (
              <View style={styles.sesionCard}>
                <View style={styles.sesionHeader}>
                  <View style={{ flex: 1 }}>
                    {/* Contexto programa › bloque */}
                    {(ejercicioSeleccionado?.programaNombre || ejercicioSeleccionado?.bloqueNombre) && (
                      <View style={styles.sesionContexto}>
                        <AntDesign name="folder" size={10} color="#2a4488" />
                        <Text style={styles.sesionContextoText}>
                          {[ejercicioSeleccionado.programaNombre, ejercicioSeleccionado.bloqueNombre].filter(Boolean).join('  ›  ')}
                        </Text>
                      </View>
                    )}
                    <Text style={styles.sesionFecha}>Sesión {totalSesiones - sesionActivaIndex}</Text>
                    <Text style={styles.sesionFechaCompleta}>
                      {new Date(sesionActiva.fecha).toLocaleDateString('es-MX', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.eliminarBtn} onPress={() => pedirEliminarSesion(sesionActiva, sesionActivaIndex)}>
                    <AntDesign name="delete" size={15} color="#ff4444" />
                  </TouchableOpacity>
                </View>

                <View style={styles.sesionStats}>
                  <Text style={styles.sesionStat}>{Math.max(...sesionActiva.series.map(s => parseFloat(s.peso) || 0))} kg máx</Text>
                  <View style={styles.sesionStatDivider} />
                  <Text style={styles.sesionStat}>{sesionActiva.series.reduce((a, s) => a + (parseInt(s.reps) || 0), 0)} reps</Text>
                  <View style={styles.sesionStatDivider} />
                  <Text style={styles.sesionStat}>{sesionActiva.series.length} series</Text>
                </View>

                <View style={styles.sesionDetalle}>
                  {sesionActiva.series.map((serie, si) => (
                    <View key={si} style={styles.serieRow}>
                      <Text style={styles.serieNum}>{si + 1}</Text>
                      <Text style={styles.serieVal}>{serie.peso} kg</Text>
                      <Text style={styles.serieVal}>{serie.reps} reps</Text>
                      <Text style={styles.serieVal}>RIR {serie.rir}</Text>
                    </View>
                  ))}
                  {sesionActiva.feedback && (sesionActiva.feedback.pump > 0 || sesionActiva.feedback.soreness > 0) && (
                    <View style={styles.sesionFeedback}>
                      <Text style={styles.feedbackText}>Pump: {sesionActiva.feedback.pump}/5</Text>
                      <Text style={styles.feedbackText}>Fatiga: {sesionActiva.feedback.soreness}/5</Text>
                      <Text style={styles.feedbackText}>Dificultad: {sesionActiva.feedback.dificultad}/5</Text>
                    </View>
                  )}
                </View>
              </View>
            ) : (
              <View style={styles.emptyChart}>
                <Text style={styles.emptyChartText}>Sin sesiones registradas</Text>
              </View>
            )}
          </>
        )}
        </>
        )}

        {/* ── TAB SALUD ─────────────────────────────────── */}
        {tabActivo === 'salud' && (
          <View style={{ paddingBottom: 20 }}>

            {/* SELECTOR MÉTRICA GRÁFICA */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 4 }}>
                {METRICAS_SALUD.map(m => {
                  const activa = metricaSaludGrafica === m.key
                  const tieneData = registrosSalud.some(r => r[m.key] != null || (m.key === 'presion' && r.presion != null))
                  return (
                    <TouchableOpacity
                      key={m.key}
                      style={[styles.saludMetricaBtn, activa && { borderColor: m.color, backgroundColor: m.color + '22' }]}
                      onPress={() => { setMetricaSaludGrafica(m.key); setFiltroContextoGrafica(null) }}
                    >
                      <Text style={[styles.saludMetricaBtnText, { color: activa ? m.color : '#2a4488' }]}>{m.label}</Text>
                      {tieneData && <View style={[styles.saludMetricaDot, { backgroundColor: m.color }]} />}
                    </TouchableOpacity>
                  )
                })}
              </View>
            </ScrollView>

            {/* GRÁFICA — siempre visible */}
            {(() => {
              const meta = METRICAS_SALUD.find(m => m.key === metricaSaludGrafica)
              const key = metricaSaludGrafica === 'presion' ? 'presion_s' : metricaSaludGrafica
              const ctxKey = metricaSaludGrafica === 'glucosa' ? 'glucosa_ctx' : metricaSaludGrafica === 'presion' ? 'presion_ctx' : null
              const tieneContextos = meta?.contextos?.length > 0

              // Filtrar por contexto si aplica
              let datosFiltrados = registrosSalud.filter(r => r[key] != null)
              if (filtroContextoGrafica && ctxKey) {
                datosFiltrados = datosFiltrados.filter(r => r[ctxKey] === filtroContextoGrafica)
              }
              const datos = datosFiltrados.slice(0, 10).reverse()
              const sinDatos = datos.length < 2
              const chartData = sinDatos
                ? { labels: ['—', '—'], datasets: [{ data: [0, 0] }] }
                : {
                    labels: datos.map(r => new Date(r.fecha.includes('T') ? r.fecha : r.fecha + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }).replace('.', '')),
                    datasets: [{ data: datos.map(r => r[key]) }]
                  }
              return (
                <View style={{ marginBottom: 16 }}>
                  <View style={styles.saludGraficaHeader}>
                    <Text style={[styles.saludGraficaTitulo, { color: meta?.color }]}>{meta?.label}</Text>
                    {meta?.ref ? <Text style={styles.saludGraficaRef}>Ref: {meta.ref} {meta.unit}</Text> : null}
                  </View>
                  {/* Filtros de contexto para glucosa y presión */}
                  {tieneContextos && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <TouchableOpacity
                          style={[styles.saludCtxBtn, !filtroContextoGrafica && { borderColor: meta.color, backgroundColor: meta.color + '22' }]}
                          onPress={() => setFiltroContextoGrafica(null)}
                        >
                          <Text style={[styles.saludCtxText, !filtroContextoGrafica && { color: meta.color }]}>Todos</Text>
                        </TouchableOpacity>
                        {meta.contextos.map(ctx => (
                          <TouchableOpacity
                            key={ctx}
                            style={[styles.saludCtxBtn, filtroContextoGrafica === ctx && { borderColor: meta.color, backgroundColor: meta.color + '22' }]}
                            onPress={() => setFiltroContextoGrafica(ctx)}
                          >
                            <Text style={[styles.saludCtxText, filtroContextoGrafica === ctx && { color: meta.color }]}>{ctx}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  )}
                  <View style={{ opacity: sinDatos ? 0.15 : 1 }}>
                    <LineChart
                      data={chartData}
                      width={screenWidth - 40}
                      height={150}
                      chartConfig={{
                        backgroundColor: '#05050f',
                        backgroundGradientFrom: '#05050f',
                        backgroundGradientTo: '#0a0a1f',
                        color: () => meta?.color || '#4488ff',
                        labelColor: () => '#2a4488',
                        propsForDots: { r: '4', strokeWidth: '2', stroke: meta?.color || '#4488ff' },
                        propsForBackgroundLines: { stroke: '#0f1a3a' },
                      }}
                      bezier
                      style={{ borderRadius: 12 }}
                    />
                  </View>
                  {sinDatos && (
                    <Text style={[styles.saludEmptyChartText, { textAlign: 'center', marginTop: 8, color: meta?.color || '#2a4488' }]}>
                      {filtroContextoGrafica
                        ? `Sin datos de ${meta?.label} — ${filtroContextoGrafica}`
                        : `Sin datos de ${meta?.label} aún`}
                    </Text>
                  )}
                </View>
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
                  // Puede haber múltiples lecturas de presión
                  return registrosHoy
                    .filter(r => r.presion)
                    .map((r, i) => ({ ...m, key: `presion_${i}`, value: r.presion, ctx: r.presion_ctx }))
                }
                if (m.tipo === 'glucosa') {
                  // Puede haber múltiples lecturas de glucosa
                  return registrosHoy
                    .filter(r => r.glucosa !== undefined && r.glucosa !== null)
                    .map((r, i) => ({ ...m, key: `glucosa_${i}`, value: r.glucosa, ctx: r.glucosa_ctx }))
                }
                const val = diaCompleto[m.key]
                if (val === undefined || val === null) return []
                const ctx = m.key === 'hrv' ? diaCompleto.hrv_ctx : null
                return [{ ...m, value: val, ctx }]
              })

              if (!items.length) return null
              const fechaDisplay = new Date((fechaHoy || '') + 'T12:00:00')
              return (
                <View style={styles.saludUltimoCard}>
                  <Text style={styles.saludUltimoTitulo}>
                    ÚLTIMO DÍA · {fechaDisplay.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                  <View style={styles.saludUltimoGrid}>
                    {items.map(item => (
                      <View key={item.key} style={[styles.saludUltimoItem, { borderColor: item.color + '55' }]}>
                        <Text style={[styles.saludUltimoValor, { color: item.color }]}>{item.value}</Text>
                        <Text style={styles.saludUltimoUnit}>{item.unit}</Text>
                        <Text style={styles.saludUltimoLabel}>{item.label}</Text>
                        {item.ctx && <Text style={[styles.saludUltimoRef, { color: item.color + 'aa' }]}>{item.ctx}</Text>}
                        {item.ref ? <Text style={styles.saludUltimoRef}>ref: {item.ref}</Text> : null}
                      </View>
                    ))}
                  </View>
                </View>
              )
            })()}

            {/* BOTÓN NUEVO REGISTRO — arriba */}
            {!modoCoach && <Pressable
              style={({ pressed }) => [styles.saludAddBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
              onPress={toggleSaludForm}
            >
              <LinearGradient
                colors={['#1a0008', '#0f0005']}
                style={styles.saludAddGradient}
              >
                <AntDesign name="plus" size={16} color="#ff3355" />
                <Text style={styles.saludAddText}>Nuevo registro</Text>
              </LinearGradient>
            </Pressable>}

            {/* HISTORIAL */}
            {registrosSalud.length > 0 && (() => {
              // Agrupar todos los registros por día
              const porDia = {}
              registrosSalud.forEach((r, idx) => {
                const fechaKey = r.fecha ? r.fecha.split('T')[0] : 'sin-fecha'
                if (!porDia[fechaKey]) {
                  porDia[fechaKey] = { fecha: r.fecha, glucosas: [], presiones: [], otros: {}, indices: [] }
                }
                // Glucosa — acepta número o string
                const gVal = r.glucosa !== undefined && r.glucosa !== null && r.glucosa !== '' ? Number(r.glucosa) : null
                if (gVal !== null && !isNaN(gVal)) porDia[fechaKey].glucosas.push({ valor: gVal, ctx: r.glucosa_ctx || null, idx })
                // Presión
                if (r.presion) porDia[fechaKey].presiones.push({ valor: r.presion, ctx: r.presion_ctx || null, idx })
                // Otras métricas
                if (r.sueno !== undefined && r.sueno !== null) porDia[fechaKey].otros.sueno = r.sueno
                if (r.hidratacion !== undefined && r.hidratacion !== null) porDia[fechaKey].otros.hidratacion = r.hidratacion
                if (r.hrv !== undefined && r.hrv !== null) porDia[fechaKey].otros.hrv = r.hrv
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
                        <TouchableOpacity
                          style={[styles.saludFiltroBtn, mostrarFiltroFecha && { borderColor: '#4488ff', backgroundColor: '#05051f' }]}
                          onPress={() => setMostrarFiltroFecha(!mostrarFiltroFecha)}
                        >
                          <AntDesign name="filter" size={13} color={mostrarFiltroFecha ? '#4488ff' : '#2a4488'} />
                          <Text style={[styles.saludFiltroBtnText, mostrarFiltroFecha && { color: '#4488ff' }]}>Filtrar</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  {/* Panel filtro por fechas */}
                  {mostrarFiltroFecha && (
                    <View style={styles.saludFiltroPanel}>
                      {['desde', 'hasta'].map(tipo => (
                        <View key={tipo} style={{ flex: 1 }}>
                          <Text style={styles.saludFiltroLabel}>{tipo === 'desde' ? 'DESDE' : 'HASTA'}</Text>
                          <TouchableOpacity
                            style={[styles.saludFiltroFechaBtn, filtroCalendarioActivo === tipo && { borderColor: '#4488ff' }]}
                            onPress={() => setFiltroCalendarioActivo(filtroCalendarioActivo === tipo ? null : tipo)}
                          >
                            <Text style={styles.saludFiltroFechaText}>
                              {tipo === 'desde'
                                ? filtroFechaDesde ? new Date(filtroFechaDesde + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : 'Inicio'
                                : filtroFechaHasta ? new Date(filtroFechaHasta + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : 'Hoy'}
                            </Text>
                            <AntDesign name={filtroCalendarioActivo === tipo ? 'up' : 'down'} size={11} color="#2a4488" />
                          </TouchableOpacity>
                          {filtroCalendarioActivo === tipo && (
                            <View style={[styles.saludCalendarioWrap, { marginTop: 6 }]}>
                              <CalendarioSelector
                                fechaInicio={tipo === 'desde' ? (filtroFechaDesde || new Date().toISOString().split('T')[0]) : (filtroFechaHasta || new Date().toISOString().split('T')[0])}
                                onSeleccionar={f => {
                                  if (tipo === 'desde') setFiltroFechaDesde(f)
                                  else setFiltroFechaHasta(f)
                                  setFiltroCalendarioActivo(null)
                                }}
                                onCerrar={() => setFiltroCalendarioActivo(null)}
                              />
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
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
                        {visibles.map(([fechaKey, grupo]) => {
                    const fechaDisplay = new Date(grupo.fecha.includes('T') ? grupo.fecha : grupo.fecha + 'T12:00:00')
                    const tieneGlucosa = grupo.glucosas.length > 0
                    const tienePresion = grupo.presiones.length > 0
                    const tieneOtros = Object.keys(grupo.otros).length > 0
                    return (
                      <View key={fechaKey} style={styles.saludHistorialItem}>
                        {/* Fecha */}
                        <View style={styles.saludHistorialFechaCol}>
                          <Text style={styles.saludHistorialFecha}>
                            {fechaDisplay.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                          </Text>
                          <Text style={styles.saludHistorialAño}>{fechaDisplay.getFullYear()}</Text>
                        </View>

                        {/* Contenido */}
                        <View style={{ flex: 1 }}>
                          {/* Glucosa y Presión: en horizontal si ambas, vertical internamente */}
                          {(tieneGlucosa || tienePresion) && (
                            <View style={{ flexDirection: 'row', gap: 8, marginBottom: tieneOtros ? 6 : 0 }}>
                              {/* Columna Glucosa */}
                              {tieneGlucosa && (
                                <View style={{ flex: 1, gap: 4 }}>
                                  <Text style={styles.saludApiladoLabel}>GLUCOSA</Text>
                                  {grupo.glucosas.map((g, i) => (
                                    <View key={i} style={[styles.saludTagWrap, { borderColor: '#ff660066' }]}>
                                      <Text style={[styles.saludTag, { color: '#ff6600', fontWeight: '800' }]}>{g.valor} mg/dL</Text>
                                      {g.ctx && <Text style={styles.saludTagCtx}>{g.ctx}</Text>}
                                    </View>
                                  ))}
                                </View>
                              )}
                              {/* Columna Presión */}
                              {tienePresion && (
                                <View style={{ flex: 1, gap: 4 }}>
                                  <Text style={styles.saludApiladoLabel}>PRESIÓN</Text>
                                  {grupo.presiones.map((p, i) => (
                                    <View key={i} style={[styles.saludTagWrap, { borderColor: '#ff335566' }]}>
                                      <Text style={[styles.saludTag, { color: '#ff3355', fontWeight: '800' }]}>{p.valor}</Text>
                                      {p.ctx && <Text style={styles.saludTagCtx}>{p.ctx}</Text>}
                                    </View>
                                  ))}
                                </View>
                              )}
                            </View>
                          )}
                          {/* Otras métricas en horizontal */}
                          {tieneOtros && (
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                              {grupo.otros.sueno != null && <Text style={[styles.saludTag, { borderColor: '#9933ff55', color: '#9933ff' }]}>Sueño {grupo.otros.sueno}h</Text>}
                              {grupo.otros.hidratacion != null && <Text style={[styles.saludTag, { borderColor: '#4488ff55', color: '#4488ff' }]}>H₂O {grupo.otros.hidratacion}L</Text>}
                              {grupo.otros.hrv != null && <Text style={[styles.saludTag, { borderColor: '#00cc4455', color: '#00cc44' }]}>HRV {grupo.otros.hrv}ms</Text>}
                              {grupo.otros.energia != null && <Text style={[styles.saludTag, { borderColor: '#ffcc0055', color: '#ffcc00' }]}>Energía {grupo.otros.energia}/10</Text>}
                              {grupo.otros.doms != null && <Text style={[styles.saludTag, { borderColor: '#ff990055', color: '#ff9900' }]}>DOMS {grupo.otros.doms}/10</Text>}
                            </View>
                          )}
                        </View>

                        <TouchableOpacity style={styles.saludDelBtn} onPress={() => setSaludAEliminar({ indices: grupo.indices, fechaKey })}>
                          <AntDesign name="delete" size={14} color="#ff3355" />
                        </TouchableOpacity>
                      </View>
                    )
                  })}
                  {hayMas && (
                    <TouchableOpacity
                      style={styles.saludVerMasBtn}
                      onPress={() => setHistorialExpandido(!historialExpandido)}
                    >
                      <Text style={styles.saludVerMasText}>
                        {historialExpandido
                          ? 'Ver menos'
                          : `Ver ${entradasOrdenadas.length - VISIBLE} más`}
                      </Text>
                      <AntDesign
                        name={historialExpandido ? 'up' : 'down'}
                        size={12}
                        color="#4488ff"
                      />
                    </TouchableOpacity>
                  )}
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
      {/* MODAL REGISTRO SALUD */}
      <Modal visible={saludFormVisible} transparent animationType="slide">
        <View style={styles.saludModalOverlay}>
          <Pressable style={{ flex: 1 }} onPress={toggleSaludForm} />
          <View style={styles.saludModalBox}>
            {/* Handle + header */}
            <View style={styles.saludModalHandle} />
            <View style={styles.saludModalHeader}>
              <Text style={styles.saludModalTitulo}>Nuevo registro</Text>
              <Pressable
                style={({ pressed }) => [styles.saludModalCerrarBtn, pressed && { opacity: 0.7 }]}
                onPress={toggleSaludForm}
              >
                <AntDesign name="close" size={16} color="#2a4488" />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Selector de fecha con calendario */}
              <TouchableOpacity style={styles.saludFechaRow} onPress={() => setMostrarCalendarioSalud(!mostrarCalendarioSalud)}>
                <AntDesign name="calendar" size={14} color="#4488ff" />
                <Text style={styles.saludFechaLabel}>
                  {new Date(fechaSalud + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                </Text>
                <AntDesign name={mostrarCalendarioSalud ? 'up' : 'down'} size={12} color="#2a4488" />
              </TouchableOpacity>
              {mostrarCalendarioSalud && (
                <View style={styles.saludCalendarioWrap}>
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 8 }}>
                    <TouchableOpacity
                      style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#1a3aff', backgroundColor: '#05051f' }}
                      onPress={() => setMostrarCalendarioSalud(false)}
                    >
                      <Text style={{ color: '#4488ff', fontSize: 12, fontWeight: '700' }}>Listo</Text>
                    </TouchableOpacity>
                  </View>
                  <CalendarioSelector
                    fechaInicio={fechaSalud}
                    onSeleccionar={f => { setFechaSalud(f); setMostrarCalendarioSalud(false) }}
                    onCerrar={() => setMostrarCalendarioSalud(false)}
                  />
                </View>
              )}

              {/* Chips de selección */}
              <Text style={[styles.saludFormTitulo, { marginTop: 16 }]}>¿Qué registras?</Text>
              <View style={styles.saludChipsRow}>
                {METRICAS_SALUD.map(m => {
                  const sel = metricasSeleccionadas.includes(m.key)
                  return (
                    <TouchableOpacity
                      key={m.key}
                      style={[styles.saludChip,
                        { borderColor: m.color + '55' },
                        sel && { borderColor: m.color, backgroundColor: m.color + '22' }
                      ]}
                      onPress={() => toggleMetrica(m.key)}
                    >
                      <Text style={[styles.saludChipText, { color: sel ? m.color : m.color + 'aa' }]}>{m.label}</Text>
                      {sel && <AntDesign name="check" size={10} color={m.color} />}
                    </TouchableOpacity>
                  )
                })}
              </View>

              {/* Campos dinámicos */}
              {metricasSeleccionadas.length > 0 && (
                <View style={{ gap: 16 }}>
                  {metricasSeleccionadas.map(key => {
                    const meta = METRICAS_SALUD.find(m => m.key === key)
                    if (!meta) return null
                    return (
                      <View key={key} style={styles.saludCampoWrap}>
                        <View style={styles.saludInputLabelRow}>
                          <Text style={[styles.saludInputLabel, { color: meta.color }]}>{meta.label.toUpperCase()}</Text>
                          {meta.ref ? <Text style={styles.saludInputRef}>{meta.ref} {meta.unit}</Text> : null}
                        </View>

                        {/* Selector de contexto médico */}
                        {meta.contextos && (
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                            <View style={{ flexDirection: 'row', gap: 6 }}>
                              {meta.contextos.map(ctx => (
                            <TouchableOpacity
                              key={ctx}
                              style={[styles.saludCtxBtn, contextosSalud[key] === ctx && { borderColor: meta.color, backgroundColor: meta.color + '22' }]}
                              onPress={() => setContextosSalud(p => ({ ...p, [key]: ctx }))}
                            >
                              <Text style={[styles.saludCtxText, contextosSalud[key] === ctx && { color: meta.color }]}>{ctx}</Text>
                            </TouchableOpacity>
                              ))}
                            </View>
                          </ScrollView>
                        )}

                        {/* Input */}
                        {meta.tipo === 'presion' && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <TextInput style={[styles.saludInput, { flex: 1, borderColor: meta.color + '44' }]}
                              placeholder="120" placeholderTextColor="#2a2a4a" keyboardType="decimal-pad"
                              value={nuevaSalud.presion_sistolica}
                              onChangeText={t => setNuevaSalud(p => ({ ...p, presion_sistolica: t }))} />
                            <Text style={[styles.saludInputUnit, { color: meta.color }]}>/</Text>
                            <TextInput style={[styles.saludInput, { flex: 1, borderColor: meta.color + '44' }]}
                              placeholder="80" placeholderTextColor="#2a2a4a" keyboardType="decimal-pad"
                              value={nuevaSalud.presion_diastolica}
                              onChangeText={t => setNuevaSalud(p => ({ ...p, presion_diastolica: t }))} />
                            <Text style={styles.saludInputUnit}>mmHg</Text>
                          </View>
                        )}
                        {meta.tipo === 'escala' && (
                          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                            {[1,2,3,4,5,6,7,8,9,10].map(n => (
                              <TouchableOpacity
                            key={n}
                            style={[styles.saludEscalaBtn, nuevaSalud[key] === String(n) && { backgroundColor: meta.color, borderColor: meta.color }]}
                            onPress={() => setNuevaSalud(p => ({ ...p, [key]: String(n) }))}
                              >
                            <Text style={[styles.saludEscalaText, nuevaSalud[key] === String(n) && { color: '#fff' }]}>{n}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}
                        {(meta.tipo === 'number' || meta.tipo === 'glucosa') && (
                          <View style={styles.saludInputRow}>
                            <TextInput
                              style={[styles.saludInput, { flex: 1, borderColor: meta.color + '44' }]}
                              placeholder={meta.placeholder} placeholderTextColor="#2a2a4a" keyboardType="decimal-pad"
                              value={nuevaSalud[key]}
                              onChangeText={t => setNuevaSalud(p => ({ ...p, [key]: t }))} />
                            <Text style={[styles.saludInputUnit, { color: meta.color }]}>{meta.unit}</Text>
                          </View>
                        )}
                      </View>
                    )
                  })}

                  <TouchableOpacity style={styles.saludGuardarBtn} onPress={guardarNuevaSalud}>
                    <LinearGradient colors={['#ff3355', '#cc0022']} style={styles.saludGuardarGradient}>
                      <AntDesign name="check" size={16} color="#fff" />
                      <Text style={styles.saludGuardarText}>Guardar registro</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
      </ScrollView>

      {/* MODAL CONFIRMAR ELIMINAR SALUD */}
      <Modal visible={!!saludAEliminar} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <View style={styles.confirmIconBox}>
              <AntDesign name="delete" size={26} color="#ff4444" />
            </View>
            <Text style={styles.confirmTitulo}>¿Eliminar registro del día?</Text>
            <Text style={styles.confirmSub}>
              {saludAEliminar?.fechaKey
                ? new Date(saludAEliminar.fechaKey + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
                : ''}
            </Text>
            <Text style={{ color: '#2a4488', fontSize: 11, textAlign: 'center', marginTop: 4 }}>
              Se eliminarán {saludAEliminar?.indices?.length || 1} registro{(saludAEliminar?.indices?.length || 1) > 1 ? 's' : ''} de este día
            </Text>
            <View style={styles.confirmBtns}>
              <Pressable style={({ pressed }) => [styles.confirmCancelar, pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] }]} onPress={() => setSaludAEliminar(null)}>
                <Text style={styles.confirmCancelarText}>Cancelar</Text>
              </Pressable>
              <Pressable style={({ pressed }) => [styles.confirmEliminar, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]} onPress={confirmarEliminarSalud}>
                <LinearGradient colors={['#ff3355', '#cc0022']} style={styles.confirmEliminarGradient}>
                  <AntDesign name="delete" size={13} color="#fff" />
                  <Text style={styles.confirmEliminarText}>Eliminar</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL CONFIRMAR ELIMINAR MÉTRICA */}
      <Modal visible={metricaAEliminar !== null} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <View style={styles.confirmIconBox}>
              <AntDesign name="delete" size={26} color="#ff4444" />
            </View>
            <Text style={styles.confirmTitulo}>¿Eliminar registro?</Text>
            <Text style={styles.confirmSub}>
              {metricaAEliminar !== null && metricas[metricaAEliminar]
                ? new Date(metricas[metricaAEliminar].fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
                : ''}
            </Text>
            <Text style={styles.confirmWarn}>Esta acción no se puede deshacer.</Text>
            <View style={styles.confirmBtns}>
              <Pressable style={({ pressed }) => [styles.confirmCancelar, pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] }]} onPress={() => setMetricaAEliminar(null)}>
                <Text style={styles.confirmCancelarText}>Cancelar</Text>
              </Pressable>
              <Pressable style={({ pressed }) => [styles.confirmEliminar, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]} onPress={confirmarEliminarMetrica}>
                <LinearGradient colors={['#ff3355', '#cc0022']} style={styles.confirmEliminarGradient}>
                  <AntDesign name="delete" size={13} color="#fff" />
                  <Text style={styles.confirmEliminarText}>Eliminar</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL SELECTOR EJERCICIO */}
      <Modal visible={mostrarSelectorEjercicios} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setMostrarSelectorEjercicios(false)}>
          <View style={styles.selectorModal}>
            <View style={styles.selectorHeader}>
              <Text style={styles.selectorTitulo}>Selecciona ejercicio</Text>
              <TouchableOpacity onPress={() => setMostrarSelectorEjercicios(false)}>
                <AntDesign name="close" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
              {ejerciciosConHistorial.map(ej => (
                <TouchableOpacity
                  key={ej.id}
                  style={[styles.selectorItem, ejercicioSeleccionado?.id === ej.id && styles.selectorItemActivo]}
                  onPress={() => { setEjercicioSeleccionado(ej); setSesionActivaIndex(0); setMostrarSelectorEjercicios(false) }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.selectorItemNombre, ejercicioSeleccionado?.id === ej.id && { color: '#4488ff' }]}>{ej.nombre}</Text>
                    <Text style={styles.selectorItemSesiones}>{ej.historial.length} sesiones</Text>
                  </View>
                  {ejercicioSeleccionado?.id === ej.id && <AntDesign name="check" size={16} color="#4488ff" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* MODAL CONFIRMAR ELIMINAR */}
      <Modal visible={!!sesionAEliminar} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <View style={styles.confirmIconBox}>
              <AntDesign name="delete" size={26} color="#ff4444" />
            </View>
            <Text style={styles.confirmTitulo}>¿Eliminar sesión?</Text>
            <Text style={styles.confirmSub}>
              {sesionAEliminar && new Date(sesionAEliminar.sesion.fecha).toLocaleDateString('es-MX', {
                day: 'numeric', month: 'long', year: 'numeric'
              })}
            </Text>
            <Text style={styles.confirmWarn}>Esta acción no se puede deshacer.</Text>
            <View style={styles.confirmBtns}>
              <Pressable style={({ pressed }) => [styles.confirmCancelar, pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] }]} onPress={() => setSesionAEliminar(null)}>
                <Text style={styles.confirmCancelarText}>Cancelar</Text>
              </Pressable>
              <Pressable style={({ pressed }) => [styles.confirmEliminar, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]} onPress={confirmarEliminarSesion}>
                <LinearGradient colors={['#ff3355', '#cc0022']} style={styles.confirmEliminarGradient}>
                  <AntDesign name="delete" size={13} color="#fff" />
                  <Text style={styles.confirmEliminarText}>Eliminar</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { padding: 20, paddingTop: 56,  paddingBottom: LAYOUT.bottomTabSpace || 150},

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28},

  // TABS
  tabsRow: { flexDirection: 'row', gap: 6, marginBottom: 20, backgroundColor: '#05050f', borderRadius: 16, padding: 5, borderWidth: 1, borderColor: '#0f1a3a' },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 12 },
  tabBtnActivo: { backgroundColor: '#0a1535', borderWidth: 1, borderColor: '#1a3aff' },
  tabBtnText: { color: '#2a4488', fontSize: 13, fontWeight: '700' },
  tabBtnTextActivo: { color: '#4488ff' },

  // CUERPO
  cuerpoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cuerpoValorPrincipal: { fontSize: 32, fontWeight: '900', color: '#fff' },
  cuerpoFecha: { color: '#2a4488', fontSize: 11, marginTop: 2 },
  cuerpoVacio: { color: '#2a4488', fontSize: 14 },
  cuerpoAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#1a3aff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#05051f' },
  cuerpoAddBtnActivo: { borderColor: '#ff3355', backgroundColor: '#1a0508' },
  cuerpoAddText: { color: '#4488ff', fontSize: 12, fontWeight: '700' },
  cuerpoForm: { backgroundColor: '#05050f', borderWidth: 1, borderColor: '#0a1a3f', borderRadius: 16, padding: 16, marginBottom: 16, gap: 14 },
  unidadRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  unidadBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#0f1a3a', backgroundColor: '#0a0a1f' },
  unidadBtnActivo: { borderColor: '#1a3aff', backgroundColor: '#05051f' },
  unidadText: { color: '#2a4488', fontWeight: '700', fontSize: 13 },
  unidadTextActivo: { color: '#4488ff' },
  cuerpoFormRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  cuerpoInputWrap: { flex: 1 },
  cuerpoInputLabel: { color: '#2a4488', fontSize: 9, fontWeight: '800', letterSpacing: 1, marginBottom: 6 },
  cuerpoInput: { backgroundColor: '#0a0a1f', borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 10, padding: 11, color: '#fff', fontSize: 15, textAlign: 'center' },
  cuerpoHistorialDelBtn: { width: 32, height: 32, borderRadius: 10, borderWidth: 1, borderColor: '#ff3355', backgroundColor: '#1a0005', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  cuerpoGuardarBtn: { borderRadius: 12, overflow: 'hidden', marginTop: 4 },
  cuerpoGuardarGradient: { padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  cuerpoGuardarText: { color: '#fff', fontWeight: '900', fontSize: 13 },
  metricaSelector: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  metricaSelectorBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#0f1a3a', backgroundColor: '#05050f', alignItems: 'center' },
  metricaSelectorBtnActivo: { borderColor: '#1a3aff', backgroundColor: '#0a1535' },
  metricaSelectorText: { color: '#2a4488', fontSize: 12, fontWeight: '700' },
  metricaSelectorTextActivo: { color: '#4488ff' },
  cuerpoStatsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  cuerpoStatCard: { flex: 1, backgroundColor: '#05050f', borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 14, padding: 14, alignItems: 'center' },
  cuerpoStatLabel: { color: '#2a4488', fontSize: 9, fontWeight: '800', letterSpacing: 1, marginBottom: 6 },
  cuerpoStatVal: { color: '#fff', fontSize: 18, fontWeight: '900' },
  cuerpoStatUnit: { color: '#2a4488', fontSize: 12 },
  cuerpoStatDelta: { fontSize: 11, fontWeight: '700', marginTop: 4 },
  cuerpoHistorialTitulo: { color: '#2a4488', fontSize: 10, fontWeight: '800', letterSpacing: 2, marginBottom: 10 },
  cuerpoHistorialItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#05050f', borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 12, padding: 12, marginBottom: 8 },
  cuerpoHistorialFecha: { color: '#4488ff', fontSize: 12, fontWeight: '700' },
  cuerpoHistorialVals: { flex: 1, flexDirection: 'row', gap: 6, flexWrap: 'wrap', paddingHorizontal: 8 },
  cuerpoMetricaTag: { borderWidth: 1, borderColor: '#4488ff44', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, alignItems: 'center', minWidth: 56 },
  cuerpoMetricaVal: { color: '#4488ff', fontSize: 14, fontWeight: '900' },
  cuerpoMetricaUnit: { color: '#2a4488', fontSize: 9, fontWeight: '700', marginTop: 1 },
  cuerpoHistorialVal: { color: '#fff', fontSize: 14, fontWeight: '900' },
  cuerpoHistorialTag: { color: '#2a4488', fontSize: 11, backgroundColor: '#0a0a1f', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  titulo: { fontSize: 28, fontWeight: '900', color: '#fff' },

  emptyBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 50, backgroundColor: '#05050f', borderRadius: 16, borderWidth: 1, borderColor: '#0f1a3a', marginVertical: 8,
    backgroundColor: '#05050f', borderWidth: 1, borderColor: '#0f1a3a',
    borderRadius: 16, borderStyle: 'dashed', marginTop: 16 },
  emptyTitulo: { fontSize: 16, fontWeight: '700', color: '#fff', marginTop: 12, marginBottom: 6 },
  emptySub: { fontSize: 13, color: '#2a4488', textAlign: 'center', paddingHorizontal: 32 },

  sectionLabel: { fontSize: 10, fontWeight: '800', color: '#2a4488', letterSpacing: 2, marginBottom: 10 },

  // Filtro dropdown
  filtroDropdownBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#05050f', borderWidth: 1, borderColor: '#0f1a3a',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12
  },
  filtroDropdownLabel: { flex: 1, color: '#fff', fontSize: 13, fontWeight: '700' },
  filtroModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  filtroModalBox: { backgroundColor: '#05050f', borderRadius: 18, borderWidth: 1, borderColor: '#0033ff', width: '100%', overflow: 'hidden' },
  filtroModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#0f1a3a' },
  filtroModalTitulo: { fontSize: 15, fontWeight: '900', color: '#fff' },
  filtroProgRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderBottomWidth: 1, borderBottomColor: '#0a0a2a' },
  filtroProgRowActivo: { backgroundColor: '#0a0a2a' },
  filtroProgNombre: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '700' },
  filtroBloqueRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 11, paddingRight: 14, borderBottomWidth: 1, borderBottomColor: '#0a0a1a' },
  filtroBloqueRowActivo: { backgroundColor: '#001a0a' },
  filtroBloqueIndent: { width: 28 },
  filtroBloqueName: { flex: 1, color: '#2a4488', fontSize: 13, fontWeight: '600' },

  // Ejercicio
  ejercicioBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 14, borderWidth: 1, borderColor: '#1a3aff',
    backgroundColor: '#05050f', borderWidth: 1, borderColor: '#0f1a3a',
    borderRadius: 12, padding: 14, marginBottom: 12 },
  ejercicioBtnNombre: { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 2 },
  ejercicioBtnSub: { color: '#2a4488', fontSize: 11, fontWeight: '600' },

  // Stats cards grandes y atractivas
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  statCard: { borderRadius: 14, borderWidth: 1, borderColor: '#0f1a3a',
    flex: 1, borderRadius: 10, padding: 10,
    alignItems: 'center', overflow: 'hidden',
    borderWidth: 1, borderColor: '#0f1a3a',
  },
  statCardLabel: { color: '#2a4488', fontSize: 8, fontWeight: '800', letterSpacing: 1, marginBottom: 4 },
  statCardVal: { color: '#ffffff', fontSize: 18, fontWeight: '900', lineHeight: 22 },
  statCardUnit: { color: '#4488ff', fontSize: 10, fontWeight: '700', marginTop: 1, marginBottom: 6 },
  statCardBar: { width: '100%', height: 2, borderRadius: 2, opacity: 0.6 },

  // Feedback inline
  feedbackInline: { flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#05050f', borderWidth: 1, borderColor: '#0f1a3a',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10 },
  feedbackInlineLabel: { color: '#2a4488', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  feedbackInlineVals: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  feedbackInlineItem: { color: '#2a4488', fontSize: 11, fontWeight: '600' },
  feedbackInlineNum: { color: '#4488ff', fontWeight: '900' },

  // Gráfica
  chartBox: { backgroundColor: '#05050f', borderWidth: 1, borderColor: '#0f1a3a',
    borderRadius: 14, padding: 14, marginBottom: 14 },
  chartHeader: { flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 8 },
  chartTitulo: { color: '#fff', fontSize: 12, fontWeight: '700', flex: 1 },
  chartMetricRow: { flexDirection: 'row', gap: 6 },
  chartMetricBtn: { paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8, borderWidth: 1, borderColor: '#0f1a3a', backgroundColor: '#0a0a1f' },
  chartMetricBtnActivo: { borderColor: '#4488ff', backgroundColor: '#0a1a3a' },
  chartMetricText: { color: '#2a4488', fontSize: 11, fontWeight: '700' },
  chartMetricTextActivo: { color: '#4488ff' },

  emptyChart: { backgroundColor: '#05050f', borderWidth: 1, borderColor: '#0f1a3a',
    borderRadius: 12, padding: 28, marginBottom: 14, alignItems: 'center' },
  emptyChartText: { color: '#2a4488', fontSize: 13, fontWeight: '600' },

  // Historial
  historialHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#05050f', borderRadius: 12, padding: 10, marginBottom: 8,
    justifyContent: 'space-between', marginBottom: 10 },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navBtn: { padding: 8, borderWidth: 1, borderColor: '#1a3aff', borderRadius: 10, backgroundColor: '#05051f' },
  navBtnDis: { borderColor: '#0f1a3a', opacity: 0.25 },
  navLabel: { color: '#4488ff', fontSize: 12, fontWeight: '700', minWidth: 38, textAlign: 'center' },

  // Sesión
  sesionCard: { backgroundColor: '#05050f', borderWidth: 1, borderColor: '#1a3aff',
  sesionContexto: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  sesionContextoText: { color: '#2a4488', fontSize: 10, fontWeight: '600' },
    borderRadius: 14, padding: 14, marginBottom: 12 },
  sesionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sesionFecha: { color: '#4488ff', fontSize: 13, fontWeight: '700', marginBottom: 2 },
  sesionFechaCompleta: { color: '#2a4488', fontSize: 11, fontWeight: '600' },
  eliminarBtn: { width: 32, height: 32, borderRadius: 10, borderWidth: 1, borderColor: '#ff3355', backgroundColor: '#1a0005', justifyContent: 'center', alignItems: 'center' },
  sesionStats: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  sesionStat: { color: '#2a4488', fontSize: 12, fontWeight: '600' },
  sesionStatDivider: { width: 1, height: 12, backgroundColor: '#0f1a3a', marginHorizontal: 10 },
  sesionDetalle: { gap: 5 },
  serieRow: { flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 5, paddingHorizontal: 8, backgroundColor: '#0a0a1f', borderRadius: 8 },
  serieNum: { color: '#4488ff', fontWeight: '900', fontSize: 11, width: 18, textAlign: 'center' },
  serieVal: { color: '#fff', fontSize: 12, fontWeight: '600', flex: 1 },
  sesionFeedback: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingTop: 8,
    marginTop: 6, borderTopWidth: 1, borderTopColor: '#0f1a3a' },
  feedbackText: { color: '#2a4488', fontSize: 11, fontWeight: '600' },

  // Modal selector
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  selectorModal: { backgroundColor: '#05050f', borderRadius: 18, borderWidth: 1,
    borderColor: '#0033ff', width: '85%', overflow: 'hidden' },
  selectorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: '#0f1a3a' },
  selectorTitulo: { fontSize: 15, fontWeight: '900', color: '#fff' },
  selectorItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, borderBottomWidth: 1, borderBottomColor: '#0f1a3a' },
  selectorItemActivo: { backgroundColor: '#0a0a2a' },
  selectorItemNombre: { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 2 },
  selectorItemSesiones: { color: '#2a4488', fontSize: 11 },

  // Modal confirmar eliminar
  confirmOverlay: { flex: 1, backgroundColor: 'rgba(0,2,15,0.92)',
    justifyContent: 'center', alignItems: 'center', padding: 24 },
  confirmBox: { backgroundColor: '#08080f', borderRadius: 22, padding: 26,
    width: '100%', borderWidth: 1, borderColor: '#ff335566', alignItems: 'center',
    shadowColor: '#ff3355', shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
  confirmIconBox: { width: 54, height: 54, borderRadius: 14, backgroundColor: '#1a0000',
    borderWidth: 1, borderColor: '#ff3355', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  confirmTitulo: { fontSize: 18, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 6 },
  confirmSub: { fontSize: 13, color: '#4488ff', fontWeight: '600', textAlign: 'center', marginBottom: 4 },
  confirmWarn: { fontSize: 11, color: '#ff4444', textAlign: 'center', marginBottom: 20 },
  confirmBtns: { flexDirection: 'row', gap: 10, width: '100%' },
  confirmCancelar: { flex: 1, padding: 14, borderRadius: 12,
    borderWidth: 1, borderColor: '#1a3aff44', backgroundColor: '#05051a', alignItems: 'center' },
  confirmCancelarText: { color: '#4488ff', fontWeight: '700', fontSize: 13 },
  confirmEliminar: { flex: 1, borderRadius: 11, overflow: 'hidden' },
  confirmEliminarGradient: { padding: 14, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8 },
  confirmEliminarText: { color: '#fff', fontWeight: '900', fontSize: 13 },

  saludModalOverlay: { flex: 1, backgroundColor: 'rgba(0,2,15,0.85)', justifyContent: 'flex-end' },
  saludModalBox: { backgroundColor: '#08080f', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingBottom: 40, borderWidth: 1, borderColor: '#ff335533', maxHeight: '90%' },
  saludModalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#1a1a3a', alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  saludModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#0f1a3a', marginBottom: 16 },
  saludModalTitulo: { fontSize: 18, fontWeight: '900', color: '#fff' },
  saludModalCerrarBtn: { width: 32, height: 32, borderRadius: 10, borderWidth: 1, borderColor: '#0f1a3a', backgroundColor: '#0a0a1f', justifyContent: 'center', alignItems: 'center' },
  // SALUD
  saludAddBtn: { borderRadius: 14, overflow: 'hidden', marginBottom: 12 },
  saludAddGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderWidth: 1, borderColor: '#ff335544', borderRadius: 14 },
  saludAddText: { color: '#ff3355', fontSize: 14, fontWeight: '800' },
  saludGraficaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  saludGraficaTitulo: { fontSize: 13, fontWeight: '800' },
  saludGraficaRef: { color: '#2a4488', fontSize: 11 },
  saludGraficaOverlay: { position: 'absolute', top: 50, left: 0, right: 0, alignItems: 'center', gap: 4 },
  saludForm: { backgroundColor: '#05050f', borderWidth: 1, borderColor: '#1a0a0f', borderRadius: 16, padding: 16, marginBottom: 16, gap: 14 },
  saludFormTitulo: { color: '#fff', fontSize: 13, fontWeight: '800' },
  saludFechaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#0a0a1f', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#1a3aff44' },
  saludFechaLabel: { flex: 1, color: '#fff', fontSize: 13, fontWeight: '600' },
  saludCalendarioWrap: { backgroundColor: '#05050f', borderRadius: 16, borderWidth: 1, borderColor: '#1a3aff', padding: 16, marginTop: 8 },
  saludChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  saludChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1, backgroundColor: '#080812' },
  saludChipText: { fontSize: 13, fontWeight: '700' },
  saludCampoWrap: { gap: 8, backgroundColor: '#080812', borderRadius: 12, padding: 12 },
  saludCtxBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#0f1a3a', backgroundColor: '#0a0a1f' },
  saludCtxText: { color: '#2a4488', fontSize: 11, fontWeight: '600' },
  saludInputLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  saludInputLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  saludInputRef: { color: '#1a2a5a', fontSize: 10, marginLeft: 'auto' },
  saludInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  saludInput: { backgroundColor: '#0a0a1f', borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 10, padding: 11, color: '#fff', fontSize: 15 },
  saludInputUnit: { color: '#2a4488', fontSize: 12, minWidth: 36 },
  saludEscalaBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: '#0f1a3a', backgroundColor: '#0a0a1f', justifyContent: 'center', alignItems: 'center' },
  saludEscalaText: { color: '#2a4488', fontSize: 13, fontWeight: '700' },
  saludGuardarBtn: { borderRadius: 12, overflow: 'hidden', marginTop: 4 },
  saludGuardarGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14 },
  saludGuardarText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  saludMetricaBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#0f1a3a', backgroundColor: '#05050f' },
  saludMetricaBtnText: { fontSize: 12, fontWeight: '700' },
  saludMetricaDot: { width: 5, height: 5, borderRadius: 3 },
  saludEmptyChart: { height: 100, justifyContent: 'center', alignItems: 'center', marginBottom: 16, gap: 8 },
  saludEmptyChartText: { color: '#2a4488', fontSize: 12, textAlign: 'center' },
  saludUltimoCard: { backgroundColor: '#05050f', borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 16, padding: 16, marginBottom: 16 },
  saludUltimoTitulo: { color: '#2a4488', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 12 },
  saludUltimoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  saludUltimoItem: { backgroundColor: '#0a0a1f', borderWidth: 1, borderRadius: 12, padding: 12, minWidth: 82, alignItems: 'center', gap: 2 },
  saludUltimoValor: { fontSize: 20, fontWeight: '900', marginTop: 4 },
  saludUltimoUnit: { color: '#2a4488', fontSize: 10 },
  saludUltimoLabel: { color: '#fff', fontSize: 11, fontWeight: '700', marginTop: 2 },
  saludUltimoRef: { color: '#2a4488', fontSize: 9, marginTop: 1 },
  saludEmpty: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  saludEmptyText: { color: '#2a4488', fontSize: 15, fontWeight: '700' },
  saludEmptySub: { color: '#1a2a5a', fontSize: 12 },
  saludHistorialItem: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#05050f', borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 14, padding: 14, marginBottom: 8, gap: 10 },
  saludHistorialFechaCol: { minWidth: 52, paddingTop: 2 },
  saludHistorialFecha: { color: '#4488ff', fontSize: 13, fontWeight: '800' },
  saludHistorialAño: { color: '#2a4488', fontSize: 10 },
  saludApiladoLabel: { color: '#2a4488', fontSize: 9, fontWeight: '800', letterSpacing: 1.5, marginBottom: 3 },
  saludTagWrap: { borderWidth: 1, borderRadius: 8, padding: 8, gap: 3 },
  saludTag: { fontSize: 12, fontWeight: '800' },
  saludTagCtx: { color: '#2a4488', fontSize: 10, fontWeight: '600' },
  saludDelBtn: { width: 32, height: 32, borderRadius: 10, borderWidth: 1, borderColor: '#ff3355', backgroundColor: '#1a0005', justifyContent: 'center', alignItems: 'center' },
  saludVerMasBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#1a3aff44', backgroundColor: '#05050f', marginTop: 4 },
  saludVerMasText: { color: '#4488ff', fontSize: 13, fontWeight: '700' },
  saludHistorialHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 10 },
  saludFiltroBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#0f1a3a', backgroundColor: '#05050f' },
  saludFiltroBtnText: { color: '#2a4488', fontSize: 12, fontWeight: '700' },
  saludFiltroPanel: { flexDirection: 'row', gap: 10, backgroundColor: '#05050f', borderRadius: 14, borderWidth: 1, borderColor: '#0f1a3a', padding: 14, marginBottom: 12 },
  saludFiltroLabel: { color: '#2a4488', fontSize: 9, fontWeight: '800', letterSpacing: 1.5, marginBottom: 6 },
  saludFiltroFechaBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#0a0a1f', borderRadius: 10, borderWidth: 1, borderColor: '#0f1a3a', paddingHorizontal: 10, paddingVertical: 8 },
  saludFiltroFechaText: { color: '#fff', fontSize: 12, fontWeight: '600' },
})
