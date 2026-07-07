// ============================================
// RUTINAS SCREENS — Pantallas de rutinas
// Exportadas sin ciclo de dependencias
// app/(app)/rutinas/RutinasScreens.jsx
// ============================================
import { useState, useEffect, useCallback, useRef, useContext, createContext } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import {
  View, Text, StyleSheet, ScrollView,
  TextInput, Alert, Animated, Image, Switch, Linking,
  Keyboard, Platform, Dimensions
} from 'react-native'

const SCREEN_HEIGHT = Dimensions.get('window').height
import { TouchableOpacity, Pressable, TouchableWithoutFeedback } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import ManagedModal from '../../../components/ManagedModal'
import DraggableSheet from '../../../components/DraggableSheet'
import DeleteConfirmModal from '../../../components/DeleteConfirmModal'
import { AntDesign } from '@expo/vector-icons'
import { LAYOUT } from '../../../components/constans'
import { supabase } from '../../../lib/supabase'
import { guardarYSincronizar, cargarPrograma } from '../../../lib/storage'
import RegistrarSeries from './RegistrarSeries'
import CardEntrance from '../../../components/CardEntrance'
import * as Haptics from 'expo-haptics'
import AppleBentoCard from '../../../components/AppleBentoCard'
import { CoachThemeContext, hexToRgb } from '../../../lib/coachTheme'

// Cache a nivel de módulo — sobrevive remounts durante transiciones de navegación
// Clave: userId → programa. Se actualiza cada vez que se carga desde AsyncStorage.
const _programaCache = {}

const DIAS_SEMANA = [
  { key: 0, label: 'LUN' },
  { key: 1, label: 'MAR' },
  { key: 2, label: 'MIÉ' },
  { key: 3, label: 'JUE' },
  { key: 4, label: 'VIE' },
  { key: 5, label: 'SÁB' },
  { key: 6, label: 'DOM' },
]
const GRUPOS_MUSCULARES = [
  'Pecho', 'Espalda', 'Hombros', 'Bíceps', 'Tríceps',
  'Cuádriceps', 'Femorales', 'Glúteos', 'Pantorrillas',
  'Abdomen', 'Trapecio', 'Antebrazos', 'Movilidad', 'Pliometría', 'Cardio'
]
const TIPOS_BLOQUE = ['Adaptativo', 'Acumulación', 'Intensificación', 'Peaking', 'Descarga']
const ETIQUETAS_DIA = ['PUSH','PULL','LEGS','FULLBODY','UPPER','LOWER','CARDIO','ARMS','CORE']
const coloresTipo = {
  'Adaptativo': '#4499ff', 'Acumulación': '#55aaff',
  'Intensificación': '#ff8833', 'Peaking': '#ff3355', 'Descarga': '#00cc66',
}
const UserContext    = createContext({ userId: null })
const RefreshContext = createContext({ triggerRefresh: () => {} })

const RECOMENDACIONES = {
  'Pecho':       { mev: 10, mrv: 20, descripcion: 'Pecho' },
  'Espalda':     { mev: 10, mrv: 25, descripcion: 'Espalda' },
  'Hombros':     { mev: 8,  mrv: 20, descripcion: 'Hombros' },
  'Bíceps':      { mev: 8,  mrv: 20, descripcion: 'Bíceps' },
  'Tríceps':     { mev: 8,  mrv: 20, descripcion: 'Tríceps' },
  'Cuádriceps':  { mev: 8,  mrv: 20, descripcion: 'Cuádriceps' },
  'Femorales':   { mev: 6,  mrv: 20, descripcion: 'Femorales' },
  'Glúteos':     { mev: 4,  mrv: 16, descripcion: 'Glúteos' },
  'Pantorrillas':{ mev: 8,  mrv: 16, descripcion: 'Pantorrillas' },
  'Abdomen':     { mev: 6,  mrv: 16, descripcion: 'Abdomen' },
  'Trapecio':    { mev: 8,  mrv: 20, descripcion: 'Trapecio' },
  'Antebrazos':  { mev: 4,  mrv: 14, descripcion: 'Antebrazos' },
}

