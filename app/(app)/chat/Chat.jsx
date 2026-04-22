// ============================================
// CHAT — Mensajería coach ↔ cliente
// app/(app)/chat/chat.jsx
// ============================================
import { useState, useEffect, useCallback, useRef, useContext } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import {
  View, Text, StyleSheet, ScrollView,
  TextInput, Image, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, Animated, PanResponder
} from 'react-native'
import { TouchableOpacity, Pressable } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { AntDesign } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import AppleBentoCard from '../../../components/AppleBentoCard'
import { supabase } from '../../../lib/supabase'
import { CoachThemeContext, hexToRgb } from '../../../lib/coachTheme'
import { enviarPushMensaje } from '../../../lib/notifications'

function Avatar({ nombre, foto, size = 40, accentColor = '#4488ff' }) {
  const acRgb = hexToRgb(accentColor)
  if (foto) return <Image source={{ uri: foto }} style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 1.5, borderColor: `rgba(${acRgb},0.4)` }} />
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: `rgba(${acRgb},0.10)`, borderWidth: 1.5, borderColor: `rgba(${acRgb},0.35)`, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: accentColor, fontWeight: '900', fontSize: size * 0.38 }}>{nombre?.[0]?.toUpperCase() || '?'}</Text>
    </View>
  )
}

