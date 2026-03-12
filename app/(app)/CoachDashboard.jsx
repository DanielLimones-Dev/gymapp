// ============================================
// COACH DASHBOARD — Panel del entrenador
// Mismos estilos que dashboard cliente
// ============================================
import { useState, useEffect, useCallback, useRef } from 'react'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Modal, Pressable, Animated, Image, Share, Alert, Clipboard
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { AntDesign } from '@expo/vector-icons'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { supabase } from '../../lib/supabase'
import PagerTabs from './PagerTabs'
import SwipeableModal from './SwipeableModal'
import * as ImagePicker from 'expo-image-picker'
import { cargarPrograma } from '../../lib/storage'
import Progreso from './progreso/Progreso'
import Comunidad from './comunidad/Comunidad'
import Chat from './chat/Chat'
import ListaProgramas from './rutinas/ListaProgramas'
import { ListaBloques, DiasBloque, EjerciciosDelDia } from './RutinasScreens'
import { rutinasNavigation } from '../../lib/rutinasRef'

const SUPABASE_URL = 'https://vlnmhwaadyejdnmgktjt.supabase.co'
const SUPABASE_ANON = 'sb_publishable_ZHJhHtk3REmxd3EblLt6NA_9YIsoiSb'

const ESTADOS_CLIENTE = [
  { key: 'activo',       label: 'Activo',        color: '#00cc44', bg: '#001a08' },
  { key: 'off_season',   label: 'Off Season',     color: '#4488ff', bg: '#001030' },
  { key: 'competencia',  label: 'Competencia',    color: '#ff9900', bg: '#1a0a00' },
  { key: 'recreativo',   label: 'Recreativo',     color: '#9933ff', bg: '#0f0020' },
  { key: 'rehabilitacion', label: 'Rehabilitación', color: '#ff3355', bg: '#1a0008' },
  { key: 'inactivo',     label: 'Inactivo',       color: '#2a4488', bg: '#05050f' },
]
const RutinaStack = createNativeStackNavigator()

const DIAS_SEMANA_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const DIAS_NOMBRES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

// ── Utilidades ─────────────────────────────────────────────────
function Avatar({ nombre, foto, size = 44, radius }) {
  const r = radius || size / 2
  if (foto) return <Image source={{ uri: foto }} style={{ width: size, height: size, borderRadius: r, borderWidth: 1.5, borderColor: '#1a3aff' }} />
  return (
    <View style={{ width: size, height: size, borderRadius: r, backgroundColor: '#0a1a3f', borderWidth: 1.5, borderColor: '#1a3aff', justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: '#4488ff', fontWeight: '900', fontSize: size * 0.38 }}>{nombre?.[0]?.toUpperCase() || '?'}</Text>
    </View>
  )
}

function calcularActividad(cliente) {
  // Basado en última sesión registrada en el programa
  if (!cliente.ultima_sesion) return { label: 'Sin datos', color: '#2a4488', dot: '#1a2a5a' }
  const dias = Math.floor((Date.now() - new Date(cliente.ultima_sesion)) / (1000 * 60 * 60 * 24))
  if (dias <= 2) return { label: 'Muy activo', color: '#00cc44', dot: '#00cc44' }
  if (dias <= 5) return { label: 'Activo', color: '#4488ff', dot: '#4488ff' }
  if (dias <= 10) return { label: 'Poco activo', color: '#ff9900', dot: '#ff9900' }
  return { label: 'Inactivo', color: '#ff3355', dot: '#ff3355' }
}

