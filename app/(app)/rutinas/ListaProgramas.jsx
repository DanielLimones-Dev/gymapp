// ============================================
// LISTA DE PROGRAMAS — Nivel superior de periodización
// Cada programa contiene múltiples bloques
// ============================================
import { useState, useRef, useEffect, useCallback } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Modal, ActivityIndicator, KeyboardAvoidingView, Platform, Animated, Pressable
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { AntDesign } from '@expo/vector-icons'
import { supabase } from '../../../lib/supabase'
import { guardarYSincronizar, cargarPrograma } from '../../../lib/storage'
import { LAYOUT } from '../../../components/constans'

const DIAS_SEMANA = [
  { key: 0 }, { key: 1 }, { key: 2 }, { key: 3 },
  { key: 4 }, { key: 5 }, { key: 6 }
]

const OBJETIVOS = [
  { 
    key: 'hipertrofia', 
    label: 'Hipertrofia', 
    emoji: '💪', 
    color: '#0033ff',
    duracionDefault: 12,
    duracionMin: 8,
    duracionMax: 16
  },
  { 
    key: 'fuerza', 
    label: 'Fuerza', 
    emoji: '🏋️', 
    color: '#ff6600',
    duracionDefault: 16,
    duracionMin: 12,
    duracionMax: 20
  },
  { 
    key: 'definicion', 
    label: 'Definición', 
    emoji: '🔥', 
    color: '#00cc44',
    duracionDefault: 12,
    duracionMin: 8,
    duracionMax: 16
  },
  { 
    key: 'definicion_larga', 
    label: 'Def. Larga', 
    emoji: '🔥', 
    color: '#00aa33',
    duracionDefault: 24,
    duracionMin: 20,
    duracionMax: 32
  },
  { 
    key: 'minicut', 
    label: 'Mini-cut', 
    emoji: '⚡', 
    color: '#ff9900',
    duracionDefault: 6,
    duracionMin: 4,
    duracionMax: 8
  },
  { 
    key: 'competencia', 
    label: 'Competencia', 
    emoji: '🏆', 
    color: '#ff0044',
    duracionDefault: 16,
    duracionMin: 12,
    duracionMax: 20
  },
]

const PROGRAMA_INICIAL = {
  programas: [],
  dias: {}
}

