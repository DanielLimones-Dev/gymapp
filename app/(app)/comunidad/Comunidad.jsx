// ============================================
// COMUNIDAD — Feed tipo red social
// app/(app)/Comunidad/comunidad.jsx
// ============================================
import { useState, useCallback, useRef, useEffect } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Modal, Image, Alert, Pressable,
  KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { AntDesign } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '../../../lib/supabase'

const SUPABASE_URL = 'https://vlnmhwaadyejdnmgktjt.supabase.co'
const SUPABASE_ANON = 'sb_publishable_ZHJhHtk3REmxd3EblLt6NA_9YIsoiSb'

// ── Íconos por tipo (solo íconos válidos de AntDesign) ────────
const TIPOS = [
  { key: 'aviso',      label: 'Aviso',      icon: 'bell',     color: '#4488ff'  },
  { key: 'logro',      label: 'Logro',       icon: 'download',    color: '#ff9900'  },
  { key: 'tip',        label: 'Tip',         icon: 'bulb1',     color: '#00cc44'  },
  { key: 'motivacion', label: 'Motivación',  icon: 'heart',     color: '#ff3355'  },
  { key: 'foto',       label: 'Foto/Video',  icon: 'camera',    color: '#9933ff'  },
]

// Íconos garantizados para cada tipo
const TIPO_ICON = {
  aviso:      { icon: 'bell',      color: '#4488ff'  },
  logro:      { icon: 'star',      color: '#ff9900'  },
  tip:        { icon: 'info',      color: '#00cc44'  },
  motivacion: { icon: 'heart',     color: '#ff3355'  },
  foto:       { icon: 'camera',    color: '#9933ff'  },
}

function Avatar({ nombre, foto, size = 38 }) {
  if (foto) return <Image source={{ uri: foto }} style={{ width: size, height: size, borderRadius: size/2, borderWidth: 1, borderColor: '#1a3aff' }} />
  return (
    <View style={{ width: size, height: size, borderRadius: size/2, backgroundColor: '#0a1a3f', borderWidth: 1, borderColor: '#1a3aff', justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: '#4488ff', fontWeight: '900', fontSize: size * 0.38 }}>{nombre?.[0]?.toUpperCase() || '?'}</Text>
    </View>
  )
}