// ══════════════════════════════════════════════════════════════
// PANTALLA INICIO COACH
// ══════════════════════════════════════════════════════════════
function InicioCoachScreen({ userId, vistaOverrideFn }) {
  const [perfil, setPerfil] = useState(null)
  const [clientes, setClientes] = useState([])
  const [codigos, setCodigos] = useState([])
  const [programa, setPrograma] = useState(null)
  const [cargandoInicio, setCargandoInicio] = useState(true)
  const [modalAjustes, setModalAjustes] = useState(false)
  const [clienteDetalle, setClienteDetalle] = useState(null)
  const [modalCliente, setModalCliente] = useState(false)
  const [viendoProgreso, setViendoProgreso] = useState(false)
  const [chatAbierto, setChatAbierto] = useState(false)
  const [chatInterlocutor, setChatInterlocutor] = useState(null)
  const [mensajesNoLeidos, setMensajesNoLeidos] = useState(0)
  const [adminAbierto, setAdminAbierto] = useState(false)
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
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 12, backgroundColor: '#000', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => setViendoProgreso(false)} style={{ padding: 8 }}>
            <AntDesign name="left" size={20} color="#4488ff" />
          </TouchableOpacity>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '900', flex: 1 }}>
            {clienteDetalle.nombre_completo || 'Cliente'}
          </Text>
          <Avatar nombre={clienteDetalle.nombre_completo} foto={clienteDetalle.avatar_url} size={34} />
        </View>
        <Progreso userId={clienteDetalle.id} modoCoach={true} />
      </View>
    )
  }


    // Pantalla de carga skeleton — InicioCoachScreen
    if (cargandoInicio && !perfil) return (
      <LinearGradient colors={['#000000', '#050510', '#0a0a1f']} style={{ flex: 1, padding: 20, paddingTop: 56 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <View style={{ width: 160, height: 22, borderRadius: 8, backgroundColor: '#0f1a3a' }} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#0f1a3a' }} />
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#0f1a3a' }} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#05050f', borderRadius: 16, padding: 14, marginBottom: 14 }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#0f1a3a' }} />
          <View style={{ flex: 1, gap: 8 }}>
            <View style={{ width: 130, height: 14, borderRadius: 6, backgroundColor: '#0f1a3a' }} />
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <View style={{ width: 70, height: 10, borderRadius: 5, backgroundColor: '#08101f' }} />
              <View style={{ width: 80, height: 10, borderRadius: 5, backgroundColor: '#08101f' }} />
            </View>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
          <View style={{ flex: 1, height: 80, borderRadius: 16, backgroundColor: '#05050f' }} />
          <View style={{ flex: 1, height: 80, borderRadius: 16, backgroundColor: '#05050f' }} />
        </View>
        <View style={{ backgroundColor: '#05050f', borderRadius: 18, padding: 18, marginBottom: 14, height: 100 }} />
        <View style={{ width: 140, height: 11, borderRadius: 5, backgroundColor: '#08101f', marginBottom: 10 }} />
        {[...Array(3)].map((_, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#05050f', borderRadius: 14, padding: 12, marginBottom: 8 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#0f1a3a' }} />
            <View style={{ flex: 1, gap: 6 }}>
              <View style={{ width: 120, height: 12, borderRadius: 5, backgroundColor: '#0f1a3a' }} />
              <View style={{ width: 80, height: 9, borderRadius: 4, backgroundColor: '#08101f' }} />
            </View>
          </View>
        ))}
      </LinearGradient>
    )

  return (
    <LinearGradient colors={['#000000', '#050510', '#0a0a1f']} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.iniContainer} showsVerticalScrollIndicator={false}
        contentInset={{ bottom: 100 }} scrollIndicatorInsets={{ bottom: 100 }}>

        {/* HEADER */}
        <View style={styles.iniHeader}>
          <View>
            <View style={styles.rfRow}>
              <Text style={styles.rfR}>REP</Text>
              <Text style={styles.rfF}>FORGE</Text>
              <View style={styles.coachBadge}><Text style={styles.coachBadgeText}>COACH</Text></View>
            </View>
            <Text style={styles.iniProgramaNombre}>
              {programaActivo ? `${programaActivo.nombre} · Sem ${semanaActual}` : 'Sin programa activo'}
            </Text>
          </View>
          {userId === '7d381a03-17b2-4bbe-83a2-ab5c9a4f2fc7' && (
            <TouchableOpacity
              style={[styles.iniBellBtn, { borderColor: '#9933ff44', backgroundColor: '#0a0020' }]}
              onPress={() => vistaOverrideFn?.('cliente')}
            >
              <AntDesign name="swap" size={18} color="#9933ff" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.iniBellBtn} onPress={() => setModalAjustes(true)}>
            <AntDesign name="setting" size={18} color="#4488ff" />
          </TouchableOpacity>
        </View>

        {/* PERFIL COACH */}
        <View style={styles.iniPerfilCard}>
          <View style={styles.iniPerfilAvatar}>
            {perfil?.avatar_url
              ? <Image source={{ uri: perfil.avatar_url }} style={{ width: 42, height: 42, borderRadius: 21 }} />
              : <Text style={styles.iniPerfilAvatarText}>{perfil?.nombre_completo?.[0]?.toUpperCase() || 'C'}</Text>
            }
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.iniPerfilNombre}>{perfil?.nombre_completo || 'Coach'}</Text>
            <View style={styles.iniPerfilSubRow}>
              <Text style={styles.iniPerfilSub}>{clientes.length} clientes</Text>
              {clientes.filter(c => calcularActividad(c).label === 'Muy activo').length > 0 &&
                <Text style={[styles.iniPerfilSub, { backgroundColor: '#001a0a', color: '#00cc44' }]}>
                  {clientes.filter(c => calcularActividad(c).label === 'Muy activo').length} activos hoy
                </Text>
              }
            </View>
          </View>
        </View>

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
                    esActivo && i < hoy && styles.iniDayDotDone,
                    esActivo && esHoy && styles.iniDayDotHoy,
                    esActivo && i > hoy && styles.iniDayDotFuturo,
                    !esActivo && styles.iniDayDotDescanso,
                  ]}>
                    {esActivo && i < hoy && <AntDesign name="check" size={10} color="#fff" />}
                    {esHoy && <View style={styles.iniDayDotCenter} />}
                  </View>
                </View>
              )
            })}
          </View>
        )}

        {/* HOY TOCA — su entrenamiento */}
        <View style={styles.iniCardHoy}>
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
        </View>

        {/* ACCESOS RÁPIDOS — fila horizontal */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          <TouchableOpacity
            style={{ flex: 1, alignItems: 'center', paddingVertical: 14, gap: 6, backgroundColor: '#05050f', borderWidth: 1.5, borderColor: mensajesNoLeidos > 0 ? '#1a3aff' : '#0f1a3a', borderRadius: 16 }}
            onPress={() => setChatAbierto(true)} activeOpacity={0.8}
          >
            <View style={{ position: 'relative' }}>
              <AntDesign name="message1" size={22} color={mensajesNoLeidos > 0 ? '#4488ff' : '#2a4488'} />
              {mensajesNoLeidos > 0 && (
                <View style={{ position: 'absolute', top: -6, right: -8, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#ff3355', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3, borderWidth: 2, borderColor: '#05050f' }}>
                  <Text style={{ color: '#fff', fontSize: 8, fontWeight: '900' }}>{mensajesNoLeidos > 9 ? '9+' : mensajesNoLeidos}</Text>
                </View>
              )}
            </View>
            <Text style={{ color: mensajesNoLeidos > 0 ? '#4488ff' : '#2a4488', fontSize: 11, fontWeight: '800' }}>Mensajes</Text>
            {mensajesNoLeidos > 0 && <Text style={{ color: '#4488ff', fontSize: 9, fontWeight: '700' }}>{mensajesNoLeidos} nuevo{mensajesNoLeidos > 1 ? 's' : ''}</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            style={{ flex: 1, alignItems: 'center', paddingVertical: 14, gap: 6, backgroundColor: '#05050f', borderWidth: 1.5, borderColor: '#0f1a3a', borderRadius: 16 }}
            onPress={() => setAdminAbierto(true)} activeOpacity={0.8}
          >
            <AntDesign name="setting" size={22} color="#2a4488" />
            <Text style={{ color: '#2a4488', fontSize: 11, fontWeight: '800' }}>Administrar</Text>
            <Text style={{ color: '#1a2a5a', fontSize: 9, fontWeight: '700' }}>{clientes.length} clientes</Text>
          </TouchableOpacity>
        </View>

        {/* RESUMEN CLIENTES */}
        <View style={styles.iniSection}>
          <Text style={styles.iniSectionLabel}>MIS CLIENTES ({clientes.length})</Text>
          {clientes.length === 0 ? (
            <View style={[styles.iniSemanaCard, { alignItems: 'center', paddingVertical: 24 }]}>
              <AntDesign name="team" size={32} color="#1a2a5a" />
              <Text style={{ color: '#2a4488', marginTop: 10, fontSize: 13 }}>Aún no tienes clientes vinculados</Text>
            </View>
          ) : (
            clientes.slice(0, 5).map(cliente => {
              const act = calcularActividad(cliente)
              const estado = ESTADOS_CLIENTE.find(e => e.key === (cliente.estado_cliente || 'activo')) || ESTADOS_CLIENTE[0]
              return (
                <TouchableOpacity
                  key={cliente.id}
                  style={[styles.clienteCardMini, { marginBottom: 8, borderLeftWidth: 3, borderLeftColor: estado.color }]}
                  onPress={() => { setClienteDetalle(cliente); setModalCliente(true) }}
                  activeOpacity={0.8}
                >
                  <Avatar nombre={cliente.nombre_completo} foto={cliente.avatar_url} size={40} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800' }}>{cliente.nombre_completo || 'Cliente'}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: act.dot }} />
                      <Text style={{ color: act.color, fontSize: 10, fontWeight: '700' }}>{act.label}</Text>
                      <Text style={{ color: estado.color, fontSize: 10, fontWeight: '700' }}>· {estado.label}</Text>
                    </View>
                  </View>
                  <AntDesign name="right" size={13} color="#2a4488" />
                </TouchableOpacity>
              )
            })
          )}
          {clientes.length > 5 && (
            <TouchableOpacity onPress={() => setAdminAbierto(true)}>
              <Text style={{ color: '#2a4488', fontSize: 12, textAlign: 'center', marginTop: 6 }}>+{clientes.length - 5} más · Ver todos</Text>
            </TouchableOpacity>
          )}
        </View>

      </ScrollView>

      {/* MODAL AJUSTES COACH */}
      <AjustesCoachModal visible={modalAjustes} onClose={() => setModalAjustes(false)} userId={userId} perfil={perfil} setPerfil={setPerfil} />

      {/* MODAL DETALLE CLIENTE */}
      <Modal visible={modalCliente} transparent animationType="slide">
        <View style={styles.ajustesOverlay}>
          <View style={styles.ajustesContainer}>
            <View style={styles.ajustesHandle} />
            {clienteDetalle && (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                  <Avatar nombre={clienteDetalle.nombre_completo} foto={clienteDetalle.avatar_url} size={58} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900' }}>{clienteDetalle.nombre_completo || 'Cliente'}</Text>
                    <Text style={{ color: '#2a4488', fontSize: 12, marginTop: 3 }}>
                      {[clienteDetalle.peso && clienteDetalle.peso + ' kg', clienteDetalle.nivel_experiencia].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setModalCliente(false)} style={styles.ajustesCerrarBtn}>
                    <AntDesign name="close" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
                <View style={{ gap: 10 }}>
                  <TouchableOpacity style={styles.accionBtn} onPress={() => { setModalCliente(false); setViendoProgreso(true) }}>
                    <AntDesign name="areachart" size={18} color="#00cc44" />
                    <Text style={styles.accionBtnText}>Ver progreso completo</Text>
                    <AntDesign name="right" size={14} color="#2a4488" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.accionBtn} onPress={() => { setChatInterlocutor(clienteDetalle); setModalCliente(false); setChatAbierto(true) }}>
                    <AntDesign name="message1" size={18} color="#4488ff" />
                    <Text style={styles.accionBtnText}>Enviar mensaje</Text>
                    <AntDesign name="right" size={14} color="#2a4488" />
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL CHAT */}
      <SwipeableModal visible={chatAbierto} onClose={() => { setChatAbierto(false); setChatInterlocutor(null); cargar() }}>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <View style={{ paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#0f1a3a', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TouchableOpacity onPress={() => { setChatAbierto(false); setChatInterlocutor(null); cargar() }} style={{ padding: 8 }}>
              <AntDesign name="left" size={20} color="#4488ff" />
            </TouchableOpacity>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '900', flex: 1 }}>
              {chatInterlocutor ? chatInterlocutor.nombre_completo : 'Mensajes'}
            </Text>
          </View>
          <Chat userId={userId} esCoach={true} interlocutorInicial={chatInterlocutor} />
        </View>
      </SwipeableModal>

      {/* MODAL ADMIN CLIENTES */}
      <SwipeableModal visible={adminAbierto} onClose={() => { setAdminAbierto(false); cargar() }}>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <View style={{ paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#0f1a3a', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TouchableOpacity onPress={() => { setAdminAbierto(false); cargar() }} style={{ padding: 8 }}>
              <AntDesign name="left" size={20} color="#4488ff" />
            </TouchableOpacity>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '900', flex: 1 }}>Administrar clientes</Text>
          </View>
          <AdminClientesScreen userId={userId} codigos={codigos} onCargar={cargar} embedded={true} />
        </View>
      </SwipeableModal>
    </LinearGradient>
  )
}

// ══════════════════════════════════════════════════════════════
// PANTALLA CLIENTES
// ══════════════════════════════════════════════════════════════
function ClientesScreen({ userId }) {
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

  useFocusEffect(useCallback(() => { cargar() }, []))

  const [modalAsignar, setModalAsignar] = useState(false)
  const [programasCoach, setProgramasCoach] = useState([])

  async function cargar() {
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
    setGenerando(true)
    const codigo = Math.random().toString(36).substring(2, 8).toUpperCase()
    const { data, error } = await supabase.from('codigos_invitacion')
      .insert({ codigo, coach_id: userId, usado: false, creado_en: new Date().toISOString() })
      .select().single()
    if (!error && data) { setNuevoCodigo(data.codigo); setModalCodigo(true); cargar() }
    else Alert.alert('Error', error?.message || 'No se pudo generar')
    setGenerando(false)
  }

  async function copiarCodigo(codigo) {
    try { Clipboard.setString(codigo); Alert.alert('✓ Copiado', `"${codigo}" copiado al portapapeles`) }
    catch { Alert.alert('Código', codigo) }
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
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 12, backgroundColor: '#000', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => setViendoProgreso(false)} style={{ padding: 8 }}>
            <AntDesign name="left" size={20} color="#4488ff" />
          </TouchableOpacity>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '900', flex: 1 }}>{clienteDetalle.nombre_completo}</Text>
          <Avatar nombre={clienteDetalle.nombre_completo} foto={clienteDetalle.avatar_url} size={34} />
        </View>
        <Progreso userId={clienteDetalle.id} modoCoach={true} />
      </View>
    )
  }

  const codigosLibres = codigos.filter(c => !c.usado)
  const codigosUsados = codigos.filter(c => c.usado)

    if (cargandoClientes && clientes.length === 0 && codigos.length === 0) return (
      <LinearGradient colors={['#000000', '#050510', '#0a0a1f']} style={{ flex: 1, padding: 20, paddingTop: 56 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <View style={{ width: 140, height: 22, borderRadius: 8, backgroundColor: '#0f1a3a' }} />
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#0f1a3a' }} />
        </View>
        <View style={{ backgroundColor: '#05050f', borderRadius: 18, padding: 18, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 }}>
            {[...Array(3)].map((_, i) => (
              <View key={i} style={{ alignItems: 'center', gap: 6 }}>
                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#0f1a3a' }} />
                <View style={{ width: 32, height: 22, borderRadius: 6, backgroundColor: '#0f1a3a' }} />
                <View style={{ width: 60, height: 9, borderRadius: 4, backgroundColor: '#08101f' }} />
              </View>
            ))}
          </View>
        </View>
        {[...Array(5)].map((_, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#05050f', borderRadius: 16, padding: 16, marginBottom: 10 }}>
            <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: '#0f1a3a' }} />
            <View style={{ flex: 1, gap: 8 }}>
              <View style={{ width: 130, height: 13, borderRadius: 5, backgroundColor: '#0f1a3a' }} />
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <View style={{ width: 70, height: 10, borderRadius: 5, backgroundColor: '#08101f' }} />
                <View style={{ width: 50, height: 10, borderRadius: 5, backgroundColor: '#08101f' }} />
              </View>
            </View>
          </View>
        ))}
      </LinearGradient>
    )

  return (
    <LinearGradient colors={['#000000', '#050510', '#0a0a1f']} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.iniContainer} showsVerticalScrollIndicator={false}
        contentInset={{ bottom: 100 }} scrollIndicatorInsets={{ bottom: 100 }}>

        <View style={styles.iniHeader}>
          <View>
            <View style={styles.rfRow}>
              <Text style={styles.rfR}>REP</Text><Text style={styles.rfF}>FORGE</Text>
            </View>
            <Text style={styles.iniProgramaNombre}>{clientes.length} clientes · {codigosLibres.length} códigos libres</Text>
          </View>
          <TouchableOpacity style={styles.iniBellBtn} onPress={generarCodigo} disabled={generando}>
            <AntDesign name="adduser" size={18} color="#4488ff" />
          </TouchableOpacity>
        </View>

        {/* CARD FUSIONADO — clientes + códigos libres */}
        <View style={styles.fusionCard}>
          {/* Fila superior: stats */}
          <View style={{ flexDirection: 'row', marginBottom: 16 }}>
            {[
              { label: 'Total clientes', value: clientes.length, color: '#4488ff', icon: 'team' },
              { label: 'Muy activos', value: clientes.filter(c => calcularActividad(c).label === 'Muy activo').length, color: '#00cc44', icon: 'user' },
              { label: 'Códigos libres', value: codigosLibres.length, color: '#ff6600', icon: 'mail' },
            ].map(s => (
              <View key={s.label} style={{ flex: 1, alignItems: 'center' }}>
                <AntDesign name={s.icon} size={16} color={s.color} style={{ marginBottom: 4 }} />
                <Text style={{ color: s.color, fontSize: 22, fontWeight: '900' }}>{s.value}</Text>
                <Text style={{ color: '#2a4488', fontSize: 9, fontWeight: '700', letterSpacing: 0.5, textAlign: 'center' }}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Códigos libres para compartir */}
          {codigosLibres.length > 0 && (
            <>
              <View style={{ height: 1, backgroundColor: '#0f1a3a', marginBottom: 12 }} />
              <Text style={styles.ajustesSectionLabel}>CÓDIGOS DISPONIBLES</Text>
              {codigosLibres.map(cod => (
                <View key={cod.id} style={styles.codigoRow}>
                  <Text style={styles.codigoCodigo}>{cod.codigo}</Text>
                  <Text style={{ color: '#2a4488', fontSize: 10, flex: 1, marginLeft: 10 }}>
                    {new Date(cod.creado_en).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                  </Text>
                  <TouchableOpacity style={styles.codigoAccionBtn} onPress={() => copiarCodigo(cod.codigo)}>
                    <AntDesign name="copy1" size={14} color="#4488ff" />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.codigoAccionBtn, { marginLeft: 6 }]} onPress={() => compartirCodigo(cod.codigo)}>
                    <AntDesign name="export" size={14} color="#4488ff" />
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}

          {codigosLibres.length === 0 && (
            <TouchableOpacity onPress={generarCodigo} style={{ alignItems: 'center', paddingVertical: 10 }}>
              <Text style={{ color: '#1a3aff', fontSize: 13, fontWeight: '700' }}>+ Generar nuevo código</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* LISTA CLIENTES */}
        <Text style={styles.iniSectionLabel}>CLIENTES</Text>
        {clientes.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 40, gap: 12 }}>
            <AntDesign name="team" size={48} color="#1a2a5a" />
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '900' }}>Sin clientes aún</Text>
            <Text style={{ color: '#2a4488', fontSize: 13, textAlign: 'center', paddingHorizontal: 30 }}>
              Genera un código y compártelo para vincular clientes
            </Text>
            <TouchableOpacity onPress={generarCodigo}>
              <LinearGradient colors={['#1a3aff', '#0022cc']} style={{ borderRadius: 12, paddingHorizontal: 24, paddingVertical: 13 }}>
                <Text style={{ color: '#fff', fontWeight: '900', fontSize: 13 }}>Generar código</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          clientes.map(cliente => {
            const act = calcularActividad(cliente)
            const codUsado = codigosUsados.find(c => c.cliente?.nombre_completo === cliente.nombre_completo)
            return (
              <TouchableOpacity
                key={cliente.id}
                style={styles.clienteCard}
                onPress={() => { setClienteDetalle(cliente); setModalCliente(true) }}
                activeOpacity={0.8}
              >
                <Avatar nombre={cliente.nombre_completo} foto={cliente.avatar_url} size={50} />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>{cliente.nombre_completo || 'Cliente'}</Text>
                    {/* Indicador actividad */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: act.dot }} />
                      <Text style={{ color: act.color, fontSize: 9, fontWeight: '800', letterSpacing: 0.5 }}>{act.label.toUpperCase()}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
                    {cliente.objetivo && (
                      <View style={styles.clienteTag}>
                        <Text style={styles.clienteTagText}>{cliente.objetivo}</Text>
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
                    <Text style={{ color: '#1a3a6a', fontSize: 10, marginTop: 4 }}>
                      Código: {codUsado.codigo}
                    </Text>
                  )}
                </View>
                <AntDesign name="right" size={14} color="#2a4488" />
              </TouchableOpacity>
            )
          })
        )}

      </ScrollView>

      {/* MODAL DETALLE CLIENTE */}
      <Modal visible={modalCliente} transparent animationType="slide">
        <View style={styles.ajustesOverlay}>
          <View style={styles.ajustesContainer}>
            <View style={styles.ajustesHandle} />
            {clienteDetalle && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header cliente */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                  <Avatar nombre={clienteDetalle.nombre_completo} foto={clienteDetalle.avatar_url} size={64} />
                  <View style={{ flex: 1, marginLeft: 16 }}>
                    <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900' }}>{clienteDetalle.nombre_completo || 'Cliente'}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      {(() => {
                        const act = calcularActividad(clienteDetalle)
                        return (
                          <>
                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: act.dot }} />
                            <Text style={{ color: act.color, fontSize: 11, fontWeight: '700' }}>{act.label}</Text>
                          </>
                        )
                      })()}
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setModalCliente(false)} style={styles.ajustesCerrarBtn}>
                    <AntDesign name="close" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>

                {/* Info grid */}
                <Text style={styles.ajustesSectionLabel}>INFORMACIÓN</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
                  {[
                    { label: 'Objetivo', value: clienteDetalle.objetivo || '—', color: '#9933ff' },
                    { label: 'Nivel', value: clienteDetalle.nivel_experiencia || '—', color: '#4488ff' },
                    { label: 'Peso', value: clienteDetalle.peso ? clienteDetalle.peso + ' kg' : '—', color: '#ff6600' },
                    { label: 'Altura', value: clienteDetalle.altura ? clienteDetalle.altura + ' cm' : '—', color: '#00cc44' },
                  ].map(item => (
                    <View key={item.label} style={{ width: '47%', backgroundColor: '#08080f', borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 14, padding: 14, alignItems: 'center' }}>
                      <Text style={{ fontSize: 17, fontWeight: '900', color: item.color, marginBottom: 4 }}>{item.value}</Text>
                      <Text style={{ color: '#2a4488', fontSize: 10, fontWeight: '700', letterSpacing: 1 }}>{item.label}</Text>
                    </View>
                  ))}
                </View>

                {/* Acciones */}
                <Text style={styles.ajustesSectionLabel}>ACCIONES</Text>
                <View style={{ gap: 10 }}>
                  <TouchableOpacity style={styles.accionBtn} onPress={() => { setModalCliente(false); setViendoProgreso(true) }}>
                    <AntDesign name="areachart" size={18} color="#00cc44" />
                    <Text style={styles.accionBtnText}>Ver progreso completo</Text>
                    <AntDesign name="right" size={14} color="#2a4488" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.accionBtn} onPress={() => { setChatInterlocutor(clienteDetalle); setModalCliente(false); setChatAbierto(true) }}>
                    <AntDesign name="message1" size={18} color="#4488ff" />
                    <Text style={styles.accionBtnText}>Enviar mensaje</Text>
                    <AntDesign name="right" size={14} color="#2a4488" />
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
          </View>
        </View>
      </Modal>

      {/* MODAL ASIGNAR RUTINA */}
      <Modal visible={modalAsignar} transparent animationType="slide">
        <View style={styles.ajustesOverlay}>
          <View style={styles.ajustesContainer}>
            <View style={styles.ajustesHandle} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <View>
                <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900' }}>Asignar rutina</Text>
                <Text style={{ color: '#2a4488', fontSize: 12, marginTop: 2 }}>
                  A: {clienteDetalle?.nombre_completo}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setModalAsignar(false)} style={styles.ajustesCerrarBtn}>
                <AntDesign name="close" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {programasCoach.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 40, gap: 12 }}>
                  <AntDesign name="calendar" size={40} color="#1a2a5a" />
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '900' }}>Sin rutinas creadas</Text>
                  <Text style={{ color: '#2a4488', fontSize: 13, textAlign: 'center' }}>
                    Crea una rutina en el tab Rutina para poder asignarla
                  </Text>
                </View>
              ) : (
                programasCoach.map(prog => (
                  <TouchableOpacity
                    key={prog.id}
                    style={[styles.accionBtn, { marginBottom: 10, borderColor: '#ff990033' }]}
                    onPress={() => asignarRutina(prog)}
                    activeOpacity={0.8}
                  >
                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#1a0a00', borderWidth: 1, borderColor: '#ff9900', justifyContent: 'center', alignItems: 'center' }}>
                      <AntDesign name="calendar" size={18} color="#ff9900" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800' }}>{prog.nombre}</Text>
                      <Text style={{ color: '#2a4488', fontSize: 11, marginTop: 2 }}>
                        {prog.bloques?.length || 0} bloques · {prog.estado === 'activo' ? 'Activo' : prog.estado}
                      </Text>
                    </View>
                    <AntDesign name="right" size={14} color="#ff9900" />
                  </TouchableOpacity>
                ))
              )}
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL CHAT CON CLIENTE */}
      <SwipeableModal visible={chatAbierto} onClose={() => { setChatAbierto(false); setChatInterlocutor(null) }}>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <View style={{ paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#0f1a3a', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TouchableOpacity onPress={() => { setChatAbierto(false); setChatInterlocutor(null) }} style={{ padding: 8 }}>
              <AntDesign name="left" size={20} color="#4488ff" />
            </TouchableOpacity>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '900', flex: 1 }}>
              {chatInterlocutor?.nombre_completo || 'Mensajes'}
            </Text>
          </View>
          <Chat userId={userId} esCoach={true} interlocutorInicial={chatInterlocutor} />
        </View>
      </SwipeableModal>

      {/* MODAL CÓDIGO GENERADO */}
      <Modal visible={modalCodigo} transparent animationType="fade">
        <View style={[styles.ajustesOverlay, { justifyContent: 'center', padding: 24 }]}>
          <View style={{ borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: '#1a3aff' }}>
            <LinearGradient colors={['#001a3a', '#000d1f']} style={{ padding: 28, alignItems: 'center' }}>
              <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: '#001a0a', borderWidth: 1.5, borderColor: '#00cc44', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                <AntDesign name="checkcircle" size={32} color="#00cc44" />
              </View>
              <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900', marginBottom: 8 }}>Código generado</Text>
              <Text style={{ color: '#2a4488', fontSize: 13, textAlign: 'center', marginBottom: 20 }}>Comparte este código con tu cliente</Text>
              <TouchableOpacity
                style={{ backgroundColor: '#0a0a2a', borderWidth: 2, borderColor: '#1a3aff', borderRadius: 16, paddingHorizontal: 32, paddingVertical: 16, marginBottom: 20, alignItems: 'center' }}
                onPress={() => copiarCodigo(nuevoCodigo)}
              >
                <Text style={{ color: '#4488ff', fontSize: 32, fontWeight: '900', letterSpacing: 8 }}>{nuevoCodigo}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                  <AntDesign name="copy1" size={13} color="#2a4488" />
                  <Text style={{ color: '#2a4488', fontSize: 11, fontWeight: '700' }}>Toca para copiar</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={{ borderRadius: 14, overflow: 'hidden', width: '100%', marginBottom: 12 }} onPress={() => compartirCodigo(nuevoCodigo)}>
                <LinearGradient colors={['#1a3aff', '#0022cc']} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 }}>
                  <AntDesign name="export" size={16} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: '900', fontSize: 14 }}>Compartir código</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setModalCodigo(false)}>
                <Text style={{ color: '#2a4488', fontSize: 14, fontWeight: '700', paddingVertical: 10 }}>Listo</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  )
}

