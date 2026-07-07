// ============================================
// DASHBOARD.JSX — Panel principal del cliente
// FIX DEFINITIVO: Estado se actualiza en tiempo real
// ============================================
/* eslint-disable no-unused-vars */
import { useState, useEffect, useCallback, useContext, createContext, useRef, useMemo } from 'react'
import { createStackNavigator } from '@react-navigation/stack'
import { useFocusEffect, useNavigation, CommonActions, StackActions } from '@react-navigation/native'
import {
  View, Text, StyleSheet, ScrollView,
  TextInput, Switch, Linking, Alert, Image, AppState, Animated, ActivityIndicator,
  TouchableOpacity, Pressable, TouchableWithoutFeedback
} from 'react-native'

import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'
import AppleBentoCard from '../../components/AppleBentoCard'
import StaggerChildren from '../../components/StaggerChildren'
import ManagedModal from '../../components/ManagedModal'
import DraggableSheet from '../../components/DraggableSheet'
import PerfilPublicoModal from '../../components/PerfilPublicoModal'
import { AntDesign } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { CoachThemeContext } from '../../lib/coachTheme'
import { rutinasNavigation } from '../../lib/rutinasRef'
import { guardarYSincronizar, cargarPrograma, cargarUltimaMetrica } from '../../lib/storage'
import { programarNotificacionesLocales, registrarPushToken } from '../../lib/notifications'
import Toast from 'react-native-toast-message'
import { LAYOUT } from '../../components/constans'
import RegistrarSeries from './rutinas/RegistrarSeries'
import ListaProgramas from './rutinas/ListaProgramas'
import Progreso from './progreso/Progreso'
import IAScreen from './ia/IAScreen'
import CoachDashboard from './CoachDashboard'
import PagerTabs from '../../components/PagerTabs'
import SwipeableModal from '../../components/SwipeableModal'
import { ListaBloques, DiasBloque, EjerciciosDelDia } from './rutinas/RutinasScreens'
import Comunidad from './comunidad/Comunidad'
import Chat from './chat/Chat'
import SuperAdminDashboard from './SuperAdminDashboard'
import { AnimatedHeroButton } from '../../components/AnimatedHeroButton'
import FeatureGate from '../../components/FeatureGate'


// Crear contexto para userId
const UserContext = createContext(null)
const RefreshContext = createContext(null)
const AjustesContext = createContext(null)
const PerfilContext = createContext({ fotoUrl: null, nombre: 'U', setFotoUrl: () => {}, setNombreCtx: () => {} })
const ToastContext = createContext({ dispararToast: () => {}, globalToast: null, globalToastAnim: null, globalToastOpacity: null })
const SwitchDashContext = createContext({ switchToCoach: () => {}, switchToCliente: () => {}, toggleAdminView: () => {}, vistaActiva: null, esSuperadmin: false, rol: null })

const RutinaStack = createStackNavigator()
// Programa por defecto vacío
const PROGRAMA_INICIAL = {
  bloques: [],
  dias: {},
}

