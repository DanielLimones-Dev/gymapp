// ============================================
// LISTA DE PROGRAMAS — Nivel superior de periodización
// Cada programa contiene múltiples bloques
// ============================================
import { useState, useRef, useEffect, useCallback , useContext } from 'react'
import { CoachThemeContext, hexToRgb } from '../../../lib/coachTheme'
import { useFocusEffect, useRoute } from '@react-navigation/native'
import {
  View, Text, StyleSheet, ScrollView,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Animated,
  Keyboard, Dimensions, Alert, Easing
} from 'react-native'

const SCREEN_HEIGHT = Dimensions.get('window').height
import { TouchableOpacity, Pressable } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import ManagedModal from '../../../components/ManagedModal'
import IAScreen from '../ia/IAScreen'
import { AntDesign } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import AppleBentoCard from '../../../components/AppleBentoCard'
import { supabase } from '../../../lib/supabase'
import { guardarYSincronizar, cargarPrograma } from '../../../lib/storage'
import { rutinasNavigation } from '../../../lib/rutinasRef'
import { LAYOUT } from '../../../components/constans'
import DraggableSheet from '../../../components/DraggableSheet'
import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system/legacy'
import * as XLSX from 'xlsx'
import { excelAPrograma, procesarExcelParaIA } from '../../../lib/excelImport'

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
  const { accentColor } = useContext(CoachThemeContext)
  const calRgb = hexToRgb(accentColor)
  const [año, mes, dia] = (fechaInicio || new Date().toISOString().split('T')[0]).split('-').map(Number)
  const fechaSeleccionada = new Date(año, mes - 1, dia)
  const [mesActual, setMesActual] = useState(new Date(fechaSeleccionada))
  const hoy = new Date()

  const primerDia = new Date(mesActual.getFullYear(), mesActual.getMonth(), 1)
  const ultimoDia = new Date(mesActual.getFullYear(), mesActual.getMonth() + 1, 0)
  const diasEnMes = ultimoDia.getDate()
  const primerDiaSemana = primerDia.getDay()
  const meses = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE']

  function cambiarMes(dir) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    const n = new Date(mesActual)
    n.setMonth(mesActual.getMonth() + dir)
    setMesActual(n)
  }

  function estaOcupada(d) {
    const fecha = new Date(mesActual.getFullYear(), mesActual.getMonth(), d)
    fecha.setHours(12, 0, 0, 0)
    return fechasOcupadas.some(({ inicio, fin }) => {
      const fIni = new Date(inicio); fIni.setHours(12,0,0,0)
      const fFin = new Date(fin); fFin.setHours(12,0,0,0)
      return fecha >= fIni && fecha <= fFin
    })
  }

  function seleccionarFecha(d) {
    if (estaOcupada(d)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      return
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    const nueva = new Date(mesActual.getFullYear(), mesActual.getMonth(), d)
    const a = nueva.getFullYear()
    const m = String(nueva.getMonth() + 1).padStart(2, '0')
    const ds = String(nueva.getDate()).padStart(2, '0')
    onSeleccionar(`${a}-${m}-${ds}`)
    onCerrar()
  }

  return (
    <View style={styles.calWrapper}>
      <View style={styles.calNav}>
        <TouchableOpacity onPress={() => cambiarMes(-1)} style={styles.calNavBtn}>
          <AntDesign name="left" size={14} color={accentColor} />
        </TouchableOpacity>
        <Text style={styles.calMesText}>{meses[mesActual.getMonth()]} {mesActual.getFullYear()}</Text>
        <TouchableOpacity onPress={() => cambiarMes(1)} style={styles.calNavBtn}>
          <AntDesign name="right" size={14} color={accentColor} />
        </TouchableOpacity>
      </View>

      <View style={styles.calWeekHeader}>
        {['D','L','M','M','J','V','S'].map((d, i) => (
          <Text key={i} style={styles.calWeekText}>{d}</Text>
        ))}
      </View>

      <View style={styles.calGrid}>
        {Array.from({ length: primerDiaSemana }).map((_, i) => (
          <View key={`e-${i}`} style={styles.calDayBox} />
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
                styles.calDayBox,
                esHoy && styles.calDayHoy,
                esHoy && { backgroundColor: `rgba(${calRgb},0.1)`, borderColor: `rgba(${calRgb},0.3)` },
                esSel && styles.calDaySel,
                esSel && { backgroundColor: accentColor },
                ocupada && styles.calDayOcupado,
              ]}
              onPress={() => seleccionarFecha(d)}
              activeOpacity={ocupada ? 1 : 0.7}
            >
              <Text style={[
                styles.calDayText,
                esHoy && styles.calDayHoyText,
                esHoy && { color: accentColor },
                esSel && styles.calDaySelText,
                ocupada && styles.calDayOcupadoText,
              ]}>
                {d}
              </Text>
              {esHoy && !esSel && <View style={[styles.calHoyDot, { backgroundColor: accentColor }]} />}
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

export default function ListaProgramas({ navigation }) {
  const { gradColors, accentColor } = useContext(CoachThemeContext)
  const acRgb = hexToRgb(accentColor)
  const route = useRoute()
  const clienteId = route.params?.clienteId
  const nombreCliente = route.params?.nombreCliente
  const esCoach = route.params?.esCoach ?? false

  const [programa, setPrograma] = useState(PROGRAMA_INICIAL)
  const [userId, setUserId] = useState(null)
  const [myId, setMyId] = useState(null) // ID real del usuario logueado
  const [cargando, setCargando] = useState(true)
  const [modalVisible, setModalVisible] = useState(false)
  const [iaAbierto, setIaAbierto] = useState(false)
  const [importandoExcel, setImportandoExcel] = useState(false)
  const [importPreview, setImportPreview] = useState(null) // { nombrePrograma, descripcion, bloques[] }
  const [mesocicloIdx, setMesocicloIdx] = useState(0)
  const importWorkbookRef = useRef(null)
  const importBloquesBranchRef = useRef([]) // [{nombre, datos}] por hoja
  const [programaEditando, setProgramaEditando] = useState(null)
  const [kbHeight, setKbHeight] = useState(0)

  useEffect(() => {
    if (!modalVisible) { setKbHeight(0); return }
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'
    const subShow = Keyboard.addListener(showEvent, e => setKbHeight(e.endCoordinates.height))
    const subHide = Keyboard.addListener(hideEvent, () => setKbHeight(0))
    return () => { subShow.remove(); subHide.remove() }
  }, [modalVisible])
  const [nuevoPrograma, setNuevoPrograma] = useState({
    nombre: '',
    objetivo: 'hipertrofia',
    duracionSemanas: '',
    fechaInicio: new Date().toISOString().split('T')[0]
  })
  const [programaAEliminar, setProgramaAEliminar] = useState(null)
  const [archivadosAbierto, setArchivadosAbierto] = useState(false)
  const archivadosAnim = useRef(new Animated.Value(0)).current

  const [btnTooltip, setBtnTooltip] = useState(null) // { label, desc, y }
  const tooltipAnim = useRef(new Animated.Value(0)).current
  const tooltipTimer = useRef(null)
  const btnCloseRef = useRef(null)
  const btnInboxRef = useRef(null)
  const btnBulbRef  = useRef(null)
  const btnDlRef    = useRef(null)
  const btnPlusRef  = useRef(null)

  function showTooltip(ref, label, desc) {
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    ref.current?.measureInWindow((x, y) => {
      tooltipAnim.setValue(0)
      setBtnTooltip({ label, desc, y })
      Animated.timing(tooltipAnim, {
        toValue: 1, duration: 320,
        easing: Easing.out(Easing.back(1.4)),
        useNativeDriver: true,
      }).start()
      tooltipTimer.current = setTimeout(() => {
        Animated.timing(tooltipAnim, {
          toValue: 0, duration: 180,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }).start(() => setBtnTooltip(null))
      }, 3500)
    })
  }

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

  // Exportar una función global para que CoachDashboard pueda inyectar al cliente elegido
  useEffect(() => {
    rutinasNavigation.setCliente = (id, nombre) => {
      navigation.setParams({ clienteId: id, nombreCliente: nombre })
    }
    // Si había un cliente pendiente (navegación antes de que esta pantalla se montara), aplicarlo ahora
    if (rutinasNavigation.pendingCliente) {
      const { id, nombre } = rutinasNavigation.pendingCliente
      rutinasNavigation.pendingCliente = null
      navigation.setParams({ clienteId: id, nombreCliente: nombre })
    }
  }, [navigation])

  // Exponer recarga forzada para que IAScreen la llame tras guardar un programa
  useEffect(() => {
    rutinasNavigation.recargar = () => cargarTodo(false)
    if (rutinasNavigation.pendingRecargar) {
      rutinasNavigation.pendingRecargar = false
      cargarTodo(false)
    }
    return () => { rutinasNavigation.recargar = null }
  }, [cargarTodo])

  // Cargar usuario Y programa juntos
  const cargarTodo = useCallback(async (mostrarLoader = false) => {
    if (mostrarLoader && programa.programas.length === 0) {
      setCargando(true)
    }
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setCargando(false); return }
    
    const targetUserId = clienteId || user.id
    setUserId(targetUserId)
    setMyId(user.id)
    
    const local = await cargarPrograma(targetUserId)
    if (local) {
      if (!local.programas) local.programas = []
      if (!local.dias) local.dias = {}
      setPrograma(local)
    }
    setCargando(false)
  }, [clienteId, programa.programas.length])

  // Al montar o cambiar cliente
  useEffect(() => {
    cargarTodo(true)
  }, [clienteId])

  // Al recibir foco
  useFocusEffect(
    useCallback(() => {
      // Si ya tenemos programas, no tocamos el estado de 'cargando'
      // Esto evita que la pantalla parpadee al volver atrás
      if (userId) {
        if (programa.programas.length > 0) {
          // Carga silenciosa en segundo plano
          cargarPrograma(userId).then(local => {
            if (local && JSON.stringify(local.programas) !== JSON.stringify(programa.programas)) {
              setPrograma(local)
            }
          })
        } else {
          cargarTodo(true)
        }
      }
    }, [userId, programa.programas.length, cargarTodo])
  )

  // Garantizar que rutinasNavigation.ref esté disponible desde el montaje.
  useEffect(() => {
    rutinasNavigation.ref = navigation
    rutinasNavigation.rootRef = navigation
    return () => { rutinasNavigation.rootRef = null }
  }, [navigation])

  // Navegación pendiente — solo para el montaje inicial (fallback)
  useEffect(() => {
    if (!userId) return
    const nav = rutinasNavigation.pendingNav
    if (nav) {
      rutinasNavigation.pendingNav = null
      setTimeout(() => navigation.navigate('Ejercicios', {
        bloqueId: nav.bloqueId,
        diaKey: nav.diaKey,
        userId: nav.userId, // Esto asegura que la navegación respete el owner
      }), 80)
    }
  }, [userId])

  async function importarExcel() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'text/csv',
        ],
        copyToCacheDirectory: true,
      })
      if (result.canceled) return
      const asset = result.assets[0]
      setImportandoExcel(true)
      await new Promise(r => setTimeout(r, 50))
      try {
        let uri = asset.uri
        if (uri.startsWith('content://')) {
          const localUri = FileSystem.cacheDirectory + (asset.name || 'temp.xlsx')
          await FileSystem.copyAsync({ from: uri, to: localUri })
          uri = localUri
        }
        const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' })
        const workbook = XLSX.read(base64, { type: 'base64' })
        importWorkbookRef.current = workbook

        // Detectar hojas con estructura Día X (mesociclos)
        const bloques = workbook.SheetNames
          .filter(name => {
            const ws = workbook.Sheets[name]
            const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: false })
            return rows.some(r => /^Día\s*\d+/i.test(String(r[0]).trim()))
          })
          .map(name => ({ nombre: name, datos: excelAPrograma(workbook, name) }))

        if (bloques.length === 0) {
          Alert.alert('Sin estructura reconocida', 'No se detectaron días de entrenamiento (Día 1, Día 2…). Usa la función IA para formatos libres.')
          return
        }

        importBloquesBranchRef.current = bloques
        setMesocicloIdx(0)
        setImportPreview(bloques[0].datos)
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      } catch (e) {
        Alert.alert('Error', `No se pudo leer el archivo: ${e?.message || 'error desconocido'}`)
      } finally {
        setImportandoExcel(false)
      }
    } catch (e) {
      if (e?.message?.includes('native module') || e?.message?.includes('ExpoDocumentPicker')) {
        Alert.alert('Requiere build nativo', 'Para importar Excel necesitas: npx expo run:android (no funciona con Expo Go).')
      }
    }
  }

  async function aplicarExcel() {
    if (!importPreview) return
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    try {
      const datos = importPreview
      const duracion = datos.bloques.reduce((sum, b) => sum + (b.semanas || 1), 0)
      const progActual = await cargarPrograma(userId)
      const programasExistentes = progActual?.programas || []
      let fechaInicioDate = new Date()
      programasExistentes.forEach(p => {
        if (p.fechaFin) {
          const fin = new Date(p.fechaFin + 'T12:00:00')
          fin.setDate(fin.getDate() + 1)
          if (fin > fechaInicioDate) fechaInicioDate = fin
        }
      })
      const fechaInicio = fechaInicioDate.toISOString().split('T')[0]
      const fechaFinDate = new Date(fechaInicioDate)
      fechaFinDate.setDate(fechaFinDate.getDate() + duracion * 7)

      const nuevoProg = {
        id: Date.now().toString(),
        nombre: datos.nombrePrograma,
        objetivo: 'hipertrofia',
        estado: 'activo',
        fechaInicio,
        fechaFin: fechaFinDate.toISOString().split('T')[0],
        duracionSemanas: duracion,
        semanas: duracion,
        bloques: datos.bloques.map((b, i) => ({
          id: `bloque_${Date.now()}_${i}`,
          nombre: b.nombre,
          tipo: b.tipo,
          semanas: b.semanas,
          orden: i,
        }))
      }

      const programas = [...programasExistentes, nuevoProg]
      const dias = { ...progActual?.dias }
      nuevoProg.bloques.forEach((bloque, bi) => {
        const bloqueData = datos.bloques[bi]
        Object.entries(bloqueData.ejerciciosPorDia || {}).forEach(([diaIdx, ejercs]) => {
          dias[`ejercicios_${bloque.id}_${diaIdx}`] = ejercs
        })
        dias[`dias_${bloque.id}`] = Object.keys(bloqueData.ejerciciosPorDia || {}).map(Number)
        if (bloqueData.etiquetasPorDia) {
          dias[`etiquetas_${bloque.id}`] = bloqueData.etiquetasPorDia
        }
      })

      await guardarYSincronizar(userId, { programas, dias })
      setImportPreview(null)
      importWorkbookRef.current = null
      importBloquesBranchRef.current = []
      cargarTodo(false)
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar el programa.')
    }
  }

  function abrirModalNuevo() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
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
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

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
    
    // Cerrar y resetear inmediatamente para mejor respuesta visual
    setModalVisible(false)
    setProgramaEditando(null)
    const objetivoDefault = OBJETIVOS.find(o => o.key === 'hipertrofia')
    setNuevoPrograma({ 
      nombre: '', 
      objetivo: 'hipertrofia', 
      duracionSemanas: objetivoDefault.duracionDefault.toString(),
      fechaInicio: new Date().toISOString().split('T')[0]
    })

    // Guardar en segundo plano
    await guardarYSincronizar(userId, nuevoProgramaData)
  }

  async function archivarPrograma(id) {
    const nuevosProgramas = programa.programas.map(p =>
      p.id === id ? { ...p, estado: 'archivado', fechaArchivado: new Date().toISOString() } : p
    )
    const nuevoProgramaData = { ...programa, programas: nuevosProgramas }
    setPrograma(nuevoProgramaData)
    await guardarYSincronizar(userId, nuevoProgramaData)
    rutinasNavigation.recargarInicio?.()
  }

  async function eliminarPrograma(id) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
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
    rutinasNavigation.recargarInicio?.()
  }

  async function cambiarEstado(programaId, nuevoEstado) {
    const nuevosProgramas = programa.programas.map(p =>
      p.id === programaId ? { ...p, estado: nuevoEstado } : p
    )
    const nuevoProgramaData = { ...programa, programas: nuevosProgramas }
    setPrograma(nuevoProgramaData)
    await guardarYSincronizar(userId, nuevoProgramaData)
    rutinasNavigation.recargarInicio?.()
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
    if (prog.fechaInicio && prog.duracionSemanas) {
      const inicio = new Date(prog.fechaInicio)
      const hoy = new Date()
      const diasTranscurridos = Math.floor((hoy - inicio) / (1000 * 60 * 60 * 24))
      return Math.max(0, Math.min(100, Math.round((diasTranscurridos / (prog.duracionSemanas * 7)) * 100)))
    }
    if (!prog.bloques || prog.bloques.length === 0) return 0
    const semanasCompletadas = prog.bloques
      .filter(b => b.completado)
      .reduce((acc, b) => acc + (b.semanas || 0), 0)
    return Math.min(100, Math.round((semanasCompletadas / prog.duracionSemanas) * 100))
  }

  const programasActivos = (programa.programas?.filter(p => p.estado === 'activo') || [])
    .sort((a, b) => {
      if (!a.fechaInicio && !b.fechaInicio) return 0
      if (!a.fechaInicio) return 1
      if (!b.fechaInicio) return -1
      return new Date(a.fechaInicio) - new Date(b.fechaInicio)
    })
  const programasCompletados = programa.programas?.filter(p => p.estado === 'completado') || []
  const programasArchivados = programa.programas?.filter(p => p.estado === 'archivado') || []

  const totalProgramas = programa.programas?.length || 0

  if (cargando && totalProgramas === 0) return (
    <LinearGradient colors={gradColors} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator color={accentColor} size="large" />
    </LinearGradient>
  )

  return (
    <LinearGradient colors={gradColors} style={styles.gradient}>
      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: LAYOUT.bottomTabSpace }]} showsVerticalScrollIndicator={false}>

        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            {clienteId ? (
              <View>
                <Text style={[styles.saludo, { color: '#ff9900' }]}>Rutina de Cliente</Text>
                <Text style={styles.fecha}>{nombreCliente}</Text>
              </View>
            ) : (
              <View>
                <Text style={styles.saludo}>Mis Rutinas</Text>
                <Text style={styles.fecha}>Periodización y progreso</Text>
              </View>
            )}
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {clienteId && (
              <TouchableOpacity ref={btnCloseRef} style={styles.addButton}
                onPress={() => navigation.setParams({ clienteId: null, nombreCliente: null })}
                onLongPress={() => showTooltip(btnCloseRef, 'Desvincular cliente', 'Vuelve a ver tus propias rutinas')}
                delayLongPress={400}
              >
                <AntDesign name="close" size={20} color="#ff9900" />
              </TouchableOpacity>
            )}
            {programasArchivados.length > 0 && (
              <TouchableOpacity ref={btnInboxRef} style={styles.addButton} onPress={toggleArchivados}
                onLongPress={() => showTooltip(btnInboxRef, 'Programas archivados', 'Programas guardados fuera de la vista principal')}
                delayLongPress={400}
              >
                <AntDesign name="inbox" size={20} color={accentColor} />
                {programasArchivados.length > 0 && !archivadosAbierto && (
                  <View style={[styles.archivadosBadge, { backgroundColor: accentColor, top: -2, right: -2 }]}>
                    <Text style={styles.archivadosBadgeText}>{programasArchivados.length}</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
            <TouchableOpacity ref={btnBulbRef} style={styles.addButton} activeOpacity={0.7}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setIaAbierto(true) }}
              onLongPress={() => showTooltip(btnBulbRef, 'Asistente IA', 'Genera y ajusta rutinas con inteligencia artificial')}
              delayLongPress={400}
            >
              <AntDesign name="bulb" size={20} color={accentColor} />
            </TouchableOpacity>
            <TouchableOpacity ref={btnDlRef} style={styles.addButton} onPress={importarExcel} disabled={importandoExcel} activeOpacity={0.7}
              onLongPress={() => showTooltip(btnDlRef, 'Importar Excel', 'Convierte un archivo .xlsx en un programa completo')}
              delayLongPress={400}
            >
              {importandoExcel
                ? <ActivityIndicator size={18} color={accentColor} />
                : <AntDesign name="download" size={20} color={accentColor} />
              }
            </TouchableOpacity>
            <TouchableOpacity ref={btnPlusRef} style={styles.addButton} onPress={abrirModalNuevo} activeOpacity={0.7}
              onLongPress={() => showTooltip(btnPlusRef, 'Nuevo programa', 'Crea un programa de entrenamiento con periodización')}
              delayLongPress={400}
            >
              <AntDesign name="plus" size={22} color={accentColor} />
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
                  activeOpacity={0.85}
                >
                  {/* Header */}
                  <View style={styles.programaHeader}>
                    <View style={[styles.objetivoBadge, { borderColor: objetivo.color + '44', backgroundColor: objetivo.color + '15' }]}>
                      <Text style={[styles.objetivoText, { color: objetivo.color }]}>
                        {objetivo.label.toUpperCase()}
                      </Text>
                    </View>
                    <View style={[styles.estadoBadge, { backgroundColor: `rgba(${acRgb},0.1)`, borderColor: `rgba(${acRgb},0.3)` }]}>
                      <View style={[styles.estadoDot, { backgroundColor: accentColor }]} />
                      <Text style={[styles.estadoText, { color: accentColor }]}>ACTIVO</Text>
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
                      <Text style={[styles.programaInfoText, { marginTop: 4 }]}>
                        {(() => {
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
                          <Text style={[styles.programaInfoText, { color: accentColor, fontWeight: '700', marginTop: 4 }]}>
                            Semana {semanaActual} de {prog.duracionSemanas}
                          </Text>
                        )
                      }
                      return null
                    })()}
                  </View>

                  {/* Progreso */}
                  <View style={styles.progresoContainer}>
                    <View style={styles.progresoInfo}>
                      <Text style={styles.progresoLabel}>Progreso total</Text>
                      <Text style={[styles.progresoNum, { color: accentColor }]}>{Math.round(progreso)}%</Text>
                    </View>
                    <View style={styles.progresoTrack}>
                      <View style={[styles.progresoFill, { width: `${progreso}%`, backgroundColor: accentColor }]} />
                    </View>
                  </View>

                  {/* Controles */}
                  <View style={styles.programaControles}>
                    <Pressable
                      style={({ pressed }) => [styles.controlBtnIcono, pressed && { opacity: 0.7 }]}
                      onPress={(e) => { e.stopPropagation(); abrirModalEditar(prog) }}
                    >
                      <AntDesign name="edit" size={18} color={accentColor} />
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [styles.controlBtnTexto, pressed && { opacity: 0.7 }]}
                      onPress={(e) => { e.stopPropagation(); cambiarEstado(prog.id, 'completado') }}
                    >
                      <AntDesign name="check-circle" size={14} color="#00cc44" />
                      <Text style={[styles.controlBtnText, { color: '#00cc44' }]}>Completar</Text>
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [styles.controlBtnTexto, pressed && { opacity: 0.7 }]}
                      onPress={(e) => { e.stopPropagation(); archivarPrograma(prog.id) }}
                    >
                      <AntDesign name="inbox" size={14} color={accentColor} />
                      <Text style={[styles.controlBtnText, { color: accentColor }]}>Archivar</Text>
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [styles.controlBtnIcono, pressed && { opacity: 0.7 }]}
                      onPress={(e) => { e.stopPropagation(); setProgramaAEliminar(prog) }}
                    >
                      <AntDesign name="delete" size={18} color="#ff3355" />
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
                  activeOpacity={0.85}
                >
                  <View style={styles.programaHeader}>
                    <View style={[styles.objetivoBadge, { borderColor: objetivo.color + '33', backgroundColor: objetivo.color + '10' }]}>
                      <Text style={[styles.objetivoText, { color: objetivo.color, opacity: 0.7 }]}>
                        {objetivo.label.toUpperCase()}
                      </Text>
                    </View>
                    <View style={[styles.estadoBadge, styles.estadoBadgeCompletado]}>
                      <AntDesign name="check-circle" size={10} color="#00cc44" />
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
                      style={styles.controlBtnTexto}
                      onPress={(e) => {
                        e.stopPropagation()
                        cambiarEstado(prog.id, 'activo')
                      }}
                    >
                      <AntDesign name="reload" size={14} color={accentColor} />
                      <Text style={[styles.controlBtnText, { color: accentColor }]}>Reactivar</Text>
                    </TouchableOpacity>
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation()
                        setProgramaAEliminar(prog)
                      }}
                      style={({ pressed }) => [styles.controlBtnIcono, pressed && { opacity: 0.7 }]}
                    >
                      <AntDesign name="delete" size={18} color="#ff3355" />
                    </Pressable>
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
                  <Text style={styles.archivadosLabel}>ARCHIVADOS ({programasArchivados.length})</Text>
                </View>
            {programasArchivados.map((prog) => {
              const objetivo = OBJETIVOS.find(o => o.key === prog.objetivo) || OBJETIVOS[0]
              return (
                <View key={prog.id} style={styles.archivadoCard}>
                  <View style={styles.programaHeader}>
                    <View style={[styles.objetivoBadge, { borderColor: 'rgba(255,255,255,0.05)', backgroundColor: 'transparent' }]}>
                      <Text style={[styles.objetivoText, { color: '#8E8E93' }]}>{objetivo.label.toUpperCase()}</Text>
                    </View>
                    <View style={[styles.estadoBadge, { backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)' }]}>
                      <Text style={[styles.estadoText, { color: '#8E8E93' }]}>ARCHIVADO</Text>
                    </View>
                  </View>
                  <Text style={[styles.programaNombre, { color: 'rgba(255,255,255,0.5)' }]}>{prog.nombre}</Text>
                  {prog.fechaArchivado && (
                    <Text style={styles.archivadoFecha}>
                      Archivado el {new Date(prog.fechaArchivado).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                    </Text>
                  )}
                  <View style={styles.programaControles}>
                    <TouchableOpacity
                      style={styles.controlBtnTexto}
                      onPress={() => cambiarEstado(prog.id, 'activo')}
                    >
                      <AntDesign name="reload" size={14} color={accentColor} />
                      <Text style={[styles.controlBtnText, { color: accentColor }]}>Reactivar</Text>
                    </TouchableOpacity>
                    <Pressable
                      onPress={() => setProgramaAEliminar(prog)}
                      style={({ pressed }) => [styles.controlBtnIcono, pressed && { opacity: 0.7 }]}
                    >
                      <AntDesign name="delete" size={18} color="#ff3355" />
                    </Pressable>
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
              <LinearGradient colors={[accentColor, accentColor]} style={styles.emptyButtonGradient}>
                <Text style={styles.emptyButtonText}>+ Crear programa</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* MODAL ELIMINAR */}
        <ManagedModal visible={!!programaAEliminar} transparent animationType="fade">
          <Pressable style={{ flex: 1, backgroundColor: 'rgba(0, 2, 15, 0.85)', justifyContent: 'center', alignItems: 'center' }} onPress={() => setProgramaAEliminar(null)}>
            <View style={{ width: 290, backgroundColor: 'rgba(10, 15, 35, 0.95)', borderRadius: 22, borderWidth: 1, borderColor: 'rgba(68, 136, 255, 0.2)', overflow: 'hidden' }} onStartShouldSetResponder={() => true}>
              <View style={{ paddingTop: 24, paddingBottom: 22, paddingHorizontal: 20, alignItems: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#ffffff', textAlign: 'center', marginBottom: 8, letterSpacing: -0.2 }}>¿Qué deseas hacer?</Text>
                <Text style={{ fontSize: 13, fontWeight: '500', color: '#aaccff', textAlign: 'center', lineHeight: 18 }}>
                  "{programaAEliminar?.nombre}"
                </Text>
              </View>

              <View style={{ height: 1, backgroundColor: 'rgba(68, 136, 255, 0.15)' }} />

              <Pressable
                style={({ pressed }) => [{ height: 52, justifyContent: 'center', alignItems: 'center' }, pressed && { backgroundColor: 'rgba(68, 136, 255, 0.1)' }]}
                onPress={() => { archivarPrograma(programaAEliminar.id); setProgramaAEliminar(null) }}
              >
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#4488ff' }}>Archivar (Mantiene historial)</Text>
              </Pressable>

              <View style={{ height: 1, backgroundColor: 'rgba(68, 136, 255, 0.15)' }} />

              <View style={{ flexDirection: 'row', height: 52 }}>
                <Pressable
                  style={({ pressed }) => [{ flex: 1, justifyContent: 'center', alignItems: 'center' }, pressed && { backgroundColor: 'rgba(68, 136, 255, 0.1)' }]}
                  onPress={() => setProgramaAEliminar(null)}
                >
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#aaccff' }}>Cancelar</Text>
                </Pressable>

                <View style={{ width: 1, backgroundColor: 'rgba(68, 136, 255, 0.15)' }} />

                <Pressable
                  style={({ pressed }) => [{ flex: 1, justifyContent: 'center', alignItems: 'center' }, pressed && { backgroundColor: 'rgba(68, 136, 255, 0.1)' }]}
                  onPress={() => { eliminarPrograma(programaAEliminar.id); setProgramaAEliminar(null) }}
                >
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#ff3355' }}>Eliminar</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </ManagedModal>

        {/* MODAL CREAR/EDITAR */}
        <ManagedModal visible={modalVisible} transparent animationType="none">
          <DraggableSheet
            onClose={() => { setModalVisible(false); setProgramaEditando(null) }}
            scrollable={true}
            gradientColors={gradColors}
            containerStyle={{ borderColor: `rgba(${acRgb},0.22)`, marginBottom: kbHeight, maxHeight: kbHeight > 0 ? SCREEN_HEIGHT - kbHeight - 40 : '92%' }}
            header={
              <View style={{ marginBottom: 20 }}>
                <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: -0.3 }}>
                  {programaEditando ? 'Editar Programa' : 'Nuevo Programa'}
                </Text>
              </View>
            }
          >
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              {/* Nombre */}
              <Text style={[styles.modalLabel, { color: `rgba(${acRgb},0.6)` }]}>NOMBRE DEL PROGRAMA</Text>
              <View style={[styles.inputWrapper, { borderColor: `rgba(${acRgb},0.18)`, backgroundColor: `rgba(${acRgb},0.04)` }]}>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: Hipertrofia Q1"
                  placeholderTextColor={`rgba(${acRgb},0.25)`}
                  value={nuevoPrograma.nombre}
                  onChangeText={t => setNuevoPrograma(p => ({ ...p, nombre: t }))}
                />
              </View>

              {/* Objetivo */}
              <Text style={[styles.modalLabel, { color: `rgba(${acRgb},0.6)` }]}>OBJETIVO PRINCIPAL</Text>
              <View style={styles.objetivosRow}>
                {OBJETIVOS.map(obj => (
                  <TouchableOpacity
                    key={obj.key}
                    style={[
                      styles.objetivoBtn,
                      { borderColor: `rgba(${acRgb},0.12)`, backgroundColor: `rgba(${acRgb},0.04)` },
                      nuevoPrograma.objetivo === obj.key && { borderColor: accentColor, backgroundColor: accentColor + '22' }
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                      cambiarObjetivo(obj.key)
                    }}
                  >
                    <Text style={[
                      styles.objetivoBtnText,
                      { color: `rgba(${acRgb},0.45)` },
                      nuevoPrograma.objetivo === obj.key && { color: accentColor, fontWeight: '800' }
                    ]}>
                      {obj.label.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Duración */}
              <Text style={[styles.modalLabel, { color: `rgba(${acRgb},0.6)` }]}>DURACIÓN (SEMANAS)</Text>
              <View style={[styles.duracionRow, { backgroundColor: `rgba(${acRgb},0.04)`, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: `rgba(${acRgb},0.18)`, justifyContent: 'space-between' }]}>
                <TouchableOpacity
                  onPress={() => setNuevoPrograma(p => ({ ...p, duracionSemanas: Math.max(1, (parseInt(p.duracionSemanas) || 0) - 1).toString() }))}
                  style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' }}
                >
                  <AntDesign name="minus" size={18} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.duracionInfo}>{nuevoPrograma.duracionSemanas} SEMANAS</Text>
                <TouchableOpacity
                  onPress={() => setNuevoPrograma(p => ({ ...p, duracionSemanas: ((parseInt(p.duracionSemanas) || 0) + 1).toString() }))}
                  style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' }}
                >
                  <AntDesign name="plus" size={18} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* Fecha Inicio */}
              <Text style={[styles.modalLabel, { color: `rgba(${acRgb},0.6)` }]}>FECHA DE INICIO</Text>
              <TouchableOpacity
                style={[styles.fechaSelector, { borderColor: `rgba(${acRgb},0.18)`, backgroundColor: `rgba(${acRgb},0.04)` }]}
                onPress={() => setMostrarCalendario(true)}
              >
                <Text style={styles.fechaSelectorText}>
                  {new Date(nuevoPrograma.fechaInicio + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                </Text>
                <AntDesign name="calendar" size={18} color={accentColor} />
              </TouchableOpacity>

              {/* Info adicional */}
              {(() => {
                const obj = OBJETIVOS.find(o => o.key === nuevoPrograma.objetivo)
                const duracion = parseInt(nuevoPrograma.duracionSemanas) || 0
                if (obj && duracion > 0) {
                  if (duracion < obj.duracionMin) {
                    return (
                      <View style={styles.alertaBox}>
                        <Text style={styles.alertaText}>
                          Sugerencia: Este objetivo suele requerir al menos {obj.duracionMin} semanas.
                        </Text>
                      </View>
                    )
                  } else if (duracion > obj.duracionMax) {
                    return (
                      <View style={styles.alertaBox}>
                        <Text style={styles.alertaText}>
                          Sugerencia: Se recomienda un máximo de {obj.duracionMax} semanas para este objetivo.
                        </Text>
                      </View>
                    )
                  }
                }
                return null
              })()}

              {/* Fecha fin calculada */}
              {nuevoPrograma.fechaInicio && nuevoPrograma.duracionSemanas && (
                <View style={[styles.fechaFinBox, { backgroundColor: `rgba(${acRgb},0.05)`, borderColor: `rgba(${acRgb},0.1)` }]}>
                  <Text style={styles.fechaFinLabel}>FINALIZACIÓN ESTIMADA</Text>
                  <Text style={[styles.fechaFinText, { color: accentColor }]}>
                    {(() => {
                      const [año, mes, dia] = nuevoPrograma.fechaInicio.split('-').map(Number)
                      const inicio = new Date(año, mes - 1, dia)
                      const fin = new Date(inicio)
                      fin.setDate(fin.getDate() + (parseInt(nuevoPrograma.duracionSemanas) * 7))
                      return fin.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()
                    })()}
                  </Text>
                </View>
              )}

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalCancelar, { borderColor: `rgba(${acRgb},0.12)`, backgroundColor: `rgba(${acRgb},0.04)` }]}
                  onPress={() => { setModalVisible(false); setProgramaEditando(null) }}
                >
                  <Text style={[styles.modalCancelarText, { color: `rgba(${acRgb},0.6)` }]}>CANCELAR</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalGuardar} onPress={guardarPrograma}>
                  <LinearGradient colors={[accentColor, accentColor + 'cc']} style={styles.modalGuardarGradient}>
                    <Text style={styles.modalGuardarText}>
                      {programaEditando ? 'GUARDAR' : 'CREAR'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </DraggableSheet>
        </ManagedModal>

        {/* Modal Calendario */}
        <ManagedModal visible={mostrarCalendario} transparent animationType="fade">
          <View style={styles.calendarioOverlay}>
            <View style={styles.calendarioModal}>
              <View style={styles.calendarioHeader}>
                <Text style={styles.calendarioTitulo}>Fecha de inicio</Text>
                <TouchableOpacity onPress={() => setMostrarCalendario(false)} style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' }}>
                  <AntDesign name="close" size={16} color="#fff" />
                </TouchableOpacity>
              </View>

              <CalendarioSelector
                fechaInicio={nuevoPrograma.fechaInicio}
                onSeleccionar={(fecha) => {
                  setNuevoPrograma(p => ({ ...p, fechaInicio: fecha }))
                  setMostrarCalendario(false)
                }}
                onCerrar={() => setMostrarCalendario(false)}
                fechasOcupadas={programa.programas
                  .filter(p => p.fechaInicio && p.fechaFin && (!programaEditando || p.id !== programaEditando.id))
                  .map(p => ({
                    inicio: new Date(p.fechaInicio + 'T12:00:00'),
                    fin: new Date(p.fechaFin + 'T12:00:00')
                  }))}
              />
            </View>
          </View>
        </ManagedModal>

      {/* MODAL PREVIEW IMPORTACIÓN EXCEL */}
      <ManagedModal visible={!!importPreview} transparent animationType="none">
        <DraggableSheet onClose={() => { setImportPreview(null) }} scrollable gradientColors={gradColors} containerStyle={{ borderColor: `rgba(${acRgb},0.22)` }}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <AntDesign name="download" size={18} color={accentColor} />
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>
                {importPreview?.nombrePrograma || 'Excel importado'}
              </Text>
            </View>

            {/* Selector mesociclo si hay varios */}
            {importBloquesBranchRef.current.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 16 }}>
                {importBloquesBranchRef.current.map((b, i) => {
                  const activo = mesocicloIdx === i
                  return (
                    <TouchableOpacity
                      key={i}
                      onPress={() => { setMesocicloIdx(i); setImportPreview(b.datos) }}
                      style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: activo ? accentColor : 'rgba(255,255,255,0.15)', backgroundColor: activo ? `rgba(${acRgb},0.12)` : 'transparent' }}
                    >
                      <Text style={{ color: activo ? accentColor : 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: activo ? '700' : '400' }}>{b.nombre}</Text>
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>
            )}

            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 12 }}>
              {importPreview?.descripcion}
            </Text>

            {/* Lista de bloques */}
            {(importPreview?.bloques || []).map((b, i) => (
              <View key={i} style={{ backgroundColor: `rgba(${acRgb},0.06)`, borderWidth: 1, borderColor: `rgba(${acRgb},0.12)`, borderRadius: 12, padding: 12, marginBottom: 8 }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{b.nombre}</Text>
                <Text style={{ color: accentColor, fontSize: 11, marginTop: 2 }}>{b.tipo} · {b.semanas} sem · {Object.keys(b.ejerciciosPorDia || {}).length} días</Text>
                {Object.entries(b.ejerciciosPorDia || {}).map(([dia, ejs]) => (
                  <View key={dia} style={{ marginTop: 6 }}>
                    <Text style={{ color: `rgba(${acRgb},0.6)`, fontSize: 10, fontWeight: '700', marginBottom: 2 }}>
                      {b.etiquetasPorDia?.[dia] || `DÍA ${parseInt(dia)+1}`}
                    </Text>
                    {ejs.slice(0, 3).map((e, j) => (
                      <Text key={j} style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>· {e.nombre} {e.series}×{e.reps} RIR{e.rir}</Text>
                    ))}
                    {ejs.length > 3 && <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>+{ejs.length - 3} más</Text>}
                  </View>
                ))}
              </View>
            ))}

            <TouchableOpacity
              onPress={aplicarExcel}
              style={{ marginTop: 8, borderRadius: 16, overflow: 'hidden' }}
            >
              <LinearGradient colors={[accentColor, `rgba(${acRgb},0.7)`]} start={{x:0,y:0}} end={{x:1,y:1}} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16 }}>
                <AntDesign name="download" size={16} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>APLICAR PROGRAMA</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </DraggableSheet>
      </ManagedModal>

      {/* MODAL IA */}
      <ManagedModal visible={iaAbierto} transparent animationType="none">
        <DraggableSheet
          onClose={() => setIaAbierto(false)}
          scrollable
          gradientColors={gradColors}
          containerStyle={{ borderColor: `rgba(${acRgb},0.22)` }}
        >
          <IAScreen
            userId={userId}
            inModal
            onProgramaGenerado={() => {
              setIaAbierto(false)
              cargarTodo(false)
            }}
          />
        </DraggableSheet>
      </ManagedModal>

      </ScrollView>

      {/* TOOLTIP FLOTANTE — botones de acción */}
      {btnTooltip && (
        <Pressable
          style={[StyleSheet.absoluteFillObject, { zIndex: 999 }]}
          onPress={() => {
            clearTimeout(tooltipTimer.current)
            Animated.timing(tooltipAnim, { toValue: 0, duration: 180, easing: Easing.in(Easing.cubic), useNativeDriver: true })
              .start(() => setBtnTooltip(null))
          }}
        >
          <Animated.View style={{
            position: 'absolute',
            top: Math.max(btnTooltip.y - 100, 56),
            left: 20, right: 20,
            backgroundColor: '#0d1022',
            borderRadius: 14,
            borderWidth: 1,
            borderColor: `rgba(${acRgb},0.35)`,
            padding: 14,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.4,
            shadowRadius: 16,
            elevation: 16,
            opacity: tooltipAnim,
            transform: [
              { scale: tooltipAnim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
              { translateY: tooltipAnim.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) },
            ],
          }}>
            <Text style={{ color: accentColor, fontSize: 12, fontWeight: '800', marginBottom: 6 }}>
              {btnTooltip.label}
            </Text>
            <Text style={{ color: 'rgba(200,210,230,0.75)', fontSize: 12, lineHeight: 18 }}>
              {btnTooltip.desc}
            </Text>
          </Animated.View>
        </Pressable>
      )}

    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { padding: 20, paddingTop: 56, paddingBottom: LAYOUT.bottomTabSpace || 150},
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  saludo: { fontSize: 28, fontWeight: '900', color: '#fff' },
  fecha: { fontSize: 13, color: '#8E8E93', marginTop: 2, fontWeight: '500' },
  addButton: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },

  seccionLabel: { fontSize: 10, color: '#8E8E93', letterSpacing: 2, fontWeight: '800', marginBottom: 12, textTransform: 'uppercase' },

  // Programa Card
  programaCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 24, padding: 20, marginBottom: 16, overflow: 'hidden' },
  programaCompletado: { opacity: 0.7 },
  
  archivadosHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 4, marginTop: 8 },
  archivadosLabel: { flex: 1, color: '#8E8E93', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  archivadosBadge: { position: 'absolute', minWidth: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 },
  archivadosBadgeText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  
  archivadoCard: { backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', borderRadius: 20, padding: 16, marginBottom: 12 },
  archivadoFecha: { color: '#8E8E93', fontSize: 11, marginTop: 4, marginBottom: 12 },
  
  programaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },

  objetivoBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  objetivoText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

  estadoBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(68,136,255,0.1)', borderWidth: 1, borderColor: 'rgba(68,136,255,0.3)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  estadoDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4488ff' },
  estadoText: { fontSize: 9, color: '#4488ff', fontWeight: '800', letterSpacing: 0.5 },
  estadoBadgeCompletado: { borderColor: 'rgba(0,204,68,0.3)', backgroundColor: 'rgba(0,204,68,0.1)' },
  estadoTextCompletado: { color: '#00cc44' },

  programaNombre: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 6, letterSpacing: -0.5 },
  programaInfo: { marginBottom: 16 },
  programaInfoText: { fontSize: 13, color: '#8E8E93', fontWeight: '500' },

  // Progreso
  progresoContainer: { marginBottom: 16 },
  progresoInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progresoLabel: { fontSize: 11, color: '#8E8E93', fontWeight: '700' },
  progresoNum: { fontSize: 11, color: '#4488ff', fontWeight: '800' },
  progresoTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' },
  progresoFill: { height: '100%', borderRadius: 3 },

  // Controles
  programaControles: { flexDirection: 'row', gap: 10, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  controlBtnIcono: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.03)', justifyContent: 'center', alignItems: 'center' },
  controlBtnTexto: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, borderRadius: 12, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 12 },
  controlBtnText: { fontSize: 12, fontWeight: '800' },

  // Empty
  emptyBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginTop: 16, borderStyle: 'dashed' },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginTop: 16, marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#8E8E93', textAlign: 'center', marginBottom: 28, paddingHorizontal: 32, lineHeight: 22 },
  emptyButton: { borderRadius: 18, overflow: 'hidden' },
  emptyButtonGradient: { paddingHorizontal: 28, paddingVertical: 16 },
  emptyButtonText: { color: '#fff', fontWeight: '900', fontSize: 15, letterSpacing: 0.5 },

  // Modal (Centered look)
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 2, 15, 0.85)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: 'rgba(10, 15, 35, 0.98)', borderRadius: 32, padding: 24, borderWidth: 1, borderColor: 'rgba(68, 136, 255, 0.2)', width: '90%', maxWidth: 360, maxHeight: '85%' },
  modalTitulo: { fontSize: 24, fontWeight: '900', color: '#fff', marginBottom: 24, letterSpacing: -0.5 },
  modalLabel: { color: '#8E8E93', fontSize: 10, letterSpacing: 1.5, fontWeight: '800', marginBottom: 10, textTransform: 'uppercase' },
  inputWrapper: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.03)', marginBottom: 20 },
  input: { color: '#fff', padding: 16, fontSize: 16, fontWeight: '600' },

  objetivosRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  objetivoBtn: { flex: 1, minWidth: '45%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.03)' },
  objetivoBtnActivo: { backgroundColor: 'rgba(68,136,255,0.1)', borderColor: 'rgba(68,136,255,0.4)' },
  objetivoBtnText: { color: '#8E8E93', fontWeight: '700', fontSize: 13 },

  duracionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  duracionInfo: { color: '#fff', fontSize: 16, fontWeight: '700' },

  alertaBox: { backgroundColor: 'rgba(255,153,0,0.1)', borderWidth: 1, borderColor: 'rgba(255,153,0,0.2)', borderRadius: 14, padding: 14, marginBottom: 16 },
  alertaText: { color: '#ff9900', fontSize: 12, fontWeight: '600', lineHeight: 18 },

  fechaFinBox: { backgroundColor: 'rgba(68,136,255,0.05)', borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(68,136,255,0.1)' },
  fechaFinLabel: { color: '#8E8E93', fontSize: 11, fontWeight: '700', marginBottom: 6 },
  fechaFinText: { color: '#4488ff', fontSize: 15, fontWeight: '800' },

  fechaSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 16,
    marginBottom: 20
  },
  fechaSelectorText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600'
  },

  // CALENDARIO PREMIUM
  calWrapper: { padding: 4 },
  calNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  calNavBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  calMesText: { color: '#fff', fontWeight: '800', fontSize: 15, letterSpacing: 1 },
  calWeekHeader: { flexDirection: 'row', marginBottom: 12 },
  calWeekText: { flex: 1, textAlign: 'center', color: '#8E8E93', fontSize: 11, fontWeight: '800' },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calDayBox: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 12, position: 'relative' },
  calDayText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  calDayHoy: { backgroundColor: 'rgba(68,136,255,0.1)', borderWidth: 1, borderColor: 'rgba(68,136,255,0.3)' },
  calDayHoyText: { color: '#4488ff', fontWeight: '800' },
  calDaySel: { backgroundColor: '#4488ff' },
  calDaySelText: { color: '#fff', fontWeight: '800' },
  calDayOcupado: { opacity: 0.3 },
  calDayOcupadoText: { color: '#8E8E93' },
  calHoyDot: { position: 'absolute', bottom: 6, width: 4, height: 4, borderRadius: 2, backgroundColor: '#4488ff' },

  calendarioOverlay: { flex: 1, backgroundColor: 'rgba(0, 2, 15, 0.85)', justifyContent: 'center', alignItems: 'center' },
  calendarioModal: {
    backgroundColor: 'rgba(10, 15, 35, 0.98)',
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(68, 136, 255, 0.2)',
    padding: 24,
    width: '90%',
    maxWidth: 360,
  },
  calendarioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  calendarioTitulo: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff'
  },

  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalCancelar: { flex: 1, padding: 16, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center' },
  modalCancelarText: { color: '#8E8E93', fontWeight: '800', fontSize: 15 },
  modalGuardar: { flex: 1, borderRadius: 18, overflow: 'hidden' },
  modalGuardarGradient: { padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  modalGuardarText: { color: '#fff', fontWeight: '900', fontSize: 15, letterSpacing: 0.5 },
})
