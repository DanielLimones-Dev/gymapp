// ============================================
// ONBOARDING — RepForge v2
// Flujo paso a paso con progreso visual
// app/onboarding.jsx
// ============================================
import { useState, useEffect, useRef } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Switch, Platform, ActivityIndicator,
  Animated, Dimensions, KeyboardAvoidingView, Pressable, DeviceEventEmitter
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { AntDesign } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import Toast from 'react-native-toast-message'
import AsyncStorage from '@react-native-async-storage/async-storage'

const { width: W } = Dimensions.get('window')

const OBJETIVOS = [
  { key: 'hipertrofia',   label: 'Hipertrofia',   icon: 'thunderbolt', desc: 'Ganar masa muscular y tamaño',       color: '#4488ff' },
  { key: 'fuerza',        label: 'Fuerza',         icon: 'trophy',      desc: 'Aumentar fuerza máxima',            color: '#ff9900' },
  { key: 'definicion',    label: 'Definición',     icon: 'fire',        desc: 'Reducir grasa y marcar músculo',    color: '#ff3355' },
  { key: 'recomposicion', label: 'Recomposición',  icon: 'sync',        desc: 'Ganar músculo y perder grasa',      color: '#9933ff' },
  { key: 'resistencia',   label: 'Resistencia',    icon: 'heart',       desc: 'Mejorar condición física general',  color: '#00cc44' },
]

const NIVELES = [
  { key: 'Principiante', label: 'Principiante', desc: 'Menos de 1 año',   stars: 1 },
  { key: 'Intermedio',   label: 'Intermedio',   desc: '1 a 3 años',        stars: 2 },
  { key: 'Avanzado',     label: 'Avanzado',     desc: 'Más de 3 años',     stars: 3 },
  { key: 'Élite',        label: 'Élite',        desc: 'Competidor activo', stars: 4 },
]

const DIAS_SEMANA = [
  { key: 0, label: 'L' }, { key: 1, label: 'M' }, { key: 2, label: 'X' },
  { key: 3, label: 'J' }, { key: 4, label: 'V' }, { key: 5, label: 'S' }, { key: 6, label: 'D' },
]

const GENEROS = ['Masculino', 'Femenino', 'Otro']

const PASOS = [
  { id: 0, titulo: 'Inicio',      icono: 'rocket'  },
  { id: 1, titulo: 'Perfil',      icono: 'user'     },
  { id: 2, titulo: 'Objetivo',    icono: 'aim'      },
  { id: 3, titulo: 'Nivel',       icono: 'star'     },
  { id: 4, titulo: 'Horario',     icono: 'calendar' },
  { id: 5, titulo: 'Coach',       icono: 'team'     },
]

