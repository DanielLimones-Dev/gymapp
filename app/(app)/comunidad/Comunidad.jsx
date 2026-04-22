// ============================================
// COMUNIDAD — Feed tipo red social
// app/(app)/Comunidad/comunidad.jsx
// ============================================
import { useState, useCallback, useRef, useEffect, useContext } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import {
  View, Text, StyleSheet, ScrollView,
  TextInput, Image, Alert,
  ActivityIndicator, Platform,
  Keyboard, Dimensions
} from 'react-native'
import { TouchableOpacity, Pressable } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import ManagedModal from '../../../components/ManagedModal'
import DraggableSheet from '../../../components/DraggableSheet'
import DeleteConfirmModal from '../../../components/DeleteConfirmModal'
import SwipeableModal from '../../../components/SwipeableModal'
import PerfilPublicoModal from '../../../components/PerfilPublicoModal'
import { AntDesign } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import AppleBentoCard from '../../../components/AppleBentoCard'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '../../../lib/supabase'
import { CoachThemeContext, hexToRgb } from '../../../lib/coachTheme'

const SCREEN_HEIGHT = Dimensions.get('window').height
const SUPABASE_URL = 'https://vlnmhwaadyejdnmgktjt.supabase.co'
const SUPABASE_ANON = 'sb_publishable_ZHJhHtk3REmxd3EblLt6NA_9YIsoiSb'

// Íconos garantizados para cada tipo (colores tipo-específicos no cambian, excepto aviso)
const TIPO_ICON_STATIC = {
  logro:      { icon: 'star',      color: '#ff9900'  },
  tip:        { icon: 'info',      color: '#00cc44'  },
  motivacion: { icon: 'heart',     color: '#ff3355'  },
  foto:       { icon: 'camera',    color: '#9933ff'  },
}

function getTipoIcon(tipo, accentColor) {
  if (tipo === 'aviso') return { icon: 'bell', color: accentColor }
  return TIPO_ICON_STATIC[tipo] || { icon: 'bell', color: accentColor }
}

function getTipos(accentColor) {
  return [
    { key: 'aviso',      label: 'Aviso',      icon: 'bell',     color: accentColor },
    { key: 'logro',      label: 'Logro',       icon: 'download',    color: '#ff9900'  },
    { key: 'tip',        label: 'Tip',         icon: 'bulb',     color: '#00cc44'  },
    { key: 'motivacion', label: 'Motivación',  icon: 'heart',     color: '#ff3355'  },
    { key: 'foto',       label: 'Foto/Video',  icon: 'camera',    color: '#9933ff'  },
  ]
}