// ══════════════════════════════════════════════════════════════
// MODAL AJUSTES COACH — mismo estilo que cliente
// ══════════════════════════════════════════════════════════════
function AjustesCoachModal({ visible, onClose, userId, perfil, setPerfil }) {
  const [editando, setEditando]             = useState(false)
  const [form, setForm]                     = useState({ nombre: '', apellido: '', peso: '', altura: '', genero: '', especialidad: '' })
  const [modalCerrarSesion, setModalCS]     = useState(false)
  const [subiendoFoto, setSubiendoFoto]     = useState(false)
  const editAnim                            = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (visible && perfil) {
      const partes = (perfil.nombre_completo || '').split(' ')
      setForm({
        nombre:       partes[0] || '',
        apellido:     partes.slice(1).join(' ') || '',
        peso:         perfil.peso?.toString() || '',
        altura:       perfil.altura?.toString() || '',
        genero:       perfil.genero || '',
        especialidad: perfil.especialidad || '',
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

  async function guardar() {
    if (!form.nombre.trim()) return
    const nombreCompleto = [form.nombre.trim(), form.apellido.trim()].filter(Boolean).join(' ')
    const updates = { nombre_completo: nombreCompleto }
    if (form.peso)         updates.peso         = parseFloat(form.peso)
    if (form.altura)       updates.altura       = parseFloat(form.altura)
    if (form.genero)       updates.genero       = form.genero
    if (form.especialidad) updates.especialidad = form.especialidad
    const { error } = await supabase.from('perfiles').update(updates).eq('id', userId)
    if (error) { Alert.alert('Error', error.message); return }
    setPerfil(p => ({ ...p, ...updates }))
    toggleEdit(false)
    Alert.alert('✓ Guardado', 'Perfil actualizado')
  }

  return (
    <>
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.ajustesOverlay}>
          <View style={styles.ajustesContainer}>
            <View style={styles.ajustesHandle} />
            <View style={styles.ajustesHeader}>
              <Text style={styles.ajustesTitulo}>Ajustes</Text>
              <TouchableOpacity onPress={onClose} style={styles.ajustesCerrarBtn}>
                <AntDesign name="close" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

              {/* FOTO + PERFIL */}
              <Text style={styles.ajustesSectionLabel}>PERFIL COACH</Text>
              <View style={styles.ajustesCard}>
                <View style={styles.ajustesPerfilRow}>
                  {/* Avatar con botón de cambiar foto */}
                  <TouchableOpacity onPress={seleccionarFoto} disabled={subiendoFoto} style={{ position: 'relative' }}>
                    {perfil?.avatar_url
                      ? <Image source={{ uri: perfil.avatar_url }} style={{ width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: '#1a3aff' }} />
                      : <View style={styles.ajustesAvatar}>
                          <Text style={styles.ajustesAvatarText}>{perfil?.nombre_completo?.[0]?.toUpperCase() || 'C'}</Text>
                        </View>
                    }
                    <View style={{ position: 'absolute', bottom: 0, right: 0, width: 22, height: 22, borderRadius: 11, backgroundColor: '#1a3aff', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#08080f' }}>
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
                        <AntDesign name="edit" size={16} color="#4488ff" />
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
                          <TextInput style={styles.ajustesEditInput} value={form.nombre} onChangeText={t => setForm(p => ({...p, nombre: t}))} placeholder="Nombre" placeholderTextColor="#2a2a4a" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.ajustesEditLabel}>APELLIDO</Text>
                          <TextInput style={styles.ajustesEditInput} value={form.apellido} onChangeText={t => setForm(p => ({...p, apellido: t}))} placeholder="Apellido" placeholderTextColor="#2a2a4a" />
                        </View>
                      </View>
                      <Text style={[styles.ajustesEditLabel, { marginTop: 14 }]}>ESPECIALIDAD</Text>
                      <TextInput style={styles.ajustesEditInput} value={form.especialidad} onChangeText={t => setForm(p => ({...p, especialidad: t}))} placeholder="Ej: Hipertrofia, Fuerza, Pérdida de grasa" placeholderTextColor="#2a2a4a" />
                      <Text style={[styles.ajustesEditLabel, { marginTop: 14 }]}>GÉNERO</Text>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        {['Masculino', 'Femenino', 'Otro'].map(g => (
                          <Pressable key={g} style={[styles.ajustesEditChipLg, form.genero === g && { borderColor: '#4488ff', backgroundColor: '#4488ff22' }]} onPress={() => setForm(p => ({...p, genero: g}))}>
                            <Text style={{ color: form.genero === g ? '#4488ff' : '#2a4488', fontSize: 12, fontWeight: '700' }}>{g}</Text>
                          </Pressable>
                        ))}
                      </View>
                      <Pressable style={[styles.ajustesGuardarBtn, { marginTop: 16 }]} onPress={guardar}>
                        <LinearGradient colors={['#1a3aff', '#0022cc']} style={styles.ajustesGuardarGradient}>
                          <AntDesign name="check" size={15} color="#fff" />
                          <Text style={styles.ajustesGuardarText}>Guardar cambios</Text>
                        </LinearGradient>
                      </Pressable>
                    </View>
                  )}
                </Animated.View>
              </View>

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
          </View>
        </View>
      </Modal>

      {/* CONFIRMAR CERRAR SESIÓN */}
      <Modal visible={modalCerrarSesion} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,2,15,0.92)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{ backgroundColor: '#08080f', borderRadius: 22, padding: 26, width: '100%', borderWidth: 1, borderColor: '#ff335566', alignItems: 'center' }}>
            <View style={{ width: 54, height: 54, borderRadius: 14, backgroundColor: '#1a0000', borderWidth: 1, borderColor: '#ff3355', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
              <AntDesign name="logout" size={26} color="#4488ff" />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '900', color: '#fff', marginBottom: 6 }}>¿Cerrar sesión?</Text>
            <Text style={{ fontSize: 11, color: '#ff4444', textAlign: 'center', marginBottom: 20 }}>Tendrás que iniciar sesión nuevamente.</Text>
            <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
              <Pressable style={{ flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#1a3aff44', backgroundColor: '#05051a', alignItems: 'center' }} onPress={() => setModalCS(false)}>
                <Text style={{ color: '#2a4488', fontWeight: '700', fontSize: 13 }}>Cancelar</Text>
              </Pressable>
              <Pressable style={{ flex: 1, borderRadius: 11, overflow: 'hidden' }} onPress={() => supabase.auth.signOut()}>
                <LinearGradient colors={['#1a3aff', '#0022cc']} style={{ padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <AntDesign name="logout" size={13} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: '900', fontSize: 13 }}>Cerrar sesión</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  )
}



// ══════════════════════════════════════════════════════════════
// ADMIN CLIENTES — Gestión con estados agrupados
// ══════════════════════════════════════════════════════════════
function AdminClientesScreen({ userId, codigos = [], onCargar, embedded = false }) {
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

  useFocusEffect(useCallback(() => { cargar() }, []))

  const todosLoscodigos = codigos.length > 0 ? codigos : codigosLocales

  async function cargar() {
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
    await supabase.from('perfiles').update({ coach_id: null, estado_cliente: null }).eq('id', modalEliminar.id)
    setModalEliminar(null)
    cargar()
  }

  async function eliminarCodigo(id) {
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
    <LinearGradient colors={['#000000', '#050510', '#0a0a1f']} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.iniContainer} showsVerticalScrollIndicator={false}
        contentInset={{ bottom: 100 }} scrollIndicatorInsets={{ bottom: 100 }}>

        <View style={styles.iniHeader}>
          <View>
            <View style={styles.rfRow}>
              <Text style={styles.rfR}>REP</Text><Text style={styles.rfF}>FORGE</Text>
            </View>
            <Text style={styles.iniProgramaNombre}>Administrar · {clientes.length} clientes</Text>
          </View>
        </View>

        {/* Filtros de estado */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 2 }}>
            <TouchableOpacity
              style={[styles.filtroChip, !filtroEstado && { borderColor: '#4488ff', backgroundColor: '#4488ff22' }]}
              onPress={() => setFiltroEstado(null)}
            >
              <Text style={{ color: !filtroEstado ? '#4488ff' : '#2a4488', fontSize: 12, fontWeight: '800' }}>
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
                <Text style={{ color: filtroEstado === e.key ? e.color : '#2a4488', fontSize: 12, fontWeight: '800' }}>
                  {e.label} {totalPorEstado[e.key] > 0 ? `(${totalPorEstado[e.key]})` : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Grupos por estado */}
        {grupos.map(grupo => grupo.clientes.length === 0 ? null : (
          <View key={grupo.key} style={{ marginBottom: 24 }}>
            {/* Header grupo */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: grupo.color }} />
              <Text style={{ color: grupo.color, fontSize: 11, fontWeight: '900', letterSpacing: 2 }}>
                {grupo.label.toUpperCase()} · {grupo.clientes.length}
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: grupo.color + '33' }} />
            </View>

            {/* Cards de clientes */}
            {grupo.clientes.map(cliente => (
              <View key={cliente.id} style={[styles.clienteCard, { borderLeftWidth: 3, borderLeftColor: grupo.color, marginBottom: 10 }]}>
                <Avatar nombre={cliente.nombre_completo} foto={cliente.avatar_url} size={46} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800', marginBottom: 3 }}>
                    {cliente.nombre_completo || 'Sin nombre'}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
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
                  </View>
                </View>
                <View style={{ gap: 8 }}>
                  <TouchableOpacity
                    style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: '#1a0a00', borderWidth: 1, borderColor: '#ff990033', justifyContent: 'center', alignItems: 'center' }}
                    onPress={() => abrirAsignarAdmin(cliente)}
                  >
                    <AntDesign name="calendar" size={15} color="#ff9900" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: '#0a1a3f', borderWidth: 1, borderColor: '#1a3aff', justifyContent: 'center', alignItems: 'center' }}
                    onPress={() => abrirEditar(cliente)}
                  >
                    <AntDesign name="edit" size={15} color="#4488ff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: '#1a0008', borderWidth: 1, borderColor: '#ff335533', justifyContent: 'center', alignItems: 'center' }}
                    onPress={() => setModalEliminar(cliente)}
                  >
                    <AntDesign name="delete" size={15} color="#ff3355" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ))}

        {clientes.length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: 60, gap: 12 }}>
            <AntDesign name="team" size={48} color="#1a2a5a" />
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900' }}>Sin clientes</Text>
          </View>
        )}

        {/* SECCIÓN CÓDIGOS */}
        <View style={{ marginTop: 8, marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <View style={{ width: 3, height: 16, borderRadius: 2, backgroundColor: '#ff6600' }} />
            <Text style={{ color: '#ff6600', fontSize: 11, fontWeight: '900', letterSpacing: 2 }}>CÓDIGOS DE INVITACIÓN</Text>
          </View>
          {todosLoscodigos.length === 0 ? (
            <Text style={{ color: '#1a2a5a', fontSize: 13, textAlign: 'center', paddingVertical: 16 }}>Sin códigos generados</Text>
          ) : (
            todosLoscodigos.map(cod => (
              <View key={cod.id} style={[styles.clienteCard, { marginBottom: 8, opacity: cod.usado ? 0.6 : 1 }]}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: 4 }}>{cod.codigo}</Text>
                    <View style={{ borderWidth: 1, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, borderColor: cod.usado ? '#00cc4433' : '#0f1a3a', backgroundColor: cod.usado ? '#001a0a' : '#08080f' }}>
                      <Text style={{ color: cod.usado ? '#00cc44' : '#2a4488', fontSize: 9, fontWeight: '900' }}>
                        {cod.usado ? 'USADO' : 'LIBRE'}
                      </Text>
                    </View>
                  </View>
                  {cod.usado && cod.cliente ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Avatar nombre={cod.cliente.nombre_completo} foto={cod.cliente.avatar_url} size={20} />
                      <Text style={{ color: '#00cc44', fontSize: 11, fontWeight: '700' }}>{cod.cliente.nombre_completo}</Text>
                    </View>
                  ) : (
                    <Text style={{ color: '#2a4488', fontSize: 11 }}>
                      {new Date(cod.creado_en).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Text>
                  )}
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {!cod.usado && (
                    <TouchableOpacity
                      style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: '#0a1a3f', borderWidth: 1, borderColor: '#1a3aff', justifyContent: 'center', alignItems: 'center' }}
                      onPress={() => compartirCodigo(cod.codigo)}
                    >
                      <AntDesign name="export" size={15} color="#4488ff" />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: '#1a0008', borderWidth: 1, borderColor: '#ff335533', justifyContent: 'center', alignItems: 'center' }}
                    onPress={() => eliminarCodigo(cod.id)}
                  >
                    <AntDesign name="delete" size={15} color="#ff3355" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* MODAL ASIGNAR RUTINA DESDE ADMIN */}
      <Modal visible={modalAsignarAdmin} transparent animationType="slide">
        <View style={styles.ajustesOverlay}>
          <View style={styles.ajustesContainer}>
            <View style={styles.ajustesHandle} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <View>
                <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900' }}>Asignar rutina</Text>
                <Text style={{ color: '#2a4488', fontSize: 12, marginTop: 2 }}>
                  Para: {clienteAsignar?.nombre_completo}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setModalAsignarAdmin(false)} style={styles.ajustesCerrarBtn}>
                <AntDesign name="close" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {programasAdmin.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 40, gap: 12 }}>
                  <AntDesign name="calendar" size={40} color="#1a2a5a" />
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '900' }}>Sin rutinas creadas</Text>
                  <Text style={{ color: '#2a4488', fontSize: 13, textAlign: 'center' }}>
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
                    activeOpacity={0.8}
                  >
                    <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: '#1a0a00', borderWidth: 1.5, borderColor: '#ff9900', justifyContent: 'center', alignItems: 'center' }}>
                      <AntDesign name="calendar" size={20} color="#ff9900" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800' }}>{prog.nombre}</Text>
                      <Text style={{ color: '#2a4488', fontSize: 11, marginTop: 2 }}>
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
          </View>
        </View>
      </Modal>

      {/* MODAL EDITAR CLIENTE */}
      <Modal visible={modalEditar} transparent animationType="slide">
        <View style={styles.ajustesOverlay}>
          <View style={styles.ajustesContainer}>
            <View style={styles.ajustesHandle} />
            <View style={styles.ajustesHeader}>
              <Text style={styles.ajustesTitulo}>Editar cliente</Text>
              <TouchableOpacity onPress={() => setModalEditar(false)} style={styles.ajustesCerrarBtn}>
                <AntDesign name="close" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              <Text style={styles.ajustesSectionLabel}>NOMBRE</Text>
              <TextInput
                style={styles.ajustesEditInput}
                value={formEdit.nombre_completo}
                onChangeText={t => setFormEdit(p => ({...p, nombre_completo: t}))}
                placeholder="Nombre completo"
                placeholderTextColor="#2a2a4a"
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
                    <Text style={{ color: formEdit.estado_cliente === e.key ? e.color : '#2a4488', fontSize: 12, fontWeight: '700' }}>
                      {e.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.ajustesSectionLabel}>OBJETIVO</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {['Pérdida de grasa', 'Ganancia muscular', 'Fuerza', 'Resistencia', 'Bienestar'].map(o => (
                  <TouchableOpacity
                    key={o}
                    style={[styles.filtroChip, formEdit.objetivo === o && { borderColor: '#9933ff', backgroundColor: '#9933ff22' }]}
                    onPress={() => setFormEdit(p => ({...p, objetivo: o}))}
                  >
                    <Text style={{ color: formEdit.objetivo === o ? '#9933ff' : '#2a4488', fontSize: 12, fontWeight: '700' }}>{o}</Text>
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
                    placeholderTextColor="#2a2a4a"
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
                    placeholderTextColor="#2a2a4a"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <Pressable
                style={({ pressed }) => [{ borderRadius: 14, overflow: 'hidden', opacity: pressed ? 0.85 : 1 }]}
                onPress={guardarEdicion}
                disabled={guardando}
              >
                <LinearGradient colors={['#1a3aff', '#0022cc']} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 }}>
                  <AntDesign name="check" size={16} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: '900', fontSize: 15 }}>{guardando ? 'Guardando...' : 'Guardar cambios'}</Text>
                </LinearGradient>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL ELIMINAR */}
      <Modal visible={!!modalEliminar} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,2,15,0.92)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{ backgroundColor: '#08080f', borderRadius: 22, padding: 26, width: '100%', borderWidth: 1, borderColor: '#ff335566', alignItems: 'center' }}>
            <View style={{ width: 54, height: 54, borderRadius: 14, backgroundColor: '#1a0008', borderWidth: 1, borderColor: '#ff3355', justifyContent: 'center', alignItems: 'center', marginBottom: 14 }}>
              <AntDesign name="delete" size={24} color="#ff3355" />
            </View>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900', marginBottom: 8 }}>Desvincular cliente</Text>
            <Text style={{ color: '#2a4488', fontSize: 13, textAlign: 'center', marginBottom: 24 }}>
              ¿Desvincular a {modalEliminar?.nombre_completo}? Perderá acceso a tu comunidad.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
              <Pressable style={{ flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#0f1a3a', backgroundColor: '#05050f', alignItems: 'center' }} onPress={() => setModalEliminar(null)}>
                <Text style={{ color: '#2a4488', fontWeight: '700' }}>Cancelar</Text>
              </Pressable>
              <Pressable style={{ flex: 1, borderRadius: 12, overflow: 'hidden' }} onPress={eliminarCliente}>
                <LinearGradient colors={['#cc0022', '#880011']} style={{ padding: 14, alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontWeight: '900' }}>Desvincular</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  )
}

