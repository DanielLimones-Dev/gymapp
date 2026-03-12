import { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Switch, Platform, ActivityIndicator
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import DateTimePicker from '@react-native-community/datetimepicker'
import { supabase } from '../lib/supabase'
import Toast from 'react-native-toast-message'
import AsyncStorage from '@react-native-async-storage/async-storage'

const OBJETIVOS = [
  { key: 'hipertrofia', label: '💪 Hipertrofia', desc: 'Aumentar masa muscular' },
  { key: 'fuerza', label: '🏋️ Fuerza', desc: 'Aumentar fuerza máxima' },
  { key: 'definicion', label: '🔥 Definición', desc: 'Reducir grasa y marcar músculo' },
  { key: 'competencia', label: '🏆 Competencia', desc: 'Preparación para competir' },
]

const NIVELES = [
  { key: 'principiante', label: '🌱 Principiante', desc: 'Menos de 1 año entrenando' },
  { key: 'intermedio', label: '⚡ Intermedio', desc: '1 a 3 años entrenando' },
  { key: 'avanzado', label: '🔱 Avanzado', desc: 'Más de 3 años entrenando' },
]

const DIAS_SEMANA = [
  { key: 1, label: 'LUN' },
  { key: 2, label: 'MAR' },
  { key: 3, label: 'MIÉ' },
  { key: 4, label: 'JUE' },
  { key: 5, label: 'VIE' },
  { key: 6, label: 'SÁB' },
  { key: 0, label: 'DOM' },
]

const RUTINA_OPCIONES = [
  { key: 'generada_ia', label: '🤖 Generar con IA', desc: 'La IA crea tu rutina personalizada' },
  { key: 'existente', label: '📋 Ya tengo mi rutina', desc: 'Ingresaré mi rutina actual' },
  { key: 'manual', label: '✏️ Crear manualmente', desc: 'La crearé yo más adelante' },
]

export default function Onboarding({ navigation }) {
  const [loading, setLoading] = useState(false)
  const [fechaNacimiento, setFechaNacimiento] = useState(new Date(2000, 0, 1))
  const [mostrarFecha, setMostrarFecha] = useState(false)
  const [peso, setPeso] = useState('')
  const [estatura, setEstatura] = useState('')
  const [objetivo, setObjetivo] = useState(null)
  const [nivel, setNivel] = useState(null)
  const [diasEntrenamiento, setDiasEntrenamiento] = useState([])
  const [compite, setCompite] = useState(false)
  const [tieneLesiones, setTieneLesiones] = useState(false)
  const [descripcionLesiones, setDescripcionLesiones] = useState('')
  const [estadoRutina, setEstadoRutina] = useState(null)
  const [codigoCoach, setCodigoCoach] = useState('')

  // Cargar progreso guardado al abrir
  useEffect(() => {
    async function cargarProgreso() {
      try {
        const guardado = await AsyncStorage.getItem('onboarding_progreso')
        if (guardado) {
          const datos = JSON.parse(guardado)
          if (datos.fechaNacimiento) setFechaNacimiento(new Date(datos.fechaNacimiento))
          if (datos.peso) setPeso(datos.peso)
          if (datos.estatura) setEstatura(datos.estatura)
          if (datos.objetivo) setObjetivo(datos.objetivo)
          if (datos.nivel) setNivel(datos.nivel)
          if (datos.diasEntrenamiento) setDiasEntrenamiento(datos.diasEntrenamiento)
          if (datos.compite !== undefined) setCompite(datos.compite)
          if (datos.tieneLesiones !== undefined) setTieneLesiones(datos.tieneLesiones)
          if (datos.descripcionLesiones) setDescripcionLesiones(datos.descripcionLesiones)
          if (datos.estadoRutina) setEstadoRutina(datos.estadoRutina)
          if (datos.codigoCoach) setCodigoCoach(datos.codigoCoach)
        }
      } catch (e) {}
    }
    cargarProgreso()
  }, [])

  // Guardar progreso automáticamente cada vez que cambia algo
  useEffect(() => {
    async function guardarProgreso() {
      try {
        await AsyncStorage.setItem('onboarding_progreso', JSON.stringify({
          fechaNacimiento: fechaNacimiento.toISOString(),
          peso, estatura, objetivo, nivel,
          diasEntrenamiento, compite, tieneLesiones,
          descripcionLesiones, estadoRutina, codigoCoach
        }))
      } catch (e) {}
    }
    guardarProgreso()
  }, [fechaNacimiento, peso, estatura, objetivo, nivel, diasEntrenamiento, compite, tieneLesiones, descripcionLesiones, estadoRutina, codigoCoach])

  function calcularEdad(fecha) {
    const hoy = new Date()
    let edad = hoy.getFullYear() - fecha.getFullYear()
    const m = hoy.getMonth() - fecha.getMonth()
    if (m < 0 || (m === 0 && hoy.getDate() < fecha.getDate())) edad--
    return edad
  }

  function toggleDia(key) {
    setDiasEntrenamiento(prev =>
      prev.includes(key) ? prev.filter(d => d !== key) : [...prev, key]
    )
  }

  async function handleGuardar() {
    if (!fechaNacimiento) {
      Toast.show({ type: 'error', text1: '📅 Fecha requerida', text2: 'Ingresa tu fecha de nacimiento' })
      return
    }
    if (!peso || isNaN(parseFloat(peso))) {
      Toast.show({ type: 'error', text1: '⚖️ Peso requerido', text2: 'Ingresa tu peso en kg' })
      return
    }
    if (!estatura || isNaN(parseFloat(estatura))) {
      Toast.show({ type: 'error', text1: '📏 Estatura requerida', text2: 'Ingresa tu estatura en cm' })
      return
    }
    if (!objetivo) {
      Toast.show({ type: 'error', text1: '🎯 Objetivo requerido', text2: 'Selecciona tu objetivo de entrenamiento' })
      return
    }
    if (!nivel) {
      Toast.show({ type: 'error', text1: '📊 Nivel requerido', text2: 'Selecciona tu nivel de experiencia' })
      return
    }
    if (diasEntrenamiento.length === 0) {
      Toast.show({ type: 'error', text1: '📅 Días requeridos', text2: 'Selecciona al menos un día de entrenamiento' })
      return
    }
    if (!estadoRutina) {
      Toast.show({ type: 'error', text1: '📋 Rutina requerida', text2: 'Selecciona cómo quieres manejar tu rutina' })
      return
    }

    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    let coachId = null
    if (codigoCoach.trim()) {
      const { data: codigo } = await supabase
        .from('codigos_invitacion')
        .select('coach_id, usado')
        .eq('codigo', codigoCoach.trim().toUpperCase())
        .single()

      if (!codigo || codigo.usado) {
        Toast.show({ type: 'error', text1: 'Código inválido', text2: 'El código no existe o ya fue usado' })
        setLoading(false)
        return
      }
      coachId = codigo.coach_id

      await supabase
        .from('codigos_invitacion')
        .update({ usado: true, cliente_id: user.id })
        .eq('codigo', codigoCoach.trim().toUpperCase())
    }

    const { error } = await supabase.from('perfiles').upsert({
      id: user.id,
      fecha_nacimiento: fechaNacimiento.toISOString().split('T')[0],
      peso: parseFloat(peso),
      estatura: parseFloat(estatura),
      objetivo,
      nivel,
      dias_entrenamiento: diasEntrenamiento,
      compite,
      tiene_lesiones: tieneLesiones,
      descripcion_lesiones: tieneLesiones ? descripcionLesiones : null,
      estado_rutina: estadoRutina,
      coach_id: coachId,
      rol: 'cliente',
    })

    if (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: error.message })
    } else {
      await AsyncStorage.removeItem('onboarding_progreso')
      Toast.show({ type: 'success', text1: '¡Perfil creado! ⚡', text2: 'Bienvenido a RepForge' })
    }
    setLoading(false)
  }

  return (
    <LinearGradient colors={['#000000', '#050510', '#0a0a1f']} style={styles.gradient}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <Text style={styles.titulo}>Cuéntanos sobre ti</Text>
          <Text style={styles.subtitulo}>Personalicemos tu experiencia</Text>
        </View>

        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>👤 DATOS PERSONALES <Text style={styles.requerido}>*</Text></Text>
          <Text style={styles.label}>FECHA DE NACIMIENTO</Text>
          <TouchableOpacity style={styles.dateButton} onPress={() => setMostrarFecha(true)}>
            <Text style={styles.dateText}>{fechaNacimiento.toLocaleDateString('es-MX')}</Text>
            <Text style={styles.dateAge}>  {calcularEdad(fechaNacimiento)} años</Text>
          </TouchableOpacity>
          {mostrarFecha && (
            <DateTimePicker
              value={fechaNacimiento}
              mode="date"
              display="default"
              maximumDate={new Date()}
              onChange={(e, date) => {
                setMostrarFecha(Platform.OS === 'ios')
                if (date) setFechaNacimiento(date)
              }}
            />
          )}
          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={styles.label}>PESO (kg)</Text>
              <View style={styles.inputWrapper}>
                <TextInput style={styles.input} placeholder="75" placeholderTextColor="#2a2a4a" value={peso} onChangeText={setPeso} keyboardType="decimal-pad" />
              </View>
            </View>
            <View style={styles.halfField}>
              <Text style={styles.label}>ESTATURA (cm)</Text>
              <View style={styles.inputWrapper}>
                <TextInput style={styles.input} placeholder="175" placeholderTextColor="#2a2a4a" value={estatura} onChangeText={setEstatura} keyboardType="decimal-pad" />
              </View>
            </View>
          </View>
        </View>

        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>🎯 OBJETIVO <Text style={styles.requerido}>*</Text></Text>
          {OBJETIVOS.map(o => (
            <TouchableOpacity key={o.key} style={[styles.opcionCard, objetivo === o.key && styles.opcionSeleccionada]} onPress={() => setObjetivo(o.key)}>
              <Text style={styles.opcionLabel}>{o.label}</Text>
              <Text style={styles.opcionDesc}>{o.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>📊 NIVEL <Text style={styles.requerido}>*</Text></Text>
          {NIVELES.map(n => (
            <TouchableOpacity key={n.key} style={[styles.opcionCard, nivel === n.key && styles.opcionSeleccionada]} onPress={() => setNivel(n.key)}>
              <Text style={styles.opcionLabel}>{n.label}</Text>
              <Text style={styles.opcionDesc}>{n.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>📅 DÍAS DE ENTRENAMIENTO <Text style={styles.requerido}>*</Text></Text>
          <Text style={styles.switchDesc}>Selecciona los días que entrenas — incluye movilidad y estiramiento</Text>
          <View style={styles.diasRow}>
            {DIAS_SEMANA.map(d => (
              <TouchableOpacity key={d.key} style={[styles.diaButton, diasEntrenamiento.includes(d.key) && styles.diaSeleccionado]} onPress={() => toggleDia(d.key)}>
                <Text style={[styles.diaLabel, diasEntrenamiento.includes(d.key) && styles.diaLabelSeleccionado]}>{d.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.todosButton, diasEntrenamiento.length === 7 && styles.todosSeleccionado]}
            onPress={() => {
              if (diasEntrenamiento.length === 7) {
                setDiasEntrenamiento([])
              } else {
                setDiasEntrenamiento(DIAS_SEMANA.map(d => d.key))
              }
            }}
          >
            <Text style={[styles.todosLabel, diasEntrenamiento.length === 7 && styles.todosLabelSeleccionado]}>
              {diasEntrenamiento.length === 7 ? '✓ Todos los días' : 'Seleccionar todos'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>🏆 COMPETENCIA <Text style={styles.opcional}>(OPCIONAL)</Text></Text>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>¿Compites actualmente?</Text>
              <Text style={styles.switchDesc}>Competencias de fisiculturismo u otros</Text>
            </View>
            <Switch value={compite} onValueChange={setCompite} trackColor={{ false: '#0f1a3a', true: '#0033ff' }} thumbColor={compite ? '#4488ff' : '#2a2a4a'} />
          </View>
        </View>

        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>🩹 LESIONES U OPERACIONES <Text style={styles.opcional}>(OPCIONAL)</Text></Text>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>¿Has tenido lesiones u operaciones?</Text>
              <Text style={styles.switchDesc}>Esto ayuda a adaptar tu rutina</Text>
            </View>
            <Switch value={tieneLesiones} onValueChange={setTieneLesiones} trackColor={{ false: '#0f1a3a', true: '#0033ff' }} thumbColor={tieneLesiones ? '#4488ff' : '#2a2a4a'} />
          </View>
          {tieneLesiones && (
            <View style={[styles.inputWrapper, { marginTop: 12 }]}>
              <TextInput style={[styles.input, { height: 90, textAlignVertical: 'top' }]} placeholder="Describe tus lesiones u operaciones..." placeholderTextColor="#2a2a4a" value={descripcionLesiones} onChangeText={setDescripcionLesiones} multiline />
            </View>
          )}
        </View>

        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>📋 TU RUTINA <Text style={styles.requerido}>*</Text></Text>
          {RUTINA_OPCIONES.map(r => (
            <TouchableOpacity key={r.key} style={[styles.opcionCard, estadoRutina === r.key && styles.opcionSeleccionada]} onPress={() => setEstadoRutina(r.key)}>
              <Text style={styles.opcionLabel}>{r.label}</Text>
              <Text style={styles.opcionDesc}>{r.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>👨‍💼 CÓDIGO DE COACH <Text style={styles.opcional}>(OPCIONAL)</Text></Text>
          <Text style={styles.switchDesc}>¿Tu coach te dio un código? Ingrésalo aquí. También puedes hacerlo después.</Text>
          <View style={[styles.inputWrapper, { marginTop: 12 }]}>
            <TextInput style={styles.input} placeholder="Ej: RF-X7K2" placeholderTextColor="#2a2a4a" value={codigoCoach} onChangeText={setCodigoCoach} autoCapitalize="characters" />
          </View>
        </View>

        <TouchableOpacity style={styles.buttonWrapper} onPress={handleGuardar} disabled={loading}>
          <LinearGradient colors={['#1a3aff', '#0022cc', '#001199']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.button}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>COMENZAR ⚡</Text>}
          </LinearGradient>
        </TouchableOpacity>

      </ScrollView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { padding: 24, paddingTop: 60, paddingBottom: 40 },
  header: { marginBottom: 32 },
  titulo: { fontSize: 32, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  subtitulo: { fontSize: 14, color: '#2a4488', marginTop: 6, letterSpacing: 2 },
  seccion: { marginBottom: 32 },
  seccionTitulo: { fontSize: 11, fontWeight: '800', color: '#2a4488', letterSpacing: 3, marginBottom: 16 },
  opcional: { color: '#1a2a5a', fontWeight: '600' },
  requerido: { color: '#ff3355', fontSize: 13, fontWeight: '900' },
  label: { color: '#2a4488', fontSize: 10, letterSpacing: 2, marginBottom: 6, fontWeight: '700' },
  inputWrapper: { borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 14, backgroundColor: '#05050f' },
  input: { color: '#fff', padding: 16, fontSize: 15 },
  row: { flexDirection: 'row', gap: 12 },
  halfField: { flex: 1 },
  dateButton: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 14, backgroundColor: '#05050f', padding: 16, marginBottom: 16 },
  dateText: { color: '#fff', fontSize: 15 },
  dateAge: { color: '#4488ff', fontSize: 15, fontWeight: '700' },
  opcionCard: { borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 14, backgroundColor: '#05050f', padding: 16, marginBottom: 10 },
  opcionSeleccionada: { borderColor: '#0033ff', backgroundColor: '#05051f', shadowColor: '#0033ff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8 },
  opcionLabel: { color: '#fff', fontSize: 15, fontWeight: '700' },
  opcionDesc: { color: '#2a4488', fontSize: 12, marginTop: 4 },
  diasRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 12 },
  diaButton: { width: '13%', borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 12, backgroundColor: '#05050f', paddingVertical: 14, alignItems: 'center' },
  diaSeleccionado: { borderColor: '#0033ff', backgroundColor: '#05051f', shadowColor: '#0033ff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8 },
  diaLabel: { fontSize: 11, color: '#2a4488', fontWeight: '700' },
  diaLabelSeleccionado: { color: '#4488ff' },
  todosButton: { marginTop: 10, borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 12, backgroundColor: '#05050f', paddingVertical: 12, alignItems: 'center' },
  todosSeleccionado: { borderColor: '#0033ff', backgroundColor: '#05051f', shadowColor: '#0033ff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8 },
  todosLabel: { fontSize: 13, color: '#2a4488', fontWeight: '700', letterSpacing: 1 },
  todosLabelSeleccionado: { color: '#4488ff' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16 },
  switchLabel: { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 4 },
  switchDesc: { color: '#2a4488', fontSize: 12 },
  buttonWrapper: { borderRadius: 14, overflow: 'hidden', marginTop: 8 },
  button: { padding: 18, alignItems: 'center', borderRadius: 14 },
  buttonText: { color: '#fff', fontWeight: '900', fontSize: 15, letterSpacing: 3 },
})