function VolumenSemanal({ bloque, dias }) {
  const { accentColor, gradColors } = useContext(CoachThemeContext)
  const acRgb = hexToRgb(accentColor)
  const styles = createStyles(accentColor, acRgb)
  const [grupoInfo, setGrupoInfo] = useState(null)

  const volumenPorGrupo = {}
  const diasKey = `dias_${bloque.id}`
  const diasActivos = dias[diasKey] || []

  DIAS_SEMANA.forEach(dia => {
    if (!diasActivos.includes(dia.key)) return
    const key = `ejercicios_${bloque.id}_${dia.key}`
    const ejercicios = dias[key] || []
    ejercicios.forEach(ej => {
      if (!ej.grupo) return
      const series = parseInt(ej.series) || 0
      volumenPorGrupo[ej.grupo] = (volumenPorGrupo[ej.grupo] || 0) + series
    })
  })

  const grupos = Object.entries(volumenPorGrupo).sort((a, b) => b[1] - a[1])

  if (grupos.length === 0) return (
    <View style={styles.volumenBox}>
      <View style={{ padding: 12 }}>
        <Text style={styles.volumenVacio}>Agrega ejercicios</Text>
      </View>
    </View>
  )

  return (
    <View style={styles.volumenBox}>
      <View style={styles.volumenContent}>
        {grupos.map(([grupo, series]) => {
          const rec = RECOMENDACIONES[grupo]
          const pct = Math.min((series / (rec?.mrv || 20)) * 100, 100)
          return (
            <View key={grupo} style={styles.volumenRow}>
              <Text style={styles.volumenGrupo}>{grupo}</Text>
              <View style={styles.volumenBarTrack}>
                <View style={[styles.volumenBarFill, { width: `${pct}%` }]} />
              </View>
              <Text style={styles.volumenSeries}>{series}</Text>
              <TouchableOpacity
                style={styles.volumenInfoBtn}
                onPress={() => setGrupoInfo(grupoInfo === grupo ? null : grupo)}
              >
                <Text style={styles.volumenInfoIcon}>i</Text>
              </TouchableOpacity>
              {grupoInfo === grupo && rec && (
                <View style={styles.volumenTooltip}>
                  <Text style={styles.volumenTooltipTitulo}>{rec.descripcion}</Text>
                  <Text style={styles.volumenTooltipText}>
                    MEV: <Text style={styles.volumenTooltipNum}>{rec.mev} series</Text>
                  </Text>
                  <Text style={styles.volumenTooltipText}>
                    MRV: <Text style={styles.volumenTooltipNum}>{rec.mrv} series</Text>
                  </Text>
                  <Text style={styles.volumenTooltipText}>
                    Tu volumen: <Text style={styles.volumenTooltipNum}>{series} series</Text>
                  </Text>
                  <TouchableOpacity onPress={() => setGrupoInfo(null)} style={styles.volumenTooltipClose}>
                    <Text style={styles.volumenTooltipCloseText}>Cerrar</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )
        })}
      </View>
    </View>
  )
}

export function ListaBloques({ route, navigation }) {
  const { accentColor, gradColors } = useContext(CoachThemeContext)
  const acRgb = hexToRgb(accentColor)
  const styles = createStyles(accentColor, acRgb)
  // Guardamos params en ref para que no cambien si route.params muta durante la animación de cierre
  const _params = useRef(route.params)
  const { programaId, userId } = _params.current
  const [programa, setPrograma] = useState(() => _programaCache[userId] || { programas: [], dias: {} })
  const [modalVisible, setModalVisible] = useState(false)
  const [bloqueEditando, setBloqueEditando] = useState(null)
  const [kbHeight, setKbHeight] = useState(0)

  useEffect(() => {
    if (!modalVisible) { setKbHeight(0); return }
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'
    const subShow = Keyboard.addListener(showEvent, e => setKbHeight(e.endCoordinates.height))
    const subHide = Keyboard.addListener(hideEvent, () => setKbHeight(0))
    return () => { subShow.remove(); subHide.remove() }
  }, [modalVisible])
  const [nuevoBloque, setNuevoBloque] = useState({ nombre: '', tipo: 'Adaptativo', semanas: '4' })
  const [bloqueAEliminar, setBloqueAEliminar] = useState(null)
  const [volumenBloqueId, setVolumenBloqueId] = useState(null)
  const [alertaMensaje, setAlertaMensaje] = useState(null)
  
  // Recargar programa cada vez que la pantalla recibe foco
  useFocusEffect(
    useCallback(() => {
      async function loadPrograma() {
        const local = await cargarPrograma(userId)
        if (local) {
          // Asegurar estructura válida
          if (!local.programas) local.programas = []
          if (!local.dias) local.dias = {}
          _programaCache[userId] = local
          setPrograma(local)
        }
      }
      loadPrograma()
    }, [userId])
  )

  // Obtener programa actual
  const programaActual = programa.programas?.find(p => p.id === programaId)
  if (!programaActual) {
    return (
      <LinearGradient colors={gradColors} style={styles.gradient}>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>Programa no encontrado</Text>
        </View>
      </LinearGradient>
    )
  }

  const bloques = programaActual.bloques || []

  // Calcular semanas usadas y disponibles
  const semanasUsadas = bloques.reduce((acc, b) => acc + (b.semanas || 0), 0)
  const semanasDisponibles = programaActual.duracionSemanas - semanasUsadas
  const porcentajeUsado = Math.round((semanasUsadas / programaActual.duracionSemanas) * 100)

  function abrirModalNuevo() {
    // Verificar si el programa ya está completo
    if (semanasDisponibles === 0) {
      setAlertaMensaje('El programa ya está completo. Todas las semanas están asignadas.')
      return
    }
    
    setBloqueEditando(null)
    setNuevoBloque({ nombre: '', tipo: 'Adaptativo', semanas: '4' })
    setModalVisible(true)
  }

  function abrirModalEditar(bloque) {
    setBloqueEditando(bloque)
    setNuevoBloque({
      nombre: bloque.nombre,
      tipo: bloque.tipo,
      semanas: bloque.semanas.toString()
    })
    setModalVisible(true)
  }

  async function guardarBloque() {
    if (!nuevoBloque.nombre.trim()) return

    const semanasBloque = parseInt(nuevoBloque.semanas) || 4

    // Validar semanas disponibles (solo al crear nuevo)
    if (!bloqueEditando) {
      if (semanasBloque > semanasDisponibles) {
        setAlertaMensaje(`Solo quedan ${semanasDisponibles} semana(s) disponibles en este programa`)
        return
      }
    } else {
      // Al editar, validar contra semanas disponibles + semanas del bloque actual
      const semanasBloqueActual = bloques.find(b => b.id === bloqueEditando.id)?.semanas || 0
      const semanasDisponiblesParaEdicion = semanasDisponibles + semanasBloqueActual
      if (semanasBloque > semanasDisponiblesParaEdicion) {
        setAlertaMensaje(`Solo hay ${semanasDisponiblesParaEdicion} semana(s) disponibles`)
        return
      }
    }

    let nuevoBloques

    if (bloqueEditando) {
      nuevoBloques = bloques.map(b =>
        b.id === bloqueEditando.id
          ? {
              ...b,
              nombre: nuevoBloque.nombre,
              tipo: nuevoBloque.tipo,
              semanas: semanasBloque,
            }
          : b
      )
    } else {
      const nuevo = {
        id: `bloque_${Date.now()}`,
        nombre: nuevoBloque.nombre,
        tipo: nuevoBloque.tipo,
        semanas: semanasBloque,
        completado: false
      }
      nuevoBloques = [...bloques, nuevo]
    }

    // Actualizar programa con nuevos bloques
    const nuevosProgramas = programa.programas.map(p =>
      p.id === programaId ? { ...p, bloques: nuevoBloques } : p
    )

    const nuevoPrograma = { ...programa, programas: nuevosProgramas }
    _programaCache[userId] = nuevoPrograma
    setPrograma(nuevoPrograma)

    // Cerrar y resetear inmediatamente
    setModalVisible(false)
    setBloqueEditando(null)
    setNuevoBloque({ nombre: '', tipo: 'Adaptativo', semanas: '4' })

    // Guardar en segundo plano
    await guardarYSincronizar(userId, nuevoPrograma)
  }

  async function eliminarBloque(id) {
    // Limpiar historial de ejercicios del bloque
    const diasALimpiar = {}
    ;[0,1,2,3,4,5,6].forEach(diaKey => {
      const k = `ejercicios_${id}_${diaKey}`
      if (programa.dias[k]) diasALimpiar[k] = undefined
    })
    diasALimpiar[`dias_${id}`] = undefined
    diasALimpiar[`etiquetas_${id}`] = undefined
    const diasLimpios = Object.fromEntries(
      Object.entries({ ...programa.dias, ...diasALimpiar }).filter(([, v]) => v !== undefined)
    )
    const nuevosBloques = bloques.filter(b => b.id !== id)
    const nuevosProgramas = programa.programas.map(p =>
      p.id === programaId ? { ...p, bloques: nuevosBloques } : p
    )
    const nuevoPrograma = { ...programa, programas: nuevosProgramas, dias: diasLimpios }
    _programaCache[userId] = nuevoPrograma
    setPrograma(nuevoPrograma)
    await guardarYSincronizar(userId, nuevoPrograma)
  }

  async function reordenarBloques(index, direccion) {
    const nuevos = [...bloques]
    if (direccion === 'arriba' && index === 0) return
    if (direccion === 'abajo' && index === bloques.length - 1) return

    const targetIndex = direccion === 'arriba' ? index - 1 : index + 1
    ;[nuevos[index], nuevos[targetIndex]] = [nuevos[targetIndex], nuevos[index]]

    const nuevosProgramas = programa.programas.map(p =>
      p.id === programaId ? { ...p, bloques: nuevos } : p
    )
    const nuevoPrograma = { ...programa, programas: nuevosProgramas }
    _programaCache[userId] = nuevoPrograma
    setPrograma(nuevoPrograma)
    await guardarYSincronizar(userId, nuevoPrograma)
  }

  return (
    <LinearGradient colors={gradColors} style={styles.gradient}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Programas</Text>
        </TouchableOpacity>

        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.programaNombreRow}>
              <Text style={styles.saludo}>{programaActual.nombre}</Text>
              {semanasDisponibles === 0 && (
                <View style={[styles.completoBadge, { backgroundColor: 'rgba(0,204,68,0.1)', borderColor: 'rgba(0,204,68,0.3)' }]}>
                  <AntDesign name="check-circle" size={10} color="#00cc44" />
                  <Text style={[styles.completoBadgeText, { color: '#00cc44' }]}>{semanasUsadas}/{programaActual.duracionSemanas} SEM</Text>
                </View>
              )}
            </View>
            <Text style={styles.fecha}>
              {semanasUsadas}/{programaActual.duracionSemanas} semanas asignadas
            </Text>
          </View>
          <TouchableOpacity 
            style={[styles.addButton, semanasDisponibles === 0 && { opacity: 0.3 }]} 
            onPress={abrirModalNuevo}
            disabled={semanasDisponibles === 0}
          >
            <AntDesign name="plus" size={22} color={semanasDisponibles === 0 ? '#8E8E93' : accentColor} />
          </TouchableOpacity>
        </View>

        {/* Barra de progreso — solo si NO está completo */}
        {semanasDisponibles !== 0 && (
          <View style={{ marginBottom: 24, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#8E8E93', letterSpacing: 1 }}>
                {semanasUsadas === 0
                  ? `${programaActual.duracionSemanas} SEMANAS POR ASIGNAR`
                  : `FALTAN ${semanasDisponibles} SEMANA(S)`}
              </Text>
              <Text style={{ fontSize: 11, fontWeight: '900', color: accentColor }}>{porcentajeUsado}%</Text>
            </View>
            <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
              <View style={{ height: '100%', width: `${porcentajeUsado}%`, backgroundColor: accentColor, borderRadius: 3 }} />
            </View>
          </View>
        )}

        {bloques.length === 0 ? (
          <View style={styles.emptyBox}>
            <AntDesign name="code-sandbox" size={48} color="rgba(255,255,255,0.1)" />
            <Text style={styles.emptyTitle}>Sin bloques</Text>
            <Text style={styles.emptySub}>
              Agrega bloques para estructurar tu programa de {programaActual.duracionSemanas} semanas
            </Text>
            <TouchableOpacity onPress={abrirModalNuevo} style={{ borderRadius: 16, overflow: 'hidden' }}>
              <LinearGradient colors={[accentColor, accentColor]} style={{ paddingHorizontal: 24, paddingVertical: 14 }}>
                <Text style={{ color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 1 }}>CREAR BLOQUE</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {bloques.map((bloque, index) => {
              const fechaBase = programaActual?.fechaInicio
                ? new Date(programaActual.fechaInicio + 'T12:00:00')
                : new Date()
              let cursor = new Date(fechaBase)
              for (let i = 0; i < index; i++) {
                cursor.setDate(cursor.getDate() + (bloques[i].semanas || 0) * 7)
              }
              const inicio = new Date(cursor)
              const fin = new Date(cursor)
              fin.setDate(fin.getDate() + (bloque.semanas || 0) * 7 - 1)
              const fmt = d => d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
              return (
                <View key={bloque.id} style={styles.bloqueCard}>
                  {/* FILA SUPERIOR */}
                  <View style={styles.bloqueTopRow}>
                    <View style={[styles.tipoBadge, { backgroundColor: coloresTipo[bloque.tipo] + '15', borderColor: coloresTipo[bloque.tipo] + '44' }]}>
                      <Text style={[styles.tipoText, { color: coloresTipo[bloque.tipo] }]}>{bloque.tipo.toUpperCase()}</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.volumenHeaderInline, { backgroundColor: 'rgba(255,102,0,0.1)', borderColor: 'rgba(255,102,0,0.2)' }]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                        setVolumenBloqueId(volumenBloqueId === bloque.id ? null : bloque.id)
                      }}
                    >
                      <Text style={[styles.volumenTituloInline, { color: '#ff6600' }]}>VOLUMEN</Text>
                      <AntDesign name={volumenBloqueId === bloque.id ? 'up' : 'down'} size={10} color="#ff6600" />
                    </TouchableOpacity>
                  </View>

                  {/* NOMBRE */}
                  <TouchableOpacity onPress={() => navigation.navigate('DiasBloque', { bloqueId: bloque.id, userId })} activeOpacity={0.7}>
                    <Text style={styles.bloqueNombre}>{bloque.nombre}</Text>
                    <Text style={styles.bloqueSub}>
                      {bloque.semanas} {bloque.semanas === 1 ? 'semana' : 'semanas'}  ·  {fmt(inicio)} – {fmt(fin)}
                    </Text>
                  </TouchableOpacity>

                  {/* VOLUMEN SEMANAL */}
                  {volumenBloqueId === bloque.id && (
                    <VolumenSemanal bloque={bloque} dias={programa.dias} />
                  )}

                  {/* CONTROLES */}
                  <View style={styles.bloqueControles}>
                    <Pressable style={({ pressed }) => [styles.controlBtn, pressed && { opacity: 0.7 }]} onPress={() => reordenarBloques(index, 'arriba')}>
                      <AntDesign name="up" size={18} color={index === 0 ? 'rgba(255,255,255,0.05)' : accentColor} />
                    </Pressable>
                    <Pressable style={({ pressed }) => [styles.controlBtn, pressed && { opacity: 0.7 }]} onPress={() => reordenarBloques(index, 'abajo')}>
                      <AntDesign name="down" size={18} color={index === bloques.length - 1 ? 'rgba(255,255,255,0.05)' : accentColor} />
                    </Pressable>
                    <Pressable style={({ pressed }) => [styles.controlBtn, pressed && { opacity: 0.7 }]} onPress={() => setBloqueAEliminar(bloque)}>
                      <AntDesign name="delete" size={18} color="#ff3355" />
                    </Pressable>
                    <Pressable style={({ pressed }) => [styles.controlBtn, pressed && { opacity: 0.7 }]} onPress={() => abrirModalEditar(bloque)}>
                      <AntDesign name="edit" size={18} color={accentColor} />
                    </Pressable>
                  </View>
                </View>
              )
            })}

            {/* Advertencia si programa incompleto */}
            {bloques.length > 0 && semanasDisponibles > 0 && (
              <View style={styles.advertenciaBox}>
                <AntDesign name="warning" size={18} color="#ff9900" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.advertenciaTitulo}>Programa incompleto</Text>
                  <Text style={styles.advertenciaSub}>
                    Faltan {semanasDisponibles} semana(s) por asignar para completar el plan.
                  </Text>
                </View>
              </View>
            )}
          </>
        )}

        {/* Modal nuevo/editar bloque */}
        <ManagedModal visible={modalVisible} transparent animationType="none">
          <DraggableSheet
            onClose={() => { setModalVisible(false); setBloqueEditando(null) }}
            scrollable={true}
            gradientColors={gradColors}
            containerStyle={{ borderColor: `rgba(${acRgb},0.22)`, marginBottom: kbHeight, maxHeight: kbHeight > 0 ? SCREEN_HEIGHT - kbHeight - 40 : '92%' }}
            header={
              <View style={{ marginBottom: 20 }}>
                <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: -0.3 }}>
                  {bloqueEditando ? 'Editar Bloque' : 'Nuevo Bloque'}
                </Text>
              </View>
            }
          >
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={[styles.modalLabel, { color: `rgba(${acRgb},0.6)` }]}>NOMBRE</Text>
              <View style={[styles.inputWrapper, { borderColor: `rgba(${acRgb},0.18)`, backgroundColor: `rgba(${acRgb},0.04)` }]}>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: Bloque 1"
                  placeholderTextColor={`rgba(${acRgb},0.25)`}
                  value={nuevoBloque.nombre}
                  onChangeText={t => setNuevoBloque(p => ({ ...p, nombre: t }))}
                />
              </View>

              <Text style={[styles.modalLabel, { color: `rgba(${acRgb},0.6)` }]}>TIPO</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {TIPOS_BLOQUE.map(tipo => (
                  <TouchableOpacity
                    key={tipo}
                    style={[styles.tipoBtn, nuevoBloque.tipo === tipo && styles.tipoBtnActivo]}
                    onPress={() => setNuevoBloque(p => ({ ...p, tipo }))}
                  >
                    <Text style={[styles.tipoBtnText, nuevoBloque.tipo === tipo && styles.tipoBtnTextActivo]}>{tipo}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.modalLabel, { color: `rgba(${acRgb},0.6)` }]}>SEMANAS</Text>
              <View style={styles.selectorRow}>
                {['1', '2', '3', '4', '5', '6'].map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.selectorChip, nuevoBloque.semanas === s && styles.selectorChipActivo]}
                    onPress={() => setNuevoBloque(p => ({ ...p, semanas: s }))}
                  >
                    <Text style={[styles.selectorChipText, nuevoBloque.semanas === s && styles.selectorChipTextActivo]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalButtons}>
                <Pressable
                  style={({ pressed }) => [styles.modalCancelar, { borderColor: `rgba(${acRgb},0.12)`, backgroundColor: `rgba(${acRgb},0.04)` }, pressed && { opacity: 0.7 }]}
                  onPress={() => { setModalVisible(false); setBloqueEditando(null) }}
                >
                  <Text style={[styles.modalCancelarText, { color: `rgba(${acRgb},0.6)` }]}>Cancelar</Text>
                </Pressable>
                <Pressable style={({ pressed }) => [styles.modalGuardar, pressed && { opacity: 0.8 }]} onPress={guardarBloque}>
                  <LinearGradient colors={[accentColor, accentColor + 'cc']} style={styles.modalGuardarGradient}>
                    <Text style={styles.modalGuardarText}>
                      {bloqueEditando ? 'Guardar' : 'Crear'}
                    </Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </ScrollView>
          </DraggableSheet>
        </ManagedModal>

      </ScrollView>

      {/* Modal alerta estilizada */}
      <ManagedModal visible={!!alertaMensaje} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { alignItems: 'center', padding: 28 }]}>
            <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(255,153,0,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <AntDesign name="warning" size={28} color="#ff9900" />
            </View>
            <Text style={[styles.modalTitulo, { textAlign: 'center' }]}>Atención</Text>
            <Text style={[styles.modalSub, { textAlign: 'center', marginBottom: 32 }]}>{alertaMensaje}</Text>
            <TouchableOpacity 
              style={{ width: '100%', borderRadius: 16, overflow: 'hidden' }} 
              onPress={() => setAlertaMensaje(null)}
            >
              <LinearGradient colors={['#ff9900', '#ff6600']} style={{ paddingVertical: 16, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '900', fontSize: 15, letterSpacing: 1 }}>ENTENDIDO</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </ManagedModal>

      {/* Modal confirmación eliminar */}
      <DeleteConfirmModal
        visible={!!bloqueAEliminar}
        onCancel={() => setBloqueAEliminar(null)}
        onConfirm={() => { eliminarBloque(bloqueAEliminar.id); setBloqueAEliminar(null) }}
        title="¿Eliminar bloque?"
        subtitle={`"${bloqueAEliminar?.nombre}"`}
        warning="Todos sus ejercicios serán eliminados permanentemente."
      />

    </LinearGradient>
  )
}

