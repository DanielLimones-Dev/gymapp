// ============================================
// DASHBOARD.JSX — Panel principal del cliente
// FIX DEFINITIVO: Estado se actualiza en tiempo real
// ============================================
/* eslint-disable no-unused-vars */
import { useState, useEffect, useCallback, useContext, createContext, useRef } from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Modal, Switch, Linking, Alert, Image, AppState, Pressable, Animated
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { AntDesign } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { rutinasNavigation } from '../../lib/rutinasRef'
import { guardarYSincronizar, cargarPrograma, cargarUltimaMetrica } from '../../lib/storage'
import { LAYOUT } from '../../components/constans'
import RegistrarSeries from './rutinas/RegistrarSeries'
import ListaProgramas from './rutinas/ListaProgramas'
import Progreso from './progreso/Progreso'
import IAScreen from './ia/IAScreen'
import CoachDashboard from './CoachDashboard'
import PagerTabs from './PagerTabs'
import SwipeableModal from './SwipeableModal'
import Comunidad from './comunidad/Comunidad'
import Chat from './chat/Chat'



// Crear contexto para userId
const UserContext = createContext(null)
const RefreshContext = createContext(null)
const AjustesContext = createContext(null)
const PerfilContext = createContext({ fotoUrl: null, nombre: 'U', setFotoUrl: () => {}, setNombreCtx: () => {} })
const ToastContext = createContext({ dispararToast: () => {}, globalToast: null, globalToastAnim: null, globalToastOpacity: null })
const SwitchDashContext = createContext({ switchToCoach: () => {} })

const RutinaStack = createNativeStackNavigator()

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
  'Abdomen', 'Trapecio', 'Antebrazos', 'Movilidad', 'Cardio'
]

const TIPOS_BLOQUE = ['Adaptativo', 'Acumulación', 'Intensificación', 'Peaking', 'Descarga']

const ETIQUETAS_DIA = [
  'PUSH',
  'PULL', 
  'LEGS',
  'FULLBODY',
  'UPPER',
  'LOWER',
  'CARDIO',
  'ARMS',
  'CORE'
]

const coloresTipo = {
  'Adaptativo': '#2255aa',
  'Acumulación': '#0033ff',
  'Intensificación': '#ff6600',
  'Peaking': '#ff0044',
  'Descarga': '#00aa44',
}

// Programa por defecto vacío
const PROGRAMA_INICIAL = {
  bloques: [],
  dias: {},
}

