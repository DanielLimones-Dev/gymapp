// ============================================
// ONBOARDING COACH — RepForge
// CV del equipo + perfil personal + certificaciones
// app/onboarding-coach.jsx
// ============================================
import { useState, useEffect, useRef } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
  TextInput, Platform, ActivityIndicator,
  Animated, Dimensions, KeyboardAvoidingView, Pressable, DeviceEventEmitter
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { AntDesign } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '../lib/supabase'
import Toast from 'react-native-toast-message'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useStripe } from '@stripe/stripe-react-native'

const { width: W } = Dimensions.get('window')

const ESPECIALIDADES = [
  { key: 'musculacion',    label: 'Musculación' },
  { key: 'fuerza',         label: 'Fuerza' },
  { key: 'perdida_peso',   label: 'Pérdida de peso' },
  { key: 'crossfit',       label: 'CrossFit/Funcional' },
  { key: 'resistencia',    label: 'Resistencia' },
  { key: 'rehabilitacion', label: 'Rehabilitación' },
  { key: 'nutricion',      label: 'Nutrición deportiva' },
  { key: 'online',         label: 'Coaching online' },
]

const OBJETIVOS = [
  { key: 'hipertrofia',   label: 'Hipertrofia',  color: '#4488ff' },
  { key: 'fuerza',        label: 'Fuerza',        color: '#ff9900' },
  { key: 'definicion',    label: 'Definición',    color: '#ff3355' },
  { key: 'resistencia',   label: 'Resistencia',   color: '#00cc44' },
  { key: 'recomposicion', label: 'Recomposición', color: '#9933ff' },
]

const GENEROS = ['Masculino', 'Femenino', 'Otro']

const PASOS = [
  { id: 0, titulo: 'Inicio',      icono: 'rocket'    },
  { id: 1, titulo: 'Perfil',      icono: 'user'      },
  { id: 2, titulo: 'Métricas',    icono: 'dashboard' },
  { id: 3, titulo: 'Tu equipo',   icono: 'team'      },
  { id: 4, titulo: 'Experiencia', icono: 'star'      },
  { id: 5, titulo: 'Plan',        icono: 'wallet'    },
]

const PLANES_COACH = [
  {
    key: 'free',
    label: 'Free',
    precio: 0,
    maxClientes: 3,
    color: '#8E8E93',
    features: ['3 clientes', 'Rutinas básicas', 'Chat con clientes'],
  },
  {
    key: 'starter',
    label: 'Starter',
    precio: 9.99,
    precioStripe: 999,
    maxClientes: 10,
    color: '#4488ff',
    features: ['10 clientes', 'Rutinas ilimitadas', 'Chat con clientes', 'Estadísticas'],
  },
  {
    key: 'pro',
    label: 'Pro',
    precio: 19.99,
    precioStripe: 1999,
    maxClientes: 30,
    color: '#9933ff',
    features: ['30 clientes', 'Todo de Starter', 'Análisis avanzado', 'Soporte prioritario'],
    popular: true,
  },
  {
    key: 'elite',
    label: 'Elite',
    precio: 39.99,
    precioStripe: 3999,
    maxClientes: null,
    color: '#ffaa00',
    features: ['Clientes ilimitados', 'Todo de Pro', 'Marca blanca', 'Manager dedicado'],
  },
]