// ============================================
// PANTALLA: DÍAS DEL BLOQUE
// ============================================

export function DiasBloque({ route, navigation }) {
  const { accentColor, gradColors } = useContext(CoachThemeContext)
  const acRgb = hexToRgb(accentColor)
  const styles = createStyles(accentColor, acRgb)
  const _params = useRef(route.params)
  const { bloqueId, userId } = _params.current
  const [programa, setPrograma] = useState(() => _programaCache[userId] || { programas: [], dias: {} })
  const [editandoDias, setEditandoDias] = useState(false)
  const [dropdownAbierto, setDropdownAbierto] = useState(null)
  const { triggerRefresh } = useContext(RefreshContext) || {}

  // Recargar programa cada vez que la pantalla recibe foco
  useFocusEffect(
    useCallback(() => {
      async function loadPrograma() {
        const local = await cargarPrograma(userId)
        if (local) {
          // Asegurar estructura válida
          if (!local.programas) local.programas = []
          if (!local.dias) local.dias = {}
          _programaCache[userId] = local
          setPrograma(local)
        }
      }
      loadPrograma()
    }, [userId])
  )

  const bloque = programa.programas?.flatMap(p => p.bloques || []).find(b => b.id === bloqueId)
  if (!bloque) return <View style={{ flex: 1, backgroundColor: 'transparent' }} />

  const diasKey = `dias_${bloque.id}`
  const etiquetasKey = `etiquetas_${bloque.id}`
  const diasActivos = programa.dias[diasKey] || [0, 1, 3, 4, 5]
  const etiquetas = programa.dias[etiquetasKey] || {}

  async function toggleDia(key) {
    const nuevoDias = diasActivos.includes(key)
      ? diasActivos.filter(d => d !== key)
      : [...diasActivos, key].sort((a, b) => a - b)

    const nuevoPrograma = {
      ...programa,
      dias: { ...programa.dias, [diasKey]: nuevoDias }
    }
    
    _programaCache[userId] = nuevoPrograma
    setPrograma(nuevoPrograma)
    await guardarYSincronizar(userId, nuevoPrograma)
    triggerRefresh?.()
  }

  async function guardarEtiqueta(diaKey, etiqueta) {
    const nuevasEtiquetas = {
      ...etiquetas,
      [diaKey]: etiqueta.trim().toUpperCase()
    }

    const nuevoPrograma = {
      ...programa,
      dias: { ...programa.dias, [etiquetasKey]: nuevasEtiquetas }
    }

    _programaCache[userId] = nuevoPrograma
    setPrograma(nuevoPrograma)
    await guardarYSincronizar(userId, nuevoPrograma)
    triggerRefresh?.()
  }

  const nombresDia = {
    0: 'Lunes', 1: 'Martes', 2: 'Miércoles',
    3: 'Jueves', 4: 'Viernes', 5: 'Sábado', 6: 'Domingo'
  }

  return (
    <LinearGradient colors={gradColors} style={styles.gradient}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Bloques</Text>
        </TouchableOpacity>

        <View style={styles.headerRow}>
          <View>
            <Text style={styles.saludo}>{bloque.nombre}</Text>
            <Text style={styles.fecha}>{bloque.tipo} · {bloque.semanas} {bloque.semanas === 1 ? 'semana' : 'semanas'}</Text>
          </View>
          <TouchableOpacity
            style={[styles.editDiasBtn, editandoDias && styles.editDiasBtnActivo]}
            onPress={() => setEditandoDias(!editandoDias)}
          >
            <Text style={[styles.editDiasBtnText, editandoDias && styles.editDiasBtnTextActivo]}>
              {editandoDias ? 'Listo ✓' : 'Editar días'}
            </Text>
          </TouchableOpacity>
        </View>

        {editandoDias && (
          <View style={styles.diasEditorBox}>
            <Text style={styles.modalLabel}>SELECCIONA TUS DÍAS DE ENTRENAMIENTO</Text>
            <View style={styles.diasRow}>
              {DIAS_SEMANA.map(d => (
                <TouchableOpacity
                  key={d.key}
                  style={[styles.diaChip, diasActivos.includes(d.key) && styles.diaChipActivo]}
                  onPress={() => toggleDia(d.key)}
                >
                  <Text style={[styles.diaChipText, diasActivos.includes(d.key) && styles.diaChipTextActivo]}>
                    {d.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {DIAS_SEMANA.map(dia => {
          const activo = diasActivos.includes(dia.key)
          const ejerciciosKey = `ejercicios_${bloque.id}_${dia.key}`
          const numEjercicios = programa.dias[ejerciciosKey]?.length || 0
          const etiqueta = etiquetas[dia.key] || ''

          return (
            <View key={dia.key} style={styles.diaCardWrapper}>
              <TouchableOpacity
                style={[styles.diaCard, !activo && styles.diaDescanso]}
                onPress={() => {
                  if (activo && !editandoDias && !dropdownAbierto) {
                    navigation.navigate('Ejercicios', { 
                      bloqueId: bloque.id,
                      diaKey: dia.key,
                      userId 
                    })
                  }
                }}
                disabled={!activo && !editandoDias}
                activeOpacity={0.7}
              >
                <View style={[styles.diaLabelBox, activo && styles.diaLabelBoxActivo]}>
                  <Text style={[styles.diaLabel, activo && styles.diaLabelActivo]}>{dia.label}</Text>
                </View>
                <View style={styles.diaInfo}>
                  <Text style={styles.diaNombre}>{activo ? nombresDia[dia.key] : 'Descanso'}</Text>
                  
                  {/* Selector de etiqueta */}
                  {activo && (
                    <View style={styles.etiquetaContainer}>
                      <TouchableOpacity
                        style={[styles.etiquetaSelector, { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                          setDropdownAbierto(dropdownAbierto === dia.key ? null : dia.key)
                        }}
                      >
                        <Text style={[styles.etiquetaText, !etiqueta && { color: '#8E8E93', fontWeight: '500' }]}>
                          {etiqueta || 'Asignar Enfoque'}
                        </Text>
                        <AntDesign name={dropdownAbierto === dia.key ? 'up' : 'down'} size={10} color={accentColor} />
                      </TouchableOpacity>
                    </View>
                  )}
                  
                  <Text style={styles.diaGrupos}>
                    {activo
                      ? numEjercicios > 0
                        ? `${numEjercicios} ejercicio${numEjercicios > 1 ? 's' : ''}`
                        : 'Sin ejercicios — toca para agregar'
                      : 'Día de recuperación'}
                  </Text>
                </View>
                {activo && !dropdownAbierto && <AntDesign name="right" size={14} color="rgba(255,255,255,0.1)" />}
              </TouchableOpacity>
            </View>
          )
        })}


      </ScrollView>



      {/* Modal selector de etiqueta */}
      <ManagedModal visible={dropdownAbierto !== null} transparent animationType="fade" onRequestClose={() => setDropdownAbierto(null)}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => setDropdownAbierto(null)}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
          <LinearGradient colors={gradColors} style={[styles.modalBox, { borderColor: `rgba(${acRgb},0.2)` }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={[styles.modalTitulo, { fontSize: 18 }]}>Enfoque del Día</Text>
              <TouchableOpacity onPress={() => setDropdownAbierto(null)} style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' }}>
                <AntDesign name="close" size={16} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 350 }} showsVerticalScrollIndicator={false}>
              {dropdownAbierto !== null && ETIQUETAS_DIA.map((etiq) => {
                const activo = etiquetas[dropdownAbierto] === etiq
                return (
                  <TouchableOpacity
                    key={etiq}
                    style={[styles.etiquetaModalItem, activo && styles.etiquetaModalItemActivo]}
                    onPress={() => { guardarEtiqueta(dropdownAbierto, etiq); setDropdownAbierto(null) }}
                  >
                    <Text style={[styles.etiquetaModalItemText, activo && styles.etiquetaModalItemTextActivo]}>{etiq}</Text>
                    {activo && <AntDesign name="check" size={16} color={accentColor} />}
                  </TouchableOpacity>
                )
              })}

              {dropdownAbierto !== null && etiquetas[dropdownAbierto] && (
                <TouchableOpacity
                  style={styles.etiquetaModalItemLimpiar}
                  onPress={() => { guardarEtiqueta(dropdownAbierto, ''); setDropdownAbierto(null) }}
                >
                  <Text style={styles.etiquetaModalItemLimpiarText}>Limpiar etiqueta</Text>
                  <AntDesign name="delete" size={14} color="#ff3355" />
                </TouchableOpacity>
              )}
            </ScrollView>
          </LinearGradient>
        </View>
      </ManagedModal>
    </LinearGradient>
  )
}

// ============================================
// PANTALLA: EJERCICIOS DEL DÍA
// ============================================

export function EjerciciosDelDia({ route, navigation }) {
  const { accentColor, gradColors } = useContext(CoachThemeContext)
  const acRgb = hexToRgb(accentColor)
  const styles = createStyles(accentColor, acRgb)
  const _params = useRef(route.params)
  const { bloqueId, diaKey, userId } = _params.current
  const [programa, setPrograma] = useState(() => _programaCache[userId] || { programas: [], dias: {} })
  const [modalVisible, setModalVisible] = useState(false)
  const [grupoVisible, setGrupoVisible] = useState(false)
  const [modalGrupoVisible, setModalGrupoVisible] = useState(false)
  const [ejercicioEditando, setEjercicioEditando] = useState(null)
  const [ejercicioRegistrando, setEjercicioRegistrando] = useState(null)
  const [modoEliminar, setModoEliminar] = useState(false)
  const [seleccionados, setSeleccionados] = useState([])
  const [confirmarEliminarEjs, setConfirmarEliminarEjs] = useState(false)
  const [nuevoEjercicio, setNuevoEjercicio] = useState({
    nombre: '', grupo: '', series: '3', repsMin: '8', repsMax: '12', rir: '2', peso: '', videoUrl: ''
  })

  const [kbHeight, setKbHeight] = useState(0)
  const [toastVisible, setToastVisible] = useState(false)
  const toastAnim = useRef(new Animated.Value(-420)).current

  function mostrarToast() {
    setToastVisible(true)
    toastAnim.setValue(-420)
    Animated.spring(toastAnim, { toValue: 0, useNativeDriver: true, tension: 70, friction: 11 }).start()
    setTimeout(() => {
      Animated.timing(toastAnim, { toValue: 420, duration: 320, useNativeDriver: true }).start(() => setToastVisible(false))
    }, 2600)
  }

  // Resetear estado al abrir nuevo ejercicio
  useEffect(() => {
    if (modalVisible && !ejercicioEditando) {
      setNuevoEjercicio({ nombre: '', grupo: '', series: '3', repsMin: '8', repsMax: '12', rir: '2', peso: '', videoUrl: '' })
    }
  }, [modalVisible, ejercicioEditando])

  useEffect(() => {
    if (!modalVisible) { setKbHeight(0); return }
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'
    const subShow = Keyboard.addListener(showEvent, e => setKbHeight(e.endCoordinates.height))
    const subHide = Keyboard.addListener(hideEvent, () => setKbHeight(0))
    return () => { subShow.remove(); subHide.remove() }
  }, [modalVisible])

  // Recargar programa cada vez que la pantalla recibe foco
  useFocusEffect(
    useCallback(() => {
      async function loadPrograma() {
        const local = await cargarPrograma(userId)
        if (local) {
          // Asegurar estructura válida
          if (!local.programas) local.programas = []
          if (!local.dias) local.dias = {}
          _programaCache[userId] = local
          setPrograma(local)
        }
      }
      loadPrograma()
    }, [userId])
  )

  const bloque = programa.programas?.flatMap(p => p.bloques || []).find(b => b.id === bloqueId)
  if (!bloque) return <View style={{ flex: 1, backgroundColor: '#000000' }} />

  const ejerciciosKey = `ejercicios_${bloqueId}_${diaKey}`
  const ejercicios = programa.dias[ejerciciosKey] || []

  async function actualizarEjercicios(nuevosEjercicios) {
    const nuevoPrograma = {
      ...programa,
      dias: { ...programa.dias, [ejerciciosKey]: nuevosEjercicios }
    }
    
    _programaCache[userId] = nuevoPrograma
    setPrograma(nuevoPrograma)
    await guardarYSincronizar(userId, nuevoPrograma)
  }

  async function agregarEjercicio() {
    if (!nuevoEjercicio.nombre.trim() || !nuevoEjercicio.grupo) return

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    if (ejercicioEditando) {
      // EDITAR ejercicio existente conservando historial
      const actualizado = {
        ...ejercicioEditando,
        nombre: nuevoEjercicio.nombre,
        grupo: nuevoEjercicio.grupo,
        series: parseInt(nuevoEjercicio.series) || 3,
        reps: `${nuevoEjercicio.repsMin}-${nuevoEjercicio.repsMax}`,
        rir: parseInt(nuevoEjercicio.rir) || 2,
        peso: parseFloat(nuevoEjercicio.peso) || 0,
        videoUrl: nuevoEjercicio.videoUrl?.trim() || '',
      }
      await actualizarEjercicios(ejercicios.map(e => e.id === ejercicioEditando.id ? actualizado : e))
      setEjercicioEditando(null)
    } else {
      // CREAR nuevo ejercicio
      const nuevo = {
        id: `ej_${Date.now()}`,
        nombre: nuevoEjercicio.nombre,
        grupo: nuevoEjercicio.grupo,
        series: parseInt(nuevoEjercicio.series) || 3,
        reps: `${nuevoEjercicio.repsMin}-${nuevoEjercicio.repsMax}`,
        rir: parseInt(nuevoEjercicio.rir) || 2,
        peso: parseFloat(nuevoEjercicio.peso) || 0,
        videoUrl: nuevoEjercicio.videoUrl?.trim() || '',
      }
      await actualizarEjercicios([...ejercicios, nuevo])
    }

    // Cerrar y resetear inmediatamente para mejor UX
    setNuevoEjercicio({ nombre: '', grupo: '', series: '3', repsMin: '8', repsMax: '12', rir: '2', peso: '', videoUrl: '' })
    setEjercicioEditando(null)
    setModalVisible(false)
  }

  function abrirEdicionEjercicio(ej) {
    setEjercicioEditando(ej)
    setNuevoEjercicio({
      nombre: ej.nombre,
      grupo: ej.grupo,
      series: ej.series?.toString() || '3',
      repsMin: ej.reps?.split('-')[0] || '8',
      repsMax: ej.reps?.split('-')[1] || '12',
      rir: ej.rir?.toString() || '2',
      peso: ej.peso?.toString() || '',
      videoUrl: ej.videoUrl || '',
    })
    setModalVisible(true)
  }

  function toggleSeleccion(id) {
    setSeleccionados(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  function toggleTodos() {
    if (seleccionados.length === ejercicios.length) {
      setSeleccionados([])
    } else {
      setSeleccionados(ejercicios.map(e => e.id))
    }
  }

  function cancelarModoEliminar() {
    setModoEliminar(false)
    setSeleccionados([])
    setConfirmarEliminarEjs(false)
  }

  async function confirmarEliminarSeleccionados() {
    await actualizarEjercicios(ejercicios.filter(e => !seleccionados.includes(e.id)))
    cancelarModoEliminar()
  }

  async function eliminarEjercicio(id) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    await actualizarEjercicios(ejercicios.filter(e => e.id !== id))
  }

  async function guardarSesion(sesion) {
    // Normalizar fecha de la sesión a solo día (sin hora)
    const fechaSesion = new Date(sesion.fecha)
    fechaSesion.setHours(0, 0, 0, 0)
    const fechaSesionStr = fechaSesion.toDateString()
    
    // Agregar o reemplazar sesión en el historial del ejercicio
    const ejerciciosKey = `ejercicios_${bloqueId}_${diaKey}`
    const ejerciciosActualizados = ejercicios.map(ej => {
      if (ej.id === sesion.ejercicioId) {
        const historialActual = Array.isArray(ej.historial) ? ej.historial : []
        
        // Buscar si ya existe una sesión de este ejercicio en esta fecha
        const indiceSesionExistente = historialActual.findIndex(s => {
          const fechaExistente = new Date(s.fecha)
          fechaExistente.setHours(0, 0, 0, 0)
          return fechaExistente.toDateString() === fechaSesionStr
        })
        
        let nuevoHistorial
        if (indiceSesionExistente >= 0) {
          // REEMPLAZAR sesión existente
          nuevoHistorial = [...historialActual]
          nuevoHistorial[indiceSesionExistente] = sesion
        } else {
          // AGREGAR nueva sesión
          nuevoHistorial = [...historialActual, sesion]
        }
        
        
        return {
          ...ej,
          historial: nuevoHistorial,
          ultimaSesion: sesion
        }
      }
      return ej
    })

    const nuevoPrograma = {
      ...programa,
      dias: { ...programa.dias, [ejerciciosKey]: ejerciciosActualizados }
    }

    _programaCache[userId] = nuevoPrograma
    setPrograma(nuevoPrograma)
    mostrarToast()
    await guardarYSincronizar(userId, nuevoPrograma)

    // Señal para que Progreso recargue
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default
      await AsyncStorage.setItem('repforge_refresh_progreso', Date.now().toString())
    } catch(e) {}

    // Actualizar ultima_sesion en perfiles
    try {
      await supabase
        .from('perfiles')
        .update({ ultima_sesion: new Date().toISOString() })
        .eq('id', userId)
    } catch(e) { /* no bloquear */ }

  }

  const nombresDia = {
    0: 'Lunes', 1: 'Martes', 2: 'Miércoles',
    3: 'Jueves', 4: 'Viernes', 5: 'Sábado', 6: 'Domingo'
  }

  return (
    <LinearGradient colors={gradColors} style={styles.gradient}>
      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: 120 }]} showsVerticalScrollIndicator={false}>

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← {bloque.nombre}</Text>
        </TouchableOpacity>

        <View style={styles.headerRow}>
          <View>
            <Text style={styles.saludo}>{nombresDia[diaKey]}</Text>
            <Text style={styles.fecha}>{bloque.tipo.toUpperCase()}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {ejercicios.length > 0 && (
              <TouchableOpacity
                style={[styles.addButton, modoEliminar && { borderColor: 'rgba(255,51,85,0.4)', backgroundColor: 'rgba(255,51,85,0.1)' }]}
                onPress={() => modoEliminar ? cancelarModoEliminar() : (setModoEliminar(true), setSeleccionados([]))}
              >
                <AntDesign name={modoEliminar ? 'close' : 'delete'} size={20} color={modoEliminar ? '#fff' : '#ff3355'} />
              </TouchableOpacity>
            )}
            {modoEliminar ? (
              <TouchableOpacity
                style={[styles.addButton, { paddingHorizontal: 12, width: 'auto' }]}
                onPress={toggleTodos}
              >
                <Text style={{ color: accentColor, fontSize: 12, fontWeight: '800' }}>
                  {seleccionados.length === ejercicios.length ? 'DESMARCAR' : 'TODO'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setModalVisible(true)}
              >
                <AntDesign name="plus" size={22} color={accentColor} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Banner modo eliminar */}
        {modoEliminar && (
          <View style={styles.modoEliminarBanner}>
            <AntDesign name="exclamation-circle" size={16} color="#ff3355" style={{ marginRight: 10 }} />
            <Text style={styles.modoEliminarTxt}>
              {seleccionados.length === 0
                ? 'Selecciona ejercicios'
                : `${seleccionados.length} SELECCIONADO${seleccionados.length > 1 ? 'S' : ''}`}
            </Text>
            {seleccionados.length > 0 && (
              <TouchableOpacity
                style={{ backgroundColor: '#ff3355', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 }}
                onPress={() => setConfirmarEliminarEjs(true)}
              >
                <Text style={{ color: '#fff', fontWeight: '900', fontSize: 11 }}>ELIMINAR</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {ejercicios.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Sin ejercicios</Text>
            <Text style={styles.emptySub}>Personaliza tu entrenamiento agregando ejercicios a este día</Text>
            <TouchableOpacity onPress={() => setModalVisible(true)} style={{ borderRadius: 16, overflow: 'hidden' }}>
              <LinearGradient colors={[accentColor, accentColor]} style={{ paddingHorizontal: 24, paddingVertical: 14 }}>
                <Text style={{ color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 1 }}>AGREGAR EJERCICIO</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          ejercicios.map((ej, index) => (
            <CardEntrance animate key={ej.id} delay={index * 50}>
            <View>
              <AppleBentoCard style={[
                styles.ejercicioCard,
                modoEliminar && seleccionados.includes(ej.id) && styles.ejercicioCardSeleccionado
              ]}>
                <View style={styles.ejercicioHeader}>
                  {modoEliminar ? (
                    <View style={styles.checkboxBox}>
                      <AntDesign
                        name={seleccionados.includes(ej.id) ? 'check-circle' : 'check-circle'}
                        size={22}
                        color={seleccionados.includes(ej.id) ? '#ff3355' : 'rgba(255,255,255,0.1)'}
                      />
                    </View>
                  ) : (
                    <View style={styles.ejercicioNum}>
                      <Text style={styles.ejercicioNumText}>{index + 1}</Text>
                    </View>
                  )}
                  <View style={styles.ejercicioInfo}>
                    <Text style={styles.ejercicioNombre}>{ej.nombre}</Text>
                    <Text style={styles.ejercicioGrupo}>{ej.grupo.toUpperCase()}</Text>
                  </View>
                  {!modoEliminar && (
                    <View style={styles.ejercicioAcciones}>
                      <TouchableOpacity
                        style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: ej.videoUrl ? 'rgba(255,51,85,0.1)' : 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' }}
                        onPress={() => {
                          const url = ej.videoUrl && ej.videoUrl.trim()
                          if (url) {
                            Linking.openURL(url).catch(() =>
                              Alert.alert('Sin video', 'No se pudo abrir el link. Verifica que sea una URL válida.')
                            )
                          } else {
                            const query = encodeURIComponent(`${ej.nombre} ejercicio técnica`)
                            Linking.openURL(`https://www.youtube.com/results?search_query=${query}`)
                          }
                        }}
                      >
                        <AntDesign name="youtube" size={18} color={ej.videoUrl ? "#ff3355" : "rgba(255,255,255,0.45)"} />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        onPress={() => abrirEdicionEjercicio(ej)} 
                        style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: `rgba(${acRgb},0.1)`, alignItems: 'center', justifyContent: 'center', marginLeft: 10 }}
                      >
                        <AntDesign name="edit" size={16} color={accentColor} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {!modoEliminar && (
                  <>
                    <View style={styles.prescripcionRow}>
                      <View style={styles.prescripcionItem}>
                        <Text style={styles.prescripcionNum}>{ej.series}</Text>
                        <Text style={styles.prescripcionLabel}>SERIES</Text>
                      </View>
                      <View style={styles.prescripcionDivider} />
                      <View style={styles.prescripcionItem}>
                        <Text style={styles.prescripcionNum}>{ej.reps}</Text>
                        <Text style={styles.prescripcionLabel}>REPS</Text>
                      </View>
                      <View style={styles.prescripcionDivider} />
                      <View style={styles.prescripcionItem}>
                        <Text style={styles.prescripcionNum}>RIR {ej.rir}</Text>
                        <Text style={styles.prescripcionLabel}>RESERVA</Text>
                      </View>
                      <View style={styles.prescripcionDivider} />
                      <View style={styles.prescripcionItem}>
                        <Text style={styles.prescripcionNum}>{ej.peso > 0 ? `${ej.peso}kg` : '—'}</Text>
                        <Text style={styles.prescripcionLabel}>SUGERIDO</Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.registrarBtn}
                      onPress={() => setEjercicioRegistrando(ej)}
                    >
                      <Text style={styles.registrarBtnText}>+ Registrar series</Text>
                    </TouchableOpacity>
                  </>
                )}
                {modoEliminar && (
                  <TouchableOpacity
                    style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
                    onPress={() => toggleSeleccion(ej.id)}
                    activeOpacity={0.15}
                  />
                )}
              </AppleBentoCard>
            </View>
            </CardEntrance>
          ))
        )}

        {ejercicios.length > 0 && !modoEliminar && (
          <TouchableOpacity 
            style={styles.agregarMasBtn} 
            onPress={() => setModalVisible(true)}
          >
            <AntDesign name="plus" size={18} color={accentColor} />
            <Text style={styles.agregarMasText}>Agregar ejercicio</Text>
          </TouchableOpacity>
        )}

        {/* Modal agregar/editar ejercicio */}
        <ManagedModal visible={modalVisible} transparent animationType="none">
          <DraggableSheet
            onClose={() => { setModalVisible(false); setEjercicioEditando(null) }}
            scrollable={true}
            gradientColors={gradColors}
            containerStyle={{ borderColor: `rgba(${acRgb},0.22)`, marginBottom: kbHeight, maxHeight: kbHeight > 0 ? SCREEN_HEIGHT - kbHeight - 40 : '92%' }}
            header={
              <View style={{ marginBottom: 20 }}>
                <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: -0.3 }}>
                  {ejercicioEditando ? 'Editar Ejercicio' : 'Nuevo Ejercicio'}
                </Text>
              </View>
            }
          >
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={[styles.modalLabel, { color: `rgba(${acRgb},0.6)` }]}>NOMBRE DEL EJERCICIO</Text>
              <View style={[styles.inputWrapper, { borderColor: `rgba(${acRgb},0.18)`, backgroundColor: `rgba(${acRgb},0.04)` }]}>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: Press de Banca"
                  placeholderTextColor={`rgba(${acRgb},0.25)`}
                  value={nuevoEjercicio.nombre}
                  onChangeText={t => setNuevoEjercicio(p => ({ ...p, nombre: t }))}
                />
              </View>

              <Text style={[styles.modalLabel, { color: `rgba(${acRgb},0.6)` }]}>GRUPO MUSCULAR</Text>
              <TouchableOpacity
                style={[styles.inputWrapper, { borderColor: `rgba(${acRgb},0.18)`, backgroundColor: `rgba(${acRgb},0.04)`, marginBottom: 20 }]}
                onPress={() => setModalGrupoVisible(true)}
              >
                <View style={[styles.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                  <Text style={{ color: nuevoEjercicio.grupo ? '#fff' : `rgba(${acRgb},0.3)`, fontSize: 16, fontWeight: '600' }}>
                    {nuevoEjercicio.grupo || 'Selecciona grupo'}
                  </Text>
                  <AntDesign name="down" size={14} color={accentColor} />
                </View>
              </TouchableOpacity>

              <Text style={[styles.modalLabel, { color: `rgba(${acRgb},0.6)` }]}>SERIES</Text>
              <View style={styles.selectorRow}>
                {['2', '3', '4', '5', '6'].map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.selectorChip, nuevoEjercicio.series === s && styles.selectorChipActivo]}
                    onPress={() => setNuevoEjercicio(p => ({ ...p, series: s }))}
                  >
                    <Text style={[styles.selectorChipText, nuevoEjercicio.series === s && styles.selectorChipTextActivo]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.modalLabel, { color: `rgba(${acRgb},0.6)` }]}>RANGO DE REPS</Text>
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
                <View style={[styles.inputWrapper, { flex: 1, marginBottom: 0, borderColor: `rgba(${acRgb},0.18)`, backgroundColor: `rgba(${acRgb},0.04)` }]}>
                  <TextInput
                    style={[styles.input, { textAlign: 'center' }]}
                    placeholder="Min"
                    placeholderTextColor={`rgba(${acRgb},0.25)`}
                    value={nuevoEjercicio.repsMin}
                    onChangeText={t => setNuevoEjercicio(p => ({ ...p, repsMin: t }))}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={{ justifyContent: 'center' }}>
                  <Text style={{ color: '#8E8E93', fontWeight: '800' }}>—</Text>
                </View>
                <View style={[styles.inputWrapper, { flex: 1, marginBottom: 0, borderColor: `rgba(${acRgb},0.18)`, backgroundColor: `rgba(${acRgb},0.04)` }]}>
                  <TextInput
                    style={[styles.input, { textAlign: 'center' }]}
                    placeholder="Max"
                    placeholderTextColor={`rgba(${acRgb},0.25)`}
                    value={nuevoEjercicio.repsMax}
                    onChangeText={t => setNuevoEjercicio(p => ({ ...p, repsMax: t }))}
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              <Text style={[styles.modalLabel, { color: `rgba(${acRgb},0.6)` }]}>RIR (REPS EN RESERVA)</Text>
              <View style={styles.selectorRow}>
                {['0', '1', '2', '3', '4'].map(r => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.selectorChip, nuevoEjercicio.rir === r && styles.selectorChipActivo]}
                    onPress={() => setNuevoEjercicio(p => ({ ...p, rir: r }))}
                  >
                    <Text style={[styles.selectorChipText, nuevoEjercicio.rir === r && styles.selectorChipTextActivo]}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.modalLabel, { color: `rgba(${acRgb},0.6)` }]}>PESO SUGERIDO (kg) — OPCIONAL</Text>
              <View style={[styles.inputWrapper, { borderColor: `rgba(${acRgb},0.18)`, backgroundColor: `rgba(${acRgb},0.04)` }]}>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: 80"
                  placeholderTextColor={`rgba(${acRgb},0.25)`}
                  value={nuevoEjercicio.peso}
                  onChangeText={t => setNuevoEjercicio(p => ({ ...p, peso: t }))}
                  keyboardType="decimal-pad"
                />
              </View>

              <Text style={[styles.modalLabel, { color: `rgba(${acRgb},0.6)` }]}>VIDEO URL — OPCIONAL</Text>
              <View style={[styles.inputWrapper, { flexDirection: 'row', alignItems: 'center', borderColor: `rgba(${acRgb},0.18)`, backgroundColor: `rgba(${acRgb},0.04)` }]}>
                <AntDesign name="youtube" size={18} color="#ff3355" style={{ marginLeft: 16 }} />
                <TextInput
                  style={[styles.input, { flex: 1, paddingLeft: 10 }]}
                  placeholder="Link de video"
                  placeholderTextColor={`rgba(${acRgb},0.25)`}
                  value={nuevoEjercicio.videoUrl}
                  onChangeText={t => setNuevoEjercicio(p => ({ ...p, videoUrl: t }))}
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalCancelar, { borderColor: `rgba(${acRgb},0.12)`, backgroundColor: `rgba(${acRgb},0.04)` }]}
                  onPress={() => {
                    setModalVisible(false)
                    setEjercicioEditando(null)
                    setNuevoEjercicio({ nombre: '', grupo: '', series: '3', repsMin: '8', repsMax: '12', rir: '2', peso: '', videoUrl: '' })
                  }}
                >
                  <Text style={[styles.modalCancelarText, { color: `rgba(${acRgb},0.6)` }]}>CANCELAR</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalGuardar} onPress={agregarEjercicio}>
                  <LinearGradient colors={[accentColor, accentColor + 'cc']} style={styles.modalGuardarGradient}>
                    <Text style={styles.modalGuardarText}>{ejercicioEditando ? 'GUARDAR' : 'AGREGAR'}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </DraggableSheet>
        </ManagedModal>

      </ScrollView>

      {/* MODAL CONFIRMAR ELIMINAR SELECCIONADOS */}
      <DeleteConfirmModal
        visible={confirmarEliminarEjs}
        onCancel={() => setConfirmarEliminarEjs(false)}
        onConfirm={confirmarEliminarSeleccionados}
        title="¿Eliminar ejercicios?"
        subtitle={`${seleccionados.length} ejercicio${seleccionados.length > 1 ? 's' : ''} seleccionado${seleccionados.length > 1 ? 's' : ''}`}
        warning="Esta acción no se puede deshacer."
      />

      {/* MODAL GRUPO MUSCULAR */}
      <ManagedModal visible={modalGrupoVisible} transparent animationType="none">
        <View style={styles.modalOverlay}>
          <LinearGradient colors={gradColors} style={[styles.selectorModal, { padding: 24 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <View>
                <Text style={{ color: `rgba(${acRgb},0.6)`, fontSize: 10, fontWeight: '800', letterSpacing: 2, marginBottom: 4 }}>NUEVO EJERCICIO</Text>
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: -0.3 }}>Grupo Muscular</Text>
              </View>
              <TouchableOpacity onPress={() => setModalGrupoVisible(false)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
                <AntDesign name="close" size={14} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={{ height: 1, backgroundColor: `rgba(${acRgb},0.15)`, marginVertical: 16 }} />
            <View style={styles.grupoGrid}>
              {GRUPOS_MUSCULARES.map(g => (
                <TouchableOpacity
                  key={g}
                  style={[styles.grupoChip, nuevoEjercicio.grupo === g && styles.grupoChipActivo]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                    setNuevoEjercicio(p => ({ ...p, grupo: g }))
                    setModalGrupoVisible(false)
                  }}
                >
                  {nuevoEjercicio.grupo === g && <AntDesign name="check" size={10} color={accentColor} style={{ marginRight: 4 }} />}
                  <Text style={[styles.grupoChipText, nuevoEjercicio.grupo === g && styles.grupoChipTextActivo]}>{g}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </LinearGradient>
        </View>
      </ManagedModal>

      {/* MODAL REGISTRAR SERIES */}
      {ejercicioRegistrando && (
        <RegistrarSeries
          visible={!!ejercicioRegistrando}
          onClose={() => setEjercicioRegistrando(null)}
            ejercicio={ejercicioRegistrando}
            onGuardar={guardarSesion}
          />
        )}

      {/* TOAST SESIÓN REGISTRADA */}
      {toastVisible && (
        <Animated.View style={{ position: 'absolute', top: 40, left: 20, right: 20, zIndex: 9999, transform: [{ translateX: toastAnim }] }}>
          <LinearGradient
            colors={['rgba(0, 204, 68, 0.2)', 'rgba(0, 204, 68, 0.05)']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 16, borderRadius: 20, borderWidth: 1, borderColor: '#00cc44', backgroundColor: 'rgba(10, 15, 35, 0.95)' }}
          >
            <AntDesign name="check-circle" size={22} color="#00cc44" />
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 15 }}>Sesión registrada</Text>
          </LinearGradient>
        </Animated.View>
      )}

    </LinearGradient>
  )
}