function tiempoRelativo(fecha) {
  const diff = (Date.now() - new Date(fecha)) / 1000
  if (diff < 60) return 'Ahora'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return new Date(fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}

// ── Lista de conversaciones ───────────────────────────────────
function ListaConversaciones({ userId, esCoach, onSeleccionar, showHeader = true }) {
  const { accentColor, gradColors } = useContext(CoachThemeContext)
  const styles = createStyles(accentColor, hexToRgb(accentColor), gradColors[0])
  const [conversaciones, setConversaciones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [perfil, setPerfil] = useState(null)

  useFocusEffect(useCallback(() => {
    cargar()
    // Suscripción tiempo real — actualizar cuando llega nuevo mensaje
    const canal = supabase
      .channel(`inbox_${userId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'mensajes'
      }, payload => {
        if (payload.new.emisor_id === userId || payload.new.receptor_id === userId) {
          cargar()
        }
      })
      .subscribe()
    return () => supabase.removeChannel(canal)
  }, []))

  async function cargar() {
    const { data: p } = await supabase.from('perfiles').select('*').eq('id', userId).single()
    if (p) setPerfil(p)

    if (esCoach) {
      const { data: clientes } = await supabase
        .from('perfiles')
        .select('id, nombre_completo, avatar_url, rol')
        .eq('coach_id', userId)

      const convs = await Promise.all((clientes || []).map(async cliente => {
        const { data: msgs } = await supabase
          .from('mensajes')
          .select('contenido, creado_en, leido, emisor_id')
          .or(`and(emisor_id.eq.${userId},receptor_id.eq.${cliente.id}),and(emisor_id.eq.${cliente.id},receptor_id.eq.${userId})`)
          .order('creado_en', { ascending: false })
          .limit(1)
        const { count } = await supabase
          .from('mensajes')
          .select('id', { count: 'exact', head: true })
          .eq('receptor_id', userId)
          .eq('emisor_id', cliente.id)
          .eq('leido', false)
        return { ...cliente, ultimoMensaje: msgs?.[0], noLeidos: count || 0 }
      }))
      setConversaciones(convs)
    } else {
      if (p?.coach_id) {
        const { data: coach, error: errCoach } = await supabase
          .from('perfiles').select('id, nombre_completo, avatar_url, rol').eq('id', p.coach_id).single()
        if (errCoach) {}

        const { data: msgs, error: errMsgs } = await supabase
          .from('mensajes')
          .select('contenido, creado_en, leido, emisor_id')
          .or(`and(emisor_id.eq.${userId},receptor_id.eq.${p.coach_id}),and(emisor_id.eq.${p.coach_id},receptor_id.eq.${userId})`)
          .order('creado_en', { ascending: false })
          .limit(1)
        if (errMsgs) {}

        const { count, error: errCount } = await supabase
          .from('mensajes')
          .select('id', { count: 'exact', head: true })
          .eq('receptor_id', userId)
          .eq('emisor_id', p.coach_id)
          .eq('leido', false)
        if (errCount) {}

        if (coach) {
          setConversaciones([{ ...coach, ultimoMensaje: msgs?.[0], noLeidos: count || 0 }])
        } else {
        }
      } else {
      }
    }
    setCargando(false)
  }

  if (cargando) return (
    <LinearGradient colors={gradColors} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator color={accentColor} size="large" />
    </LinearGradient>
  )

  const sinCoach = !esCoach && !perfil?.coach_id

  return (
    <View style={{ flex: 1 }}>
      {showHeader && (
        <View style={[styles.header, { paddingHorizontal: 20 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {perfil?.team_logo_url ? (
              <Image source={{ uri: perfil.team_logo_url }} style={{ width: 44, height: 44, borderRadius: 12 }} />
            ) : (
              <View style={[styles.emptyIcon, { width: 44, height: 44, borderRadius: 12 }]}>
                <AntDesign name="message" size={20} color={accentColor} />
              </View>
            )}
            <View>
              <Text style={styles.rfR}>{perfil?.team_name || 'Mensajes'}</Text>
              <Text style={styles.headerSub}>BANDEJA DE ENTRADA</Text>
            </View>
          </View>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}
        contentInset={{ bottom: 100 }} scrollIndicatorInsets={{ bottom: 100 }}>

        {sinCoach ? (
          <View style={{ alignItems: 'center', paddingVertical: 60, gap: 16 }}>
            <View style={styles.emptyIcon}>
              <AntDesign name="message" size={32} color={accentColor} />
            </View>
            <Text style={styles.emptyTitle}>Sin coach asignado</Text>
            <Text style={styles.emptySub}>
              Únete a un coach desde Ajustes para poder enviarle mensajes directos y recibir seguimiento personalizado.
            </Text>
          </View>
        ) : conversaciones.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 60, gap: 16 }}>
            <View style={styles.emptyIcon}>
              <AntDesign name="message" size={32} color={accentColor} />
            </View>
            <Text style={styles.emptyTitle}>{esCoach ? 'Sin clientes aún' : 'Sin mensajes'}</Text>
            <Text style={styles.emptySub}>
              {esCoach ? 'Los chats con tus clientes aparecerán aquí automáticamente' : 'Tu conversación con el coach aparecerá aquí'}
            </Text>
          </View>
        ) : (
          conversaciones.map(conv => (
            <TouchableOpacity
              key={conv.id}
              style={styles.convCard}
              onPress={() => onSeleccionar(conv)}
              activeOpacity={0.85}
            >
              <View style={{ position: 'relative' }}>
                <Avatar nombre={conv.nombre_completo} foto={conv.avatar_url} size={52} accentColor={accentColor} />
                {conv.noLeidos > 0 && (
                  <View style={styles.badge}>
                    <Text style={{ color: '#fff', fontSize: 9, fontWeight: '900' }}>{conv.noLeidos}</Text>
                  </View>
                )}
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <Text style={[styles.convNombre, conv.noLeidos > 0 && styles.convNombreActivo]}>
                    {conv.nombre_completo || 'Usuario'}
                  </Text>
                  {conv.ultimoMensaje && (
                    <Text style={styles.convTime}>{tiempoRelativo(conv.ultimoMensaje.creado_en)}</Text>
                  )}
                </View>
                <Text numberOfLines={1} style={[styles.convPreview, conv.noLeidos > 0 && styles.convPreviewActivo]}>
                  {conv.ultimoMensaje
                    ? (conv.ultimoMensaje.emisor_id === userId ? 'Tú: ' : '') + conv.ultimoMensaje.contenido
                    : 'Sin mensajes aún — ¡saluda!'}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  )
}

// ── Conversación individual ───────────────────────────────────
function ChatConversacion({ userId, interlocutor, onVolver }) {
  const { accentColor, gradColors } = useContext(CoachThemeContext)
  const styles = createStyles(accentColor, hexToRgb(accentColor), gradColors[0])
  const [mensajes, setMensajes] = useState([])
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const scrollRef = useRef(null)

  // PanResponder para swipe en el header
  const headerPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, { dy }) => dy > 8,
      onPanResponderRelease: (_, { dy, vy }) => {
        if (dy > 40 || vy > 0.5) {
          onVolver()
        }
      },
    })
  ).current

  useEffect(() => {
    cargarMensajes()
    marcarLeidos()

    const canal = supabase
      .channel(`chat_${[userId, interlocutor.id].sort().join('_')}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'mensajes'
      }, payload => {
        const m = payload.new
        if ((m.emisor_id === userId && m.receptor_id === interlocutor.id) ||
          (m.emisor_id === interlocutor.id && m.receptor_id === userId)) {
          setMensajes(prev => {
            if (prev.some(msg => msg.id === m.id)) return prev
            return [...prev, m]
          })
          setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80)
          if (m.emisor_id === interlocutor.id) marcarLeidos()
        }
      })
      .subscribe()

    return () => supabase.removeChannel(canal)
  }, [interlocutor.id])

  async function cargarMensajes() {
    const { data } = await supabase
      .from('mensajes')
      .select('*')
      .or(`and(emisor_id.eq.${userId},receptor_id.eq.${interlocutor.id}),and(emisor_id.eq.${interlocutor.id},receptor_id.eq.${userId})`)
      .order('creado_en', { ascending: true })
      .limit(100)
    setMensajes(data || [])
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 150)
  }

  async function marcarLeidos() {
    await supabase.from('mensajes')
      .update({ leido: true })
      .eq('receptor_id', userId)
      .eq('emisor_id', interlocutor.id)
      .eq('leido', false)
  }

  async function enviar() {
    if (!texto.trim() || enviando) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    const txt = texto.trim()
    const ahora = new Date().toISOString()
    const tempId = 'temp_' + Date.now()
    setTexto('')
    // Optimista — mostrar inmediatamente
    setMensajes(prev => [...prev, {
      id: tempId, emisor_id: userId, receptor_id: interlocutor.id,
      contenido: txt, creado_en: ahora, leido: false,
    }])
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50)
    setEnviando(true)
    const { data, error } = await supabase.from('mensajes').insert({
      emisor_id: userId,
      receptor_id: interlocutor.id,
      contenido: txt,
      creado_en: ahora,
      leido: false,
    }).select().single()

    if (error) {
      // Remover el mensaje falso si falla
      setMensajes(prev => prev.filter(m => m.id !== tempId))
      Alert.alert('Error al enviar', error.message || 'No se pudo guardar el mensaje. Intenta de nuevo.')
    } else if (data) {
      // Reemplazar el mensaje temporal con el real (o quitar el temporal si el Realtime ya puso el real)
      setMensajes(prev => {
        if (prev.some(m => m.id === data.id)) return prev.filter(m => m.id !== tempId)
        return prev.map(m => m.id === tempId ? data : m)
      })
      enviarPushMensaje(interlocutor.id, userId, txt)
    }
    setEnviando(false)
  }

  // Separadores de fecha entre mensajes
  const itemsConFecha = []
  let fechaAnterior = null
  mensajes.forEach(msg => {
    const f = new Date(msg.creado_en).toDateString()
    if (f !== fechaAnterior) {
      itemsConFecha.push({ tipo: 'fecha', fecha: new Date(msg.creado_en), key: 'f_' + msg.id })
      fechaAnterior = f
    }
    itemsConFecha.push({ tipo: 'msg', ...msg })
  })

  return (
    <LinearGradient colors={gradColors} style={{ flex: 1 }}>
      {/* Header con swipe */}
      <View style={styles.chatHeader} {...headerPan.panHandlers}>
        <TouchableOpacity onPress={onVolver} style={{ padding: 10 }}>
          <AntDesign name="left" size={20} color={accentColor} />
        </TouchableOpacity>
        <Avatar nombre={interlocutor.nombre_completo} foto={interlocutor.avatar_url} size={38} accentColor={accentColor} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.chatHeaderName}>{interlocutor.nombre_completo}</Text>
          <Text style={styles.chatHeaderRole}>
            {interlocutor.rol === 'coach' ? '🏋️ Tu coach' : interlocutor.rol === 'cliente' ? '👤 Cliente' : '💬 Conversación'}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {itemsConFecha.map(item => {
            if (item.tipo === 'fecha') return (
              <View key={item.key} style={{ alignItems: 'center', marginVertical: 14 }}>
                <Text style={styles.dateSep}>
                  {item.fecha.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
                </Text>
              </View>
            )
            const esMio = item.emisor_id === userId
            return (
              <View key={item.id} style={{ flexDirection: 'row', justifyContent: esMio ? 'flex-end' : 'flex-start', marginBottom: 6, alignItems: 'flex-end', gap: 6 }}>
                {!esMio && <Avatar nombre={interlocutor.nombre_completo} foto={interlocutor.avatar_url} size={28} accentColor={accentColor} />}
                <View style={[styles.burbuja, esMio ? styles.burbujaMia : styles.burbujaOtro, { maxWidth: '75%' }]}>
                  <Text style={[styles.msgText, { color: esMio ? '#fff' : '#ddeeff' }]}>{item.contenido}</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 4, marginTop: 4 }}>
                    <Text style={[styles.msgTime, { color: esMio ? 'rgba(255,255,255,0.5)' : '#8E8E93' }]}>
                      {new Date(item.creado_en).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    {esMio && (
                      <AntDesign
                        name={item.leido ? 'check' : 'check'}
                        size={11}
                        color={item.leido ? '#00cc44' : 'rgba(255,255,255,0.4)'}
                      />
                    )}
                  </View>
                </View>
              </View>
            )
          })}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.inputBox}
            value={texto}
            onChangeText={setTexto}
            placeholder="Escribe un mensaje..."
            placeholderTextColor="#4a4a6a"
            multiline maxLength={500}
          />
          <Pressable
            onPress={enviar}
            disabled={!texto.trim() || enviando}
            style={({ pressed }) => [styles.sendBtn, { opacity: texto.trim() ? (pressed ? 0.8 : 1) : 0.3 }]}
          >
            <LinearGradient colors={[accentColor, gradColors[1]]} style={styles.sendGradient}>
              <AntDesign name="arrow-up" size={19} color="#fff" />
            </LinearGradient>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  )
}