// ══════════════════════════════════════════════════════════════
// STACK RUTINAS COACH (igual que cliente)
// ══════════════════════════════════════════════════════════════
function RutinasCoachTab() {
  // Eliminamos el estado 'covering'

  rutinasNavigation.reset = () => {
    if (!rutinasNavigation.ref?.canGoBack?.()) return
    
    // Navegamos suavemente a la raíz
    rutinasNavigation.ref?.navigate('ListaProgramas', { isDoubleTap: true })
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      <RutinaStack.Navigator
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#000000' }, animation: 'slide_from_right', animationDuration: 120, gestureEnabled: true, gestureDirection: 'horizontal' }}
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
        <RutinaStack.Screen name="ListaBloques" component={ListaBloques}
          listeners={({ navigation }) => ({ focus: () => { rutinasNavigation.ref = navigation } })} />
        <RutinaStack.Screen name="DiasBloque" component={DiasBloque}
          listeners={({ navigation }) => ({ focus: () => { rutinasNavigation.ref = navigation } })} />
        <RutinaStack.Screen name="Ejercicios" component={EjerciciosDelDia}
          listeners={({ navigation }) => ({ focus: () => { rutinasNavigation.ref = navigation } })} />
      </RutinaStack.Navigator>
      {/* Eliminamos el View negro con absolute que causaba el destello */}
    </View>
  )
}