// ============================================
// PANTALLA: INICIO
// ============================================
function InicioScreen() {
  const DIAS_SEMANA_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
  const DIAS_NOMBRES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
  const hoy = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1
  const navigation = useNavigation()
  const [cargandoInicio, setCargandoInicio] = useState(true)

  const [modalAjustes, setModalAjustes] = useState(false)
  const [, forceOpenAjustes] = useState(0)
  const [chatAbierto, setChatAbierto] = useState(false)
  const [mensajesNoLeidos, setMensajesNoLeidos] = useState(0)
  const [ajustesEditando, setAjustesEditando] = useState(false)
  const [ajustesForm, setAjustesForm] = useState({ nombre: '', apellido: '', peso: '', unidad: 'kg', altura: '', genero: '', objetivo: '', nivel: '' })
  const [perfil, setPerfil] = useState(null)
  const [programa, setPrograma] = useState(null)
  const [ultimaMetrica, setUltimaMetrica] = useState(null)
  const [userId, setUserId] = useState(null)
  const [coachNombre, setCoachNombre] = useState(null)
  const [seccionAjuste, setSeccionAjuste] = useState(null)
  const [codigoCoach, setCodigoCoach] = useState('')
  const [coachMsg, setCoachMsg] = useState(null)
  const [notifs, setNotifs] = useState({ entrenamiento: true, progreso: true, coach: true })
  const [guardandoNotifs, setGuardandoNotifs] = useState(false)
  const [suscripcion, setSuscripcion] = useState(null)
  const [modalEliminarCuenta, setModalEliminarCuenta] = useState(false)
  const [confirmEliminar, setConfirmEliminar] = useState('')
  const [modalCerrarSesion, setModalCerrarSesion] = useState(false)
  const [notifsRecibidas, setNotifsRecibidas] = useState([])
  const [modalNotifs, setModalNotifs] = useState(false)
  const [fotoUrl, setFotoUrl] = useState(null)
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const [mensajesCoach, setMensajesCoach] = useState([])
  const [toastMsg, setToastMsg] = useState(null)
  const { refreshCount, triggerRefresh } = useContext(RefreshContext) || {}
  const { switchToCoach } = useContext(SwitchDashContext) || { switchToCoach: () => {} }
  const { setFotoUrl: setFotoUrlCtx, setNombreCtx } = useContext(PerfilContext) || {}
  const { dispararToast, globalToast, globalToastAnim, globalToastOpacity } = useContext(ToastContext) || {}

  // Animated refs para secciones de ajustes
  const ajusteEditAnim  = useRef(new Animated.Value(0)).current
  const ajusteCoachAnim = useRef(new Animated.Value(0)).current
  const ajusteFactAnim  = useRef(new Animated.Value(0)).current
  const ajustePrivAnim  = useRef(new Animated.Value(0)).current
  const ajusteAcercaAnim = useRef(new Animated.Value(0)).current
  const toastAnim = useRef(new Animated.Value(0)).current
  const toastOpacity = useRef(new Animated.Value(0)).current

  // Recargar programa cuando DiasBloque guarda cambios
  useEffect(() => {
    if (!userId) return
    cargarPrograma(userId).then(prog => { if (prog) setPrograma(prog) })
  }, [refreshCount, userId])

  // Recargar al recibir foco del tab
  useEffect(() => {
    const unsub = navigation.addListener('focus', async () => {
      if (userId) {
        const prog = await cargarPrograma(userId)
        if (prog) setPrograma(prog)
      }
    })
    return unsub
  }, [navigation, userId])

  useFocusEffect(useCallback(() => {
    async function cargar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      // Perfil
      const { data: p } = await supabase.from('perfiles').select('*').eq('id', user.id).single()
      if (p) {
        setPerfil(p)
        const n0 = p.nombre_completo?.split(' ')[0] || 'U'
        if (setNombreCtx) setNombreCtx(n0)
      }

      // Foto de perfil — usar avatar_url guardado en perfil primero
      try {
        if (p?.avatar_url) {
          setFotoUrl(p.avatar_url)
          if (setFotoUrlCtx) setFotoUrlCtx(p.avatar_url)
        } else {
          // Fallback: intentar desde storage
          const { data: fotoData } = supabase.storage.from('avatars').getPublicUrl(`${user.id}/avatar.jpg`)
          if (fotoData?.publicUrl) {
            // Verificar que la URL responde
            const check = await fetch(fotoData.publicUrl, { method: 'HEAD' }).catch(() => null)
            if (check?.ok) {
              const u = fotoData.publicUrl + '?t=' + Date.now()
              setFotoUrl(u)
              if (setFotoUrlCtx) setFotoUrlCtx(u)
            }
          }
        }
      } catch(e) { /* sin avatar */ }

      // Coach
      if (p?.coach_id) {
        const { data: coach } = await supabase.from('perfiles').select('nombre_completo').eq('id', p.coach_id).single()
        if (coach) setCoachNombre(coach.nombre_completo)
      }

      // Suscripción
      const { data: sub } = await supabase.from('suscripciones').select('*').eq('usuario_id', user.id).single()
      if (sub) setSuscripcion(sub)

      // Mensajes del coach
      if (p?.coach_id) {
        const { data: msgs } = await supabase
          .from('mensajes')
          .select('*')
          .eq('receptor_id', user.id)
          .order('creado_en', { ascending: false })
          .limit(5)
        if (msgs) setMensajesCoach(msgs)
      }

      // Preferencias notificaciones
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default
        const notifsGuardadas = await AsyncStorage.getItem(`notifs_${user.id}`)
        if (notifsGuardadas) setNotifs(JSON.parse(notifsGuardadas))
      } catch(e) {}

      // Programa
      const prog = await cargarPrograma(user.id)
      setPrograma(prog)

      // Generar notificaciones contextuales
      const notificaciones = []
      const hoyIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1
      const progActivo = prog?.programas?.find(p => p.estado === 'activo') || prog?.programas?.[0]
      const bloqueAct = progActivo?.bloques?.[0]
      if (bloqueAct) {
        const diasAct = prog?.dias?.[`dias_${bloqueAct.id}`] || []
        if (diasAct.includes(hoyIdx)) {
          notificaciones.push({ id: 1, tipo: 'entrenamiento', titulo: 'Hoy toca entrenar', sub: `${progActivo.nombre} · ${bloqueAct.nombre}`, tiempo: 'Ahora', icono: 'calendar' })
        }
      }
      if (p?.coach_id) {
        notificaciones.push({ id: 2, tipo: 'coach', titulo: 'Tu coach revisó tu progreso', sub: 'Revisa los comentarios en tu rutina', tiempo: 'Hace 2h', icono: 'team' })
      }
      setNotifsRecibidas(notificaciones)

      // Última métrica — si no hay, usar peso del perfil (onboarding)
      const m = await cargarUltimaMetrica(user.id)
      if (m) {
        setUltimaMetrica(m)
      } else if (p?.peso) {
        setUltimaMetrica({ peso: p.peso, unidad: 'kg', grasaPct: null, musculoPct: null })
      }

      setCargandoInicio(false)
    }
    cargar()
  }, []))

  // ─── Cálculos del programa activo ───────────────────────────────
  const programaActivo = programa?.programas?.find(p => p.estado === 'activo') || programa?.programas?.[0]
  const bloqueActivo = programaActivo?.bloques?.[0]

  // Días activos de la semana — definir PRIMERO
  const diasActivosSemana = bloqueActivo
    ? (programa?.dias?.[`dias_${bloqueActivo.id}`] || [])
    : []

  // Día de hoy
  const hayEntrenamientoHoy = diasActivosSemana.includes(hoy)
  const etiquetaHoy = programa?.dias?.[`etiquetas_${bloqueActivo?.id}`]?.[hoy] || ''
  const ejerciciosHoy = hayEntrenamientoHoy && bloqueActivo
    ? (programa?.dias?.[`ejercicios_${bloqueActivo.id}_${hoy}`] || [])
    : []
  const gruposHoy = [...new Set(ejerciciosHoy.map(e => e.grupo).filter(Boolean))]

  // Semana actual del bloque
  const fechaInicio = programaActivo?.fechaInicio ? new Date(programaActivo.fechaInicio + 'T12:00:00') : new Date()
  const semanaActual = Math.floor((Date.now() - fechaInicio.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1

  // Actividad real por día basada en historial
  const actividadPorDia = DIAS_SEMANA_LABELS.map((_, i) => {
    if (!bloqueActivo || !diasActivosSemana.includes(i)) return { tipo: 'descanso', pct: 0 }
    const ejercs = programa?.dias?.[`ejercicios_${bloqueActivo.id}_${i}`] || []
    const sesionesConFeedback = ejercs.reduce((acc, ej) => acc + (ej.historial?.filter(h => h.feedback)?.length || 0), 0)
    const totalEjercs = ejercs.length
    if (i > hoy) return { tipo: 'futuro', pct: 0 }
    if (i === hoy) return { tipo: 'hoy', pct: sesionesConFeedback > 0 ? 85 : 0 }
    const ejercsConHistorial = ejercs.filter(e => e.historial?.length > 0).length
    const pct = totalEjercs > 0 ? Math.round((ejercsConHistorial / totalEjercs) * 100) : 0
    return { tipo: pct > 0 ? 'completado' : 'faltado', pct }
  })

  // ─── Nombre y edad ───────────────────────────────────────────────
  const nombre = perfil?.nombre_completo || 'Atleta'
  const edad = perfil?.edad || (perfil?.fecha_nacimiento
    ? Math.floor((Date.now() - new Date(perfil?.fecha_nacimiento).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null)

  function abrirAjustes() {
    const partes = (perfil?.nombre_completo || '').split(' ')
    setAjustesForm({
      nombre:   partes[0] || '',
      apellido: partes.slice(1).join(' ') || '',
      peso:     perfil?.peso?.toString() || '',
      unidad:   'kg',
      altura:   perfil?.altura?.toString() || '',
      genero:   perfil?.genero || '',
      objetivo: perfil?.objetivo || '',
      nivel:    perfil?.nivel_experiencia || '',
    })
    setAjustesEditando(false)
    toggleEditAnim(false)
    setModalAjustes(true)
  }

  function toggleSeccion(seccion, anim) {
    const isOpen = seccionAjuste === seccion
    Animated.timing(anim, {
      toValue: isOpen ? 0 : 1,
      duration: 250,
      useNativeDriver: false,
    }).start()
    setSeccionAjuste(isOpen ? null : seccion)
  }

  function toggleEditAnim(open) {
    Animated.timing(ajusteEditAnim, {
      toValue: open ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start()
    setAjustesEditando(open)
  }

  function showToast(msg, tipo = 'ok') {
    setToastMsg({ msg, tipo })
    toastAnim.setValue(-24)
    toastOpacity.setValue(0)
    Animated.parallel([
      Animated.spring(toastAnim, { toValue: 0, useNativeDriver: true, tension: 90, friction: 12 }),
      Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start()
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(toastAnim, { toValue: -24, duration: 250, useNativeDriver: true }),
        Animated.timing(toastOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start(() => setToastMsg(null))
    }, 2400)
  }

  async function guardarAjustes() {
    // Validar nombre
    if (!ajustesForm.nombre.trim()) {
      Alert.alert('Falta el nombre', 'Ingresa tu nombre para guardar.')
      return
    }
    // Obtener userId si no está disponible aún
    let uid = userId
    if (!uid) {
      const { data: { user } } = await supabase.auth.getUser()
      uid = user?.id
    }
    if (!uid) {
      Alert.alert('Error', 'No se encontró tu sesión. Vuelve a iniciar sesión.')
      return
    }

    try {
      const nombreCompleto = [ajustesForm.nombre.trim(), ajustesForm.apellido.trim()].filter(Boolean).join(' ')
      const updates = { nombre_completo: nombreCompleto }
      if (ajustesForm.peso) updates.peso = parseFloat(ajustesForm.peso)
      if (ajustesForm.objetivo) updates.objetivo = ajustesForm.objetivo
      if (ajustesForm.altura) updates.altura = parseFloat(ajustesForm.altura)
      if (ajustesForm.genero) updates.genero = ajustesForm.genero
      if (ajustesForm.nivel) updates.nivel_experiencia = ajustesForm.nivel

      const { error } = await supabase.from('perfiles').update(updates).eq('id', uid)
      if (error) {
        Alert.alert('Error al guardar', error.message)
        return
      }

      // Actualizar estado local
      setPerfil(p => ({ ...p, ...updates }))
      if (setNombreCtx) setNombreCtx(nombreCompleto || 'U')

      // Cerrar edición
      setAjustesEditando(false)
      Animated.timing(ajusteEditAnim, { toValue: 0, duration: 250, useNativeDriver: false }).start()
      triggerRefresh()

      // Toast — siempre al final
      dispararToast('Perfil actualizado correctamente')

    } catch (e) {
      Alert.alert('Error inesperado', e.message || 'Intenta de nuevo.')
    }
  }

  async function seleccionarFoto() {
    try {
      const ImagePicker = require('expo-image-picker')
      // Siempre solicitar permiso — en Android permite reintentar
      const { status, canAskAgain } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert(
          'Acceso a galería',
          canAskAgain
            ? 'RepForge necesita acceso a tu galería para cambiar la foto de perfil.'
            : 'Permiso denegado. Ve a Configuración > Aplicaciones > RepForge > Permisos y activa Fotos.',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: canAskAgain ? 'Permitir' : 'Abrir ajustes',
              onPress: canAskAgain
                ? () => seleccionarFoto()
                : () => { const { Linking } = require('react-native'); Linking.openSettings() }
            }
          ]
        )
        return
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      })
      if (result.canceled) return
      setSubiendoFoto(true)
      const uri = result.assets[0].uri
      try {
        const path = `${userId}/avatar.jpg`
        const SUPABASE_URL = 'https://vlnmhwaadyejdnmgktjt.supabase.co'
        const SUPABASE_ANON = 'sb_publishable_ZHJhHtk3REmxd3EblLt6NA_9YIsoiSb'
        // Obtener JWT del usuario actual (necesario para RLS)
        const { data: { session } } = await supabase.auth.getSession()
        const jwt = session?.access_token || SUPABASE_ANON
        // Leer imagen
        const imgResp = await fetch(uri)
        const blob = await imgResp.blob()
        // Intentar DELETE primero para evitar conflicto de upsert
        await fetch(`${SUPABASE_URL}/storage/v1/object/avatars/${path}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${jwt}`, 'apikey': SUPABASE_ANON },
        }).catch(() => {})
        // Subir con POST
        const up = await fetch(`${SUPABASE_URL}/storage/v1/object/avatars/${path}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${jwt}`,
            'apikey': SUPABASE_ANON,
            'Content-Type': 'image/jpeg',
            'Cache-Control': '3600',
          },
          body: blob,
        })
        if (!up.ok) {
          const errTxt = await up.text()
          throw new Error(`HTTP ${up.status}: ${errTxt}`)
        }
        // URL pública
        const newUrl = `${SUPABASE_URL}/storage/v1/object/public/avatars/${path}?t=${Date.now()}`
        setFotoUrl(newUrl)
        if (setFotoUrlCtx) setFotoUrlCtx(newUrl)
        await supabase.from('perfiles').update({ avatar_url: newUrl }).eq('id', userId)
      } catch (uploadErr) {
        console.log('Upload error:', uploadErr)
        Alert.alert('Error', 'No se pudo subir la foto. Intenta de nuevo.')
      }
    } catch(e) {
      Alert.alert('📷 Error al subir foto', 'Instala expo-image-picker:\n\nnpx expo install expo-image-picker\n\nLuego reinicia la app.', [{ text: 'Entendido', style: 'cancel' }])
    }
    setSubiendoFoto(false)
  }

  async function eliminarCuenta() {
    if (confirmEliminar !== 'ELIMINAR') return
    try {
      // Eliminar datos del usuario
      await supabase.from('perfiles').delete().eq('id', userId)
      await supabase.auth.signOut()
    } catch(e) {
      Alert.alert('Error', 'No se pudo eliminar la cuenta. Contacta soporte.')
    }
  }

  async function guardarNotificaciones(nuevasNotifs) {
    setGuardandoNotifs(true)
    setNotifs(nuevasNotifs)
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default
      await AsyncStorage.setItem(`notifs_${userId}`, JSON.stringify(nuevasNotifs))

      // expo-notifications removido de Expo Go SDK 53 — usar dev build
      if (false) try {
        const Notifications = require('expo-notifications')
        await Notifications.requestPermissionsAsync()
        await Notifications.cancelAllScheduledNotificationsAsync()

        if (nuevasNotifs.entrenamiento && diasActivosSemana.length > 0) {
          // Recordatorio diario a las 8am en días de entrenamiento
          for (const diaKey of diasActivosSemana) {
            const weekday = diaKey === 6 ? 1 : diaKey + 2 // convertir 0=lun→2, ..., 6=dom→1
            await Notifications.scheduleNotificationAsync({
              content: {
                title: '💪 Día de entrenamiento',
                body: 'Tienes entrenamiento programado hoy. ¡A darle!',
                sound: true,
              },
              trigger: { weekday, hour: 8, minute: 0, repeats: true }
            })
          }
        }

        if (nuevasNotifs.progreso) {
          // Resumen semanal los lunes a las 9am
          await Notifications.scheduleNotificationAsync({
            content: {
              title: '📊 Resumen semanal',
              body: 'Revisa tu progreso de la semana en RepForge',
              sound: true,
            },
            trigger: { weekday: 2, hour: 9, minute: 0, repeats: true }
          })
        }
      } catch(e) {
        console.log('expo-notifications no disponible:', e)
      }
    } catch(e) {}
    setGuardandoNotifs(false)
  }

  async function unirseACoach() {
    if (!codigoCoach.trim()) return
    setCoachMsg(null)
    const { data: codigo, error } = await supabase
      .from('codigos_invitacion')
      .select('*')
      .eq('codigo', codigoCoach.trim().toUpperCase())
      .eq('usado', false)
      .single()

    if (error || !codigo) {
      setCoachMsg({ tipo: 'error', texto: 'Código inválido o ya utilizado' })
      return
    }

    // Asociar coach al cliente
    await supabase.from('perfiles').update({ coach_id: codigo.coach_id }).eq('id', userId)
    await supabase.from('codigos_invitacion').update({ usado: true, cliente_id: userId }).eq('id', codigo.id)

    const { data: coach } = await supabase.from('perfiles').select('nombre_completo').eq('id', codigo.coach_id).single()
    setCoachNombre(coach?.nombre_completo)
    setPerfil(p => ({ ...p, coach_id: codigo.coach_id }))
    setCoachMsg({ tipo: 'ok', texto: `Te uniste al equipo de ${coach?.nombre_completo}` })
    setCodigoCoach('')
  }

  async function cerrarSesion() {
    await supabase.auth.signOut()
  }

  function pedirCerrarSesion() {
    setModalCerrarSesion(true)
  }


    // Pantalla de carga skeleton — InicioScreen
    if (cargandoInicio && !perfil) return (
      <LinearGradient colors={['#000000', '#050510', '#0a0a1f']} style={{ flex: 1, paddingTop: 56, padding: 20 }}>
        {/* Header skeleton */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <View>
            <View style={{ width: 140, height: 22, borderRadius: 8, backgroundColor: '#0f1a3a', marginBottom: 8 }} />
            <View style={{ width: 200, height: 12, borderRadius: 6, backgroundColor: '#08101f' }} />
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#0f1a3a' }} />
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#0f1a3a' }} />
          </View>
        </View>
        {/* Perfil skeleton */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#05050f', borderRadius: 16, padding: 14, marginBottom: 14 }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#0f1a3a' }} />
          <View style={{ flex: 1, gap: 8 }}>
            <View style={{ width: 130, height: 14, borderRadius: 6, backgroundColor: '#0f1a3a' }} />
            <View style={{ width: 90, height: 10, borderRadius: 5, backgroundColor: '#08101f' }} />
          </View>
        </View>
        {/* Week strip skeleton */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#05050f', borderRadius: 16, padding: 16, marginBottom: 14 }}>
          {[...Array(7)].map((_, i) => (
            <View key={i} style={{ alignItems: 'center', gap: 6 }}>
              <View style={{ width: 14, height: 10, borderRadius: 4, backgroundColor: '#08101f' }} />
              <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: '#0f1a3a' }} />
            </View>
          ))}
        </View>
        {/* Card hoy skeleton */}
        <View style={{ backgroundColor: '#05050f', borderRadius: 18, padding: 18, marginBottom: 14 }}>
          <View style={{ width: 160, height: 10, borderRadius: 5, backgroundColor: '#08101f', marginBottom: 12 }} />
          <View style={{ width: 200, height: 22, borderRadius: 8, backgroundColor: '#0f1a3a', marginBottom: 8 }} />
          <View style={{ width: 120, height: 12, borderRadius: 5, backgroundColor: '#08101f' }} />
        </View>
        {/* Cards extra */}
        {[...Array(2)].map((_, i) => (
          <View key={i} style={{ backgroundColor: '#05050f', borderRadius: 16, padding: 16, marginBottom: 10, height: 70 }} />
        ))}
      </LinearGradient>
    )

  return (
    <LinearGradient colors={['#000000', '#050510', '#0a0a1f']} style={styles.gradient}>
      <ScrollView contentContainerStyle={styles.iniContainer} showsVerticalScrollIndicator={false}
        contentInset={{ bottom: 100 }} scrollIndicatorInsets={{ bottom: 100 }}>

        {/* HEADER */}
        <View style={styles.iniHeader}>
          <View>
            <View style={styles.rfRow}>
              <Text style={styles.rfR}>REP</Text>
              <Text style={styles.rfF}>FORGE</Text>
            </View>
            <Text style={styles.iniProgramaNombre}>
              {programaActivo
                ? `${programaActivo.nombre} · ${bloqueActivo?.nombre || ''} · Sem ${semanaActual}`
                : 'Sin programa activo'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {userId === '7d381a03-17b2-4bbe-83a2-ab5c9a4f2fc7' && (
              <TouchableOpacity style={[styles.iniBellBtn, { borderColor: '#9933ff44', backgroundColor: '#0a0020' }]} onPress={() => switchToCoach()}>
                <AntDesign name="swap" size={18} color="#9933ff" />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.iniBellBtn} onPress={() => setModalNotifs(true)}>
              <AntDesign name="bell" size={18} color="#4488ff" />
              {notifsRecibidas.length > 0 && <View style={[styles.iniBellBadge, { backgroundColor: '#ff3355' }]} />}
            </TouchableOpacity>
            <TouchableOpacity style={styles.iniBellBtn} onPress={abrirAjustes}>
              <AntDesign name="setting" size={18} color="#4488ff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* PERFIL */}
        <View style={styles.iniPerfilCard}>
          <View style={styles.iniPerfilAvatar}>
            {fotoUrl ? (
              <Image source={{ uri: fotoUrl }} style={{ width: 42, height: 42, borderRadius: 21 }} />
            ) : (
              <Text style={styles.iniPerfilAvatarText}>{nombre[0]?.toUpperCase()}</Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.iniPerfilNombre}>{nombre}</Text>
            <View style={styles.iniPerfilSubRow}>
              {edad ? <Text style={styles.iniPerfilSub}>{edad} años</Text> : null}
              {ultimaMetrica ? <Text style={styles.iniPerfilSub}>{ultimaMetrica.peso} {ultimaMetrica.unidad || 'kg'}</Text> : null}
              {ultimaMetrica?.grasaPct ? <Text style={styles.iniPerfilSub}>{ultimaMetrica.grasaPct}% grasa</Text> : null}
              {ultimaMetrica?.musculoPct ? <Text style={styles.iniPerfilSub}>{ultimaMetrica.musculoPct}% músculo</Text> : null}
            </View>
          </View>
        </View>

        {/* BOTÓN MENSAJES — compacto junto al perfil */}
        {perfil?.coach_id && (
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#05050f', borderWidth: 1.5, borderColor: mensajesNoLeidos > 0 ? '#1a3aff' : '#0f1a3a', borderRadius: 14, padding: 12, marginBottom: 14 }}
            onPress={() => setChatAbierto(true)} activeOpacity={0.8}
          >
            <View style={{ position: 'relative' }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: mensajesNoLeidos > 0 ? '#05103a' : '#08080f', borderWidth: 1.5, borderColor: mensajesNoLeidos > 0 ? '#1a3aff' : '#0f1a3a', justifyContent: 'center', alignItems: 'center' }}>
                <AntDesign name="message1" size={18} color={mensajesNoLeidos > 0 ? '#4488ff' : '#2a4488'} />
              </View>
              {mensajesNoLeidos > 0 && (
                <View style={{ position: 'absolute', top: -5, right: -5, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#ff3355', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3, borderWidth: 2, borderColor: '#05050f' }}>
                  <Text style={{ color: '#fff', fontSize: 8, fontWeight: '900' }}>{mensajesNoLeidos > 9 ? '9+' : mensajesNoLeidos}</Text>
                </View>
              )}
            </View>
            <Text style={{ flex: 1, color: mensajesNoLeidos > 0 ? '#fff' : '#2a4488', fontSize: 13, fontWeight: mensajesNoLeidos > 0 ? '800' : '600' }}>
              {mensajesNoLeidos > 0 ? `${mensajesNoLeidos} mensaje${mensajesNoLeidos > 1 ? 's' : ''} nuevo${mensajesNoLeidos > 1 ? 's' : ''}` : 'Mensajes con tu coach'}
            </Text>
            <AntDesign name="right" size={13} color={mensajesNoLeidos > 0 ? '#4488ff' : '#2a4488'} />
          </TouchableOpacity>
        )}

        {/* CHAT MODAL */}
        <SwipeableModal visible={chatAbierto} onClose={() => { setChatAbierto(false); cargarMensajesNoLeidos(userId) }}>
          <View style={{ flex: 1, backgroundColor: '#000' }}>
            <View style={{ paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#0f1a3a', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TouchableOpacity onPress={() => { setChatAbierto(false); cargarMensajesNoLeidos(userId) }} style={{ padding: 8 }}>
                <AntDesign name="left" size={20} color="#4488ff" />
              </TouchableOpacity>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '900' }}>Mensajes</Text>
            </View>
            <ChatScreen />
          </View>
        </SwipeableModal>

        {/* STRIP SEMANAL */}
        <View style={styles.iniWeekRow}>
          {DIAS_SEMANA_LABELS.map((dia, i) => {
            const esActivo = diasActivosSemana.includes(i)
            const esHoy = i === hoy
            const esPasado = i < hoy
            const esFuturo = i > hoy
            return (
              <View key={i} style={styles.iniDayCol}>
                <Text style={[styles.iniDayLabel, esHoy && styles.iniDayLabelHoy]}>{dia}</Text>
                <View style={[
                  styles.iniDayDot,
                  esActivo && esPasado && styles.iniDayDotDone,
                  esActivo && esHoy && styles.iniDayDotHoy,
                  esActivo && esFuturo && styles.iniDayDotFuturo,
                  !esActivo && styles.iniDayDotDescanso,
                ]}>
                  {esActivo && esPasado && <AntDesign name="check" size={10} color="#fff" />}
                  {esHoy && <View style={styles.iniDayDotCenter} />}
                </View>
              </View>
            )
          })}
        </View>

        {/* HOY TOCA */}
        <View style={styles.iniCardHoy}>
          <View style={styles.iniCardHoyTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.iniCardHoyLabel}>HOY — {DIAS_NOMBRES[hoy].toUpperCase()}</Text>
              {hayEntrenamientoHoy ? (
                <>
                  <Text style={styles.iniCardHoyTitulo}>
                    {etiquetaHoy || bloqueActivo?.tipo || 'Entrenamiento'}
                  </Text>
                  <Text style={styles.iniCardHoySub}>
                    {gruposHoy.length > 0 ? gruposHoy.join(' · ') : bloqueActivo?.nombre}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.iniCardHoyTitulo}>Descanso</Text>
                  <Text style={styles.iniCardHoySub}>Recuperación activa</Text>
                </>
              )}
            </View>
            {hayEntrenamientoHoy && ejerciciosHoy.length > 0 && (
              <View style={styles.iniCardHoyBadge}>
                <Text style={styles.iniCardHoyBadgeNum}>{ejerciciosHoy.length}</Text>
                <Text style={styles.iniCardHoyBadgeLabel}>ejerc.</Text>
              </View>
            )}
          </View>
          {bloqueActivo && (
            hayEntrenamientoHoy ? (
              <TouchableOpacity
                style={styles.iniStartBtn}
                onPress={() => navigation.navigate('Rutina', {
                  screen: 'Ejercicios',
                  params: { bloqueId: bloqueActivo.id, diaKey: hoy, userId },
                  initial: false
                })}
              >
                <LinearGradient colors={['#1a3aff', '#0022cc']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.iniStartGradient}>
                  <Text style={styles.iniStartText}>INICIAR ENTRENAMIENTO</Text>
                  <AntDesign name="right" size={16} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <View style={styles.iniDescansoBtn}>
                <AntDesign name="rest" size={15} color="#2a4488" />
                <Text style={styles.iniDescansoText}>DIA DE DESCANSO</Text>
              </View>
            )
          )}
        </View>

        {/* RESUMEN SEMANAL */}
        <View style={styles.iniSection}>
          <Text style={styles.iniSectionLabel}>RESUMEN SEMANAL</Text>
          <View style={styles.iniSemanaCard}>
            <View style={styles.iniBarrasRow}>
              {actividadPorDia.map((dia, i) => {
                const esHoy = i === hoy
                const colores = {
                  completado: ['#00cc44', '#0099ff'],
                  faltado:    ['#ff3355', '#cc0022'],
                  hoy:        dia.pct > 0 ? ['#00cc44', '#0099ff'] : ['#1a3aff', '#0022cc'],
                  futuro:     ['#1a1a3a', '#0f0f2a'],
                  descanso:   ['#0a0a18', '#080812'],
                }
                const [c1, c2] = colores[dia.tipo] || colores.futuro
                const alturaMin = 8
                const altura = dia.tipo === 'descanso' ? alturaMin
                  : dia.tipo === 'futuro' ? alturaMin
                  : Math.max(alturaMin, dia.pct)
                return (
                  <View key={i} style={styles.iniBarraCol}>
                    <View style={styles.iniBarraTrack}>
                      <LinearGradient
                        colors={[c1, c2]}
                        style={[styles.iniBarraFill, {
                          height: `${altura}%`,
                          opacity: dia.tipo === 'futuro' || dia.tipo === 'descanso' ? 0.3 : 1,
                          borderRadius: 4,
                        }]}
                      />
                    </View>
                    <Text style={[styles.iniBarraDia, esHoy && styles.iniBarraDiaHoy]}>
                      {DIAS_SEMANA_LABELS[i]}
                    </Text>
                  </View>
                )
              })}
            </View>
            <View style={styles.iniSemanaFooter}>
              <Text style={styles.iniSemanaFooterText}>
                {actividadPorDia.filter(d => d.tipo === 'completado' || (d.tipo === 'hoy' && d.pct > 0)).length} de {diasActivosSemana.length} entrenamientos completados
              </Text>
              <Text style={styles.iniSemanaFooterNum}>
                {diasActivosSemana.length > 0
                  ? `${Math.round((actividadPorDia.filter(d => d.tipo === 'completado' || (d.tipo === 'hoy' && d.pct > 0)).length / diasActivosSemana.length) * 100)}%`
                  : '—'}
              </Text>
            </View>
          </View>
        </View>

        {/* MENSAJES DEL COACH */}
        {coachNombre && (
          <View style={styles.iniSection}>
            <View style={styles.iniSectionRow}>
              <Text style={styles.iniSectionLabel}>MENSAJES</Text>
              {mensajesCoach.filter(m => !m.leido).length > 0 && (
                <View style={styles.iniBadgeRojo}>
                  <Text style={styles.iniBadgeRojoText}>{mensajesCoach.filter(m => !m.leido).length}</Text>
                </View>
              )}
            </View>
            {mensajesCoach.length === 0 ? (
              <View style={styles.iniMsgCard}>
                <AntDesign name="mail" size={18} color="#2a4488" style={{ marginRight: 12 }} />
                <Text style={styles.iniMsgText}>Sin mensajes de {coachNombre}</Text>
              </View>
            ) : (
              mensajesCoach.map((msg, i) => (
                <View key={msg.id || i} style={[styles.iniMsgCard, { marginBottom: i < mensajesCoach.length - 1 ? 8 : 0, borderColor: msg.leido ? '#0f1a3a' : '#1a3aff' }]}>
                  <View style={[styles.iniCoachAvatar, { width: 34, height: 34, borderRadius: 17, marginRight: 10 }]}>
                    <Text style={[styles.iniCoachAvatarText, { fontSize: 13 }]}>{coachNombre[0]?.toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{coachNombre}</Text>
                      <Text style={{ color: '#2a4488', fontSize: 10 }}>
                        {msg.creado_en ? new Date(msg.creado_en).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : ''}
                      </Text>
                    </View>
                    <Text style={{ color: '#aabbdd', fontSize: 12, marginTop: 2 }} numberOfLines={2}>{msg.contenido}</Text>
                  </View>
                  {!msg.leido && <View style={styles.iniMsgDot} />}
                </View>
              ))
            )}
          </View>
        )}

      </ScrollView>

      {/* MODAL NOTIFICACIONES */}
      <Modal visible={modalNotifs} transparent animationType="slide">
        <View style={styles.ajustesOverlay}>
          <View style={styles.ajustesContainer}>
            <View style={styles.ajustesHandle} />
            <View style={styles.ajustesHeader}>
              <Text style={styles.ajustesTitulo}>Notificaciones</Text>
              <TouchableOpacity onPress={() => setModalNotifs(false)} style={styles.ajustesCerrarBtn}>
                <AntDesign name="close" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {notifsRecibidas.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                  <AntDesign name="bell" size={36} color="#1a2a5a" />
                  <Text style={{ color: '#2a4488', fontSize: 14, marginTop: 12 }}>Sin notificaciones nuevas</Text>
                </View>
              ) : (
                <>
                  <Text style={[styles.ajustesSectionLabel, { marginBottom: 10 }]}>RECIENTES</Text>
                  {notifsRecibidas.map(n => (
                    <View key={n.id} style={styles.ajustesNotifCard}>
                      <View style={styles.ajustesNotifCardIcon}>
                        <AntDesign name={n.icono} size={16} color="#4488ff" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.ajustesNotifCardTitulo}>{n.titulo}</Text>
                        <Text style={styles.ajustesNotifCardSub}>{n.sub}</Text>
                      </View>
                      <Text style={styles.ajustesNotifCardTiempo}>{n.tiempo}</Text>
                    </View>
                  ))}
                </>
              )}

              <Text style={[styles.ajustesSectionLabel, { marginTop: 20, marginBottom: 10 }]}>PREFERENCIAS</Text>
              <View style={styles.ajustesCard}>
                {[
                  { key: 'entrenamiento', label: 'Recordatorio de entrenamiento', sub: 'Aviso según tus días configurados' },
                  { key: 'progreso', label: 'Resumen semanal', sub: 'Cada lunes con tu progreso' },
                  { key: 'coach', label: 'Mensajes del coach', sub: 'Notificaciones de tu coach' },
                ].map((n, i, arr) => (
                  <View key={n.key}>
                    <TouchableOpacity
                      style={styles.ajustesNotifRow}
                      onPress={() => guardarNotificaciones({ ...notifs, [n.key]: !notifs[n.key] })}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.ajustesNotifLabel}>{n.label}</Text>
                        <Text style={styles.ajustesNotifSub}>{n.sub}</Text>
                      </View>
                      <View style={[styles.ajustesToggle, notifs[n.key] && styles.ajustesToggleOn]}>
                        <View style={[styles.ajustesToggleThumb, notifs[n.key] && styles.ajustesToggleThumbOn]} />
                      </View>
                    </TouchableOpacity>
                    {i < arr.length - 1 && <View style={styles.ajustesDivider} />}
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL AJUSTES */}
      <Modal visible={modalAjustes} transparent animationType="slide">
        <View style={styles.ajustesOverlay}>
          <View style={styles.ajustesContainer}>

            {/* Handle */}
            <View style={styles.ajustesHandle} />

            {/* Header */}
            <View style={styles.ajustesHeader}>
              <Text style={styles.ajustesTitulo}>Ajustes</Text>
              <TouchableOpacity onPress={() => setModalAjustes(false)} style={styles.ajustesCerrarBtn}>
                <AntDesign name="close" size={18} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>

              {/* PERFIL */}
              <Text style={styles.ajustesSectionLabel}>PERFIL</Text>
              <View style={styles.ajustesCard}>
                <View style={styles.ajustesPerfilRow}>
                  <TouchableOpacity style={styles.ajustesAvatarWrap} onPress={seleccionarFoto}>
                    {fotoUrl ? (
                      <Image source={{ uri: fotoUrl }} style={{ width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: '#1a3aff' }} />
                    ) : (
                      <View style={styles.ajustesAvatar}>
                        <Text style={styles.ajustesAvatarText}>{nombre[0]?.toUpperCase()}</Text>
                      </View>
                    )}
                    <View style={styles.ajustesCamaraBtn}>
                      <AntDesign name="camera" size={10} color="#fff" style={subiendoFoto ? { opacity: 0.5 } : {}} />
                    </View>
                  </TouchableOpacity>
                  <View style={{ flex: 1 }}>
                    {ajustesEditando ? (
                      <Text style={[styles.ajustesNombre, { color: '#4488ff' }]}>Editando perfil...</Text>
                    ) : (
                      <Text style={styles.ajustesNombre}>{perfil?.nombre_completo || nombre}</Text>
                    )}
                    <Text style={styles.ajustesEmail}>
                      {[
                        perfil?.genero,
                        (perfil?.edad || edad) ? (perfil?.edad || edad) + ' años' : null,
                        perfil?.altura ? perfil.altura + ' cm' : null,
                        perfil?.peso ? perfil.peso + ' kg' : null,
                      ].filter(Boolean).join('  ·  ')}
                    </Text>
                    {perfil?.objetivo && (
                      <Text style={{ color: '#9933ff', fontSize: 10, fontWeight: '700', marginTop: 2 }}>
                        {({ hipertrofia: 'Hipertrofia', fuerza: 'Fuerza', definicion: 'Definición', resistencia: 'Resistencia', recomposicion: 'Recomposición' })[perfil.objetivo] || perfil.objetivo}
                        {perfil?.nivel_experiencia ? '  ·  ' + perfil.nivel_experiencia : ''}
                      </Text>
                    )}
                  </View>
                  {!ajustesEditando ? (
                    <TouchableOpacity style={styles.ajustesEditBtn} onPress={() => toggleEditAnim(true)}>
                      <AntDesign name="edit" size={16} color="#4488ff" />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={[styles.ajustesEditBtn, { borderColor: '#ff3355' }]} onPress={() => { toggleEditAnim(false); setAjustesForm({ nombre: perfil?.nombre_completo?.split(' ')[0] || '', apellido: perfil?.nombre_completo?.split(' ').slice(1).join(' ') || '', peso: perfil?.peso?.toString() || '', unidad: 'kg', altura: perfil?.altura?.toString() || '', genero: perfil?.genero || '', objetivo: perfil?.objetivo || '', nivel: perfil?.nivel_experiencia || '' }) }}>
                      <AntDesign name="close" size={14} color="#ff3355" />
                    </TouchableOpacity>
                  )}
                </View>

                <Animated.View style={[styles.ajustesEditForm, { opacity: ajusteEditAnim, transform: [{ translateY: ajusteEditAnim.interpolate({ inputRange: [0,1], outputRange: [-10,0] }) }] }]}>
                {ajustesEditando && (
                  <View>
                    {/* Sección Info Personal */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, marginBottom: 16 }}>
                      <View style={{ width: 3, height: 16, borderRadius: 2, backgroundColor: '#4488ff' }} />
                      <Text style={{ color: '#4488ff', fontSize: 10, fontWeight: '900', letterSpacing: 2 }}>INFORMACIÓN PERSONAL</Text>
                    </View>
                    {/* Nombre */}
                    <View style={styles.ajustesEditRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.ajustesEditLabel}>NOMBRE</Text>
                        <TextInput
                          style={styles.ajustesEditInput}
                          value={ajustesForm.nombre}
                          onChangeText={t => setAjustesForm(p => ({ ...p, nombre: t }))}
                          placeholder="Nombre"
                          placeholderTextColor="#2a2a4a"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.ajustesEditLabel}>APELLIDO</Text>
                        <TextInput
                          style={styles.ajustesEditInput}
                          value={ajustesForm.apellido}
                          onChangeText={t => setAjustesForm(p => ({ ...p, apellido: t }))}
                          placeholder="Apellido"
                          placeholderTextColor="#2a2a4a"
                        />
                      </View>
                    </View>
                    {/* Peso y Altura */}
                    <View style={styles.ajustesEditRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.ajustesEditLabel}>PESO</Text>
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                          <TextInput
                            style={[styles.ajustesEditInput, { flex: 1 }]}
                            value={ajustesForm.peso}
                            onChangeText={t => setAjustesForm(p => ({ ...p, peso: t }))}
                            placeholder="75.0"
                            placeholderTextColor="#2a2a4a"
                            keyboardType="decimal-pad"
                          />
                          <View style={{ flexDirection: 'row', gap: 4 }}>
                            {['kg', 'lbs'].map(u => (
                              <Pressable
                                key={u}
                                style={[styles.ajustesEditChip, ajustesForm.unidad === u && { borderColor: '#4488ff', backgroundColor: '#4488ff22' }]}
                                onPress={() => setAjustesForm(p => ({ ...p, unidad: u }))}
                              >
                                <Text style={{ color: ajustesForm.unidad === u ? '#4488ff' : '#2a4488', fontSize: 11, fontWeight: '700' }}>{u}</Text>
                              </Pressable>
                            ))}
                          </View>
                        </View>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.ajustesEditLabel}>ALTURA (cm)</Text>
                        <TextInput
                          style={styles.ajustesEditInput}
                          value={ajustesForm.altura}
                          onChangeText={t => setAjustesForm(p => ({ ...p, altura: t }))}
                          placeholder="175"
                          placeholderTextColor="#2a2a4a"
                          keyboardType="decimal-pad"
                        />
                      </View>
                    </View>
                    {/* Sección Cuerpo */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20, marginBottom: 16 }}>
                      <View style={{ width: 3, height: 16, borderRadius: 2, backgroundColor: '#9933ff' }} />
                      <Text style={{ color: '#9933ff', fontSize: 10, fontWeight: '900', letterSpacing: 2 }}>ESTADÍSTICAS</Text>
                    </View>
                    {/* Género */}
                    <Text style={styles.ajustesEditLabel}>GÉNERO</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {['Masculino', 'Femenino', 'Otro'].map(g => (
                        <Pressable
                          key={g}
                          style={[styles.ajustesEditChipLg, ajustesForm.genero === g && { borderColor: '#4488ff', backgroundColor: '#4488ff22' }]}
                          onPress={() => setAjustesForm(p => ({ ...p, genero: g }))}
                        >
                          <Text style={{ color: ajustesForm.genero === g ? '#4488ff' : '#2a4488', fontSize: 12, fontWeight: '700' }}>{g}</Text>
                        </Pressable>
                      ))}
                    </View>
                    {/* Sección Entrenamiento */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20, marginBottom: 16 }}>
                      <View style={{ width: 3, height: 16, borderRadius: 2, backgroundColor: '#ff6600' }} />
                      <Text style={{ color: '#ff6600', fontSize: 10, fontWeight: '900', letterSpacing: 2 }}>ENTRENAMIENTO</Text>
                    </View>
                    {/* Objetivo */}
                    <Text style={styles.ajustesEditLabel}>OBJETIVO</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {['hipertrofia', 'fuerza', 'definicion', 'resistencia', 'recomposicion'].map(o => {
                        const labels = { hipertrofia: 'Hipertrofia', fuerza: 'Fuerza', definicion: 'Definición', resistencia: 'Resistencia', recomposicion: 'Recomposición' }
                        return (
                          <Pressable
                            key={o}
                            style={[styles.ajustesEditChipLg, ajustesForm.objetivo === o && { borderColor: '#9933ff', backgroundColor: '#9933ff22' }]}
                            onPress={() => setAjustesForm(p => ({ ...p, objetivo: o }))}
                          >
                            <Text style={{ color: ajustesForm.objetivo === o ? '#9933ff' : '#2a4488', fontSize: 12, fontWeight: '700' }}>{labels[o]}</Text>
                          </Pressable>
                        )
                      })}
                    </View>
                    {/* Nivel */}
                    <Text style={styles.ajustesEditLabel}>NIVEL DE EXPERIENCIA</Text>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {['Principiante', 'Intermedio', 'Avanzado', 'Élite'].map(n => (
                        <Pressable
                          key={n}
                          style={[styles.ajustesEditChip, { flex: 1 }, ajustesForm.nivel === n && { borderColor: '#4488ff', backgroundColor: '#4488ff22' }]}
                          onPress={() => setAjustesForm(p => ({ ...p, nivel: n }))}
                        >
                          <Text style={{ color: ajustesForm.nivel === n ? '#4488ff' : '#2a4488', fontSize: 10, fontWeight: '700', textAlign: 'center' }}>{n}</Text>
                        </Pressable>
                      ))}
                    </View>
                    {/* Guardar */}
                    <Pressable
                      style={({ pressed }) => [styles.ajustesGuardarBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
                      onPress={guardarAjustes}
                    >
                      <LinearGradient colors={['#1a3aff', '#0022cc']} style={styles.ajustesGuardarGradient}>
                        <AntDesign name="check" size={15} color="#fff" />
                        <Text style={styles.ajustesGuardarText}>Guardar cambios</Text>
                      </LinearGradient>
                    </Pressable>
                  </View>
                )}
                </Animated.View>
              </View>

              {/* COMUNIDAD — COACH */}
              <Text style={styles.ajustesSectionLabel}>COMUNIDAD</Text>
              <View style={styles.ajustesCard}>
                <TouchableOpacity style={styles.ajustesRow} onPress={() => toggleSeccion('coach', ajusteCoachAnim)}>
                  <AntDesign name="team" size={16} color="#4488ff" />
                  <Text style={styles.ajustesRowText}>
                    {coachNombre ? `Coach: ${coachNombre}` : 'Unirse a un coach'}
                  </Text>
                  <AntDesign name={seccionAjuste === 'coach' ? 'up' : 'down'} size={14} color="#2a4488" />
                </TouchableOpacity>
                <Animated.View style={{ opacity: ajusteCoachAnim, transform: [{ translateY: ajusteCoachAnim.interpolate({ inputRange: [0,1], outputRange: [-8,0] }) }] }}>
                {seccionAjuste === 'coach' && (
                  <View style={styles.ajustesSubSection}>
                    {coachNombre ? (
                      <View style={styles.ajustesCoachInfo}>
                        <View style={styles.ajustesCoachAvatar}>
                          <Text style={styles.ajustesCoachAvatarText}>{coachNombre[0]?.toUpperCase()}</Text>
                        </View>
                        <View>
                          <Text style={styles.ajustesCoachNombre}>{coachNombre}</Text>
                          <Text style={styles.ajustesCoachSub}>Tu coach asignado</Text>
                        </View>
                      </View>
                    ) : (
                      <>
                        <Text style={styles.ajustesInputLabel}>CÓDIGO DE INVITACIÓN</Text>
                        <View style={styles.ajustesCoachRow}>
                          <TextInput
                            style={[styles.ajustesInput, { flex: 1, textTransform: 'uppercase' }]}
                            value={codigoCoach}
                            onChangeText={t => { setCodigoCoach(t); setCoachMsg(null) }}
                            placeholder="Ej: ABC123"
                            placeholderTextColor="#2a2a4a"
                            autoCapitalize="characters"
                          />
                          <TouchableOpacity style={styles.ajustesCoachBtn} onPress={unirseACoach}>
                            <LinearGradient colors={['#1a3aff', '#0022cc']} style={styles.ajustesCoachBtnGradient}>
                              <Text style={styles.ajustesCoachBtnText}>Unirse</Text>
                            </LinearGradient>
                          </TouchableOpacity>
                        </View>
                        {coachMsg && (
                          <Text style={[styles.ajustesMsg, { color: coachMsg.tipo === 'ok' ? '#00cc44' : '#ff3355' }]}>
                            {coachMsg.texto}
                          </Text>
                        )}
                      </>
                    )}
                  </View>
                )}
                </Animated.View>
              </View>

              {/* FACTURACIÓN */}
              <Text style={styles.ajustesSectionLabel}>FACTURACIÓN</Text>
              <View style={styles.ajustesCard}>
                <TouchableOpacity style={styles.ajustesRow} onPress={() => toggleSeccion('facturacion', ajusteFactAnim)}>
                  <AntDesign name="wallet" size={16} color="#ff6600" />
                  <Text style={styles.ajustesRowText}>Suscripción y pagos</Text>
                  <AntDesign name={seccionAjuste === 'facturacion' ? 'up' : 'down'} size={14} color="#2a4488" />
                </TouchableOpacity>
                <Animated.View style={{ opacity: ajusteFactAnim, transform: [{ translateY: ajusteFactAnim.interpolate({ inputRange: [0,1], outputRange: [-8,0] }) }] }}>
                {seccionAjuste === 'facturacion' && (
                  <View style={styles.ajustesSubSection}>
                    {suscripcion ? (
                      <>
                        <View style={styles.ajustesPlanCard}>
                          <LinearGradient colors={['#1a0f00', '#0f0800']} style={styles.ajustesPlanGradient}>
                            <View style={styles.ajustesPlanHeader}>
                              <Text style={styles.ajustesPlanNombre}>{suscripcion.plan || 'Plan Pro'}</Text>
                              <View style={[styles.ajustesPlanBadge, { backgroundColor: suscripcion.activa ? '#00cc44' : '#ff3355' }]}>
                                <Text style={styles.ajustesPlanBadgeText}>{suscripcion.activa ? 'ACTIVO' : 'VENCIDO'}</Text>
                              </View>
                            </View>
                            <Text style={styles.ajustesPlanPrecio}>
                              ${suscripcion.precio || '9.99'} <Text style={styles.ajustesPlanPeriodo}>/{suscripcion.periodo || 'mes'}</Text>
                            </Text>
                            {suscripcion.fecha_vencimiento && (
                              <Text style={styles.ajustesPlanVence}>
                                {suscripcion.activa ? 'Vence el' : 'Venció el'} {new Date(suscripcion.fecha_vencimiento).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                              </Text>
                            )}
                          </LinearGradient>
                        </View>
                        <View style={styles.ajustesFeaturesRow}>
                          {['Programas ilimitados', 'IA incluida', 'Soporte coach', 'Progreso avanzado'].map(f => (
                            <View key={f} style={styles.ajustesFeatureItem}>
                              <AntDesign name="check" size={10} color="#00cc44" />
                              <Text style={styles.ajustesFeatureText}>{f}</Text>
                            </View>
                          ))}
                        </View>
                        <TouchableOpacity style={styles.ajustesRenovarBtn} onPress={() => Linking.openURL('https://repforge.app/renovar')}>
                          <LinearGradient colors={['#ff6600', '#cc4400']} style={styles.ajustesRenovarGradient}>
                            <Text style={styles.ajustesRenovarText}>Renovar suscripción</Text>
                          </LinearGradient>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.ajustesCancelarSubBtn} onPress={() => Linking.openURL('https://repforge.app/cancelar')}>
                          <Text style={styles.ajustesCancelarSubText}>Cancelar suscripción</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                        <Text style={styles.ajustesPlanLibre}>Estás en el plan gratuito</Text>
                        {[
                          { nombre: 'Pro Mensual', precio: '$9.99', periodo: '/mes', color: ['#1a3aff', '#0022cc'] },
                          { nombre: 'Pro Anual', precio: '$79.99', periodo: '/año', badge: '33% OFF', color: ['#ff6600', '#cc4400'] },
                          { nombre: 'Coach', precio: '$29.99', periodo: '/mes', badge: 'COACH', color: ['#9933ff', '#6600cc'] },
                        ].map(plan => (
                          <TouchableOpacity key={plan.nombre} style={styles.ajustesPlanOpcion} onPress={() => Linking.openURL('https://repforge.app/planes')}>
                            <LinearGradient colors={plan.color} style={styles.ajustesPlanOpcionGradient}>
                              <View style={styles.ajustesPlanOpcionRow}>
                                <Text style={styles.ajustesPlanOpcionNombre}>{plan.nombre}</Text>
                                {plan.badge && <View style={styles.ajustesPlanBadge}><Text style={styles.ajustesPlanBadgeText}>{plan.badge}</Text></View>}
                              </View>
                              <Text style={styles.ajustesPlanOpcionPrecio}>{plan.precio}<Text style={styles.ajustesPlanPeriodo}>{plan.periodo}</Text></Text>
                            </LinearGradient>
                          </TouchableOpacity>
                        ))}
                      </>
                    )}
                  </View>
                )}
                </Animated.View>
              </View>

              {/* CUENTA */}
              <Text style={styles.ajustesSectionLabel}>CUENTA</Text>
              <View style={styles.ajustesCard}>
                <TouchableOpacity style={styles.ajustesRow} onPress={() => toggleSeccion('privacidad', ajustePrivAnim)}>
                  <AntDesign name="lock" size={16} color="#4488ff" />
                  <Text style={styles.ajustesRowText}>Privacidad</Text>
                  <AntDesign name={seccionAjuste === 'privacidad' ? 'up' : 'down'} size={14} color="#2a4488" />
                </TouchableOpacity>
                <Animated.View style={{ opacity: ajustePrivAnim, transform: [{ translateY: ajustePrivAnim.interpolate({ inputRange: [0,1], outputRange: [-8,0] }) }] }}>
                {seccionAjuste === 'privacidad' && (
                  <View style={styles.ajustesSubSection}>
                    <TouchableOpacity style={styles.ajustesLinkRow} onPress={() => Linking.openURL('https://repforge.app/privacidad')}>
                      <Text style={styles.ajustesLinkText}>Política de privacidad</Text>
                      <AntDesign name="export" size={13} color="#2a4488" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.ajustesLinkRow} onPress={() => Linking.openURL('https://repforge.app/terminos')}>
                      <Text style={styles.ajustesLinkText}>Términos de uso</Text>
                      <AntDesign name="export" size={13} color="#2a4488" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.ajustesLinkRow} onPress={() => Alert.alert('Exportar datos', 'Tus datos serán enviados a tu correo registrado en los próximos minutos.')}>
                      <Text style={styles.ajustesLinkText}>Exportar mis datos</Text>
                      <AntDesign name="download" size={13} color="#2a4488" />
                    </TouchableOpacity>
                    <View style={styles.ajustesDivider} />
                    <TouchableOpacity style={[styles.ajustesLinkRow, { marginTop: 4 }]} onPress={() => setModalEliminarCuenta(true)}>
                      <Text style={[styles.ajustesLinkText, { color: '#ff3355' }]}>Eliminar mi cuenta</Text>
                      <AntDesign name="close" size={13} color="#ff3355" />
                    </TouchableOpacity>
                  </View>
                )}
                </Animated.View>
                <View style={styles.ajustesDivider} />
                <TouchableOpacity style={styles.ajustesRow} onPress={() => toggleSeccion('acerca', ajusteAcercaAnim)}>
                  <AntDesign name="info" size={16} color="#4488ff" />
                  <Text style={styles.ajustesRowText}>Acerca de RepForge</Text>
                  <AntDesign name={seccionAjuste === 'acerca' ? 'up' : 'down'} size={14} color="#2a4488" />
                </TouchableOpacity>
                <Animated.View style={{ opacity: ajusteAcercaAnim, transform: [{ translateY: ajusteAcercaAnim.interpolate({ inputRange: [0,1], outputRange: [-8,0] }) }] }}>
                {seccionAjuste === 'acerca' && (
                  <View style={styles.ajustesSubSection}>
                    <View style={styles.ajustesAcercaRow}>
                      <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                        <Text style={styles.ajustesAcercaLogoR}>REP</Text>
                        <Text style={styles.ajustesAcercaLogoF}>FORGE</Text>
                      </View>
                      <Text style={styles.ajustesAcercaVersion}>Versión 1.0.0</Text>
                      <Text style={styles.ajustesAcercaSub}>Periodización inteligente para atletas serios</Text>
                    </View>
                    <TouchableOpacity style={styles.ajustesLinkRow} onPress={() => Linking.openURL('https://repforge.app')}>
                      <Text style={styles.ajustesLinkText}>Sitio web</Text>
                      <AntDesign name="export" size={13} color="#2a4488" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.ajustesLinkRow} onPress={() => Linking.openURL('mailto:soporte@repforge.app')}>
                      <Text style={styles.ajustesLinkText}>Contactar soporte</Text>
                      <AntDesign name="export" size={13} color="#2a4488" />
                    </TouchableOpacity>
                  </View>
                  )}
                </Animated.View>
                <View style={styles.ajustesDivider} />
                <TouchableOpacity style={styles.ajustesRow} onPress={pedirCerrarSesion}>
                  <AntDesign name="logout" size={16} color="#ff3355" />
                  <Text style={[styles.ajustesRowText, { color: '#ff3355' }]}>Cerrar sesión</Text>
                  <AntDesign name="right" size={14} color="#ff3355" />
                </TouchableOpacity>
              </View>

              <Text style={styles.ajustesVersion}>RepForge v1.0.0 · Hecho con ❤️</Text>

            </ScrollView>
          </View>
          {/* Toast dentro del modal — flota sobre el sheet */}
          {globalToastAnim && <GlobalToast msg={globalToast?.msg} tipo={globalToast?.tipo || 'ok'} anim={globalToastAnim} opacityAnim={globalToastOpacity} />}
        </View>

      </Modal>

      {/* MODAL CONFIRMAR CERRAR SESIÓN */}
      <Modal visible={modalCerrarSesion} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBoxEstilo}>
            <View style={styles.confirmIconBox}>
              <AntDesign name="logout" size={26} color="#4488ff" />
            </View>
            <Text style={styles.confirmTituloEstilo}>¿Cerrar sesión?</Text>
            <Text style={styles.confirmWarnEstilo}>Tendrás que iniciar sesión nuevamente.</Text>
            <View style={styles.confirmBtnsEstilo}>
              <Pressable style={({ pressed }) => [styles.confirmCancelarEstilo, pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] }]} onPress={() => setModalCerrarSesion(false)}>
                <Text style={styles.confirmCancelarTextEstilo}>Cancelar</Text>
              </Pressable>
              <Pressable style={({ pressed }) => [styles.confirmEliminarEstilo, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]} onPress={cerrarSesion}>
                <LinearGradient colors={['#1a3aff', '#0022cc']} style={styles.confirmEliminarGradientEstilo}>
                  <AntDesign name="logout" size={13} color="#fff" />
                  <Text style={styles.confirmEliminarTextEstilo}>Cerrar sesión</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL ELIMINAR CUENTA */}
      <Modal visible={modalEliminarCuenta} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={[styles.ajustesContainer, { borderTopColor: '#ff3355', paddingTop: 24 }]}>
            <View style={styles.confirmIconBox}>
              <AntDesign name="closecircleo" size={26} color="#ff4444" />
            </View>
            <Text style={[styles.ajustesTitulo, { textAlign: 'center', marginTop: 12 }]}>¿Eliminar cuenta?</Text>
            <Text style={{ color: '#2a4488', fontSize: 13, textAlign: 'center', marginVertical: 12, lineHeight: 20 }}>
              Esta acción es permanente. Se eliminarán todos tus programas, progreso y datos.
            </Text>
            <Text style={styles.ajustesInputLabel}>ESCRIBE "ELIMINAR" PARA CONFIRMAR</Text>
            <TextInput
              style={[styles.ajustesInput, { marginBottom: 16, borderColor: confirmEliminar === 'ELIMINAR' ? '#ff3355' : '#0f1a3a' }]}
              value={confirmEliminar}
              onChangeText={setConfirmEliminar}
              placeholder="ELIMINAR"
              placeholderTextColor="#2a2a4a"
              autoCapitalize="characters"
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={[styles.confirmCancelarEstilo, { flex: 1 }]}
                onPress={() => { setModalEliminarCuenta(false); setConfirmEliminar('') }}
              >
                <Text style={styles.confirmCancelarTextEstilo}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmEliminarEstilo, { flex: 1, opacity: confirmEliminar === 'ELIMINAR' ? 1 : 0.4 }]}
                onPress={eliminarCuenta}
                disabled={confirmEliminar !== 'ELIMINAR'}
              >
                <LinearGradient colors={['#ff3355', '#cc0022']} style={styles.confirmEliminarGradientEstilo}>
                  <Text style={styles.confirmEliminarTextEstilo}>Eliminar cuenta</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </LinearGradient>
  )
}
// ============================================
// PANTALLA: LISTA DE BLOQUES
// ============================================