export default function OnboardingCoach() {
  const [paso, setPaso]       = useState(0)
  const [loading, setLoading] = useState(false)

  // Perfil personal
  const [nombre, setNombre]     = useState('')
  const [genero, setGenero]     = useState('')
  const [fechaNac, setFechaNac] = useState('')

  // Métricas personales (uso personal de la app)
  const [peso, setPeso]       = useState('')
  const [altura, setAltura]   = useState('')
  const [objetivo, setObjetivo] = useState(null)

  // CV del equipo
  const [teamName, setTeamName]             = useState('')
  const [teamLogoUri, setTeamLogoUri]       = useState(null)
  const [especialidades, setEspecialidades] = useState([])
  const [bio, setBio]                       = useState('')

  // Experiencia + certificaciones texto
  const [experienciaAnos, setExperienciaAnos]   = useState('')
  const [certificaciones, setCertificaciones]   = useState('')
  const [coachUserId, setCoachUserId]           = useState(null)

  // Certificaciones imágenes
  const [certImagenes, setCertImagenes] = useState([]) // [{ uri, nombre }]
  const [subiendoCert, setSubiendoCert] = useState(false)

  // Animaciones
  const slideAnim    = useRef(new Animated.Value(0)).current
  const fadeAnim     = useRef(new Animated.Value(1)).current
  const progresoAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(progresoAnim, {
      toValue: paso / (PASOS.length - 1),
      duration: 350,
      useNativeDriver: false,
    }).start()
  }, [paso])

  function animarTransicion(dir, siguiente) {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 0,  duration: 140, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: dir === 'adelante' ? -28 : 28, duration: 140, useNativeDriver: true }),
    ]).start(() => {
      setPaso(siguiente)
      slideAnim.setValue(dir === 'adelante' ? 28 : -28)
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start()
    })
  }

  function siguiente() {
    if (paso === 1 && !nombre.trim()) {
      Toast.show({ type: 'error', text1: 'Falta tu nombre' }); return
    }
    if (paso === 3) {
      if (!teamName.trim()) { Toast.show({ type: 'error', text1: 'Ponle un nombre a tu equipo' }); return }
      if (especialidades.length === 0) { Toast.show({ type: 'error', text1: 'Elige al menos una especialidad' }); return }
    }
    if (paso === 4) {
      handleGuardar(); return
    }
    if (paso < PASOS.length - 1) {
      animarTransicion('adelante', paso + 1)
    }
  }

  function anterior() {
    if (paso > 0) animarTransicion('atras', paso - 1)
  }

  function toggleEspecialidad(key) {
    setEspecialidades(prev =>
      prev.includes(key) ? prev.filter(e => e !== key) : [...prev, key]
    )
  }

  function calcularEdad(fechaStr) {
    if (!fechaStr || fechaStr.length < 8) return null
    const partes = fechaStr.split('/')
    if (partes.length < 3) return null
    const [d, m, y] = partes.map(Number)
    if (!y || y < 1920 || y > new Date().getFullYear()) return null
    const hoy = new Date()
    let edad = hoy.getFullYear() - y
    if (hoy.getMonth() + 1 < m || (hoy.getMonth() + 1 === m && hoy.getDate() < d)) edad--
    return edad > 5 && edad < 100 ? edad : null
  }

  async function agregarCertImagen() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsMultipleSelection: false,
    })
    if (result.canceled || !result.assets?.[0]) return
    if (certImagenes.length >= 5) {
      Toast.show({ type: 'error', text1: 'Máximo 5 certificaciones' }); return
    }
    const asset = result.assets[0]
    const nombre = asset.uri.split('/').pop() || `cert_${Date.now()}.jpg`
    setCertImagenes(prev => [...prev, { uri: asset.uri, nombre }])
  }

  function eliminarCertImagen(uri) {
    setCertImagenes(prev => prev.filter(c => c.uri !== uri))
  }

  async function subirTeamLogo(userId) {
    const ext  = teamLogoUri.split('.').pop()?.split('?')[0] || 'jpg'
    const path = `${userId}/team_logo.${ext}`
    const resp = await fetch(teamLogoUri)
    const blob = await resp.blob()
    await supabase.storage.from('avatars').upload(path, blob, { contentType: `image/${ext}`, upsert: true })
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    return publicUrl + '?t=' + Date.now()
  }

  async function subirCertificaciones(userId) {
    const urls = []
    for (const cert of certImagenes) {
      const ext  = cert.nombre.split('.').pop() || 'jpg'
      const path = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      const resp = await fetch(cert.uri)
      const blob = await resp.blob()
      const { error } = await supabase.storage.from('certificaciones').upload(path, blob, { contentType: `image/${ext}` })
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('certificaciones').getPublicUrl(path)
      urls.push({ nombre: cert.nombre, url: publicUrl })
    }
    return urls
  }

  async function handleGuardar() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Sin sesión activa')
      setCoachUserId(user.id)

      let fechaNacimiento = null
      if (fechaNac && fechaNac.length >= 8) {
        const partes = fechaNac.split('/')
        if (partes.length === 3) {
          const [d, m, y] = partes.map(Number)
          if (d && m && y && y > 1920)
            fechaNacimiento = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`
        }
      }

      const edad = calcularEdad(fechaNac)

      let teamLogoUrl = null
      if (teamLogoUri) teamLogoUrl = await subirTeamLogo(user.id)

      const { error } = await supabase.from('perfiles').upsert({
        id: user.id,
        nombre_completo: nombre.trim(),
        genero: genero || null,
        fecha_nacimiento: fechaNacimiento,
        edad,
        peso: peso ? parseFloat(peso) : null,
        altura: altura ? parseFloat(altura) : null,
        objetivo: objetivo || null,
        team_name: teamName.trim(),
        team_logo_url: teamLogoUrl,
        especialidad: especialidades.join(', '),
        bio: bio.trim() || null,
        certificaciones: certificaciones.trim() || null,
        experiencia_anos: parseInt(experienciaAnos) || null,
        rol: 'coach',
      })
      if (error) throw error

      // Subir imágenes de certificaciones
      if (certImagenes.length > 0) {
        setSubiendoCert(true)
        const urls = await subirCertificaciones(user.id)
        for (const c of urls) {
          await supabase.from('coach_certificaciones').insert({
            coach_id: user.id,
            nombre: c.nombre,
            url: c.url,
          })
        }
        setSubiendoCert(false)
      }

      // Evidencia de aceptación de T&C
      await supabase.from('terminos_aceptados').insert({
        usuario_id: user.id,
        version: '1.0',
        plataforma: Platform.OS,
      })

      await AsyncStorage.removeItem('pending_rol')
      animarTransicion('adelante', 5)
    } catch (e) {
      setSubiendoCert(false)
      Toast.show({ type: 'error', text1: 'Error al guardar', text2: e.message })
    }
    setLoading(false)
  }

  const progresoPct = progresoAnim.interpolate({
    inputRange: [0, 1], outputRange: ['0%', '100%']
  })

  return (
    <LinearGradient colors={['#000000', '#050510', '#0a0a1f']} style={{ flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>

        {/* BARRA DE PROGRESO */}
        <View style={styles.progresoContainer}>
          <View style={styles.progresoTrack}>
            <Animated.View style={[styles.progresoFill, { width: progresoPct }]} />
          </View>
          <Text style={styles.progresoPasoText}>{paso + 1} / {PASOS.length}</Text>
        </View>

        {/* INDICADORES */}
        <View style={styles.pasosRow}>
          {PASOS.map((p, i) => (
            <View key={p.id} style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
              <View style={[
                styles.pasoIndicadorDot,
                i < paso  && styles.pasoIndicadorDone,
                i === paso && styles.pasoIndicadorActivo,
              ]}>
                {i < paso
                  ? <AntDesign name="check" size={10} color="#fff" />
                  : <AntDesign name={p.icono} size={11} color={i === paso ? '#fff' : '#1a2a5a'} />
                }
              </View>
              {i < PASOS.length - 1 && (
                <View style={[styles.pasoConector, i < paso && styles.pasoConectorDone]} />
              )}
            </View>
          ))}
        </View>

        {/* CONTENIDO ANIMADO */}
        <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }]}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
          >
            {paso === 0 && <PasoBienvenidaCoach onSiguiente={siguiente} />}
            {paso === 1 && (
              <PasoPerfilPersonal
                nombre={nombre} setNombre={setNombre}
                genero={genero} setGenero={setGenero}
                fechaNac={fechaNac} setFechaNac={setFechaNac}
                calcularEdad={calcularEdad}
              />
            )}
            {paso === 2 && (
              <PasoMetricas
                peso={peso} setPeso={setPeso}
                altura={altura} setAltura={setAltura}
                objetivo={objetivo} setObjetivo={setObjetivo}
              />
            )}
            {paso === 3 && (
              <PasoEquipo
                teamName={teamName} setTeamName={setTeamName}
                teamLogoUri={teamLogoUri} setTeamLogoUri={setTeamLogoUri}
                especialidades={especialidades} toggleEspecialidad={toggleEspecialidad}
                bio={bio} setBio={setBio}
              />
            )}
            {paso === 4 && (
              <PasoExperiencia
                experienciaAnos={experienciaAnos} setExperienciaAnos={setExperienciaAnos}
                certificaciones={certificaciones} setCertificaciones={setCertificaciones}
                certImagenes={certImagenes}
                onAgregarImagen={agregarCertImagen}
                onEliminarImagen={eliminarCertImagen}
                subiendoCert={subiendoCert}
              />
            )}
            {paso === 5 && (
              <PasoEleccionPlan
                userId={coachUserId}
                onComplete={() => DeviceEventEmitter.emit('onboarding_complete')}
              />
            )}
          </ScrollView>
        </Animated.View>

        {/* BOTONES — ocultos en paso 5 (plan selection maneja su propio CTA) */}
        {paso > 0 && paso < 5 && (
          <View style={styles.botonesRow}>
            <TouchableOpacity style={styles.btnAtras} onPress={anterior}>
              <AntDesign name="left" size={18} color="#4488ff" />
              <Text style={styles.btnAtrasText}>Atrás</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnSiguiente, loading && { opacity: 0.7 }]}
              onPress={siguiente}
              disabled={loading}
            >
              <LinearGradient colors={['#1a3aff', '#0022cc']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnSiguienteGradient}>
                {loading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <>
                      <Text style={styles.btnSiguienteText}>
                        {paso === 4 ? 'PUBLICAR PERFIL ⚡' : 'Siguiente'}
                      </Text>
                      {paso < 4 && <AntDesign name="right" size={16} color="#fff" />}
                    </>
                }
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </LinearGradient>
  )
}

// ── PASO 0: Bienvenida coach ──────────────────────────────────
function PasoBienvenidaCoach({ onSiguiente }) {
  const pulseAnim = useRef(new Animated.Value(1)).current
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.06, duration: 1400, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1,    duration: 1400, useNativeDriver: true }),
    ])).start()
  }, [])

  return (
    <View style={styles.bienvenidaContainer}>
      <Animated.View style={[styles.logoWrap, { transform: [{ scale: pulseAnim }] }]}>
        <LinearGradient colors={['#1a1a2e', '#0f0f23']} style={styles.logoInner}>
          <Text style={styles.logoR}>REP</Text>
          <Text style={styles.logoF}>FORGE</Text>
        </LinearGradient>
      </Animated.View>

      <View style={styles.coachBadge}>
        <AntDesign name="team" size={13} color="#9933ff" />
        <Text style={styles.coachBadgeText}>MODO COACH</Text>
      </View>

      <Text style={styles.bienvenidaTitulo}>Crea tu perfil{'\n'}de entrenador</Text>
      <Text style={styles.bienvenidaSub}>
        En 2 minutos configuras tu CV, tus métricas personales y la info de tu equipo.
      </Text>

      <View style={styles.featuresGrid}>
        {[
          { icon: 'team',      text: 'Gestiona tu equipo de atletas' },
          { icon: 'profile',   text: 'CV público de tu team' },
          { icon: 'bars',      text: 'Seguimiento del progreso de tus clientes' },
          { icon: 'message',   text: 'Mensajería directa con tus atletas' },
        ].map(f => (
          <View key={f.icon} style={styles.featureItem}>
            <View style={styles.featureIconWrap}>
              <AntDesign name={f.icon} size={18} color="#9933ff" />
            </View>
            <Text style={styles.featureText}>{f.text}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity onPress={onSiguiente} activeOpacity={0.85}>
        <LinearGradient colors={['#6600cc', '#9933ff']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnBienvenida}>
          <Text style={styles.btnBienvenidaText}>CREAR MI PERFIL</Text>
          <AntDesign name="arrow-right" size={18} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  )
}

// ── PASO 1: Perfil personal ───────────────────────────────────
function PasoPerfilPersonal({ nombre, setNombre, genero, setGenero, fechaNac, setFechaNac, calcularEdad }) {
  const edad = calcularEdad(fechaNac)

  function formatearFecha(text) {
    const nums = text.replace(/\D/g, '')
    if (nums.length <= 2) return nums
    if (nums.length <= 4) return `${nums.slice(0,2)}/${nums.slice(2)}`
    return `${nums.slice(0,2)}/${nums.slice(2,4)}/${nums.slice(4,8)}`
  }

  return (
    <View>
      <Text style={styles.pasoTitulo}>Datos personales</Text>
      <Text style={styles.pasoSub}>Solo para uso interno de la app</Text>

      <Text style={styles.fieldLabel}>NOMBRE COMPLETO <Text style={styles.required}>*</Text></Text>
      <View style={styles.inputWrap}>
        <AntDesign name="user" size={16} color="#2a4488" style={{ paddingLeft: 14 }} />
        <TextInput style={styles.input} placeholder="Tu nombre" placeholderTextColor="#1a2a4a" value={nombre} onChangeText={setNombre} />
      </View>

      <Text style={styles.fieldLabel}>FECHA DE NACIMIENTO — <Text style={styles.optional}>OPCIONAL</Text></Text>
      <View style={styles.inputWrap}>
        <AntDesign name="calendar" size={16} color="#2a4488" style={{ paddingLeft: 14 }} />
        <TextInput
          style={styles.input}
          placeholder="DD/MM/AAAA"
          placeholderTextColor="#1a2a4a"
          value={fechaNac}
          onChangeText={t => setFechaNac(formatearFecha(t))}
          keyboardType="numeric"
          maxLength={10}
        />
        {edad && (
          <View style={styles.edadBadge}>
            <Text style={styles.edadBadgeText}>{edad} años</Text>
          </View>
        )}
      </View>

      <Text style={styles.fieldLabel}>GÉNERO — <Text style={styles.optional}>OPCIONAL</Text></Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {GENEROS.map(g => (
          <Pressable key={g} style={[styles.generoChip, genero === g && styles.generoChipActivo]} onPress={() => setGenero(genero === g ? '' : g)}>
            <Text style={[styles.generoChipText, genero === g && { color: '#9933ff' }]}>{g}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  )
}

// ── PASO 2: Métricas personales ───────────────────────────────
function PasoMetricas({ peso, setPeso, altura, setAltura, objetivo, setObjetivo }) {
  return (
    <View>
      <Text style={styles.pasoTitulo}>Tus métricas</Text>
      <Text style={styles.pasoSub}>Para que puedas usar la app para tu propio entrenamiento</Text>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.fieldLabel}>PESO (kg)</Text>
          <View style={styles.inputWrap}>
            <TextInput style={[styles.input, { paddingLeft: 14 }]} placeholder="80" placeholderTextColor="#1a2a4a" value={peso} onChangeText={setPeso} keyboardType="decimal-pad" />
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.fieldLabel}>ALTURA (cm)</Text>
          <View style={styles.inputWrap}>
            <TextInput style={[styles.input, { paddingLeft: 14 }]} placeholder="178" placeholderTextColor="#1a2a4a" value={altura} onChangeText={setAltura} keyboardType="decimal-pad" />
          </View>
        </View>
      </View>

      <Text style={styles.fieldLabel}>TU OBJETIVO PERSONAL — <Text style={styles.optional}>OPCIONAL</Text></Text>
      <View style={{ gap: 8 }}>
        {OBJETIVOS.map(o => (
          <TouchableOpacity
            key={o.key}
            style={[styles.opcionCard, objetivo === o.key && { borderColor: o.color, backgroundColor: o.color + '15' }]}
            onPress={() => setObjetivo(objetivo === o.key ? null : o.key)}
            activeOpacity={0.8}
          >
            <View style={[styles.opcionDot, { backgroundColor: o.color + '22', borderColor: o.color + '55' }]}>
              <View style={[styles.opcionDotInner, objetivo === o.key && { backgroundColor: o.color }]} />
            </View>
            <Text style={[styles.opcionLabel, objetivo === o.key && { color: o.color }]}>{o.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

// ── PASO 3: Tu equipo (CV público) ───────────────────────────
function PasoEquipo({ teamName, setTeamName, teamLogoUri, setTeamLogoUri, especialidades, toggleEspecialidad, bio, setBio }) {
  async function seleccionarLogo() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.85,
    })
    if (!result.canceled && result.assets?.[0]) setTeamLogoUri(result.assets[0].uri)
  }

  return (
    <View>
      <Text style={styles.pasoTitulo}>Tu equipo</Text>
      <Text style={styles.pasoSub}>Esta info aparece en tu perfil público</Text>

      {/* Logo del equipo */}
      <Text style={styles.fieldLabel}>LOGO DEL EQUIPO — <Text style={styles.optional}>OPCIONAL</Text></Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <TouchableOpacity onPress={seleccionarLogo} activeOpacity={0.8} style={[styles.logoPickerWrap, teamLogoUri && { borderStyle: 'solid', borderColor: '#9933ff' }]}>
          {teamLogoUri
            ? <Image source={{ uri: teamLogoUri }} style={{ width: 72, height: 72, borderRadius: 16 }} />
            : <>
                <AntDesign name="picture" size={24} color="#9933ff" />
                <Text style={styles.logoPickerText}>Subir logo</Text>
              </>
          }
        </TouchableOpacity>
        {teamLogoUri && (
          <TouchableOpacity onPress={() => setTeamLogoUri(null)} style={{ padding: 8 }}>
            <AntDesign name="close" size={16} color="#ff3355" />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.fieldLabel}>NOMBRE DEL EQUIPO <Text style={styles.required}>*</Text></Text>
      <View style={styles.inputWrap}>
        <AntDesign name="team" size={16} color="#2a4488" style={{ paddingLeft: 14 }} />
        <TextInput style={styles.input} placeholder="Ej: Team Alpha, FitPro..." placeholderTextColor="#1a2a4a" value={teamName} onChangeText={setTeamName} />
      </View>

      <Text style={styles.fieldLabel}>ESPECIALIDADES <Text style={styles.required}>*</Text></Text>
      <View style={styles.chipsGrid}>
        {ESPECIALIDADES.map(e => (
          <TouchableOpacity
            key={e.key}
            style={[styles.chip, especialidades.includes(e.key) && styles.chipActivo]}
            onPress={() => toggleEspecialidad(e.key)}
            activeOpacity={0.8}
          >
            <Text style={[styles.chipText, especialidades.includes(e.key) && styles.chipTextActivo]}>
              {e.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.fieldLabel}>DESCRIPCIÓN DEL TEAM — <Text style={styles.optional}>OPCIONAL</Text></Text>
      <View style={[styles.inputWrap, { alignItems: 'flex-start', minHeight: 100 }]}>
        <TextInput
          style={[styles.input, { paddingLeft: 14, paddingTop: 14, textAlignVertical: 'top' }]}
          placeholder="Cuéntale a tus clientes qué hace especial a tu equipo..."
          placeholderTextColor="#1a2a4a"
          value={bio}
          onChangeText={setBio}
          multiline
          numberOfLines={4}
          maxLength={300}
        />
      </View>
      {bio.length > 0 && (
        <Text style={{ color: '#1a2a4a', fontSize: 11, textAlign: 'right', marginTop: -12, marginBottom: 8 }}>
          {bio.length}/300
        </Text>
      )}
    </View>
  )
}

// ── PASO 4: Experiencia + certificaciones ─────────────────────
function PasoExperiencia({ experienciaAnos, setExperienciaAnos, certificaciones, setCertificaciones, certImagenes, onAgregarImagen, onEliminarImagen, subiendoCert }) {
  return (
    <View>
      <Text style={styles.pasoTitulo}>Experiencia</Text>
      <Text style={styles.pasoSub}>Refuerza tu credibilidad ante los clientes</Text>

      <Text style={styles.fieldLabel}>AÑOS DE EXPERIENCIA</Text>
      <View style={styles.inputWrap}>
        <AntDesign name="star" size={16} color="#2a4488" style={{ paddingLeft: 14 }} />
        <TextInput
          style={styles.input}
          placeholder="Ej: 5"
          placeholderTextColor="#1a2a4a"
          value={experienciaAnos}
          onChangeText={setExperienciaAnos}
          keyboardType="numeric"
          maxLength={2}
        />
      </View>

      <Text style={styles.fieldLabel}>CERTIFICACIONES Y FORMACIÓN</Text>
      <View style={[styles.inputWrap, { alignItems: 'flex-start', minHeight: 90 }]}>
        <TextInput
          style={[styles.input, { paddingLeft: 14, paddingTop: 14, textAlignVertical: 'top' }]}
          placeholder="Ej: NSCA-CPT, Nutrición deportiva UPM, Crossfit L2..."
          placeholderTextColor="#1a2a4a"
          value={certificaciones}
          onChangeText={setCertificaciones}
          multiline
          numberOfLines={3}
          maxLength={400}
        />
      </View>

      {/* Imágenes de certificaciones */}
      <Text style={styles.fieldLabel}>FOTOS DE CERTIFICACIONES — <Text style={styles.optional}>OPCIONAL</Text></Text>
      <View style={styles.certGrid}>
        {certImagenes.map(c => (
          <View key={c.uri} style={styles.certThumbWrap}>
            <Image source={{ uri: c.uri }} style={styles.certThumb} />
            <TouchableOpacity style={styles.certThumbDelete} onPress={() => onEliminarImagen(c.uri)}>
              <AntDesign name="close" size={10} color="#fff" />
            </TouchableOpacity>
          </View>
        ))}
        {certImagenes.length < 5 && (
          <TouchableOpacity style={styles.certAddBtn} onPress={onAgregarImagen} activeOpacity={0.7}>
            <AntDesign name="plus" size={22} color="#9933ff" />
            <Text style={styles.certAddText}>Añadir</Text>
          </TouchableOpacity>
        )}
      </View>
      {subiendoCert && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <ActivityIndicator size="small" color="#9933ff" />
          <Text style={{ color: '#9933ff', fontSize: 12 }}>Subiendo certificaciones...</Text>
        </View>
      )}

      <View style={styles.finalCard}>
        <AntDesign name="check-circle" size={22} color="#9933ff" style={{ marginBottom: 10 }} />
        <Text style={styles.finalCardTitulo}>¡Ya casi está!</Text>
        <Text style={styles.finalCardDesc}>
          Al pulsar "Publicar perfil" crearemos tu cuenta de coach. Siempre podrás editar esta información desde tu panel.
        </Text>
      </View>
    </View>
  )
}

// ── PASO 5: Elección de plan ──────────────────────────────────
function PasoEleccionPlan({ userId, onComplete }) {
  const { initPaymentSheet, presentPaymentSheet } = useStripe()
  const [procesando, setProcesando] = useState(false)
  const [planActivo, setPlanActivo] = useState(null)

  async function elegirPlan(plan) {
    if (plan.key === 'free') {
      onComplete()
      return
    }
    setProcesando(true)
    setPlanActivo(plan.key)
    try {
      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: { plan: plan.key, userId },
      })
      if (error || !data?.clientSecret) throw error || new Error('Sin client secret')

      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: data.clientSecret,
        merchantDisplayName: 'RepForge',
      })
      if (initError) throw new Error(initError.message)

      const { error: payError } = await presentPaymentSheet()
      if (payError) {
        if (payError.code !== 'Canceled') {
          Toast.show({ type: 'error', text1: payError.message })
        }
        setProcesando(false)
        setPlanActivo(null)
        return
      }

      await supabase.from('perfiles').update({ plan_coach: plan.key }).eq('id', userId)
      Toast.show({ type: 'success', text1: `Plan ${plan.label} activado ⚡` })
      setTimeout(onComplete, 600)
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error al procesar pago', text2: e?.message })
      setProcesando(false)
      setPlanActivo(null)
    }
  }

  return (
    <View>
      <Text style={styles.pasoTitulo}>Elige tu plan</Text>
      <Text style={styles.pasoSub}>Empieza gratis y escala cuando lo necesites</Text>

      <View style={{ gap: 12 }}>
        {PLANES_COACH.map(plan => {
          const isPagado = plan.precio > 0
          const cargando = procesando && planActivo === plan.key
          return (
            <TouchableOpacity
              key={plan.key}
              activeOpacity={0.85}
              disabled={procesando}
              onPress={() => elegirPlan(plan)}
              style={{
                borderRadius: 18,
                borderWidth: plan.popular ? 2 : 1.5,
                borderColor: plan.popular ? plan.color : plan.color + '44',
                backgroundColor: plan.popular ? plan.color + '12' : '#05050f',
                padding: 18,
                opacity: procesando && planActivo !== plan.key ? 0.5 : 1,
              }}
            >
              {plan.popular && (
                <View style={{
                  position: 'absolute', top: -11, alignSelf: 'center',
                  backgroundColor: plan.color, borderRadius: 20,
                  paddingHorizontal: 14, paddingVertical: 3,
                }}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 1 }}>MÁS POPULAR</Text>
                </View>
              )}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{
                    width: 36, height: 36, borderRadius: 10,
                    backgroundColor: plan.color + '22', borderWidth: 1, borderColor: plan.color + '55',
                    justifyContent: 'center', alignItems: 'center',
                  }}>
                    <AntDesign name={plan.key === 'elite' ? 'crown' : plan.key === 'pro' ? 'star' : plan.key === 'starter' ? 'rocket1' : 'user'} size={17} color={plan.color} />
                  </View>
                  <View>
                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: '900' }}>{plan.label}</Text>
                    <Text style={{ color: plan.color, fontSize: 10, fontWeight: '700' }}>
                      {plan.maxClientes ? `${plan.maxClientes} clientes` : 'Sin límite'}
                    </Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  {isPagado
                    ? <>
                        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900' }}>${plan.precio}</Text>
                        <Text style={{ color: '#8E8E93', fontSize: 10, fontWeight: '600' }}>/mes</Text>
                      </>
                    : <Text style={{ color: plan.color, fontSize: 14, fontWeight: '900' }}>GRATIS</Text>
                  }
                </View>
              </View>

              <View style={{ gap: 5, marginBottom: 14 }}>
                {plan.features.map(f => (
                  <View key={f} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <AntDesign name="checkcircle" size={12} color={plan.color} />
                    <Text style={{ color: '#aabbdd', fontSize: 12, fontWeight: '600' }}>{f}</Text>
                  </View>
                ))}
              </View>

              <LinearGradient
                colors={isPagado ? [plan.color + 'dd', plan.color + '99'] : ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.04)']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={{ borderRadius: 12, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}
              >
                {cargando
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <>
                      <Text style={{ color: '#fff', fontWeight: '900', fontSize: 13, letterSpacing: 0.5 }}>
                        {isPagado ? `Activar ${plan.label}` : 'Continuar gratis'}
                      </Text>
                      {!isPagado && <AntDesign name="arrowright" size={14} color="#fff" />}
                    </>
                }
              </LinearGradient>
            </TouchableOpacity>
          )
        })}
      </View>

      <Text style={{ color: '#2a4488', fontSize: 11, textAlign: 'center', marginTop: 16, lineHeight: 16 }}>
        Puedes cambiar de plan en cualquier momento desde tu panel de coach.{'\n'}
        Pagos procesados de forma segura con Stripe.
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  progresoContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 10, gap: 12 },
  progresoTrack: { flex: 1, height: 3, backgroundColor: '#0a0a2e', borderRadius: 2 },
  progresoFill: { height: 3, backgroundColor: '#9933ff', borderRadius: 2 },
  progresoPasoText: { color: '#2a4488', fontSize: 11, fontWeight: '700', minWidth: 36, textAlign: 'right' },
  pasosRow: { flexDirection: 'row', paddingHorizontal: 20, paddingBottom: 16 },
  pasoIndicadorDot: {
    width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: '#0f1a3a',
    backgroundColor: '#05050f', justifyContent: 'center', alignItems: 'center',
  },
  pasoIndicadorActivo: { borderColor: '#9933ff', backgroundColor: '#9933ff' },
  pasoIndicadorDone:   { borderColor: '#9933ff', backgroundColor: '#9933ff33' },
  pasoConector:     { flex: 1, height: 1.5, backgroundColor: '#0f1a3a' },
  pasoConectorDone: { backgroundColor: '#9933ff55' },
  scroll: { padding: 20, paddingBottom: 40 },

  // Bienvenida
  bienvenidaContainer: { alignItems: 'center', paddingTop: 10 },
  logoWrap: {
    width: 80, height: 80, borderRadius: 22,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginBottom: 16,
    shadowColor: '#9933ff', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, shadowRadius: 20, elevation: 20,
  },
  logoInner: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', borderRadius: 22 },
  logoR: { fontSize: 14, fontWeight: '900', color: '#fff' },
  logoF: { fontSize: 14, fontWeight: '900', color: '#9933ff' },
  coachBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#9933ff15', borderWidth: 1, borderColor: '#9933ff33',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 18,
  },
  coachBadgeText: { color: '#9933ff', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  bienvenidaTitulo: { fontSize: 30, fontWeight: '900', color: '#fff', letterSpacing: 0.3, marginBottom: 12, textAlign: 'center', lineHeight: 36 },
  bienvenidaSub: { fontSize: 13, color: '#2a4488', textAlign: 'center', lineHeight: 20, marginBottom: 28, paddingHorizontal: 8 },
  featuresGrid: { width: '100%', gap: 10, marginBottom: 32 },
  featureItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#05050f', borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 14, padding: 14,
  },
  featureIconWrap: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: '#0a0a1f', borderWidth: 1, borderColor: '#9933ff44',
    justifyContent: 'center', alignItems: 'center',
  },
  featureText: { color: '#aabbdd', fontSize: 13, fontWeight: '600' },
  btnBienvenida: {
    width: W - 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 18, borderRadius: 16,
    shadowColor: '#9933ff', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 10,
  },
  btnBienvenidaText: { color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 2 },

  // Pasos
  pasoTitulo: { fontSize: 26, fontWeight: '900', color: '#fff', marginBottom: 6 },
  pasoSub: { fontSize: 13, color: '#2a4488', marginBottom: 22, lineHeight: 19 },

  // Inputs
  fieldLabel: { color: '#2a4488', fontSize: 9, fontWeight: '900', letterSpacing: 2, marginBottom: 8, marginTop: 2 },
  required: { color: '#ff4466', fontWeight: '900' },
  optional: { color: '#1a3060', fontWeight: '700' },
  edadBadge: {
    marginRight: 10, paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, backgroundColor: '#0a1535',
    borderWidth: 1, borderColor: 'rgba(153,51,255,0.25)',
  },
  edadBadgeText: { color: '#9933ff', fontSize: 11, fontWeight: '700' },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#05050f', borderWidth: 1, borderColor: '#0f1a3a',
    borderRadius: 14, marginBottom: 16, overflow: 'hidden',
  },
  input: { flex: 1, color: '#fff', padding: 14, fontSize: 15 },

  // Género
  generoChip: {
    flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5,
    borderColor: '#0f1a3a', backgroundColor: '#05050f', alignItems: 'center',
  },
  generoChipActivo: { borderColor: '#9933ff', backgroundColor: '#9933ff15' },
  generoChipText: { color: '#2a4488', fontSize: 12, fontWeight: '700' },

  // Objetivo
  opcionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#05050f', borderWidth: 1.5, borderColor: '#0f1a3a', borderRadius: 14, padding: 14, marginBottom: 8,
  },
  opcionDot: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 1.5,
    justifyContent: 'center', alignItems: 'center',
  },
  opcionDotInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'transparent' },
  opcionLabel: { color: '#aabbdd', fontSize: 14, fontWeight: '800' },

  // Logo picker
  logoPickerWrap: {
    width: 72, height: 72, borderRadius: 16, borderWidth: 1.5,
    borderColor: '#9933ff44', borderStyle: 'dashed',
    backgroundColor: '#9933ff08', justifyContent: 'center', alignItems: 'center', gap: 4,
  },
  logoPickerText: { color: '#9933ff', fontSize: 9, fontWeight: '700' },

  // Chips especialidades
  chipsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 22, borderWidth: 1.5, borderColor: '#0f1a3a', backgroundColor: '#05050f',
  },
  chipActivo: { borderColor: '#9933ff', backgroundColor: '#9933ff15' },
  chipText: { color: '#2a4488', fontSize: 13, fontWeight: '700' },
  chipTextActivo: { color: '#9933ff' },

  // Certificaciones imágenes
  certGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  certThumbWrap: { width: 80, height: 80, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  certThumb: { width: 80, height: 80, borderRadius: 12 },
  certThumbDelete: {
    position: 'absolute', top: 4, right: 4,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center',
  },
  certAddBtn: {
    width: 80, height: 80, borderRadius: 12, borderWidth: 1.5,
    borderColor: '#9933ff44', borderStyle: 'dashed',
    backgroundColor: '#9933ff08', justifyContent: 'center', alignItems: 'center', gap: 4,
  },
  certAddText: { color: '#9933ff', fontSize: 10, fontWeight: '700' },

  // Final card
  finalCard: {
    backgroundColor: '#05050f', borderWidth: 1.5, borderColor: '#9933ff33',
    borderRadius: 18, padding: 22, alignItems: 'center', marginTop: 12,
  },
  finalCardTitulo: { color: '#fff', fontSize: 18, fontWeight: '900', marginBottom: 8 },
  finalCardDesc: { color: '#2a4488', fontSize: 13, textAlign: 'center', lineHeight: 19 },

  // Botones
  botonesRow: {
    flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingVertical: 16,
    borderTopWidth: 1, borderTopColor: '#05051a',
  },
  btnAtras: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 18, paddingVertical: 14,
    borderRadius: 14, borderWidth: 1.5, borderColor: '#0f1a3a', backgroundColor: '#05050f',
  },
  btnAtrasText: { color: '#4488ff', fontWeight: '700', fontSize: 14 },
  btnSiguiente: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  btnSiguienteGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14,
  },
  btnSiguienteText: { color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 0.5 },
})