// ============================================
// PANTALLA: INICIO
// ============================================
function InicioScreen() {
  const { accentColor, gradColors } = useContext(CoachThemeContext)
  const DIAS_SEMANA_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
  const DIAS_NOMBRES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
  const hoy = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1
  const navigation = useNavigation()
  const [cargandoInicio, setCargandoInicio] = useState(true)

  const [modalAjustes, setModalAjustes] = useState(false)
  const [chatAbierto, setChatAbierto] = useState(false)
  const [mensajesNoLeidos, setMensajesNoLeidos] = useState(0)
  const [ajustesEditando, setAjustesEditando] = useState(false)
  const [ajustesForm, setAjustesForm] = useState({ nombre: '', apellido: '', peso: '', unidad: 'kg', altura: '', genero: '', objetivo: '', nivel: '' })
  const [perfil, setPerfil] = useState(null)
  const [programa, setPrograma] = useState(null)
  const [ultimaMetrica, setUltimaMetrica] = useState(null)
  const [userId, setUserId] = useState(null)
  const [coachNombre, setCoachNombre] = useState(null)
  const [coachPerfil, setCoachPerfil] = useState(null)
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
  const [perfilCoachVisible, setPerfilCoachVisible] = useState(false)
  const [toastMsg, setToastMsg] = useState(null)
  const { refreshCount, triggerRefresh } = useContext(RefreshContext) || {}

  const switchDashCtx = useContext(SwitchDashContext)
  const {
    switchToCoach = () => {},
    switchToCliente = () => {},
    toggleAdminView = () => {},
    vistaActiva = null,
    esSuperadmin = false,
    rol = null,
  } = switchDashCtx || {}
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
  const ajustesHeroRef = useRef(null)

  // Recargar programa cuando DiasBloque guarda cambios
  useEffect(() => {
    if (!userId) return
    cargarPrograma(userId).then(prog => { if (prog) setPrograma(prog) })
  }, [refreshCount, userId])

  // Exponer recarga para que ListaProgramas la llame tras eliminar/archivar
  useEffect(() => {
    if (!userId) return
    rutinasNavigation.recargarInicio = () => {
      cargarPrograma(userId).then(prog => { if (prog) setPrograma(prog) })
    }
    return () => { rutinasNavigation.recargarInicio = null }
  }, [userId])

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

  async function cargarMensajesNoLeidos(uid) {
    if (!uid) return
    try {
      const { count } = await supabase
        .from('mensajes')
        .select('*', { count: 'exact', head: true })
        .eq('receptor_id', uid)
        .eq('leido', false)
      setMensajesNoLeidos(count || 0)
    } catch(e) {
    }
  }

  useFocusEffect(useCallback(() => {
    async function cargar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      cargarMensajesNoLeidos(user.id)

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
        const { data: coach } = await supabase.from('perfiles').select('id, nombre_completo, avatar_url, rol').eq('id', p.coach_id).single()
        if (coach) {
          setCoachNombre(coach.nombre_completo)
          setCoachPerfil(coach)
        }
      } else {
        setCoachNombre(null)
        setCoachPerfil(null)
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
      } else {
        setMensajesCoach([])
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
  const programaActivo = programa?.programas?.find(p => p.estado === 'activo')
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
    const isOpen = seccionAjuste === seccion;
    Animated.spring(anim, {
      toValue: isOpen ? 0 : 1,
      tension: 50,
      friction: 10,
      useNativeDriver: true,
    }).start();
    setSeccionAjuste(isOpen ? null : seccion);
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
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
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

      registrarPushToken(uid)
      ajustesHeroRef.current?.close()
      setTimeout(() => Toast.show({ type: 'success', text1: 'Perfil actualizado', props: { color: accentColor, icon: 'check-circle' } }), 300)

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
        Alert.alert('Error', 'No se pudo subir la foto. Intenta de nuevo.')
      }
    } catch(e) {
      Alert.alert('📷 Error al subir foto', 'Instala expo-image-picker:\n\nnpx expo install expo-image-picker\n\nLuego reinicia la app.', [{ text: 'Entendido', style: 'cancel' }])
    }
    setSubiendoFoto(false)
  }

  async function eliminarCuenta() {
    if (confirmEliminar !== 'ELIMINAR') return
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
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

      await programarNotificacionesLocales(nuevasNotifs, diasActivosSemana)
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

    const { data: coach } = await supabase.from('perfiles').select('id, nombre_completo, avatar_url, rol').eq('id', codigo.coach_id).single()
    setCoachNombre(coach?.nombre_completo)
    setCoachPerfil(coach || null)
    setPerfil(p => ({ ...p, coach_id: codigo.coach_id }))
    setCodigoCoach('')
    ajustesHeroRef.current?.close()
    setTimeout(() => Toast.show({ type: 'success', text1: `Te uniste al equipo de ${coach?.nombre_completo}`, props: { color: accentColor, icon: 'check-circle' } }), 300)
  }

  async function cerrarSesion() {
    await supabase.auth.signOut()
  }

  function pedirCerrarSesion() {
    setModalCerrarSesion(true)
  }


    // Pantalla de carga — InicioScreen
    if (cargandoInicio) return (
      <LinearGradient colors={gradColors} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={accentColor} size="large" />
      </LinearGradient>
    )

  return (
    <LinearGradient colors={gradColors} style={styles.gradient}>
      <ScrollView contentContainerStyle={styles.iniContainer} showsVerticalScrollIndicator={false}
        contentInset={{ bottom: 100 }} scrollIndicatorInsets={{ bottom: 100 }}
        keyboardShouldPersistTaps="handled">

        <StaggerChildren trigger={!cargandoInicio} delay={60} step={70} translateYStart={10} springTension={120} springFriction={18} opacityDuration={250}>

        {/* HEADER */}
        <View style={styles.iniHeader}>
          {/* Fila 1: título + botones */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={styles.rfRow}>
              <Text style={styles.rfR}>REP</Text>
              <Text style={styles.rfF}>FORGE</Text>
            </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {esSuperadmin && (
              <TouchableOpacity 
                style={styles.iniBellBtn}
                onPress={switchToCoach}
              >
                <AntDesign name="swap" size={18} color="#9933ff" />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.iniBellBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setModalNotifs(true) }}>
              <AntDesign name="bell" size={18} color="#4488ff" />
              {notifsRecibidas.length > 0 && <View style={[styles.iniBellBadge, { backgroundColor: '#ff3355' }]} />}
            </TouchableOpacity>

            {/* --- BOTÓN DE AJUSTES ANIMADO --- */}
            <AnimatedHeroButton
              ref={ajustesHeroRef}
              modalBg="#0a0a2e"
              onOpen={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                const partes = (perfil?.nombre_completo || '').split(' ')
                setAjustesForm({
                  nombre: partes[0] || '', apellido: partes.slice(1).join(' ') || '',
                  peso: perfil?.peso?.toString() || '', unidad: 'kg',
                  altura: perfil?.altura?.toString() || '', genero: perfil?.genero || '',
                  objetivo: perfil?.objetivo || '', nivel: perfil?.nivel_experiencia || '',
                })
                setAjustesEditando(false);
                toggleEditAnim(false);
              }}
              renderContent={(onClose) => (
                <View style={{ flex: 1 }}>
                  {/* Encabezado fijo */}
                  <View style={[styles.ajustesHeader, { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 10, marginBottom: 0 }]}>
                    <Text style={styles.ajustesTitulo}>Configuración</Text>
                    {/* Botón para cerrar (Dispara la Implosión) */}
                    <TouchableOpacity onPress={onClose} style={styles.ajustesEditBtn}>
                      <AntDesign name="close" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>

                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}>
                    
                    {/* PERFIL */}
                    <Text style={styles.ajustesSectionLabel}>PERFIL</Text>
                    <View style={styles.ajustesCard}>
                      <View style={styles.ajustesPerfilRow}>
                        <TouchableOpacity style={styles.ajustesAvatarWrap} onPress={seleccionarFoto}>
                          {fotoUrl ? (
                            <Image source={{ uri: fotoUrl }} style={styles.ajustesAvatarPhoto} />
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
                          <View style={styles.ajustesBadgeRow}>
                            <View style={styles.ajustesPill}>
                              <Text style={styles.ajustesPillText}>{perfil?.genero === 'Masculino' ? 'HOMBRE' : perfil?.genero === 'Femenino' ? 'MUJER' : 'ATLETA'}</Text>
                            </View>
                            <View style={styles.ajustesPill}>
                              <Text style={styles.ajustesPillText}>{perfil?.edad || edad || '--'} AÑOS</Text>
                            </View>
                            <View style={styles.ajustesPill}>
                              <Text style={styles.ajustesPillText}>{perfil?.peso || '--'} KG</Text>
                            </View>
                          </View>
                          {perfil?.objetivo && (
                            <View style={styles.ajustesObjetivoRow}>
                              <View style={styles.ajustesObjetivoDot} />
                              <Text style={styles.ajustesObjetivoText}>
                                {({ hipertrofia: 'HIPERTROFIA', fuerza: 'FUERZA', definicion: 'DEFINICIÓN', resistencia: 'RESISTENCIA', recomposicion: 'RECOMPOSICIÓN' })[perfil.objetivo] || perfil.objetivo?.toUpperCase()}
                                {perfil?.nivel_experiencia ? ' · ' + perfil.nivel_experiencia.toUpperCase() : ''}
                              </Text>
                            </View>
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
                          <View style={styles.ajustesEditSectionHeader}>
                            <View style={styles.ajustesEditSectionBar} />
                            <Text style={styles.ajustesEditSectionText}>INFORMACIÓN PERSONAL</Text>
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
                            style={({ pressed }) => [
                              styles.ajustesGuardarBtn,
                              // Animación de presión iOS: se encoge un 4%
                              pressed && { opacity: 0.9, transform: [{ scale: 0.96 }] } 
                            ]}
                            onPress={() => {
                              // Micro-vibración táctil iOS
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); 
                              guardarAjustes();
                            }}>
                            <LinearGradient 
                              // Degradado sutil iOS: de azul vibrante a azul profundo
                              colors={['#4488ff', '#0055ee']} 
                              start={{ x: 0, y: 0 }} // Horizontal
                              end={{ x: 1, y: 0 }}
                              style={styles.ajustesGuardarGradient}>
                              <AntDesign name="check" size={16} color="#fff" style={{ marginRight: 8 }} />
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
                      <TouchableOpacity style={styles.ajustesRow} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggleSeccion('coach', ajusteCoachAnim); }}>
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
                      <TouchableOpacity style={styles.ajustesRow} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggleSeccion('facturacion', ajusteFactAnim); }}>
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
                                <TouchableOpacity 
                                  key={plan.nombre} 
                                  activeOpacity={0.8} // Suavidad iOS
                                  style={styles.ajustesPlanOpcion} 
                                  onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); // Feedback más fuerte
                                    Linking.openURL('https://repforge.app/planes');
                                  }}
                                >
                                  {/* Degradado premium en la tarjeta del plan */}
                                  <LinearGradient 
                                    colors={plan.color} 
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }} // Diagonal para profundidad
                                    style={styles.ajustesPlanOpcionGradient}
                                  >
                                    <View style={styles.ajustesPlanOpcionRow}>
                                      <Text style={styles.ajustesPlanOpcionNombre}>{plan.nombre}</Text>
                                      {plan.badge && (
                                        <View style={[styles.ajustesPlanBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                                          <Text style={styles.ajustesPlanBadgeText}>{plan.badge}</Text>
                                        </View>
                                      )}
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
                      <TouchableOpacity style={styles.ajustesRow} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggleSeccion('privacidad', ajustePrivAnim); }}>
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
                          <TouchableOpacity style={[styles.ajustesLinkRow, { marginTop: 4 }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setModalEliminarCuenta(true) }}>
                            <Text style={[styles.ajustesLinkText, { color: '#ff3355' }]}>Eliminar mi cuenta</Text>
                            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255, 59, 48, 0.15)', alignItems: 'center', justifyContent: 'center' }}>
                              <AntDesign name="close" size={13} color="#ff3355" />
                            </View>
                          </TouchableOpacity>
                        </View>
                      )}
                      </Animated.View>
                      <View style={styles.ajustesDivider} />
                      <TouchableOpacity style={styles.ajustesRow} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggleSeccion('acerca', ajusteAcercaAnim); }}>
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
                      <TouchableOpacity style={styles.ajustesRow} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); pedirCerrarSesion(); }}>
                        <AntDesign name="logout" size={16} color="#ff3355" />
                        <Text style={[styles.ajustesRowText, { color: '#ff3355' }]}>Cerrar sesión</Text>
                        <AntDesign name="right" size={14} color="#ff3355" />
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.ajustesVersion}>RepForge v1.0.0</Text>

                  </ScrollView>
                </View>
              )}
            >
              <View style={styles.iniBellBtn}>
                <AntDesign name="setting" size={18} color="#4488ff" />
              </View>

            </AnimatedHeroButton>
            {/* --- FIN BOTÓN DE AJUSTES ANIMADO --- */}

          </View>
          </View>
          {/* Fila 2: subtítulo — puede ser largo sin afectar los botones */}
          <Text style={styles.iniProgramaNombre}>
            {programaActivo
              ? `${programaActivo.nombre} · ${bloqueActivo?.nombre || ''} · Sem ${semanaActual}`
              : 'Sin programa activo'}
          </Text>
        </View>

        {/* PERFIL */}
        <AppleBentoCard style={styles.iniPerfilCard}>
          <View style={styles.iniPerfilAvatar}>
            {fotoUrl ? (
              <Image source={{ uri: fotoUrl }} style={{ width: 42, height: 42, borderRadius: 21 }} />
            ) : (
              <Text style={styles.iniPerfilAvatarText}>{nombre[0]?.toUpperCase()}</Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.iniPerfilNombre}>{nombre}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
            <View style={styles.iniPerfilSubRow}>
              {edad ? <Text style={styles.iniPerfilSub}>{edad} años</Text> : null}
              {ultimaMetrica ? <Text style={styles.iniPerfilSub}>{ultimaMetrica.peso} {ultimaMetrica.unidad || 'kg'}</Text> : null}
              {ultimaMetrica?.grasaPct ? <Text style={styles.iniPerfilSub}>{ultimaMetrica.grasaPct}% grasa</Text> : null}
              {ultimaMetrica?.musculoPct ? <Text style={styles.iniPerfilSub}>{ultimaMetrica.musculoPct}% músculo</Text> : null}
            </View>
          </ScrollView>
          </View>
        </AppleBentoCard>

        {/* BOTÓN MENSAJES — compacto junto al perfil */}
        {perfil?.coach_id && (
          <TouchableOpacity
            style={[styles.iniMsgBtn, mensajesNoLeidos > 0 && styles.iniMsgBtnActive]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setChatAbierto(true) }} activeOpacity={0.85}
          >
            <View style={{ position: 'relative' }}>
              <View style={[styles.iniMsgIcon, mensajesNoLeidos > 0 && styles.iniMsgIconActive]}>
                <AntDesign name="message" size={18} color={mensajesNoLeidos > 0 ? '#4488ff' : '#2a4488'} />
              </View>
              {mensajesNoLeidos > 0 && (
                <View style={styles.iniMsgBadge}>
                  <Text style={styles.iniMsgBadgeText}>{mensajesNoLeidos > 9 ? '9+' : mensajesNoLeidos}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.iniMsgBtnText, mensajesNoLeidos > 0 && styles.iniMsgBtnTextActive]}>
              {mensajesNoLeidos > 0 ? `${mensajesNoLeidos} mensaje${mensajesNoLeidos > 1 ? 's' : ''} nuevo${mensajesNoLeidos > 1 ? 's' : ''}` : 'Mensajes con tu coach'}
            </Text>
            <AntDesign name="right" size={13} color={mensajesNoLeidos > 0 ? '#4488ff' : '#2a4488'} />
          </TouchableOpacity>
        )}

        {/* CHAT MODAL */}
        <SwipeableModal visible={chatAbierto} onClose={() => { setChatAbierto(false); cargarMensajesNoLeidos(userId) }} backgroundColor='#0a0a2e'>
          <View style={[styles.screenWrap, { backgroundColor: '#0a0a2e' }]}>
            <Chat userId={userId} esCoach={false} interlocutorInicial={coachPerfil} />
          </View>
        </SwipeableModal>

        {/* PERFIL COACH MODAL */}
        <SwipeableModal visible={perfilCoachVisible} onClose={() => setPerfilCoachVisible(false)} backgroundColor='#050510'>
          <PerfilPublicoModal userId={coachPerfil?.id} nombre={coachNombre} avatarUrl={coachPerfil?.avatar_url} />
        </SwipeableModal>

        {/* STRIP SEMANAL */}
        <AppleBentoCard style={styles.iniWeekRow}>
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
        </AppleBentoCard>

        {/* HOY TOCA */}
        <AppleBentoCard style={styles.iniCardHoy}>
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
                activeOpacity={0.8}
                style={styles.iniStartBtn}
                onPress={() => {
                  rutinasNavigation.goToEjercicios(bloqueActivo.id, hoy, userId)
                  rutinasNavigation.goToTab?.(1)
                }}
              >
                <LinearGradient colors={['#1a3aff', '#0022cc']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.iniStartGradient}>
                  <Text style={styles.iniStartText}>INICIAR ENTRENAMIENTO</Text>
                  <AntDesign name="right" size={16} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <View style={styles.iniDescansoBtn}>
                <AntDesign name="rest" size={15} color="#8E8E93" />
                <Text style={styles.iniDescansoText}>DIA DE DESCANSO</Text>
              </View>
            )
          )}
        </AppleBentoCard>

        {/* RESUMEN SEMANAL */}
        <View style={styles.iniSection}>
          <Text style={styles.iniSectionLabel}>RESUMEN SEMANAL</Text>
          <AppleBentoCard style={styles.iniSemanaCard}>
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
          </AppleBentoCard>
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
              <TouchableOpacity
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPerfilCoachVisible(true) }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto' }}
              >
                <AntDesign name="idcard" size={13} color="#4488ff" />
                <Text style={{ color: '#4488ff', fontSize: 11, fontWeight: '700' }}>Ver perfil</Text>
              </TouchableOpacity>
            </View>
            {mensajesCoach.length === 0 ? (
              <View style={styles.iniMsgCard}>
                <AntDesign name="mail" size={18} color="#2a4488" style={{ marginRight: 12 }} />
                <Text style={styles.iniMsgText}>Sin mensajes de {coachNombre}</Text>
              </View>
            ) : (
              mensajesCoach.map((msg, i) => (
                <View key={msg.id || i} style={[styles.iniMsgCard, { marginBottom: i < mensajesCoach.length - 1 ? 8 : 0, borderColor: msg.leido ? '#0f1a3a' : '#1a3aff' }]}>
                  <View style={[styles.iniCoachAvatar, styles.iniCoachAvatarSm]}>
                    <Text style={styles.iniCoachAvatarTextSm}>{coachNombre[0]?.toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.iniMsgCardHeader}>
                      <Text style={styles.iniMsgCardNombre}>{coachNombre}</Text>
                      <Text style={styles.iniMsgCardFecha}>
                        {msg.creado_en ? new Date(msg.creado_en).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : ''}
                      </Text>
                    </View>
                    <Text style={styles.iniMsgCardContenido} numberOfLines={2}>{msg.contenido}</Text>
                  </View>
                  {!msg.leido && <View style={styles.iniMsgDot} />}
                </View>
              ))
            )}
          </View>
        )}

        </StaggerChildren>
      </ScrollView>

      {/* MODAL NOTIFICACIONES */}
      <ManagedModal visible={modalNotifs} transparent animationType="none">
          <DraggableSheet onClose={() => setModalNotifs(false)} containerStyle={{ maxHeight: '62%' }}>
            <View style={styles.ajustesHeader}>
              <Text style={styles.ajustesTitulo}>Notificaciones</Text>
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
          </DraggableSheet>
      </ManagedModal>

      

      {/* MODAL CONFIRMAR CERRAR SESIÓN — Estilo Alert iOS 2026 */}
      <ManagedModal visible={modalCerrarSesion} transparent animationType="fade">
        <View style={styles.alertOverlay}>
          <TouchableWithoutFeedback onPress={() => setModalCerrarSesion(false)}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
          <View style={styles.alertBox}>
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>¿Cerrar sesión?</Text>
              <Text style={styles.alertSubtitle}>
                Tendrás que iniciar sesión nuevamente para acceder a tu cuenta.
              </Text>
            </View>
            
            <View style={styles.alertSeparator} />
            
            <View style={styles.alertButtonRow}>
              <TouchableOpacity
                style={styles.alertButton}
                onPress={() => setModalCerrarSesion(false)}
              >
                <Text style={styles.alertCancelText}>Cancelar</Text>
              </TouchableOpacity>
              
              <View style={styles.alertVerticalSeparator} />
              
              <TouchableOpacity
                style={styles.alertButton}
                onPress={cerrarSesion}
              >
                <Text style={styles.alertConfirmText}>Cerrar sesión</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ManagedModal>

      {/* MODAL CONFIRMAR ELIMINAR CUENTA — Estilo Alert iOS 2026 */}
      <ManagedModal visible={modalEliminarCuenta} transparent animationType="fade">
        <View style={styles.alertOverlay}>
          <TouchableWithoutFeedback onPress={() => { setModalEliminarCuenta(false); setConfirmEliminar(''); }}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
          <View style={[styles.alertBox, { width: 320 }]}>
            <View style={styles.alertContent}>
              <View style={[styles.confirmIconBox, { alignSelf: 'center', marginBottom: 16 }]}>
                <AntDesign name="close-circle" size={26} color="#ff4444" />
              </View>
              <Text style={styles.alertTitle}>¿Eliminar cuenta?</Text>
              <Text style={[styles.alertSubtitle, { marginBottom: 20 }]}>
                Esta acción es permanente. Se eliminarán todos tus programas, progreso y datos.
              </Text>
              
              <Text style={[styles.ajustesInputLabel, { alignSelf: 'flex-start' }]}>ESCRIBE "ELIMINAR" PARA CONFIRMAR</Text>
              <View style={[styles.inputWrapper, { width: '100%', marginBottom: 0, borderColor: confirmEliminar === 'ELIMINAR' ? '#ff3355' : 'rgba(255,255,255,0.1)' }]}>
                <TextInput
                  style={[styles.input, { textAlign: 'center', letterSpacing: 2 }]}
                  value={confirmEliminar}
                  onChangeText={setConfirmEliminar}
                  placeholder="ELIMINAR"
                  placeholderTextColor="rgba(255,255,255,0.1)"
                  autoCapitalize="characters"
                />
              </View>
            </View>
            
            <View style={styles.alertSeparator} />
            
            <View style={styles.alertButtonRow}>
              <TouchableOpacity
                style={styles.alertButton}
                onPress={() => { setModalEliminarCuenta(false); setConfirmEliminar(''); }}
              >
                <Text style={styles.alertCancelText}>Cancelar</Text>
              </TouchableOpacity>
              
              <View style={styles.alertVerticalSeparator} />
              
              <TouchableOpacity
                style={[styles.alertButton, confirmEliminar !== 'ELIMINAR' && { opacity: 0.3 }]}
                onPress={eliminarCuenta}
                disabled={confirmEliminar !== 'ELIMINAR'}
              >
                <Text style={styles.alertConfirmText}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ManagedModal>

    </LinearGradient>
  )
}
// Stack de rutinas
// Ref global para poder resetear el stack de rutinas desde el tab bar
// Key global para resetear el stack de rutinas
// rutinasNavigation movido a rutinasRef.js para evitar ciclos