function tiempoRelativo(fecha) {
  const diff = (Date.now() - new Date(fecha)) / 1000
  if (diff < 60) return 'Ahora'
  if (diff < 3600) return `Hace ${Math.floor(diff/60)} min`
  if (diff < 86400) return `Hace ${Math.floor(diff/3600)} h`
  if (diff < 604800) return `Hace ${Math.floor(diff/86400)} días`
  return new Date(fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}

// ── Card de publicación ───────────────────────────────────────
function PublicacionCard({ pub, userId, esCoach, onLike, onComentar, onEliminar, comentandoId, comentario, setComentario, onEnviarComentario }) {
  const tipo = TIPO_ICON[pub.tipo] || TIPO_ICON.aviso
  const yaLike = pub.mis_likes?.length > 0
  const numLikes = pub.likes_count?.[0]?.count || 0
  const numComs  = pub.comentarios_count?.[0]?.count || 0
  const comentandoEste = comentandoId === pub.id
  const esAutor = pub.autor_id === userId

  return (
    <View style={styles.pubCard}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <Avatar nombre={pub.autor?.nombre_completo} foto={pub.autor?.avatar_url} size={40} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800' }}>{pub.autor?.nombre_completo || 'Coach'}</Text>
          <Text style={{ color: '#2a4488', fontSize: 11 }}>{tiempoRelativo(pub.creado_en)}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: tipo.color + '44', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5, backgroundColor: tipo.color + '11' }}>
          <AntDesign name={tipo.icon} size={12} color={tipo.color} />
          <Text style={{ color: tipo.color, fontSize: 9, fontWeight: '900', letterSpacing: 1 }}>{pub.tipo?.toUpperCase()}</Text>
        </View>
        {esAutor && onEliminar && (
          <TouchableOpacity onPress={() => onEliminar(pub.id)} style={{ padding: 6 }}>
            <AntDesign name="delete" size={14} color="#ff3355" />
          </TouchableOpacity>
        )}
      </View>

      {/* Texto */}
      {pub.texto ? <Text style={styles.pubTexto}>{pub.texto}</Text> : null}

      {/* Media — foto o video */}
      {pub.media_url && (
        <Image
          source={{ uri: pub.media_url }}
          style={{ width: '100%', height: 220, borderRadius: 14, marginBottom: 14, backgroundColor: '#0a0a1f' }}
          resizeMode="cover"
        />
      )}

      {/* Acciones */}
      <View style={{ flexDirection: 'row', gap: 20, borderTopWidth: 1, borderTopColor: '#0f1a3a', paddingTop: 12 }}>
        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }} onPress={() => onLike(pub.id, yaLike)}>
          <AntDesign name="heart" size={17} color={yaLike ? '#ff3355' : '#2a4488'} />
          <Text style={{ color: yaLike ? '#ff3355' : '#2a4488', fontSize: 13, fontWeight: '700' }}>{numLikes > 0 ? numLikes : 'Me gusta'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }} onPress={() => onComentar(pub.id)}>
          <AntDesign name="message1" size={16} color={comentandoEste ? '#4488ff' : '#2a4488'} />
          <Text style={{ color: comentandoEste ? '#4488ff' : '#2a4488', fontSize: 13, fontWeight: '700' }}>{numComs > 0 ? numComs + ' comentarios' : 'Comentar'}</Text>
        </TouchableOpacity>
      </View>

      {/* Comentarios recientes */}
      {pub.comentarios_recientes?.length > 0 && (
        <View style={{ marginTop: 12, gap: 8 }}>
          {pub.comentarios_recientes.map(c => (
            <View key={c.id} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
              <Avatar nombre={c.autor?.nombre_completo} foto={c.autor?.avatar_url} size={26} />
              <View style={{ flex: 1, backgroundColor: '#08080f', borderRadius: 12, padding: 10 }}>
                <Text style={{ color: '#4488ff', fontSize: 11, fontWeight: '800', marginBottom: 2 }}>{c.autor?.nombre_completo}</Text>
                <Text style={{ color: '#aabbdd', fontSize: 13, lineHeight: 18 }}>{c.texto}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Input comentario */}
      {comentandoEste && (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, alignItems: 'center' }}>
          <TextInput
            style={{ flex: 1, backgroundColor: '#08091a', borderWidth: 1.5, borderColor: '#1a3aff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, color: '#fff', fontSize: 13 }}
            value={comentario}
            onChangeText={setComentario}
            placeholder="Escribe un comentario..."
            placeholderTextColor="#2a2a4a"
            autoFocus
          />
          <TouchableOpacity
            style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: '#1a3aff', justifyContent: 'center', alignItems: 'center' }}
            onPress={() => onEnviarComentario(pub.id)}
          >
            <AntDesign name="check" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

// ── Pantalla sin coach — splash con botón continuar ───────────
function SinCoachSplash({ publicaciones, userId, mostrarFeed, setMostrarFeed, onLike, onComentar, comentandoId, comentario, setComentario, onEnviarComentario }) {

  if (mostrarFeed) {
    return (
      <LinearGradient colors={['#000000', '#050510', '#0a0a1f']} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}
          contentInset={{ bottom: 100 }} scrollIndicatorInsets={{ bottom: 100 }}>
          <View style={styles.iniHeader}>
            <View style={styles.rfRow}>
              <Text style={styles.rfR}>REP</Text><Text style={styles.rfF}>FORGE</Text>
            </View>
            <Text style={{ color: '#2a4488', fontSize: 11, letterSpacing: 1, fontWeight: '600', marginTop: 2 }}>Comunidad</Text>
          </View>
          {publicaciones.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 60, gap: 14 }}>
              <View style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: '#05050f', borderWidth: 1.5, borderColor: '#0f1a3a', justifyContent: 'center', alignItems: 'center' }}>
                <AntDesign name="inbox" size={32} color="#1a2a5a" />
              </View>
              <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900' }}>Sin publicaciones</Text>
              <Text style={{ color: '#2a4488', fontSize: 13, textAlign: 'center', paddingHorizontal: 30, lineHeight: 20 }}>
                Aún no hay publicaciones de coaches. Vuelve más tarde.
              </Text>
            </View>
          ) : (
            publicaciones.map(pub => (
              <PublicacionCard
                key={pub.id} pub={pub} userId={userId} esCoach={false}
                onLike={onLike} onComentar={onComentar} onEliminar={null}
                comentandoId={comentandoId} comentario={comentario}
                setComentario={setComentario} onEnviarComentario={onEnviarComentario}
              />
            ))
          )}
        </ScrollView>
      </LinearGradient>
    )
  }

  return (
    <LinearGradient colors={['#000000', '#050510', '#0a0a1f']} style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
      <LinearGradient colors={['#05050f', '#0a0a1f']} style={{ width: '100%', borderRadius: 28, borderWidth: 1, borderColor: '#0f1a3a', padding: 32, alignItems: 'center' }}>
        <View style={{ width: 80, height: 80, borderRadius: 22, backgroundColor: '#05051f', borderWidth: 1.5, borderColor: '#1a3aff', justifyContent: 'center', alignItems: 'center', marginBottom: 22 }}>
          <AntDesign name="team" size={36} color="#4488ff" />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 8 }}>
          <Text style={[styles.rfR, { fontSize: 20 }]}>REP</Text>
          <Text style={[styles.rfF, { fontSize: 20 }]}>FORGE</Text>
          <Text style={{ color: '#4488ff', fontSize: 14, fontWeight: '900' }}> Comunidad</Text>
        </View>
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900', marginBottom: 12, textAlign: 'center' }}>
          Bienvenido a la comunidad
        </Text>
        <Text style={{ color: '#2a4488', fontSize: 13, textAlign: 'center', lineHeight: 22, marginBottom: 28 }}>
          Únete a un coach para ver su comunidad exclusiva, o explora las publicaciones públicas de entrenadores.
        </Text>

        <TouchableOpacity
          style={{ width: '100%', borderRadius: 16, overflow: 'hidden', marginBottom: 16 }}
          onPress={async () => {
            setMostrarFeed(true)
            try {
              const AsyncStorage = require('@react-native-async-storage/async-storage').default
              await AsyncStorage.setItem(`comunidad_feed_${userId}`, 'true')
            } catch(e) {}
          }}
          activeOpacity={0.85}
        >
          <LinearGradient colors={['#1a3aff', '#0022cc']} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 17 }}>
            <AntDesign name="team" size={18} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 15 }}>Ver publicaciones</Text>
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>
    </LinearGradient>
  )
}

