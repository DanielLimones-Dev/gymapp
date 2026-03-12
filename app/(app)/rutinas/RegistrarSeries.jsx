// ============================================
// REGISTRAR SERIES — Tracking real del entrenamiento
// Estilo RP (Renaissance Periodization)
// ============================================
import { useState, useRef } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated,
  TextInput, Modal, KeyboardAvoidingView, Platform
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { AntDesign } from '@expo/vector-icons'

export default function RegistrarSeries({ 
  visible, 
  onClose, 
  ejercicio,
  onGuardar 
}) {
  // Estado inicial de series basado en la prescripción
  const seriesIniciales = Array.from({ length: ejercicio.series }, (_, i) => ({
    numero: i + 1,
    peso: ejercicio.peso || '',
    reps: '',
    rir: ejercicio.rir || '2',
    completada: false
  }))

  const [series, setSeries] = useState(seriesIniciales)
  const [feedback, setFeedback] = useState({
    pump: null,      // 1-5
    soreness: null,  // 1-5
    dificultad: null // 1-5 (workload)
  })
  const [notas, setNotas] = useState('')
  const [fechaSesion, setFechaSesion] = useState(new Date()) // Fecha de la sesión
  const [mostrarCalendario, setMostrarCalendario] = useState(false)
  const [mesActualCalendario, setMesActualCalendario] = useState(new Date())
  const [toastVisible, setToastVisible] = useState(false)
  const toastAnim = useRef(new Animated.Value(-420)).current

  function actualizarSerie(index, campo, valor) {
    const nuevasSeries = [...series]
    nuevasSeries[index][campo] = valor
    
    // Marcar como completada si tiene peso y reps
    if (campo === 'peso' || campo === 'reps') {
      nuevasSeries[index].completada = nuevasSeries[index].peso && nuevasSeries[index].reps
    }
    
    setSeries(nuevasSeries)
  }

  function duplicarSerie(index) {
    const nuevasSeries = [...series]
    const serieDuplicada = { 
      ...nuevasSeries[index],
      numero: series.length + 1,
      completada: false 
    }
    nuevasSeries.push(serieDuplicada)
    setSeries(nuevasSeries)
  }

  function eliminarSerie(index) {
    if (series.length <= 1) return
    const nuevasSeries = series.filter((_, i) => i !== index)
    // Renumerar
    nuevasSeries.forEach((s, i) => s.numero = i + 1)
    setSeries(nuevasSeries)
  }

  function mostrarToast() {
    setToastVisible(true)
    toastAnim.setValue(-420)
    Animated.spring(toastAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 70,
      friction: 11,
    }).start()
    setTimeout(() => {
      Animated.timing(toastAnim, {
        toValue: 420,
        duration: 320,
        useNativeDriver: true,
      }).start(() => setToastVisible(false))
    }, 2600)
  }

  function guardarYCerrar() {
    const seriesCompletadas = series.filter(s => s.completada)
    
    if (seriesCompletadas.length === 0) {
      alert('Debes completar al menos una serie')
      return
    }

    // Usar la fecha seleccionada (normalizada a medianoche para comparar días)
    const fechaNormalizada = new Date(fechaSesion)
    fechaNormalizada.setHours(12, 0, 0, 0) // Medio día para evitar problemas de zona horaria

    const sesion = {
      ejercicioId: ejercicio.id,
      ejercicioNombre: ejercicio.nombre,
      fecha: fechaNormalizada.toISOString(),
      series: seriesCompletadas,
      feedback,
      notas,
      volumenTotal: seriesCompletadas.reduce((acc, s) => acc + (parseFloat(s.peso) * parseInt(s.reps)), 0)
    }

    mostrarToast()
    onGuardar(sesion)
    setTimeout(() => onClose(), 2000)
  }

  const seriesCompletadas = series.filter(s => s.completada).length
  const volumenTotal = series
    .filter(s => s.completada)
    .reduce((acc, s) => acc + (parseFloat(s.peso || 0) * parseInt(s.reps || 0)), 0)

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.modalOverlay}
      >
        <LinearGradient colors={['rgba(0,0,0,0.95)', '#000000']} style={styles.gradient}>
          <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

            {/* HEADER */}
            <View style={styles.header}>
              <View>
                <Text style={styles.ejercicioNombre}>{ejercicio.nombre}</Text>
                <Text style={styles.ejercicioGrupo}>{ejercicio.grupo}</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <AntDesign name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* SELECTOR DE FECHA */}
            <TouchableOpacity 
              style={styles.fechaSelector}
              onPress={() => setMostrarCalendario(true)}
            >
              <View style={styles.fechaInfo}>
                <Text style={styles.fechaLabel}>FECHA DE LA SESIÓN</Text>
                <Text style={styles.fechaTexto}>
                  {fechaSesion.toLocaleDateString('es-MX', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </Text>
              </View>
              <AntDesign name="calendar" size={20} color="#4488ff" />
            </TouchableOpacity>

            {/* PRESCRIPCIÓN */}
            <View style={styles.prescripcionCard}>
              <Text style={styles.prescripcionLabel}>PRESCRIPCIÓN</Text>
              <View style={styles.prescripcionRow}>
                <View style={styles.prescripcionItem}>
                  <Text style={styles.prescripcionNum}>{ejercicio.series}</Text>
                  <Text style={styles.prescripcionText}>series</Text>
                </View>
                <View style={styles.prescripcionDivider} />
                <View style={styles.prescripcionItem}>
                  <Text style={styles.prescripcionNum}>{ejercicio.reps}</Text>
                  <Text style={styles.prescripcionText}>reps</Text>
                </View>
                <View style={styles.prescripcionDivider} />
                <View style={styles.prescripcionItem}>
                  <Text style={styles.prescripcionNum}>RIR {ejercicio.rir}</Text>
                  <Text style={styles.prescripcionText}>reserva</Text>
                </View>
              </View>
            </View>

            {/* PROGRESO */}
            <View style={styles.progresoBar}>
              <View style={styles.progresoInfo}>
                <Text style={styles.progresoLabel}>
                  {seriesCompletadas} / {series.length} series
                </Text>
                
              </View>
              <View style={styles.progresoTrack}>
                <View style={[styles.progresoFill, { width: `${(seriesCompletadas / series.length) * 100}%` }]} />
              </View>
            </View>

            {/* TABLA DE SERIES */}
            <View style={styles.seriesHeader}>
              <Text style={styles.seriesHeaderText}>SERIE</Text>
              <Text style={styles.seriesHeaderText}>PESO (kg)</Text>
              <Text style={styles.seriesHeaderText}>REPS</Text>
              <Text style={styles.seriesHeaderText}>RIR</Text>
              <Text style={styles.seriesHeaderText}>•</Text>
            </View>

            {series.map((serie, index) => (
              <View key={index} style={[styles.serieRow, serie.completada && styles.serieRowCompleta]}>
                {/* Número */}
                <View style={styles.serieNumBox}>
                  <Text style={styles.serieNum}>{serie.numero}</Text>
                  {serie.completada && (
                    <View style={styles.checkBadge}>
                      <AntDesign name="check" size={8} color="#fff" />
                    </View>
                  )}
                </View>

                {/* Peso */}
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.input}
                    placeholder="—"
                    placeholderTextColor="#2a2a4a"
                    value={serie.peso}
                    onChangeText={v => actualizarSerie(index, 'peso', v)}
                    keyboardType="decimal-pad"
                  />
                </View>

                {/* Reps */}
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.input}
                    placeholder="—"
                    placeholderTextColor="#2a2a4a"
                    value={serie.reps}
                    onChangeText={v => actualizarSerie(index, 'reps', v)}
                    keyboardType="number-pad"
                  />
                </View>

                {/* RIR */}
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.input}
                    placeholder="—"
                    placeholderTextColor="#2a2a4a"
                    value={serie.rir}
                    onChangeText={v => actualizarSerie(index, 'rir', v)}
                    keyboardType="number-pad"
                  />
                </View>

                {/* Acciones */}
                <View style={styles.accionesBox}>
                  <TouchableOpacity onPress={() => duplicarSerie(index)} style={styles.accionBtn}>
                    <AntDesign name="pluscircleo" size={14} color="#4488ff" />
                  </TouchableOpacity>
                  {series.length > 1 && (
                    <TouchableOpacity onPress={() => eliminarSerie(index)} style={styles.accionBtn}>
                      <AntDesign name="delete" size={14} color="#ff3355" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}

            {/* Agregar serie */}
            <TouchableOpacity 
              style={styles.agregarSerieBtn}
              onPress={() => setSeries([...series, { 
                numero: series.length + 1, 
                peso: series[series.length - 1]?.peso || '',
                reps: '', 
                rir: ejercicio.rir || '2',
                completada: false 
              }])}
            >
              <AntDesign name="plus" size={14} color="#4488ff" />
              <Text style={styles.agregarSerieText}>Agregar serie</Text>
            </TouchableOpacity>

            {/* FEEDBACK ESTILO RP */}
            <View style={styles.feedbackSection}>
              <Text style={styles.feedbackTitulo}>FEEDBACK POST-EJERCICIO</Text>
              
              {/* Pump */}
              <View style={styles.feedbackRow}>
                <Text style={styles.feedbackLabel}>💪 Pump</Text>
                <View style={styles.feedbackBtns}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <TouchableOpacity
                      key={n}
                      style={[styles.feedbackBtn, feedback.pump === n && styles.feedbackBtnActivo]}
                      onPress={() => setFeedback(f => ({ ...f, pump: n }))}
                    >
                      <Text style={[styles.feedbackBtnText, feedback.pump === n && styles.feedbackBtnTextActivo]}>
                        {n}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Soreness */}
              <View style={styles.feedbackRow}>
                <Text style={styles.feedbackLabel}>🔥 Fatiga</Text>
                <View style={styles.feedbackBtns}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <TouchableOpacity
                      key={n}
                      style={[styles.feedbackBtn, feedback.soreness === n && styles.feedbackBtnActivo]}
                      onPress={() => setFeedback(f => ({ ...f, soreness: n }))}
                    >
                      <Text style={[styles.feedbackBtnText, feedback.soreness === n && styles.feedbackBtnTextActivo]}>
                        {n}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Dificultad */}
              <View style={styles.feedbackRow}>
                <Text style={styles.feedbackLabel}>⚡ Dificultad</Text>
                <View style={styles.feedbackBtns}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <TouchableOpacity
                      key={n}
                      style={[styles.feedbackBtn, feedback.dificultad === n && styles.feedbackBtnActivo]}
                      onPress={() => setFeedback(f => ({ ...f, dificultad: n }))}
                    >
                      <Text style={[styles.feedbackBtnText, feedback.dificultad === n && styles.feedbackBtnTextActivo]}>
                        {n}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* NOTAS */}
            <View style={styles.notasSection}>
              <Text style={styles.notasLabel}>NOTAS (OPCIONAL)</Text>
              <View style={styles.notasBox}>
                <TextInput
                  style={styles.notasInput}
                  placeholder="Ej: Buen rango de movimiento, aumentar peso la próxima..."
                  placeholderTextColor="#2a2a4a"
                  value={notas}
                  onChangeText={setNotas}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>

            {/* GUARDAR */}
          <TouchableOpacity style={styles.guardarBtn} onPress={guardarYCerrar}>
              <LinearGradient colors={['#1a3aff', '#0022cc']} style={styles.guardarGradient}>
                <Text style={styles.guardarText}>GUARDAR SESIÓN</Text>
                <AntDesign name="check" size={16} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>

          </ScrollView>

          {/* TOAST PREMIUM — slide izquierda → derecha */}
          {toastVisible && (
            <Animated.View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 9999,
                transform: [{ translateX: toastAnim }],
              }}
              pointerEvents="none"
            >
              <LinearGradient
                colors={['#001f0a', '#002a10', '#001a08']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 14,
                  paddingHorizontal: 20, paddingVertical: 18,
                  borderBottomWidth: 1.5, borderBottomColor: '#00cc44',
                  shadowColor: '#00cc44', shadowOpacity: 0.5, shadowRadius: 20,
                  shadowOffset: { width: 0, height: 6 }, elevation: 30,
                }}
              >
                <View style={{
                  width: 40, height: 40, borderRadius: 12,
                  backgroundColor: '#004418', borderWidth: 1.5, borderColor: '#00cc44',
                  justifyContent: 'center', alignItems: 'center',
                }}>
                  <AntDesign name="checkcircle" size={22} color="#00cc44" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#00cc44', fontWeight: '900', fontSize: 15, letterSpacing: 0.3 }}>
                    Sesión guardada
                  </Text>
                  <Text style={{ color: '#00884a', fontSize: 12, marginTop: 2, fontWeight: '600' }}>
                    El progreso fue registrado correctamente
                  </Text>
                </View>
                <View style={{
                  width: 6, height: 40, borderRadius: 3,
                  backgroundColor: '#00cc44', opacity: 0.6,
                }} />
              </LinearGradient>
            </Animated.View>
          )}
        </LinearGradient>

        {/* MODAL CALENDARIO */}
        {mostrarCalendario && (
          <Modal visible={true} transparent animationType="fade">
            <TouchableOpacity
              style={styles.calendarioOverlay}
              activeOpacity={1}
              onPress={() => setMostrarCalendario(false)}
            >
              <View style={styles.calendarioModal}>
                <View style={styles.calendarioHeader}>
                  <Text style={styles.calendarioTitulo}>Seleccionar fecha</Text>
                  <TouchableOpacity onPress={() => setMostrarCalendario(false)}>
                    <AntDesign name="close" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>

                {(() => {
                  const hoy = new Date()
                  
                  const primerDia = new Date(mesActualCalendario.getFullYear(), mesActualCalendario.getMonth(), 1)
                  const ultimoDia = new Date(mesActualCalendario.getFullYear(), mesActualCalendario.getMonth() + 1, 0)
                  const diasEnMes = ultimoDia.getDate()
                  const primerDiaSemana = primerDia.getDay()
                  
                  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
                  
                  const cambiarMes = (direccion) => {
                    const nuevoMes = new Date(mesActualCalendario)
                    nuevoMes.setMonth(mesActualCalendario.getMonth() + direccion)
                    setMesActualCalendario(nuevoMes)
                  }
                  
                  const seleccionarFecha = (dia) => {
                    const nuevaFecha = new Date(mesActualCalendario.getFullYear(), mesActualCalendario.getMonth(), dia)
                    setFechaSesion(nuevaFecha)
                    setMostrarCalendario(false)
                  }
                  
                  return (
                    <>
                      <View style={styles.calendarioNav}>
                        <TouchableOpacity onPress={() => cambiarMes(-1)} style={styles.calendarioBtn}>
                          <AntDesign name="left" size={18} color="#4488ff" />
                        </TouchableOpacity>
                        <Text style={styles.calendarioMes}>
                          {meses[mesActualCalendario.getMonth()]} {mesActualCalendario.getFullYear()}
                        </Text>
                        <TouchableOpacity onPress={() => cambiarMes(1)} style={styles.calendarioBtn}>
                          <AntDesign name="right" size={18} color="#4488ff" />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.calendarioDias}>
                        {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((dia, i) => (
                          <Text key={i} style={styles.calendarioDiaLabel}>{dia}</Text>
                        ))}
                      </View>

                      <View style={styles.calendarioGrid}>
                        {Array.from({ length: primerDiaSemana }).map((_, i) => (
                          <View key={`empty-${i}`} style={styles.calendarioCeldaVacia} />
                        ))}
                        {Array.from({ length: diasEnMes }).map((_, i) => {
                          const dia = i + 1
                          const fecha = new Date(mesActualCalendario.getFullYear(), mesActualCalendario.getMonth(), dia)
                          const esHoy = fecha.toDateString() === hoy.toDateString()
                          const esSeleccionado = fecha.toDateString() === fechaSesion.toDateString()
                          
                          return (
                            <TouchableOpacity
                              key={dia}
                              style={[
                                styles.calendarioCelda,
                                esHoy && styles.calendarioCeldaHoy,
                                esSeleccionado && styles.calendarioCeldaActiva
                              ]}
                              onPress={() => seleccionarFecha(dia)}
                            >
                              <Text style={[
                                styles.calendarioCeldaText,
                                esHoy && styles.calendarioCeldaHoyText,
                                esSeleccionado && styles.calendarioCeldaActivaText
                              ]}>
                                {dia}
                              </Text>
                            </TouchableOpacity>
                          )
                        })}
                      </View>
                    </>
                  )
                })()}
              </View>
            </TouchableOpacity>
          </Modal>
        )}
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1 },
  gradient: { flex: 1 },
  container: { padding: 20, paddingTop: 60, paddingBottom: 40 },
  
  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  ejercicioNombre: { fontSize: 24, fontWeight: '900', color: '#fff', marginBottom: 4 },
  ejercicioGrupo: { fontSize: 13, color: '#2a4488' },
  closeBtn: { padding: 8, borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 10, backgroundColor: '#05050f' },

  // Selector de fecha
  fechaSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#05050f',
    borderWidth: 1,
    borderColor: '#0f1a3a',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16
  },
  fechaInfo: { flex: 1 },
  fechaLabel: { fontSize: 10, color: '#2a4488', letterSpacing: 2, fontWeight: '700', marginBottom: 4 },
  fechaTexto: { fontSize: 14, color: '#fff', fontWeight: '700', textTransform: 'capitalize' },

  // Calendario modal
  calendarioOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  calendarioModal: { backgroundColor: '#05050f', borderRadius: 20, borderWidth: 1, borderColor: '#0033ff', padding: 20, width: '85%', maxWidth: 400 },
  calendarioHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#0f1a3a' },
  calendarioTitulo: { fontSize: 16, fontWeight: '900', color: '#fff' },
  calendarioNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  calendarioBtn: { padding: 8, borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 8, backgroundColor: '#0a0a1f' },
  calendarioMes: { fontSize: 16, fontWeight: '700', color: '#fff' },
  calendarioDias: { flexDirection: 'row', marginBottom: 8 },
  calendarioDiaLabel: { flex: 1, textAlign: 'center', color: '#2a4488', fontSize: 12, fontWeight: '700' },
  calendarioGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarioCeldaVacia: { width: '14.28%', aspectRatio: 1 },
  calendarioCelda: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  calendarioCeldaHoy: { backgroundColor: '#0a0a2a', borderWidth: 1, borderColor: '#2a4488' },
  calendarioCeldaActiva: { backgroundColor: '#0033ff' },
  calendarioCeldaText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  calendarioCeldaHoyText: { color: '#4488ff', fontWeight: '700' },
  calendarioCeldaActivaText: { color: '#fff', fontWeight: '700' },

  // Prescripción
  prescripcionCard: { backgroundColor: '#05050f', borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 14, padding: 16, marginBottom: 16 },
  prescripcionLabel: { fontSize: 10, color: '#2a4488', letterSpacing: 2, fontWeight: '700', marginBottom: 12 },
  prescripcionRow: { flexDirection: 'row', alignItems: 'center' },
  prescripcionItem: { flex: 1, alignItems: 'center' },
  prescripcionNum: { color: '#fff', fontWeight: '900', fontSize: 16, marginBottom: 4 },
  prescripcionText: { color: '#2a4488', fontSize: 11 },
  prescripcionDivider: { width: 1, height: 30, backgroundColor: '#0f1a3a' },

  // Progreso
  progresoBar: { backgroundColor: '#05050f', borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 14, padding: 16, marginBottom: 20 },
  progresoInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  progresoLabel: { color: '#fff', fontWeight: '700', fontSize: 13 },
  progresoVolumen: { color: '#4488ff', fontWeight: '700', fontSize: 13 },
  progresoTrack: { height: 6, backgroundColor: '#0a0a2a', borderRadius: 3, overflow: 'hidden' },
  progresoFill: { height: '100%', backgroundColor: '#0033ff', borderRadius: 3 },

  // Tabla header
  seriesHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingHorizontal: 8 },
  seriesHeaderText: { flex: 1, fontSize: 10, color: '#2a4488', fontWeight: '700', letterSpacing: 1, textAlign: 'center' },

  // Serie row
  serieRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, padding: 12, backgroundColor: '#05050f', borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 12 },
  serieRowCompleta: { borderColor: '#0033ff', backgroundColor: '#05051f' },
  serieNumBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#0a0a2a', borderWidth: 1, borderColor: '#1a1a3a', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  serieNum: { color: '#4488ff', fontWeight: '900', fontSize: 16 },
  checkBadge: { position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: 8, backgroundColor: '#00cc44', justifyContent: 'center', alignItems: 'center' },
  
  inputBox: { flex: 1 },
  input: { color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'center', padding: 8, backgroundColor: '#0a0a1f', borderRadius: 8 },
  
  accionesBox: { flexDirection: 'row', gap: 4 },
  accionBtn: { padding: 6 },

  // Agregar serie
  agregarSerieBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 12, marginBottom: 24, borderStyle: 'dashed' },
  agregarSerieText: { color: '#4488ff', fontWeight: '700', fontSize: 13 },

  // Feedback
  feedbackSection: { backgroundColor: '#05050f', borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 14, padding: 16, marginBottom: 16 },
  feedbackTitulo: { fontSize: 12, color: '#2a4488', letterSpacing: 2, fontWeight: '700', marginBottom: 16 },
  feedbackRow: { marginBottom: 16 },
  feedbackLabel: { color: '#fff', fontSize: 13, fontWeight: '700', marginBottom: 8 },
  feedbackBtns: { flexDirection: 'row', gap: 8 },
  feedbackBtn: { flex: 1, padding: 12, borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 10, backgroundColor: '#0a0a1f', alignItems: 'center' },
  feedbackBtnActivo: { borderColor: '#0033ff', backgroundColor: '#05051f' },
  feedbackBtnText: { color: '#2a4488', fontWeight: '700', fontSize: 14 },
  feedbackBtnTextActivo: { color: '#4488ff' },

  // Notas
  notasSection: { marginBottom: 24 },
  notasLabel: { fontSize: 10, color: '#2a4488', letterSpacing: 2, fontWeight: '700', marginBottom: 8 },
  notasBox: { borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 14, backgroundColor: '#0a0a1f', padding: 14 },
  notasInput: { color: '#fff', fontSize: 14, minHeight: 80, textAlignVertical: 'top' },

  // Guardar
  guardarBtn: { borderRadius: 14, overflow: 'hidden' },
  guardarGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, gap: 8 },
  guardarText: { color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 2 },
})