// Stack de rutinas
function RutinasTab() {
  const { gradColors } = useContext(CoachThemeContext)
  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <RutinaStack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: 'transparent' },
          animation: 'fade',
          animationDuration: 150,
        }}
      >
        <RutinaStack.Screen name="ListaProgramas" component={ListaProgramas} />
        <RutinaStack.Screen name="ListaBloques" component={ListaBloques} />
        <RutinaStack.Screen name="DiasBloque" component={DiasBloque} />
        <RutinaStack.Screen name="Ejercicios" component={EjerciciosDelDia} />
      </RutinaStack.Navigator>
    </View>
  )
}

function ProgresoScreen() {
  const { userId } = useContext(UserContext)
  return <Progreso userId={userId} />
}

function IATab() {
  const { userId } = useContext(UserContext)
  return <IAScreen userId={userId} />
}

function PerfilScreen() {
  const { accentColor, gradColors } = useContext(CoachThemeContext)
  const acRgb = hexToRgb(accentColor)
  const styles = createStyles(accentColor, acRgb)
  const { userId } = useContext(UserContext)
  const [modalAjustes, setModalAjustes] = useState(false)
  const [, forceOpenAjustes] = useState(0)
  const [perfil, setPerfil] = useState(null)
  const [fotoUrlLocal, setFotoUrlLocal] = useState(null)

  useFocusEffect(useCallback(() => {
    supabase.from('perfiles').select('*').eq('id', userId).single().then(({ data }) => {
      if (data) setPerfil(data)
      if (data?.avatar_url) setFotoUrlLocal(data.avatar_url)
    })
    setModalAjustes(true)
  }, []))

  return (
    <LinearGradient colors={gradColors} style={styles.gradient}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={accentColor} />
      </View>
    </LinearGradient>
  )
}

