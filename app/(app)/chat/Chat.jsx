// ============================================
// CHAT — Mensajería coach ↔ cliente
// app/(app)/chat/chat.jsx
// ============================================
import { useState, useEffect, useCallback, useRef } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Image, Pressable, KeyboardAvoidingView, Platform,
  ActivityIndicator
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { AntDesign } from '@expo/vector-icons'
import { supabase } from '../../../lib/supabase'

function Avatar({ nombre, foto, size = 40 }) {
  if (foto) return <Image source={{ uri: foto }} style={{ width: size, height: size, borderRadius: size/2, borderWidth: 1.5, borderColor: '#1a3aff' }} />
  return (
    <View style={{ width: size, height: size, borderRadius: size/2, backgroundColor: '#0a1a3f', borderWidth: 1.5, borderColor: '#1a3aff', justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: '#4488ff', fontWeight: '900', fontSize: size * 0.38 }}>{nombre?.[0]?.toUpperCase() || '?'}</Text>
    </View>
  )
}

function tiempoRelativo(fecha) {
  const diff = (Date.now() - new Date(fecha)) / 1000
  if (diff < 60) return 'Ahora'
  if (diff < 3600) return `${Math.floor(diff/60)}m`
  if (diff < 86400) return `${Math.floor(diff/3600)}h`
  return new Date(fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}

// ── Lista de conversaciones ───────────────────────────────────
function ListaConversaciones({ userId, esCoach, onSeleccionar }) {
  const [conversaciones, setConversaciones] = useState([])
  const [cargando, setCargando]             = useState(true)
  const [perfil, setPerfil]                 = useState(null)

  useFocusEffect(useCallback(() => {
    cargar()
    // Suscripción tiempo real — actualizar cuando llega nuevo mensaje
    const canal = supabase
      .channel(`inbox_${userId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'mensajes',
        filter: `receptor_id=eq.${userId}`
      }, () => cargar())
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
          .select('texto, creado_en, leido, emisor_id')
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
        const { data: coach } = await supabase
          .from('perfiles').select('id, nombre_completo, avatar_url, rol').eq('id', p.coach_id).single()
        const { data: msgs } = await supabase
          .from('mensajes')
          .select('texto, creado_en, leido, emisor_id')
          .or(`and(emisor_id.eq.${userId},receptor_id.eq.${p.coach_id}),and(emisor_id.eq.${p.coach_id},receptor_id.eq.${userId})`)
          .order('creado_en', { ascending: false })
          .limit(1)
        const { count } = await supabase
          .from('mensajes')
          .select('id', { count: 'exact', head: true })
          .eq('receptor_id', userId)
          .eq('emisor_id', p.coach_id)
          .eq('leido', false)
        if (coach) setConversaciones([{ ...coach, ultimoMensaje: msgs?.[0], noLeidos: count || 0 }])
      }
    }
    setCargando(false)
  }

  if (cargando) return (
    <LinearGradient colors={['#000000', '#050510', '#0a0a1f']} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator color="#4488ff" size="large" />
    </LinearGradient>
  )

  const sinCoach = !esCoach && !perfil?.coach_id

  return (
    <LinearGradient colors={['#000000', '#050510', '#0a0a1f']} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}
        contentInset={{ bottom: 100 }} scrollIndicatorInsets={{ bottom: 100 }}>

        <View style={styles.header}>
          <View style={styles.rfRow}>
            <Text style={styles.rfR}>REP</Text><Text style={styles.rfF}>FORGE</Text>
          </View>
          <Text style={styles.headerSub}>Mensajes</Text>
        </View>

        {sinCoach ? (
          <View style={{ alignItems: 'center', paddingVertical: 60, gap: 16 }}>
            <View style={styles.emptyIcon}>
              <AntDesign name="message1" size={32} color="#4488ff" />
            </View>
            <Text style={styles.emptyTitle}>Sin coach asignado</Text>
            <Text style={styles.emptySub}>
              Únete a un coach desde Ajustes para poder enviarle mensajes directos y recibir seguimiento personalizado.
            </Text>
          </View>
        ) : conversaciones.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 60, gap: 16 }}>
            <View style={styles.emptyIcon}>
              <AntDesign name="message1" size={32} color="#1a2a5a" />
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
              activeOpacity={0.8}
            >
              <View style={{ position: 'relative' }}>
                <Avatar nombre={conv.nombre_completo} foto={conv.avatar_url} size={52} />
                {conv.noLeidos > 0 && (
                  <View style={styles.badge}>
                    <Text style={{ color: '#fff', fontSize: 9, fontWeight: '900' }}>{conv.noLeidos}</Text>
                  </View>
                )}
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: conv.noLeidos > 0 ? '900' : '700' }}>
                    {conv.nombre_completo || 'Usuario'}
                  </Text>
                  {conv.ultimoMensaje && (
                    <Text style={{ color: '#1a2a5a', fontSize: 11 }}>{tiempoRelativo(conv.ultimoMensaje.creado_en)}</Text>
                  )}
                </View>
                <Text numberOfLines={1} style={{ color: conv.noLeidos > 0 ? '#aabbdd' : '#2a4488', fontSize: 13 }}>
                  {conv.ultimoMensaje
                    ? (conv.ultimoMensaje.emisor_id === userId ? 'Tú: ' : '') + conv.ultimoMensaje.texto
                    : 'Sin mensajes aún — ¡saluda!'}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </LinearGradient>
  )
}

// ── Conversación individual ───────────────────────────────────
function ChatConversacion({ userId, interlocutor, onVolver }) {
  const [mensajes, setMensajes] = useState([])
  const [texto, setTexto]       = useState('')
  const [enviando, setEnviando] = useState(false)
  const scrollRef               = useRef(null)

  useEffect(() => {
    cargarMensajes()
    marcarLeidos()

    const canal = supabase
      .channel(`chat_${[userId, interlocutor.id].sort().join('_')}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'mensajes',
        filter: `or(and(emisor_id=eq.${userId},receptor_id=eq.${interlocutor.id}),and(emisor_id=eq.${interlocutor.id},receptor_id=eq.${userId}))`
      }, payload => {
        setMensajes(prev => [...prev, payload.new])
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80)
        if (payload.new.emisor_id === interlocutor.id) marcarLeidos()
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
    const txt = texto.trim()
    const ahora = new Date().toISOString()
    const tempId = 'temp_' + Date.now()
    setTexto('')
    // Optimista — mostrar inmediatamente
    setMensajes(prev => [...prev, {
      id: tempId, emisor_id: userId, receptor_id: interlocutor.id,
      texto: txt, creado_en: ahora, leido: false,
    }])
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50)
    setEnviando(true)
    const { data, error } = await supabase.from('mensajes').insert({
      emisor_id:   userId,
      receptor_id: interlocutor.id,
      texto:       txt,
      creado_en:   ahora,
      leido:       false,
    }).select().single()
    // Reemplazar el mensaje temporal con el real
    if (data) {
      setMensajes(prev => prev.map(m => m.id === tempId ? data : m))
    }
    setEnviando(false)
  }

  // Separadores de fecha entre mensajes
  const itemsConFecha = []
  let fechaAnterior   = null
  mensajes.forEach(msg => {
    const f = new Date(msg.creado_en).toDateString()
    if (f !== fechaAnterior) {
      itemsConFecha.push({ tipo: 'fecha', fecha: new Date(msg.creado_en), key: 'f_' + msg.id })
      fechaAnterior = f
    }
    itemsConFecha.push({ tipo: 'msg', ...msg })
  })

  return (
    <LinearGradient colors={['#000000', '#050510', '#0a0a1f']} style={{ flex: 1 }}>
      {/* Header */}
      <View style={styles.chatHeader}>
        <TouchableOpacity onPress={onVolver} style={{ padding: 10 }}>
          <AntDesign name="left" size={20} color="#4488ff" />
        </TouchableOpacity>
        <Avatar nombre={interlocutor.nombre_completo} foto={interlocutor.avatar_url} size={38} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: '900' }}>{interlocutor.nombre_completo}</Text>
          <Text style={{ color: '#2a4488', fontSize: 11 }}>
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
                <Text style={{ color: '#1a2a5a', fontSize: 11, fontWeight: '700', backgroundColor: '#08080f', paddingHorizontal: 14, paddingVertical: 5, borderRadius: 10 }}>
                  {item.fecha.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
                </Text>
              </View>
            )
            const esMio = item.emisor_id === userId
            return (
              <View key={item.id} style={{ flexDirection: 'row', justifyContent: esMio ? 'flex-end' : 'flex-start', marginBottom: 6, alignItems: 'flex-end', gap: 6 }}>
                {!esMio && <Avatar nombre={interlocutor.nombre_completo} foto={interlocutor.avatar_url} size={28} />}
                <View style={[styles.burbuja, esMio ? styles.burbujaMia : styles.burbujaOtro, { maxWidth: '75%' }]}>
                  <Text style={{ color: esMio ? '#fff' : '#ddeeff', fontSize: 14, lineHeight: 21 }}>{item.texto}</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 4, marginTop: 4 }}>
                    <Text style={{ color: esMio ? 'rgba(255,255,255,0.5)' : '#2a4488', fontSize: 10 }}>
                      {new Date(item.creado_en).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    {esMio && (
                      <AntDesign
                        name={item.leido ? 'checkcircle' : 'checkcircleo'}
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
            placeholderTextColor="#2a2a4a"
            multiline maxLength={500}
          />
          <Pressable
            onPress={enviar}
            disabled={!texto.trim() || enviando}
            style={({ pressed }) => [styles.sendBtn, { opacity: texto.trim() ? (pressed ? 0.8 : 1) : 0.3 }]}
          >
            <LinearGradient colors={['#1a3aff', '#0022cc']} style={styles.sendGradient}>
              <AntDesign name="arrowup" size={19} color="#fff" />
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
  return <ListaConversaciones userId={userId} esCoach={esCoach} onSeleccionar={setSeleccionado} />
}

const styles = StyleSheet.create({
  container:  { padding: 20, paddingTop: 56, paddingBottom: 130 },
  header:     { marginBottom: 20 },
  rfRow:      { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 4 },
  rfR:        { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: 2 },
  rfF:        { fontSize: 22, fontWeight: '900', color: '#4488ff', letterSpacing: 2 },
  headerSub:  { color: '#2a4488', fontSize: 11, letterSpacing: 1, fontWeight: '600' },
  emptyIcon:  { width: 72, height: 72, borderRadius: 20, backgroundColor: '#05051f', borderWidth: 1.5, borderColor: '#1a3aff', justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { color: '#fff', fontSize: 20, fontWeight: '900' },
  emptySub:   { color: '#2a4488', fontSize: 13, textAlign: 'center', paddingHorizontal: 32, lineHeight: 21 },
  convCard:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#05050f', borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 18, padding: 16, marginBottom: 10 },
  badge:      { position: 'absolute', top: -3, right: -3, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#ff3355', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: '#000' },
  chatHeader: { flexDirection: 'row', alignItems: 'center', paddingTop: 52, paddingHorizontal: 12, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#0f1a3a', backgroundColor: '#000' },
  burbuja:    { borderRadius: 20, paddingHorizontal: 15, paddingVertical: 11 },
  burbujaMia: { backgroundColor: '#1a3aff', borderBottomRightRadius: 5 },
  burbujaOtro:{ backgroundColor: '#08080f', borderWidth: 1, borderColor: '#0f1a3a', borderBottomLeftRadius: 5 },
  inputRow:   { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 14, paddingVertical: 12, paddingBottom: 28, borderTopWidth: 1, borderTopColor: '#0f1a3a', backgroundColor: '#000' },
  inputBox:   { flex: 1, backgroundColor: '#08091a', borderWidth: 1.5, borderColor: '#0f1e40', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 11, color: '#fff', fontSize: 14, maxHeight: 100 },
  sendBtn:    { borderRadius: 22, overflow: 'hidden' },
  sendGradient: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
})
