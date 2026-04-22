// ============================================
// COACH DASHBOARD — Panel del entrenador
// Mismos estilos que dashboard cliente
// ============================================
import { useState, useEffect, useCallback, useRef, useContext, useMemo } from 'react'
import DraggableSheet from '../../components/DraggableSheet'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Pressable, Animated, Easing, Image, Share, Alert, Clipboard, ActivityIndicator
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'
import AppleBentoCard from '../../components/AppleBentoCard'
import StaggerChildren from '../../components/StaggerChildren'
import { AntDesign } from '@expo/vector-icons'
import { createStackNavigator } from '@react-navigation/stack'
import { supabase } from '../../lib/supabase'
import PagerTabs from '../../components/PagerTabs'
import SwipeableModal from '../../components/SwipeableModal'
import ManagedModal from '../../components/ManagedModal'
import DeleteConfirmModal from '../../components/DeleteConfirmModal'
import { getCount } from '../../lib/modalState'
import * as ImagePicker from 'expo-image-picker'
import { cargarPrograma } from '../../lib/storage'
import { registrarPushToken } from '../../lib/notifications'
import Toast from 'react-native-toast-message'
import Progreso from './progreso/Progreso'
import Comunidad from './comunidad/Comunidad'
import Chat from './chat/Chat'
import IAScreen from './ia/IAScreen'
import ListaProgramas from './rutinas/ListaProgramas'
import { ListaBloques, DiasBloque, EjerciciosDelDia } from './rutinas/RutinasScreens'
import { rutinasNavigation } from '../../lib/rutinasRef'
import FeatureGate from '../../components/FeatureGate'
import { AnimatedHeroButton } from '../../components/AnimatedHeroButton'
import { CoachThemeContext, hexToRgb } from '../../lib/coachTheme'


const ESPECIALIDADES_COACH = [
  'Musculación', 'Fuerza', 'Pérdida de peso', 'CrossFit/Funcional',
  'Resistencia', 'Rehabilitación', 'Nutrición deportiva', 'Coaching online',
]

const GRADIENTES = [
  { id: 'midnight', label: 'Midnight',    dot: '#4488ff', colors: ['#0a0a2e', '#050518', '#0d0d25'] },
  { id: 'purple',   label: 'Purple',      dot: '#9933ff', colors: ['#1a0a2e', '#0d0316', '#160d2a'] },
  { id: 'carbon',   label: 'Carbon',      dot: '#8E8E93', colors: ['#0d0d0d', '#050505', '#111111'] },
  { id: 'ocean',    label: 'Ocean',       dot: '#00aaff', colors: ['#001a2e', '#000d18', '#002235'] },
  { id: 'ember',    label: 'Ember',       dot: '#ff4422', colors: ['#1a0805', '#0d0402', '#200a05'] },
  { id: 'forest',   label: 'Forest',      dot: '#00cc66', colors: ['#051a0a', '#020d05', '#07200c'] },
  { id: 'rose',     label: 'Rose',        dot: '#ff2d78', colors: ['#1a050f', '#0d020a', '#200714'] },
  { id: 'gold',     label: 'Gold',        dot: '#ffaa00', colors: ['#1a1000', '#0d0800', '#201400'] },
  { id: 'crimson',  label: 'Crimson',     dot: '#cc1133', colors: ['#1a0008', '#0d0005', '#20000a'] },
  { id: 'arctic',   label: 'Arctic',      dot: '#00ddcc', colors: ['#001a1a', '#000d0d', '#002020'] },
  { id: 'violet',   label: 'Violet',      dot: '#cc44ff', colors: ['#150a1a', '#0a050d', '#1a0d22'] },
  { id: 'slate',    label: 'Slate',       dot: '#7799bb', colors: ['#0a0f16', '#05080d', '#0d1220'] },
  { id: 'toxic',    label: 'Toxic',       dot: '#44ff66', colors: ['#05160a', '#020d05', '#071a0c'] },
  { id: 'copper',   label: 'Copper',      dot: '#ff7733', colors: ['#160800', '#0d0400', '#1e0c00'] },
]
const PLANES_COACH = {
  free:    { label: 'Free',    maxClientes: 3,    color: '#8E8E93', badge: '#2a2a3a' },
  starter: { label: 'Starter', maxClientes: 10,   color: '#4488ff', badge: '#0a1a3a' },
  pro:     { label: 'Pro',     maxClientes: 30,   color: '#9933ff', badge: '#1a0a3a' },
  elite:   { label: 'Elite',   maxClientes: null, color: '#ffaa00', badge: '#2a1a00' },
}

function getGradColors(temaId) {
  return (GRADIENTES.find(g => g.id === temaId) || GRADIENTES[0]).colors
}
function getAccentColor(temaId) {
  return (GRADIENTES.find(g => g.id === temaId) || GRADIENTES[0]).dot
}


function TemaSelect({ perfilActual, onSelect }) {
  const actual = perfilActual?.tema_gradient || 'midnight'
  const [abierto, setAbierto] = useState(false)
  const temaActual = GRADIENTES.find(g => g.id === actual) || GRADIENTES[0]

  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '800', letterSpacing: 2 }}>TEMA DE COLOR</Text>

      {/* Botón — muestra el tema activo y despliega */}
      <Pressable
        onPress={() => setAbierto(v => !v)}
        style={{
          flexDirection: 'row', alignItems: 'center', gap: 10,
          paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14,
          borderWidth: 1.5, borderColor: temaActual.dot + '66',
          backgroundColor: temaActual.dot + '11',
        }}
      >
        <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: temaActual.dot, shadowColor: temaActual.dot, shadowOpacity: 0.8, shadowRadius: 4, elevation: 3 }} />
        <Text style={{ flex: 1, color: '#fff', fontSize: 13, fontWeight: '700' }}>{temaActual.label}</Text>
        <AntDesign name={abierto ? 'up' : 'down'} size={12} color="rgba(255,255,255,0.4)" />
      </Pressable>

      {/* Lista desplegable */}
      {abierto && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 2 }}>
            {GRADIENTES.map(g => {
              const activo = actual === g.id
              return (
                <Pressable
                  key={g.id}
                  onPress={() => { onSelect(g.id); setAbierto(false) }}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 8,
                    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
                    borderWidth: activo ? 2 : 1,
                    borderColor: activo ? g.dot : 'rgba(255,255,255,0.1)',
                    backgroundColor: activo ? g.dot + '22' : 'rgba(255,255,255,0.03)',
                  }}
                >
                  <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: g.dot, shadowColor: g.dot, shadowOpacity: 0.8, shadowRadius: 4, elevation: 3 }} />
                  <Text style={{ color: activo ? '#fff' : 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '700' }}>{g.label}</Text>
                  {activo && <AntDesign name="check-circle" size={11} color={g.dot} />}
                </Pressable>
              )
            })}
          </View>
        </ScrollView>
      )}
    </View>
  )
}

const ESTADOS_CLIENTE = [
  { key: 'activo',       label: 'Activo',        color: '#00cc44', bg: '#001a08' },
  { key: 'off_season',   label: 'Off Season',     color: '#4488ff', bg: '#001030' },
  { key: 'competencia',  label: 'Competencia',    color: '#ff9900', bg: '#1a0a00' },
  { key: 'recreativo',   label: 'Recreativo',     color: '#9933ff', bg: '#0f0020' },
  { key: 'rehabilitacion', label: 'Rehabilitación', color: '#ff3355', bg: '#1a0008' },
  { key: 'inactivo',     label: 'Inactivo',       color: '#2a4488', bg: '#05050f' },
]
const RutinaStack = createStackNavigator()

const DIAS_SEMANA_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const DIAS_NOMBRES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

// ── Utilidades ─────────────────────────────────────────────────
function Avatar({ nombre, foto, size = 44, radius, accentColor = '#4488ff' }) {
  const r = radius || size / 2
  if (foto) return <Image source={{ uri: foto }} style={{ width: size, height: size, borderRadius: r, borderWidth: 1.5, borderColor: accentColor }} />
  return (
    <View style={{ width: size, height: size, borderRadius: r, backgroundColor: '#0a1a3f', borderWidth: 1.5, borderColor: accentColor, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: accentColor, fontWeight: '900', fontSize: size * 0.38 }}>{nombre?.[0]?.toUpperCase() || '?'}</Text>
    </View>
  )
}

function calcularActividad(cliente, accentColor = '#4488ff') {
  // Basado en última sesión registrada en el programa
  if (!cliente.ultima_sesion) return { label: 'Sin datos', color: '#2a4488', dot: '#1a2a5a' }
  const dias = Math.floor((Date.now() - new Date(cliente.ultima_sesion)) / (1000 * 60 * 60 * 24))
  if (dias <= 2) return { label: 'Muy activo', color: '#00cc44', dot: '#00cc44' }
  if (dias <= 5) return { label: 'Activo', color: accentColor, dot: accentColor }
  if (dias <= 10) return { label: 'Poco activo', color: '#ff9900', dot: '#ff9900' }
  return { label: 'Inactivo', color: '#ff3355', dot: '#ff3355' }
}