// ── Exportado principal ───────────────────────────────────────
export default function Chat({ userId, esCoach = false, interlocutorInicial = null }) {
  const [seleccionado, setSeleccionado] = useState(interlocutorInicial)

  // Si cambia interlocutorInicial desde fuera (ej. coach abre chat con cliente específico)
  useEffect(() => {
    if (interlocutorInicial) setSeleccionado(interlocutorInicial)
  }, [interlocutorInicial?.id])

  if (seleccionado) {
    return <ChatConversacion userId={userId} interlocutor={seleccionado} onVolver={() => setSeleccionado(null)} />
  }
  return <ListaConversaciones userId={userId} esCoach={esCoach} showHeader={!esCoach} onSeleccionar={(conv) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSeleccionado(conv) }} />
}

function createStyles(accent, acRgb, bg0) {
  return StyleSheet.create({
    container: { padding: 20, paddingTop: 16, paddingBottom: 130 },
    header: { paddingVertical: 16, marginBottom: 0 },
    rfRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 4 },
    rfR: { fontSize: 24, fontWeight: '900', color: '#fff', letterSpacing: 1 },
    rfF: { fontSize: 24, fontWeight: '900', color: accent, letterSpacing: 1 },
    headerSub: { color: '#8E8E93', fontSize: 11, letterSpacing: 1, fontWeight: '600' },
    emptyIcon: { width: 72, height: 72, borderRadius: 20, backgroundColor: `rgba(${acRgb},0.08)`, borderWidth: 1.5, borderColor: `rgba(${acRgb},0.35)`, justifyContent: 'center', alignItems: 'center' },
    emptyTitle: { color: '#fff', fontSize: 20, fontWeight: '900' },
    emptySub: { color: '#8E8E93', fontSize: 13, textAlign: 'center', paddingHorizontal: 32, lineHeight: 21 },
    convCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 20, padding: 16, marginBottom: 10, overflow: 'hidden' },
    convNombre: { color: '#fff', fontSize: 15, fontWeight: '700' },
    convNombreActivo: { fontWeight: '900' },
    convTime: { color: '#8E8E93', fontSize: 11 },
    convPreview: { color: '#8E8E93', fontSize: 13 },
    convPreviewActivo: { color: '#aabbdd' },
    badge: { position: 'absolute', top: -3, right: -3, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#ff3355', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: '#000' },
    chatHeader: { flexDirection: 'row', alignItems: 'center', paddingTop: 16, paddingHorizontal: 12, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)', backgroundColor: bg0 + 'f2' },
    chatHeaderName: { color: '#fff', fontSize: 15, fontWeight: '900' },
    chatHeaderRole: { color: '#8E8E93', fontSize: 11 },
    burbuja: { borderRadius: 20, paddingHorizontal: 15, paddingVertical: 11 },
    burbujaMia: { backgroundColor: accent, borderBottomRightRadius: 5 },
    burbujaOtro: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderBottomLeftRadius: 5 },
    dateSep: { color: '#8E8E93', fontSize: 11, fontWeight: '700', backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 14, paddingVertical: 5, borderRadius: 10 },
    msgText: { fontSize: 14, lineHeight: 21 },
    msgTime: { fontSize: 10 },
    inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 14, paddingVertical: 12, paddingBottom: 28, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', backgroundColor: bg0 + 'f2' },
    inputBox: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 11, color: '#fff', fontSize: 14, maxHeight: 100 },
    sendBtn: { borderRadius: 22, overflow: 'hidden' },
    sendGradient: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  })
}