function ComunidadScreen() {
  const { userId } = useContext(UserContext)
  return <Comunidad userId={userId} esCoach={false} />
}

function ChatScreen() {
  const { userId } = useContext(UserContext)
  return <Chat userId={userId} esCoach={false} />
}

// ── Toast global fuera de cualquier Modal ──────────────────────
function GlobalToast({ msg, tipo, anim, opacityAnim }) {
  if (!msg) return null
  const color = tipo === 'ok' ? '#00cc44' : '#ff3355'
  const colorText = tipo === 'ok' ? '#00ff66' : '#ff4466'
  const colorSub = tipo === 'ok' ? '#00aa44' : '#cc2244'
  const colorBg = tipo === 'ok' ? '#003a18' : '#3a0010'
  const gradColors = tipo === 'ok' ? ['#001f0a', '#002a10', '#001a08'] : ['#220008', '#1a0005', '#0f0003']
  return (
    <Animated.View
      style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        zIndex: 99999, elevation: 99,
        opacity: opacityAnim,
        transform: [{ translateX: anim }],
      }}
      pointerEvents="none"
    >
      <LinearGradient
        colors={gradColors}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={{
          flexDirection: 'row', alignItems: 'center', gap: 14,
          paddingHorizontal: 20, paddingVertical: 18,
          borderBottomWidth: 1.5, borderBottomColor: color,
          shadowColor: color, shadowOpacity: 0.5, shadowRadius: 20,
          shadowOffset: { width: 0, height: 6 }, elevation: 30,
        }}
      >
        <View style={{
          width: 40, height: 40, borderRadius: 12,
          backgroundColor: colorBg, borderWidth: 1.5, borderColor: color,
          justifyContent: 'center', alignItems: 'center',
        }}>
          <AntDesign name={tipo === 'ok' ? 'check-circle' : 'close-circle'} size={20} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colorText, fontWeight: '900', fontSize: 15, letterSpacing: 0.3 }}>
            {tipo === 'ok' ? 'Guardado' : 'Error'}
          </Text>
          <Text style={{ color: colorSub, fontSize: 12, marginTop: 2, fontWeight: '600' }}>
            {msg}
          </Text>
        </View>
        <View style={{ width: 6, height: 40, borderRadius: 3, backgroundColor: color, opacity: 0.6 }} />
      </LinearGradient>
    </Animated.View>
  )
}