// ══════════════════════════════════════════════════════════════
// PANTALLA INICIO COACH
// ══════════════════════════════════════════════════════════════
function InicioCoachScreen({ userId, vistaOverrideFn, esSuperadmin, onSwitchToAdmin }) {
  const { accentColor, gradColors, setTema: setTemaCtx } = useContext(CoachThemeContext)
  const acRgb = hexToRgb(accentColor)
  const styles = createStyles(accentColor, acRgb) // eslint-disable-line no-shadow
  const [perfil, setPerfil] = useState(null)
  const [clientes, setClientes] = useState([])
  const [codigos, setCodigos] = useState([])
  const [programa, setPrograma] = useState(null)
  const [cargandoInicio, setCargandoInicio] = useState(true)
  const [clienteDetalle, setClienteDetalle] = useState(null)
  const [modalCliente, setModalCliente] = useState(false)
  const [viendoProgreso, setViendoProgreso] = useState(false)
  const [chatAbierto, setChatAbierto] = useState(false)
  const [chatInterlocutor, setChatInterlocutor] = useState(null)
  const [mensajesNoLeidos, setMensajesNoLeidos] = useState(0)
  const [adminAbierto, setAdminAbierto] = useState(false)

  // ── Ajustes Hero Button ──
  const ajustesHeroRef    = useRef(null)
  const [heroToast, setHeroToast]         = useState(null)
  const heroToastAnim    = useRef(new Animated.Value(-420)).current
  const heroToastOpacity = useRef(new Animated.Value(0)).current

  function mostrarHeroToast({ msg, icon = 'check-circle', color = '#00cc66' }) {
    setHeroToast({ msg, icon, color })
    heroToastAnim.setValue(-420)
    heroToastOpacity.setValue(0)
    Animated.parallel([
      Animated.spring(heroToastAnim, { toValue: 0, useNativeDriver: true, tension: 70, friction: 11 }),
      Animated.timing(heroToastOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start()
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(heroToastAnim, { toValue: 420, duration: 320, useNativeDriver: true }),
        Animated.timing(heroToastOpacity, { toValue: 0, duration: 320, useNativeDriver: true }),
      ]).start(() => setHeroToast(null))
    }, 2400)
  }
  const [ajustesEditando, setAjustesEditando] = useState(false)
  const [ajustesForm, setAjustesForm] = useState({ nombre: '', apellido: '', peso: '', altura: '', genero: '' })
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const [subiendoLogo, setSubiendoLogo] = useState(false)
  const [modalCerrarSesion, setModalCerrarSesion] = useState(false)
  const ajustesEditAnim = useRef(new Animated.Value(0)).current

  // ── Team profile ──
  const [teamEditando, setTeamEditando] = useState(false)
  const [teamForm, setTeamForm] = useState({ team_name: '', especialidad: '', bio: '', experiencia_anos: '', certificaciones: '' })
  const [teamCerts, setTeamCerts] = useState([])
  const [subiendoCert, setSubiendoCert] = useState(false)
  const teamEditAnim = useRef(new Animated.Value(0)).current

  function toggleTeamEdit(open) {
    Animated.timing(teamEditAnim, { toValue: open ? 1 : 0, duration: 250, useNativeDriver: false }).start()
    setTeamEditando(open)
  }

  async function cargarTeamCerts() {
    const { data } = await supabase.from('coach_certificaciones').select('id, nombre, url').eq('coach_id', userId)
    setTeamCerts(data || [])
  }

  async function subirCertImagen() {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') { Alert.alert('Permiso denegado', 'Necesitamos acceso a tu galería'); return }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 })
      if (result.canceled) return
      setSubiendoCert(true)
      const asset = result.assets[0]
      const ext = asset.uri.split('.').pop()
      const path = `${userId}/${Date.now()}.${ext}`
      const blob = await (await fetch(asset.uri)).blob()
      const buffer = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsArrayBuffer(blob) })
      const { error: upErr } = await supabase.storage.from('certificaciones').upload(path, buffer, { contentType: asset.type || 'image/jpeg', upsert: false })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('certificaciones').getPublicUrl(path)
      await supabase.from('coach_certificaciones').insert({ coach_id: userId, nombre: `Certificado ${teamCerts.length + 1}`, url: publicUrl })
      cargarTeamCerts()
    } catch (e) { Alert.alert('Error', e.message) }
    setSubiendoCert(false)
  }

  async function eliminarCert(certId) {
    await supabase.from('coach_certificaciones').delete().eq('id', certId)
    setTeamCerts(prev => prev.filter(c => c.id !== certId))
  }

  function toggleEspecialidadTeam(label) {
    const current = teamForm.especialidad
      ? teamForm.especialidad.split(',').map(e => e.trim()).filter(Boolean)
      : []
    const updated = current.includes(label) ? current.filter(e => e !== label) : [...current, label]
    setTeamForm(p => ({ ...p, especialidad: updated.join(', ') }))
  }

  async function guardarTeamProfile() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    const updates = {
      team_name: teamForm.team_name.trim() || null,
      especialidad: teamForm.especialidad || null,
      bio: teamForm.bio.trim() || null,
      experiencia_anos: teamForm.experiencia_anos ? parseInt(teamForm.experiencia_anos) : null,
      certificaciones: teamForm.certificaciones.trim() || null,
    }
    const { error } = await supabase.from('perfiles').update(updates).eq('id', userId)
    if (error) { Alert.alert('Error', error.message); return }
    setPerfil(p => ({ ...p, ...updates }))
    toggleTeamEdit(false)
    ajustesHeroRef.current?.close()
    setTimeout(() => Toast.show({ type: 'success', text1: 'Perfil del equipo guardado', props: { color: accentColor, icon: 'check-circle' } }), 300)
  }

  function toggleAjustesEdit(open) {
    Animated.timing(ajustesEditAnim, { toValue: open ? 1 : 0, duration: 250, useNativeDriver: false }).start()
    setAjustesEditando(open)
  }

  async function seleccionarFotoCoach() {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') { Alert.alert('Permiso denegado', 'Necesitamos acceso a tu galería'); return }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8,
      })
      if (result.canceled) return
      setSubiendoFoto(true)
      const uri  = result.assets[0].uri
      const path = `${userId}/avatar.jpg`
      const resp   = await fetch(uri)
      const blob   = await resp.blob()
      const buffer = await new Promise((res, rej) => {
        const reader = new FileReader()
        reader.onload  = () => res(reader.result)
        reader.onerror = rej
        reader.readAsArrayBuffer(blob)
      })
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, buffer, { contentType: 'image/jpeg', upsert: true, cacheControl: '3600' })
      if (upErr) throw upErr
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
      const newUrl = urlData.publicUrl + '?t=' + Date.now()
      await supabase.from('perfiles').update({ avatar_url: newUrl }).eq('id', userId)
      setPerfil(p => ({ ...p, avatar_url: newUrl }))
    } catch (e) { Alert.alert('Error', e.message) }
    setSubiendoFoto(false)
  }

  async function seleccionarLogoEquipo() {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') { Alert.alert('Permiso denegado', 'Necesitamos acceso a tu galería'); return }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.85,
      })
      if (result.canceled) return
      setSubiendoLogo(true)
      const uri  = result.assets[0].uri
      const path = `${userId}/team_logo.jpg`
      const resp   = await fetch(uri)
      const blob   = await resp.blob()
      const buffer = await new Promise((res, rej) => {
        const reader = new FileReader()
        reader.onload  = () => res(reader.result)
        reader.onerror = rej
        reader.readAsArrayBuffer(blob)
      })
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, buffer, { contentType: 'image/jpeg', upsert: true, cacheControl: '3600' })
      if (upErr) throw upErr
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
      const newUrl = urlData.publicUrl + '?t=' + Date.now()
      await supabase.from('perfiles').update({ team_logo_url: newUrl }).eq('id', userId)
      setPerfil(p => ({ ...p, team_logo_url: newUrl }))
    } catch (e) { Alert.alert('Error', e.message) }
    setSubiendoLogo(false)
  }

  async function guardarAjustesCoach() {
    if (!ajustesForm.nombre.trim()) return
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    const nombreCompleto = [ajustesForm.nombre.trim(), ajustesForm.apellido.trim()].filter(Boolean).join(' ')
    const updates = { nombre_completo: nombreCompleto }
    if (ajustesForm.peso)   updates.peso   = parseFloat(ajustesForm.peso)
    if (ajustesForm.altura) updates.altura = parseFloat(ajustesForm.altura)
    if (ajustesForm.genero) updates.genero = ajustesForm.genero
    const { error } = await supabase.from('perfiles').update(updates).eq('id', userId)
    if (error) { Alert.alert('Error', error.message); return }
    setPerfil(p => ({ ...p, ...updates }))
    toggleAjustesEdit(false)
    ajustesHeroRef.current?.close()
    registrarPushToken(userId)
    Toast.show({ type: 'success', text1: 'Perfil actualizado', props: { color: accentColor, icon: 'check-circle' } })
  }

  async function guardarGradienteHero(gradId) {
    await supabase.from('perfiles').update({ tema_gradient: gradId }).eq('id', userId)
    setPerfil(p => ({ ...p, tema_gradient: gradId }))
    setTemaCtx(gradId)
    ajustesHeroRef.current?.close()
    const newColor = getAccentColor(gradId)
    setTimeout(() => Toast.show({ type: 'success', text1: 'Tema actualizado', props: { color: newColor, icon: 'check-circle' } }), 300)
  }


  const hoy = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1

  useFocusEffect(useCallback(() => { cargar() }, []))

  async function cargar() {
    const { data: p } = await supabase.from('perfiles').select('*').eq('id', userId).single()
    if (p) setPerfil(p)
    const { data: cl } = await supabase
      .from('perfiles')
      .select('id, nombre_completo, avatar_url, peso, objetivo, nivel_experiencia, estado_cliente, ultima_sesion, creado_en')
      .eq('coach_id', userId)
      .order('nombre_completo')
    setClientes(cl || [])
    const { data: cod } = await supabase
      .from('codigos_invitacion')
      .select('*, cliente:cliente_id(nombre_completo, avatar_url)')
      .eq('coach_id', userId)
      .order('creado_en', { ascending: false })
    setCodigos(cod || [])
    const prog = await cargarPrograma(userId)
    setPrograma(prog)
    // Mensajes no leídos total (de todos los clientes)
    const { count } = await supabase
      .from('mensajes')
      .select('id', { count: 'exact', head: true })
      .eq('receptor_id', userId)
      .eq('leido', false)
    setMensajesNoLeidos(count || 0)
    setCargandoInicio(false)
  }

  const programaActivo = programa?.programas?.find(p => p.estado === 'activo')
  const bloqueActivo = programaActivo?.bloques?.[0]
  const diasActivos = bloqueActivo ? (programa?.dias?.[`dias_${bloqueActivo.id}`] || []) : []
  const hayEntrenamientoHoy = diasActivos.includes(hoy)
  const fechaInicio = programaActivo?.fechaInicio ? new Date(programaActivo.fechaInicio + 'T12:00:00') : new Date()
  const semanaActual = Math.floor((Date.now() - fechaInicio.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1

  if (viendoProgreso && clienteDetalle) {
    return (
      <View style={{ flex: 1, backgroundColor: gradColors[0] }}>
        <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 12, backgroundColor: gradColors[0], flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => setViendoProgreso(false)} style={{ padding: 8 }}>
            <AntDesign name="left" size={20} color={accentColor} />
          </TouchableOpacity>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '900', flex: 1 }}>
            {clienteDetalle.nombre_completo || 'Cliente'}
          </Text>
          <Avatar nombre={clienteDetalle.nombre_completo} foto={clienteDetalle.avatar_url} size={34} accentColor={accentColor} />
        </View>
        <Progreso userId={clienteDetalle.id} modoCoach={true} />
      </View>
    )
  }


  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.iniContainer} showsVerticalScrollIndicator={false}
        contentInset={{ bottom: 100 }} scrollIndicatorInsets={{ bottom: 100 }}>
        <StaggerChildren trigger={!cargandoInicio} delay={80} step={90} translateYStart={32} springTension={85} springFriction={13} opacityDuration={380}>

        {/* HEADER */}
        <View style={styles.iniHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {perfil?.team_logo_url && (
              <Image source={{ uri: perfil.team_logo_url }} style={{ width: 36, height: 36, borderRadius: 10 }} />
            )}
            <View>
            <View style={styles.rfRow}>
              {perfil?.team_name
                ? <Text style={styles.rfF}>{perfil.team_name.toUpperCase()}</Text>
                : <><Text style={styles.rfR}>REP</Text><Text style={styles.rfF}>FORGE</Text></>
              }
              <View style={styles.coachBadge}><Text style={styles.coachBadgeText}>COACH</Text></View>
            </View>
            <Text style={styles.iniProgramaNombre}>
              {programaActivo ? `${programaActivo.nombre} · Sem ${semanaActual}` : 'Sin programa activo'}
            </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {esSuperadmin && (
              <TouchableOpacity
                style={styles.iniBellBtn}
                onPress={onSwitchToAdmin}
              >
                <AntDesign name="swap" size={18} color="#9933ff" />
              </TouchableOpacity>
            )}
            <AnimatedHeroButton
              ref={ajustesHeroRef}
              gradientColors={gradColors}
              onOpen={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                const partes = (perfil?.nombre_completo || '').split(' ')
                setAjustesForm({
                  nombre: partes[0] || '', apellido: partes.slice(1).join(' ') || '',
                  peso: perfil?.peso?.toString() || '', altura: perfil?.altura?.toString() || '',
                  genero: perfil?.genero || '',
                })
                setTeamForm({
                  team_name: perfil?.team_name || '',
                  especialidad: perfil?.especialidad || '',
                  bio: perfil?.bio || '',
                  experiencia_anos: perfil?.experiencia_anos?.toString() || '',
                  certificaciones: perfil?.certificaciones || '',
                })
                cargarTeamCerts()
                setAjustesEditando(false)
                toggleAjustesEdit(false)
                setTeamEditando(false)
                toggleTeamEdit(false)
              }}
              renderContent={(onClose) => (
                <View style={{ flex: 1 }}>
                  {/* Header */}
                  <View style={[styles.ajustesHeader, { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 10, marginBottom: 0 }]}>
                    <Text style={styles.ajustesTitulo}>Configuración</Text>
                    <TouchableOpacity onPress={onClose} style={styles.ajustesEditBtn}>
                      <AntDesign name="close" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>

                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}>
                    {/* PERFIL COACH */}
                    <Text style={styles.ajustesSectionLabel}>PERFIL COACH</Text>
                    <View style={styles.ajustesCard}>
                      <View style={styles.ajustesPerfilRow}>
                        <TouchableOpacity onPress={seleccionarFotoCoach} disabled={subiendoFoto} style={{ position: 'relative' }}>
                          {perfil?.avatar_url
                            ? <Image source={{ uri: perfil.avatar_url }} style={{ width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: accentColor }} />
                            : <View style={[styles.ajustesAvatar, { borderColor: `rgba(${acRgb},0.4)`, backgroundColor: `rgba(${acRgb},0.12)` }]}>
                                <Text style={[styles.ajustesAvatarText, { color: accentColor }]}>{perfil?.nombre_completo?.[0]?.toUpperCase() || 'C'}</Text>
                              </View>
                          }
                          <View style={{ position: 'absolute', bottom: 0, right: 0, width: 22, height: 22, borderRadius: 11, backgroundColor: accentColor, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#0d0d25' }}>
                            {subiendoFoto
                              ? <ActivityIndicator size={10} color="#fff" />
                              : <AntDesign name="camera" size={11} color="#fff" />
                            }
                          </View>
                        </TouchableOpacity>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.ajustesNombre}>{perfil?.nombre_completo || 'Coach'}</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <View style={styles.coachBadge}><Text style={styles.coachBadgeText}>ENTRENADOR</Text></View>
                          </View>
                        </View>
                        {!ajustesEditando
                          ? <TouchableOpacity style={styles.ajustesEditBtn} onPress={() => toggleAjustesEdit(true)}>
                              <AntDesign name="edit" size={16} color={accentColor} />
                            </TouchableOpacity>
                          : <TouchableOpacity style={[styles.ajustesEditBtn, { borderColor: '#ff3355' }]} onPress={() => toggleAjustesEdit(false)}>
                              <AntDesign name="close" size={14} color="#ff3355" />
                            </TouchableOpacity>
                        }
                      </View>
                      <Animated.View style={{ opacity: ajustesEditAnim, transform: [{ translateY: ajustesEditAnim.interpolate({ inputRange: [0,1], outputRange: [-10,0] }) }] }}>
                        {ajustesEditando && (
                          <View style={styles.ajustesEditForm}>
                            <View style={{ flexDirection: 'row', gap: 12 }}>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.ajustesEditLabel}>NOMBRE</Text>
                                <TextInput style={styles.ajustesEditInput} value={ajustesForm.nombre} onChangeText={t => setAjustesForm(p => ({...p, nombre: t}))} placeholder="Nombre" placeholderTextColor="#4a4a6a" />
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.ajustesEditLabel}>APELLIDO</Text>
                                <TextInput style={styles.ajustesEditInput} value={ajustesForm.apellido} onChangeText={t => setAjustesForm(p => ({...p, apellido: t}))} placeholder="Apellido" placeholderTextColor="#4a4a6a" />
                              </View>
                            </View>
                            <Text style={[styles.ajustesEditLabel, { marginTop: 14 }]}>GÉNERO</Text>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                              {['Masculino', 'Femenino', 'Otro'].map(g => (
                                <Pressable key={g} style={[styles.ajustesEditChipLg, ajustesForm.genero === g && { borderColor: accentColor, backgroundColor: `rgba(${acRgb},0.13)` }]} onPress={() => setAjustesForm(p => ({...p, genero: g}))}>
                                  <Text style={{ color: ajustesForm.genero === g ? accentColor : '#8E8E93', fontSize: 12, fontWeight: '700' }}>{g}</Text>
                                </Pressable>
                              ))}
                            </View>
                            <Text style={[styles.ajustesEditLabel, { marginTop: 14 }]}>PESO (kg)</Text>
                            <TextInput style={styles.ajustesEditInput} value={ajustesForm.peso} onChangeText={t => setAjustesForm(p => ({...p, peso: t}))} placeholder="70" placeholderTextColor="#4a4a6a" keyboardType="numeric" />
                            <Text style={[styles.ajustesEditLabel, { marginTop: 14 }]}>ALTURA (cm)</Text>
                            <TextInput style={styles.ajustesEditInput} value={ajustesForm.altura} onChangeText={t => setAjustesForm(p => ({...p, altura: t}))} placeholder="175" placeholderTextColor="#4a4a6a" keyboardType="numeric" />
                            <Pressable style={[styles.ajustesGuardarBtn, { marginTop: 16 }]} onPress={guardarAjustesCoach}>
                              <LinearGradient colors={[accentColor, accentColor + 'cc']} style={styles.ajustesGuardarGradient}>
                                <AntDesign name="check" size={15} color="#fff" />
                                <Text style={styles.ajustesGuardarText}>Guardar cambios</Text>
                              </LinearGradient>
                            </Pressable>
                          </View>
                        )}
                      </Animated.View>
                    </View>

                    {/* PERFIL DEL EQUIPO */}
                    <Text style={styles.ajustesSectionLabel}>PERFIL DEL EQUIPO</Text>
                    <View style={styles.ajustesCard}>
                      {/* Vista estática */}
                      <View style={styles.ajustesPerfilRow}>
                        {perfil?.team_logo_url
                          ? <Image source={{ uri: perfil.team_logo_url }} style={{ width: 44, height: 44, borderRadius: 11 }} />
                          : <View style={{ width: 44, height: 44, borderRadius: 11, backgroundColor: `${accentColor}15`, borderWidth: 1, borderColor: `${accentColor}30`, justifyContent: 'center', alignItems: 'center' }}>
                              <AntDesign name="team" size={20} color={accentColor} />
                            </View>
                        }
                        <View style={{ flex: 1 }}>
                          <Text style={styles.ajustesNombre}>{perfil?.team_name || 'Sin nombre de equipo'}</Text>
                          {perfil?.especialidad && (
                            <Text style={{ color: '#5a5a8a', fontSize: 11, marginTop: 2 }} numberOfLines={1}>{perfil.especialidad}</Text>
                          )}
                        </View>
                        {!teamEditando
                          ? <TouchableOpacity style={styles.ajustesEditBtn} onPress={() => toggleTeamEdit(true)}>
                              <AntDesign name="edit" size={16} color={accentColor} />
                            </TouchableOpacity>
                          : <TouchableOpacity style={[styles.ajustesEditBtn, { borderColor: '#ff3355' }]} onPress={() => toggleTeamEdit(false)}>
                              <AntDesign name="close" size={14} color="#ff3355" />
                            </TouchableOpacity>
                        }
                      </View>

                      {/* Formulario equipo */}
                      <Animated.View style={{ opacity: teamEditAnim, transform: [{ translateY: teamEditAnim.interpolate({ inputRange: [0,1], outputRange: [-10,0] }) }] }}>
                        {teamEditando && (
                          <View style={styles.ajustesEditForm}>
                            {/* Nombre + logo */}
                            <Text style={styles.ajustesEditLabel}>NOMBRE DEL EQUIPO</Text>
                            <TextInput style={styles.ajustesEditInput} value={teamForm.team_name} onChangeText={t => setTeamForm(p => ({...p, team_name: t}))} placeholder="Ej: IRONHOUSE, BEAST MODE GYM" placeholderTextColor="#4a4a6a" autoCapitalize="characters" maxLength={20} />
                            <Text style={[styles.ajustesEditLabel, { marginTop: 14 }]}>LOGO DEL EQUIPO</Text>
                            <TouchableOpacity onPress={seleccionarLogoEquipo} disabled={subiendoLogo} activeOpacity={0.8} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                              {perfil?.team_logo_url
                                ? <Image source={{ uri: perfil.team_logo_url }} style={{ width: 56, height: 56, borderRadius: 14, borderWidth: 1.5, borderColor: accentColor }} />
                                : <View style={{ width: 56, height: 56, borderRadius: 14, borderWidth: 1.5, borderColor: accentColor + '44', borderStyle: 'dashed', backgroundColor: accentColor + '08', justifyContent: 'center', alignItems: 'center' }}>
                                    {subiendoLogo ? <ActivityIndicator size={16} color={accentColor} /> : <AntDesign name="picture" size={20} color={accentColor} />}
                                  </View>
                              }
                              <Text style={{ color: accentColor, fontSize: 13, fontWeight: '700' }}>{perfil?.team_logo_url ? 'Cambiar logo' : 'Subir logo'}</Text>
                            </TouchableOpacity>

                            {/* Especialidades */}
                            <Text style={[styles.ajustesEditLabel, { marginTop: 14 }]}>ESPECIALIDADES</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
                              {ESPECIALIDADES_COACH.map(label => {
                                const active = teamForm.especialidad
                                  ? teamForm.especialidad.split(',').map(e => e.trim()).includes(label)
                                  : false
                                return (
                                  <TouchableOpacity key={label} onPress={() => toggleEspecialidadTeam(label)}
                                    style={{ paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: active ? accentColor : '#2a2a4a', backgroundColor: active ? `${accentColor}22` : 'transparent' }}>
                                    <Text style={{ color: active ? accentColor : '#5a5a8a', fontSize: 12, fontWeight: '700' }}>{label}</Text>
                                  </TouchableOpacity>
                                )
                              })}
                            </View>

                            {/* Bio */}
                            <Text style={[styles.ajustesEditLabel, { marginTop: 14 }]}>DESCRIPCIÓN DEL EQUIPO</Text>
                            <TextInput
                              style={[styles.ajustesEditInput, { height: 90, textAlignVertical: 'top', paddingTop: 10 }]}
                              value={teamForm.bio} onChangeText={t => setTeamForm(p => ({...p, bio: t}))}
                              placeholder="Cuéntale a tus clientes sobre tu equipo y metodología..." placeholderTextColor="#4a4a6a"
                              multiline numberOfLines={4}
                            />

                            {/* Experiencia */}
                            <Text style={[styles.ajustesEditLabel, { marginTop: 14 }]}>AÑOS DE EXPERIENCIA</Text>
                            <TextInput style={styles.ajustesEditInput} value={teamForm.experiencia_anos} onChangeText={t => setTeamForm(p => ({...p, experiencia_anos: t}))} placeholder="Ej: 5" placeholderTextColor="#4a4a6a" keyboardType="numeric" maxLength={2} />

                            {/* Certificaciones texto */}
                            <Text style={[styles.ajustesEditLabel, { marginTop: 14 }]}>FORMACIÓN Y CERTIFICACIONES</Text>
                            <TextInput
                              style={[styles.ajustesEditInput, { height: 80, textAlignVertical: 'top', paddingTop: 10 }]}
                              value={teamForm.certificaciones} onChangeText={t => setTeamForm(p => ({...p, certificaciones: t}))}
                              placeholder="NSCA-CSCS, NASM-CPT, Nutrición deportiva..." placeholderTextColor="#4a4a6a"
                              multiline numberOfLines={3}
                            />

                            {/* Certificaciones imágenes */}
                            <Text style={[styles.ajustesEditLabel, { marginTop: 14 }]}>IMÁGENES DE CERTIFICADOS</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 }}>
                              {teamCerts.map(c => (
                                <View key={c.id} style={{ position: 'relative' }}>
                                  <Image source={{ uri: c.url }} style={{ width: 80, height: 80, borderRadius: 12 }} />
                                  <TouchableOpacity onPress={() => eliminarCert(c.id)}
                                    style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: '#ff3355', justifyContent: 'center', alignItems: 'center' }}>
                                    <AntDesign name="close" size={11} color="#fff" />
                                  </TouchableOpacity>
                                </View>
                              ))}
                              {teamCerts.length < 5 && (
                                <TouchableOpacity onPress={subirCertImagen} disabled={subiendoCert}
                                  style={{ width: 80, height: 80, borderRadius: 12, borderWidth: 1.5, borderColor: accentColor + '44', borderStyle: 'dashed', backgroundColor: accentColor + '08', justifyContent: 'center', alignItems: 'center' }}>
                                  {subiendoCert ? <ActivityIndicator size={16} color={accentColor} /> : <AntDesign name="plus" size={22} color={accentColor} />}
                                </TouchableOpacity>
                              )}
                            </View>

                            <Pressable style={[styles.ajustesGuardarBtn, { marginTop: 16 }]} onPress={guardarTeamProfile}>
                              <LinearGradient colors={[accentColor, accentColor + 'cc']} style={styles.ajustesGuardarGradient}>
                                <AntDesign name="check" size={15} color="#fff" />
                                <Text style={styles.ajustesGuardarText}>Guardar perfil del equipo</Text>
                              </LinearGradient>
                            </Pressable>
                          </View>
                        )}
                      </Animated.View>
                    </View>

                    {/* APARIENCIA */}
                    <Text style={styles.ajustesSectionLabel}>APARIENCIA</Text>
                    <TemaSelect perfilActual={perfil} onSelect={guardarGradienteHero} />

                    {/* CUENTA */}
                    <Text style={styles.ajustesSectionLabel}>CUENTA</Text>
                    <View style={styles.ajustesCard}>
                      <TouchableOpacity style={styles.ajustesRow} onPress={() => setModalCerrarSesion(true)}>
                        <AntDesign name="logout" size={16} color="#ff3355" />
                        <Text style={[styles.ajustesRowText, { color: '#ff3355' }]}>Cerrar sesión</Text>
                        <AntDesign name="right" size={14} color="#ff3355" />
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.ajustesVersion}>RepForge v1.0.0 · Coach Panel</Text>
                  </ScrollView>
                </View>
              )}
            >
              <AntDesign name="setting" size={18} color={accentColor} />
            </AnimatedHeroButton>
          </View>
        </View>

        {/* PERFIL COACH */}
        <AppleBentoCard style={styles.iniPerfilCard}>
          <View style={[styles.iniPerfilAvatar, { backgroundColor: `rgba(${acRgb},0.1)`, borderColor: `rgba(${acRgb},0.3)` }]}>
            {perfil?.avatar_url
              ? <Image source={{ uri: perfil.avatar_url }} style={{ width: 42, height: 42, borderRadius: 21 }} />
              : <Text style={[styles.iniPerfilAvatarText, { color: accentColor }]}>{perfil?.nombre_completo?.[0]?.toUpperCase() || 'C'}</Text>
            }
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.iniPerfilNombre}>{perfil?.nombre_completo || 'Coach'}</Text>
            <View style={styles.iniPerfilSubRow}>
              <Text style={[styles.iniPerfilSub, { color: accentColor, backgroundColor: `rgba(${acRgb},0.08)`, borderColor: `rgba(${acRgb},0.2)` }]}>{clientes.length} clientes</Text>
              {clientes.filter(c => calcularActividad(c, accentColor).label === 'Muy activo').length > 0 &&
                <Text style={[styles.iniPerfilSub, { backgroundColor: '#001a0a', color: '#00cc44', borderColor: 'rgba(0,204,68,0.2)' }]}>
                  {clientes.filter(c => calcularActividad(c, accentColor).label === 'Muy activo').length} activos hoy
                </Text>
              }
            </View>
          </View>
        </AppleBentoCard>

        {/* STRIP SEMANAL (su propio entrenamiento) */}
        {diasActivos.length > 0 && (
          <View style={styles.iniWeekRow}>
            {DIAS_SEMANA_LABELS.map((dia, i) => {
              const esActivo = diasActivos.includes(i)
              const esHoy = i === hoy
              return (
                <View key={i} style={styles.iniDayCol}>
                  <Text style={[styles.iniDayLabel, esHoy && styles.iniDayLabelHoy]}>{dia}</Text>
                  <View style={[
                    styles.iniDayDot,
                    esActivo && i < hoy && { backgroundColor: accentColor, borderColor: accentColor },
                    esActivo && esHoy && { borderColor: accentColor, borderWidth: 1.5, backgroundColor: `rgba(${acRgb},0.1)` },
                    esActivo && i > hoy && styles.iniDayDotFuturo,
                    !esActivo && styles.iniDayDotDescanso,
                  ]}>
                    {esActivo && i < hoy && <AntDesign name="check" size={10} color="#fff" />}
                    {esHoy && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: accentColor }} />}
                  </View>
                </View>
              )
            })}
          </View>
        )}

        {/* HOY TOCA — su entrenamiento */}
        <AppleBentoCard style={styles.iniCardHoy}>
          <View style={styles.iniCardHoyTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.iniCardHoyLabel}>TU ENTRENAMIENTO HOY — {DIAS_NOMBRES[hoy].toUpperCase()}</Text>
              {hayEntrenamientoHoy ? (
                <>
                  <Text style={styles.iniCardHoyTitulo}>{bloqueActivo?.tipo || 'Entrenamiento'}</Text>
                  <Text style={styles.iniCardHoySub}>{bloqueActivo?.nombre}</Text>
                </>
              ) : (
                <>
                  <Text style={styles.iniCardHoyTitulo}>Descanso</Text>
                  <Text style={styles.iniCardHoySub}>Día de recuperación</Text>
                </>
              )}
            </View>
          </View>
        </AppleBentoCard>

        {/* ACCESOS RÁPIDOS — fila horizontal */}
        <View style={styles.iniAccesoRow}>
          <TouchableOpacity
            style={[styles.iniAccesoBtn, mensajesNoLeidos > 0 && { backgroundColor: `rgba(${acRgb},0.08)`, borderColor: `rgba(${acRgb},0.25)` }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setChatAbierto(true) }} activeOpacity={0.85}
          >
            <View style={styles.iniAccesoIconWrap}>
              <AntDesign name="message" size={22} color={mensajesNoLeidos > 0 ? accentColor : '#8E8E93'} />
              {mensajesNoLeidos > 0 && (
                <View style={[styles.iniAccesoBadge, { backgroundColor: accentColor }]}>
                  <Text style={styles.iniAccesoBadgeText}>{mensajesNoLeidos > 9 ? '9+' : mensajesNoLeidos}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.iniAccesoLabel, mensajesNoLeidos > 0 && { color: accentColor }]}>Mensajes</Text>
            {mensajesNoLeidos > 0 && <Text style={styles.iniAccesoSub}>{mensajesNoLeidos} nuevo{mensajesNoLeidos > 1 ? 's' : ''}</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iniAccesoBtn}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setAdminAbierto(true) }} activeOpacity={0.85}
          >
            <AntDesign name="team" size={22} color="#8E8E93" />
            <Text style={styles.iniAccesoLabel}>Administrar</Text>
            <Text style={styles.iniAccesoSub}>{clientes.length} clientes</Text>
          </TouchableOpacity>
        </View>

        {/* RESUMEN CLIENTES */}
        <View style={styles.iniSection}>
          <Text style={styles.iniSectionLabel}>MIS CLIENTES ({cargandoInicio ? '…' : clientes.length})</Text>
          {cargandoInicio ? (
            [...Array(4)].map((_, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 18, padding: 12, marginBottom: 8 }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)' }} />
                <View style={{ flex: 1, gap: 8 }}>
                  <View style={{ width: 130, height: 13, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.08)' }} />
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <View style={{ width: 70, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.05)' }} />
                    <View style={{ width: 50, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.05)' }} />
                  </View>
                </View>
              </View>
            ))
          ) : clientes.length === 0 ? (
            <View style={[styles.iniSemanaCard, { alignItems: 'center', paddingVertical: 24 }]}>
              <AntDesign name="team" size={32} color="#8E8E93" />
              <Text style={{ color: '#8E8E93', marginTop: 10, fontSize: 13 }}>Aún no tienes clientes vinculados</Text>
            </View>
          ) : (
            clientes.slice(0, 5).map(cliente => {
              const act = calcularActividad(cliente, accentColor)
              const estado = ESTADOS_CLIENTE.find(e => e.key === (cliente.estado_cliente || 'activo')) || ESTADOS_CLIENTE[0]
              return (
                <TouchableOpacity
                  key={cliente.id}
                  style={[styles.clienteCardMini, { marginBottom: 8, borderLeftWidth: 3, borderLeftColor: estado.color }]}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setClienteDetalle(cliente); setModalCliente(true) }}
                  activeOpacity={0.85}
                >
                  <Avatar nombre={cliente.nombre_completo} foto={cliente.avatar_url} size={40} />
                  <View style={styles.clienteCardMiniInfo}>
                    <Text style={styles.clienteCardMiniNombre}>{cliente.nombre_completo || 'Cliente'}</Text>
                    <View style={styles.clienteCardMiniActRow}>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: act.dot }} />
                      <Text style={[styles.clienteCardMiniActLabel, { color: act.color }]}>{act.label}</Text>
                      <Text style={[styles.clienteCardMiniEstado, { color: estado.color }]}>· {estado.label}</Text>
                    </View>
                  </View>
                  <AntDesign name="right" size={13} color="#8E8E93" />
                </TouchableOpacity>
              )
            })
          )}
          {clientes.length > 5 && (
            <TouchableOpacity onPress={() => setAdminAbierto(true)}>
              <Text style={styles.clienteCardMiniVerTodos}>+{clientes.length - 5} más · Ver todos</Text>
            </TouchableOpacity>
          )}
        </View>

        </StaggerChildren>
      </ScrollView>

      {/* CONFIRMAR CERRAR SESIÓN */}
      <DeleteConfirmModal
        visible={modalCerrarSesion}
        onCancel={() => setModalCerrarSesion(false)}
        onConfirm={() => supabase.auth.signOut()}
        title="¿Cerrar sesión?"
        subtitle="Tendrás que iniciar sesión nuevamente para acceder a tu cuenta."
      />

      {/* TOAST */}
      {heroToast && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute', top: 50, left: 30, right: 30, zIndex: 99999,
            opacity: heroToastOpacity,
            transform: [
              { translateX: heroToastAnim },
              { scale: heroToastOpacity.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
            ],
          }}
        >
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 10,
            paddingHorizontal: 14, paddingVertical: 10, borderRadius: 22,
            backgroundColor: 'rgba(5,5,20,0.94)', borderWidth: 1,
            borderColor: heroToast.color + '33',
            shadowColor: heroToast.color, shadowOpacity: 0.25, shadowRadius: 10,
            shadowOffset: { width: 0, height: 5 }, elevation: 15,
          }}>
            <AntDesign name={heroToast.icon} size={14} color={heroToast.color} />
            <Text style={{ flex: 1, color: '#fff', fontWeight: '600', fontSize: 13, letterSpacing: -0.2 }}>
              {heroToast.msg}
            </Text>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: heroToast.color }} />
          </View>
        </Animated.View>
      )}

      {/* MODAL DETALLE CLIENTE */}
      <ManagedModal visible={modalCliente} transparent animationType="none">
          <DraggableSheet onClose={() => setModalCliente(false)} gradientColors={gradColors} containerStyle={{ borderColor: `rgba(${acRgb},0.22)` }}>
            {clienteDetalle && (
              <>
                <View style={styles.detalleHeader}>
                  <Avatar nombre={clienteDetalle.nombre_completo} foto={clienteDetalle.avatar_url} size={58} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detalleNombre}>{clienteDetalle.nombre_completo || 'Cliente'}</Text>
                    <Text style={[styles.detalleSub, { color: `rgba(${acRgb},0.5)` }]}>
                      {[clienteDetalle.peso && clienteDetalle.peso + ' kg', clienteDetalle.nivel_experiencia].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                </View>
                <View style={{ gap: 10 }}>
                  <TouchableOpacity style={styles.accionBtn} onPress={() => { setModalCliente(false); setViendoProgreso(true) }}>
                    <AntDesign name="area-chart" size={18} color="#00cc44" />
                    <Text style={styles.accionBtnText}>Ver progreso completo</Text>
                    <AntDesign name="right" size={14} color="#8E8E93" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.accionBtn} onPress={() => { setChatInterlocutor(clienteDetalle); setModalCliente(false); setChatAbierto(true) }}>
                    <AntDesign name="message" size={18} color={accentColor} />
                    <Text style={styles.accionBtnText}>Enviar mensaje</Text>
                    <AntDesign name="right" size={14} color="#8E8E93" />
                  </TouchableOpacity>
                </View>
              </>
            )}
          </DraggableSheet>
      </ManagedModal>

      {/* MODAL CHAT */}
      <ManagedModal visible={chatAbierto} transparent animationType="none">
        <DraggableSheet
          onClose={() => { setChatAbierto(false); setChatInterlocutor(null); cargar() }}
          gradientColors={gradColors}
          header={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 4 }}>
              {perfil?.team_logo_url ? (
                <Image source={{ uri: perfil.team_logo_url }} style={{ width: 44, height: 44, borderRadius: 12 }} />
              ) : (
                <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: `rgba(${acRgb},0.12)`, borderWidth: 1, borderColor: `rgba(${acRgb},0.3)`, justifyContent: 'center', alignItems: 'center' }}>
                  <AntDesign name="message1" size={20} color={accentColor} />
                </View>
              )}
              <View>
                <Text style={{ fontSize: 24, fontWeight: '900', color: '#fff', letterSpacing: 1 }}>{perfil?.team_name || 'Mensajes'}</Text>
                <Text style={{ color: '#8E8E93', fontSize: 11, letterSpacing: 1, fontWeight: '600' }}>BANDEJA DE ENTRADA</Text>
              </View>
            </View>
          }
        >
          <Chat userId={userId} esCoach={true} interlocutorInicial={chatInterlocutor} />
        </DraggableSheet>
      </ManagedModal>

      {/* MODAL ADMIN CLIENTES */}
      <SwipeableModal visible={adminAbierto} onClose={() => { setAdminAbierto(false); cargar() }} backgroundColor={gradColors[0]}>
        <View style={{ flex: 1, backgroundColor: gradColors[0] }}>
          <View style={styles.adminModalHeader}>
            <TouchableOpacity onPress={() => { setAdminAbierto(false); cargar() }} style={{ padding: 8 }}>
              <AntDesign name="left" size={20} color={accentColor} />
            </TouchableOpacity>
            <Text style={styles.adminModalTitle}>Administrar clientes</Text>
          </View>
          <AdminClientesScreen userId={userId} codigos={codigos} onCargar={cargar} embedded={true} visible={adminAbierto} />
        </View>
      </SwipeableModal>
    </View>
  )
}