function RutinasTab() {
  rutinasNavigation.reset = () => {
    // Limpiar cualquier navegación pendiente para que no se ejecute al volver
    rutinasNavigation.pendingNav = null
    if (!rutinasNavigation.ref?.canGoBack?.()) return
    rutinasNavigation.ref?.navigate('ListaProgramas', { isDoubleTap: true })
  }

  // Navegar a Ejercicios desde InicioScreen
  rutinasNavigation.goToEjercicios = (bloqueId, diaKey, uid) => {
    if (rutinasNavigation.ref) {
      rutinasNavigation.ref.navigate('Ejercicios', { bloqueId, diaKey, userId: uid, noAnim: true })
    } else {
      rutinasNavigation.pendingNav = { bloqueId, diaKey, userId: uid, noAnim: true }
    }
  }

  return (
    <View style={styles.screenWrap}>
      <RutinaStack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: '#000000' },
          gestureEnabled: false,
        }}
      >
        <RutinaStack.Screen
          name="ListaProgramas"
          component={ListaProgramas}
          options={({ route }) => ({
            animationEnabled: !route.params?.isDoubleTap,
          })}
          listeners={({ navigation, route }) => ({
            focus: () => { 
              rutinasNavigation.ref = navigation 
              
              // Si hay navegación pendiente, ejecutarla ahora que el ref está listo
              if (rutinasNavigation.pendingNav) {
                const { bloqueId, diaKey, userId, noAnim } = rutinasNavigation.pendingNav
                rutinasNavigation.pendingNav = null  // Limpiar antes de navegar
                setTimeout(() => {
                  navigation.navigate('Ejercicios', { bloqueId, diaKey, userId, noAnim })
                }, 100)
              }
            },
          })}
        />
        <RutinaStack.Screen
          name="ListaBloques"
          component={ListaBloques}
          options={{}}
          listeners={({ navigation }) => ({
            focus: () => {
              rutinasNavigation.ref = navigation

              // Si hay navegación pendiente, ejecutarla
              if (rutinasNavigation.pendingNav) {
                const { bloqueId, diaKey, userId, noAnim } = rutinasNavigation.pendingNav
                rutinasNavigation.pendingNav = null
                setTimeout(() => {
                  navigation.navigate('Ejercicios', { bloqueId, diaKey, userId, noAnim })
                }, 100)
              }
            },
          })}
        />
        <RutinaStack.Screen
          name="DiasBloque"
          component={DiasBloque}
          options={{}}
          listeners={({ navigation }) => ({
            focus: () => { 
              rutinasNavigation.ref = navigation 
              
              // Si hay navegación pendiente, ejecutarla
              if (rutinasNavigation.pendingNav) {
                const { bloqueId, diaKey, userId, noAnim } = rutinasNavigation.pendingNav
                rutinasNavigation.pendingNav = null
                setTimeout(() => {
                  navigation.navigate('Ejercicios', { bloqueId, diaKey, userId, noAnim })
                }, 100)
              }
            },
          })}
        />
        <RutinaStack.Screen
          name="Ejercicios"
          component={EjerciciosDelDia}
          options={({ route }) => ({
            animationEnabled: !route.params?.noAnim,
          })}
          listeners={({ navigation, route }) => ({
            focus: () => {
              rutinasNavigation.ref = navigation
              // Reseteamos noAnim para que el back tenga animación normal
              if (route.params?.noAnim) {
                navigation.setParams({ noAnim: false })
              }
            },
          })}
        />
      </RutinaStack.Navigator>
      {/* Eliminamos el View negro con absolute que causaba el destello */}
    </View>
  )
}