export default function Onboarding() {
  const [paso, setPaso]       = useState(0)
  const [loading, setLoading] = useState(false)

  // Formulario
  const [nombre, setNombre]                       = useState('')
  const [peso, setPeso]                           = useState('')
  const [altura, setAltura]                       = useState('')
  const [genero, setGenero]                       = useState('')
  const [fechaNac, setFechaNac]                   = useState('')
  const [objetivo, setObjetivo]                   = useState(null)
  const [nivel, setNivel]                         = useState(null)
  const [diasEntrenamiento, setDiasEntrenamiento] = useState([])
  const [compite, setCompite]                     = useState(false)
  const [tieneLesiones, setTieneLesiones]         = useState(false)
  const [lesionesDesc, setLesionesDesc]           = useState('')
  const [codigoCoach, setCodigoCoach]             = useState('')

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

  // Restaurar progreso
  useEffect(() => {
    async function restaurar() {
      try {
        const g = await AsyncStorage.getItem('onboarding_progreso')
        if (!g) return
        const d = JSON.parse(g)
        if (d.nombre)                    setNombre(d.nombre)
        if (d.peso)                      setPeso(d.peso)
        if (d.altura)                    setAltura(d.altura)
        if (d.genero)                    setGenero(d.genero)
        if (d.fechaNac)                  setFechaNac(d.fechaNac)
        if (d.objetivo)                  setObjetivo(d.objetivo)
        if (d.nivel)                     setNivel(d.nivel)
        if (d.diasEntrenamiento)         setDiasEntrenamiento(d.diasEntrenamiento)
        if (d.compite !== undefined)     setCompite(d.compite)
        if (d.tieneLesiones !== undefined) setTieneLesiones(d.tieneLesiones)
        if (d.lesionesDesc)              setLesionesDesc(d.lesionesDesc)
        if (d.codigoCoach)               setCodigoCoach(d.codigoCoach)
      } catch(e) {}
    }
    restaurar()
  }, [])

  // Guardar progreso automáticamente
  useEffect(() => {
    async function guardar() {
      try {
        await AsyncStorage.setItem('onboarding_progreso', JSON.stringify({
          nombre, peso, altura, genero, fechaNac, objetivo, nivel,
          diasEntrenamiento, compite, tieneLesiones, lesionesDesc, codigoCoach
        }))
      } catch(e) {}
    }
    guardar()
  }, [nombre, peso, altura, genero, fechaNac, objetivo, nivel, diasEntrenamiento, compite, tieneLesiones, lesionesDesc, codigoCoach])

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
    if (paso === 1) {
      if (!nombre.trim()) { Toast.show({ type: 'error', text1: 'Falta tu nombre' }); return }
      if (!peso || isNaN(+peso)) { Toast.show({ type: 'error', text1: 'Ingresa tu peso en kg' }); return }
      if (!altura || isNaN(+altura)) { Toast.show({ type: 'error', text1: 'Ingresa tu altura en cm' }); return }
    }
    if (paso === 2 && !objetivo) {
      Toast.show({ type: 'error', text1: 'Elige tu objetivo' }); return
    }
    if (paso === 3 && !nivel) {
      Toast.show({ type: 'error', text1: 'Elige tu nivel' }); return
    }
    if (paso === 4 && diasEntrenamiento.length === 0) {
      Toast.show({ type: 'error', text1: 'Selecciona al menos un día' }); return
    }

    if (paso < PASOS.length - 1) {
      animarTransicion('adelante', paso + 1)
    } else {
      handleGuardar()
    }
  }

  function anterior() {
    if (paso > 0) animarTransicion('atras', paso - 1)
  }

  function toggleDia(key) {
    setDiasEntrenamiento(prev =>
      prev.includes(key) ? prev.filter(d => d !== key) : [...prev, key]
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

  async function handleGuardar() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Sin sesión activa')

      let coachId = null
      if (codigoCoach.trim()) {
        const { data: cod } = await supabase
          .from('codigos_invitacion')
          .select('coach_id, usado')
          .eq('codigo', codigoCoach.trim().toUpperCase())
          .single()
        if (!cod || cod.usado) {
          Toast.show({ type: 'error', text1: 'Código inválido', text2: 'No existe o ya fue usado' })
          setLoading(false)
          return
        }
        coachId = cod.coach_id
        const { error: rpcError } = await supabase.rpc('reclamar_codigo', {
          p_codigo: codigoCoach.trim().toUpperCase()
        })
        if (rpcError) {
          Toast.show({ type: 'error', text1: 'Error al usar el código', text2: rpcError.message })
          setLoading(false)
          return
        }
      }

      // Parsear fecha DD/MM/YYYY
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

      const { error } = await supabase.from('perfiles').upsert({
        id: user.id,
        nombre_completo: nombre.trim(),
        peso: parseFloat(peso),
        altura: parseFloat(altura),
        genero: genero || null,
        fecha_nacimiento: fechaNacimiento,
        edad,
        objetivo,
        nivel_experiencia: nivel,
        compite,
        tiene_lesiones: tieneLesiones,
        descripcion_lesiones: tieneLesiones ? lesionesDesc : null,
        coach_id: coachId,
        rol: 'cliente',
      })

      if (error) throw error

      // Evidencia de aceptación de T&C
      await supabase.from('terminos_aceptados').insert({
        usuario_id: user.id,
        version: '1.0',
        plataforma: Platform.OS,
      })

      await AsyncStorage.removeItem('onboarding_progreso')
      await AsyncStorage.removeItem('pending_rol')
      Toast.show({ type: 'success', text1: '¡Bienvenido a RepForge! ⚡', text2: 'Tu perfil está listo' })
      DeviceEventEmitter.emit('onboarding_complete')
    } catch(e) {
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
            {paso === 0 && <PasoBienvenida onSiguiente={siguiente} />}
            {paso === 1 && (
              <PasoCuerpo
                nombre={nombre} setNombre={setNombre}
                peso={peso} setPeso={setPeso}
                altura={altura} setAltura={setAltura}
                genero={genero} setGenero={setGenero}
                fechaNac={fechaNac} setFechaNac={setFechaNac}
                calcularEdad={calcularEdad}
              />
            )}
            {paso === 2 && <PasoObjetivo objetivo={objetivo} setObjetivo={setObjetivo} />}
            {paso === 3 && (
              <PasoNivel
                nivel={nivel} setNivel={setNivel}
                compite={compite} setCompite={setCompite}
                tieneLesiones={tieneLesiones} setTieneLesiones={setTieneLesiones}
                lesionesDesc={lesionesDesc} setLesionesDesc={setLesionesDesc}
              />
            )}
            {paso === 4 && <PasoHorario dias={diasEntrenamiento} toggleDia={toggleDia} />}
            {paso === 5 && <PasoCoach codigoCoach={codigoCoach} setCodigoCoach={setCodigoCoach} />}
          </ScrollView>
        </Animated.View>

        {/* BOTONES */}
        {paso > 0 && (
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
                        {paso === PASOS.length - 1 ? 'COMENZAR ⚡' : 'Siguiente'}
                      </Text>
                      {paso < PASOS.length - 1 && <AntDesign name="right" size={16} color="#fff" />}
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

// ── PASO 0: Bienvenida ────────────────────────────────────────
function PasoBienvenida({ onSiguiente }) {
  const pulseAnim = useRef(new Animated.Value(1)).current
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.06, duration: 1400, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 1400, useNativeDriver: true }),
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

      <Text style={styles.bienvenidaTitulo}>Tu entrenamiento,{'\n'}sin límites</Text>
      <Text style={styles.bienvenidaSub}>
        En 2 minutos configuramos tu perfil para darte la experiencia más personalizada.
      </Text>

      <View style={styles.featuresGrid}>
        {[
          { icon: 'calendar',   text: 'Periodización inteligente' },
          { icon: 'bars',  text: 'Seguimiento de progreso real' },
          { icon: 'bulb',       text: 'IA de entrenamiento' },
          { icon: 'team',       text: 'Conexión con tu coach' },
        ].map(f => (
          <View key={f.icon} style={styles.featureItem}>
            <View style={styles.featureIconWrap}>
              <AntDesign name={f.icon} size={18} color="#4488ff" />
            </View>
            <Text style={styles.featureText}>{f.text}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity onPress={onSiguiente} activeOpacity={0.85}>
        <LinearGradient colors={['#1a3aff', '#0022cc']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnBienvenida}>
          <Text style={styles.btnBienvenidaText}>EMPEZAR AHORA</Text>
          <AntDesign name="arrow-right" size={18} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  )
}

// ── PASO 1: Cuerpo ────────────────────────────────────────────
function PasoCuerpo({ nombre, setNombre, peso, setPeso, altura, setAltura, genero, setGenero, fechaNac, setFechaNac, calcularEdad }) {
  const edad = calcularEdad(fechaNac)

  function formatearFecha(text) {
    const nums = text.replace(/\D/g, '')
    if (nums.length <= 2) return nums
    if (nums.length <= 4) return `${nums.slice(0,2)}/${nums.slice(2)}`
    return `${nums.slice(0,2)}/${nums.slice(2,4)}/${nums.slice(4,8)}`
  }

  return (
    <View>
      <Text style={styles.pasoTitulo}>Cuéntanos sobre ti</Text>
      <Text style={styles.pasoSub}>Necesitamos estos datos para personalizar tu plan</Text>

      <Text style={styles.fieldLabel}>NOMBRE <Text style={styles.required}>*</Text></Text>
      <View style={styles.inputWrap}>
        <AntDesign name="user" size={16} color="#2a4488" style={{ paddingLeft: 14 }} />
        <TextInput style={styles.input} placeholder="¿Cómo te llamamos?" placeholderTextColor="#1a2a4a" value={nombre} onChangeText={setNombre} />
      </View>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.fieldLabel}>PESO (kg) <Text style={styles.required}>*</Text></Text>
          <View style={styles.inputWrap}>
            <TextInput style={[styles.input, { paddingLeft: 14 }]} placeholder="75" placeholderTextColor="#1a2a4a" value={peso} onChangeText={setPeso} keyboardType="decimal-pad" />
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.fieldLabel}>ALTURA (cm) <Text style={styles.required}>*</Text></Text>
          <View style={styles.inputWrap}>
            <TextInput style={[styles.input, { paddingLeft: 14 }]} placeholder="175" placeholderTextColor="#1a2a4a" value={altura} onChangeText={setAltura} keyboardType="decimal-pad" />
          </View>
        </View>
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
            <Text style={[styles.generoChipText, genero === g && { color: '#4488ff' }]}>{g}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  )
}

// ── PASO 2: Objetivo ──────────────────────────────────────────
function PasoObjetivo({ objetivo, setObjetivo }) {
  return (
    <View>
      <Text style={styles.pasoTitulo}>¿Para qué entrenas?</Text>
      <Text style={styles.pasoSub}>Esto define tu periodización y recomendaciones de volumen</Text>
      <View style={{ gap: 10 }}>
        {OBJETIVOS.map(o => (
          <TouchableOpacity
            key={o.key}
            style={[styles.opcionCard, objetivo === o.key && { borderColor: o.color, backgroundColor: o.color + '15' }]}
            onPress={() => setObjetivo(o.key)}
            activeOpacity={0.8}
          >
            <View style={[styles.opcionIconWrap, objetivo === o.key && { backgroundColor: o.color + '20', borderColor: o.color }]}>
              <AntDesign name={o.icon} size={20} color={objetivo === o.key ? o.color : '#2a4488'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.opcionLabel, objetivo === o.key && { color: '#fff' }]}>{o.label}</Text>
              <Text style={styles.opcionDesc}>{o.desc}</Text>
            </View>
            {objetivo === o.key && (
              <View style={[{ width: 22, height: 22, borderRadius: 11, backgroundColor: o.color, justifyContent: 'center', alignItems: 'center' }]}>
                <AntDesign name="check" size={12} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

// ── PASO 3: Nivel ─────────────────────────────────────────────
function PasoNivel({ nivel, setNivel, compite, setCompite, tieneLesiones, setTieneLesiones, lesionesDesc, setLesionesDesc }) {
  return (
    <View>
      <Text style={styles.pasoTitulo}>Tu experiencia</Text>
      <Text style={styles.pasoSub}>Sé honesto — esto define la dificultad y volumen de tu plan</Text>
      <View style={{ gap: 10, marginBottom: 24 }}>
        {NIVELES.map(n => (
          <TouchableOpacity
            key={n.key}
            style={[styles.nivelCard, nivel === n.key && styles.nivelCardActivo]}
            onPress={() => setNivel(n.key)}
            activeOpacity={0.8}
          >
            <View style={{ flex: 1 }}>
              <Text style={[{ color: '#aabbdd', fontSize: 15, fontWeight: '800', marginBottom: 2 }, nivel === n.key && { color: '#fff' }]}>{n.label}</Text>
              <Text style={{ color: '#2a4488', fontSize: 12 }}>{n.desc}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 3 }}>
              {[...Array(4)].map((_, i) => (
                <AntDesign key={i} name={i < n.stars ? 'star' : 'star'} size={14}
                  color={i < n.stars ? (nivel === n.key ? '#4488ff' : '#2a4488') : '#1a1a3a'} />
              ))}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.switchCard}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 3 }}>¿Compites actualmente?</Text>
          <Text style={{ color: '#2a4488', fontSize: 12 }}>Fisiculturismo, powerlifting, etc.</Text>
        </View>
        <Switch value={compite} onValueChange={setCompite} trackColor={{ false: '#0f1a3a', true: '#1a3aff' }} thumbColor={compite ? '#4488ff' : '#2a2a4a'} />
      </View>

      <View style={[styles.switchCard, { marginTop: 10 }]}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 3 }}>¿Tienes lesiones u operaciones?</Text>
          <Text style={{ color: '#2a4488', fontSize: 12 }}>Ajustamos ejercicios según tus limitaciones</Text>
        </View>
        <Switch value={tieneLesiones} onValueChange={setTieneLesiones} trackColor={{ false: '#0f1a3a', true: '#1a3aff' }} thumbColor={tieneLesiones ? '#4488ff' : '#2a2a4a'} />
      </View>
      {tieneLesiones && (
        <View style={[styles.inputWrap, { marginTop: 10 }]}>
          <TextInput
            style={[styles.input, { paddingLeft: 14, height: 90, textAlignVertical: 'top' }]}
            placeholder="Describe tus lesiones o restricciones..."
            placeholderTextColor="#1a2a4a"
            value={lesionesDesc}
            onChangeText={setLesionesDesc}
            multiline
          />
        </View>
      )}
    </View>
  )
}

// ── PASO 4: Horario ───────────────────────────────────────────
function PasoHorario({ dias, toggleDia }) {
  const num = dias.length
  const infoDias = [
    { min: 0, max: 2, label: 'Carga baja', color: '#00cc44' },
    { min: 3, max: 4, label: 'Carga moderada', color: '#4488ff' },
    { min: 5, max: 5, label: 'Carga alta', color: '#ff9900' },
    { min: 6, max: 7, label: 'Carga muy alta', color: '#ff3355' },
  ].find(r => num >= r.min && num <= r.max) || { label: '', color: '#2a4488' }

  return (
    <View>
      <Text style={styles.pasoTitulo}>¿Cuándo entrenas?</Text>
      <Text style={styles.pasoSub}>Selecciona tus días habituales de entrenamiento</Text>

      <View style={styles.diasGrid}>
        {DIAS_SEMANA.map(d => (
          <TouchableOpacity
            key={d.key}
            style={[styles.diaBtn, dias.includes(d.key) && styles.diaBtnActivo]}
            onPress={() => toggleDia(d.key)}
            activeOpacity={0.8}
          >
            <Text style={[styles.diaBtnText, dias.includes(d.key) && styles.diaBtnTextActivo]}>{d.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {num > 0 && (
        <View style={[styles.resumenDias, { borderColor: infoDias.color + '44' }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15, marginBottom: 3 }}>
              {num} {num === 1 ? 'día' : 'días'} por semana
            </Text>
            <Text style={{ color: infoDias.color, fontSize: 12, fontWeight: '700' }}>{infoDias.label}</Text>
          </View>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: infoDias.color }} />
        </View>
      )}

      <TouchableOpacity
        style={styles.todosBtn}
        onPress={() => {
          if (dias.length === 7) DIAS_SEMANA.forEach(d => { if (dias.includes(d.key)) toggleDia(d.key) })
          else DIAS_SEMANA.forEach(d => { if (!dias.includes(d.key)) toggleDia(d.key) })
        }}
      >
        <Text style={styles.todosBtnText}>{dias.length === 7 ? 'Limpiar selección' : 'Seleccionar todos'}</Text>
      </TouchableOpacity>
    </View>
  )
}

// ── PASO 5: Coach ─────────────────────────────────────────────
function PasoCoach({ codigoCoach, setCodigoCoach }) {
  return (
    <View>
      <Text style={styles.pasoTitulo}>¿Tienes un coach?</Text>
      <Text style={styles.pasoSub}>Opcional — puedes vincular un coach ahora o después desde Ajustes</Text>

      <View style={styles.coachCard}>
        <View style={styles.coachIconWrap}>
          <AntDesign name="team" size={28} color="#4488ff" />
        </View>
        <Text style={styles.coachCardTitulo}>Código de invitación</Text>
        <Text style={styles.coachCardDesc}>
          Si tu coach te compartió un código, ingrésalo aquí para vincularte a su equipo. Podrá ver tu progreso y enviarte rutinas personalizadas.
        </Text>
        <View style={[styles.inputWrap, { marginTop: 16 }]}>
          <AntDesign name="key" size={16} color="#2a4488" style={{ paddingLeft: 14 }} />
          <TextInput
            style={styles.input}
            placeholder="Ej: ABC123"
            placeholderTextColor="#1a2a4a"
            value={codigoCoach}
            onChangeText={setCodigoCoach}
            autoCapitalize="characters"
          />
        </View>
      </View>

      <View style={styles.saltarInfo}>
        <AntDesign name="info-circle" size={14} color="#2a4488" />
        <Text style={styles.saltarInfoText}>
          Toca "COMENZAR ⚡" para terminar. Puedes vincular un coach después desde Ajustes → Comunidad.
        </Text>
      </View>
    </View>
  )
}

// ── Estilos ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Progreso
  progresoContainer: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingTop: 54, paddingBottom: 8,
  },
  progresoTrack: { flex: 1, height: 3, backgroundColor: '#0a0a1f', borderRadius: 2, overflow: 'hidden' },
  progresoFill: { height: '100%', backgroundColor: '#4488ff', borderRadius: 2 },
  progresoPasoText: { color: '#2a4488', fontSize: 11, fontWeight: '700', width: 36, textAlign: 'right' },

  // Indicadores de pasos
  pasosRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10 },
  pasoIndicadorDot: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#08091a', borderWidth: 1.5, borderColor: '#0f1a3a',
    justifyContent: 'center', alignItems: 'center',
  },
  pasoIndicadorActivo: { borderColor: '#4488ff', backgroundColor: '#1a3aff' },
  pasoIndicadorDone: { borderColor: '#00cc44', backgroundColor: '#003a18' },
  pasoConector: { flex: 1, height: 1.5, backgroundColor: '#0f1a3a', marginHorizontal: 3 },
  pasoConectorDone: { backgroundColor: '#00cc44' },

  // Scroll
  scroll: { padding: 20, paddingBottom: 40 },

  // Botones de navegación
  botonesRow: {
    flexDirection: 'row', gap: 12,
    paddingHorizontal: 20, paddingBottom: 28, paddingTop: 8,
  },
  btnAtras: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 14, backgroundColor: '#05050f',
  },
  btnAtrasText: { color: '#4488ff', fontWeight: '700', fontSize: 13 },
  btnSiguiente: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  btnSiguienteGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16,
  },
  btnSiguienteText: { color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 0.5 },

  // Bienvenida
  bienvenidaContainer: { alignItems: 'center', paddingTop: 10, paddingBottom: 10 },
  logoWrap: {
    width: 88, height: 88, borderRadius: 24,
    borderWidth: 1.5, borderColor: '#1a1a3a', marginBottom: 24, overflow: 'hidden',
    shadowColor: '#4488ff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 24, elevation: 20,
    backgroundColor: '#0f0f23',
  },
  logoInner: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  logoR: { fontSize: 14, fontWeight: '900', color: '#fff' },
  logoF: { fontSize: 14, fontWeight: '900', color: '#4488ff' },
  bienvenidaTitulo: { fontSize: 30, fontWeight: '900', color: '#fff', letterSpacing: 0.3, marginBottom: 12, textAlign: 'center', lineHeight: 36 },
  bienvenidaSub: { fontSize: 13, color: '#2a4488', textAlign: 'center', lineHeight: 20, marginBottom: 28, paddingHorizontal: 8 },
  featuresGrid: { width: '100%', gap: 10, marginBottom: 32 },
  featureItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#05050f', borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 14, padding: 14,
  },
  featureIconWrap: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: '#0a1535', borderWidth: 1, borderColor: '#1a3aff',
    justifyContent: 'center', alignItems: 'center',
  },
  featureText: { color: '#aabbdd', fontSize: 13, fontWeight: '600' },
  btnBienvenida: {
    width: W - 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 18, borderRadius: 16,
    shadowColor: '#1a3aff', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 10,
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
    borderWidth: 1, borderColor: 'rgba(68,136,255,0.25)',
  },
  edadBadgeText: { color: '#4488ff', fontSize: 11, fontWeight: '700' },
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
  generoChipActivo: { borderColor: '#4488ff', backgroundColor: '#4488ff15' },
  generoChipText: { color: '#2a4488', fontSize: 12, fontWeight: '700' },

  // Opciones
  opcionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#05050f', borderWidth: 1.5, borderColor: '#0f1a3a', borderRadius: 16, padding: 16,
  },
  opcionIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#0a0a1f', borderWidth: 1, borderColor: '#1a1a3a',
    justifyContent: 'center', alignItems: 'center',
  },
  opcionLabel: { color: '#aabbdd', fontSize: 15, fontWeight: '800', marginBottom: 2 },
  opcionDesc: { color: '#2a4488', fontSize: 12 },

  // Nivel
  nivelCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#05050f', borderWidth: 1.5, borderColor: '#0f1a3a', borderRadius: 14, padding: 16,
  },
  nivelCardActivo: { borderColor: '#1a3aff', backgroundColor: '#05051f' },

  // Switch
  switchCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#05050f', borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 14, padding: 16,
  },

  // Días
  diasGrid: { flexDirection: 'row', gap: 7, marginBottom: 14 },
  diaBtn: {
    flex: 1, paddingVertical: 18, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#0f1a3a', backgroundColor: '#05050f', alignItems: 'center',
  },
  diaBtnActivo: { borderColor: '#1a3aff', backgroundColor: '#05051f' },
  diaBtnText: { color: '#2a4488', fontWeight: '800', fontSize: 13 },
  diaBtnTextActivo: { color: '#4488ff' },
  resumenDias: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#05050f', borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 10,
  },
  todosBtn: {
    borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 12,
    paddingVertical: 12, alignItems: 'center', backgroundColor: '#05050f',
  },
  todosBtnText: { color: '#2a4488', fontWeight: '700', fontSize: 13 },

  // Coach
  coachCard: {
    backgroundColor: '#05050f', borderWidth: 1.5, borderColor: '#0f1a3a',
    borderRadius: 18, padding: 22, alignItems: 'center', marginBottom: 16,
  },
  coachIconWrap: {
    width: 62, height: 62, borderRadius: 16,
    backgroundColor: '#0a1535', borderWidth: 1.5, borderColor: '#1a3aff',
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
  },
  coachCardTitulo: { color: '#fff', fontSize: 18, fontWeight: '900', marginBottom: 8 },
  coachCardDesc: { color: '#2a4488', fontSize: 13, textAlign: 'center', lineHeight: 19 },
  saltarInfo: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: '#05050f', borderWidth: 1, borderColor: '#0a0a1f',
    borderRadius: 12, padding: 14,
  },
  saltarInfoText: { flex: 1, color: '#2a4488', fontSize: 12, lineHeight: 17 },
})