// ══════════════════════════════════════════════════════════════
// PANTALLA CLIENTES
// ══════════════════════════════════════════════════════════════
function ClientesScreen({ userId, esSuperadmin, onSwitchToAdmin, onSwitchToCliente }) {
  const { accentColor, gradColors, setTema: setTemaCtx } = useContext(CoachThemeContext)
  const acRgb = hexToRgb(accentColor)
  const styles = createStyles(accentColor, acRgb) // eslint-disable-line no-shadow
  const [clientes, setClientes] = useState([])
  const [codigos, setCodigos] = useState([])
  const [generando, setGenerando] = useState(false)
  const [modalCodigo, setModalCodigo] = useState(false)
  const [nuevoCodigo, setNuevoCodigo] = useState(null)
  const [clienteDetalle, setClienteDetalle] = useState(null)
  const [modalCliente, setModalCliente] = useState(false)
  const [viendoProgreso, setViendoProgreso] = useState(false)
  const [cargandoClientes, setCargandoClientes] = useState(true)
  const [chatAbierto, setChatAbierto]           = useState(false)
  const [chatInterlocutor, setChatInterlocutor] = useState(null)
  const [toast, setToast] = useState(null) // { msg, sub, icon, color }
  const toastAnim    = useRef(new Animated.Value(-420)).current
  const toastOpacity = useRef(new Animated.Value(0)).current
  const [perfil, setPerfil] = useState(null)

  useFocusEffect(useCallback(() => { cargar() }, []))

  const [modalAsignar, setModalAsignar] = useState(false)
  const [programasCoach, setProgramasCoach] = useState([])

  async function cargar() {
    // Cargar perfil del coach
    const { data: p } = await supabase.from('perfiles').select('*').eq('id', userId).single()
    if (p) setPerfil(p)
    
    const { data: c } = await supabase
      .from('perfiles')
      .select('id, nombre_completo, avatar_url, peso, altura, genero, objetivo, nivel_experiencia, ultima_sesion, creado_en')
      .eq('coach_id', userId)
      .order('nombre_completo')
    setClientes(c || [])
    const { data: cod } = await supabase
      .from('codigos_invitacion')
      .select('*, cliente:cliente_id(nombre_completo, avatar_url)')
      .eq('coach_id', userId)
      .order('creado_en', { ascending: false })
      .limit(30)
    setCodigos(cod || [])
    setCargandoClientes(false)
  }

  async function generarCodigo() {
    const plan = PLANES_COACH[perfil?.plan_coach || 'free']
    const codigosLibresActuales = codigos.filter(c => !c.usado)
    const totalOcupado = clientes.length + codigosLibresActuales.length
    if (plan.maxClientes !== null && totalOcupado >= plan.maxClientes) {
      Alert.alert(
        `Límite de plan ${plan.label}`,
        `Tu plan permite hasta ${plan.maxClientes} spot${plan.maxClientes !== 1 ? 's' : ''} (clientes activos + códigos pendientes).\n\nActualmente tienes ${clientes.length} cliente${clientes.length !== 1 ? 's' : ''} y ${codigosLibresActuales.length} código${codigosLibresActuales.length !== 1 ? 's' : ''} sin usar.\n\nContacta al administrador para actualizar tu plan.`
      )
      return
    }
    setGenerando(true)
    const codigo = Math.random().toString(36).substring(2, 8).toUpperCase()
    const { data, error } = await supabase.from('codigos_invitacion')
      .insert({ codigo, coach_id: userId, usado: false, creado_en: new Date().toISOString() })
      .select().single()
    if (!error && data) { setNuevoCodigo(data.codigo); setModalCodigo(true); cargar() }
    else Alert.alert('Error', error?.message || 'No se pudo generar')
    setGenerando(false)
  }

  function mostrarToast({ msg, sub, icon = 'copy', color = accentColor }) {
    setToast({ msg, sub, icon, color })
    toastAnim.setValue(-420)
    toastOpacity.setValue(0)
    Animated.parallel([
      Animated.spring(toastAnim, { toValue: 0, useNativeDriver: true, tension: 70, friction: 11 }),
      Animated.timing(toastOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start()
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(toastAnim, { toValue: 420, duration: 320, useNativeDriver: true }),
        Animated.timing(toastOpacity, { toValue: 0, duration: 320, useNativeDriver: true }),
      ]).start(() => setToast(null))
    }, 2400)
  }

  async function copiarCodigo(codigo) {
    try {
      Clipboard.setString(codigo)
      mostrarToast({ msg: 'Código copiado', sub: codigo, icon: 'copy', color: accentColor })
    } catch { Alert.alert('Código', codigo) }
  }

  async function compartirCodigo(codigo) {
    await Share.share({ message: `¡Únete a mi equipo en RepForge! 💪\nUsa el código: ${codigo}\nDescarga la app en repforge.app` })
  }

  async function abrirAsignarRutina(cliente) {
    setClienteDetalle(cliente)
    // Cargar programas del coach desde storage
    const { cargarPrograma } = require('../../lib/storage')
    const data = await cargarPrograma(userId)
    setProgramasCoach(data?.programas || [])
    setModalAsignar(true)
    setModalCliente(false)
  }

  async function asignarRutina(programa) {
    if (!clienteDetalle) return
    // Copiar el programa al cliente — insertar en su storage
    const { guardarYSincronizar, cargarPrograma } = require('../../lib/storage')
    const dataCliente = await cargarPrograma(clienteDetalle.id)
    const programasCopia = [...(dataCliente?.programas || [])]
    const diasCopia = { ...(dataCliente?.dias || {}) }
    // Copiar programa con nuevo ID
    const nuevoId = 'prog_' + Date.now()
    const programaCopia = {
      ...programa,
      id: nuevoId,
      nombre: programa.nombre + ' (asignado por coach)',
      estado: 'activo',
      asignadoPorCoach: userId,
    }
    programasCopia.push(programaCopia)
    // Copiar días del programa
    programa.bloques?.forEach(bloque => {
      const keyOrigen = `dias_${bloque.id}`
      const nuevoBlqueId = bloque.id + '_' + nuevoId
      const keyDestino = `dias_${nuevoBlqueId}`
      if (dataCliente?.dias?.[keyOrigen]) {
        diasCopia[keyDestino] = dataCliente.dias[keyOrigen]
      }
    })
    await guardarYSincronizar(clienteDetalle.id, { programas: programasCopia, dias: diasCopia })
    setModalAsignar(false)
    Alert.alert('✓ Asignado', `La rutina "${programa.nombre}" fue asignada a ${clienteDetalle.nombre_completo}`)
  }

  async function desvincularCliente(cliente) {
    Alert.alert('Desvincular', `¿Desvincular a ${cliente.nombre_completo}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Desvincular', style: 'destructive', onPress: async () => {
        await supabase.from('perfiles').update({ coach_id: null }).eq('id', cliente.id)
        setModalCliente(false); cargar()
      }}
    ])
  }

  if (viendoProgreso && clienteDetalle) {
    return (
      <View style={{ flex: 1, backgroundColor: gradColors[0] }}>
        <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 12, backgroundColor: gradColors[0], flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => setViendoProgreso(false)} style={{ padding: 8 }}>
            <AntDesign name="left" size={20} color={accentColor} />
          </TouchableOpacity>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '900', flex: 1 }}>{clienteDetalle.nombre_completo}</Text>
          <Avatar nombre={clienteDetalle.nombre_completo} foto={clienteDetalle.avatar_url} size={34} accentColor={accentColor} />
        </View>
        <Progreso userId={clienteDetalle.id} modoCoach={true} />
      </View>
    )
  }

  const codigosLibres = codigos.filter(c => !c.usado)
  const codigosUsados = codigos.filter(c => c.usado)

  return (
    <LinearGradient colors={gradColors} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.iniContainer} showsVerticalScrollIndicator={false}
        contentInset={{ bottom: 100 }} scrollIndicatorInsets={{ bottom: 100 }}>
        <StaggerChildren trigger={!cargandoClientes} delay={80} step={90} translateYStart={32} springTension={85} springFriction={13} opacityDuration={380}>

        <View style={styles.iniHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {perfil?.team_logo_url && (
              <Image source={{ uri: perfil.team_logo_url }} style={{ width: 36, height: 36, borderRadius: 10 }} />
            )}
            <View>
            <View style={styles.rfRow}>
              {perfil?.team_name
                ? <Text style={styles.rfF}>{perfil.team_name.toUpperCase()}</Text>
                : <><Text style={styles.rfR}>REP</Text><Text style={styles.rfF}>FORGE</Text></>
              }
            </View>
            <Text style={styles.iniProgramaNombre}>{clientes.length} clientes · {codigosLibres.length} códigos libres</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={styles.iniBellBtn} onPress={generarCodigo} disabled={generando}>
              <AntDesign name="user-add" size={18} color={accentColor} />
            </TouchableOpacity>
          </View>
        </View>

        {/* CARD FUSIONADO — clientes + códigos libres */}
        <AppleBentoCard style={styles.fusionCard}>
          {/* Fila superior: stats */}
          <View style={{ flexDirection: 'row', marginBottom: 16 }}>
            {[
              { label: 'Total clientes', value: clientes.length, color: accentColor, icon: 'team' },
              { label: 'Muy activos', value: clientes.filter(c => calcularActividad(c, accentColor).label === 'Muy activo').length, color: '#00cc44', icon: 'user' },
              { label: 'Códigos libres', value: codigosLibres.length, color: '#ff6600', icon: 'mail' },
            ].map(s => (
              <View key={s.label} style={{ flex: 1, alignItems: 'center' }}>
                <AntDesign name={s.icon} size={16} color={s.color} style={{ marginBottom: 4 }} />
                <Text style={{ color: s.color, fontSize: 22, fontWeight: '900', letterSpacing: -1.0 }}>{s.value}</Text>
                <Text style={{ color: '#8E8E93', fontSize: 9, fontWeight: '700', letterSpacing: 0.5, textAlign: 'center' }}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* PLAN + BARRA DE USO */}
          {(() => {
            const planKey = perfil?.plan_coach || 'free'
            const plan = PLANES_COACH[planKey]
            const usado = clientes.length
            const max = plan.maxClientes
            const pct = max ? Math.min(usado / max, 1) : 0
            const lleno = max !== null && usado >= max
            return (
              <View style={{ marginBottom: 14, gap: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: plan.badge, borderWidth: 1, borderColor: plan.color + '55' }}>
                      <Text style={{ color: plan.color, fontSize: 10, fontWeight: '900', letterSpacing: 1 }}>{plan.label.toUpperCase()}</Text>
                    </View>
                    <Text style={{ color: '#8E8E93', fontSize: 11, fontWeight: '600' }}>
                      {max ? `${usado} / ${max} clientes` : `${usado} clientes · Sin límite`}
                    </Text>
                  </View>
                  {lleno && <Text style={{ color: '#ff4444', fontSize: 10, fontWeight: '800' }}>LÍMITE ALCANZADO</Text>}
                </View>
                {max && (
                  <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                    <View style={{ height: '100%', width: `${pct * 100}%`, backgroundColor: lleno ? '#ff4444' : plan.color, borderRadius: 2 }} />
                  </View>
                )}
              </View>
            )
          })()}

          <TouchableOpacity onPress={generarCodigo} style={{ alignItems: 'center', paddingVertical: 10 }}>
            <Text style={{ color: accentColor, fontSize: 13, fontWeight: '700' }}>+ Generar nuevo código</Text>
          </TouchableOpacity>
        </AppleBentoCard>

        {/* LISTA CLIENTES */}
        <View>
          <Text style={styles.iniSectionLabel}>CLIENTES ({cargandoClientes ? '…' : clientes.length})</Text>
          {cargandoClientes ? (
            [...Array(5)].map((_, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 18, padding: 16, marginBottom: 10 }}>
                <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.08)' }} />
                <View style={{ flex: 1, gap: 8 }}>
                  <View style={{ width: 130, height: 13, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.08)' }} />
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <View style={{ width: 70, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.05)' }} />
                    <View style={{ width: 50, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.05)' }} />
                  </View>
                </View>
              </View>
            ))
          ) : clientes.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 40, gap: 12 }}>
              <AntDesign name="team" size={48} color="#8E8E93" />
              <Text style={{ color: '#fff', fontSize: 17, fontWeight: '900' }}>Sin clientes aún</Text>
              <Text style={{ color: `rgba(${acRgb},0.5)`, fontSize: 13, textAlign: 'center', paddingHorizontal: 30 }}>
                Genera un código y compártelo para vincular clientes
              </Text>
            </View>
          ) : (
            clientes.map(cliente => {
              const act = calcularActividad(cliente, accentColor)
              const codUsado = codigosUsados.find(c => c.cliente?.nombre_completo === cliente.nombre_completo)
              return (
                <TouchableOpacity
                  key={cliente.id}
                  style={styles.clienteCard}
                  onPress={() => { setClienteDetalle(cliente); setModalCliente(true) }}
                  activeOpacity={0.85}
                >
                  <Avatar nombre={cliente.nombre_completo} foto={cliente.avatar_url} size={50} accentColor={accentColor} />
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>{cliente.nombre_completo || 'Cliente'}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: act.dot }} />
                        <Text style={{ color: act.color, fontSize: 9, fontWeight: '800', letterSpacing: 0.5 }}>{act.label.toUpperCase()}</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
                      {cliente.objetivo && (
                        <View style={[styles.clienteTag, { borderColor: `rgba(${acRgb},0.2)`, backgroundColor: `rgba(${acRgb},0.07)` }]}>
                          <Text style={[styles.clienteTagText, { color: accentColor }]}>{cliente.objetivo}</Text>
                        </View>
                      )}
                      {cliente.nivel_experiencia && (
                        <View style={[styles.clienteTag, { borderColor: '#9933ff33', backgroundColor: '#9933ff11' }]}>
                          <Text style={[styles.clienteTagText, { color: '#9933ff' }]}>{cliente.nivel_experiencia}</Text>
                        </View>
                      )}
                      {cliente.peso && (
                        <View style={[styles.clienteTag, { borderColor: '#ff660033', backgroundColor: '#ff660011' }]}>
                          <Text style={[styles.clienteTagText, { color: '#ff6600' }]}>{cliente.peso} kg</Text>
                        </View>
                      )}
                    </View>
                    {codUsado && (
                      <Text style={{ color: `rgba(${acRgb},0.4)`, fontSize: 10, marginTop: 4 }}>
                        Código: {codUsado.codigo}
                      </Text>
                    )}
                  </View>
                  <AntDesign name="right" size={14} color="#8E8E93" />
                </TouchableOpacity>
              )
            })
          )}
        </View>

        </StaggerChildren>

      </ScrollView>

      {/* MODAL DETALLE CLIENTE */}
      <ManagedModal visible={modalCliente} transparent animationType="none">
          <DraggableSheet onClose={() => setModalCliente(false)} scrollable gradientColors={gradColors} containerStyle={{ borderColor: `rgba(${acRgb},0.22)` }}>
            {clienteDetalle && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header cliente */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                  <Avatar nombre={clienteDetalle.nombre_completo} foto={clienteDetalle.avatar_url} size={64} accentColor={accentColor} />
                  <View style={{ flex: 1, marginLeft: 16 }}>
                    <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900' }}>{clienteDetalle.nombre_completo || 'Cliente'}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      {(() => {
                        const act = calcularActividad(clienteDetalle, accentColor)
                        return (
                          <>
                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: act.dot }} />
                            <Text style={{ color: act.color, fontSize: 11, fontWeight: '700' }}>{act.label}</Text>
                          </>
                        )
                      })()}
                    </View>
                  </View>
                </View>

                {/* Info grid */}
                <Text style={styles.ajustesSectionLabel}>INFORMACIÓN</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
                  {[
                    { label: 'Objetivo', value: clienteDetalle.objetivo || '—', color: '#9933ff' },
                    { label: 'Nivel', value: clienteDetalle.nivel_experiencia || '—', color: accentColor },
                    { label: 'Peso', value: clienteDetalle.peso ? clienteDetalle.peso + ' kg' : '—', color: '#ff6600' },
                    { label: 'Altura', value: clienteDetalle.altura ? clienteDetalle.altura + ' cm' : '—', color: '#00cc44' },
                  ].map(item => (
                    <View key={item.label} style={{ width: '47%', backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 14, alignItems: 'center' }}>
                      <Text style={{ fontSize: 17, fontWeight: '900', color: item.color, marginBottom: 4 }}>{item.value}</Text>
                      <Text style={{ color: '#8E8E93', fontSize: 10, fontWeight: '700', letterSpacing: 1 }}>{item.label}</Text>
                    </View>
                  ))}
                </View>

                {/* Acciones */}
                <Text style={styles.ajustesSectionLabel}>ACCIONES</Text>
                <View style={{ gap: 10 }}>
                  <TouchableOpacity style={styles.accionBtn} onPress={() => {
                    setModalCliente(false)
                    const { rutinasNavigation } = require('../../lib/rutinasRef')
                    // Fallback: si ref no está listo, ListaProgramas lo recoge al montar
                    rutinasNavigation.pendingCliente = { id: clienteDetalle.id, nombre: clienteDetalle.nombre_completo }
                    // Navegar al stack de rutinas a ListaProgramas con los params del cliente
                    rutinasNavigation.ref?.navigate('ListaProgramas', {
                      clienteId: clienteDetalle.id,
                      nombreCliente: clienteDetalle.nombre_completo,
                    })
                    // Cambiar a pestaña Rutina
                    rutinasNavigation.goToTab?.(3)
                  }}>
                    <AntDesign name="calendar" size={18} color="#ff9900" />
                    <Text style={[styles.accionBtnText, { color: '#ff9900' }]}>Editar / Asignar Rutina</Text>
                    <AntDesign name="right" size={14} color="#ff9900" />
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.accionBtn} onPress={() => { setModalCliente(false); setViendoProgreso(true) }}>
                    <AntDesign name="area-chart" size={18} color="#00cc44" />
                    <Text style={styles.accionBtnText}>Ver progreso completo</Text>
                    <AntDesign name="right" size={14} color="#8E8E93" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.accionBtn} onPress={() => { setChatInterlocutor(clienteDetalle); setModalCliente(false); setChatAbierto(true) }}>
                    <AntDesign name="message" size={18} color={accentColor} />
                    <Text style={styles.accionBtnText}>Enviar mensaje</Text>
                    <AntDesign name="right" size={14} color="#8E8E93" />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.accionBtn, { borderColor: '#ff335533' }]} onPress={() => desvincularCliente(clienteDetalle)}>
                    <AntDesign name="disconnect" size={18} color="#ff3355" />
                    <Text style={[styles.accionBtnText, { color: '#ff3355' }]}>Desvincular cliente</Text>
                    <AntDesign name="right" size={14} color="#ff3355" />
                  </TouchableOpacity>
                </View>
                <View style={{ height: 40 }} />
              </ScrollView>
            )}
          </DraggableSheet>
      </ManagedModal>

      {/* MODAL ASIGNAR RUTINA */}
      <ManagedModal visible={modalAsignar} transparent animationType="none">
          <DraggableSheet onClose={() => setModalAsignar(false)}>
            <View style={{ marginBottom: 20 }}>
              <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900' }}>Asignar rutina</Text>
              <Text style={{ color: '#8E8E93', fontSize: 12, marginTop: 2 }}>
                A: {clienteDetalle?.nombre_completo}
              </Text>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {programasCoach.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 40, gap: 12 }}>
                  <AntDesign name="calendar" size={40} color="#8E8E93" />
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '900' }}>Sin rutinas creadas</Text>
                  <Text style={{ color: '#8E8E93', fontSize: 13, textAlign: 'center' }}>
                    Crea una rutina en el tab Rutina para poder asignarla
                  </Text>
                </View>
              ) : (
                programasCoach.map(prog => (
                  <TouchableOpacity
                    key={prog.id}
                    style={[styles.accionBtn, { marginBottom: 10, borderColor: '#ff990033' }]}
                    onPress={() => asignarRutina(prog)}
                    activeOpacity={0.85}
                  >
                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,153,0,0.10)', borderWidth: 1, borderColor: 'rgba(255,153,0,0.4)', justifyContent: 'center', alignItems: 'center' }}>
                      <AntDesign name="calendar" size={18} color="#ff9900" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800' }}>{prog.nombre}</Text>
                      <Text style={{ color: '#8E8E93', fontSize: 11, marginTop: 2 }}>
                        {prog.bloques?.length || 0} bloques · {prog.estado === 'activo' ? 'Activo' : prog.estado}
                      </Text>
                    </View>
                    <AntDesign name="right" size={14} color="#ff9900" />
                  </TouchableOpacity>
                ))
              )}
              <View style={{ height: 40 }} />
            </ScrollView>
          </DraggableSheet>
      </ManagedModal>

      {/* MODAL CHAT CON CLIENTE */}
      <ManagedModal visible={chatAbierto} transparent animationType="none">
        <DraggableSheet onClose={() => { setChatAbierto(false); setChatInterlocutor(null) }} gradientColors={gradColors}>
          <Chat userId={userId} esCoach={true} interlocutorInicial={chatInterlocutor} />
        </DraggableSheet>
      </ManagedModal>

      {/* TOAST CÓDIGO COPIADO */}
      {toast && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute', top: 50, left: 30, right: 30, zIndex: 99999,
            opacity: toastOpacity,
            transform: [
              { translateX: toastAnim },
              { scale: toastOpacity.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
            ],
          }}
        >
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 10,
            paddingHorizontal: 14, paddingVertical: 10, borderRadius: 22,
            backgroundColor: 'rgba(5,5,20,0.94)', borderWidth: 1,
            borderColor: toast.color + '33',
            shadowColor: toast.color, shadowOpacity: 0.25, shadowRadius: 10,
            shadowOffset: { width: 0, height: 5 }, elevation: 15,
          }}>
            <AntDesign name={toast.icon} size={14} color={toast.color} style={{ opacity: 0.9 }} />
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13, letterSpacing: -0.2 }}>
                {toast.msg}
              </Text>
              {toast.sub && (
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '400' }}>
                  | {toast.sub}
                </Text>
              )}
            </View>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: toast.color }} />
          </View>
        </Animated.View>
      )}

      {/* MODAL CÓDIGO GENERADO */}
      <ManagedModal visible={modalCodigo} transparent animationType="fade">
        <View style={styles.codigoOverlay}>
          <View style={styles.codigoSheet}>
            <Text style={styles.codigoTitle}>Código generado</Text>
            <Text style={styles.codigoSub}>Comparte este código con tu cliente</Text>

            {/* Código — toca para copiar */}
            <TouchableOpacity style={styles.codigoBadge} onPress={() => copiarCodigo(nuevoCodigo)} activeOpacity={0.7}>
              <Text style={styles.codigoBadgeText}>{nuevoCodigo}</Text>
              <View style={styles.codigoCopyRow}>
                <AntDesign name="copy" size={12} color="#8E8E93" />
                <Text style={styles.codigoCopyLabel}>Toca para copiar</Text>
              </View>
            </TouchableOpacity>

            {/* Botones de acción */}
            <View style={styles.codigoBtnsRow}>
              <TouchableOpacity style={styles.codigoActionBtn} onPress={() => compartirCodigo(nuevoCodigo)} activeOpacity={0.8}>
                <AntDesign name="share-alt" size={17} color={accentColor} />
                <Text style={styles.codigoActionText}>Compartir</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.codigoActionBtn, styles.codigoActionBtnPrimary]} onPress={() => setModalCodigo(false)} activeOpacity={0.8}>
                <Text style={styles.codigoActionTextPrimary}>Listo</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ManagedModal>
    </LinearGradient>
  )
}

// ══════════════════════════════════════════════════════════════
// MODAL AJUSTES COACH — mismo estilo que cliente
// ══════════════════════════════════════════════════════════════
function AjustesCoachModal({ visible, onClose, userId, perfil, setPerfil, esSuperadmin, onSwitchToAdmin, onSwitchToCliente, onSaved }) {
  const { accentColor, gradColors, setTema: setTemaCtx } = useContext(CoachThemeContext)
  const acRgb = hexToRgb(accentColor)
  const styles = createStyles(accentColor, acRgb) // eslint-disable-line no-shadow
  const [editando, setEditando]             = useState(false)
  const [form, setForm]                     = useState({ nombre: '', apellido: '', peso: '', altura: '', genero: '' })
  const [modalCerrarSesion, setModalCS]     = useState(false)
  const [subiendoFoto, setSubiendoFoto]     = useState(false)
  const editAnim                            = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (visible && perfil) {
      const partes = (perfil.nombre_completo || '').split(' ')
      setForm({
        nombre:       partes[0] || '',
        apellido:     partes.slice(1).join(' ') || '',
        peso:   perfil.peso?.toString() || '',
        altura: perfil.altura?.toString() || '',
        genero: perfil.genero || '',
      })
    }
  }, [visible, perfil])

  function toggleEdit(open) {
    Animated.timing(editAnim, { toValue: open ? 1 : 0, duration: 250, useNativeDriver: false }).start()
    setEditando(open)
  }

  async function seleccionarFoto() {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') { Alert.alert('Permiso denegado', 'Necesitamos acceso a tu galería'); return }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8,
      })
      if (result.canceled) return
      setSubiendoFoto(true)
      const uri  = result.assets[0].uri
      const path = `${userId}/avatar.jpg`
      // Leer como ArrayBuffer
      const resp   = await fetch(uri)
      const blob   = await resp.blob()
      const buffer = await new Promise((res, rej) => {
        const reader = new FileReader()
        reader.onload  = () => res(reader.result)
        reader.onerror = rej
        reader.readAsArrayBuffer(blob)
      })
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, buffer, { contentType: 'image/jpeg', upsert: true, cacheControl: '3600' })
      if (upErr) throw upErr
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
      const newUrl = urlData.publicUrl + '?t=' + Date.now()
      await supabase.from('perfiles').update({ avatar_url: newUrl }).eq('id', userId)
      setPerfil(p => ({ ...p, avatar_url: newUrl }))
    } catch (e) { Alert.alert('Error', e.message) }
    setSubiendoFoto(false)
  }

  async function guardarGradiente(gradId) {
    await supabase.from('perfiles').update({ tema_gradient: gradId }).eq('id', userId)
    setPerfil(p => ({ ...p, tema_gradient: gradId }))
    setTemaCtx(gradId)
  }

  async function guardar() {
    if (!form.nombre.trim()) return
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    const nombreCompleto = [form.nombre.trim(), form.apellido.trim()].filter(Boolean).join(' ')
    const updates = { nombre_completo: nombreCompleto }
    if (form.peso)   updates.peso   = parseFloat(form.peso)
    if (form.altura) updates.altura = parseFloat(form.altura)
    if (form.genero) updates.genero = form.genero
    const { error } = await supabase.from('perfiles').update(updates).eq('id', userId)
    if (error) { Alert.alert('Error', error.message); return }
    setPerfil(p => ({ ...p, ...updates }))
    toggleEdit(false)
    onSaved?.()
  }

  return (
    <>
      <ManagedModal visible={visible} transparent animationType="none">
          <DraggableSheet onClose={onClose} scrollable gradientColors={gradColors} containerStyle={{ borderColor: `rgba(${acRgb},0.25)` }}>
            <View style={styles.ajustesHeader}>
              <Text style={styles.ajustesTitulo}>Ajustes</Text>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

              {/* FOTO + PERFIL */}
              <Text style={styles.ajustesSectionLabel}>PERFIL COACH</Text>
              <View style={styles.ajustesCard}>
                <View style={styles.ajustesPerfilRow}>
                  {/* Avatar con botón de cambiar foto */}
                  <TouchableOpacity onPress={seleccionarFoto} disabled={subiendoFoto} style={{ position: 'relative' }}>
                    {perfil?.avatar_url
                      ? <Image source={{ uri: perfil.avatar_url }} style={{ width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: accentColor }} />
                      : <View style={styles.ajustesAvatar}>
                          <Text style={styles.ajustesAvatarText}>{perfil?.nombre_completo?.[0]?.toUpperCase() || 'C'}</Text>
                        </View>
                    }
                    <View style={{ position: 'absolute', bottom: 0, right: 0, width: 22, height: 22, borderRadius: 11, backgroundColor: accentColor, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#0d0d25' }}>
                      {subiendoFoto
                        ? <ActivityIndicator size={10} color="#fff" />
                        : <AntDesign name="camera" size={11} color="#fff" />
                      }
                    </View>
                  </TouchableOpacity>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ajustesNombre}>{perfil?.nombre_completo || 'Coach'}</Text>
                    <View style={styles.coachBadge}><Text style={styles.coachBadgeText}>ENTRENADOR</Text></View>
                  </View>
                  {!editando
                    ? <TouchableOpacity style={styles.ajustesEditBtn} onPress={() => toggleEdit(true)}>
                        <AntDesign name="edit" size={16} color={accentColor} />
                      </TouchableOpacity>
                    : <TouchableOpacity style={[styles.ajustesEditBtn, { borderColor: '#ff3355' }]} onPress={() => toggleEdit(false)}>
                        <AntDesign name="close" size={14} color="#ff3355" />
                      </TouchableOpacity>
                  }
                </View>
                <Animated.View style={{ opacity: editAnim, transform: [{ translateY: editAnim.interpolate({ inputRange: [0,1], outputRange: [-10,0] }) }] }}>
                  {editando && (
                    <View style={styles.ajustesEditForm}>
                      <View style={{ flexDirection: 'row', gap: 12 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.ajustesEditLabel}>NOMBRE</Text>
                          <TextInput style={styles.ajustesEditInput} value={form.nombre} onChangeText={t => setForm(p => ({...p, nombre: t}))} placeholder="Nombre" placeholderTextColor="#4a4a6a" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.ajustesEditLabel}>APELLIDO</Text>
                          <TextInput style={styles.ajustesEditInput} value={form.apellido} onChangeText={t => setForm(p => ({...p, apellido: t}))} placeholder="Apellido" placeholderTextColor="#4a4a6a" />
                        </View>
                      </View>
                      <Text style={[styles.ajustesEditLabel, { marginTop: 14 }]}>GÉNERO</Text>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        {['Masculino', 'Femenino', 'Otro'].map(g => (
                          <Pressable key={g} style={[styles.ajustesEditChipLg, form.genero === g && { borderColor: accentColor, backgroundColor: `rgba(${acRgb},0.13)` }]} onPress={() => setForm(p => ({...p, genero: g}))}>
                            <Text style={{ color: form.genero === g ? accentColor : '#8E8E93', fontSize: 12, fontWeight: '700' }}>{g}</Text>
                          </Pressable>
                        ))}
                      </View>
                      <Pressable style={[styles.ajustesGuardarBtn, { marginTop: 16 }]} onPress={guardar}>
                        <LinearGradient colors={[accentColor, accentColor]} style={styles.ajustesGuardarGradient}>
                          <AntDesign name="check" size={15} color="#fff" />
                          <Text style={styles.ajustesGuardarText}>Guardar cambios</Text>
                        </LinearGradient>
                      </Pressable>
                    </View>
                  )}
                </Animated.View>
              </View>

              {/* APARIENCIA */}
              <Text style={styles.ajustesSectionLabel}>APARIENCIA</Text>
              <TemaSelect perfilActual={perfil} onSelect={guardarGradiente} />

              {/* CUENTA */}
              <Text style={styles.ajustesSectionLabel}>CUENTA</Text>
              <View style={styles.ajustesCard}>
                <TouchableOpacity style={styles.ajustesRow} onPress={() => setModalCS(true)}>
                  <AntDesign name="logout" size={16} color="#ff3355" />
                  <Text style={[styles.ajustesRowText, { color: '#ff3355' }]}>Cerrar sesión</Text>
                  <AntDesign name="right" size={14} color="#ff3355" />
                </TouchableOpacity>
              </View>

              <Text style={styles.ajustesVersion}>RepForge v1.0.0 · Coach Panel</Text>
            </ScrollView>
          </DraggableSheet>
      </ManagedModal>

      {/* CONFIRMAR CERRAR SESIÓN */}
      <DeleteConfirmModal
        visible={modalCerrarSesion}
        onCancel={() => setModalCS(false)}
        onConfirm={() => supabase.auth.signOut()}
        title="¿Cerrar sesión?"
        subtitle="Tendrás que iniciar sesión nuevamente para acceder a tu cuenta."
      />
    </>
  )
}



// ══════════════════════════════════════════════════════════════
// ADMIN CLIENTES — Gestión con estados agrupados
// ══════════════════════════════════════════════════════════════

function SkeletonBone({ opacity, w, h = 10, r = 6 }) {
  return <Animated.View style={{ width: w, height: h, borderRadius: r, backgroundColor: '#fff', opacity }} />
}

// ─── WaveCard — emerge del fondo con spring (mismo Progreso) ─────
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

// ─── Skeleton con ola escalonada ─────────────────────────────────
function AdminSkeletonCard({ delay = 0 }) {
  const opacity = useRef(new Animated.Value(0.28)).current
  useEffect(() => {
    const t = setTimeout(() => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.08, duration: 700, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.28, duration: 700, useNativeDriver: true }),
        ])
      )
      loop.start()
      return () => loop.stop()
    }, delay)
    return () => clearTimeout(t)
  }, [])
  return (
    <View style={{ padding: 14, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Animated.View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', opacity }} />
        <View style={{ flex: 1, gap: 7 }}>
          <SkeletonBone opacity={opacity} w="55%" h={12} />
          <SkeletonBone opacity={opacity} w="35%" h={8} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        <SkeletonBone opacity={opacity} w="40%" h={28} r={10} />
        <SkeletonBone opacity={opacity} w="30%" h={28} r={10} />
        <SkeletonBone opacity={opacity} w="18%" h={28} r={10} />
      </View>
    </View>
  )
}
function AdminSkeletonCodigo({ delay = 0 }) {
  const opacity = useRef(new Animated.Value(0.28)).current
  useEffect(() => {
    const t = setTimeout(() => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.08, duration: 700, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.28, duration: 700, useNativeDriver: true }),
        ])
      )
      loop.start()
      return () => loop.stop()
    }, delay)
    return () => clearTimeout(t)
  }, [])
  return (
    <View style={{ padding: 14, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flex: 1, gap: 8 }}>
        <SkeletonBone opacity={opacity} w="50%" h={18} />
        <SkeletonBone opacity={opacity} w="30%" h={9} />
      </View>
      <SkeletonBone opacity={opacity} w={34} h={34} r={10} />
    </View>
  )
}

function ClientesScreenSkeleton() {
  const opacity = useRef(new Animated.Value(0.28)).current
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.08, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.28, duration: 700, useNativeDriver: true }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [])
  return (
    <View style={{ flex: 1, paddingTop: 8 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <View style={{ gap: 6 }}>
          <SkeletonBone opacity={opacity} w={120} h={14} />
          <SkeletonBone opacity={opacity} w={160} h={10} />
        </View>
        <Animated.View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', opacity }} />
      </View>
      {/* Stats bento card */}
      <View style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', borderRadius: 20, padding: 18, marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
          {[0, 1, 2].map(i => (
            <View key={i} style={{ alignItems: 'center', gap: 6 }}>
              <SkeletonBone opacity={opacity} w={20} h={20} r={10} />
              <SkeletonBone opacity={opacity} w={28} h={22} r={6} />
              <SkeletonBone opacity={opacity} w={56} h={9} r={4} />
            </View>
          ))}
        </View>
        <View style={{ alignItems: 'center', marginTop: 14 }}>
          <SkeletonBone opacity={opacity} w={130} h={12} r={6} />
        </View>
      </View>
      {/* Section label */}
      <SkeletonBone opacity={opacity} w={80} h={10} r={4} />
      <View style={{ height: 10 }} />
      {/* Client rows */}
      {[...Array(5)].map((_, i) => (
        <AdminSkeletonCard key={i} delay={i * 80} />
      ))}
    </View>
  )
}

function AdminClientesScreen({ userId, codigos = [], onCargar, embedded = false, visible = false }) {
  const { accentColor, gradColors } = useContext(CoachThemeContext)
  const acRgb = hexToRgb(accentColor)
  const styles = createStyles(accentColor, acRgb) // eslint-disable-line no-shadow
  const [clientes, setClientes]             = useState([])
  const [clienteEditando, setClienteEdit]   = useState(null)
  const [modalEditar, setModalEditar]       = useState(false)
  const [modalEliminar, setModalEliminar]   = useState(null)
  const [formEdit, setFormEdit]             = useState({})
  const [guardando, setGuardando]           = useState(false)
  const [filtroEstado, setFiltroEstado]     = useState(null)
  const [codigosLocales, setCodigosLocales] = useState([])
  const [modalAsignarAdmin, setModalAsignarAdmin] = useState(false)
  const [clienteAsignar, setClienteAsignar]       = useState(null)
  const [programasAdmin, setProgramasAdmin]       = useState([])
  const [asignando, setAsignando]                 = useState(false)
  const [subTab, setSubTab]                       = useState('clientes')
  const [busqueda, setBusqueda]                   = useState('')
  const [cargando, setCargando]                   = useState(false)
  const searchAnim  = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (!visible) return
    cargar()
  }, [visible])

  function onBusquedaChange(texto) {
    setBusqueda(texto)
    Animated.spring(searchAnim, {
      toValue: texto.length > 0 ? 1 : 0,
      useNativeDriver: false,
      tension: 80,
      friction: 12,
    }).start()
  }

  const todosLoscodigos = codigos.length > 0 ? codigos : codigosLocales
  const codigosLibres   = todosLoscodigos.filter(c => !c.usado)

  async function cargar() {
    setCargando(true)
    const t0 = Date.now()
    const { data } = await supabase
      .from('perfiles')
      .select('id, nombre_completo, avatar_url, peso, altura, objetivo, nivel_experiencia, estado_cliente, ultima_sesion, creado_en')
      .eq('coach_id', userId)
      .order('nombre_completo')
    setClientes(data || [])
    if (codigos.length === 0) {
      const { data: cod } = await supabase
        .from('codigos_invitacion')
        .select('*, cliente:cliente_id(nombre_completo, avatar_url)')
        .eq('coach_id', userId)
        .order('creado_en', { ascending: false })
      setCodigosLocales(cod || [])
    }
    const elapsed = Date.now() - t0
    if (elapsed < 800) await new Promise(r => setTimeout(r, 800 - elapsed))
    setCargando(false)
    onCargar?.()
  }

  function abrirEditar(cliente) {
    setClienteEdit(cliente)
    setFormEdit({
      nombre_completo:   cliente.nombre_completo || '',
      objetivo:          cliente.objetivo || '',
      nivel_experiencia: cliente.nivel_experiencia || '',
      peso:              cliente.peso?.toString() || '',
      altura:            cliente.altura?.toString() || '',
      estado_cliente:    cliente.estado_cliente || 'activo',
    })
    setModalEditar(true)
  }

  async function abrirAsignarAdmin(cliente) {
    setClienteAsignar(cliente)
    const { cargarPrograma } = require('../../lib/storage')
    const data = await cargarPrograma(userId)
    setProgramasAdmin(data?.programas || [])
    setModalAsignarAdmin(true)
  }

  async function asignarRutinaAdmin(programa) {
    if (!clienteAsignar) return
    setAsignando(true)
    try {
      const { cargarPrograma, guardarYSincronizar } = require('../../lib/storage')
      const dataCliente = await cargarPrograma(clienteAsignar.id)
      const programasCopia = [...(dataCliente?.programas || [])]
      const diasCopia = { ...(dataCliente?.dias || {}) }
      const nuevoId = 'prog_' + Date.now()
      const copiaProg = {
        ...programa,
        id: nuevoId,
        nombre: programa.nombre,
        estado: 'activo',
        asignadoPorCoach: userId,
        fechaInicio: new Date().toISOString().split('T')[0],
      }
      // Desactivar programas activos previos
      programasCopia.forEach(p => { if (p.estado === 'activo') p.estado = 'completado' })
      programasCopia.push(copiaProg)
      // Copiar días por bloque
      if (programa.bloques) {
        programa.bloques.forEach(bloque => {
          const keyOrigen  = `dias_${bloque.id}`
          const keyDestino = `dias_${bloque.id}_${nuevoId}`
          if (programa.dias?.[keyOrigen]) diasCopia[keyDestino] = programa.dias[keyOrigen]
        })
      }
      await guardarYSincronizar(clienteAsignar.id, { programas: programasCopia, dias: diasCopia })
      setModalAsignarAdmin(false)
      Alert.alert('✓ Asignado', `Rutina "${programa.nombre}" asignada a ${clienteAsignar.nombre_completo}`)
    } catch(e) { Alert.alert('Error', e.message) }
    setAsignando(false)
  }

  async function guardarEdicion() {
    if (!clienteEditando) return
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    setGuardando(true)
    const updates = {
      nombre_completo:   formEdit.nombre_completo,
      objetivo:          formEdit.objetivo || null,
      nivel_experiencia: formEdit.nivel_experiencia || null,
      estado_cliente:    formEdit.estado_cliente,
    }
    if (formEdit.peso)   updates.peso   = parseFloat(formEdit.peso)
    if (formEdit.altura) updates.altura = parseFloat(formEdit.altura)
    const { error } = await supabase.from('perfiles').update(updates).eq('id', clienteEditando.id)
    if (error) { Alert.alert('Error', error.message) }
    else { setModalEditar(false); cargar() }
    setGuardando(false)
  }

  async function eliminarCliente() {
    if (!modalEliminar) return
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    await supabase.from('perfiles').update({ coach_id: null, estado_cliente: null }).eq('id', modalEliminar.id)
    setModalEliminar(null)
    cargar()
  }

  async function eliminarCodigo(id) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    await supabase.from('codigos_invitacion').delete().eq('id', id)
    cargar()
  }

  async function compartirCodigo(codigo) {
    const { Share } = require('react-native')
    await Share.share({ message: `¡Únete a mi equipo en RepForge! 💪\nUsa el código: ${codigo}` })
  }

  // Agrupar por estado
  const grupos = ESTADOS_CLIENTE.map(estado => ({
    ...estado,
    clientes: clientes.filter(c => (c.estado_cliente || 'activo') === estado.key)
  })).filter(g => !filtroEstado || g.key === filtroEstado)

  const totalPorEstado = ESTADOS_CLIENTE.reduce((acc, e) => {
    acc[e.key] = clientes.filter(c => (c.estado_cliente || 'activo') === e.key).length
    return acc
  }, {})

  return (
    <LinearGradient colors={gradColors} style={{ flex: 1 }}>

      {/* Header fijo */}
      <View style={[styles.iniContainer, { paddingBottom: 0, paddingTop: 16 }]}>

        {/* Sub-tabs */}
        <View style={styles.adminSubTabRow}>
          <TouchableOpacity
            style={[styles.adminSubTab, subTab === 'clientes' && styles.adminSubTabActive]}
            onPress={() => setSubTab('clientes')}
            activeOpacity={0.8}
          >
            <AntDesign name="team" size={14} color={subTab === 'clientes' ? accentColor : '#8E8E93'} />
            <Text style={[styles.adminSubTabText, subTab === 'clientes' && styles.adminSubTabTextActive]}>
              Clientes {clientes.length > 0 ? `(${clientes.length})` : ''}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.adminSubTab, subTab === 'codigos' && styles.adminSubTabActive]}
            onPress={() => setSubTab('codigos')}
            activeOpacity={0.8}
          >
            <AntDesign name="key" size={14} color={subTab === 'codigos' ? '#ff9900' : '#8E8E93'} />
            <Text style={[styles.adminSubTabText, subTab === 'codigos' && { color: '#ff9900' }]}>
              Códigos {todosLoscodigos.length > 0 ? `(${todosLoscodigos.length})` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── TAB CLIENTES ── */}
      {subTab === 'clientes' && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.iniContainer, { paddingTop: 0 }]}
          showsVerticalScrollIndicator={false}
          contentInset={{ bottom: 40 }}
          scrollIndicatorInsets={{ bottom: 40 }}
        >
          {cargando ? (
            <View style={{ paddingTop: 16 }}>
              {[0,1,2,3].map(i => <AdminSkeletonCard key={i} delay={i * 120} />)}
            </View>
          ) : (<>
          {/* Buscador */}
          <Animated.View style={[
            styles.adminSearchWrap,
            { borderColor: searchAnim.interpolate({ inputRange: [0, 1], outputRange: ['rgba(255,255,255,0.08)', `rgba(${acRgb},0.40)`] }) }
          ]}>
            <AntDesign name="search" size={15} color="#8E8E93" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.adminSearchInput}
              placeholder="Buscar cliente..."
              placeholderTextColor="#4a4a6a"
              value={busqueda}
              onChangeText={onBusquedaChange}
              autoCorrect={false}
              autoCapitalize="none"
              clearButtonMode="while-editing"
            />
          </Animated.View>

          {/* Filtros de estado */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 2 }}>
              <TouchableOpacity
                style={[styles.filtroChip, !filtroEstado && { borderColor: accentColor, backgroundColor: `rgba(${acRgb},0.13)` }]}
                onPress={() => setFiltroEstado(null)}
              >
                <Text style={{ color: !filtroEstado ? accentColor : '#8E8E93', fontSize: 12, fontWeight: '800' }}>
                  Todos ({clientes.length})
                </Text>
              </TouchableOpacity>
              {ESTADOS_CLIENTE.map(e => (
                <TouchableOpacity
                  key={e.key}
                  style={[styles.filtroChip, filtroEstado === e.key && { borderColor: e.color, backgroundColor: e.bg }]}
                  onPress={() => setFiltroEstado(filtroEstado === e.key ? null : e.key)}
                >
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: e.color }} />
                  <Text style={{ color: filtroEstado === e.key ? e.color : '#8E8E93', fontSize: 12, fontWeight: '800' }}>
                    {e.label} {totalPorEstado[e.key] > 0 ? `(${totalPorEstado[e.key]})` : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Grupos por estado */}
          {grupos.map(grupo => {
            const clientesFiltrados = grupo.clientes.filter(c =>
              !busqueda || c.nombre_completo?.toLowerCase().includes(busqueda.toLowerCase())
            )
            return clientesFiltrados.length === 0 ? null : (
            <View key={grupo.key} style={{ marginBottom: 24 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: grupo.color }} />
                <Text style={{ color: grupo.color, fontSize: 11, fontWeight: '900', letterSpacing: 2 }}>
                  {grupo.label.toUpperCase()} · {grupo.clientes.length}
                </Text>
                <View style={{ flex: 1, height: 1, backgroundColor: grupo.color + '33' }} />
              </View>
              {clientesFiltrados.map((cliente, idx) => {
                const codVinculado = todosLoscodigos.find(c => c.cliente_id === cliente.id)
                return (
                <WaveCard key={cliente.id} delay={idx * 70}>
                <View style={[styles.clienteCard, { borderLeftWidth: 3, borderLeftColor: grupo.color, marginBottom: 10, flexDirection: 'column', gap: 10 }]}>
                  {/* Fila superior: avatar + info */}
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Avatar nombre={cliente.nombre_completo} foto={cliente.avatar_url} size={40} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800', marginBottom: 3 }}>
                        {cliente.nombre_completo || 'Sin nombre'}
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 5, flexWrap: 'wrap' }}>
                        {cliente.objetivo && (
                          <View style={styles.clienteTag}>
                            <Text style={styles.clienteTagText}>{cliente.objetivo}</Text>
                          </View>
                        )}
                        {cliente.peso && (
                          <View style={[styles.clienteTag, { borderColor: '#ff660033', backgroundColor: '#ff660011' }]}>
                            <Text style={[styles.clienteTagText, { color: '#ff6600' }]}>{cliente.peso} kg</Text>
                          </View>
                        )}
                        {codVinculado && (
                          <View style={[styles.clienteTag, { borderColor: 'rgba(0,204,68,0.25)', backgroundColor: 'rgba(0,204,68,0.07)' }]}>
                            <Text style={[styles.clienteTagText, { color: '#00cc44', letterSpacing: 1.5 }]}>{codVinculado.codigo}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                  {/* Fila inferior: botones horizontales */}
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      style={styles.clienteAccionBtn}
                      onPress={() => abrirAsignarAdmin(cliente)}
                    >
                      <AntDesign name="calendar" size={13} color="#ff9900" />
                      <Text style={[styles.clienteAccionText, { color: '#ff9900' }]}>Asignar rutina</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.clienteAccionBtn}
                      onPress={() => abrirEditar(cliente)}
                    >
                      <AntDesign name="edit" size={13} color={accentColor} />
                      <Text style={[styles.clienteAccionText, { color: accentColor }]}>Editar</Text>
                    </TouchableOpacity>
                    <Pressable
                      onPress={() => setModalEliminar(cliente)}
                      style={({ pressed }) => [styles.clienteAccionBtn, { borderColor: 'rgba(255,51,85,0.25)', backgroundColor: 'rgba(255,51,85,0.06)' }, pressed && { opacity: 0.6 }]}
                    >
                      <AntDesign name="delete" size={13} color="#ff3355" />
                    </Pressable>
                  </View>
                </View>
                </WaveCard>
              )})}
            </View>
          )})}

          {busqueda.length > 0 && grupos.every(g => g.clientes.filter(c => c.nombre_completo?.toLowerCase().includes(busqueda.toLowerCase())).length === 0) && (
            <View style={{ alignItems: 'center', paddingVertical: 40, gap: 8 }}>
              <AntDesign name="search" size={36} color="#8E8E93" />
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>Sin resultados</Text>
              <Text style={{ color: '#8E8E93', fontSize: 13 }}>No hay clientes con "{busqueda}"</Text>
            </View>
          )}

          {clientes.length === 0 && !busqueda && (
            <View style={{ alignItems: 'center', paddingVertical: 60, gap: 12 }}>
              <AntDesign name="team" size={48} color="#8E8E93" />
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900' }}>Sin clientes</Text>
            </View>
          )}
          </>)}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ── TAB CÓDIGOS ── */}
      {subTab === 'codigos' && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.iniContainer, { paddingTop: 0 }]}
          showsVerticalScrollIndicator={false}
          contentInset={{ bottom: 40 }}
          scrollIndicatorInsets={{ bottom: 40 }}
        >
          {cargando ? (
            <View style={{ paddingTop: 16 }}>
              {[0,1,2,3].map(i => <AdminSkeletonCodigo key={i} delay={i * 120} />)}
            </View>
          ) : codigosLibres.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 60, gap: 12 }}>
              <AntDesign name="key" size={48} color="#8E8E93" />
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900' }}>Sin códigos libres</Text>
              <Text style={{ color: '#8E8E93', fontSize: 13, textAlign: 'center' }}>
                Genera un código desde el panel principal para invitar clientes
              </Text>
            </View>
          ) : codigosLibres.map((cod, idx) => (
              <WaveCard key={cod.id} delay={idx * 70}>
              <View style={[styles.clienteCard, { marginBottom: 10 }]}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: 4 }}>{cod.codigo}</Text>
                    <View style={{ borderWidth: 1, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.04)' }}>
                      <Text style={{ color: '#8E8E93', fontSize: 9, fontWeight: '900' }}>LIBRE</Text>
                    </View>
                  </View>
                  <Text style={{ color: '#8E8E93', fontSize: 11 }}>
                    {new Date(cod.creado_en).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: `rgba(${acRgb},0.10)`, borderWidth: 1, borderColor: `rgba(${acRgb},0.35)`, justifyContent: 'center', alignItems: 'center' }}
                    onPress={() => compartirCodigo(cod.codigo)}
                  >
                    <AntDesign name="export" size={15} color={accentColor} />
                  </TouchableOpacity>
                  <Pressable
                    onPress={() => eliminarCodigo(cod.id)}
                    style={({ pressed }) => [{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,59,48,0.15)', alignItems: 'center', justifyContent: 'center' }, pressed && { opacity: 0.7, transform: [{ scale: 0.82 }] }]}
                  >
                    <AntDesign name="delete" size={15} color="#ff3355" />
                  </Pressable>
                </View>
              </View>
              </WaveCard>
            )
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}


      {/* MODAL ASIGNAR RUTINA DESDE ADMIN */}
      <ManagedModal visible={modalAsignarAdmin} transparent animationType="none">
          <DraggableSheet onClose={() => setModalAsignarAdmin(false)}>
            <View style={{ marginBottom: 20 }}>
              <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900' }}>Asignar rutina</Text>
              <Text style={{ color: '#8E8E93', fontSize: 12, marginTop: 2 }}>
                Para: {clienteAsignar?.nombre_completo}
              </Text>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {programasAdmin.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 40, gap: 12 }}>
                  <AntDesign name="calendar" size={40} color="#8E8E93" />
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '900' }}>Sin rutinas creadas</Text>
                  <Text style={{ color: '#8E8E93', fontSize: 13, textAlign: 'center' }}>
                    Crea una rutina en el tab Rutina para asignarla
                  </Text>
                </View>
              ) : (
                programasAdmin.map(prog => (
                  <TouchableOpacity
                    key={prog.id}
                    style={[styles.accionBtn, { marginBottom: 10, borderColor: '#ff990033', opacity: asignando ? 0.6 : 1 }]}
                    onPress={() => asignarRutinaAdmin(prog)}
                    disabled={asignando}
                    activeOpacity={0.85}
                  >
                    <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(255,153,0,0.10)', borderWidth: 1.5, borderColor: 'rgba(255,153,0,0.4)', justifyContent: 'center', alignItems: 'center' }}>
                      <AntDesign name="calendar" size={20} color="#ff9900" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800' }}>{prog.nombre}</Text>
                      <Text style={{ color: '#8E8E93', fontSize: 11, marginTop: 2 }}>
                        {prog.bloques?.length || 0} bloques · {prog.estado === 'activo' ? '🟢 Activo' : prog.estado}
                      </Text>
                    </View>
                    {asignando ? (
                      <ActivityIndicator size={16} color="#ff9900" />
                    ) : (
                      <AntDesign name="right" size={14} color="#ff9900" />
                    )}
                  </TouchableOpacity>
                ))
              )}
              <View style={{ height: 40 }} />
            </ScrollView>
          </DraggableSheet>
      </ManagedModal>

      {/* MODAL EDITAR CLIENTE */}
      <ManagedModal visible={modalEditar} transparent animationType="none">
          <DraggableSheet onClose={() => setModalEditar(false)}>
            <View style={styles.ajustesHeader}>
              <Text style={styles.ajustesTitulo}>Editar cliente</Text>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              <Text style={styles.ajustesSectionLabel}>NOMBRE</Text>
              <TextInput
                style={styles.ajustesEditInput}
                value={formEdit.nombre_completo}
                onChangeText={t => setFormEdit(p => ({...p, nombre_completo: t}))}
                placeholder="Nombre completo"
                placeholderTextColor="#4a4a6a"
              />

              <Text style={[styles.ajustesSectionLabel, { marginTop: 16 }]}>ESTADO</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {ESTADOS_CLIENTE.map(e => (
                  <TouchableOpacity
                    key={e.key}
                    style={[styles.filtroChip, formEdit.estado_cliente === e.key && { borderColor: e.color, backgroundColor: e.bg }]}
                    onPress={() => setFormEdit(p => ({...p, estado_cliente: e.key}))}
                  >
                    <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: e.color }} />
                    <Text style={{ color: formEdit.estado_cliente === e.key ? e.color : '#8E8E93', fontSize: 12, fontWeight: '700' }}>
                      {e.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.ajustesSectionLabel}>OBJETIVO</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {[
                  { key: 'hipertrofia',   label: 'Hipertrofia' },
                  { key: 'fuerza',        label: 'Fuerza' },
                  { key: 'definicion',    label: 'Definición' },
                  { key: 'recomposicion', label: 'Recomposición' },
                  { key: 'resistencia',   label: 'Resistencia' },
                  { key: 'competencia',   label: 'Competencia' },
                ].map(o => (
                  <TouchableOpacity
                    key={o.key}
                    style={[styles.filtroChip, formEdit.objetivo === o.key && { borderColor: '#9933ff', backgroundColor: '#9933ff22' }]}
                    onPress={() => setFormEdit(p => ({...p, objetivo: o.key}))}
                  >
                    <Text style={{ color: formEdit.objetivo === o.key ? '#9933ff' : '#8E8E93', fontSize: 12, fontWeight: '700' }}>{o.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ajustesSectionLabel}>PESO (kg)</Text>
                  <TextInput
                    style={styles.ajustesEditInput}
                    value={formEdit.peso}
                    onChangeText={t => setFormEdit(p => ({...p, peso: t}))}
                    placeholder="70"
                    placeholderTextColor="#4a4a6a"
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ajustesSectionLabel}>ALTURA (cm)</Text>
                  <TextInput
                    style={styles.ajustesEditInput}
                    value={formEdit.altura}
                    onChangeText={t => setFormEdit(p => ({...p, altura: t}))}
                    placeholder="170"
                    placeholderTextColor="#4a4a6a"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <Pressable
                style={({ pressed }) => [{ borderRadius: 14, overflow: 'hidden', opacity: pressed ? 0.85 : 1 }]}
                onPress={guardarEdicion}
                disabled={guardando}
              >
                <LinearGradient colors={[accentColor, accentColor]} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 }}>
                  <AntDesign name="check" size={16} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: '900', fontSize: 15 }}>{guardando ? 'Guardando...' : 'Guardar cambios'}</Text>
                </LinearGradient>
              </Pressable>
            </ScrollView>
          </DraggableSheet>
      </ManagedModal>

      {/* MODAL ELIMINAR */}
      <DeleteConfirmModal
        visible={!!modalEliminar}
        onCancel={() => setModalEliminar(null)}
        onConfirm={eliminarCliente}
        title="Desvincular cliente"
        subtitle={`¿Desvincular a ${modalEliminar?.nombre_completo}?`}
        warning="Perderá acceso a tu comunidad."
      />
    </LinearGradient>
  )
}

// ══════════════════════════════════════════════════════════════
// STACK RUTINAS COACH (igual que cliente)
// ══════════════════════════════════════════════════════════════
function RutinasCoachTab() {
  const { gradColors } = useContext(CoachThemeContext)

  rutinasNavigation.reset = () => {
    if (!rutinasNavigation.ref?.canGoBack?.()) return
    
    // Navegamos suavemente a la raíz
    rutinasNavigation.ref?.navigate('ListaProgramas', { isDoubleTap: true })
  }

  return (
    <LinearGradient colors={gradColors} style={{ flex: 1 }}>
      <RutinaStack.Navigator
        screenOptions={{ headerShown: false, cardStyle: { backgroundColor: 'transparent' }, gestureEnabled: false }}
      >
        <RutinaStack.Screen
          name="ListaProgramas"
          component={ListaProgramas}
          initialParams={{ esCoach: true }}
          options={{ animationEnabled: false }}
          listeners={({ navigation }) => ({
            focus: () => {
              rutinasNavigation.ref = navigation
            },
          })}
        />
        <RutinaStack.Screen name="ListaBloques" component={ListaBloques}
          options={{}}
          listeners={({ navigation }) => ({ focus: () => { rutinasNavigation.ref = navigation } })} />
        <RutinaStack.Screen name="DiasBloque" component={DiasBloque}
          options={{}}
          listeners={({ navigation }) => ({ focus: () => { rutinasNavigation.ref = navigation } })} />
        <RutinaStack.Screen name="Ejercicios" component={EjerciciosDelDia}
          options={({ route }) => ({
            animationEnabled: !route.params?.noAnim,
          })}
          listeners={({ navigation, route }) => ({
            focus: () => {
              rutinasNavigation.ref = navigation
              if (route.params?.noAnim) {
                navigation.setParams({ noAnim: false })
              }
            },
          })} />
      </RutinaStack.Navigator>
    </LinearGradient>
  )
}

// ══════════════════════════════════════════════════════════════
// COACH DASHBOARD ROOT — Tab bar igual al cliente
// ══════════════════════════════════════════════════════════════
export default function CoachDashboard({ userId, onSwitchToCliente, esSuperadmin, onSwitchToAdmin }) {
  const { rutinasNavigation } = require('../../lib/rutinasRef')
  const tabSwitcherRef = useRef(null)
  const [tema, setTema] = useState('midnight')

  useEffect(() => {
    supabase.from('perfiles').select('tema_gradient').eq('id', userId).single()
      .then(({ data }) => { if (data?.tema_gradient) setTema(data.tema_gradient) })
  }, [userId])

  useEffect(() => {
    // Definir goToTab con retry automático si el ref no está listo
    rutinasNavigation.goToTab = (i) => {
      const trySwitch = (attempts = 0) => {
        if (tabSwitcherRef.current) {
          tabSwitcherRef.current(i)
        } else if (attempts < 5) {
          setTimeout(() => trySwitch(attempts + 1), 50)
        }
      }
      trySwitch()
    }

    // Verificar periódicamente si el ref se asigna
    const checkRefInterval = setInterval(() => {
      if (tabSwitcherRef.current) {
        clearInterval(checkRefInterval)
      }
    }, 100)

    // Limpiar el interval después de 2 segundos
    setTimeout(() => clearInterval(checkRefInterval), 2000)

    // No limpiar la función al desmontar para que persista
    return () => {
      clearInterval(checkRefInterval)
    }
  }, [])

  const gradColors  = getGradColors(tema)
  const accentColor = getAccentColor(tema)

  // Memoizar tabs para que un cambio de tema no remonte los componentes
  // (los componentes leen accentColor/gradColors por contexto, no como props)
  const tabs = useMemo(() => [
    { name: 'Inicio',    icon: 'home',     component: () => <InicioCoachScreen userId={userId} vistaOverrideFn={onSwitchToCliente} esSuperadmin={esSuperadmin} onSwitchToAdmin={onSwitchToAdmin} /> },
    { name: 'Clientes',  icon: 'team',     component: () => <ClientesScreen userId={userId} esSuperadmin={esSuperadmin} onSwitchToAdmin={onSwitchToAdmin} onSwitchToCliente={onSwitchToCliente} /> },
    { name: 'Comunidad', icon: 'message',  component: () => <FeatureGate flagId="comunidad" bypass={esSuperadmin}><Comunidad userId={userId} esCoach={true} /></FeatureGate> },
    { name: 'Rutina',    icon: 'calendar', component: RutinasCoachTab, onReselect: () => { rutinasNavigation.reset?.() } },
    { name: 'Progreso',  icon: 'bars',     component: () => <FeatureGate flagId="progreso" bypass={esSuperadmin}><Progreso userId={userId} /></FeatureGate> },
  ], [userId, onSwitchToCliente, esSuperadmin, onSwitchToAdmin])

  return (
    <CoachThemeContext.Provider value={{ gradColors, accentColor, setTema }}>
      <LinearGradient colors={gradColors} style={{ flex: 1 }}>
        <PagerTabs
          switcherRef={tabSwitcherRef}
          accentColor={accentColor}
          tabs={tabs}
        />
      </LinearGradient>
    </CoachThemeContext.Provider>
  )
}

function createStyles(accent = '#4488ff', rgb = '68,136,255') {
  return StyleSheet.create({
  // ── Tab bar (idéntico al cliente) ─────────────────────────────
  tabBar: {
    position: 'absolute', bottom: 20, left: 16, right: 16,
    height: 72, borderRadius: 36, backgroundColor: 'rgba(15,20,45,0.85)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
    elevation: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5, shadowRadius: 20, paddingHorizontal: 6,
  },
  tabItemWrap: { alignItems: 'center', justifyContent: 'center', width: '95%', paddingVertical: 8, borderRadius: 18, overflow: 'hidden', backgroundColor: 'transparent' },
  tabItemWrapActive: { backgroundColor: `rgba(${rgb},0.15)`, borderRadius: 18 },
  tabLabel: { fontSize: 9.5, fontWeight: '700', marginTop: 3, textAlign: 'center' },

  // ── Inicio (igual al cliente) ─────────────────────────────────
  iniContainer: { padding: 20, paddingTop: 56, paddingBottom: 120 },
  iniHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  rfRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 4 },
  rfR: { fontSize: 24, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  rfF: { fontSize: 24, fontWeight: '900', color: accent, letterSpacing: 1 },
  iniProgramaNombre: { fontSize: 11, color: '#8E8E93', letterSpacing: 1, fontWeight: '700' },
  iniBellBtn: { padding: 4, position: 'relative' },
  iniPerfilCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 20, padding: 14, marginBottom: 16 },
  iniPerfilAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: `rgba(${rgb},0.1)`, borderWidth: 1, borderColor: `rgba(${rgb},0.3)`, justifyContent: 'center', alignItems: 'center' },
  iniPerfilAvatarText: { color: accent, fontSize: 17, fontWeight: '900' },
  iniPerfilNombre: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  iniPerfilSubRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  iniPerfilSub: { color: accent, fontSize: 11, fontWeight: '700', backgroundColor: `rgba(${rgb},0.08)`, borderWidth: 1, borderColor: `rgba(${rgb},0.2)`, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 3, overflow: 'hidden' },
  iniWeekRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', borderRadius: 24, padding: 16, marginBottom: 16 },
  iniDayCol: { alignItems: 'center', gap: 8 },
  iniDayLabel: { fontSize: 11, color: '#8E8E93', fontWeight: '700', marginBottom: 4 },
  iniDayLabelHoy: { color: '#fff' },
  iniDayDot: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
  iniDayDotDone: { backgroundColor: accent, borderColor: accent },
  iniDayDotHoy: { borderColor: accent, borderWidth: 1.5, backgroundColor: `rgba(${rgb},0.1)` },
  iniDayDotFuturo: { backgroundColor: 'rgba(255,255,255,0.01)', borderColor: 'rgba(255,255,255,0.05)', borderStyle: 'dashed' },
  iniDayDotDescanso: { backgroundColor: 'rgba(255,255,255,0.01)', borderColor: 'rgba(255,255,255,0.02)' },
  iniDayDotCenter: { width: 8, height: 8, borderRadius: 4, backgroundColor: accent },
  iniCardHoy: { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 24, padding: 20, marginBottom: 16 },
  iniCardHoyTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  iniCardHoyLabel: { fontSize: 10, color: '#8E8E93', letterSpacing: 2, fontWeight: '800', marginBottom: 6 },
  iniCardHoyTitulo: { fontSize: 24, fontWeight: '900', color: '#fff', marginBottom: 4, letterSpacing: -0.5 },
  iniCardHoySub: { fontSize: 13, color: '#8E8E93', fontWeight: '500' },
  iniCardHoyBadge: { backgroundColor: `rgba(${rgb},0.1)`, borderWidth: 1, borderColor: `rgba(${rgb},0.3)`, borderRadius: 14, padding: 10, alignItems: 'center', minWidth: 56 },
  iniCardHoyBadgeNum: { fontSize: 22, fontWeight: '900', color: accent, letterSpacing: -1.0 },
  iniCardHoyBadgeLabel: { fontSize: 9, color: '#8E8E93', marginTop: 2, fontWeight: '800' },
  iniStartBtn: { borderRadius: 16, overflow: 'hidden', marginTop: 16 },
  iniStartGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, gap: 10 },
  iniStartText: { color: '#fff', fontWeight: '800', fontSize: 14, letterSpacing: 1.5 },
  iniSection: { marginBottom: 16 },
  iniSectionLabel: { fontSize: 10, color: '#8E8E93', letterSpacing: 3, fontWeight: '800', marginBottom: 12, textTransform: 'uppercase' },
  iniSemanaCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 24, padding: 20 },

  // ── Accesos rápidos ───────────────────────────────────────────
  iniAccesoRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  iniAccesoBtn: { flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 20, padding: 18, alignItems: 'center', gap: 6 },
  iniAccesoBtnActive: { backgroundColor: `rgba(${rgb},0.08)`, borderColor: `rgba(${rgb},0.25)` },
  iniAccesoIconWrap: { position: 'relative' },
  iniAccesoBadge: { position: 'absolute', top: -6, right: -8, backgroundColor: accent, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  iniAccesoBadgeText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  iniAccesoLabel: { color: '#8E8E93', fontSize: 12, fontWeight: '700' },
  iniAccesoLabelActive: { color: accent },
  iniAccesoSub: { color: '#8E8E93', fontSize: 10, fontWeight: '500' },

  // ── Coach badges ──────────────────────────────────────────────
  coachBadge: { backgroundColor: `rgba(${rgb},0.13)`, borderWidth: 1, borderColor: accent, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, marginLeft: 6, alignSelf: 'center' },
  coachBadgeText: { color: accent, fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },

  // ── Clientes ─────────────────────────────────────────────────
  fusionCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 20, padding: 18, marginBottom: 20 },
  clienteCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 18, padding: 16, marginBottom: 10 },
  clienteCardMini: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 14 },
  clienteCardMiniInfo: { flex: 1, marginLeft: 12 },
  clienteCardMiniNombre: { color: '#fff', fontSize: 14, fontWeight: '800' },
  clienteCardMiniActRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  clienteCardMiniActLabel: { fontSize: 10, fontWeight: '700' },
  clienteCardMiniEstado: { fontSize: 10, fontWeight: '700' },
  clienteCardMiniVerTodos: { color: '#8E8E93', fontSize: 12, textAlign: 'center', marginTop: 8 },
  clienteTag: { backgroundColor: `rgba(${rgb},0.07)`, borderWidth: 1, borderColor: `rgba(${rgb},0.2)`, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  clienteTagText: { color: accent, fontSize: 10, fontWeight: '700' },
  codigoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  codigoCodigo: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 4 },
  filtroChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.04)' },
  codigoAccionBtn: { width: 34, height: 34, borderRadius: 9, borderWidth: 1, borderColor: `rgba(${rgb},0.3)`, backgroundColor: `rgba(${rgb},0.08)`, justifyContent: 'center', alignItems: 'center' },
  accionBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 16 },
  accionBtnText: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '700' },
  // ── Modales ───────────────────────────────────────────────────
  detalleHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
  detalleNombre: { color: '#fff', fontSize: 18, fontWeight: '900' },
  detalleSub: { color: '#8E8E93', fontSize: 12, marginTop: 3 },
  adminModalHeader: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)', flexDirection: 'row', alignItems: 'center', gap: 10 },
  adminModalTitle: { color: '#fff', fontSize: 16, fontWeight: '900', flex: 1 },

  // ── Ajustes (idéntico al cliente) ─────────────────────────────
  ajustesOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  ajustesContainer: { backgroundColor: '#0d0d25', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 20, paddingBottom: 40, maxHeight: '90%' },
  ajustesHandle: { width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  ajustesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: `rgba(${rgb},0.15)`, marginBottom: 20 },
  ajustesTitulo: { fontSize: 20, fontWeight: '900', color: '#fff' },
  ajustesCerrarBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', justifyContent: 'center', alignItems: 'center' },
  ajustesSectionLabel: { color: `rgba(${rgb},0.5)`, fontSize: 10, fontWeight: '800', letterSpacing: 2, marginBottom: 8, marginTop: 4 },
  ajustesCard: { backgroundColor: `rgba(${rgb},0.06)`, borderWidth: 1, borderColor: `rgba(${rgb},0.14)`, borderRadius: 20, marginBottom: 20, overflow: 'hidden' },
  ajustesPerfilRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  ajustesAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: `rgba(${rgb},0.12)`, borderWidth: 2, borderColor: `rgba(${rgb},0.4)`, justifyContent: 'center', alignItems: 'center' },
  ajustesAvatarText: { color: accent, fontSize: 20, fontWeight: '900' },
  ajustesNombre: { color: '#fff', fontSize: 16, fontWeight: '800', marginBottom: 2 },
  ajustesEditBtn: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, borderColor: `rgba(${rgb},0.2)`, backgroundColor: `rgba(${rgb},0.08)`, justifyContent: 'center', alignItems: 'center' },
  ajustesEditForm: { borderTopWidth: 1, borderTopColor: `rgba(${rgb},0.12)`, padding: 20, gap: 14, backgroundColor: `rgba(${rgb},0.04)` },
  ajustesEditRow: { flexDirection: 'row', gap: 12 },
  ajustesEditLabel: { color: `rgba(${rgb},0.5)`, fontSize: 9, fontWeight: '900', letterSpacing: 2, marginBottom: 8, textTransform: 'uppercase' },
  ajustesEditInput: { backgroundColor: `rgba(${rgb},0.07)`, borderWidth: 1.5, borderColor: `rgba(${rgb},0.2)`, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, color: '#fff', fontSize: 15, fontWeight: '600' },
  ajustesEditChipLg: { paddingHorizontal: 14, paddingVertical: 11, borderRadius: 12, borderWidth: 1.5, borderColor: `rgba(${rgb},0.15)`, backgroundColor: `rgba(${rgb},0.05)` },
  ajustesGuardarBtn: { borderRadius: 16, overflow: 'hidden' },
  ajustesGuardarGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, paddingHorizontal: 24 },
  ajustesGuardarText: { color: '#fff', fontWeight: '900', fontSize: 15, letterSpacing: 0.5 },
  ajustesRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  ajustesRowText: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '600' },
  ajustesVersion: { color: `rgba(${rgb},0.35)`, fontSize: 11, textAlign: 'center', marginTop: 8, marginBottom: 20 },

  // ── Admin buscador ────────────────────────────────────────────
  adminSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  adminSearchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    padding: 0,
  },
  clienteAccionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  clienteAccionText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // ── Admin sub-tabs ─────────────────────────────────────────────
  adminSubTabRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 4,
    marginBottom: 22,
    gap: 4,
  },
  adminSubTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 10,
    borderRadius: 12,
  },
  adminSubTabActive: {
    backgroundColor: `rgba(${rgb},0.12)`,
    borderWidth: 1,
    borderColor: `rgba(${rgb},0.25)`,
  },
  adminSubTabText: {
    color: '#8E8E93',
    fontSize: 13,
    fontWeight: '700',
  },
  adminSubTabTextActive: {
    color: accent,
  },

  // ── Modal Código Generado ──────────────────────────────────────
  codigoOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,2,15,0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  codigoSheet: {
    width: '100%',
    backgroundColor: 'rgba(18,20,45,0.97)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
  },
  codigoTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.2,
    marginBottom: 6,
  },
  codigoSub: {
    color: '#8E8E93',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 24,
  },
  codigoBadge: {
    width: '100%',
    backgroundColor: `rgba(${rgb},0.08)`,
    borderWidth: 1.5,
    borderColor: `rgba(${rgb},0.25)`,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  codigoBadgeText: {
    color: accent,
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 10,
  },
  codigoCopyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
  },
  codigoCopyLabel: {
    color: '#8E8E93',
    fontSize: 11,
    fontWeight: '600',
  },
  codigoBtnsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  codigoActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: `rgba(${rgb},0.08)`,
    borderWidth: 1,
    borderColor: `rgba(${rgb},0.22)`,
  },
  codigoActionBtnPrimary: {
    backgroundColor: accent,
    borderColor: 'transparent',
  },
  codigoActionText: {
    color: accent,
    fontWeight: '700',
    fontSize: 14,
  },
  codigoActionTextPrimary: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
})
}

const styles = createStyles()