function RutinasTabAdmin() {
  rutinasNavigation.reset = () => {
    rutinasNavigation.pendingNav = null
    if (!rutinasNavigation.ref?.canGoBack?.()) return
    rutinasNavigation.ref?.navigate('ListaProgramas', { isDoubleTap: true })
  }
  rutinasNavigation.goToEjercicios = (bloqueId, diaKey, uid) => {
    if (rutinasNavigation.ref) {
      rutinasNavigation.ref.navigate('Ejercicios', { bloqueId, diaKey, userId: uid, noAnim: true })
    } else {
      rutinasNavigation.pendingNav = { bloqueId, diaKey, userId: uid, noAnim: true }
    }
  }
  return (
    <View style={styles.screenWrap}>
      <RutinaStack.Navigator
        screenOptions={{ headerShown: false, cardStyle: { backgroundColor: '#000000' }, gestureEnabled: false }}
      >
        <RutinaStack.Screen
          name="ListaProgramas"
          component={ListaProgramas}
          initialParams={{ esCoach: true }}
          options={({ route }) => ({ animationEnabled: !route.params?.isDoubleTap })}
          listeners={({ navigation }) => ({
            focus: () => { 
              rutinasNavigation.ref = navigation
              if (rutinasNavigation.pendingNav) {
                const { bloqueId, diaKey, userId, noAnim } = rutinasNavigation.pendingNav
                rutinasNavigation.pendingNav = null
                setTimeout(() => {
                  navigation.navigate('Ejercicios', { bloqueId, diaKey, userId, noAnim })
                }, 100)
              }
            },
          })}
        />
        <RutinaStack.Screen name="ListaBloques" component={ListaBloques} options={{}}
          listeners={({ navigation }) => ({ focus: () => { rutinasNavigation.ref = navigation } })}
        />
        <RutinaStack.Screen name="DiasBloque" component={DiasBloque} options={{}}
          listeners={({ navigation }) => ({ focus: () => { rutinasNavigation.ref = navigation } })}
        />
        <RutinaStack.Screen
          name="Ejercicios"
          component={EjerciciosDelDia}
          options={({ route }) => ({ animationEnabled: !route.params?.noAnim })}
          listeners={({ navigation, route }) => ({
            focus: () => {
              rutinasNavigation.ref = navigation
              if (route.params?.noAnim) navigation.setParams({ noAnim: false })
            },
          })}
        />
      </RutinaStack.Navigator>
    </View>
  )
}