// ══════════════════════════════════════════════════════════════
// COACH DASHBOARD ROOT — Tab bar igual al cliente
// ══════════════════════════════════════════════════════════════
export default function CoachDashboard({ userId, onSwitchToCliente }) {
  return (
    <PagerTabs
      tabs={[
        { name: 'Inicio',    icon: 'home',     component: () => <InicioCoachScreen userId={userId} vistaOverrideFn={onSwitchToCliente} /> },
        { name: 'Clientes',  icon: 'team',     component: () => <ClientesScreen userId={userId} /> },
        { name: 'Comunidad', icon: 'team',     component: () => <Comunidad userId={userId} esCoach={true} /> },
        { name: 'Rutina',    icon: 'calendar', component: RutinasCoachTab,
        onReselect: () => { rutinasNavigation.reset?.() }
      },
        { name: 'Progreso',  icon: 'bars',     component: () => <Progreso userId={userId} /> },
      ]}
    />
  )
}

const styles = StyleSheet.create({
  // ── Tab bar (idéntico al cliente) ─────────────────────────────
  tabBar: {
    position: 'absolute', bottom: 20, left: 16, right: 16,
    height: 72, borderRadius: 36, backgroundColor: '#08091a',
    borderWidth: 1, borderColor: '#0f1a3a',
    elevation: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5, shadowRadius: 20, paddingHorizontal: 6,
  },
  tabItemWrap: { alignItems: 'center', justifyContent: 'center', width: '95%', paddingVertical: 8, borderRadius: 18, overflow: 'hidden', backgroundColor: 'transparent' },
  tabItemWrapActive: { backgroundColor: 'rgba(68, 136, 255, 0.15)', borderRadius: 18 },
  tabLabel: { fontSize: 9.5, fontWeight: '700', marginTop: 3, textAlign: 'center' },

  // ── Inicio (igual al cliente) ─────────────────────────────────
  iniContainer: { padding: 20, paddingTop: 56, paddingBottom: 150 },
  iniHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  rfRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 4 },
  rfR: { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: 2 },
  rfF: { fontSize: 22, fontWeight: '900', color: '#4488ff', letterSpacing: 2 },
  iniProgramaNombre: { fontSize: 11, color: '#2a4488', letterSpacing: 1, fontWeight: '600' },
  iniBellBtn: { padding: 10, borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 12, backgroundColor: '#05050f' },
  iniPerfilCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#05050f', borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 16, padding: 14, marginBottom: 16 },
  iniPerfilAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#0a1a3f', borderWidth: 1, borderColor: '#1a3aff', justifyContent: 'center', alignItems: 'center' },
  iniPerfilAvatarText: { color: '#4488ff', fontSize: 17, fontWeight: '900' },
  iniPerfilNombre: { color: '#fff', fontSize: 15, fontWeight: '900', marginBottom: 5 },
  iniPerfilSubRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  iniPerfilSub: { color: '#4488ff', fontSize: 10, fontWeight: '700', backgroundColor: '#0a1535', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
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
  iniCardHoyTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  iniCardHoyLabel: { fontSize: 10, color: '#2a4488', letterSpacing: 2, fontWeight: '700', marginBottom: 6 },
  iniCardHoyTitulo: { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 4 },
  iniCardHoySub: { fontSize: 13, color: '#2a4488' },
  iniSection: { marginBottom: 16 },
  iniSectionLabel: { fontSize: 10, color: '#2a4488', letterSpacing: 3, fontWeight: '800', marginBottom: 8 },
  iniSemanaCard: { backgroundColor: '#05050f', borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 16, padding: 16 },

  // ── Coach badges ──────────────────────────────────────────────
  coachBadge: { backgroundColor: '#1a3aff22', borderWidth: 1, borderColor: '#1a3aff', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, marginLeft: 6, alignSelf: 'flex-start' },
  coachBadgeText: { color: '#4488ff', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },

  // ── Clientes ─────────────────────────────────────────────────
  fusionCard: { backgroundColor: '#05050f', borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 18, padding: 18, marginBottom: 20 },
  clienteCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#05050f', borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 16, padding: 16, marginBottom: 10 },
  clienteCardMini: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#08080f', borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 14, padding: 12 },
  clienteTag: { backgroundColor: '#1a3aff11', borderWidth: 1, borderColor: '#1a3aff33', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  clienteTagText: { color: '#4488ff', fontSize: 10, fontWeight: '700' },
  codigoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  codigoCodigo: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 4 },
  filtroChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: '#0f1a3a', backgroundColor: '#08080f' },
  codigoAccionBtn: { width: 34, height: 34, borderRadius: 9, borderWidth: 1, borderColor: '#0f1a3a', backgroundColor: '#0a0a1f', justifyContent: 'center', alignItems: 'center' },
  accionBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#08080f', borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 14, padding: 16 },
  accionBtnText: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '700' },

  // ── Ajustes (idéntico al cliente) ─────────────────────────────
  ajustesOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  ajustesContainer: { backgroundColor: '#05050f', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderColor: '#0f1a3a', paddingHorizontal: 20, paddingBottom: 40, maxHeight: '90%' },
  ajustesHandle: { width: 40, height: 4, backgroundColor: '#1a2a5a', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  ajustesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#0f1a3a', marginBottom: 20 },
  ajustesTitulo: { fontSize: 20, fontWeight: '900', color: '#fff' },
  ajustesCerrarBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#0a0a1f', borderWidth: 1, borderColor: '#0f1a3a', justifyContent: 'center', alignItems: 'center' },
  ajustesSectionLabel: { color: '#2a4488', fontSize: 10, fontWeight: '800', letterSpacing: 2, marginBottom: 8, marginTop: 4 },
  ajustesCard: { backgroundColor: '#080812', borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 16, marginBottom: 20, overflow: 'hidden' },
  ajustesPerfilRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  ajustesAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#0a1a3f', borderWidth: 2, borderColor: '#1a3aff', justifyContent: 'center', alignItems: 'center' },
  ajustesAvatarText: { color: '#4488ff', fontSize: 20, fontWeight: '900' },
  ajustesNombre: { color: '#fff', fontSize: 16, fontWeight: '800', marginBottom: 2 },
  ajustesEditBtn: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, borderColor: '#0f1a3a', backgroundColor: '#0a0a1f', justifyContent: 'center', alignItems: 'center' },
  ajustesEditForm: { borderTopWidth: 1, borderTopColor: '#0f1a3a', padding: 20, gap: 14, backgroundColor: '#04040e' },
  ajustesEditRow: { flexDirection: 'row', gap: 12 },
  ajustesEditLabel: { color: '#3a5aaa', fontSize: 9, fontWeight: '900', letterSpacing: 2, marginBottom: 8, textTransform: 'uppercase' },
  ajustesEditInput: { backgroundColor: '#08091a', borderWidth: 1.5, borderColor: '#0f1e40', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, color: '#fff', fontSize: 15, fontWeight: '600' },
  ajustesEditChipLg: { paddingHorizontal: 14, paddingVertical: 11, borderRadius: 12, borderWidth: 1.5, borderColor: '#0f1e40', backgroundColor: '#08091a' },
  ajustesGuardarBtn: { borderRadius: 16, overflow: 'hidden' },
  ajustesGuardarGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, paddingHorizontal: 24 },
  ajustesGuardarText: { color: '#fff', fontWeight: '900', fontSize: 15, letterSpacing: 0.5 },
  ajustesRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  ajustesRowText: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '600' },
  ajustesVersion: { color: '#1a2a5a', fontSize: 11, textAlign: 'center', marginTop: 8, marginBottom: 20 },
})