function createStyles(accent, rgb) { return StyleSheet.create({
  gradient: { flex: 1 },
  container: { padding: 20, paddingTop: 56, paddingBottom: LAYOUT.bottomTabSpace || 150 },
  tabBar: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(8,9,26,0.95)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    paddingBottom: 0,
    paddingTop: 0,
    paddingHorizontal: 6,
  },
  tabItem: {
    paddingTop: 0,
    paddingBottom: 0,
    height: 72,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  tabItemWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '95%',
    paddingVertical: 8,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  tabItemWrapActive: {
    backgroundColor: `rgba(${rgb},0.15)`,
    borderRadius: 18,
  },
  tabLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    marginTop: 3,
    textAlign: 'center',
    letterSpacing: 0,
  },
  tabIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
  },
  tabPillActive: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: accent,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  tabPillLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  tabIconWrapActive: {
    backgroundColor: `rgba(${rgb},0.12)`,
    borderRadius: 21,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  saludo: { fontSize: 26, fontWeight: '700', color: '#fff' },
  fecha: { fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 2 },

  semanasProgresoBox: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 16, padding: 16, marginBottom: 20 },
  semanasProgresoCompleto: { borderColor: 'rgba(0,204,68,0.4)', backgroundColor: 'rgba(0,204,68,0.08)' },
  semanasProgresoIncompleto: { borderColor: 'rgba(255,153,0,0.4)', backgroundColor: 'rgba(255,153,0,0.08)' },
  semanasProgresoInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  semanasProgresoLabel: { color: '#fff', fontWeight: '700', fontSize: 13 },
  semanasProgresoPct: { color: accent, fontWeight: '700', fontSize: 13 },
  semanasProgresoTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' },
  semanasProgresoFill: { height: '100%', backgroundColor: accent, borderRadius: 3 },

  addButton: { padding: 8, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)' },
  addButtonDisabled: { opacity: 0.3 },

  advertenciaBox: { flexDirection: 'row', backgroundColor: 'rgba(255,153,0,0.08)', borderWidth: 0.5, borderColor: 'rgba(255,153,0,0.4)', borderRadius: 16, padding: 16, marginTop: 12, gap: 12 },
  advertenciaIcon: { fontSize: 24 },
  advertenciaTexto: { flex: 1 },
  advertenciaTitulo: { color: '#ff9900', fontSize: 14, fontWeight: '700', marginBottom: 4 },
  advertenciaSub: { color: '#ff9900', fontSize: 12, lineHeight: 18, opacity: 0.8 },

  rfBadge: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 10, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.12)' },
  rfR: { fontSize: 18, fontWeight: '700', color: '#fff' },
  rfF: { fontSize: 18, fontWeight: '700', color: accent },
  deleteBtn: { padding: 4 },
  card: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 20, padding: 18, marginBottom: 14 },
  cardLabel: { fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, fontWeight: '700', marginBottom: 8 },
  cardTitle: { fontSize: 17, color: '#fff', fontWeight: '700', marginBottom: 4 },
  cardSub: { fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 14 },
  cardRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  cardSmall: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 20, padding: 18, alignItems: 'center' },
  cardSmallIcon: { fontSize: 24, marginBottom: 6 },
  cardSmallNum: { fontSize: 24, fontWeight: '700', color: '#fff' },
  cardSmallLabel: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  linkButton: { marginTop: 4 },
  linkButtonText: { color: accent, fontSize: 13, fontWeight: '600' },
  bloqueCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 20, padding: 18, marginBottom: 12 },
  tipoBadge: { borderWidth: 0.5, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  tipoText: { fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  bloqueNombre: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 6, letterSpacing: -0.5 },
  bloqueSub: { fontSize: 13, color: '#8E8E93', marginBottom: 16, fontWeight: '500' },
  bloqueTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  volumenHeaderInline: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(255,102,0,0.3)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: 'rgba(255,102,0,0.1)' },
  volumenTituloInline: { fontSize: 9, fontWeight: '800', color: '#ff6600', letterSpacing: 1.5 },

  // ═══ CONTROLES HORIZONTALES ABAJO ═══
  bloqueControles: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)'
  },
  controlBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  bloqueFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bloqueEstado: { fontSize: 12, color: '#8E8E93', fontWeight: '500' },
  backButton: { marginBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { color: accent, fontSize: 15, fontWeight: '700' },
  editDiasBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.03)' },
  editDiasBtnActivo: { borderColor: `rgba(${rgb},0.4)`, backgroundColor: `rgba(${rgb},0.1)` },
  editDiasBtnText: { color: '#8E8E93', fontSize: 12, fontWeight: '700' },
  editDiasBtnTextActivo: { color: accent },
  diasEditorBox: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 16, padding: 16, marginBottom: 16 },
  diasRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 8 },
  diaChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 0.5, borderColor: 'rgba(0,204,68,0.15)', backgroundColor: 'rgba(0,204,68,0.05)' },
  diaChipActivo: { borderColor: 'rgba(0,204,68,0.5)', backgroundColor: 'rgba(0,204,68,0.12)', shadowColor: '#00cc44', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6 },
  diaChipText: { color: 'rgba(0,204,68,0.5)', fontWeight: '700', fontSize: 12 },
  diaChipTextActivo: { color: '#00ee55' },
  diaCardWrapper: { position: 'relative', zIndex: 1 },
  diaCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 20, padding: 16, marginBottom: 12 },
  diaDescanso: { opacity: 0.4 },
  diaLabelBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' },
  diaLabelBoxActivo: { borderColor: `rgba(${rgb},0.4)`, backgroundColor: `rgba(${rgb},0.1)` },
  diaLabel: { color: '#8E8E93', fontWeight: '800', fontSize: 12 },
  diaLabelActivo: { color: accent },
  diaInfo: { flex: 1 },
  diaNombre: { color: '#fff', fontWeight: '700', fontSize: 16 },

  etiquetaContainer: { marginTop: 6, marginBottom: 6 },
  etiquetaSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 36
  },
  etiquetaText: { color: accent, fontSize: 12, fontWeight: '700' },
  etiquetaPlaceholder: { color: 'rgba(255,255,255,0.4)', fontWeight: '600' },

  // Modal flotante centrado
  etiquetaModalFlotante: {
    backgroundColor: 'rgba(10,12,30,0.97)',
    borderRadius: 24,
    borderWidth: 0.5,
    borderColor: `rgba(${rgb},0.4)`,
    padding: 16,
    maxHeight: '60%',
    width: '75%',
    alignSelf: 'center',
    shadowColor: accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10
  },
  etiquetaModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.08)'
  },
  etiquetaModalTitulo: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff'
  },
  etiquetaModalScroll: {
    maxHeight: 350
  },
  etiquetaModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)'
  },
  etiquetaModalItemActivo: {
    backgroundColor: `rgba(${rgb},0.12)`,
    borderColor: `rgba(${rgb},0.4)`
  },
  etiquetaModalItemText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },
  etiquetaModalItemTextActivo: {
    color: accent,
    fontWeight: '700'
  },
  etiquetaModalItemLimpiar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    marginTop: 6,
    backgroundColor: 'rgba(255,51,85,0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,51,85,0.4)'
  },
  etiquetaModalItemLimpiarText: {
    color: '#ff3355',
    fontSize: 14,
    fontWeight: '600'
  },

  // Volumen semanal
  volumenVacio: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '600', fontStyle: 'italic' },
  programaNombreRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  completoBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,204,68,0.08)', borderWidth: 0.5, borderColor: 'rgba(0,204,68,0.4)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  completoBadgeText: { color: '#00cc44', fontSize: 10, fontWeight: '700' },

  volumenContent: { paddingHorizontal: 14, paddingBottom: 14, gap: 10 },
  volumenRow: { gap: 6 },
  volumenGrupo: { color: '#fff', fontSize: 12, fontWeight: '700' },
  volumenBarTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' },
  volumenBarFill: { height: '100%', backgroundColor: accent, borderRadius: 4 },
  volumenSeriesRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  volumenSeries: { color: accent, fontSize: 11, fontWeight: '700', position: 'absolute', right: 28, top: 0 },
  volumenInfoBtn: { position: 'absolute', right: 0, top: -2, width: 18, height: 18, borderRadius: 9, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  volumenInfoIcon: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '700' },
  volumenTooltip: { backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 0.5, borderColor: `rgba(${rgb},0.4)`, borderRadius: 12, padding: 14, marginTop: 6, gap: 6 },
  volumenTooltipTitulo: { color: '#fff', fontSize: 13, fontWeight: '700', marginBottom: 4 },
  volumenTooltipText: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  volumenTooltipNum: { color: accent, fontWeight: '700' },
  volumenTooltipClose: { alignSelf: 'flex-end', marginTop: 4 },
  volumenTooltipCloseText: { color: accent, fontSize: 12, fontWeight: '700' },

  diaGrupos: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 },
  emptyBox: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { fontSize: 52, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 8 },
  emptySub: { fontSize: 14, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: 24 },
  emptyButton: { borderRadius: 16, overflow: 'hidden' },
  emptyButtonGradient: { paddingHorizontal: 24, paddingVertical: 14 },
  emptyButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  ejercicioCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 24, padding: 18, marginBottom: 16, overflow: 'hidden' },
  ejercicioCardSeleccionado: { borderColor: 'rgba(255,51,85,0.5)', backgroundColor: 'rgba(255,51,85,0.06)' },
  ejercicioHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  modoEliminarBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,51,85,0.1)', borderWidth: 1, borderColor: 'rgba(255,51,85,0.3)', borderRadius: 16, padding: 14, marginBottom: 16 },
  modoEliminarTxt: { color: '#ff3355', fontSize: 13, fontWeight: '800', flex: 1 },
  ejercicioNum: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' },
  ejercicioNumText: { color: accent, fontWeight: '800', fontSize: 13 },
  ejercicioInfo: { flex: 1 },
  ejercicioNombre: { color: '#fff', fontWeight: '700', fontSize: 16 },
  ejercicioGrupo: { color: '#8E8E93', fontSize: 12, marginTop: 2 },
  ejercicioAcciones: { flexDirection: 'row', alignItems: 'center' },
  prescripcionRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 16, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  prescripcionItem: { flex: 1, alignItems: 'center' },
  prescripcionNum: { color: '#fff', fontWeight: '800', fontSize: 15 },
  prescripcionLabel: { color: '#8E8E93', fontSize: 10, fontWeight: '700', marginTop: 2 },
  prescripcionDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.08)' },
  registrarBtn: { height: 48, borderRadius: 14, borderWidth: 1, borderColor: `rgba(${rgb},0.3)`, backgroundColor: `rgba(${rgb},0.05)`, alignItems: 'center', justifyContent: 'center' },
  registrarBtnText: { color: accent, fontWeight: '800', fontSize: 14 },
  agregarMasBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 20, padding: 18, marginTop: 8, backgroundColor: 'rgba(255,255,255,0.03)' },
  agregarMasText: { color: accent, fontWeight: '800', fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 2, 15, 0.85)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: 'rgba(10, 15, 35, 0.98)', borderRadius: 32, padding: 24, borderWidth: 1, borderColor: `rgba(${rgb},0.2)`, width: '90%', maxWidth: 360, maxHeight: '85%' },
  modalTitulo: { fontSize: 24, fontWeight: '900', color: '#fff', marginBottom: 8, letterSpacing: -0.5 },
  modalSub: { fontSize: 13, color: '#8E8E93', marginBottom: 20, lineHeight: 20, fontWeight: '500' },
  modalLabel: { color: '#8E8E93', fontSize: 10, letterSpacing: 1.5, fontWeight: '800', marginBottom: 10, textTransform: 'uppercase' },
  inputWrapper: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.03)', marginBottom: 20 },
  input: { color: '#fff', padding: 16, fontSize: 16, fontWeight: '600' },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 12 },
  modalCancelar: { flex: 1, padding: 16, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center' },
  modalCancelarText: { color: '#8E8E93', fontWeight: '800', fontSize: 15 },
  modalGuardar: { flex: 1, borderRadius: 18, overflow: 'hidden' },
  modalGuardarGradient: { padding: 16, alignItems: 'center', justifyContent: 'center' },
  modalGuardarText: { color: '#fff', fontWeight: '900', fontSize: 15, letterSpacing: 0.5 },
  tipoBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.03)' },
  tipoBtnActivo: { borderColor: `rgba(${rgb},0.4)`, backgroundColor: `rgba(${rgb},0.1)` },
  tipoBtnText: { color: '#8E8E93', fontWeight: '700', fontSize: 13 },
  tipoBtnTextActivo: { color: accent },
  selectorRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  selectorChip: { flex: 1, paddingVertical: 14, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center' },
  selectorChipActivo: { borderColor: `rgba(${rgb},0.4)`, backgroundColor: `rgba(${rgb},0.1)` },
  selectorChipText: { color: '#8E8E93', fontWeight: '700', fontSize: 14 },
  selectorChipTextActivo: { color: accent },
  repsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 0 },
  repsGuion: { color: 'rgba(255,255,255,0.4)', fontSize: 18, fontWeight: '700' },
  grupoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  grupoChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.04)' },
  grupoChipActivo: { borderColor: `rgba(${rgb},0.5)`, backgroundColor: `rgba(${rgb},0.12)` },
  grupoChipText: { color: 'rgba(255,255,255,0.55)', fontWeight: '700', fontSize: 13 },
  grupoChipTextActivo: { color: accent, fontWeight: '800' },
  selectorModal: { borderRadius: 32, borderWidth: 1, borderColor: `rgba(${rgb},0.2)`, width: '92%', overflow: 'hidden' },
  selectorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 0 },
  selectorTitulo: { fontSize: 18, fontWeight: '800', color: '#fff' },
  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholderText: { fontSize: 24, fontWeight: '800', color: '#fff' },

  // INICIO
  iniContainer: { padding: 20, paddingTop: 56, paddingBottom: 150 },
  iniHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  iniPerfilCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 20, padding: 14, marginBottom: 16 },
  iniPerfilAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: `rgba(${rgb},0.12)`, borderWidth: 0.5, borderColor: `rgba(${rgb},0.4)`, justifyContent: 'center', alignItems: 'center' },
  iniPerfilAvatarText: { color: accent, fontSize: 17, fontWeight: '700' },
  iniPerfilNombre: { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 5 },
  iniPerfilSubRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  iniPerfilSub: { color: accent, fontSize: 10, fontWeight: '700', backgroundColor: `rgba(${rgb},0.12)`, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  iniMetricaAddBtn: { width: 30, height: 30, borderRadius: 8, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
  metricaModal: { backgroundColor: 'rgba(10,12,30,0.97)', borderRadius: 24, padding: 22, width: '100%', borderWidth: 0.5, borderColor: `rgba(${rgb},0.4)` },
  metricaModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  metricaModalTitulo: { color: '#fff', fontSize: 16, fontWeight: '700' },
  metricaLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 6, marginTop: 4 },
  metricaUnidadRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  metricaUnidadBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.05)' },
  metricaUnidadBtnActivo: { borderColor: `rgba(${rgb},0.4)`, backgroundColor: `rgba(${rgb},0.12)` },
  metricaUnidadText: { color: 'rgba(255,255,255,0.4)', fontWeight: '700', fontSize: 13 },
  metricaUnidadTextActivo: { color: accent },
  rfRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 4 },
  rfR: { fontSize: 22, fontWeight: '700', color: '#fff', letterSpacing: 2 },
  rfF: { fontSize: 22, fontWeight: '700', color: accent, letterSpacing: 2 },
  iniProgramaNombre: { fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, fontWeight: '600' },
  iniBellBtn: { padding: 10, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', position: 'relative' },

  // AJUSTES
  ajustesOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  ajustesContainer: { backgroundColor: 'rgba(10,12,30,0.97)', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 20, paddingBottom: 40, maxHeight: '90%' },
  ajustesHandle: { width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  ajustesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.08)', marginBottom: 20 },
  ajustesTitulo: { fontSize: 20, fontWeight: '700', color: '#fff' },
  ajustesCerrarBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' },
  ajustesSectionLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 8, marginTop: 4 },
  ajustesCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 20, marginBottom: 20, overflow: 'hidden' },
  ajustesPerfilRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingRight: 16 },
  ajustesAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: `rgba(${rgb},0.12)`, borderWidth: 1, borderColor: `rgba(${rgb},0.4)`, justifyContent: 'center', alignItems: 'center' },
  ajustesAvatarText: { color: accent, fontSize: 20, fontWeight: '700' },
  ajustesAvatarWrap: { position: 'relative', width: 64, height: 64 },
  ajustesCamaraBtn: { position: 'absolute', bottom: 0, right: 0, width: 22, height: 22, borderRadius: 11, backgroundColor: accent, justifyContent: 'center', alignItems: 'center', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.2)' },
  ajustesNombre: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 2 },
  ajustesEmail: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  ajustesEditBtn: { width: 34, height: 34, borderRadius: 10, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
  ajustesInputLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '700', letterSpacing: 1.5, marginBottom: 6 },
  ajustesInput: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 0.5, borderColor: `rgba(${rgb},0.4)`, borderRadius: 10, padding: 11, color: '#fff', fontSize: 14 },
  ajustesEditForm: { borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.08)', padding: 20, gap: 18, backgroundColor: 'rgba(255,255,255,0.03)' },
  ajustesEditRow: { flexDirection: 'row', gap: 12 },
  ajustesEditLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '700', letterSpacing: 2, marginBottom: 8, textTransform: 'uppercase' },
  ajustesEditInput: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 13, color: '#fff', fontSize: 15, fontWeight: '600' },
  ajustesEditInputFocused: { borderColor: `rgba(${rgb},0.6)`, backgroundColor: `rgba(${rgb},0.06)` },
  ajustesEditChip: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  ajustesEditChipLg: { paddingHorizontal: 14, paddingVertical: 11, borderRadius: 12, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.05)' },
  ajustesGuardarBtn: { borderRadius: 16, overflow: 'hidden', marginTop: 8 },
  ajustesGuardarGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, paddingHorizontal: 24 },
  ajustesGuardarText: { color: '#fff', fontWeight: '700', fontSize: 15, letterSpacing: 0.5 },
  toastBox: { position: 'absolute', bottom: 108, left: 20, right: 20, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 18, borderWidth: 0.5, backgroundColor: 'rgba(0,204,68,0.1)', borderColor: 'rgba(0,204,68,0.5)', zIndex: 9999, elevation: 30, shadowColor: '#00cc44', shadowOpacity: 0.5, shadowRadius: 20, shadowOffset: { width: 0, height: 0 } },
  toastText: { flex: 1, fontSize: 13, fontWeight: '700' },
  ajustesPesoRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  unidadRowSmall: { flexDirection: 'row', gap: 6 },
  unidadBtnSmall: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.05)' },
  unidadBtnSmallActivo: { borderColor: `rgba(${rgb},0.4)`, backgroundColor: `rgba(${rgb},0.12)` },
  unidadTextSmall: { color: 'rgba(255,255,255,0.4)', fontWeight: '700', fontSize: 12 },
  ajustesRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingHorizontal: 16 },
  ajustesRowText: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '600', flexShrink: 1 },
  ajustesDivider: { height: 0.5, backgroundColor: 'rgba(255,255,255,0.08)', marginHorizontal: 16 },
  ajustesVersion: { color: 'rgba(255,255,255,0.25)', fontSize: 11, textAlign: 'center', marginTop: 8, marginBottom: 20 },
  ajustesSubSection: { paddingHorizontal: 16, paddingBottom: 16, gap: 10 },
  ajustesMsg: { fontSize: 12, fontWeight: '700', marginTop: 4 },

  // Notificaciones toggle
  ajustesNotifRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, gap: 12 },
  ajustesNotifLabel: { color: '#fff', fontSize: 13, fontWeight: '600' },
  ajustesNotifSub: { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 },
  ajustesNotifCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: `rgba(${rgb},0.08)`, borderWidth: 0.5, borderColor: `rgba(${rgb},0.4)`, borderRadius: 12, padding: 12, marginBottom: 8 },
  ajustesNotifCardIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: `rgba(${rgb},0.12)`, justifyContent: 'center', alignItems: 'center' },
  ajustesNotifCardTitulo: { color: '#fff', fontSize: 13, fontWeight: '700' },
  ajustesNotifCardSub: { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 },
  ajustesNotifCardTiempo: { color: 'rgba(255,255,255,0.4)', fontSize: 10 },
  ajustesToggle: { width: 44, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', paddingHorizontal: 2 },
  ajustesToggleOn: { backgroundColor: accent, borderColor: `rgba(${rgb},0.5)` },
  ajustesToggleThumb: { width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.4)' },
  ajustesToggleThumbOn: { backgroundColor: '#fff', transform: [{ translateX: 20 }] },

  // Coach
  ajustesCoachRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  ajustesCoachBtn: { borderRadius: 10, overflow: 'hidden' },
  ajustesCoachBtnGradient: { paddingHorizontal: 16, paddingVertical: 12 },
  ajustesCoachBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  ajustesCoachInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  ajustesCoachAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: `rgba(${rgb},0.12)`, borderWidth: 0.5, borderColor: `rgba(${rgb},0.4)`, justifyContent: 'center', alignItems: 'center' },
  ajustesCoachAvatarText: { color: accent, fontSize: 16, fontWeight: '700' },
  ajustesCoachNombre: { color: '#fff', fontSize: 14, fontWeight: '700' },
  ajustesCoachSub: { color: 'rgba(255,255,255,0.4)', fontSize: 11 },

  // Facturación
  ajustesPlanCard: { borderRadius: 16, overflow: 'hidden', marginBottom: 12 },
  ajustesPlanGradient: { padding: 16, borderWidth: 0.5, borderColor: 'rgba(255,102,0,0.4)', borderRadius: 16 },
  ajustesPlanHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  ajustesPlanNombre: { color: '#fff', fontSize: 18, fontWeight: '700' },
  ajustesPlanBadge: { backgroundColor: '#00cc44', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  ajustesPlanBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  ajustesPlanPrecio: { color: '#ff6600', fontSize: 28, fontWeight: '700' },
  ajustesPlanPeriodo: { color: 'rgba(255,255,255,0.4)', fontSize: 14 },
  ajustesPlanVence: { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 4 },
  ajustesFeaturesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  ajustesFeatureItem: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,204,68,0.08)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  ajustesFeatureText: { color: '#00cc44', fontSize: 11, fontWeight: '600' },
  ajustesRenovarBtn: { borderRadius: 12, overflow: 'hidden', marginBottom: 8 },
  ajustesRenovarGradient: { padding: 13, alignItems: 'center' },
  ajustesRenovarText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  ajustesCancelarSubBtn: { padding: 10, alignItems: 'center' },
  ajustesCancelarSubText: { color: 'rgba(255,255,255,0.4)', fontSize: 12, textDecorationLine: 'underline' },
  ajustesLinkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.08)' },
  ajustesLinkText: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '600' },
  ajustesAcercaRow: { alignItems: 'center', paddingVertical: 12, marginBottom: 8 },
  ajustesAcercaLogoR: { color: '#fff', fontSize: 18, fontWeight: '700' },
  ajustesAcercaLogoF: { color: accent, fontSize: 18, fontWeight: '700' },
  ajustesAcercaVersion: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 4 },
  ajustesAcercaSub: { color: 'rgba(255,255,255,0.4)', fontSize: 11, textAlign: 'center', marginTop: 4 },
  ajustesPlanLibre: { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 12, textAlign: 'center' },
  ajustesPlanOpcion: { borderRadius: 12, overflow: 'hidden', marginBottom: 8 },
  ajustesPlanOpcionGradient: { padding: 14 },
  ajustesPlanOpcionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  ajustesPlanOpcionNombre: { color: '#fff', fontSize: 15, fontWeight: '700' },
  ajustesPlanOpcionPrecio: { color: '#fff', fontSize: 20, fontWeight: '700' },
  iniBellBadge: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: accent },
  iniWeekRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 20, padding: 16, marginBottom: 16 },
  iniDayCol: { alignItems: 'center', gap: 8 },
  iniDayLabel: { fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: '700', marginBottom: 4 },
  iniDayLabelHoy: { color: '#fff' },
  iniDayDot: { width: 30, height: 30, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' },
  iniDayDotDone: { backgroundColor: accent, borderColor: accent },
  iniDayDotHoy: { borderColor: accent, borderWidth: 1, backgroundColor: `rgba(${rgb},0.12)` },
  iniDayDotFuturo: { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.12)', borderStyle: 'dashed' },
  iniDayDotDescanso: { backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' },
  iniDayDotCenter: { width: 8, height: 8, borderRadius: 4, backgroundColor: accent },
  iniCardHoy: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 20, padding: 18, marginBottom: 16 },
  iniCardHoyTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  iniCardHoyLabel: { fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, fontWeight: '700', marginBottom: 6 },
  iniCardHoyTitulo: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 4 },
  iniCardHoySub: { fontSize: 13, color: 'rgba(255,255,255,0.4)' },
  iniCardHoyBadge: { backgroundColor: `rgba(${rgb},0.08)`, borderWidth: 0.5, borderColor: `rgba(${rgb},0.4)`, borderRadius: 12, padding: 10, alignItems: 'center', minWidth: 52 },
  iniCardHoyBadgeNum: { fontSize: 20, fontWeight: '700', color: accent },
  iniCardHoyBadgeLabel: { fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  iniStartBtn: { borderRadius: 12, overflow: 'hidden' },
  iniStartGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, gap: 8 },
  iniStartText: { color: '#fff', fontWeight: '700', fontSize: 13, letterSpacing: 2 },
  iniDescansoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 12, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.05)' },
  iniDescansoText: { color: 'rgba(255,255,255,0.4)', fontWeight: '700', fontSize: 13, letterSpacing: 2 },
  iniMetricasRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  iniMetricaCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 16, padding: 14, alignItems: 'center' },
  iniMetricaIcon: { fontSize: 20, marginBottom: 6 },
  iniMetricaNum: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 2 },
  iniMetricaLabel: { fontSize: 10, color: 'rgba(255,255,255,0.4)', textAlign: 'center' },
  iniSection: { marginBottom: 16 },
  iniSectionLabel: { fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 3, fontWeight: '700', marginBottom: 8 },
  iniSemanaCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 20, padding: 16 },
  iniBarrasRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 80, marginBottom: 12 },
  iniBarraCol: { flex: 1, alignItems: 'center', gap: 6 },
  iniBarraTrack: { flex: 1, width: '65%', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden', justifyContent: 'flex-end' },
  iniBarraFill: { width: '100%' },
  iniSemanaFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.08)' },
  iniBarraDia: { fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: '700' },
  iniBarraDiaHoy: { color: accent },

  iniSemanaFooterText: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  iniSemanaFooterNum: { fontSize: 12, color: accent, fontWeight: '700' },
  iniCoachCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 20, padding: 14, gap: 12 },
  iniCoachAvatar: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' },
  iniCoachAvatarText: { color: 'rgba(255,255,255,0.4)', fontWeight: '700', fontSize: 18 },
  iniCoachInfo: { flex: 1 },
  iniCoachNombre: { color: '#fff', fontWeight: '700', fontSize: 14, marginBottom: 2 },
  iniCoachSub: { color: 'rgba(255,255,255,0.4)', fontSize: 11 },
  iniCoachBtn: { paddingHorizontal: 14, paddingVertical: 8, borderWidth: 0.5, borderColor: `rgba(${rgb},0.4)`, borderRadius: 10 },
  iniCoachBtnText: { color: accent, fontWeight: '700', fontSize: 12 },
  iniMsgCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 16, padding: 14, marginBottom: 0 },
  iniMsgText: { color: 'rgba(255,255,255,0.4)', fontSize: 13 },
  iniMsgDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: accent, marginLeft: 8 },
  iniSectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  iniBadgeRojo: { backgroundColor: 'rgba(255,51,85,0.15)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  iniBadgeRojoText: { color: '#ff3355', fontSize: 9, fontWeight: '700' },
  iniSubCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,102,0,0.08)', borderWidth: 0.5, borderColor: 'rgba(255,102,0,0.4)', borderRadius: 20, padding: 14 },
  iniSubInfo: { flex: 1 },
  iniSubTitulo: { color: '#fff', fontWeight: '700', fontSize: 15, marginBottom: 2 },
  iniSubSub: { color: '#ff6600', fontSize: 12 },
  iniSubBtn: { borderRadius: 10, overflow: 'hidden' },
  iniSubBtnGradient: { paddingHorizontal: 14, paddingVertical: 8 },
  iniSubBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  confirmBox: { backgroundColor: 'rgba(10,12,30,0.97)', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, borderWidth: 0.5, borderColor: 'rgba(255,51,85,0.4)' },
  confirmIcon: { fontSize: 40, textAlign: 'center', marginBottom: 12 },
  confirmTitulo: { fontSize: 20, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 8 },
  confirmSub: { fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  confirmEliminarBtn: { flex: 1, borderRadius: 16, overflow: 'hidden' },
  confirmEliminarGradient: { padding: 14, alignItems: 'center' },
  confirmEliminarText: { color: '#fff', fontWeight: '700' },
}) }