function ProgresoScreen() {
  const { userId } = useContext(UserContext)
  const { esSuperadmin } = useContext(SwitchDashContext)
  return (
    <FeatureGate flagId="progreso" bypass={esSuperadmin}>
      <View style={styles.screenWrap}><Progreso userId={userId} /></View>
    </FeatureGate>
  )
}

function IATab() {
  const { userId } = useContext(UserContext)
  const { esSuperadmin } = useContext(SwitchDashContext)
  return (
    <FeatureGate flagId="ia" bypass={esSuperadmin}>
      <View style={styles.screenWrap}>
        <IAScreen
          userId={userId}
          onProgramaGenerado={() => {
            if (rutinasNavigation.recargar) {
              rutinasNavigation.recargar()
            } else {
              rutinasNavigation.pendingRecargar = true
            }
            rutinasNavigation.goToTab?.(1)
          }}
        />
      </View>
    </FeatureGate>
  )
}

function PerfilScreen() {
  const { userId } = useContext(UserContext)
  const { accentColor } = useContext(CoachThemeContext)
  const [modalAjustes, setModalAjustes] = useState(false)
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
      <View style={styles.screenCenter}>
        <ActivityIndicator color={accentColor} />
      </View>
    </LinearGradient>
  )
}

function ComunidadScreen() {
  const { userId } = useContext(UserContext)
  const { esSuperadmin } = useContext(SwitchDashContext)
  return (
    <FeatureGate flagId="comunidad" bypass={esSuperadmin}>
      <View style={styles.screenWrap}><Comunidad userId={userId} esCoach={false} /></View>
    </FeatureGate>
  )
}

function ChatScreen() {
  const { userId } = useContext(UserContext)
  return <Chat userId={userId} esCoach={false} />
}