// ============================================
// VOLUMEN SEMANAL POR GRUPO MUSCULAR
// ============================================
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
  const [grupoInfo, setGrupoInfo] = useState(null)

  const volumenPorGrupo = {}
  const diasKey = `dias_${bloque.id}`
  const diasActivos = dias[diasKey] || []

  DIAS_SEMANA.forEach(dia => {
    if (!diasActivos.includes(dia.key)) return // solo días activos
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

function ListaBloques({ route, navigation }) {
  const { programaId, userId } = route.params
  const [programa, setPrograma] = useState({ programas: [], dias: {} })
  const [modalVisible, setModalVisible] = useState(false)
  const [bloqueEditando, setBloqueEditando] = useState(null)
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
          console.log('🔄 Programa recargado en ListaBloques')
          // Asegurar estructura válida
          if (!local.programas) local.programas = []
          if (!local.dias) local.dias = {}
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
      <LinearGradient colors={['#000000', '#050510', '#0a0a1f']} style={styles.gradient}>
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
    setPrograma(nuevoPrograma)
    await guardarYSincronizar(userId, nuevoPrograma)
    
    setNuevoBloque({ nombre: '', tipo: 'Adaptativo', semanas: '4' })
    setBloqueEditando(null)
    setModalVisible(false)
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
    setPrograma(nuevoPrograma)
    await guardarYSincronizar(userId, nuevoPrograma)
  }

  return (
    <LinearGradient colors={['#000000', '#050510', '#0a0a1f']} style={styles.gradient}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Programas</Text>
        </TouchableOpacity>

        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.programaNombreRow}>
              <Text style={styles.saludo}>{programaActual.nombre}</Text>
              {semanasDisponibles === 0 && (
                <View style={styles.completoBadge}>
                  <AntDesign name="check" size={11} color="#00cc44" />
                  <Text style={styles.completoBadgeText}>{semanasUsadas}/{programaActual.duracionSemanas} sem</Text>
                </View>
              )}
            </View>
            <Text style={styles.fecha}>
              {semanasUsadas}/{programaActual.duracionSemanas} semanas asignadas
            </Text>
          </View>
          <TouchableOpacity 
            style={[styles.addButton, semanasDisponibles === 0 && styles.addButtonDisabled]} 
            onPress={abrirModalNuevo}
            disabled={semanasDisponibles === 0}
          >
            <AntDesign name="plus" size={20} color={semanasDisponibles === 0 ? '#2a2a4a' : '#4488ff'} />
          </TouchableOpacity>
        </View>

        {/* Barra de progreso — solo si NO está completo */}
        {semanasDisponibles !== 0 && <View style={[
          styles.semanasProgresoBox,
          semanasUsadas > 0 && semanasDisponibles > 0 && styles.semanasProgresoIncompleto
        ]}>
          <View style={styles.semanasProgresoInfo}>
            <Text style={styles.semanasProgresoLabel}>
              {semanasUsadas === 0
                ? `${programaActual.duracionSemanas} semanas por asignar`
                : `⚠️ Faltan ${semanasDisponibles} semana(s)`}
            </Text>
            <Text style={styles.semanasProgresoPct}>{porcentajeUsado}%</Text>
          </View>
          <View style={styles.semanasProgresoTrack}>
            <View style={[
              styles.semanasProgresoFill,
              {
                width: `${porcentajeUsado}%`,
                backgroundColor: '#0033ff'
              }
            ]} />
          </View>
        </View>}

        {bloques.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyTitle}>Sin bloques</Text>
            <Text style={styles.emptySub}>
              Agrega bloques para estructurar tu programa de {programaActual.duracionSemanas} semanas
            </Text>
            <Pressable style={({ pressed }) => [styles.emptyButton, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]} onPress={abrirModalNuevo}>
              <LinearGradient colors={['#1a3aff', '#0022cc']} style={styles.emptyButtonGradient}>
                <Text style={styles.emptyButtonText}>+ Crear bloque</Text>
              </LinearGradient>
            </Pressable>
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
                    <View style={[styles.tipoBadge, { backgroundColor: coloresTipo[bloque.tipo] + '22', borderColor: coloresTipo[bloque.tipo] }]}>
                      <Text style={[styles.tipoText, { color: coloresTipo[bloque.tipo] }]}>{bloque.tipo.toUpperCase()}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.volumenHeaderInline}
                      onPress={() => setVolumenBloqueId(volumenBloqueId === bloque.id ? null : bloque.id)}
                    >
                      <Text style={styles.volumenTituloInline}>VOLUMEN SEMANAL</Text>
                      <AntDesign name={volumenBloqueId === bloque.id ? 'up' : 'down'} size={11} color="#ff6600" />
                    </TouchableOpacity>
                  </View>

                  {/* NOMBRE */}
                  <TouchableOpacity onPress={() => navigation.navigate('DiasBloque', { bloqueId: bloque.id, userId })}>
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
                    <Pressable style={({ pressed }) => [styles.controlBtn, pressed && { opacity: 0.7, transform: [{ scale: 0.9 }] }]} onPress={() => reordenarBloques(index, 'arriba')}>
                      <AntDesign name="up" size={16} color={index === 0 ? '#1a1a3a' : '#4488ff'} />
                    </Pressable>
                    <Pressable style={({ pressed }) => [styles.controlBtn, pressed && { opacity: 0.7, transform: [{ scale: 0.9 }] }]} onPress={() => reordenarBloques(index, 'abajo')}>
                      <AntDesign name="down" size={16} color={index === bloques.length - 1 ? '#1a1a3a' : '#4488ff'} />
                    </Pressable>
                    <Pressable style={({ pressed }) => [styles.controlBtn, pressed && { opacity: 0.7, transform: [{ scale: 0.9 }] }]} onPress={() => setBloqueAEliminar(bloque)}>
                      <AntDesign name="delete" size={16} color="#ff3355" />
                    </Pressable>
                    <Pressable style={({ pressed }) => [styles.controlBtn, pressed && { opacity: 0.7, transform: [{ scale: 0.9 }] }]} onPress={() => abrirModalEditar(bloque)}>
                      <AntDesign name="edit" size={16} color="#4488ff" />
                    </Pressable>
                  </View>
                </View>
              )
            })}

            {/* Advertencia si programa incompleto */}
            {bloques.length > 0 && semanasDisponibles > 0 && (
              <View style={styles.advertenciaBox}>
                <Text style={styles.advertenciaIcon}>⚠️</Text>
                <View style={styles.advertenciaTexto}>
                  <Text style={styles.advertenciaTitulo}>Programa incompleto</Text>
                  <Text style={styles.advertenciaSub}>
                    Faltan {semanasDisponibles} semana(s) por asignar. Agrega más bloques para completar las {programaActual.duracionSemanas} semanas.
                  </Text>
                </View>
              </View>
            )}
          </>
        )}

        {/* Modal nuevo/editar bloque */}
        <Modal visible={modalVisible} transparent animationType="slide">
          <View style={styles.modalOverlayBottom}>
            <TouchableOpacity 
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={() => {
                setModalVisible(false)
                setBloqueEditando(null)
              }}
            />
            <View style={styles.modalBoxBottom}>
              <Text style={styles.modalTitulo}>
                {bloqueEditando ? 'Editar Bloque' : 'Nuevo Bloque'}
              </Text>

              <Text style={styles.modalLabel}>NOMBRE</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: Bloque 1"
                  placeholderTextColor="#2a2a4a"
                  value={nuevoBloque.nombre}
                  onChangeText={t => setNuevoBloque(p => ({ ...p, nombre: t }))}
                />
              </View>

              <Text style={styles.modalLabel}>TIPO</Text>
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

              <Text style={styles.modalLabel}>SEMANAS</Text>
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
                <Pressable style={({ pressed }) => [styles.modalCancelar, pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] }]} onPress={() => {
                  setModalVisible(false)
                  setBloqueEditando(null)
                }}>
                  <Text style={styles.modalCancelarText}>Cancelar</Text>
                </Pressable>
                <Pressable style={({ pressed }) => [styles.modalGuardar, pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]} onPress={guardarBloque}>
                  <LinearGradient colors={['#1a3aff', '#0022cc']} style={styles.modalGuardarGradient}>
                    <Text style={styles.modalGuardarText}>
                      {bloqueEditando ? 'Guardar' : 'Crear'}
                    </Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

      </ScrollView>

      {/* Modal alerta estilizada */}
      <Modal visible={!!alertaMensaje} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.alertaBox}>
            <View style={styles.alertaIconBox}>
              <AntDesign name="exclamation" size={26} color="#ff9900" />
            </View>
            <Text style={styles.alertaTitulo}>Atención</Text>
            <Text style={styles.alertaMsg}>{alertaMensaje}</Text>
            <Pressable style={({ pressed }) => [styles.alertaBtn, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]} onPress={() => setAlertaMensaje(null)}>
              <LinearGradient colors={['#ff9900', '#cc7700']} style={styles.alertaBtnGradient}>
                <Text style={styles.alertaBtnText}>Entendido</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Modal confirmación eliminar */}
      <Modal visible={!!bloqueAEliminar} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBoxEstilo}>
            <View style={styles.confirmIconBox}>
              <AntDesign name="delete" size={26} color="#ff4444" />
            </View>
            <Text style={styles.confirmTituloEstilo}>¿Eliminar bloque?</Text>
            <Text style={styles.confirmSubEstilo}>"{bloqueAEliminar?.nombre}"</Text>
            <Text style={styles.confirmWarnEstilo}>Todos sus ejercicios serán eliminados permanentemente.</Text>
            <View style={styles.confirmBtnsEstilo}>
              <Pressable style={({ pressed }) => [styles.confirmCancelarEstilo, pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] }]} onPress={() => setBloqueAEliminar(null)}>
                <Text style={styles.confirmCancelarTextEstilo}>Cancelar</Text>
              </Pressable>
              <TouchableOpacity
                style={styles.confirmEliminarEstilo}
                onPress={() => { eliminarBloque(bloqueAEliminar.id); setBloqueAEliminar(null) }}
              >
                <LinearGradient colors={['#ff3355', '#cc0022']} style={styles.confirmEliminarGradientEstilo}>
                  <AntDesign name="delete" size={13} color="#fff" />
                  <Text style={styles.confirmEliminarTextEstilo}>Eliminar</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </LinearGradient>
  )
}

