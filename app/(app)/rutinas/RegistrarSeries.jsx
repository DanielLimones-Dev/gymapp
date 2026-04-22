// ============================================
// REGISTRAR SERIES — Tracking real del entrenamiento
// Estilo Premium iOS 2026
// ============================================
import React, { useState, useRef, useContext, useEffect } from 'react'
import {
  View, Text, StyleSheet, ScrollView, Animated,
  TextInput, TouchableOpacity, Pressable,
  Keyboard, Platform, Dimensions
} from 'react-native'

const SCREEN_HEIGHT = Dimensions.get('window').height
import { LinearGradient } from 'expo-linear-gradient'
import ManagedModal from '../../../components/ManagedModal'
import DraggableSheet from '../../../components/DraggableSheet'
import { CoachThemeContext, hexToRgb } from '../../../lib/coachTheme'
import CardEntrance from '../../../components/CardEntrance'
import { AntDesign } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'

export default function RegistrarSeries({
  visible,
  onClose,
  ejercicio,
  onGuardar
}) {
  const { gradColors, accentColor } = useContext(CoachThemeContext)
  const acRgb = hexToRgb(accentColor)
  const [series, setSeries] = useState([])
  const [unidadPeso, setUnidadPeso] = useState('kg')
  const [feedback, setFeedback] = useState({
    pump: null,
    soreness: null,
    dificultad: null,
  })
  const [notas, setNotas] = useState('')
  const [fechaSesion, setFechaSesion] = useState(new Date())
  const [mostrarCalendario, setMostrarCalendario] = useState(false)
  const [mesActualCalendario, setMesActualCalendario] = useState(new Date())
  const [kbHeight, setKbHeight] = useState(0)

  useEffect(() => {
    if (!visible) { setKbHeight(0); return }
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'
    const subShow = Keyboard.addListener(showEvent, e => setKbHeight(e.endCoordinates.height))
    const subHide = Keyboard.addListener(hideEvent, () => setKbHeight(0))
    return () => { subShow.remove(); subHide.remove() }
  }, [visible])

  // Resetear estado al abrir o cambiar de ejercicio
  React.useEffect(() => {
    if (visible && ejercicio) {
      const iniciales = Array.from({ length: parseInt(ejercicio.series) || 3 }, (_, i) => ({
        id: Date.now() + i,
        numero: i + 1,
        peso: ejercicio.peso ? String(ejercicio.peso) : '',
        reps: '',
        rir: ejercicio.rir ? String(ejercicio.rir) : '2',
        completada: false
      }))
      setSeries(iniciales)
      setUnidadPeso('kg')
      setFeedback({ pump: null, soreness: null })
      setNotas('')
      setFechaSesion(new Date())
    }
  }, [visible, ejercicio?.id])

  function actualizarSerie(index, campo, valor) {
    const nuevasSeries = [...series]
    nuevasSeries[index][campo] = valor
    
    if (campo === 'reps') {
      nuevasSeries[index].completada = !!nuevasSeries[index].reps
    }
    
    setSeries(nuevasSeries)
  }

  function eliminarSerie(index) {
    if (series.length <= 1) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    const nuevasSeries = series.filter((_, i) => i !== index)
    nuevasSeries.forEach((s, i) => s.numero = i + 1)
    setSeries(nuevasSeries)
  }

  function guardarYCerrar() {
    const seriesCompletadas = series.filter(s => s.completada)
    if (seriesCompletadas.length === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      alert('Debes completar al menos una serie')
      return
    }

    const fechaNormalizada = new Date(fechaSesion)
    fechaNormalizada.setHours(12, 0, 0, 0)

    const sesion = {
      ejercicioId: ejercicio.id,
      ejercicioNombre: ejercicio.nombre,
      fecha: fechaNormalizada.toISOString(),
      series: seriesCompletadas,
      unidadPeso,
      feedback,
      notas,
      volumenTotal: seriesCompletadas.reduce((acc, s) => acc + (parseFloat(s.peso || 0) * parseInt(s.reps || 0)), 0)
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    onGuardar(sesion)
    onClose()
  }

  const seriesCompletadasCount = series.filter(s => s.completada).length

  return (
    <ManagedModal visible={visible} transparent animationType="none">
      <DraggableSheet
        onClose={onClose}
        scrollable={true}
        gradientColors={gradColors}
        containerStyle={{ borderColor: `rgba(${acRgb},0.22)`, marginBottom: kbHeight, maxHeight: kbHeight > 0 ? SCREEN_HEIGHT - kbHeight - 40 : '92%' }}
        header={
          <View style={{ marginBottom: 20 }}>
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: -0.3 }}>{ejercicio.nombre}</Text>
            <Text style={{ color: `rgba(${acRgb},0.5)`, fontSize: 11, fontWeight: '700', marginTop: 3, letterSpacing: 1.5 }}>{ejercicio.grupo?.toUpperCase()}</Text>
          </View>
        }
      >
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              {/* FECHA */}
              <TouchableOpacity 
                style={styles.fechaSelector}
                onPress={() => setMostrarCalendario(true)}
              >
                <View style={styles.fechaInfo}>
                  <Text style={styles.fechaLabel}>FECHA DE ENTRENAMIENTO</Text>
                  <Text style={styles.fechaTexto}>
                    {fechaSesion.toLocaleDateString('es-MX', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'long'
                    })}
                  </Text>
                </View>
                <AntDesign name="calendar" size={20} color={accentColor} />
              </TouchableOpacity>

              {/* OBJETIVO */}
              <View style={[styles.prescripcionCard, { backgroundColor: `rgba(${acRgb},0.05)`, borderColor: `rgba(${acRgb},0.1)` }]}>
                <Text style={styles.sectionLabel}>OBJETIVO ASIGNADO</Text>
                <View style={styles.prescripcionRow}>
                  <View style={styles.prescripcionItem}>
                    <Text style={styles.prescripcionNum}>{ejercicio.series}</Text>
                    <Text style={[styles.prescripcionText, { color: accentColor }]}>SERIES</Text>
                  </View>
                  <View style={[styles.prescripcionDivider, { backgroundColor: `rgba(${acRgb},0.2)` }]} />
                  <View style={styles.prescripcionItem}>
                    <Text style={styles.prescripcionNum}>{ejercicio.reps}</Text>
                    <Text style={[styles.prescripcionText, { color: accentColor }]}>REPS</Text>
                  </View>
                  <View style={[styles.prescripcionDivider, { backgroundColor: `rgba(${acRgb},0.2)` }]} />
                  <View style={styles.prescripcionItem}>
                    <Text style={styles.prescripcionNum}>RIR {ejercicio.rir}</Text>
                    <Text style={[styles.prescripcionText, { color: accentColor }]}>ESFUERZO</Text>
                  </View>
                </View>
              </View>

              {/* PROGRESO */}
              <View style={styles.progresoBar}>
                <View style={styles.progresoInfo}>
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>SESIÓN EN CURSO</Text>
                  <Text style={{ color: accentColor, fontSize: 13, fontWeight: '900' }}>
                    {seriesCompletadasCount} / {series.length}
                  </Text>
                </View>
                <View style={styles.progresoTrack}>
                  <View style={[styles.progresoFill, { width: `${(seriesCompletadasCount / series.length) * 100}%`, backgroundColor: accentColor }]} />
                </View>
              </View>

              {/* TABLA HEADER */}
              <View style={[styles.seriesHeader, { gap: 10, paddingHorizontal: 14 }]}>
                <Text style={[styles.seriesHeaderText, { width: 32, textAlign: 'center' }]}>ID</Text>
                <View style={[styles.segmentedControl, { flex: 1.2, borderColor: `rgba(${acRgb},0.12)` }]}>
                  {[['kg', 'KG'], ['placas', 'PL'], ['lbs', 'LBS']].map(([val, label]) => (
                    <TouchableOpacity
                      key={val}
                      onPress={() => setUnidadPeso(val)}
                      style={[styles.segmentBtn, unidadPeso === val && { backgroundColor: accentColor }]}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.segmentText, { color: unidadPeso === val ? '#fff' : `rgba(${acRgb},0.45)` }]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={[styles.seriesHeaderText, { flex: 1 }]}>REPS</Text>
                <Text style={[styles.seriesHeaderText, { flex: 1 }]}>RIR</Text>
                <View style={{ width: 40 }} />
              </View>

              {series.map((serie, index) => (
                <CardEntrance animate key={serie.id} delay={index * 40} style={[styles.serieRow, serie.completada && styles.serieRowCompleta]}>
                  <View style={[styles.serieNumBox, { backgroundColor: `rgba(${acRgb},0.1)` }]}>
                    <Text style={[styles.serieNum, { color: accentColor }]}>{serie.numero}</Text>
                    {serie.completada && (
                      <View style={styles.checkBadge}>
                        <AntDesign name="check" size={8} color="#fff" />
                      </View>
                    )}
                  </View>

                  <View style={[styles.inputBox, { flex: 1.2 }]}>
                    <TextInput
                      style={styles.input}
                      placeholder="0"
                      placeholderTextColor="rgba(255,255,255,0.1)"
                      value={serie.peso}
                      onChangeText={v => actualizarSerie(index, 'peso', v)}
                      keyboardType={unidadPeso === 'placas' ? 'number-pad' : 'decimal-pad'}
                    />
                  </View>

                  <View style={[styles.inputBox, { flex: 1 }]}>
                    <TextInput
                      style={styles.input}
                      placeholder="0"
                      placeholderTextColor="rgba(255,255,255,0.1)"
                      value={serie.reps}
                      onChangeText={v => actualizarSerie(index, 'reps', v)}
                      keyboardType="number-pad"
                    />
                  </View>

                  <View style={[styles.inputBox, { flex: 1 }]}>
                    <TextInput
                      style={styles.input}
                      placeholder="2"
                      placeholderTextColor="rgba(255,255,255,0.1)"
                      value={serie.rir}
                      onChangeText={v => actualizarSerie(index, 'rir', v)}
                      keyboardType="number-pad"
                    />
                  </View>

                  <View style={styles.accionesBox}>
                    {series.length > 1 && (
                      <TouchableOpacity onPress={() => eliminarSerie(index)} style={styles.accionBtn}>
                        <AntDesign name="delete" size={18} color="#ff3355" />
                      </TouchableOpacity>
                    )}
                  </View>
                </CardEntrance>
              ))}

              <TouchableOpacity
                style={[styles.agregarSerieBtn, { borderColor: `rgba(${acRgb},0.3)`, backgroundColor: `rgba(${acRgb},0.02)` }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
                  setSeries([...series, {
                    id: Date.now(),
                    numero: series.length + 1,
                    peso: series[series.length - 1]?.peso || '',
                    reps: '',
                    rir: ejercicio.rir || '2',
                    completada: false
                  }])
                }}
              >
                <AntDesign name="plus" size={14} color={accentColor} />
                <Text style={[styles.agregarSerieText, { color: accentColor }]}>AÑADIR SERIE</Text>
              </TouchableOpacity>

            {/* FEEDBACK */}
            <View style={styles.feedbackSection}>
              <Text style={styles.feedbackTitulo}>ANÁLISIS DE ESFUERZO</Text>

              <View style={styles.feedbackRow}>
                <Text style={styles.feedbackLabel}>PUMP (CONGESTIÓN)</Text>
                <View style={styles.feedbackBtns}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <TouchableOpacity
                      key={n}
                      style={[styles.feedbackBtn, feedback.pump === n && styles.feedbackBtnActivo, feedback.pump === n && { borderColor: `rgba(${acRgb},0.4)`, backgroundColor: `rgba(${acRgb},0.1)` }]}
                      onPress={() => setFeedback(f => ({ ...f, pump: n }))}
                    >
                      <Text style={[styles.feedbackBtnText, feedback.pump === n && styles.feedbackBtnTextActivo, feedback.pump === n && { color: accentColor }]}>{n}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.feedbackRow}>
                <Text style={styles.feedbackLabel}>FATIGA MUSCULAR</Text>
                <View style={styles.feedbackBtns}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <TouchableOpacity
                      key={n}
                      style={[styles.feedbackBtn, feedback.soreness === n && styles.feedbackBtnActivo, feedback.soreness === n && { borderColor: `rgba(${acRgb},0.4)`, backgroundColor: `rgba(${acRgb},0.1)` }]}
                      onPress={() => setFeedback(f => ({ ...f, soreness: n }))}
                    >
                      <Text style={[styles.feedbackBtnText, feedback.soreness === n && styles.feedbackBtnTextActivo, feedback.soreness === n && { color: accentColor }]}>{n}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.feedbackRow}>
                <Text style={styles.feedbackLabel}>DIFICULTAD DEL EJERCICIO</Text>
                <View style={styles.feedbackBtns}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <TouchableOpacity
                      key={n}
                      style={[styles.feedbackBtn, feedback.dificultad === n && styles.feedbackBtnActivo, feedback.dificultad === n && { borderColor: `rgba(${acRgb},0.4)`, backgroundColor: `rgba(${acRgb},0.1)` }]}
                      onPress={() => setFeedback(f => ({ ...f, dificultad: n }))}
                    >
                      <Text style={[styles.feedbackBtnText, feedback.dificultad === n && styles.feedbackBtnTextActivo, feedback.dificultad === n && { color: accentColor }]}>{n}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* NOTAS */}
            <View style={styles.notasSection}>
              <Text style={styles.sectionLabel}>NOTAS DE SESIÓN</Text>
              <View style={styles.notasBox}>
                <TextInput
                  style={styles.notasInput}
                  placeholder="Escribe sensaciones o ajustes..."
                  placeholderTextColor="rgba(255,255,255,0.1)"
                  value={notas}
                  onChangeText={setNotas}
                  multiline
                />
              </View>
            </View>

            {/* GUARDAR */}
            <TouchableOpacity
              style={styles.guardarBtn}
              onPress={guardarYCerrar}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[accentColor, accentColor + 'cc']}
                start={{x:0, y:0}}
                end={{x:1, y:0}}
                style={styles.guardarGradient}
              >
                <Text style={styles.guardarText}>FINALIZAR SESIÓN</Text>
                <AntDesign name="arrow-right" size={20} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
      </DraggableSheet>



      {/* CALENDARIO MODAL */}
      {mostrarCalendario && (
        <ManagedModal visible={true} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setMostrarCalendario(false)} />
            <LinearGradient
              colors={gradColors}
              style={[styles.calBox, { borderColor: `rgba(${acRgb},0.25)` }]}
            >
              <View style={styles.calHandle} />

              {/* Header */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: -0.3 }}>Fecha de sesión</Text>
                <TouchableOpacity onPress={() => setMostrarCalendario(false)} style={styles.closeBtn}>
                  <AntDesign name="close" size={16} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* Navegador de mes */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, backgroundColor: `rgba(${acRgb},0.08)`, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: `rgba(${acRgb},0.15)` }}>
                <TouchableOpacity
                  onPress={() => { const n = new Date(mesActualCalendario); n.setMonth(n.getMonth() - 1); setMesActualCalendario(n) }}
                  style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}
                >
                  <AntDesign name="left" size={13} color={accentColor} />
                </TouchableOpacity>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14, letterSpacing: 0.5 }}>
                  {mesActualCalendario.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }).toUpperCase()}
                </Text>
                <TouchableOpacity
                  onPress={() => { const n = new Date(mesActualCalendario); n.setMonth(n.getMonth() + 1); setMesActualCalendario(n) }}
                  style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}
                >
                  <AntDesign name="right" size={13} color={accentColor} />
                </TouchableOpacity>
              </View>

              {/* Header días */}
              <View style={{ flexDirection: 'row', marginBottom: 6 }}>
                {['D','L','M','X','J','V','S'].map(d => (
                  <Text key={d} style={{ width: '14.28%', textAlign: 'center', color: `rgba(${acRgb},0.5)`, fontSize: 10, fontWeight: '800', letterSpacing: 1 }}>{d}</Text>
                ))}
              </View>

              {/* Grid días */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {Array.from({ length: new Date(mesActualCalendario.getFullYear(), mesActualCalendario.getMonth(), 1).getDay() }).map((_, i) => (
                  <View key={`e${i}`} style={{ width: '14.28%', height: 44 }} />
                ))}
                {Array.from({ length: new Date(mesActualCalendario.getFullYear(), mesActualCalendario.getMonth() + 1, 0).getDate() }).map((_, i) => {
                  const d = i + 1
                  const f = new Date(mesActualCalendario.getFullYear(), mesActualCalendario.getMonth(), d)
                  const sel = f.toDateString() === fechaSesion.toDateString()
                  const hoy = f.toDateString() === new Date().toDateString()
                  return (
                    <TouchableOpacity
                      key={d}
                      onPress={() => { setFechaSesion(f); setMostrarCalendario(false) }}
                      style={{ width: '14.28%', height: 44, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <View style={[
                        { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
                        sel && { backgroundColor: accentColor },
                        hoy && !sel && { backgroundColor: `rgba(${acRgb},0.15)`, borderWidth: 1, borderColor: `rgba(${acRgb},0.35)` },
                      ]}>
                        <Text style={{ color: sel ? '#fff' : hoy ? accentColor : 'rgba(255,255,255,0.75)', fontWeight: sel ? '900' : hoy ? '800' : '400', fontSize: 14 }}>{d}</Text>
                      </View>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </LinearGradient>
          </View>
        </ManagedModal>
      )}
    </ManagedModal>
  )
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 2, 15, 0.85)', justifyContent: 'center', alignItems: 'center' },
  calBox: { borderRadius: 28, borderWidth: 1, padding: 24, width: '88%', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 16 },
  calHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginBottom: 20, marginTop: -4 },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  ejercicioNombre: { fontSize: 24, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  ejercicioGrupo: { fontSize: 11, color: '#8E8E93', fontWeight: '800', letterSpacing: 1.5, marginTop: 2 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },

  fechaSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  fechaInfo: { flex: 1 },
  fechaLabel: { fontSize: 9, color: '#8E8E93', letterSpacing: 1.5, fontWeight: '800', marginBottom: 4 },
  fechaTexto: { fontSize: 15, color: '#fff', fontWeight: '700', textTransform: 'capitalize' },

  sectionLabel: { fontSize: 10, color: '#8E8E93', letterSpacing: 2, fontWeight: '800', marginBottom: 12 },

  prescripcionCard: { backgroundColor: 'rgba(68,136,255,0.05)', borderRadius: 24, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(68,136,255,0.1)' },
  prescripcionRow: { flexDirection: 'row', alignItems: 'center' },
  prescripcionItem: { flex: 1, alignItems: 'center' },
  prescripcionNum: { color: '#fff', fontWeight: '900', fontSize: 18, marginBottom: 2 },
  prescripcionText: { color: '#4488ff', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  prescripcionDivider: { width: 1, height: 24, backgroundColor: 'rgba(68,136,255,0.2)' },

  progresoBar: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  progresoInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  progresoTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' },
  progresoFill: { height: '100%', backgroundColor: '#4488ff', borderRadius: 3 },

  seriesHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingHorizontal: 12 },
  seriesHeaderText: { fontSize: 10, color: '#8E8E93', fontWeight: '800', letterSpacing: 1, textAlign: 'center' },

  serieRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12, padding: 14, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 18 },
  serieRowCompleta: { borderColor: 'rgba(0,204,68,0.3)', backgroundColor: 'rgba(0,204,68,0.05)' },
  serieNumBox: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(68,136,255,0.1)', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  serieNum: { color: '#4488ff', fontWeight: '800', fontSize: 14 },
  checkBadge: { position: 'absolute', top: -4, right: -4, width: 14, height: 14, borderRadius: 7, backgroundColor: '#00cc44', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },

  inputBox: { marginHorizontal: 2 },
  input: { color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'center', padding: 10, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  tipoBadge: { alignSelf: 'center', marginTop: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  tipoBadgeText: { color: 'rgba(255,255,255,0.45)', fontSize: 9, fontWeight: '800', letterSpacing: 1 },

  segmentedControl: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 2, borderWidth: 1 },
  segmentBtn: { flex: 1, paddingVertical: 6, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  segmentText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },

  accionesBox: { width: 40, alignItems: 'center' },
  accionBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255, 51, 85, 0.1)', alignItems: 'center', justifyContent: 'center' },

  agregarSerieBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderWidth: 1, borderColor: 'rgba(68,136,255,0.3)', borderRadius: 20, marginBottom: 28, borderStyle: 'dashed', backgroundColor: 'rgba(68,136,255,0.02)' },
  agregarSerieText: { color: '#4488ff', fontWeight: '800', fontSize: 13, letterSpacing: 1 },

  feedbackSection: { backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 28, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  feedbackTitulo: { fontSize: 11, color: '#8E8E93', letterSpacing: 1.5, fontWeight: '800', marginBottom: 20, textTransform: 'uppercase' },
  feedbackRow: { marginBottom: 20 },
  feedbackLabel: { color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 12 },
  feedbackBtns: { flexDirection: 'row', gap: 8 },
  feedbackBtn: { flex: 1, height: 44, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center' },
  feedbackBtnActivo: { borderColor: 'rgba(68,136,255,0.4)', backgroundColor: 'rgba(68,136,255,0.1)' },
  feedbackBtnText: { color: '#8E8E93', fontWeight: '700', fontSize: 15 },
  feedbackBtnTextActivo: { color: '#4488ff', fontWeight: '800' },

  notasSection: { marginBottom: 32 },
  notasBox: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.03)', padding: 16 },
  notasInput: { color: '#fff', fontSize: 15, minHeight: 100, textAlignVertical: 'top', fontWeight: '500' },

  guardarBtn: { borderRadius: 20, overflow: 'hidden' },
  guardarGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 20, gap: 12 },
  guardarText: { color: '#fff', fontWeight: '900', fontSize: 16, letterSpacing: 1.5 },

  toastContainer: { position: 'absolute', top: 40, left: 20, right: 20, zIndex: 9999 },
  toastGradient: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 16, borderRadius: 20, borderWidth: 1, borderColor: '#00cc44', backgroundColor: 'rgba(10, 15, 35, 0.95)', shadowColor: '#00cc44', shadowOpacity: 0.3, shadowRadius: 20, shadowOffset: { width: 0, height: 6 }, elevation: 10 },
})