// ── Toast global fuera de cualquier Modal ──────────────────────
function GlobalToast({ msg, tipo, anim, opacityAnim }) {
  if (!msg) return null
  const isOk = tipo === 'ok'
  const color = isOk ? '#00cc44' : '#ff3355'
  const gradColors = isOk ? ['#001f0a', '#002a10', '#001a08'] : ['#220008', '#1a0005', '#0f0003']
  return (
    <Animated.View
      style={[styles.toastOuter, { opacity: opacityAnim, transform: [{ translateX: anim }] }]}
      pointerEvents="none"
    >
      <LinearGradient
        colors={gradColors}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={[styles.toastInner, { borderBottomColor: color, shadowColor: color }]}
      >
        <View style={[styles.toastIcon, { backgroundColor: isOk ? '#003a18' : '#3a0010', borderColor: color }]}>
          <AntDesign name={isOk ? 'check-circle' : 'close-circle'} size={20} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.toastTitle, { color: isOk ? '#00ff66' : '#ff4466' }]}>
            {isOk ? 'Guardado' : 'Error'}
          </Text>
          <Text style={[styles.toastSub, { color: isOk ? '#00aa44' : '#cc2244' }]}>
            {msg}
          </Text>
        </View>
        <View style={[styles.toastAccent, { backgroundColor: color }]} />
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
  const [esSuperadmin, setEsSuperadmin] = useState(false)
  const [vistaOverride, setVistaOverride] = useState(null)
  const [globalToast, setGlobalToast] = useState(null)
  const globalToastAnim = useRef(new Animated.Value(-420)).current
  const globalToastOpacity = useRef(new Animated.Value(0)).current
  const tabSwitcherRef = useRef(null)

  // MODO CLIENTE (default) - Dashboard de cliente con 5 pestañas
  const tabs = useMemo(() => [
    { name: 'Inicio',    icon: 'home',     component: InicioScreen },
    { name: 'Rutina',    icon: 'calendar',  component: RutinasTab,
      onReselect: () => { rutinasNavigation.reset?.() }
    },
    { name: 'Progreso',  icon: 'bars',      component: ProgresoScreen },
    { name: 'Comunidad', icon: 'team',      component: ComunidadScreen },
  ], [])

  // Registrar goToTab en rutinasNavigation para que InicioScreen lo use
  // Se ejecuta cada vez que cambie vistaOverride para re-registrar cuando vuelvas del modo coach
  useEffect(() => {
    // En modo coach, CoachDashboard registra su propio goToTab — no sobreescribir
    // En modo admin, SuperAdminDashboard registra su propio goToTab — no sobreescribir
    if (vistaOverride !== 'coach' && vistaOverride !== 'admin') {
      rutinasNavigation.goToTab = (i) => tabSwitcherRef.current?.(i)
    }
    return () => {
      if (vistaOverride === 'coach' || vistaOverride === 'admin') {
        rutinasNavigation.goToTab = null
      }
    }
  }, [vistaOverride])

  useEffect(() => {
    async function cargarRolYSuperadmin() {
      // 1. Cargar rol
      const { data } = await supabase.from('perfiles').select('rol').eq('id', userId).single()
      if (data?.rol) setRol(data.rol)

      // 2. Verificar si es superadmin (por ID hardcodeado o por email de Auth)
      if (userId === '7d381a03-17b2-4bbe-83a2-ab5c9a4f2fc7') {
        setEsSuperadmin(true)
      } else {
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.email === 'daniel@live.com') {
          setEsSuperadmin(true)
        }
      }
    }
    cargarRolYSuperadmin()
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
      <View style={styles.loadingScreen}>
        <View style={styles.loadingLogo}>
          <Text style={styles.loadingLogoR}>REP</Text>
          <Text style={styles.loadingLogoF}>FORGE</Text>
        </View>
      </View>
    )
  }

  // Renderizar contenido según modo (DENTRO de los Providers)
  let contenido = null

  // MODO SUPER ADMIN - Dashboard completo de super admin
  if (vistaOverride === 'admin' && esSuperadmin) {
    contenido = (
      <View style={{ flex: 1 }}>
        <SuperAdminDashboard
          userId={userId}
          onVolver={() => setVistaOverride('cliente')}
          InicioScreen={InicioScreen}
          RutinasTab={RutinasTabAdmin}
          ProgresoScreen={ProgresoScreen}
          ComunidadTab={ComunidadScreen}
        />
      </View>
    )
  }
  // MODO COACH - Solo si explícitamente se activa O si eres coach pero NO superadmin
  else if (vistaOverride === 'coach' || (rol === 'coach' && !esSuperadmin && vistaOverride !== 'cliente')) {
    contenido = (
      <View style={{ flex: 1 }}>
        <CoachDashboard 
          userId={userId} 
          onSwitchToCliente={() => setVistaOverride('cliente')} 
          esSuperadmin={esSuperadmin}
          onSwitchToAdmin={() => setVistaOverride('admin')}
        />
      </View>
    )
  }
  // MODO CLIENTE (default) - Dashboard de cliente con 5 pestañas
  if (vistaOverride !== 'admin' && vistaOverride !== 'coach' && !(rol === 'coach' && !esSuperadmin)) {
    contenido = (
      <LinearGradient colors={['#0a0a2e', '#050518', '#0d0d25']} style={{ flex: 1 }}>
        <PagerTabs
          switcherRef={tabSwitcherRef}
          tabs={tabs}
        />
      </LinearGradient>
    )
  }

  return (
    <UserContext.Provider value={{ userId }}>
      <RefreshContext.Provider value={{ triggerRefresh, refreshCount }}>
      <AjustesContext.Provider value={{ abrirAjustes: () => {} }}>
      <SwitchDashContext.Provider value={{ 
        switchToCoach: () => {
          if (esSuperadmin) {
            // Superadmin: cicla Cliente → Coach → SuperAdmin → Cliente
            setVistaOverride(v => {
              const actual = v || 'cliente'  // Si no hay override, está en cliente
              if (actual === 'cliente') return 'coach'
              if (actual === 'coach') return 'admin'
              return 'cliente'  // desde admin regresa a cliente
            })
          } else {
            // Coach normal: solo va a coach
            setVistaOverride('coach')
          }
        },
        switchToCliente: () => setVistaOverride('cliente'),
        toggleAdminView: () => setVistaOverride(v => v === 'admin' ? 'cliente' : 'admin'),
        vistaActiva: vistaOverride || (rol === 'coach' && !esSuperadmin ? 'coach' : 'cliente'),
        esSuperadmin: esSuperadmin || false,
        rol: rol || null
      }}>
      <ToastContext.Provider value={{ dispararToast, globalToast, globalToastAnim, globalToastOpacity }}>
      <PerfilContext.Provider value={{ fotoUrl: fotoUrlGlobal, nombre: nombreGlobal, setFotoUrl: setFotoUrlGlobal, setNombreCtx: setNombreGlobal }}>
        
        {contenido}
      
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
  screenWrap: { flex: 1, backgroundColor: '#000' },
  screenCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  
  
  
  rfR: { fontSize: 18, fontWeight: '900', color: '#fff' },
  rfF: { fontSize: 18, fontWeight: '900', color: '#4488ff' },
  
  // ═══ CONTROLES HORIZONTALES ABAJO ═══
  
  
  // Modal flotante centrado

  // Volumen semanal

  // Modal alerta estilizada

  // Modal eliminar bloque — estilo Progreso
  confirmIconBox: { width: 54, height: 54, borderRadius: 14, backgroundColor: 'rgba(255, 51, 85, 0.1)', borderWidth: 1, borderColor: 'rgba(255, 51, 85, 0.4)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },

  inputWrapper: { borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 14, backgroundColor: '#0a0a1f', marginBottom: 16 },
  input: { color: '#fff', padding: 14, fontSize: 15 },
  
  // INICIO
  iniContainer: { padding: 20, paddingTop: 56, paddingBottom: 120 },
  iniHeader: { flexDirection: 'column', marginBottom: 16 },
  iniPerfilCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 20, padding: 14, marginBottom: 16 },
  iniPerfilAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(68,136,255,0.1)', borderWidth: 1, borderColor: 'rgba(68,136,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  iniPerfilAvatarText: { color: '#4488ff', fontSize: 17, fontWeight: '800' },
  iniPerfilNombre: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  iniPerfilSubRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  iniPerfilSub: { color: '#4488ff', fontSize: 11, fontWeight: '700', backgroundColor: 'rgba(68,136,255,0.08)', borderWidth: 1, borderColor:'rgba(68,136,255,0.2)', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 3 , overflow: 'hidden'},
  rfRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 4 },
  rfR: { fontSize: 24, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  rfF: { fontSize: 24, fontWeight: '900', color: '#4488ff', letterSpacing: 1 },
  iniProgramaNombre: { fontSize: 11, color: '#8E8E93', letterSpacing: 1, fontWeight: '700' },
  iniBellBtn: { padding: 4, position: 'relative' },

  // AJUSTES
  ajustesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 32, paddingBottom: 16, borderBottomWidth: 0, marginBottom: 20 },
  ajustesTitulo: { fontSize: 24, fontWeight: '900', color: '#fff' },
  ajustesSectionLabel: { color: '#8E8E93', fontSize: 10, fontWeight: '800', letterSpacing: 2, marginBottom: 10, marginTop: 4 },
  ajustesCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 24, marginBottom: 20, overflow: 'hidden' },
  ajustesPerfilRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  ajustesAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(68,136,255,0.1)', borderWidth: 1, borderColor: 'rgba(68,136,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  ajustesAvatarText: { color: '#4488ff', fontSize: 20, fontWeight: '900' },
  ajustesAvatarWrap: { position: 'relative', width: 64, height: 64 },
  ajustesCamaraBtn: { position: 'absolute', bottom: 0, right: 0, width: 22, height: 22, borderRadius: 11, backgroundColor: '#4488ff', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#08080f' },
  ajustesAvatarPhoto: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: '#1a3aff' },
  ajustesNombre: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 8 },
  ajustesBadgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  ajustesPill: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  ajustesPillText: { color: '#8E8E93', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  ajustesEditBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.03)', justifyContent: 'center', alignItems: 'center' },
  ajustesObjetivoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  ajustesObjetivoDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#9933ff' },
  ajustesObjetivoText: { color: '#9933ff', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  ajustesEditSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, marginBottom: 16 },
  ajustesEditSectionBar: { width: 3, height: 16, borderRadius: 2, backgroundColor: '#4488ff' },
  ajustesEditSectionText: { color: '#4488ff', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  ajustesInputLabel: { color: '#8E8E93', fontSize: 9, fontWeight: '800', letterSpacing: 1.5, marginBottom: 6 },
  ajustesInput: { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(68,136,255,0.3)', borderRadius: 12, padding: 12, color: '#fff', fontSize: 14, fontWeight: '600' },
  ajustesEditForm: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', padding: 20, gap: 18, backgroundColor: 'rgba(255,255,255,0.01)' },
  ajustesEditRow: { flexDirection: 'row', gap: 12 },
  ajustesEditLabel: { color: '#8E8E93', fontSize: 9, fontWeight: '900', letterSpacing: 2, marginBottom: 8, textTransform: 'uppercase' },
  ajustesEditInput: { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 13, color: '#fff', fontSize: 15, fontWeight: '600' },
  ajustesEditChip: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center' },
  ajustesEditChipLg: { paddingHorizontal: 14, paddingVertical: 11, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.03)' },
  ajustesGuardarBtn: { borderRadius: 18, overflow: 'hidden', marginTop: 8 },
  ajustesGuardarGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, paddingHorizontal: 24 },
  ajustesGuardarText: { color: '#fff', fontWeight: '800', fontSize: 15, letterSpacing: 0.5 },
  ajustesRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  ajustesRowText: { flex: 1, color: '#fff', fontSize: 15, fontWeight: '600' },
  ajustesDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginHorizontal: 16 },
  ajustesVersion: { color: '#8E8E93', fontSize: 11, textAlign: 'center', marginTop: 8, marginBottom: 20, fontWeight: '500' },
  ajustesSubSection: { paddingHorizontal: 16, paddingBottom: 16, paddingBoTop:4, gap: 10, backgroundColor: 'transparent' },
  ajustesMsg: { fontSize: 12, fontWeight: '700', marginTop: 4 },

  // Notificaciones toggle
  ajustesNotifRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, gap: 12 },
  ajustesNotifLabel: { color: '#fff', fontSize: 14, fontWeight: '600' },
  ajustesNotifSub: { color: '#8E8E93', fontSize: 11, marginTop: 2 },
  ajustesNotifCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(68,136,255,0.05)', borderWidth: 1, borderColor: 'rgba(68,136,255,0.2)', borderRadius: 16, padding: 12, marginBottom: 8 },
  ajustesNotifCardIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(68,136,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  ajustesNotifCardTitulo: { color: '#fff', fontSize: 13, fontWeight: '700' },
  ajustesNotifCardSub: { color: '#8E8E93', fontSize: 11, marginTop: 2 },
  ajustesNotifCardTiempo: { color: '#8E8E93', fontSize: 10 },
  ajustesToggle: { width: 44, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', paddingHorizontal: 2 },
  ajustesToggleOn: { backgroundColor: '#4488ff', borderColor: 'rgba(68,136,255,0.3)' },
  ajustesToggleThumb: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#8E8E93' },
  ajustesToggleThumbOn: { backgroundColor: '#fff', transform: [{ translateX: 20 }] },

  // Coach
  ajustesCoachRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  ajustesCoachBtn: { borderRadius: 12, overflow: 'hidden' },
  ajustesCoachBtnGradient: { paddingHorizontal: 16, paddingVertical: 12 },
  ajustesCoachBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  ajustesCoachInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  ajustesCoachAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(68,136,255,0.1)', borderWidth: 1, borderColor: 'rgba(68,136,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  ajustesCoachAvatarText: { color: '#4488ff', fontSize: 16, fontWeight: '900' },
  ajustesCoachNombre: { color: '#fff', fontSize: 15, fontWeight: '800' },
  ajustesCoachSub: { color: '#8E8E93', fontSize: 11, fontWeight: '500' },

  // Facturación
  ajustesPlanCard: { borderRadius: 24, overflow: 'hidden', marginBottom: 14, elevation: 8, shadowColor: '#ff6600', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
  ajustesPlanGradient: { padding: 20, borderWidth: 0.5, borderColor: 'rgba(255,102,0,0.25)', borderRadius: 24 },
  ajustesPlanHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  ajustesPlanNombre: { color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  ajustesPlanBadge: { backgroundColor: '#00cc44', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  ajustesPlanBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  ajustesPlanPrecio: { color: '#ff6600', fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  ajustesPlanPeriodo: { color: '#8E8E93', fontSize: 15, fontWeight: '600' },
  ajustesPlanVence: { color: '#8E8E93', fontSize: 12, marginTop: 6, fontWeight: '500' },
  ajustesFeaturesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16, marginTop: 4 },
  ajustesFeatureItem: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,204,68,0.08)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 0.5, borderColor: 'rgba(0,204,68,0.15)' },
  ajustesFeatureText: { color: '#00cc44', fontSize: 11, fontWeight: '700' },
  ajustesRenovarBtn: { borderRadius: 16, overflow: 'hidden', marginBottom: 8, elevation: 4, shadowColor: '#ff6600', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 6 },
  ajustesRenovarGradient: { padding: 15, alignItems: 'center' },
  ajustesRenovarText: { color: '#fff', fontWeight: '800', fontSize: 14, letterSpacing: 0.5 },
  ajustesCancelarSubBtn: { padding: 12, alignItems: 'center' },
  ajustesCancelarSubText: { color: '#8E8E93', fontSize: 12, textDecorationLine: 'underline', fontWeight: '600' },
  ajustesLinkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  ajustesLinkText: { color: '#ddeeff', fontSize: 14, fontWeight: '600' },
  ajustesAcercaRow: { alignItems: 'center', paddingVertical: 12, marginBottom: 8 },
  ajustesAcercaLogoR: { color: '#fff', fontSize: 18, fontWeight: '900' },
  ajustesAcercaLogoF: { color: '#4488ff', fontSize: 18, fontWeight: '900' },
  ajustesAcercaVersion: { color: '#8E8E93', fontSize: 12, marginTop: 4, fontWeight: '500' },
  ajustesAcercaSub: { color: '#8E8E93', fontSize: 11, textAlign: 'center', marginTop: 4, fontWeight: '500' },
  ajustesPlanLibre: { color: '#8E8E93', fontSize: 14, marginBottom: 16, textAlign: 'center', fontWeight: '600', letterSpacing: 0.3 },
  ajustesPlanOpcion: { borderRadius: 20, overflow: 'hidden', marginBottom: 10, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 8 },
  ajustesPlanOpcionGradient: { padding: 18 },
  ajustesPlanOpcionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  ajustesPlanOpcionNombre: { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: -0.2 },
  ajustesPlanOpcionPrecio: { color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  iniBellBadge: { position: 'absolute', top: 0, right: 0, width: 7, height: 7, borderRadius: 4, backgroundColor: '#4488ff' },

  // Mensajes button
  iniMsgBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#05050f', borderWidth: 1.5, borderColor: '#0f1a3a', borderRadius: 14, padding: 12, marginBottom: 14 },
  iniMsgBtnActive: { borderColor: '#1a3aff' },
  iniMsgIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#08080f', borderWidth: 1.5, borderColor: '#0f1a3a', justifyContent: 'center', alignItems: 'center' },
  iniMsgIconActive: { backgroundColor: '#05103a', borderColor: '#1a3aff' },
  iniMsgBadge: { position: 'absolute', top: -5, right: -5, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#ff3355', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3, borderWidth: 2, borderColor: '#05050f' },
  iniMsgBadgeText: { color: '#fff', fontSize: 8, fontWeight: '900' },
  iniMsgBtnText: { flex: 1, color: '#2a4488', fontSize: 13, fontWeight: '600' },
  iniMsgBtnTextActive: { color: '#fff', fontWeight: '800' },

  iniWeekRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', borderRadius: 24, padding: 16, marginBottom: 16 },
  iniDayCol: { alignItems: 'center', gap: 8 },
  iniDayLabel: { fontSize: 11, color: '#8E8E93', fontWeight: '700', marginBottom: 4 },
  iniDayLabelHoy: { color: '#fff' },
  iniDayDot: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
  iniDayDotDone: { backgroundColor: '#4488ff', borderColor: '#4488ff' },
  iniDayDotHoy: { borderColor: '#4488ff', borderWidth: 1.5, backgroundColor: 'rgba(68,136,255,0.1)' },
  iniDayDotFuturo: { backgroundColor: 'rgba(255,255,255,0.01)', borderColor: 'rgba(255,255,255,0.05)', borderStyle: 'dashed' },
  iniDayDotDescanso: { backgroundColor: 'rgba(255,255,255,0.01)', borderColor: 'rgba(255,255,255,0.02)' },
  iniDayDotCenter: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4488ff' },
  iniCardHoy: { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 24, padding: 20, marginBottom: 16 },
  iniCardHoyTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  iniCardHoyLabel: { fontSize: 10, color: '#8E8E93', letterSpacing: 2, fontWeight: '800', marginBottom: 6 },
  iniCardHoyTitulo: { fontSize: 24, fontWeight: '900', color: '#fff', marginBottom: 4, letterSpacing: -0.5 },
  iniCardHoySub: { fontSize: 13, color: '#8E8E93', fontWeight: '500' },
  iniCardHoyBadge: { backgroundColor: 'rgba(68,136,255,0.1)', borderWidth: 1, borderColor: 'rgba(68,136,255,0.3)', borderRadius: 14, padding: 10, alignItems: 'center', minWidth: 56 },
  iniCardHoyBadgeNum: { fontSize: 22, fontWeight: '900', color: '#4488ff', letterSpacing: -1.0 },
  iniCardHoyBadgeLabel: { fontSize: 9, color: '#8E8E93', marginTop: 2, fontWeight: '800' },
  iniStartBtn: { borderRadius: 16, overflow: 'hidden' },
  iniStartGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, gap: 10 },
  iniStartText: { color: '#fff', fontWeight: '800', fontSize: 14, letterSpacing: 1.5 },
  iniDescansoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)' },
  iniDescansoText: { color: '#8E8E93', fontWeight: '700', fontSize: 14, letterSpacing: 1.5 },
  iniSection: { marginBottom: 20 },
  iniSectionLabel: { fontSize: 10, color: '#8E8E93', letterSpacing: 3, fontWeight: '800', marginBottom: 12, textTransform: 'uppercase' },
  iniSemanaCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 24, padding: 20 },
  iniBarrasRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 80, marginBottom: 16 },
  iniBarraCol: { flex: 1, alignItems: 'center', gap: 8 },
  iniBarraTrack: { flex: 1, width: '60%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 6, overflow: 'hidden', justifyContent: 'flex-end' },
  iniBarraFill: { width: '100%' },
  iniSemanaFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  iniBarraDia: { fontSize: 11, color: '#8E8E93', fontWeight: '800' },
  iniBarraDiaHoy: { color: '#4488ff' },

  iniSemanaFooterText: { fontSize: 13, color: '#8E8E93', fontWeight: '600' },
  iniSemanaFooterNum: { fontSize: 13, color: '#4488ff', fontWeight: '800' },
  iniCoachAvatar: { width: 48, height: 44, borderRadius: 14, backgroundColor: 'rgba(68,136,255,0.1)', borderWidth: 1, borderColor: 'rgba(68,136,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  iniCoachAvatarText: { color: '#4488ff', fontWeight: '900', fontSize: 18 },
  iniMsgCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 20, padding: 16, marginBottom: 0 },
  iniMsgText: { color: '#8E8E93', fontSize: 14, fontWeight: '500', flex: 1 },
  iniMsgDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4488ff', marginLeft: 8 },
  iniCoachAvatarSm: { width: 34, height: 34, borderRadius: 17, marginRight: 10 },
  iniCoachAvatarTextSm: { color: '#4488ff', fontWeight: '900', fontSize: 13 },
  iniMsgCardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  iniMsgCardNombre: { color: '#fff', fontSize: 13, fontWeight: '700' },
  iniMsgCardFecha: { color: '#2a4488', fontSize: 10 },
  iniMsgCardContenido: { color: '#aabbdd', fontSize: 12, marginTop: 2 },
  iniSectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  iniBadgeRojo: { backgroundColor: 'rgba(255,51,85,0.15)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(255,51,85,0.3)' },
  iniBadgeRojoText: { color: '#ff3355', fontSize: 9, fontWeight: '900' },

  // ALERT MODAL (DeleteConfirmModal style)
  // Skeleton
  skeletonGradient: { flex: 1, paddingTop: 56, padding: 20 },
  skeletonHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  skeletonBarLg: { width: 140, height: 22, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', marginBottom: 8 },
  skeletonBarMd: { width: 200, height: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.03)' },
  skeletonBarName: { width: 130, height: 14, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.05)' },
  skeletonBarSm: { width: 90, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.03)' },
  skeletonBtns: { flexDirection: 'row', gap: 8 },
  skeletonBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)' },
  skeletonPerfil: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 14, marginBottom: 14 },
  skeletonAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)' },
  skeletonWeek: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 16, marginBottom: 14 },
  skeletonDayCol: { alignItems: 'center', gap: 6 },
  skeletonDayLabel: { width: 14, height: 10, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.03)' },
  skeletonDayDot: { width: 30, height: 30, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.05)' },
  skeletonCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 18, padding: 18, marginBottom: 14 },
  skeletonCardSm: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 16, marginBottom: 10, height: 70 },

  // Toast
  toastOuter: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 99999, elevation: 99 },
  toastInner: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 18, borderBottomWidth: 1.5, shadowOpacity: 0.5, shadowRadius: 20, shadowOffset: { width: 0, height: 6 }, elevation: 30 },
  toastIcon: { width: 40, height: 40, borderRadius: 12, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  toastTitle: { fontWeight: '800', fontSize: 15, letterSpacing: 0.3 },
  toastSub: { fontSize: 12, marginTop: 2, fontWeight: '600' },
  toastAccent: { width: 6, height: 40, borderRadius: 3, opacity: 0.6 },

  // Loading screen
  loadingScreen: { flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' },
  loadingLogo: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  loadingLogoR: { fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: 2 },
  loadingLogoF: { fontSize: 26, fontWeight: '900', color: '#4488ff', letterSpacing: 2 },

  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 2, 15, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertBox: {
    width: 290,
    backgroundColor: 'rgba(10, 15, 35, 0.95)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(68, 136, 255, 0.2)',
    overflow: 'hidden',
  },
  alertContent: {
    paddingTop: 24,
    paddingBottom: 22,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  alertSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#aaccff',
    textAlign: 'center',
    lineHeight: 18,
  },
  alertSeparator: {
    height: 1,
    backgroundColor: 'rgba(68, 136, 255, 0.15)',
  },
  alertVerticalSeparator: {
    width: 1,
    backgroundColor: 'rgba(68, 136, 255, 0.15)',
  },
  alertButtonRow: {
    flexDirection: 'row',
    height: 52,
  },
  alertButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4488ff',
  },
  alertConfirmText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ff3355',
  },
})