function Avatar({ nombre, foto, size = 38 }) {
  const { accentColor, gradColors } = useContext(CoachThemeContext)
  const acRgb = hexToRgb(accentColor)
  if (foto) return <Image source={{ uri: foto }} style={{ width: size, height: size, borderRadius: size/2, borderWidth: 1, borderColor: accentColor }} />
  return (
    <View style={{ width: size, height: size, borderRadius: size/2, backgroundColor: `rgba(${acRgb},0.15)`, borderWidth: 1, borderColor: accentColor, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: accentColor, fontWeight: '900', fontSize: size * 0.38 }}>{nombre?.[0]?.toUpperCase() || '?'}</Text>
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
function PublicacionCard({ pub, userId, esCoach, onLike, onComentar, onEliminar, comentandoId, comentario, setComentario, onEnviarComentario, onVerPerfil }) {
  const { accentColor } = useContext(CoachThemeContext)
  const acRgb = hexToRgb(accentColor)
  const tipo = getTipoIcon(pub.tipo, accentColor)
  const yaLike = pub.mis_likes?.length > 0
  const numLikes = pub.likes_count?.[0]?.count || 0
  const numComs  = pub.comentarios_count?.[0]?.count || 0
  const comentandoEste = comentandoId === pub.id
  const esAutor = pub.autor_id === userId

  return (
    <AppleBentoCard style={styles.pubCard}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <TouchableOpacity activeOpacity={0.8} onPress={() => onVerPerfil?.({ id: pub.autor_id, nombre: pub.autor?.nombre_completo, avatarUrl: pub.autor?.avatar_url })}>
          <Avatar nombre={pub.autor?.nombre_completo} foto={pub.autor?.avatar_url} size={40} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800' }}>{pub.autor?.nombre_completo || 'Coach'}</Text>
          <Text style={{ color: `rgba(${acRgb},0.5)`, fontSize: 11 }}>{tiempoRelativo(pub.creado_en)}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: tipo.color + '44', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5, backgroundColor: tipo.color + '11' }}>
          <AntDesign name={tipo.icon} size={12} color={tipo.color} />
          <Text style={{ color: tipo.color, fontSize: 9, fontWeight: '900', letterSpacing: 1 }}>{pub.tipo?.toUpperCase()}</Text>
        </View>
        {esAutor && onEliminar && (
          <Pressable
            onPress={() => onEliminar(pub.id)}
            style={({ pressed }) => [{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,59,48,0.15)', alignItems: 'center', justifyContent: 'center' }, pressed && { opacity: 0.7, transform: [{ scale: 0.82 }] }]}
          >
            <AntDesign name="delete" size={14} color="#ff3355" />
          </Pressable>
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
      <View style={{ flexDirection: 'row', gap: 20, borderTopWidth: 1, borderTopColor: `rgba(${acRgb},0.15)`, paddingTop: 12 }}>
        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }} onPress={() => onLike(pub.id, yaLike)}>
          <AntDesign name="heart" size={17} color={yaLike ? '#ff3355' : `rgba(${acRgb},0.5)`} />
          <Text style={{ color: yaLike ? '#ff3355' : `rgba(${acRgb},0.5)`, fontSize: 13, fontWeight: '700' }}>{numLikes > 0 ? numLikes : 'Me gusta'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }} onPress={() => onComentar(pub.id)}>
          <AntDesign name="message" size={16} color={comentandoEste ? accentColor : `rgba(${acRgb},0.5)`} />
          <Text style={{ color: comentandoEste ? accentColor : `rgba(${acRgb},0.5)`, fontSize: 13, fontWeight: '700' }}>{numComs > 0 ? numComs + ' comentarios' : 'Comentar'}</Text>
        </TouchableOpacity>
      </View>

      {/* Comentarios recientes */}
      {pub.comentarios_recientes?.length > 0 && (
        <View style={{ marginTop: 12, gap: 8 }}>
          {pub.comentarios_recientes.map(c => (
            <View key={c.id} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
              <Avatar nombre={c.autor?.nombre_completo} foto={c.autor?.avatar_url} size={26} />
              <View style={{ flex: 1, backgroundColor: '#08080f', borderRadius: 12, padding: 10 }}>
                <Text style={{ color: accentColor, fontSize: 11, fontWeight: '800', marginBottom: 2 }}>{c.autor?.nombre_completo}</Text>
                <Text style={{ color: `rgba(${acRgb},0.8)`, fontSize: 13, lineHeight: 18 }}>{c.texto}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Input comentario */}
      {comentandoEste && (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, alignItems: 'center' }}>
          <TextInput
            style={{ flex: 1, backgroundColor: '#08091a', borderWidth: 1.5, borderColor: accentColor, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, color: '#fff', fontSize: 13 }}
            value={comentario}
            onChangeText={setComentario}
            placeholder="Escribe un comentario..."
            placeholderTextColor="#2a2a4a"
            autoFocus
          />
          <TouchableOpacity
            style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: accentColor, justifyContent: 'center', alignItems: 'center' }}
            onPress={() => onEnviarComentario(pub.id)}
          >
            <AntDesign name="check" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </AppleBentoCard>
  )
}

// ── Pantalla sin coach — splash con botón continuar ───────────
function SinCoachSplash({ publicaciones, userId, mostrarFeed, setMostrarFeed, onLike, onComentar, comentandoId, comentario, setComentario, onEnviarComentario }) {
  const { accentColor, gradColors } = useContext(CoachThemeContext)
  const acRgb = hexToRgb(accentColor)

  if (mostrarFeed) {
    return (
      <LinearGradient colors={gradColors} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}
          contentInset={{ bottom: 100 }} scrollIndicatorInsets={{ bottom: 100 }}>
          <View style={styles.iniHeader}>
            <Text style={styles.rfF}>Comunidad</Text>
          </View>
          {publicaciones.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 60, gap: 14 }}>
              <View style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' }}>
                <AntDesign name="inbox" size={32} color="#8E8E93" />
              </View>
              <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900' }}>Sin publicaciones</Text>
              <Text style={{ color: '#8E8E93', fontSize: 13, textAlign: 'center', paddingHorizontal: 30, lineHeight: 20 }}>
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
    <LinearGradient colors={gradColors} style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
      <View style={{ width: '100%', borderRadius: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', padding: 32, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)' }}>
        <View style={{ width: 80, height: 80, borderRadius: 24, backgroundColor: `rgba(${acRgb},0.1)`, borderWidth: 1.5, borderColor: `rgba(${acRgb},0.4)`, justifyContent: 'center', alignItems: 'center', marginBottom: 24 }}>
          <AntDesign name="team" size={36} color={accentColor} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 12 }}>
          <Text style={[styles.rfF, { fontSize: 22, color: accentColor }]}>Comunidad</Text>
        </View>
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900', marginBottom: 12, textAlign: 'center' }}>
          Únete a la Comunidad
        </Text>
        <Text style={{ color: '#8E8E93', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 32, fontWeight: '500' }}>
          Conecta con un coach para acceder a contenido exclusivo, o explora las publicaciones públicas de nuestra red de entrenadores.
        </Text>

        <TouchableOpacity
          style={{ width: '100%', borderRadius: 20, overflow: 'hidden' }}
          onPress={async () => {
            setMostrarFeed(true)
            try {
              const AsyncStorage = require('@react-native-async-storage/async-storage').default
              await AsyncStorage.setItem(`comunidad_feed_${userId}`, 'true')
            } catch(e) {}
          }}
          activeOpacity={0.8}
        >
          <LinearGradient colors={[accentColor, accentColor]} start={{x:0, y:0}} end={{x:1, y:0}} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 18 }}>
            <AntDesign name="team" size={20} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 16, letterSpacing: 0.5 }}>EXPLORAR FEED</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  )
}