// ============================================
// PANTALLA: DÍAS DEL BLOQUE
// ============================================
function DiasBloque({ route, navigation }) {
  const { bloqueId, userId } = route.params
  const [programa, setPrograma] = useState({ programas: [], dias: {} })
  const [editandoDias, setEditandoDias] = useState(false)
  const [dropdownAbierto, setDropdownAbierto] = useState(null)
  const { triggerRefresh } = useContext(RefreshContext) || {}

  // Recargar programa cada vez que la pantalla recibe foco
  useFocusEffect(
    useCallback(() => {
      async function loadPrograma() {
        const local = await cargarPrograma(userId)
        if (local) {
          console.log('🔄 Programa recargado en DiasBloque')
          // Asegurar estructura válida
          if (!local.programas) local.programas = []
          if (!local.dias) local.dias = {}
          setPrograma(local)
        }
      }
      loadPrograma()
    }, [userId])
  )

  const bloque = programa.programas?.flatMap(p => p.bloques || []).find(b => b.id === bloqueId)
  if (!bloque) return null

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
    
    console.log('✅ Guardando días:', nuevoDias)
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

    console.log('🏷️ Guardando etiqueta:', diaKey, etiqueta)
    setPrograma(nuevoPrograma)
    await guardarYSincronizar(userId, nuevoPrograma)
    triggerRefresh?.()
  }

  const nombresDia = {
    0: 'Lunes', 1: 'Martes', 2: 'Miércoles',
    3: 'Jueves', 4: 'Viernes', 5: 'Sábado', 6: 'Domingo'
  }

  return (
    <LinearGradient colors={['#000000', '#050510', '#0a0a1f']} style={styles.gradient}>
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
                        style={styles.etiquetaSelector}
                        onPress={() => {
                          setDropdownAbierto(dropdownAbierto === dia.key ? null : dia.key)
                        }}
                      >
                        <Text style={[styles.etiquetaText, !etiqueta && styles.etiquetaPlaceholder]}>
                          {etiqueta || 'Seleccionar etiqueta'}
                        </Text>
                        <AntDesign name={dropdownAbierto === dia.key ? 'up' : 'down'} size={12} color="#4488ff" />
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
                {activo && !dropdownAbierto && <AntDesign name="right" size={14} color="#2a4488" />}
              </TouchableOpacity>
            </View>
          )
        })}

        {/* Modal selector de etiqueta - centrado */}
        {dropdownAbierto !== null && (
          <Modal
            visible={true}
            transparent
            animationType="fade"
            onRequestClose={() => setDropdownAbierto(null)}
          >
            <TouchableOpacity
              style={styles.modalOverlayBottom}
              activeOpacity={1}
              onPress={() => setDropdownAbierto(null)}
            >
              <View style={styles.etiquetaModalFlotante}>
                <View style={styles.etiquetaModalHeader}>
                  <Text style={styles.etiquetaModalTitulo}>Seleccionar etiqueta</Text>
                  <TouchableOpacity onPress={() => setDropdownAbierto(null)}>
                    <AntDesign name="close" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.etiquetaModalScroll} showsVerticalScrollIndicator={false}>
                  {ETIQUETAS_DIA.map((etiq) => (
                    <TouchableOpacity
                      key={etiq}
                      style={[styles.etiquetaModalItem, etiquetas[dropdownAbierto] === etiq && styles.etiquetaModalItemActivo]}
                      onPress={() => {
                        guardarEtiqueta(dropdownAbierto, etiq)
                        setDropdownAbierto(null)
                      }}
                    >
                      <Text style={[styles.etiquetaModalItemText, etiquetas[dropdownAbierto] === etiq && styles.etiquetaModalItemTextActivo]}>
                        {etiq}
                      </Text>
                      {etiquetas[dropdownAbierto] === etiq && <AntDesign name="check" size={16} color="#4488ff" />}
                    </TouchableOpacity>
                  ))}

                  {/* Opción para limpiar */}
                  {etiquetas[dropdownAbierto] && (
                    <TouchableOpacity
                      style={styles.etiquetaModalItemLimpiar}
                      onPress={() => {
                        guardarEtiqueta(dropdownAbierto, '')
                        setDropdownAbierto(null)
                      }}
                    >
                      <Text style={styles.etiquetaModalItemLimpiarText}>Limpiar etiqueta</Text>
                      <AntDesign name="close" size={16} color="#ff3355" />
                    </TouchableOpacity>
                  )}
                </ScrollView>
              </View>
            </TouchableOpacity>
          </Modal>
        )}

      </ScrollView>
    </LinearGradient>
  )
}