function CalendarioSelector({ fechaInicio, onSeleccionar, onCerrar, fechasOcupadas = [] }) {
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
    const n = new Date(mesActual)
    n.setMonth(mesActual.getMonth() + dir)
    setMesActual(n)
  }

  function estaOcupada(d) {
    const fecha = new Date(mesActual.getFullYear(), mesActual.getMonth(), d)
    fecha.setHours(12, 0, 0, 0)
    return fechasOcupadas.some(({ inicio, fin }) => fecha >= inicio && fecha <= fin)
  }

  function seleccionarFecha(d) {
    if (estaOcupada(d)) return
    const nueva = new Date(mesActual.getFullYear(), mesActual.getMonth(), d)
    const a = nueva.getFullYear()
    const m = String(nueva.getMonth() + 1).padStart(2, '0')
    const ds = String(nueva.getDate()).padStart(2, '0')
    onSeleccionar(`${a}-${m}-${ds}`)
    onCerrar()
  }

  return (
    <>
      <View style={styles.calendarioNavegacion}>
        <TouchableOpacity onPress={() => cambiarMes(-1)} style={styles.calendarioBtn}>
          <AntDesign name="left" size={18} color="#4488ff" />
        </TouchableOpacity>
        <Text style={styles.calendarioMesAnio}>{meses[mesActual.getMonth()]} {mesActual.getFullYear()}</Text>
        <TouchableOpacity onPress={() => cambiarMes(1)} style={styles.calendarioBtn}>
          <AntDesign name="right" size={18} color="#4488ff" />
        </TouchableOpacity>
      </View>
      <View style={styles.calendarioDiasSemana}>
        {['D','L','M','M','J','V','S'].map((d, i) => (
          <Text key={i} style={styles.calendarioDiaSemanaText}>{d}</Text>
        ))}
      </View>
      <View style={styles.calendarioGrid}>
        {Array.from({ length: primerDiaSemana }).map((_, i) => (
          <View key={`e-${i}`} style={styles.calendarioDiaVacio} />
        ))}
        {Array.from({ length: diasEnMes }).map((_, i) => {
          const d = i + 1
          const fecha = new Date(mesActual.getFullYear(), mesActual.getMonth(), d)
          const esHoy = fecha.toDateString() === hoy.toDateString()
          const esSel = fecha.toDateString() === fechaSeleccionada.toDateString()
          const ocupada = estaOcupada(d)
          return (
            <TouchableOpacity
              key={d}
              style={[
                styles.calendarioDia,
                esHoy && styles.calendarioDiaHoy,
                esSel && styles.calendarioDiaSeleccionado,
                ocupada && styles.calendarioDiaOcupado,
              ]}
              onPress={() => seleccionarFecha(d)}
              activeOpacity={ocupada ? 1 : 0.7}
            >
              <Text style={[
                styles.calendarioDiaText,
                esHoy && styles.calendarioDiaHoyText,
                esSel && styles.calendarioDiaSeleccionadoText,
                ocupada && styles.calendarioDiaOcupadoText,
              ]}>
                {d}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </>
  )
}

export default function ListaProgramas({ navigation }) {
  const [programa, setPrograma] = useState(PROGRAMA_INICIAL)
  const [userId, setUserId] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [modalVisible, setModalVisible] = useState(false)
  const [programaEditando, setProgramaEditando] = useState(null)
  const [nuevoPrograma, setNuevoPrograma] = useState({
    nombre: '',
    objetivo: 'hipertrofia',
    duracionSemanas: '',
    fechaInicio: new Date().toISOString().split('T')[0]
  })
  const [programaAEliminar, setProgramaAEliminar] = useState(null)
  const [archivadosAbierto, setArchivadosAbierto] = useState(false)
  const archivadosAnim = useRef(new Animated.Value(0)).current

  function toggleArchivados() {
    const toValue = archivadosAbierto ? 0 : 1
    setArchivadosAbierto(a => !a)
    Animated.spring(archivadosAnim, {
      toValue,
      useNativeDriver: false,
      tension: 80,
      friction: 10,
    }).start()
  }
  const [mostrarCalendario, setMostrarCalendario] = useState(false)

  // Cargar usuario Y programa juntos al montar
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setCargando(false); return }
      setUserId(user.id)
      const local = await cargarPrograma(user.id)
      if (local) {
        if (!local.programas) local.programas = []
        if (!local.dias) local.dias = {}
        setPrograma(local)
      }
      setCargando(false)
    }
    init()
  }, [])

  // Recargar al volver a la pantalla de forma ligera y silenciosa
  useFocusEffect(
    useCallback(() => {
      async function loadPrograma() {
        // Usamos el userId que ya está en el estado, sin llamar a Supabase de nuevo
        if (!userId) return 
        
        const local = await cargarPrograma(userId)
        if (local) {
          if (!local.programas) local.programas = []
          if (!local.dias) local.dias = {}
          setPrograma(local)
        }
      }
      loadPrograma()
    }, [userId]) // Agregamos userId como dependencia
  )

  function abrirModalNuevo() {
    setProgramaEditando(null)
    const objetivoDefault = OBJETIVOS.find(o => o.key === 'hipertrofia')
    setNuevoPrograma({ 
      nombre: '', 
      objetivo: 'hipertrofia', 
      duracionSemanas: objetivoDefault.duracionDefault.toString(),
      fechaInicio: new Date().toISOString().split('T')[0]
    })
    setModalVisible(true)
  }

  function abrirModalEditar(prog) {
    setProgramaEditando(prog)
    setNuevoPrograma({
      nombre: prog.nombre,
      objetivo: prog.objetivo,
      duracionSemanas: prog.duracionSemanas?.toString() || '12',
      fechaInicio: prog.fechaInicio || new Date().toISOString().split('T')[0]
    })
    setModalVisible(true)
  }

  async function guardarPrograma() {
    if (!nuevoPrograma.nombre.trim()) return
    if (!nuevoPrograma.duracionSemanas || parseInt(nuevoPrograma.duracionSemanas) < 1) return

    const duracion = parseInt(nuevoPrograma.duracionSemanas)
    const fechaInicio = new Date(nuevoPrograma.fechaInicio)
    const fechaFin = new Date(fechaInicio)
    fechaFin.setDate(fechaFin.getDate() + (duracion * 7))

    let nuevosProgramas

    if (programaEditando) {
      // EDITAR programa existente
      nuevosProgramas = programa.programas.map(p =>
        p.id === programaEditando.id
          ? {
              ...p,
              nombre: nuevoPrograma.nombre,
              objetivo: nuevoPrograma.objetivo,
              duracionSemanas: duracion,
              fechaInicio: nuevoPrograma.fechaInicio,
              fechaFin: fechaFin.toISOString().split('T')[0],
            }
          : p
      )
    } else {
      // CREAR nuevo programa
      const nuevo = {
        id: `prog_${Date.now()}`,
        nombre: nuevoPrograma.nombre,
        objetivo: nuevoPrograma.objetivo,
        duracionSemanas: duracion,
        fechaInicio: nuevoPrograma.fechaInicio,
        fechaFin: fechaFin.toISOString().split('T')[0],
        estado: 'activo',
        bloques: [],
        creado_en: new Date().toISOString()
      }
      nuevosProgramas = [...(programa.programas || []), nuevo]
    }

    const nuevoProgramaData = { ...programa, programas: nuevosProgramas }
    setPrograma(nuevoProgramaData)
    await guardarYSincronizar(userId, nuevoProgramaData)

    const objetivoDefault = OBJETIVOS.find(o => o.key === 'hipertrofia')
    setNuevoPrograma({ 
      nombre: '', 
      objetivo: 'hipertrofia', 
      duracionSemanas: objetivoDefault.duracionDefault.toString(),
      fechaInicio: new Date().toISOString().split('T')[0]
    })
    setProgramaEditando(null)
    setModalVisible(false)
  }

  async function archivarPrograma(id) {
    const nuevosProgramas = programa.programas.map(p =>
      p.id === id ? { ...p, estado: 'archivado', fechaArchivado: new Date().toISOString() } : p
    )
    const nuevoProgramaData = { ...programa, programas: nuevosProgramas }
    setPrograma(nuevoProgramaData)
    await guardarYSincronizar(userId, nuevoProgramaData)
  }

  async function eliminarPrograma(id) {
    // Limpiar historial de ejercicios del programa antes de eliminar
    const prog = programa.programas.find(p => p.id === id)
    if (prog) {
      const diasALimpiar = {}
      prog.bloques?.forEach(bloque => {
        DIAS_SEMANA.forEach(d => {
          const k = `ejercicios_${bloque.id}_${d.key}`
          if (programa.dias[k]) diasALimpiar[k] = undefined
        })
        diasALimpiar[`dias_${bloque.id}`] = undefined
        diasALimpiar[`etiquetas_${bloque.id}`] = undefined
      })
      // Filtrar claves undefined del objeto dias
      const diasLimpios = Object.fromEntries(
        Object.entries({ ...programa.dias, ...diasALimpiar }).filter(([, v]) => v !== undefined)
      )
      const nuevosProgramas = programa.programas.filter(p => p.id !== id)
      const nuevoProgramaData = { ...programa, programas: nuevosProgramas, dias: diasLimpios }
      setPrograma(nuevoProgramaData)
      await guardarYSincronizar(userId, nuevoProgramaData)
    } else {
      const nuevosProgramas = programa.programas.filter(p => p.id !== id)
      const nuevoProgramaData = { ...programa, programas: nuevosProgramas }
      setPrograma(nuevoProgramaData)
      await guardarYSincronizar(userId, nuevoProgramaData)
    }
  }

  async function cambiarEstado(programaId, nuevoEstado) {
    const nuevosProgramas = programa.programas.map(p =>
      p.id === programaId ? { ...p, estado: nuevoEstado } : p
    )
    const nuevoProgramaData = { ...programa, programas: nuevosProgramas }
    setPrograma(nuevoProgramaData)
    await guardarYSincronizar(userId, nuevoProgramaData)
  }

  function cambiarObjetivo(nuevoObjetivo) {
    const objetivo = OBJETIVOS.find(o => o.key === nuevoObjetivo)
    setNuevoPrograma(p => ({ 
      ...p, 
      objetivo: nuevoObjetivo,
      duracionSemanas: objetivo.duracionDefault.toString()
    }))
  }

  function calcularProgreso(prog) {
    if (!prog.bloques || prog.bloques.length === 0) return 0
    
    const semanasCompletadas = prog.bloques
      .filter(b => b.completado)
      .reduce((acc, b) => acc + (b.semanas || 0), 0)
    
    return Math.min(100, Math.round((semanasCompletadas / prog.duracionSemanas) * 100))
  }

  const programasActivos = programa.programas?.filter(p => p.estado === 'activo') || []
  const programasCompletados = programa.programas?.filter(p => p.estado === 'completado') || []
  const programasArchivados = programa.programas?.filter(p => p.estado === 'archivado') || []

  const totalProgramas = programa.programas?.length || 0

  if (cargando) return (
    <LinearGradient colors={['#000000', '#050510', '#0a0a1f']} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator color="#4488ff" size="large" />
    </LinearGradient>
  )

  return (
    <LinearGradient colors={['#000000', '#050510', '#0a0a1f']} style={styles.gradient}>
      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: LAYOUT.bottomTabSpace }]} showsVerticalScrollIndicator={false}>

        <View style={styles.headerRow}>
          <View>
            <Text style={styles.saludo}>Mis Programas</Text>
            <Text style={styles.fecha}>Periodización de entrenamiento</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {programasArchivados.length > 0 && (
              <TouchableOpacity
                style={[styles.addButton, archivadosAbierto && { borderColor: '#2a4488', backgroundColor: '#0a0a1f' }]}
                onPress={toggleArchivados}
              >
                <AntDesign name="inbox" size={18} color={archivadosAbierto ? '#4488ff' : '#2a4488'} />
                {programasArchivados.length > 0 && !archivadosAbierto && (
                  <View style={styles.archivadosBadge}>
                    <Text style={styles.archivadosBadgeText}>{programasArchivados.length}</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.addButton} onPress={abrirModalNuevo}>
              <AntDesign name="plus" size={20} color="#4488ff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* PROGRAMAS ACTIVOS */}
        {programasActivos.length > 0 && (
          <>
            <Text style={styles.seccionLabel}>ACTIVOS</Text>
            {programasActivos.map((prog) => {
              const objetivo = OBJETIVOS.find(o => o.key === prog.objetivo) || OBJETIVOS[0]
              const progreso = calcularProgreso(prog)
              const numBloques = prog.bloques?.length || 0

              return (
                <TouchableOpacity
                  key={prog.id}
                  style={styles.programaCard}
                  onPress={() => navigation.navigate('ListaBloques', { programaId: prog.id, userId })}
                >
                  {/* Header */}
                  <View style={styles.programaHeader}>
                    <View style={[styles.objetivoBadge, { borderColor: objetivo.color }]}>
                      <Text style={styles.objetivoEmoji}>{objetivo.emoji}</Text>
                      <Text style={[styles.objetivoText, { color: objetivo.color }]}>
                        {objetivo.label.toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.estadoBadge}>
                      <View style={styles.estadoDot} />
                      <Text style={styles.estadoText}>ACTIVO</Text>
                    </View>
                  </View>

                  {/* Nombre */}
                  <Text style={styles.programaNombre}>{prog.nombre}</Text>
                  
                  {/* Info */}
                  <View style={styles.programaInfo}>
                    <Text style={styles.programaInfoText}>
                      {numBloques} {numBloques === 1 ? 'bloque' : 'bloques'} · {prog.duracionSemanas} semanas
                    </Text>
                    {prog.fechaInicio && (
                      <Text style={styles.programaInfoText}>
                        📅 {(() => {
                          const [año, mes, dia] = prog.fechaInicio.split('-').map(Number)
                          return new Date(año, mes - 1, dia).toLocaleDateString('es-MX', { 
                            day: 'numeric', 
                            month: 'short' 
                          })
                        })()} - {(() => {
                          const fechaFin = prog.fechaFin || prog.fechaInicio
                          const [año, mes, dia] = fechaFin.split('-').map(Number)
                          return new Date(año, mes - 1, dia).toLocaleDateString('es-MX', { 
                            day: 'numeric', 
                            month: 'short',
                            year: 'numeric'
                          })
                        })()}
                      </Text>
                    )}
                    {/* Semana actual */}
                    {prog.fechaInicio && prog.estado === 'activo' && (() => {
                      const inicio = new Date(prog.fechaInicio)
                      const hoy = new Date()
                      const diasTranscurridos = Math.floor((hoy - inicio) / (1000 * 60 * 60 * 24))
                      const semanaActual = Math.floor(diasTranscurridos / 7) + 1
                      if (semanaActual > 0 && semanaActual <= prog.duracionSemanas) {
                        return (
                          <Text style={[styles.programaInfoText, { color: '#4488ff' }]}>
                            ⚡ Semana {semanaActual} de {prog.duracionSemanas}
                          </Text>
                        )
                      }
                      return null
                    })()}
                  </View>

                  {/* Progreso */}
                  <View style={styles.progresoContainer}>
                    <View style={styles.progresoInfo}>
                      <Text style={styles.progresoLabel}>Progreso</Text>
                      <Text style={styles.progresoNum}>{progreso}%</Text>
                    </View>
                    <View style={styles.progresoTrack}>
                      <View style={[styles.progresoFill, { width: `${progreso}%`, backgroundColor: objetivo.color }]} />
                    </View>
                  </View>

                  {/* Controles */}
                  <View style={styles.programaControles}>
                    <Pressable
                      style={({ pressed }) => [styles.controlBtnIcono, pressed && { transform: [{ scale: 0.92 }], opacity: 0.7 }]}
                      onPress={(e) => { e.stopPropagation(); abrirModalEditar(prog) }}
                    >
                      <AntDesign name="edit" size={15} color="#4488ff" />
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [styles.controlBtnTexto, { borderColor: '#00cc4444' }, pressed && { transform: [{ scale: 0.95 }], opacity: 0.7 }]}
                      onPress={(e) => { e.stopPropagation(); cambiarEstado(prog.id, 'completado') }}
                    >
                      <AntDesign name="check" size={13} color="#00cc44" />
                      <Text style={[styles.controlBtnText, { color: '#00cc44' }]}>Completar</Text>
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [styles.controlBtnTexto, { borderColor: '#4488ff44' }, pressed && { transform: [{ scale: 0.95 }], opacity: 0.7 }]}
                      onPress={(e) => { e.stopPropagation(); archivarPrograma(prog.id) }}
                    >
                      <AntDesign name="inbox" size={13} color="#4488ff" />
                      <Text style={[styles.controlBtnText, { color: '#4488ff' }]}>Archivar</Text>
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [styles.controlBtnIcono, { borderColor: '#ff335544' }, pressed && { transform: [{ scale: 0.92 }], opacity: 0.7 }]}
                      onPress={(e) => { e.stopPropagation(); setProgramaAEliminar(prog) }}
                    >
                      <AntDesign name="delete" size={15} color="#ff3355" />
                    </Pressable>
                  </View>
                </TouchableOpacity>
              )
            })}
          </>
        )}

        {/* PROGRAMAS COMPLETADOS */}
        {programasCompletados.length > 0 && (
          <>
            <Text style={[styles.seccionLabel, { marginTop: 24 }]}>COMPLETADOS</Text>
            {programasCompletados.map((prog) => {
              const objetivo = OBJETIVOS.find(o => o.key === prog.objetivo) || OBJETIVOS[0]
              const numBloques = prog.bloques?.length || 0

              return (
                <TouchableOpacity
                  key={prog.id}
                  style={[styles.programaCard, styles.programaCompletado]}
                  onPress={() => navigation.navigate('ListaBloques', { programaId: prog.id, userId })}
                >
                  <View style={styles.programaHeader}>
                    <View style={[styles.objetivoBadge, { borderColor: objetivo.color, opacity: 0.6 }]}>
                      <Text style={styles.objetivoEmoji}>{objetivo.emoji}</Text>
                      <Text style={[styles.objetivoText, { color: objetivo.color }]}>
                        {objetivo.label.toUpperCase()}
                      </Text>
                    </View>
                    <View style={[styles.estadoBadge, styles.estadoBadgeCompletado]}>
                      <AntDesign name="check" size={10} color="#00cc44" />
                      <Text style={styles.estadoTextCompletado}>COMPLETADO</Text>
                    </View>
                  </View>

                  <Text style={styles.programaNombre}>{prog.nombre}</Text>
                  
                  <View style={styles.programaInfo}>
                    <Text style={styles.programaInfoText}>
                      {numBloques} {numBloques === 1 ? 'bloque' : 'bloques'} · {prog.duracionSemanas} semanas
                    </Text>
                  </View>

                  <View style={styles.programaControles}>
                    <TouchableOpacity
                      style={styles.controlBtn}
                      onPress={(e) => {
                        e.stopPropagation()
                        cambiarEstado(prog.id, 'activo')
                      }}
                    >
                      <AntDesign name="reload1" size={14} color="#4488ff" />
                      <Text style={styles.controlBtnText}>Reactivar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.controlBtn}
                      onPress={(e) => {
                        e.stopPropagation()
                        setProgramaAEliminar(prog)
                      }}
                    >
                      <AntDesign name="delete" size={14} color="#ff3355" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              )
            })}
          </>
        )}

        {/* PANEL ARCHIVADOS — animado */}
        {programasArchivados.length > 0 && (
          <Animated.View style={{
            opacity: archivadosAnim,
            transform: [{ translateY: archivadosAnim.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }],
            overflow: 'hidden',
          }}>
            {archivadosAbierto && (
              <>
                <View style={styles.archivadosHeader}>
                  <AntDesign name="inbox" size={14} color="#2a4488" />
                  <Text style={styles.archivadosLabel}>ARCHIVADOS ({programasArchivados.length})</Text>
                </View>
            {programasArchivados.map((prog) => {
              const objetivo = OBJETIVOS.find(o => o.key === prog.objetivo) || OBJETIVOS[0]
              return (
                <View key={prog.id} style={styles.archivadoCard}>
                  <View style={styles.programaHeader}>
                    <View style={[styles.objetivoBadge, { borderColor: '#1a2a5a', opacity: 0.5 }]}>
                      <Text style={styles.objetivoEmoji}>{objetivo.emoji}</Text>
                      <Text style={[styles.objetivoText, { color: '#2a4488' }]}>{objetivo.label.toUpperCase()}</Text>
                    </View>
                    <View style={[styles.estadoBadge, { backgroundColor: '#0a0a1f', borderColor: '#1a2a5a' }]}>
                      <AntDesign name="inbox" size={10} color="#2a4488" />
                      <Text style={[styles.estadoTextCompletado, { color: '#2a4488' }]}>ARCHIVADO</Text>
                    </View>
                  </View>
                  <Text style={[styles.programaNombre, { color: '#2a4488' }]}>{prog.nombre}</Text>
                  {prog.fechaArchivado && (
                    <Text style={styles.archivadoFecha}>
                      Archivado el {new Date(prog.fechaArchivado).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Text>
                  )}
                  <View style={styles.programaControles}>
                    <TouchableOpacity
                      style={styles.controlBtn}
                      onPress={() => cambiarEstado(prog.id, 'activo')}
                    >
                      <AntDesign name="reload1" size={14} color="#4488ff" />
                      <Text style={styles.controlBtnText}>Reactivar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.controlBtn}
                      onPress={() => setProgramaAEliminar(prog)}
                    >
                      <AntDesign name="delete" size={14} color="#ff3355" />
                    </TouchableOpacity>
                  </View>
                </View>
              )
            })}
              </>
            )}
          </Animated.View>
        )}

        {/* EMPTY STATE */}
        {totalProgramas === 0 && (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>Sin programas</Text>
            <Text style={styles.emptySub}>Crea tu primer programa de entrenamiento con periodización profesional</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={abrirModalNuevo}>
              <LinearGradient colors={['#1a3aff', '#0022cc']} style={styles.emptyButtonGradient}>
                <Text style={styles.emptyButtonText}>+ Crear programa</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* MODAL ELIMINAR */}
        <Modal visible={!!programaAEliminar} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.confirmBox}>
              <AntDesign name="folder" size={28} color="#4488ff" style={{ marginBottom: 8 }} />
              <Text style={styles.confirmTitulo}>"{programaAEliminar?.nombre}"</Text>
              <Text style={styles.confirmSub}>¿Qué deseas hacer con este programa?</Text>
              <View style={{ gap: 10, width: '100%', marginTop: 8 }}>
                {/* Archivar */}
                <Pressable
                  style={({ pressed }) => pressed && { opacity: 0.75, transform: [{ scale: 0.97 }] }}
                  onPress={() => { archivarPrograma(programaAEliminar.id); setProgramaAEliminar(null) }}
                >
                  <LinearGradient colors={['#0a1a3f', '#050f2a']} style={[styles.confirmEliminarGradient, { borderWidth: 1, borderColor: '#1a3aff' }]}>
                    <AntDesign name="inbox" size={14} color="#4488ff" />
                    <Text style={[styles.confirmEliminarText, { color: '#4488ff' }]}>Archivar</Text>
                  </LinearGradient>
                </Pressable>
                {/* Nota archivar */}
                <Text style={{ color: '#2a4488', fontSize: 10, textAlign: 'center', marginTop: -4 }}>
                  El historial y progreso se conservan
                </Text>
                {/* Eliminar definitivo */}
                <Pressable
                  style={({ pressed }) => pressed && { opacity: 0.75, transform: [{ scale: 0.97 }] }}
                  onPress={() => { eliminarPrograma(programaAEliminar.id); setProgramaAEliminar(null) }}
                >
                  <LinearGradient colors={['#ff3355', '#cc0022']} style={styles.confirmEliminarGradient}>
                    <AntDesign name="delete" size={14} color="#fff" />
                    <Text style={styles.confirmEliminarText}>Eliminar definitivamente</Text>
                  </LinearGradient>
                </Pressable>
                <Text style={{ color: '#2a4488', fontSize: 10, textAlign: 'center', marginTop: -4 }}>
                  Se borra todo incluyendo historial
                </Text>
              </View>
              <Pressable
                style={({ pressed }) => [{
                  marginTop: 8, padding: 14, borderRadius: 14,
                  borderWidth: 1, borderColor: '#2a3a6a',
                  backgroundColor: '#0a0a1f', alignItems: 'center',
                  width: '100%',
                  opacity: pressed ? 0.7 : 1,
                  transform: pressed ? [{ scale: 0.97 }] : [],
                }]}
                onPress={() => setProgramaAEliminar(null)}
              >
                <Text style={{ color: '#aabbdd', fontWeight: '700', fontSize: 14 }}>Cancelar</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* MODAL CREAR/EDITAR */}
        <Modal visible={modalVisible} transparent animationType="slide">
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
          >
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setModalVisible(false)} />
            <View style={styles.modalBox}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitulo}>
                {programaEditando ? 'Editar Programa' : 'Nuevo Programa'}
              </Text>

              <Text style={styles.modalLabel}>NOMBRE</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: Hipertrofia Q1 2026"
                  placeholderTextColor="#2a2a4a"
                  value={nuevoPrograma.nombre}
                  onChangeText={t => setNuevoPrograma(p => ({ ...p, nombre: t }))}
                />
              </View>

              <Text style={styles.modalLabel}>OBJETIVO</Text>
              <View style={styles.objetivosRow}>
                {OBJETIVOS.map(obj => (
                  <TouchableOpacity
                    key={obj.key}
                    style={[
                      styles.objetivoBtn,
                      nuevoPrograma.objetivo === obj.key && [styles.objetivoBtnActivo, { borderColor: obj.color }]
                    ]}
                    onPress={() => cambiarObjetivo(obj.key)}
                  >
                    <Text style={styles.objetivoBtnEmoji}>{obj.emoji}</Text>
                    <Text style={[
                      styles.objetivoBtnText,
                      nuevoPrograma.objetivo === obj.key && { color: obj.color }
                    ]}>
                      {obj.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalLabel}>FECHA DE INICIO</Text>
              <TouchableOpacity
                style={styles.fechaSelector}
                onPress={() => setMostrarCalendario(true)}
              >
                <Text style={styles.fechaSelectorText}>
                  {(() => {
                    const [año, mes, dia] = nuevoPrograma.fechaInicio.split('-').map(Number)
                    const fecha = new Date(año, mes - 1, dia)
                    return fecha.toLocaleDateString('es-MX', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })
                  })()}
                </Text>
                <AntDesign name="calendar" size={16} color="#4488ff" />
              </TouchableOpacity>

              <Text style={styles.modalLabel}>DURACIÓN (SEMANAS)</Text>
              <View style={styles.duracionRow}>
                <View style={[styles.inputWrapper, { flex: 1, marginBottom: 0 }]}>
                  <TextInput
                    style={styles.input}
                    placeholder="12"
                    placeholderTextColor="#2a2a4a"
                    value={nuevoPrograma.duracionSemanas}
                    onChangeText={t => setNuevoPrograma(p => ({ ...p, duracionSemanas: t }))}
                    keyboardType="number-pad"
                  />
                </View>
                <Text style={styles.duracionInfo}>semanas</Text>
              </View>

              {/* Duración recomendada */}
              {(() => {
                const objetivo = OBJETIVOS.find(o => o.key === nuevoPrograma.objetivo)
                const duracion = parseInt(nuevoPrograma.duracionSemanas)
                if (objetivo && duracion) {
                  if (duracion < objetivo.duracionMin) {
                    return (
                      <View style={styles.alertaBox}>
                        <Text style={styles.alertaText}>
                          ⚠️ Duración corta para {objetivo.label}. Recomendado: {objetivo.duracionMin}-{objetivo.duracionMax} semanas
                        </Text>
                      </View>
                    )
                  } else if (duracion > objetivo.duracionMax) {
                    return (
                      <View style={styles.alertaBox}>
                        <Text style={styles.alertaText}>
                          ⚠️ Duración larga para {objetivo.label}. Recomendado: {objetivo.duracionMin}-{objetivo.duracionMax} semanas
                        </Text>
                      </View>
                    )
                  }
                }
                return null
              })()}

              {/* Fecha de fin calculada */}
              {nuevoPrograma.fechaInicio && nuevoPrograma.duracionSemanas && (
                <View style={styles.fechaFinBox}>
                  <Text style={styles.fechaFinLabel}>Fecha de finalización:</Text>
                  <Text style={styles.fechaFinText}>
                    {(() => {
                      const [año, mes, dia] = nuevoPrograma.fechaInicio.split('-').map(Number)
                      const inicio = new Date(año, mes - 1, dia)
                      const fin = new Date(inicio)
                      fin.setDate(fin.getDate() + (parseInt(nuevoPrograma.duracionSemanas) * 7))
                      return fin.toLocaleDateString('es-MX', { 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric' 
                      })
                    })()}
                  </Text>
                </View>
              )}

              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.modalCancelar} onPress={() => {
                  setModalVisible(false)
                  setProgramaEditando(null)
                }}>
                  <Text style={styles.modalCancelarText}>Cancelar</Text>
                </TouchableOpacity>
                <Pressable style={({ pressed }) => [styles.modalGuardar, pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]} onPress={guardarPrograma}>
                  <LinearGradient colors={['#1a3aff', '#0022cc']} style={styles.modalGuardarGradient}>
                    <Text style={styles.modalGuardarText}>
                      {programaEditando ? 'Guardar' : 'Crear'}
                    </Text>
                  </LinearGradient>
                </Pressable>
              </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Modal Calendario */}
        <Modal visible={mostrarCalendario} transparent animationType="fade">
          <TouchableOpacity
            style={styles.calendarioOverlay}
            activeOpacity={1}
            onPress={() => setMostrarCalendario(false)}
          >
            <View style={styles.calendarioModal}>
              <View style={styles.calendarioHeader}>
                <Text style={styles.calendarioTitulo}>Seleccionar fecha de inicio</Text>
                <TouchableOpacity onPress={() => setMostrarCalendario(false)}>
                  <AntDesign name="close" size={20} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* Calendario simple - mes actual */}
              <CalendarioSelector
                fechaInicio={nuevoPrograma.fechaInicio}
                onSeleccionar={(fecha) => setNuevoPrograma(p => ({ ...p, fechaInicio: fecha }))}
                onCerrar={() => setMostrarCalendario(false)}
                fechasOcupadas={programa.programas
                  .filter(p => p.fechaInicio && p.fechaFin && (!programaEditando || p.id !== programaEditando.id))
                  .map(p => ({
                    inicio: new Date(p.fechaInicio + 'T12:00:00'),
                    fin: new Date(p.fechaFin + 'T12:00:00')
                  }))}
              />
            </View>
          </TouchableOpacity>
        </Modal>

      </ScrollView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { padding: 20, paddingTop: 56, paddingBottom: LAYOUT.bottomTabSpace || 150},
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  saludo: { fontSize: 26, fontWeight: '900', color: '#fff' },
  fecha: { fontSize: 13, color: '#2a4488', marginTop: 2 },
  addButton: { padding: 8, borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 10, backgroundColor: '#05050f' },

  seccionLabel: { fontSize: 10, color: '#2a4488', letterSpacing: 3, fontWeight: '800', marginBottom: 12 },

  // Programa Card
  programaCard: { backgroundColor: '#05050f', borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 16, padding: 18, marginBottom: 12 },
  programaCompletado: { opacity: 0.7 },
  archivadosHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 4, marginTop: 8, marginBottom: 4 },
  archivadosBadge: { position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: 8, backgroundColor: '#2a4488', justifyContent: 'center', alignItems: 'center' },
  archivadosBadgeText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  archivadosLabel: { flex: 1, color: '#2a4488', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  archivadoCard: { backgroundColor: '#05050f', borderWidth: 1, borderColor: '#0a0a2a', borderRadius: 16, padding: 16, marginBottom: 10, opacity: 0.6 },
  archivadoFecha: { color: '#1a2a5a', fontSize: 11, marginTop: 4, marginBottom: 8 },
  programaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  
  objetivoBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  objetivoEmoji: { fontSize: 14 },
  objetivoText: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },

  estadoBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#05051f', borderWidth: 1, borderColor: '#0033ff', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  estadoDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4488ff' },
  estadoText: { fontSize: 9, color: '#4488ff', fontWeight: '700', letterSpacing: 1 },
  estadoBadgeCompletado: { borderColor: '#00cc44' },
  estadoTextCompletado: { color: '#00cc44' },

  programaNombre: { fontSize: 20, fontWeight: '900', color: '#fff', marginBottom: 6 },
  programaInfo: { marginBottom: 12 },
  programaInfoText: { fontSize: 13, color: '#2a4488' },

  // Progreso
  progresoContainer: { marginBottom: 12 },
  progresoInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progresoLabel: { fontSize: 11, color: '#2a4488', fontWeight: '700' },
  progresoNum: { fontSize: 11, color: '#4488ff', fontWeight: '700' },
  progresoTrack: { height: 6, backgroundColor: '#0a0a2a', borderRadius: 3, overflow: 'hidden' },
  progresoFill: { height: '100%', borderRadius: 3 },

  // Controles
  programaControles: { flexDirection: 'row', gap: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#0f1a3a' },
  controlBtnIcono: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: '#0f1a3a', backgroundColor: '#0a0a1f', justifyContent: 'center', alignItems: 'center' },
  controlBtnTexto: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 40, borderRadius: 12, borderWidth: 1, backgroundColor: '#0a0a1f', paddingHorizontal: 8 },
  controlBtnText: { fontSize: 12, fontWeight: '700' },

  // Empty
  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 52, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '900', color: '#fff', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#2a4488', textAlign: 'center', marginBottom: 24, paddingHorizontal: 20, lineHeight: 22 },
  emptyButton: { borderRadius: 14, overflow: 'hidden' },
  emptyButtonGradient: { paddingHorizontal: 24, paddingVertical: 14 },
  emptyButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,2,15,0.92)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#05050f', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderWidth: 1, borderColor: '#0f1a3a' },
  modalTitulo: { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 20 },
  modalLabel: { color: '#2a4488', fontSize: 10, letterSpacing: 2, fontWeight: '700', marginBottom: 8 },
  inputWrapper: { borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 14, backgroundColor: '#0a0a1f', marginBottom: 16 },
  input: { color: '#fff', padding: 14, fontSize: 15 },
  
  objetivosRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  objetivoBtn: { flex: 1, minWidth: '45%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 10, backgroundColor: '#0a0a1f' },
  objetivoBtnActivo: { backgroundColor: '#05051f' },
  objetivoBtnEmoji: { fontSize: 18 },
  objetivoBtnText: { color: '#2a4488', fontWeight: '700', fontSize: 12 },

  duracionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  duracionInfo: { color: '#2a4488', fontSize: 14, fontWeight: '600' },

  alertaBox: { backgroundColor: '#2a1a00', borderWidth: 1, borderColor: '#ff9900', borderRadius: 10, padding: 12, marginBottom: 12 },
  alertaText: { color: '#ff9900', fontSize: 12, lineHeight: 18 },

  fechaFinBox: { backgroundColor: '#0a0a2a', borderRadius: 10, padding: 12, marginBottom: 16 },
  fechaFinLabel: { color: '#2a4488', fontSize: 11, marginBottom: 4 },
  fechaFinText: { color: '#4488ff', fontSize: 14, fontWeight: '700' },

  fechaSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#0f1a3a',
    borderRadius: 14,
    backgroundColor: '#0a0a1f',
    padding: 14,
    marginBottom: 16
  },
  fechaSelectorText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600'
  },

  // Calendario - SOLO este centrado
  calendarioOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  calendarioModal: {
    backgroundColor: '#05050f',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#0033ff',
    padding: 20,
    width: '85%',
    maxWidth: 400,
    shadowColor: '#0033ff',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 10
  },
  calendarioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#0f1a3a'
  },
  calendarioTitulo: {
    fontSize: 16,
    fontWeight: '900',
    color: '#fff'
  },
  calendarioNavegacion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  calendarioBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1a3aff',
    backgroundColor: '#05051f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarioMesAnio: {
    fontSize: 17,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.5,
  },
  calendarioDiasSemana: {
    flexDirection: 'row',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#0f1a3a',
  },
  calendarioDiaSemanaText: {
    flex: 1,
    textAlign: 'center',
    color: '#2a4488',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  calendarioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },
  calendarioDiaVacio: {
    width: '14.28%',
    aspectRatio: 1,
  },
  calendarioDia: {
    width: '13.5%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    margin: '0.35%',
    backgroundColor: '#05050f',
  },
  calendarioDiaHoy: {
    backgroundColor: '#05103a',
    borderWidth: 1.5,
    borderColor: '#1a3aff',
  },
  calendarioDiaSeleccionado: {
    backgroundColor: '#1a3aff',
    shadowColor: '#1a3aff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6,
  },
  calendarioDiaOcupado: {
    backgroundColor: '#1a0008',
    borderWidth: 1,
    borderColor: '#cc0022',
    borderStyle: 'dashed',
  },
  calendarioDiaOcupadoText: {
    color: '#cc0022',
    fontSize: 12,
    fontWeight: '700',
    textDecorationLine: 'line-through',
  },
  calendarioDiaText: {
    color: '#aabbdd',
    fontSize: 13,
    fontWeight: '600',
  },
  calendarioDiaHoyText: {
    color: '#4488ff',
    fontWeight: '900',
    fontSize: 13,
  },
  calendarioDiaSeleccionadoText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 13,
  },

  selectorRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  selectorChip: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#0f1a3a', backgroundColor: '#0a0a1f', alignItems: 'center' },
  selectorChipActivo: { borderColor: '#0033ff', backgroundColor: '#05051f' },
  selectorChipText: { color: '#2a4488', fontWeight: '700', fontSize: 14 },
  selectorChipTextActivo: { color: '#4488ff' },

  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 8, marginBottom: 24 },
  modalCancelar: { flex: 1, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#2a3a6a', backgroundColor: '#0a0a1f', alignItems: 'center' },
  modalCancelarText: { color: '#aabbdd', fontWeight: '700', fontSize: 14 },
  modalGuardar: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  modalGuardarGradient: { padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14 },
  modalGuardarText: { color: '#fff', fontWeight: '700' },

  // Confirm
  confirmBox: { backgroundColor: '#08080f', borderRadius: 22, padding: 24, margin: 24, borderWidth: 1, borderColor: '#ff335566', shadowColor: '#ff3355', shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
  confirmIcon: { fontSize: 40, textAlign: 'center', marginBottom: 12 },
  confirmTitulo: { fontSize: 20, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 8 },
  confirmSub: { fontSize: 13, color: '#2a4488', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  confirmEliminarBtn: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  confirmEliminarGradient: { padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14 },
  confirmEliminarText: { color: '#fff', fontWeight: '700' },
})