// ── Componente principal exportado ────────────────────────────
export default function Comunidad({ userId, esCoach = false }) {
  const { accentColor, gradColors} = useContext(CoachThemeContext)
  const acRgb = hexToRgb(accentColor)

  const [kbHeight, setKbHeight]               = useState(0) // Estado del teclado
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
  const [pubAEliminar, setPubAEliminar]       = useState(null)
  const [perfilUsuario, setPerfilUsuario]     = useState(null) // { id, nombre, avatarUrl }
  const scrollRef   = useRef(null)
  const [comentario, setComentario] = useState('')
  const textoRef = useRef(null)
  const [modalNeedsScroll, setModalNeedsScroll] = useState(false)
  const modalContentH = useRef(0)
  const modalContainerH = useRef(0)

  function cerrarModal() {
    Keyboard.dismiss() // Forzamos el cierre del teclado
    setKbHeight(0)     // Reseteamos altura manualmente
    setModalNueva(false)
    setNuevaPubli({ texto: '', tipo: 'aviso' })
    setMediaUri(null); setMediaPreview(null); setMediaType(null)
    setModalNeedsScroll(false)
    modalContentH.current = 0
    modalContainerH.current = 0
  }

  function checkModalScroll() {
    setModalNeedsScroll(modalContentH.current > modalContainerH.current + 2)
  }

  // Manejar altura del teclado y scroll
  useEffect(() => {
    if (!modalNueva) return

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'

    const subShow = Keyboard.addListener(showEvent, (e) => {
      setKbHeight(e.endCoordinates.height)
      setModalNeedsScroll(true)
    })

    const subHide = Keyboard.addListener(hideEvent, () => {
      setKbHeight(0)
      textoRef.current?.blur()
      checkModalScroll()
    })

    return () => {
      subShow.remove()
      subHide.remove()
    }
  }, [modalNueva])

  const TIPOS = getTipos(accentColor)

  // Cerrar input comentario cuando el teclado se oculta
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
        autor:autor_id(nombre_completo, avatar_url, rol),
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
      quality: 1,           
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

    const { data: { session } } = await supabase.auth.getSession()
    const jwt = session?.access_token
    if (!jwt) throw new Error('Sin sesión activa')

    const resp = await fetch(uri)
    if (!resp.ok) throw new Error('No se pudo leer el archivo')
    const blob = await resp.blob()

    const { data: sdkData, error: sdkError } = await supabase.storage
      .from('comunidad')
      .upload(path, blob, { contentType: mime, upsert: true, cacheControl: '3600' })

    if (!sdkError) {
      const { data: urlData } = supabase.storage.from('comunidad').getPublicUrl(path)
      return urlData.publicUrl
    }

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
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
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
    if (yaLike) {
      await supabase.from('comunidad_likes').delete().eq('publicacion_id', pubId).eq('usuario_id', userId)
    } else {
      await supabase.from('comunidad_likes').insert({ publicacion_id: pubId, usuario_id: userId, creado_en: new Date().toISOString() })
    }
  }

  async function comentar(pubId) {
    if (!comentario.trim()) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    const texto = comentario.trim()
    setComentario(''); setComentandoId(null)
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
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    await supabase.from('comunidad_publicaciones').delete().eq('id', pubAEliminar)
    setPubAEliminar(null)
    setPublicaciones(prev => prev.filter(p => p.id !== pubAEliminar))
  }

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
    <LinearGradient colors={gradColors} style={{ flex: 1 }}>
      
      {/* 🛡️ ESCUDO 3: pointerEvents='none' congela todos los botones de atrás */}
      <View style={{ flex: 1 }} pointerEvents={modalNueva ? 'none' : 'auto'}>
        <ScrollView 
          ref={scrollRef} 
          scrollEnabled={!modalNueva} // 🛡️ ESCUDO 4: Congela el ScrollView físico
          contentContainerStyle={styles.container} 
          showsVerticalScrollIndicator={false}
          contentInset={{ bottom: 100 }} 
          scrollIndicatorInsets={{ bottom: 100 }}
        >

          {/* HEADER */}
          <View style={styles.iniHeader}>
            <Text style={styles.rfF}>Comunidad</Text>
            {esCoach && (
              <TouchableOpacity style={{ borderRadius: 14, overflow: 'hidden' }} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setModalNueva(true) }}>
                <LinearGradient colors={[accentColor, accentColor]} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 11 }}>
                  <AntDesign name="plus" size={16} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: '900', fontSize: 13 }}>Publicar</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>

          {cargando ? (
            <ActivityIndicator color={accentColor} style={{ marginTop: 40 }} />
          ) : publicaciones.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 60, gap: 14 }}>
              <View style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: '#05050f', borderWidth: 1.5, borderColor: '#0f1a3a', justifyContent: 'center', alignItems: 'center' }}>
                <AntDesign name="inbox" size={32} color="#1a2a5a" />
              </View>
              <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900' }}>Sin publicaciones</Text>
              <Text style={{ color: `rgba(${acRgb},0.5)`, fontSize: 13, textAlign: 'center', paddingHorizontal: 30, lineHeight: 20 }}>
                {esCoach ? 'Comparte tips, avisos o logros con tus clientes' : 'Tu coach aún no ha publicado nada'}
              </Text>
              {esCoach && (
                <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setModalNueva(true) }}>
                  <LinearGradient colors={[accentColor, accentColor]} style={{ borderRadius: 14, paddingHorizontal: 24, paddingVertical: 13 }}>
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
                onVerPerfil={u => setPerfilUsuario(u)}
              />
            ))
          )}
        </ScrollView>
      </View>

      {/* MODAL PERFIL USUARIO */}
      <SwipeableModal visible={!!perfilUsuario} onClose={() => setPerfilUsuario(null)} backgroundColor='#050510'>
        <PerfilPublicoModal userId={perfilUsuario?.id} nombre={perfilUsuario?.nombre} avatarUrl={perfilUsuario?.avatarUrl} />
      </SwipeableModal>

      {/* MODAL CONFIRMAR ELIMINAR */}
      <DeleteConfirmModal
        visible={!!pubAEliminar}
        onCancel={() => setPubAEliminar(null)}
        onConfirm={confirmarEliminar}
        title="Eliminar publicación"
        subtitle="Esta publicación se eliminará permanentemente y no podrás recuperarla."
      />

      {/* MODAL NUEVA PUBLICACIÓN */}
      <ManagedModal visible={modalNueva} transparent animationType="none">
        <DraggableSheet
          onClose={cerrarModal}
          scrollable={modalNeedsScroll || kbHeight > 0}
          gradientColors={gradColors}
          containerStyle={{
            borderColor: `rgba(${acRgb},0.22)`,
            marginBottom: kbHeight,
            maxHeight: kbHeight > 0 ? SCREEN_HEIGHT - kbHeight - 40 : '72%'
          }}
          header={
            <View style={{ marginBottom: 20 }}>
              <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: -0.3 }}>Nueva publicación</Text>
              <Text style={{ color: `rgba(${acRgb},0.5)`, fontSize: 11, fontWeight: '600', marginTop: 2 }}>Comparte con tus clientes</Text>
            </View>
          }
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            keyboardShouldPersistTaps="handled"
            scrollEnabled={modalNeedsScroll}
            onContentSizeChange={(_, h) => { modalContentH.current = h; checkModalScroll() }}
            onLayout={(e) => { modalContainerH.current = e.nativeEvent.layout.height; checkModalScroll() }}
          >
            {/* Tipo */}
            <Text style={[styles.label, { color: `rgba(${acRgb},0.6)` }]}>TIPO DE PUBLICACIÓN</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 2 }}>
                {TIPOS.map(t => (
                  <TouchableOpacity
                    key={t.key}
                    style={[
                      styles.tipoChip,
                      { borderColor: `rgba(${acRgb},0.12)`, backgroundColor: `rgba(${acRgb},0.04)` },
                      nuevaPubli.tipo === t.key && { borderColor: t.color, backgroundColor: t.color + '22' },
                    ]}
                    onPress={() => setNuevaPubli(p => ({ ...p, tipo: t.key }))}
                  >
                    <AntDesign name={t.icon} size={14} color={nuevaPubli.tipo === t.key ? t.color : `rgba(${acRgb},0.45)`} />
                    <Text style={{ color: nuevaPubli.tipo === t.key ? t.color : `rgba(${acRgb},0.45)`, fontSize: 12, fontWeight: '700' }}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Texto */}
            <Text style={[styles.label, { color: `rgba(${acRgb},0.6)` }]}>MENSAJE</Text>
            <TextInput
              ref={textoRef}
              style={[styles.textArea, {
                borderColor: `rgba(${acRgb},0.18)`,
                backgroundColor: `rgba(${acRgb},0.04)`,
                color: '#fff',
              }]}
              value={nuevaPubli.texto}
              onChangeText={t => setNuevaPubli(p => ({ ...p, texto: t }))}
              placeholder="Escribe algo para tus clientes..."
              placeholderTextColor={`rgba(${acRgb},0.25)`}
              multiline numberOfLines={4} textAlignVertical="top"
            />

            {/* Media */}
            <Text style={[styles.label, { color: `rgba(${acRgb},0.6)` }]}>FOTO / VIDEO</Text>
            {mediaPreview ? (
              <View style={{ marginBottom: 16 }}>
                <Image source={{ uri: mediaPreview }} style={{ width: '100%', height: 200, borderRadius: 18, backgroundColor: '#0a0a1f' }} resizeMode="cover" />
                <TouchableOpacity
                  style={{ position: 'absolute', top: 10, right: 10, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.75)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' }}
                  onPress={() => { setMediaUri(null); setMediaPreview(null); setMediaType(null) }}
                >
                  <AntDesign name="close" size={14} color="#fff" />
                </TouchableOpacity>
                {mediaType === 'video' && (
                  <View style={{ position: 'absolute', bottom: 10, left: 10, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <AntDesign name="caretright" size={12} color="#fff" />
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>VIDEO</Text>
                  </View>
                )}
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.mediaBtn, { borderColor: `rgba(${acRgb},0.22)`, backgroundColor: `rgba(${acRgb},0.04)` }]}
                onPress={seleccionarMedia}
              >
                <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: `rgba(${acRgb},0.10)`, borderWidth: 1, borderColor: `rgba(${acRgb},0.25)`, justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
                  <AntDesign name="camera" size={24} color={accentColor} />
                </View>
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800' }}>Seleccionar foto o video</Text>
                <Text style={{ color: `rgba(${acRgb},0.4)`, fontSize: 11, marginTop: 4 }}>Hasta 2 min · Alta resolución</Text>
              </TouchableOpacity>
            )}

            {/* Botón publicar */}
            <Pressable
              style={({ pressed }) => [{ borderRadius: 18, overflow: 'hidden', marginTop: 8, marginBottom: 8, opacity: publicando ? 0.65 : pressed ? 0.88 : 1 }]}
              onPress={publicar} disabled={publicando}
            >
              <LinearGradient
                colors={[accentColor, accentColor + 'cc']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 17 }}
              >
                <AntDesign name={publicando ? 'loading1' : 'export'} size={17} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '900', fontSize: 15, letterSpacing: 0.3 }}>
                  {publicando ? 'Publicando...' : 'Publicar'}
                </Text>
              </LinearGradient>
            </Pressable>
          </ScrollView>
        </DraggableSheet>
      </ManagedModal>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container:  { padding: 20, paddingTop: 56, paddingBottom: 130 },
  iniHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  rfRow:      { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 4 },
  rfR:        { fontSize: 24, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  rfF:        { fontSize: 24, fontWeight: '900', color: '#4488ff', letterSpacing: 1 },

  pubCard:    { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 24, padding: 20, marginBottom: 16 },
  pubTexto:   { color: '#fff', fontSize: 15, lineHeight: 24, marginBottom: 14, fontWeight: '500' },

  sheet:      { borderTopLeftRadius: 36, borderTopRightRadius: 36, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, paddingHorizontal: 22, paddingTop: 14, paddingBottom: 44, maxHeight: '88%' },
  handle:     { width: 44, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  cerrarBtn:  { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  label:      { fontSize: 10, fontWeight: '800', letterSpacing: 2, marginBottom: 10, textTransform: 'uppercase' },
  tipoChip:   { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  textArea:   { borderWidth: 1, borderRadius: 18, padding: 16, fontSize: 15, lineHeight: 22, minHeight: 110, marginBottom: 18, fontWeight: '500' },
  mediaBtn:   { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 22, paddingVertical: 28, alignItems: 'center', marginBottom: 18 },
})