// ── Componente principal exportado ────────────────────────────
export default function Comunidad({ userId, esCoach = false }) {
  const [publicaciones, setPublicaciones]     = useState([])
  const [perfil, setPerfil]                   = useState(null)
  const [coachId, setCoachId]                 = useState(null)
  const [cargando, setCargando]               = useState(true)
  const [modalNueva, setModalNueva]           = useState(false)
  const [nuevaPubli, setNuevaPubli]           = useState({ texto: '', tipo: 'aviso' })
  const [mediaPreview, setMediaPreview]       = useState(null)
  const [mediaUri, setMediaUri]               = useState(null)
  const [mediaType, setMediaType]             = useState(null) // 'image' | 'video'
  const [publicando, setPublicando]           = useState(false)
  const [comentandoId, setComentandoId]       = useState(null)
  const [pubAEliminar, setPubAEliminar]         = useState(null)
  const scrollRef = useRef(null)
  const [comentario, setComentario]           = useState('')

  // P1: Cerrar input comentario cuando el teclado se oculta
  useEffect(() => {
    const { Keyboard } = require('react-native')
    const sub = Keyboard.addListener('keyboardDidHide', () => setComentandoId(null))
    return () => sub.remove()
  }, [])
  const [mostrarFeedPublico, setMostrarFeedPublico] = useState(false)

  // Cargar preferencia guardada al montar
  useEffect(() => {
    async function cargarPreferencia() {
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default
        const val = await AsyncStorage.getItem(`comunidad_feed_${userId}`)
        if (val === 'true') setMostrarFeedPublico(true)
      } catch(e) {}
    }
    if (userId) cargarPreferencia()
  }, [userId])

  useFocusEffect(useCallback(() => { cargar() }, []))

  async function cargar() {
    setCargando(true)
    const { data: p } = await supabase.from('perfiles').select('*').eq('id', userId).single()
    if (p) { setPerfil(p); setCoachId(esCoach ? userId : p.coach_id) }

    let query = supabase
      .from('comunidad_publicaciones')
      .select(`
        id, autor_id, texto, tipo, media_url, media_tipo, publica, creado_en,
        autor:autor_id(nombre_completo, avatar_url),
        mis_likes:comunidad_likes(id),
        likes_count:comunidad_likes(count),
        comentarios_count:comunidad_comentarios(count),
        comentarios_recientes:comunidad_comentarios(
          id, texto, creado_en,
          autor:autor_id(nombre_completo, avatar_url)
        )
      `)
      .order('creado_en', { ascending: false })
      .limit(30)

    if (esCoach) {
      query = query.eq('autor_id', userId)
    } else if (p?.coach_id) {
      query = query.or(`autor_id.eq.${p.coach_id},publica.eq.true`)
    } else {
      query = query.eq('publica', true)
    }

    const { data: pubs } = await query
    setPublicaciones(pubs || [])
    setCargando(false)
  }

  async function seleccionarMedia() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') { Alert.alert('Permiso denegado', 'Necesitamos acceso a tu galería'); return }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: false,
      quality: 1,           // Alta resolución
      videoMaxDuration: 120,
    })
    if (result.canceled) return
    const asset = result.assets[0]
    setMediaUri(asset.uri)
    setMediaType(asset.type || 'image')
    setMediaPreview(asset.uri)
  }

  async function subirMedia(uri, tipo) {
    const ext  = tipo === 'video' ? 'mp4' : 'jpg'
    const mime = tipo === 'video' ? 'video/mp4' : 'image/jpeg'
    const path = `${userId}/${Date.now()}.${ext}`

    // Obtener JWT
    const { data: { session } } = await supabase.auth.getSession()
    const jwt = session?.access_token
    if (!jwt) throw new Error('Sin sesión activa')

    // Leer archivo como blob
    const resp = await fetch(uri)
    if (!resp.ok) throw new Error('No se pudo leer el archivo')
    const blob = await resp.blob()

    // Intentar con SDK de Supabase primero (más confiable)
    const { data: sdkData, error: sdkError } = await supabase.storage
      .from('comunidad')
      .upload(path, blob, { contentType: mime, upsert: true, cacheControl: '3600' })

    if (!sdkError) {
      const { data: urlData } = supabase.storage.from('comunidad').getPublicUrl(path)
      return urlData.publicUrl
    }

    // Si falla el SDK, intentar con fetch directo
    const upResp = await fetch(`${SUPABASE_URL}/storage/v1/object/comunidad/${path}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'apikey': SUPABASE_ANON,
        'Content-Type': mime,
        'x-upsert': 'true',
        'Cache-Control': '3600',
      },
      body: blob,
    })

    if (!upResp.ok) {
      const errText = await upResp.text()
      let errMsg = errText
      try { errMsg = JSON.parse(errText)?.message || errText } catch {}
      throw new Error(errMsg)
    }

    return `${SUPABASE_URL}/storage/v1/object/public/comunidad/${path}`
  }

  async function publicar() {
    if (!nuevaPubli.texto.trim() && !mediaUri) return
    setPublicando(true)
    try {
      let mediaUrl = null
      let mediaTipo = null
      if (mediaUri) {
        mediaUrl  = await subirMedia(mediaUri, mediaType)
        mediaTipo = mediaType
      }
      const { error } = await supabase.from('comunidad_publicaciones').insert({
        autor_id:   userId,
        texto:      nuevaPubli.texto.trim() || null,
        tipo:       nuevaPubli.tipo,
        media_url:  mediaUrl,
        media_tipo: mediaTipo,
        publica:    true,
        creado_en:  new Date().toISOString(),
      })
      if (error) throw error
      setModalNueva(false)
      setNuevaPubli({ texto: '', tipo: 'aviso' })
      setMediaUri(null); setMediaPreview(null); setMediaType(null)
      cargar()
    } catch (e) { Alert.alert('Error', e.message) }
    setPublicando(false)
  }

  async function darLike(pubId, yaLike) {
    // Actualizar estado local optimistamente — sin recargar pantalla
    setPublicaciones(prev => prev.map(pub => {
      if (pub.id !== pubId) return pub
      const misLikesActuales = pub.mis_likes || []
      const countActual = pub.likes_count?.[0]?.count || 0
      if (yaLike) {
        return {
          ...pub,
          mis_likes: [],
          likes_count: [{ count: Math.max(0, countActual - 1) }]
        }
      } else {
        return {
          ...pub,
          mis_likes: [{ id: 'temp' }],
          likes_count: [{ count: countActual + 1 }]
        }
      }
    }))
    // Sincronizar con Supabase en segundo plano
    if (yaLike) {
      await supabase.from('comunidad_likes').delete().eq('publicacion_id', pubId).eq('usuario_id', userId)
    } else {
      await supabase.from('comunidad_likes').insert({ publicacion_id: pubId, usuario_id: userId, creado_en: new Date().toISOString() })
    }
  }

  async function comentar(pubId) {
    if (!comentario.trim()) return
    const texto = comentario.trim()
    setComentario(''); setComentandoId(null)
    // Optimista
    setPublicaciones(prev => prev.map(pub => {
      if (pub.id !== pubId) return pub
      const countActual = pub.comentarios_count?.[0]?.count || 0
      return {
        ...pub,
        comentarios_count: [{ count: countActual + 1 }],
        comentarios_recientes: [...(pub.comentarios_recientes || []), {
          id: 'temp_' + Date.now(),
          texto,
          creado_en: new Date().toISOString(),
          autor: { nombre_completo: perfil?.nombre_completo, avatar_url: perfil?.avatar_url }
        }]
      }
    }))
    await supabase.from('comunidad_comentarios').insert({
      publicacion_id: pubId, autor_id: userId, texto, creado_en: new Date().toISOString(),
    })
  }

  async function eliminarPubli(pubId) {
    setPubAEliminar(pubId)
  }

  async function confirmarEliminar() {
    if (!pubAEliminar) return
    await supabase.from('comunidad_publicaciones').delete().eq('id', pubAEliminar)
    setPubAEliminar(null)
    setPublicaciones(prev => prev.filter(p => p.id !== pubAEliminar))
  }

  // Sin coach — pantalla splash
  if (!esCoach && !coachId && !cargando) {
    return (
      <SinCoachSplash
        publicaciones={publicaciones} userId={userId}
        mostrarFeed={mostrarFeedPublico} setMostrarFeed={setMostrarFeedPublico}
        onLike={darLike} onComentar={id => setComentandoId(comentandoId === id ? null : id)}
        comentandoId={comentandoId} comentario={comentario}
        setComentario={setComentario} onEnviarComentario={comentar}
      />
    )
  }

  return (
    <LinearGradient colors={['#000000', '#050510', '#0a0a1f']} style={{ flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView ref={scrollRef} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}
          contentInset={{ bottom: 100 }} scrollIndicatorInsets={{ bottom: 100 }}>

          {/* HEADER */}
          <View style={styles.iniHeader}>
            <View>
              <View style={styles.rfRow}>
                <Text style={styles.rfR}>REP</Text><Text style={styles.rfF}>FORGE</Text>
              </View>
              <Text style={{ color: '#2a4488', fontSize: 11, letterSpacing: 1, fontWeight: '600' }}>Comunidad</Text>
            </View>
            {esCoach && (
              <TouchableOpacity style={{ borderRadius: 14, overflow: 'hidden' }} onPress={() => setModalNueva(true)}>
                <LinearGradient colors={['#1a3aff', '#0022cc']} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 11 }}>
                  <AntDesign name="plus" size={16} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: '900', fontSize: 13 }}>Publicar</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>

          {cargando ? (
            <ActivityIndicator color="#4488ff" style={{ marginTop: 40 }} />
          ) : publicaciones.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 60, gap: 14 }}>
              <View style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: '#05050f', borderWidth: 1.5, borderColor: '#0f1a3a', justifyContent: 'center', alignItems: 'center' }}>
                <AntDesign name="inbox" size={32} color="#1a2a5a" />
              </View>
              <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900' }}>Sin publicaciones</Text>
              <Text style={{ color: '#2a4488', fontSize: 13, textAlign: 'center', paddingHorizontal: 30, lineHeight: 20 }}>
                {esCoach ? 'Comparte tips, avisos o logros con tus clientes' : 'Tu coach aún no ha publicado nada'}
              </Text>
              {esCoach && (
                <TouchableOpacity onPress={() => setModalNueva(true)}>
                  <LinearGradient colors={['#1a3aff', '#0022cc']} style={{ borderRadius: 14, paddingHorizontal: 24, paddingVertical: 13 }}>
                    <Text style={{ color: '#fff', fontWeight: '900' }}>Crear primera publicación</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            publicaciones.map(pub => (
              <PublicacionCard
                key={pub.id} pub={pub} userId={userId} esCoach={esCoach}
                onLike={darLike}
                onComentar={id => {
          setComentandoId(comentandoId === id ? null : id)
          if (comentandoId !== id) setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200)
        }}
                onEliminar={esCoach ? eliminarPubli : null}
                comentandoId={comentandoId} comentario={comentario}
                setComentario={setComentario} onEnviarComentario={comentar}
              />
            ))
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* MODAL CONFIRMAR ELIMINAR */}
      <Modal visible={!!pubAEliminar} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,2,15,0.92)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{ backgroundColor: '#08080f', borderRadius: 22, padding: 26, width: '100%', borderWidth: 1, borderColor: '#ff335566', alignItems: 'center' }}>
            <View style={{ width: 54, height: 54, borderRadius: 14, backgroundColor: '#1a0008', borderWidth: 1.5, borderColor: '#ff3355', justifyContent: 'center', alignItems: 'center', marginBottom: 14 }}>
              <AntDesign name="delete" size={24} color="#ff3355" />
            </View>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900', marginBottom: 8 }}>Eliminar publicación</Text>
            <Text style={{ color: '#2a4488', fontSize: 13, textAlign: 'center', marginBottom: 24, lineHeight: 20 }}>
              Esta publicación se eliminará permanentemente y no podrás recuperarla.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
              <Pressable
                style={{ flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#0f1a3a', backgroundColor: '#05050f', alignItems: 'center' }}
                onPress={() => setPubAEliminar(null)}
              >
                <Text style={{ color: '#2a4488', fontWeight: '700', fontSize: 13 }}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={{ flex: 1, borderRadius: 12, overflow: 'hidden' }}
                onPress={confirmarEliminar}
              >
                <LinearGradient colors={['#cc0022', '#880011']} style={{ padding: 14, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#fff', fontWeight: '900', fontSize: 13 }}>Eliminar</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL NUEVA PUBLICACIÓN */}
      <Modal visible={modalNueva} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.overlay}>
            <View style={styles.sheet}>
              <View style={styles.handle} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900' }}>Nueva publicación</Text>
                <TouchableOpacity onPress={() => { setModalNueva(false); setMediaUri(null); setMediaPreview(null) }} style={styles.cerrarBtn}>
                  <AntDesign name="close" size={18} color="#fff" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Tipo */}
                <Text style={styles.label}>TIPO</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 18 }}>
                  <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 2 }}>
                    {TIPOS.map(t => (
                      <TouchableOpacity
                        key={t.key}
                        style={[styles.tipoChip, nuevaPubli.tipo === t.key && { borderColor: t.color, backgroundColor: t.color + '22' }]}
                        onPress={() => setNuevaPubli(p => ({ ...p, tipo: t.key }))}
                      >
                        <AntDesign name={t.icon === 'star' ? 'star' : t.icon === 'bell' ? 'bell' : t.icon} size={14} color={nuevaPubli.tipo === t.key ? t.color : '#2a4488'} />
                        <Text style={{ color: nuevaPubli.tipo === t.key ? t.color : '#2a4488', fontSize: 12, fontWeight: '700' }}>{t.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>

                {/* Texto */}
                <Text style={styles.label}>TEXTO (OPCIONAL SI SUBES FOTO/VIDEO)</Text>
                <TextInput
                  style={styles.textArea}
                  value={nuevaPubli.texto}
                  onChangeText={t => setNuevaPubli(p => ({ ...p, texto: t }))}
                  placeholder="Comparte algo con tus clientes..."
                  placeholderTextColor="#2a2a4a"
                  multiline numberOfLines={4} textAlignVertical="top"
                />

                {/* Media */}
                <Text style={[styles.label, { marginTop: 8 }]}>FOTO / VIDEO EN ALTA RESOLUCIÓN</Text>
                {mediaPreview ? (
                  <View style={{ marginBottom: 16 }}>
                    <Image source={{ uri: mediaPreview }} style={{ width: '100%', height: 200, borderRadius: 14, backgroundColor: '#0a0a1f' }} resizeMode="cover" />
                    <TouchableOpacity
                      style={{ position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }}
                      onPress={() => { setMediaUri(null); setMediaPreview(null); setMediaType(null) }}
                    >
                      <AntDesign name="close" size={14} color="#fff" />
                    </TouchableOpacity>
                    {mediaType === 'video' && (
                      <View style={{ position: 'absolute', bottom: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <AntDesign name="caretright" size={12} color="#fff" />
                        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>VIDEO</Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <TouchableOpacity style={styles.mediaBtn} onPress={seleccionarMedia}>
                    <AntDesign name="camera" size={28} color="#2a4488" />
                    <Text style={{ color: '#2a4488', fontSize: 13, fontWeight: '700', marginTop: 8 }}>Seleccionar foto o video</Text>
                    <Text style={{ color: '#1a2a5a', fontSize: 11, marginTop: 4 }}>Hasta 2 min · Alta resolución</Text>
                  </TouchableOpacity>
                )}

                {/* Publicar */}
                <Pressable
                  style={({ pressed }) => [{ borderRadius: 16, overflow: 'hidden', marginTop: 8, marginBottom: 8, opacity: publicando ? 0.7 : pressed ? 0.9 : 1 }]}
                  onPress={publicar} disabled={publicando}
                >
                  <LinearGradient colors={['#1a3aff', '#0022cc']} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 17 }}>
                    <AntDesign name="export" size={16} color="#fff" />
                    <Text style={{ color: '#fff', fontWeight: '900', fontSize: 15 }}>{publicando ? 'Publicando...' : 'Publicar'}</Text>
                  </LinearGradient>
                </Pressable>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container:  { padding: 20, paddingTop: 56, paddingBottom: 130 },
  iniHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  rfRow:      { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 4 },
  rfR:        { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: 2 },
  rfF:        { fontSize: 22, fontWeight: '900', color: '#4488ff', letterSpacing: 2 },
  pubCard:    { backgroundColor: '#05050f', borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 20, padding: 18, marginBottom: 16 },
  pubTexto:   { color: '#ddeeff', fontSize: 15, lineHeight: 24, marginBottom: 14 },
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  sheet:      { backgroundColor: '#05050f', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderColor: '#0f1a3a', paddingHorizontal: 20, paddingBottom: 40, maxHeight: '92%' },
  handle:     { width: 40, height: 4, backgroundColor: '#1a2a5a', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 16 },
  cerrarBtn:  { width: 32, height: 32, borderRadius: 10, backgroundColor: '#0a0a1f', borderWidth: 1, borderColor: '#0f1a3a', justifyContent: 'center', alignItems: 'center' },
  label:      { color: '#2a4488', fontSize: 10, fontWeight: '800', letterSpacing: 2, marginBottom: 10 },
  tipoChip:   { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, borderColor: '#0f1a3a', backgroundColor: '#08080f' },
  textArea:   { backgroundColor: '#08091a', borderWidth: 1.5, borderColor: '#0f1e40', borderRadius: 14, padding: 14, color: '#fff', fontSize: 14, lineHeight: 22, minHeight: 110, marginBottom: 16 },
  mediaBtn:   { borderWidth: 1.5, borderColor: '#0f1e40', borderStyle: 'dashed', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 16, backgroundColor: '#08080f' },
})