// ============================================
// PANTALLA: EJERCICIOS DEL DÍA
// ============================================
function EjerciciosDelDia({ route, navigation }) {
  const { bloqueId, diaKey, userId } = route.params
  const [programa, setPrograma] = useState({ programas: [], dias: {} })
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

  // Recargar programa cada vez que la pantalla recibe foco
  useFocusEffect(
    useCallback(() => {
      async function loadPrograma() {
        const local = await cargarPrograma(userId)
        if (local) {
          console.log('🔄 Programa recargado en Ejercicios')
          // Asegurar estructura válida
          if (!local.programas) local.programas = []
          if (!local.dias) local.dias = {}
          setPrograma(local)
        }
      }
      loadPrograma()
    }, [userId])
  )

  const bloque = programa.programas?.flatMap(p => p.bloques || []).find(b => b.id === bloqueId)
  if (!bloque) return null

  const ejerciciosKey = `ejercicios_${bloqueId}_${diaKey}`
  const ejercicios = programa.dias[ejerciciosKey] || []

  async function actualizarEjercicios(nuevosEjercicios) {
    const nuevoPrograma = {
      ...programa,
      dias: { ...programa.dias, [ejerciciosKey]: nuevosEjercicios }
    }
    
    console.log('✅ Guardando ejercicios:', nuevosEjercicios.length)
    setPrograma(nuevoPrograma)
    await guardarYSincronizar(userId, nuevoPrograma)
  }

  async function agregarEjercicio() {
    if (!nuevoEjercicio.nombre.trim() || !nuevoEjercicio.grupo) return

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
      }
      await actualizarEjercicios([...ejercicios, nuevo])
    }

    setNuevoEjercicio({ nombre: '', grupo: '', series: '3', repsMin: '8', repsMax: '12', rir: '2', peso: '', videoUrl: '' })
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
    await actualizarEjercicios(ejercicios.filter(e => e.id !== id))
  }

  async function guardarSesion(sesion) {
    console.log('💾 Guardando sesión:', sesion)
    
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
          console.log(`🔄 Sesión del ${fechaSesionStr} REEMPLAZADA`)
        } else {
          // AGREGAR nueva sesión
          nuevoHistorial = [...historialActual, sesion]
          console.log(`✨ Nueva sesión del ${fechaSesionStr} AGREGADA`)
        }
        
        console.log(`📊 Ejercicio "${ej.nombre}" ahora tiene ${nuevoHistorial.length} sesiones`)
        
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
    
    setPrograma(nuevoPrograma)
    await guardarYSincronizar(userId, nuevoPrograma)
    
    console.log('✅ Sesión guardada')
  }

  const nombresDia = {
    0: 'Lunes', 1: 'Martes', 2: 'Miércoles',
    3: 'Jueves', 4: 'Viernes', 5: 'Sábado', 6: 'Domingo'
  }

  return (
    <LinearGradient colors={['#000000', '#050510', '#0a0a1f']} style={styles.gradient}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← {bloque.nombre}</Text>
        </TouchableOpacity>

        <View style={styles.headerRow}>
          <View>
            <Text style={styles.saludo}>{nombresDia[diaKey]}</Text>
            <Text style={styles.fecha}>{bloque.tipo}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {ejercicios.length > 0 && (
              <TouchableOpacity
                style={[styles.addButton, modoEliminar && { borderColor: '#ff3355', backgroundColor: '#1a0005' }]}
                onPress={() => modoEliminar ? cancelarModoEliminar() : (setModoEliminar(true), setSeleccionados([]))}
              >
                <AntDesign name={modoEliminar ? 'close' : 'delete'} size={18} color="#ff3355" />
              </TouchableOpacity>
            )}
            {modoEliminar ? (
              <TouchableOpacity
                style={[styles.addButton, { borderColor: seleccionados.length === ejercicios.length ? '#4488ff' : '#0f1a3a', paddingHorizontal: 10 }]}
                onPress={toggleTodos}
              >
                <Text style={{ color: '#4488ff', fontSize: 11, fontWeight: '800' }}>
                  {seleccionados.length === ejercicios.length ? 'Ninguno' : 'Todo'}
                </Text>
              </TouchableOpacity>
            ) : (
              <Pressable style={({ pressed }) => [styles.addButton, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]} onPress={() => setModalVisible(true)}>
                <AntDesign name="plus" size={20} color="#4488ff" />
              </Pressable>
            )}
          </View>
        </View>

        {/* Banner modo eliminar */}
        {modoEliminar && (
          <View style={styles.modoEliminarBanner}>
            <Text style={styles.modoEliminarTxt}>
              {seleccionados.length === 0
                ? 'Selecciona los ejercicios a eliminar'
                : `${seleccionados.length} seleccionado${seleccionados.length > 1 ? 's' : ''}`}
            </Text>
            {seleccionados.length > 0 && (
              <TouchableOpacity
                style={styles.modoEliminarBtn}
                onPress={() => setConfirmarEliminarEjs(true)}
              >
                <LinearGradient colors={['#ff3355', '#cc0022']} style={styles.modoEliminarBtnGradient}>
                  <AntDesign name="delete" size={13} color="#fff" />
                  <Text style={styles.modoEliminarBtnText}>Eliminar ({seleccionados.length})</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        )}

        {ejercicios.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>🏋️</Text>
            <Text style={styles.emptyTitle}>Sin ejercicios</Text>
            <Text style={styles.emptySub}>Toca el + para agregar ejercicios a este día</Text>
            <Pressable style={({ pressed }) => [styles.emptyButton, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]} onPress={() => setModalVisible(true)}>
              <LinearGradient colors={['#1a3aff', '#0022cc']} style={styles.emptyButtonGradient}>
                <Text style={styles.emptyButtonText}>+ Agregar ejercicio</Text>
              </LinearGradient>
            </Pressable>
          </View>
        ) : (
          ejercicios.map((ej, index) => (
            <TouchableOpacity
              key={ej.id}
              activeOpacity={modoEliminar ? 0.7 : 1}
              onPress={() => modoEliminar && toggleSeleccion(ej.id)}
            >
              <View style={[
                styles.ejercicioCard,
                modoEliminar && seleccionados.includes(ej.id) && styles.ejercicioCardSeleccionado
              ]}>
                <View style={styles.ejercicioHeader}>
                  {modoEliminar ? (
                    <View style={styles.checkboxBox}>
                      <AntDesign
                        name={seleccionados.includes(ej.id) ? 'check' : 'checkcircleo'}
                        size={20}
                        color={seleccionados.includes(ej.id) ? '#ff3355' : '#2a4488'}
                      />
                    </View>
                  ) : (
                    <View style={styles.ejercicioNum}>
                      <Text style={styles.ejercicioNumText}>{index + 1}</Text>
                    </View>
                  )}
                  <View style={styles.ejercicioInfo}>
                    <Text style={styles.ejercicioNombre}>{ej.nombre}</Text>
                    <Text style={styles.ejercicioGrupo}>{ej.grupo}</Text>
                  </View>
                  {!modoEliminar && (
                    <View style={styles.ejercicioAcciones}>
                      <TouchableOpacity
                        style={{ padding: 2 }}
                        onPress={() => {
                          const url = ej.videoUrl && ej.videoUrl.trim()
                          if (url) {
                            Linking.openURL(url).catch(() =>
                              Alert.alert('Sin video', 'No se pudo abrir el link')
                            )
                          } else {
                            abrirEdicionEjercicio(ej)
                          }
                        }}
                      >
                        <AntDesign name="youtube" size={20} color={ej.videoUrl ? "#ff3355" : "#2a4488"} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => abrirEdicionEjercicio(ej)} style={{ marginLeft: 12 }}>
                        <AntDesign name="edit" size={18} color="#4488ff" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {!modoEliminar && (
                  <>
                    <View style={styles.prescripcionRow}>
                      <View style={styles.prescripcionItem}>
                        <Text style={styles.prescripcionNum}>{ej.series}</Text>
                        <Text style={styles.prescripcionLabel}>series</Text>
                      </View>
                      <View style={styles.prescripcionDivider} />
                      <View style={styles.prescripcionItem}>
                        <Text style={styles.prescripcionNum}>{ej.reps}</Text>
                        <Text style={styles.prescripcionLabel}>reps</Text>
                      </View>
                      <View style={styles.prescripcionDivider} />
                      <View style={styles.prescripcionItem}>
                        <Text style={styles.prescripcionNum}>RIR {ej.rir}</Text>
                        <Text style={styles.prescripcionLabel}>reserva</Text>
                      </View>
                      <View style={styles.prescripcionDivider} />
                      <View style={styles.prescripcionItem}>
                        <Text style={styles.prescripcionNum}>{ej.peso > 0 ? `${ej.peso}kg` : '—'}</Text>
                        <Text style={styles.prescripcionLabel}>sugerido</Text>
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
              </View>
            </TouchableOpacity>
          ))
        )}

        {ejercicios.length > 0 && !modoEliminar && (
          <Pressable style={({ pressed }) => [styles.agregarMasBtn, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]} onPress={() => setModalVisible(true)}>
            <AntDesign name="plus" size={16} color="#4488ff" />
            <Text style={styles.agregarMasText}>Agregar ejercicio</Text>
          </Pressable>
        )}

        {/* Modal agregar/editar ejercicio */}
        <Modal visible={modalVisible} transparent animationType="slide">
          <View style={styles.modalOverlayBottom}>
            <TouchableOpacity
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={() => { setModalVisible(false); setEjercicioEditando(null) }}
            />
            <View style={styles.modalBoxBottom}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitulo}>{ejercicioEditando ? 'Editar Ejercicio' : 'Nuevo Ejercicio'}</Text>

                <Text style={styles.modalLabel}>NOMBRE DEL EJERCICIO</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="Ej: Press de Banca"
                    placeholderTextColor="#2a2a4a"
                    value={nuevoEjercicio.nombre}
                    onChangeText={t => setNuevoEjercicio(p => ({ ...p, nombre: t }))}
                  />
                </View>

                <Text style={styles.modalLabel}>GRUPO MUSCULAR</Text>
                <TouchableOpacity
                  style={[styles.inputWrapper, { marginBottom: 16 }]}
                  onPress={() => setModalGrupoVisible(true)}
                >
                  <View style={[styles.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                    <Text style={{ color: nuevoEjercicio.grupo ? '#fff' : '#2a2a4a', fontSize: 15 }}>
                      {nuevoEjercicio.grupo || 'Selecciona grupo muscular'}
                    </Text>
                    <AntDesign name="down" size={14} color="#2a4488" />
                  </View>
                </TouchableOpacity>

                <Text style={styles.modalLabel}>SERIES</Text>
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

                <Text style={styles.modalLabel}>RANGO DE REPS</Text>
                <View style={styles.repsRow}>
                  <View style={[styles.inputWrapper, { flex: 1, marginBottom: 0 }]}>
                    <TextInput
                      style={styles.input}
                      placeholder="Min"
                      placeholderTextColor="#2a2a4a"
                      value={nuevoEjercicio.repsMin}
                      onChangeText={t => setNuevoEjercicio(p => ({ ...p, repsMin: t }))}
                      keyboardType="number-pad"
                    />
                  </View>
                  <Text style={styles.repsGuion}>—</Text>
                  <View style={[styles.inputWrapper, { flex: 1, marginBottom: 0 }]}>
                    <TextInput
                      style={styles.input}
                      placeholder="Max"
                      placeholderTextColor="#2a2a4a"
                      value={nuevoEjercicio.repsMax}
                      onChangeText={t => setNuevoEjercicio(p => ({ ...p, repsMax: t }))}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>

                <Text style={[styles.modalLabel, { marginTop: 16 }]}>RIR (REPS EN RESERVA)</Text>
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

                <Text style={styles.modalLabel}>PESO SUGERIDO (kg) — OPCIONAL</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="Ej: 80"
                    placeholderTextColor="#2a2a4a"
                    value={nuevoEjercicio.peso}
                    onChangeText={t => setNuevoEjercicio(p => ({ ...p, peso: t }))}
                    keyboardType="decimal-pad"
                  />
                </View>

                <Text style={[styles.modalLabel, { marginTop: 16 }]}>VIDEO DE REFERENCIA — OPCIONAL</Text>
                <View style={[styles.inputWrapper, { flexDirection: 'row', alignItems: 'center' }]}>
                  <AntDesign name="youtube" size={18} color="#ff3355" style={{ marginLeft: 12 }} />
                  <TextInput
                    style={[styles.input, { flex: 1, borderWidth: 0, paddingLeft: 8 }]}
                    placeholder="https://youtube.com/watch?v=..."
                    placeholderTextColor="#2a2a4a"
                    value={nuevoEjercicio.videoUrl}
                    onChangeText={t => setNuevoEjercicio(p => ({ ...p, videoUrl: t }))}
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                  {nuevoEjercicio.videoUrl?.length > 5 && (
                    <TouchableOpacity onPress={() => setNuevoEjercicio(p => ({...p, videoUrl: ''}))} style={{ paddingRight: 12 }}>
                      <AntDesign name="closecircle" size={16} color="#2a4488" />
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.modalButtons}>
                  <Pressable
                    style={styles.modalCancelar}
                    onPress={() => {
                      setModalVisible(false)
                      setEjercicioEditando(null)
                      setNuevoEjercicio({ nombre: '', grupo: '', series: '3', repsMin: '8', repsMax: '12', rir: '2', peso: '', videoUrl: '' })
                    }}
                  >
                    <Text style={styles.modalCancelarText}>Cancelar</Text>
                  </Pressable>
                  <Pressable style={({ pressed }) => [styles.modalGuardar, pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]} onPress={agregarEjercicio}>
                    <LinearGradient colors={['#1a3aff', '#0022cc']} style={styles.modalGuardarGradient}>
                      <Text style={styles.modalGuardarText}>{ejercicioEditando ? 'Guardar' : 'Agregar'}</Text>
                    </LinearGradient>
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

      </ScrollView>

      {/* MODAL CONFIRMAR ELIMINAR SELECCIONADOS */}
      <Modal visible={confirmarEliminarEjs} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBoxEstilo}>
            <View style={styles.confirmIconBox}>
              <AntDesign name="delete" size={26} color="#ff4444" />
            </View>
            <Text style={styles.confirmTituloEstilo}>¿Eliminar ejercicios?</Text>
            <Text style={styles.confirmSubEstilo}>
              {seleccionados.length} ejercicio{seleccionados.length > 1 ? 's' : ''} seleccionado{seleccionados.length > 1 ? 's' : ''}
            </Text>
            <Text style={styles.confirmWarnEstilo}>Esta acción no se puede deshacer.</Text>
            <View style={styles.confirmBtnsEstilo}>
              <Pressable style={({ pressed }) => [styles.confirmCancelarEstilo, pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] }]} onPress={() => setConfirmarEliminarEjs(false)}>
                <Text style={styles.confirmCancelarTextEstilo}>Cancelar</Text>
              </Pressable>
              <Pressable style={({ pressed }) => [styles.confirmEliminarEstilo, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]} onPress={confirmarEliminarSeleccionados}>
                <LinearGradient colors={['#ff3355', '#cc0022']} style={styles.confirmEliminarGradientEstilo}>
                  <AntDesign name="delete" size={13} color="#fff" />
                  <Text style={styles.confirmEliminarTextEstilo}>Eliminar</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL GRUPO MUSCULAR */}
      <Modal visible={modalGrupoVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalGrupoVisible(false)}
        >
          <View style={styles.selectorModal}>
            <View style={styles.selectorHeader}>
              <Text style={styles.selectorTitulo}>Grupo muscular</Text>
              <TouchableOpacity onPress={() => setModalGrupoVisible(false)}>
                <AntDesign name="close" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.grupoGrid}>
              {GRUPOS_MUSCULARES.map(g => (
                <TouchableOpacity
                  key={g}
                  style={[styles.grupoChip, nuevoEjercicio.grupo === g && styles.grupoChipActivo]}
                  onPress={() => {
                    setNuevoEjercicio(p => ({ ...p, grupo: g }))
                    setModalGrupoVisible(false)
                  }}
                >
                  <Text style={[styles.grupoChipText, nuevoEjercicio.grupo === g && styles.grupoChipTextActivo]}>{g}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* MODAL REGISTRAR SERIES */}
      {ejercicioRegistrando && (
        <RegistrarSeries
          visible={!!ejercicioRegistrando}
          onClose={() => setEjercicioRegistrando(null)}
            ejercicio={ejercicioRegistrando}
            onGuardar={guardarSesion}
          />
        )}

    </LinearGradient>
  )
}

// Stack de rutinas
// Ref global para poder resetear el stack de rutinas desde el tab bar
// Key global para resetear el stack de rutinas
// rutinasNavigation movido a rutinasRef.js para evitar ciclos

function RutinasTab() {
  // Eliminamos el estado 'covering'

  // Función expuesta para doble tap desde PagerTabs
  rutinasNavigation.reset = () => {
    if (!rutinasNavigation.ref?.canGoBack?.()) return
    
    // Navegamos directamente a la primera pantalla para ver la transición de regreso
    rutinasNavigation.ref?.navigate('ListaProgramas', { isDoubleTap: true })
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      <RutinaStack.Navigator
        screenOptions={{ 
          headerShown: false,
          contentStyle: { backgroundColor: '#000000' },
          animation: 'slide_from_right',
          animationDuration: 120,
          gestureEnabled: true,
          gestureDirection: 'horizontal',
        }}
      >
        <RutinaStack.Screen
          name="ListaProgramas"
          component={ListaProgramas}
          options={({ route }) => ({
            // Solo si viene del doble tap, entra desde la izquierda. Si no, animación normal.
            animation: route.params?.isDoubleTap ? 'slide_from_left' : 'slide_from_right',
          })}
          listeners={({ navigation, route }) => ({
            focus: () => { 
              rutinasNavigation.ref = null 
            },
            blur: () => {
              // Limpiamos la bandera al salir para no afectar navegaciones futuras
              if (route.params?.isDoubleTap) {
                navigation.setParams({ isDoubleTap: false })
              }
            }
          })}
        />
        <RutinaStack.Screen
          name="ListaBloques"
          component={ListaBloques}
          listeners={({ navigation }) => ({
            focus: () => { rutinasNavigation.ref = navigation },
          })}
        />
        <RutinaStack.Screen
          name="DiasBloque"
          component={DiasBloque}
          listeners={({ navigation }) => ({
            focus: () => { rutinasNavigation.ref = navigation },
          })}
        />
        <RutinaStack.Screen
          name="Ejercicios"
          component={EjerciciosDelDia}
          listeners={({ navigation }) => ({
            focus: () => { rutinasNavigation.ref = navigation },
          })}
        />
      </RutinaStack.Navigator>
      {/* Eliminamos el View negro con absolute que causaba el destello */}
    </View>
  )
}

function ProgresoScreen() {
  const { userId } = useContext(UserContext)
  return <View style={{ flex:1, backgroundColor:'#000' }}><Progreso userId={userId} /></View>
}

function IATab() {
  const { userId } = useContext(UserContext)
  return <View style={{ flex:1, backgroundColor:'#000' }}><IAScreen userId={userId} /></View>
}

function PerfilScreen() {
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
    <LinearGradient colors={['#000000', '#050510', '#0a0a1f']} style={styles.gradient}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#4488ff" />
      </View>
    </LinearGradient>
  )
}

function ComunidadScreen() {
  const { userId } = useContext(UserContext)
  return <View style={{ flex:1, backgroundColor:'#000' }}><Comunidad userId={userId} esCoach={false} /></View>
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
          <AntDesign name={tipo === 'ok' ? 'checkcircle' : 'closecircle'} size={20} color={color} />
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

export default function Dashboard({ userId }) {
  const [refreshCount, setRefreshCount] = useState(0)
  const triggerRefresh = useCallback(() => setRefreshCount(c => c + 1), [])
  const [fotoUrlGlobal, setFotoUrlGlobal] = useState(null)
  const [nombreGlobal, setNombreGlobal] = useState('U')
  const [rol, setRol] = useState(null)
  const [vistaOverride, setVistaOverride] = useState(null)
  const [globalToast, setGlobalToast] = useState(null)
  const globalToastAnim = useRef(new Animated.Value(-420)).current
  const globalToastOpacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    supabase.from('perfiles').select('rol').eq('id', userId).single()
      .then(({ data }) => { if (data?.rol) setRol(data.rol) })
  }, [userId])

  function dispararToast(msg, tipo = 'ok') {
    setGlobalToast({ msg, tipo })
    globalToastAnim.setValue(-420)
    globalToastOpacity.setValue(0)
    Animated.parallel([
      Animated.spring(globalToastAnim, { toValue: 0, useNativeDriver: true, tension: 70, friction: 11 }),
      Animated.timing(globalToastOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start()
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(globalToastAnim, { toValue: 420, duration: 320, useNativeDriver: true }),
        Animated.timing(globalToastOpacity, { toValue: 0, duration: 320, useNativeDriver: true }),
      ]).start(() => setGlobalToast(null))
    }, 2600)
  }

  // Mientras carga el rol
  if (rol === null) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <Text style={{ fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: 2 }}>REP</Text>
          <Text style={{ fontSize: 26, fontWeight: '900', color: '#4488ff', letterSpacing: 2 }}>FORGE</Text>
        </View>
      </View>
    )
  }

  // MODO SUPERADMIN — solo para el dueño de la app
  const esSuperadmin = userId === '7d381a03-17b2-4bbe-83a2-ab5c9a4f2fc7'

  if (vistaOverride === 'coach' || (rol === 'coach' && vistaOverride !== 'cliente')) {
    return (
      <View style={{ flex: 1 }}>
        <CoachDashboard userId={userId} onSwitchToCliente={() => setVistaOverride('cliente')} />

      </View>
    )
  }

  return (
    <UserContext.Provider value={{ userId }}>
      <RefreshContext.Provider value={{ triggerRefresh, refreshCount }}>
      <AjustesContext.Provider value={{ abrirAjustes: () => {} }}>
      <SwitchDashContext.Provider value={{ switchToCoach: () => setVistaOverride('coach') }}>
      <ToastContext.Provider value={{ dispararToast, globalToast, globalToastAnim, globalToastOpacity }}>
      <PerfilContext.Provider value={{ fotoUrl: fotoUrlGlobal, nombre: nombreGlobal, setFotoUrl: setFotoUrlGlobal, setNombreCtx: setNombreGlobal }}>
      <PagerTabs
        tabs={[
          { name: 'Inicio',    icon: 'home',     component: InicioScreen },
          { name: 'Rutina',    icon: 'calendar',  component: RutinasTab,
            onReselect: () => { rutinasNavigation.reset?.() }
          },
          { name: 'Progreso',  icon: 'bars',      component: ProgresoScreen },
          { name: 'IA',        icon: 'bulb',      component: IATab },
          { name: 'Comunidad', icon: 'team',      component: ComunidadScreen },
        ]}
      />
      
      </PerfilContext.Provider>
      </ToastContext.Provider>
      </SwitchDashContext.Provider>
      </AjustesContext.Provider>
      </RefreshContext.Provider>
    </UserContext.Provider>
  )
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { padding: 20, paddingTop: 56, paddingBottom: LAYOUT.bottomTabSpace || 150 },
  tabBar: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#08091a',
    borderWidth: 1,
    borderColor: '#0f1a3a',
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
    width: '95%',          // <-- Toma casi todo el ancho disponible sin chocar
    paddingVertical: 8,    
    borderRadius: 18,      
    overflow: 'hidden',    
    backgroundColor: 'transparent',
  },
  tabItemWrapActive: {
    backgroundColor: 'rgba(68, 136, 255, 0.15)', 
    borderRadius: 18,      
  },
  tabLabel: {
    fontSize: 9.5,       // <-- Bajamos medio punto para que "Comunidad" respire
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
    backgroundColor: '#1a3aff',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#1a3aff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 12,
    elevation: 8,
  },
  tabPillLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  tabIconWrapActive: {
    backgroundColor: '#0a1535',
    borderRadius: 21,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  saludo: { fontSize: 26, fontWeight: '900', color: '#fff' },
  fecha: { fontSize: 13, color: '#2a4488', marginTop: 2 },
  
  semanasProgresoBox: { backgroundColor: '#05050f', borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 14, padding: 16, marginBottom: 20 },
  semanasProgresoCompleto: { borderColor: '#00cc44', backgroundColor: '#001a0f' },
  semanasProgresoIncompleto: { borderColor: '#ff9900', backgroundColor: '#1a0f00' },
  semanasProgresoInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  semanasProgresoLabel: { color: '#fff', fontWeight: '700', fontSize: 13 },
  semanasProgresoPct: { color: '#4488ff', fontWeight: '700', fontSize: 13 },
  semanasProgresoTrack: { height: 6, backgroundColor: '#0a0a2a', borderRadius: 3, overflow: 'hidden' },
  semanasProgresoFill: { height: '100%', backgroundColor: '#0033ff', borderRadius: 3 },
  
  addButton: { padding: 8, borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 10, backgroundColor: '#05050f' },
  addButtonDisabled: { opacity: 0.3 },
  
  advertenciaBox: { flexDirection: 'row', backgroundColor: '#1a0f00', borderWidth: 1, borderColor: '#ff9900', borderRadius: 14, padding: 16, marginTop: 12, gap: 12 },
  advertenciaIcon: { fontSize: 24 },
  advertenciaTexto: { flex: 1 },
  advertenciaTitulo: { color: '#ff9900', fontSize: 14, fontWeight: '700', marginBottom: 4 },
  advertenciaSub: { color: '#ff9900', fontSize: 12, lineHeight: 18, opacity: 0.8 },
  
  rfBadge: { flexDirection: 'row', backgroundColor: '#0a0a2a', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#1a1a3a' },
  rfR: { fontSize: 18, fontWeight: '900', color: '#fff' },
  rfF: { fontSize: 18, fontWeight: '900', color: '#4488ff' },
  addButton: { padding: 8, borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 10, backgroundColor: '#05050f' },
  deleteBtn: { padding: 4 },
  card: { backgroundColor: '#05050f', borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 16, padding: 18, marginBottom: 14 },
  cardLabel: { fontSize: 10, color: '#2a4488', letterSpacing: 2, fontWeight: '700', marginBottom: 8 },
  cardTitle: { fontSize: 17, color: '#fff', fontWeight: '700', marginBottom: 4 },
  cardSub: { fontSize: 13, color: '#2a4488', marginBottom: 14 },
  cardRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  cardSmall: { backgroundColor: '#05050f', borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 16, padding: 18, alignItems: 'center' },
  cardSmallIcon: { fontSize: 24, marginBottom: 6 },
  cardSmallNum: { fontSize: 24, fontWeight: '900', color: '#fff' },
  cardSmallLabel: { fontSize: 11, color: '#2a4488', marginTop: 2 },
  linkButton: { marginTop: 4 },
  linkButtonText: { color: '#4488ff', fontSize: 13, fontWeight: '600' },
  bloqueCard: { backgroundColor: '#05050f', borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 16, padding: 18, marginBottom: 12 },
  tipoBadge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  tipoText: { fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  bloqueNombre: { fontSize: 20, fontWeight: '900', color: '#fff', marginBottom: 4 },
  bloqueSub: { fontSize: 13, color: '#2a4488', marginBottom: 16 },
  bloqueTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  volumenHeaderInline: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: '#ff6600', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  volumenTituloInline: { fontSize: 9, fontWeight: '800', color: '#ff6600', letterSpacing: 1.5 },
  
  // ═══ CONTROLES HORIZONTALES ABAJO ═══
  bloqueControles: { 
    flexDirection: 'row', 
    gap: 6, 
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#0f1a3a'
  },
  controlBtn: { 
    flex: 1,
    padding: 8, 
    borderWidth: 1, 
    borderColor: '#0f1a3a', 
    borderRadius: 8, 
    backgroundColor: '#0a0a1f',
    alignItems: 'center',
    justifyContent: 'center'
  },
  bloqueFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bloqueEstado: { fontSize: 12, color: '#2a4488' },
  backButton: { marginBottom: 16 },
  backText: { color: '#4488ff', fontSize: 14, fontWeight: '600' },
  editDiasBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#0f1a3a', backgroundColor: '#05050f' },
  editDiasBtnActivo: { borderColor: '#0033ff', backgroundColor: '#05051f' },
  editDiasBtnText: { color: '#2a4488', fontSize: 12, fontWeight: '700' },
  editDiasBtnTextActivo: { color: '#4488ff' },
  diasEditorBox: { backgroundColor: '#05050f', borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 14, padding: 16, marginBottom: 16 },
  diasRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 8 },
  diaChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#0a2a0a', backgroundColor: '#050f05' },
  diaChipActivo: { borderColor: '#00cc44', backgroundColor: '#002a10', shadowColor: '#00cc44', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 6 },
  diaChipText: { color: '#1a4a1a', fontWeight: '700', fontSize: 12 },
  diaChipTextActivo: { color: '#00ee55' },
  diaCardWrapper: { position: 'relative', zIndex: 1 },
  diaCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#05050f', borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 14, padding: 16, marginBottom: 10 },
  diaDescanso: { opacity: 0.35 },
  diaLabelBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#0a0a2a', borderWidth: 1, borderColor: '#1a1a3a', justifyContent: 'center', alignItems: 'center' },
  diaLabelBoxActivo: { borderColor: '#0033ff' },
  diaLabel: { color: '#2a4488', fontWeight: '900', fontSize: 12 },
  diaLabelActivo: { color: '#4488ff' },
  diaInfo: { flex: 1 },
  diaNombre: { color: '#fff', fontWeight: '700', fontSize: 15 },
  
  etiquetaContainer: { marginTop: 6, marginBottom: 6 },
  etiquetaSelector: { 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0a0a2a', 
    borderWidth: 1, 
    borderColor: '#0f1a3a',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 36
  },
  etiquetaText: { color: '#4488ff', fontSize: 12, fontWeight: '700' },
  etiquetaPlaceholder: { color: '#2a4488', fontWeight: '600' },
  
  // Modal flotante centrado
  etiquetaModalFlotante: {
    backgroundColor: '#05050f',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#0033ff',
    padding: 16,
    maxHeight: '60%',
    width: '75%',
    alignSelf: 'center',
    shadowColor: '#0033ff',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 10
  },
  etiquetaModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#0f1a3a'
  },
  etiquetaModalTitulo: {
    fontSize: 16,
    fontWeight: '900',
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
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: '#0a0a1f',
    borderWidth: 1,
    borderColor: '#0f1a3a'
  },
  etiquetaModalItemActivo: {
    backgroundColor: '#0a0a2a',
    borderColor: '#0033ff'
  },
  etiquetaModalItemText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },
  etiquetaModalItemTextActivo: {
    color: '#4488ff',
    fontWeight: '700'
  },
  etiquetaModalItemLimpiar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    marginTop: 6,
    backgroundColor: '#1a0f0f',
    borderWidth: 1,
    borderColor: '#ff3355'
  },
  etiquetaModalItemLimpiarText: {
    color: '#ff3355',
    fontSize: 14,
    fontWeight: '600'
  },

  // Volumen semanal
  volumenVacio: { color: '#2a4488', fontSize: 12, fontWeight: '600', fontStyle: 'italic' },
  programaNombreRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  completoBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#001a0f', borderWidth: 1, borderColor: '#00cc44', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  completoBadgeText: { color: '#00cc44', fontSize: 10, fontWeight: '800' },

  // Modal alerta estilizada
  alertaBox: { backgroundColor: '#05050f', borderRadius: 20, padding: 26, width: '100%', borderWidth: 1, borderColor: '#ff9900', alignItems: 'center' },
  alertaIconBox: { width: 54, height: 54, borderRadius: 14, backgroundColor: '#1a0f00', borderWidth: 1, borderColor: '#ff9900', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  alertaTitulo: { fontSize: 18, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 8 },
  alertaMsg: { fontSize: 13, color: '#2a4488', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  alertaBtn: { width: '100%', borderRadius: 11, overflow: 'hidden' },
  alertaBtnGradient: { padding: 13, alignItems: 'center' },
  alertaBtnText: { color: '#fff', fontWeight: '900', fontSize: 13 },

  // Modal eliminar bloque — estilo Progreso
  confirmOverlay: { flex: 1, backgroundColor: 'rgba(0,2,15,0.92)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  confirmBoxEstilo: { backgroundColor: '#08080f', borderRadius: 22, padding: 26, width: '100%', borderWidth: 1, borderColor: '#ff335566', alignItems: 'center', shadowColor: '#ff3355', shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
  confirmIconBox: { width: 54, height: 54, borderRadius: 14, backgroundColor: '#1a0000', borderWidth: 1, borderColor: '#ff3355', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  confirmTituloEstilo: { fontSize: 18, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 6 },
  confirmSubEstilo: { fontSize: 14, color: '#4488ff', fontWeight: '600', textAlign: 'center', marginBottom: 4 },
  confirmWarnEstilo: { fontSize: 11, color: '#ff4444', textAlign: 'center', marginBottom: 20 },
  confirmBtnsEstilo: { flexDirection: 'row', gap: 10, width: '100%' },
  confirmCancelarEstilo: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#1a3aff44', backgroundColor: '#05051a', alignItems: 'center' },
  confirmCancelarTextEstilo: { color: '#2a4488', fontWeight: '700', fontSize: 13 },
  confirmEliminarEstilo: { flex: 1, borderRadius: 11, overflow: 'hidden' },
  confirmEliminarGradientEstilo: { padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 11 },
  confirmEliminarTextEstilo: { color: '#fff', fontWeight: '900', fontSize: 13 },
  volumenHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12 },
  volumenTitulo: { fontSize: 10, fontWeight: '800', color: '#ff6600', letterSpacing: 2 },
  volumenContent: { paddingHorizontal: 14, paddingBottom: 14, gap: 10 },
  volumenRow: { gap: 6 },
  volumenGrupo: { color: '#fff', fontSize: 12, fontWeight: '700' },
  volumenBarTrack: { height: 6, backgroundColor: '#0a0a2a', borderRadius: 4, overflow: 'hidden' },
  volumenBarFill: { height: '100%', backgroundColor: '#4488ff', borderRadius: 4 },
  volumenSeriesRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  volumenSeries: { color: '#4488ff', fontSize: 11, fontWeight: '700', position: 'absolute', right: 28, top: 0 },
  volumenInfoBtn: { position: 'absolute', right: 0, top: -2, width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: '#2a4488', alignItems: 'center', justifyContent: 'center' },
  volumenInfoIcon: { color: '#2a4488', fontSize: 10, fontWeight: '900' },
  volumenTooltip: { backgroundColor: '#0a0a2a', borderWidth: 1, borderColor: '#1a3aff', borderRadius: 12, padding: 14, marginTop: 6, gap: 6 },
  volumenTooltipTitulo: { color: '#fff', fontSize: 13, fontWeight: '900', marginBottom: 4 },
  volumenTooltipText: { color: '#2a4488', fontSize: 12 },
  volumenTooltipNum: { color: '#4488ff', fontWeight: '700' },
  volumenTooltipClose: { alignSelf: 'flex-end', marginTop: 4 },
  volumenTooltipCloseText: { color: '#4488ff', fontSize: 12, fontWeight: '700' },

  diaGrupos: { color: '#2a4488', fontSize: 12, marginTop: 2 },
  emptyBox: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { fontSize: 52, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '900', color: '#fff', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#2a4488', textAlign: 'center', marginBottom: 24 },
  emptyButton: { borderRadius: 14, overflow: 'hidden' },
  emptyButtonGradient: { paddingHorizontal: 24, paddingVertical: 14 },
  emptyButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  ejercicioCard: { backgroundColor: '#05050f', borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 16, padding: 16, marginBottom: 12 },
  ejercicioCardSeleccionado: { borderColor: '#ff3355', backgroundColor: '#1a0005' },
  ejercicioHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  checkboxBox: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  modoEliminarBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1a0005', borderWidth: 1, borderColor: '#ff3355', borderRadius: 12, padding: 12, marginBottom: 12 },
  modoEliminarTxt: { color: '#ff3355', fontSize: 12, fontWeight: '700', flex: 1 },
  modoEliminarBtn: { borderRadius: 8, overflow: 'hidden' },
  modoEliminarBtnGradient: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8 },
  modoEliminarBtnText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  ejercicioNum: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#0a0a2a', borderWidth: 1, borderColor: '#1a1a3a', justifyContent: 'center', alignItems: 'center' },
  ejercicioNumText: { color: '#4488ff', fontWeight: '900', fontSize: 13 },
  ejercicioInfo: { flex: 1 },
  ejercicioNombre: { color: '#fff', fontWeight: '700', fontSize: 15 },
  ejercicioGrupo: { color: '#2a4488', fontSize: 12, marginTop: 2 },
  ejercicioAcciones: { flexDirection: 'row', alignItems: 'center' },
  prescripcionRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0a0a1f', borderRadius: 12, padding: 12, marginBottom: 12 },
  prescripcionItem: { flex: 1, alignItems: 'center' },
  prescripcionNum: { color: '#fff', fontWeight: '900', fontSize: 14 },
  prescripcionLabel: { color: '#2a4488', fontSize: 10, marginTop: 2 },
  prescripcionDivider: { width: 1, height: 30, backgroundColor: '#0f1a3a' },
  registrarBtn: { borderWidth: 1, borderColor: '#0033ff', borderRadius: 10, padding: 12, alignItems: 'center' },
  registrarBtnText: { color: '#4488ff', fontWeight: '700', fontSize: 13 },
  agregarMasBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 14, padding: 16, marginTop: 4, backgroundColor: '#05050f' },
  agregarMasText: { color: '#4488ff', fontWeight: '700', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,2,15,0.92)', justifyContent: 'center', alignItems: 'center' },
  modalOverlayBottom: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.85)' },
  modalBackdrop: { flex: 1 },
  modalBox: { backgroundColor: '#08080f', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderWidth: 1, borderColor: '#1a3aff33' },
  modalBoxBottom: { backgroundColor: '#05050f', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, borderWidth: 1, borderColor: '#0f1a3a' },
  modalTitulo: { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 8 },
  modalSub: { fontSize: 13, color: '#2a4488', marginBottom: 20, lineHeight: 20 },
  modalLabel: { color: '#2a4488', fontSize: 10, letterSpacing: 2, fontWeight: '700', marginBottom: 8 },
  inputWrapper: { borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 14, backgroundColor: '#0a0a1f', marginBottom: 16 },
  input: { color: '#fff', padding: 14, fontSize: 15 },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 8, marginBottom: 24 },
  modalCancelar: { flex: 1, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#1a3aff44', backgroundColor: '#05051a', alignItems: 'center' },
  modalCancelarText: { color: '#2a4488', fontWeight: '700' },
  modalGuardar: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  modalGuardarGradient: { padding: 14, alignItems: 'center' },
  modalGuardarText: { color: '#fff', fontWeight: '700' },
  tipoBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#0f1a3a', backgroundColor: '#0a0a1f' },
  tipoBtnActivo: { borderColor: '#0033ff', backgroundColor: '#05051f' },
  tipoBtnText: { color: '#2a4488', fontWeight: '700', fontSize: 13 },
  tipoBtnTextActivo: { color: '#4488ff' },
  selectorRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  selectorChip: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#0f1a3a', backgroundColor: '#0a0a1f', alignItems: 'center' },
  selectorChipActivo: { borderColor: '#0033ff', backgroundColor: '#05051f' },
  selectorChipText: { color: '#2a4488', fontWeight: '700', fontSize: 14 },
  selectorChipTextActivo: { color: '#4488ff' },
  repsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 0 },
  repsGuion: { color: '#2a4488', fontSize: 18, fontWeight: '900' },
  grupoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16, padding: 16 },
  grupoChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#0f1a3a', backgroundColor: '#0a0a1f' },
  grupoChipActivo: { borderColor: '#0033ff', backgroundColor: '#05051f' },
  grupoChipText: { color: '#2a4488', fontWeight: '700', fontSize: 12 },
  grupoChipTextActivo: { color: '#4488ff' },
  selectorModal: { backgroundColor: '#05050f', borderRadius: 18, borderWidth: 1, borderColor: '#0033ff', width: '92%', overflow: 'hidden' },
  selectorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#0f1a3a' },
  selectorTitulo: { fontSize: 15, fontWeight: '900', color: '#fff' },
  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholderIcon: { fontSize: 52, marginBottom: 12 },
  placeholderText: { fontSize: 24, fontWeight: '900', color: '#fff' },
  placeholderSub: { fontSize: 14, color: '#2a4488', marginTop: 6 },
  
  // INICIO
  iniContainer: { padding: 20, paddingTop: 56, paddingBottom: 150 },
  iniHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  iniPerfilCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#05050f', borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 16, padding: 14, marginBottom: 16 },
  iniPerfilAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#0a1a3f', borderWidth: 1, borderColor: '#1a3aff', justifyContent: 'center', alignItems: 'center' },
  iniPerfilAvatarText: { color: '#4488ff', fontSize: 17, fontWeight: '900' },
  iniPerfilNombre: { color: '#fff', fontSize: 15, fontWeight: '900', marginBottom: 5 },
  iniPerfilSubRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  iniPerfilSub: { color: '#4488ff', fontSize: 10, fontWeight: '700', backgroundColor: '#0a1535', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  iniMetricaAddBtn: { width: 30, height: 30, borderRadius: 8, borderWidth: 1, borderColor: '#0f1a3a', backgroundColor: '#0a0a1f', justifyContent: 'center', alignItems: 'center' },
  metricaModal: { backgroundColor: '#05050f', borderRadius: 20, padding: 22, width: '100%', borderWidth: 1, borderColor: '#1a3aff' },
  metricaModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  metricaModalTitulo: { color: '#fff', fontSize: 16, fontWeight: '900' },
  metricaLabel: { color: '#2a4488', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 6, marginTop: 4 },
  metricaUnidadRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  metricaUnidadBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#0f1a3a', backgroundColor: '#0a0a1f' },
  metricaUnidadBtnActivo: { borderColor: '#1a3aff', backgroundColor: '#05051f' },
  metricaUnidadText: { color: '#2a4488', fontWeight: '700', fontSize: 13 },
  metricaUnidadTextActivo: { color: '#4488ff' },
  rfRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 4 },
  rfR: { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: 2 },
  rfF: { fontSize: 22, fontWeight: '900', color: '#4488ff', letterSpacing: 2 },
  iniProgramaNombre: { fontSize: 11, color: '#2a4488', letterSpacing: 1, fontWeight: '600' },
  iniBellBtn: { padding: 10, borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 12, backgroundColor: '#05050f', position: 'relative' },

  // AJUSTES
  ajustesOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  ajustesContainer: { backgroundColor: '#05050f', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderColor: '#0f1a3a', paddingHorizontal: 20, paddingBottom: 40, maxHeight: '90%' },
  ajustesHandle: { width: 40, height: 4, backgroundColor: '#1a2a5a', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  ajustesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#0f1a3a', marginBottom: 20 },
  ajustesTitulo: { fontSize: 20, fontWeight: '900', color: '#fff' },
  ajustesCerrarBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#0a0a1f', borderWidth: 1, borderColor: '#0f1a3a', justifyContent: 'center', alignItems: 'center' },
  ajustesSectionLabel: { color: '#2a4488', fontSize: 10, fontWeight: '800', letterSpacing: 2, marginBottom: 8, marginTop: 4 },
  ajustesCard: { backgroundColor: '#080812', borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 16, marginBottom: 20, overflow: 'hidden' },
  ajustesPerfilRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingRight: 16 },
  ajustesAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#0a1a3f', borderWidth: 2, borderColor: '#1a3aff', justifyContent: 'center', alignItems: 'center' },
  ajustesAvatarText: { color: '#4488ff', fontSize: 20, fontWeight: '900' },
  ajustesAvatarWrap: { position: 'relative', width: 64, height: 64 },
  ajustesCamaraBtn: { position: 'absolute', bottom: 0, right: 0, width: 22, height: 22, borderRadius: 11, backgroundColor: '#1a3aff', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#08080f' },
  ajustesNombre: { color: '#fff', fontSize: 16, fontWeight: '800', marginBottom: 2 },
  ajustesEmail: { color: '#2a4488', fontSize: 12 },
  ajustesEditBtn: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, borderColor: '#0f1a3a', backgroundColor: '#0a0a1f', justifyContent: 'center', alignItems: 'center' },
  ajustesInputLabel: { color: '#2a4488', fontSize: 9, fontWeight: '800', letterSpacing: 1.5, marginBottom: 6 },
  ajustesInput: { backgroundColor: '#0a0a1f', borderWidth: 1, borderColor: '#1a3aff', borderRadius: 10, padding: 11, color: '#fff', fontSize: 14 },
  ajustesEditForm: { borderTopWidth: 1, borderTopColor: '#0f1a3a', padding: 20, gap: 18, backgroundColor: '#04040e' },
  ajustesEditRow: { flexDirection: 'row', gap: 12 },
  ajustesEditLabel: { color: '#3a5aaa', fontSize: 9, fontWeight: '900', letterSpacing: 2, marginBottom: 8, textTransform: 'uppercase' },
  ajustesEditInput: { backgroundColor: '#08091a', borderWidth: 1.5, borderColor: '#0f1e40', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, color: '#fff', fontSize: 15, fontWeight: '600' },
  ajustesEditInputFocused: { borderColor: '#4488ff', backgroundColor: '#060d20' },
  ajustesEditChip: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, borderColor: '#0f1e40', backgroundColor: '#08091a', alignItems: 'center', justifyContent: 'center' },
  ajustesEditChipLg: { paddingHorizontal: 14, paddingVertical: 11, borderRadius: 12, borderWidth: 1.5, borderColor: '#0f1e40', backgroundColor: '#08091a' },
  ajustesGuardarBtn: { borderRadius: 16, overflow: 'hidden', marginTop: 8 },
  ajustesGuardarGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, paddingHorizontal: 24 },
  ajustesGuardarText: { color: '#fff', fontWeight: '900', fontSize: 15, letterSpacing: 0.5 },
  toastBox: { position: 'absolute', bottom: 108, left: 20, right: 20, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 18, borderWidth: 1.5, backgroundColor: '#001a0a', borderColor: '#00cc44', zIndex: 9999, elevation: 30, shadowColor: '#00cc44', shadowOpacity: 0.7, shadowRadius: 20, shadowOffset: { width: 0, height: 0 } },
  toastText: { flex: 1, fontSize: 13, fontWeight: '700' },
  ajustesPesoRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  unidadRowSmall: { flexDirection: 'row', gap: 6 },
  unidadBtnSmall: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#0f1a3a', backgroundColor: '#0a0a1f' },
  unidadBtnSmallActivo: { borderColor: '#1a3aff', backgroundColor: '#05051f' },
  unidadTextSmall: { color: '#2a4488', fontWeight: '700', fontSize: 12 },
  ajustesRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingHorizontal: 16 },
  ajustesRowText: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '600', flexShrink: 1 },
  ajustesDivider: { height: 1, backgroundColor: '#0f1a3a', marginHorizontal: 16 },
  ajustesVersion: { color: '#1a2a5a', fontSize: 11, textAlign: 'center', marginTop: 8, marginBottom: 20 },
  ajustesSubSection: { paddingHorizontal: 16, paddingBottom: 16, gap: 10 },
  ajustesMsg: { fontSize: 12, fontWeight: '700', marginTop: 4 },

  // Notificaciones toggle
  ajustesNotifRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, gap: 12 },
  ajustesNotifLabel: { color: '#fff', fontSize: 13, fontWeight: '600' },
  ajustesNotifSub: { color: '#2a4488', fontSize: 11, marginTop: 2 },
  ajustesNotifCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#05103a', borderWidth: 1, borderColor: '#1a3aff', borderRadius: 12, padding: 12, marginBottom: 8 },
  ajustesNotifCardIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#0a1a3f', justifyContent: 'center', alignItems: 'center' },
  ajustesNotifCardTitulo: { color: '#fff', fontSize: 13, fontWeight: '700' },
  ajustesNotifCardSub: { color: '#2a4488', fontSize: 11, marginTop: 2 },
  ajustesNotifCardTiempo: { color: '#2a4488', fontSize: 10 },
  ajustesToggle: { width: 44, height: 24, borderRadius: 12, backgroundColor: '#1a1a3a', borderWidth: 1, borderColor: '#0f1a3a', justifyContent: 'center', paddingHorizontal: 2 },
  ajustesToggleOn: { backgroundColor: '#0033ff', borderColor: '#1a3aff' },
  ajustesToggleThumb: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#2a4488' },
  ajustesToggleThumbOn: { backgroundColor: '#fff', transform: [{ translateX: 20 }] },

  // Coach
  ajustesCoachRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  ajustesCoachBtn: { borderRadius: 10, overflow: 'hidden' },
  ajustesCoachBtnGradient: { paddingHorizontal: 16, paddingVertical: 12 },
  ajustesCoachBtnText: { color: '#fff', fontWeight: '900', fontSize: 13 },
  ajustesCoachInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  ajustesCoachAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#0a1a3f', borderWidth: 1, borderColor: '#1a3aff', justifyContent: 'center', alignItems: 'center' },
  ajustesCoachAvatarText: { color: '#4488ff', fontSize: 16, fontWeight: '900' },
  ajustesCoachNombre: { color: '#fff', fontSize: 14, fontWeight: '800' },
  ajustesCoachSub: { color: '#2a4488', fontSize: 11 },

  // Facturación
  ajustesPlanCard: { borderRadius: 14, overflow: 'hidden', marginBottom: 12 },
  ajustesPlanGradient: { padding: 16, borderWidth: 1, borderColor: '#ff6600', borderRadius: 14 },
  ajustesPlanHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  ajustesPlanNombre: { color: '#fff', fontSize: 18, fontWeight: '900' },
  ajustesPlanBadge: { backgroundColor: '#00cc44', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  ajustesPlanBadgeText: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  ajustesPlanPrecio: { color: '#ff6600', fontSize: 28, fontWeight: '900' },
  ajustesPlanPeriodo: { color: '#2a4488', fontSize: 14 },
  ajustesPlanVence: { color: '#2a4488', fontSize: 11, marginTop: 4 },
  ajustesFeaturesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  ajustesFeatureItem: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#001a00', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  ajustesFeatureText: { color: '#00cc44', fontSize: 11, fontWeight: '600' },
  ajustesRenovarBtn: { borderRadius: 12, overflow: 'hidden', marginBottom: 8 },
  ajustesRenovarGradient: { padding: 13, alignItems: 'center' },
  ajustesRenovarText: { color: '#fff', fontWeight: '900', fontSize: 13 },
  ajustesCancelarSubBtn: { padding: 10, alignItems: 'center' },
  ajustesCancelarSubText: { color: '#2a4488', fontSize: 12, textDecorationLine: 'underline' },
  ajustesLinkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#0f1a3a' },
  ajustesLinkText: { color: '#aabbdd', fontSize: 13, fontWeight: '600' },
  ajustesAcercaRow: { alignItems: 'center', paddingVertical: 12, marginBottom: 8 },
  ajustesAcercaLogoR: { color: '#fff', fontSize: 18, fontWeight: '900' },
  ajustesAcercaLogoF: { color: '#4488ff', fontSize: 18, fontWeight: '900' },
  ajustesAcercaVersion: { color: '#2a4488', fontSize: 12, marginTop: 4 },
  ajustesAcercaSub: { color: '#2a4488', fontSize: 11, textAlign: 'center', marginTop: 4 },
  ajustesPlanLibre: { color: '#2a4488', fontSize: 13, marginBottom: 12, textAlign: 'center' },
  ajustesPlanOpcion: { borderRadius: 12, overflow: 'hidden', marginBottom: 8 },
  ajustesPlanOpcionGradient: { padding: 14 },
  ajustesPlanOpcionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  ajustesPlanOpcionNombre: { color: '#fff', fontSize: 15, fontWeight: '900' },
  ajustesPlanOpcionPrecio: { color: '#fff', fontSize: 20, fontWeight: '900' },
  iniBellBadge: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: '#4488ff' },
  iniWeekRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#05050f', borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 16, padding: 16, marginBottom: 16 },
  iniDayCol: { alignItems: 'center', gap: 8 },
  iniDayLabel: { fontSize: 11, color: '#2a4488', fontWeight: '700', marginBottom: 4 },
  iniDayLabelHoy: { color: '#fff' },
  iniDayDot: { width: 30, height: 30, borderRadius: 9, backgroundColor: '#0a0a1f', borderWidth: 1, borderColor: '#0f1a3a', justifyContent: 'center', alignItems: 'center' },
  iniDayDotDone: { backgroundColor: '#0033ff', borderColor: '#0033ff' },
  iniDayDotHoy: { borderColor: '#4488ff', borderWidth: 2, backgroundColor: '#05103a' },
  iniDayDotFuturo: { backgroundColor: '#050510', borderColor: '#1a2a5a', borderStyle: 'dashed' },
  iniDayDotDescanso: { backgroundColor: '#050508', borderColor: '#0a0a15' },
  iniDayDotCenter: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4488ff' },
  iniCardHoy: { backgroundColor: '#05050f', borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 18, padding: 18, marginBottom: 16 },
  iniCardHoyTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  iniCardHoyLabel: { fontSize: 10, color: '#2a4488', letterSpacing: 2, fontWeight: '700', marginBottom: 6 },
  iniCardHoyTitulo: { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 4 },
  iniCardHoySub: { fontSize: 13, color: '#2a4488' },
  iniCardHoyBadge: { backgroundColor: '#0a0a2a', borderWidth: 1, borderColor: '#0033ff', borderRadius: 12, padding: 10, alignItems: 'center', minWidth: 52 },
  iniCardHoyBadgeNum: { fontSize: 20, fontWeight: '900', color: '#4488ff' },
  iniCardHoyBadgeLabel: { fontSize: 10, color: '#2a4488', marginTop: 2 },
  iniStartBtn: { borderRadius: 12, overflow: 'hidden' },
  iniStartGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, gap: 8 },
  iniStartText: { color: '#fff', fontWeight: '900', fontSize: 13, letterSpacing: 2 },
  iniDescansoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#0f1a3a', backgroundColor: '#05050f' },
  iniDescansoText: { color: '#2a4488', fontWeight: '800', fontSize: 13, letterSpacing: 2 },
  iniMetricasRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  iniMetricaCard: { flex: 1, backgroundColor: '#05050f', borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 14, padding: 14, alignItems: 'center' },
  iniMetricaIcon: { fontSize: 20, marginBottom: 6 },
  iniMetricaNum: { fontSize: 20, fontWeight: '900', color: '#fff', marginBottom: 2 },
  iniMetricaLabel: { fontSize: 10, color: '#2a4488', textAlign: 'center' },
  iniSection: { marginBottom: 16 },
  iniSectionLabel: { fontSize: 10, color: '#2a4488', letterSpacing: 3, fontWeight: '800', marginBottom: 8 },
  iniSemanaCard: { backgroundColor: '#05050f', borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 16, padding: 16 },
  iniBarrasRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 80, marginBottom: 12 },
  iniBarraCol: { flex: 1, alignItems: 'center', gap: 6 },
  iniBarraTrack: { flex: 1, width: '65%', backgroundColor: '#0a0a18', borderRadius: 4, overflow: 'hidden', justifyContent: 'flex-end' },
  iniBarraFill: { width: '100%' },
  iniSemanaFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#0f1a3a' },
  iniBarraDia: { fontSize: 11, color: '#2a4488', fontWeight: '700' },
  iniBarraDiaHoy: { color: '#4488ff' },

  iniSemanaFooterText: { fontSize: 12, color: '#2a4488' },
  iniSemanaFooterNum: { fontSize: 12, color: '#4488ff', fontWeight: '700' },
  iniCoachCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#05050f', borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 16, padding: 14, gap: 12 },
  iniCoachAvatar: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#0a0a2a', borderWidth: 1, borderColor: '#1a1a3a', justifyContent: 'center', alignItems: 'center' },
  iniCoachAvatarText: { color: '#2a4488', fontWeight: '900', fontSize: 18 },
  iniCoachInfo: { flex: 1 },
  iniCoachNombre: { color: '#fff', fontWeight: '700', fontSize: 14, marginBottom: 2 },
  iniCoachSub: { color: '#2a4488', fontSize: 11 },
  iniCoachBtn: { paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#0033ff', borderRadius: 10 },
  iniCoachBtnText: { color: '#4488ff', fontWeight: '700', fontSize: 12 },
  iniMsgCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#05050f', borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 14, padding: 14, marginBottom: 0 },
  iniMsgText: { color: '#2a4488', fontSize: 13 },
  iniMsgDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1a3aff', marginLeft: 8 },
  iniSectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  iniBadgeRojo: { backgroundColor: '#ff3355', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  iniBadgeRojoText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  iniSubCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#100800', borderWidth: 1, borderColor: '#ff6600', borderRadius: 16, padding: 14 },
  iniSubInfo: { flex: 1 },
  iniSubTitulo: { color: '#fff', fontWeight: '700', fontSize: 15, marginBottom: 2 },
  iniSubSub: { color: '#ff6600', fontSize: 12 },
  iniSubBtn: { borderRadius: 10, overflow: 'hidden' },
  iniSubBtnGradient: { paddingHorizontal: 14, paddingVertical: 8 },
  iniSubBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  confirmBox: { backgroundColor: '#05050f', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderWidth: 1, borderColor: '#ff3355' },
  confirmIcon: { fontSize: 40, textAlign: 'center', marginBottom: 12 },
  confirmTitulo: { fontSize: 20, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 8 },
  confirmSub: { fontSize: 13, color: '#2a4488', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  confirmEliminarBtn: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  confirmEliminarGradient: { padding: 14, alignItems: 'center' },
  confirmEliminarText: { color: '#fff', fontWeight: '700' },
})
