// ============================================
// IASCREEN.JSX — Asistente IA RepForge
// Modo 1: Generar programa desde cero
// Modo 2: Ajustar programa existente
// ============================================
import { useState, useRef, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Modal, TextInput, Animated, Pressable, ActivityIndicator,
  KeyboardAvoidingView, Platform
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import { AntDesign } from '@expo/vector-icons'
import { supabase } from '../../../lib/supabase'
import { cargarPrograma, guardarYSincronizar } from '../../../lib/storage'
import { LAYOUT } from '../../../components/constans'

const NIVELES = ['Principiante', 'Intermedio', 'Avanzado', 'Élite']
const OBJETIVOS = [
  { key: 'hipertrofia', label: 'Hipertrofia', desc: 'Ganar masa muscular' },
  { key: 'fuerza', label: 'Fuerza', desc: 'Maximizar fuerza' },
  { key: 'definicion', label: 'Definición', desc: 'Perder grasa, mantener músculo' },
  { key: 'resistencia', label: 'Resistencia', desc: 'Cardio y aguante' },
  { key: 'recomposicion', label: 'Recomposición', desc: 'Perder grasa y ganar músculo' },
]
const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export default function IAScreen({ userId, onProgramaGenerado }) {
  const [modo, setModo] = useState(null) // 'generar' | 'ajustar'
  const [cargando, setCargando] = useState(false)
  const [perfil, setPerfil] = useState(null)
  const [programa, setPrograma] = useState(null)
  const [respuestaIA, setRespuestaIA] = useState(null)
  const [errorIA, setErrorIA] = useState(null)
  const [modalConfirm, setModalConfirm] = useState(false)
  const [mensajeExtra, setMensajeExtra] = useState('')
  const [progSeleccionado, setProgSeleccionado] = useState(null)
  const [carruselIdx, setCarruselIdx] = useState(0)
  const carruselAnim = useRef(new Animated.Value(0)).current

  // Formulario Generar
  const [formGen, setFormGen] = useState({
    objetivo: '',
    nivel: '',
    diasSeleccionados: [],
    semanas: '12',
    equipamento: 'gimnasio', // gimnasio | casa | calistenia
    notas: '',
  })

  // Animaciones
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current

  useFocusEffect(useCallback(() => {
    cargarDatos()
  }, []))

  useEffect(() => {
    if (modo) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]).start()
    }
  }, [modo])

  function navCarrusel(dir, total) {
    const newIdx = Math.max(0, Math.min(carruselIdx + dir, total - 1))
    if (newIdx === carruselIdx) return
    const fromX = dir > 0 ? 60 : -60
    carruselAnim.setValue(fromX)
    setCarruselIdx(newIdx)
    const prog = (programa?.programas?.filter(p => p.estado !== 'archivado') || [])[newIdx]
    if (prog) setProgSeleccionado(prog)
    Animated.spring(carruselAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 120,
      friction: 8,
    }).start()
  }

  async function cargarDatos() {
    const { data: p } = await supabase.from('perfiles').select('*').eq('id', userId).single()
    setPerfil(p)
    const prog = await cargarPrograma(userId)
    setPrograma(prog)
    const activo = prog?.programas?.find(p => p.estado === 'activo')
    if (activo) setProgSeleccionado(activo)
    // Pre-llenar formulario con datos del onboarding
    if (p) {
      setFormGen(prev => ({
        ...prev,
        objetivo: p.objetivo || '',
        nivel: p.nivel_experiencia || p.nivel || '',
      }))
    }
  }

  function toggleDia(idx) {
    setFormGen(prev => ({
      ...prev,
      diasSeleccionados: prev.diasSeleccionados.includes(idx)
        ? prev.diasSeleccionados.filter(d => d !== idx)
        : [...prev.diasSeleccionados, idx].sort()
    }))
  }

  // ── Construir prompt para generar programa ──────────────────────
  function buildPromptGenerar() {
    const diasNombres = formGen.diasSeleccionados.map(i => DIAS_SEMANA[i]).join(', ')
    const obj = OBJETIVOS.find(o => o.key === formGen.objetivo)
    return `Eres un experto en periodización de entrenamiento con resistencia basado en metodología RP Strength (Renaissance Periodization).

El usuario tiene el siguiente perfil:
- Nombre: ${perfil?.nombre_completo || 'Atleta'}
- Edad: ${perfil?.edad || 'No especificada'}
- Peso: ${perfil?.peso ? perfil.peso + ' kg' : 'No especificado'}
- Objetivo: ${obj?.label || formGen.objetivo} — ${obj?.desc || ''}
- Nivel: ${formGen.nivel}
- Días disponibles: ${diasNombres} (${formGen.diasSeleccionados.length} días/semana)
- Semanas del programa: ${formGen.semanas}
- Equipamento: ${formGen.equipamento}
${formGen.notas ? `- Notas adicionales: ${formGen.notas}` : ''}

Genera un programa de entrenamiento completo estructurado como JSON con este formato EXACTO:
{
  "nombrePrograma": "string",
  "descripcion": "string (2-3 oraciones explicando la lógica del programa)",
  "bloques": [
    {
      "nombre": "string (ej: Bloque 1 - Acumulación)",
      "tipo": "string (Adaptativo|Acumulación|Intensificación|Peaking|Descarga)",
      "semanas": number,
      "ejerciciosPorDia": {
        "0": [
          {
            "nombre": "string",
            "grupo": "string (Pecho|Espalda|Hombros|Bíceps|Tríceps|Cuádriceps|Femorales|Glúteos|Pantorrillas|Abdomen)",
            "series": number,
            "repsMin": number,
            "repsMax": number,
            "rir": number,
            "peso": ""
          }
        ]
      }
    }
  ]
}

Los índices de ejerciciosPorDia corresponden a los días seleccionados: ${formGen.diasSeleccionados.join(', ')} (0=Lunes, 6=Domingo).
Genera ejercicios apropiados para ${formGen.nivel} con progresión lógica entre bloques.
RIR recomendado: 3-4 en acumulación, 1-2 en intensificación, 0-1 en peaking.
Responde SOLO con el JSON válido, sin texto adicional ni markdown.`
  }

  // ── Construir prompt para ajustar programa existente ────────────
  function buildPromptAjustar() {
    const progActivo = progSeleccionado
    if (!progActivo) return null

    const ejerciciosPorBloque = progActivo.bloques?.map(b => {
      const dias = {}
      ;[0,1,2,3,4,5,6].forEach(d => {
        const ejs = programa?.dias?.[`ejercicios_${b.id}_${d}`] || []
        if (ejs.length > 0) dias[d] = ejs
      })
      return { bloque: b.nombre, tipo: b.tipo, ejercicios: dias }
    })

    return `Eres un experto en periodización de entrenamiento con metodología RP Strength.

El usuario tiene este perfil:
- Nombre: ${perfil?.nombre_completo || 'Atleta'}
- Nivel: ${perfil?.nivel_experiencia || perfil?.nivel || 'No especificado'}
- Objetivo actual: ${perfil?.objetivo || 'No especificado'}
- Peso actual: ${perfil?.peso ? perfil.peso + ' kg' : 'No especificado'}

Su programa activo se llama "${progActivo.nombre}" y tiene esta estructura:
${JSON.stringify(ejerciciosPorBloque, null, 2)}

${mensajeExtra ? `El usuario solicita específicamente: ${mensajeExtra}` : ''}

Analiza el programa y proporciona ajustes concretos en formato JSON:
{
  "analisis": "string (2-3 oraciones analizando el programa actual)",
  "ajustes": [
    {
      "bloque": "string",
      "dia": number,
      "ejercicioActual": "string",
      "cambio": "string (reemplazar|modificar|agregar|eliminar)",
      "ejercicioNuevo": "string (si aplica)",
      "seriesNuevas": number,
      "repsMinNuevas": number,
      "repsMaxNuevas": number,
      "rirNuevo": number,
      "razon": "string (explicación breve)"
    }
  ],
  "recomendacionGeneral": "string (consejo principal)"
}

Sé específico y fundamentado en principios de periodización. Responde SOLO con el JSON válido.`
  }

  // ── Llamar a la API de Claude ───────────────────────────────────
  async function llamarIA(prompt) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    const data = await response.json()
    const text = data.content?.find(b => b.type === 'text')?.text || ''
    // Limpiar markdown si viene
    const clean = text.replace(/```json\n?|\n?```/g, '').trim()
    return JSON.parse(clean)
  }

  async function generarPrograma() {
    if (!formGen.objetivo || !formGen.nivel || formGen.diasSeleccionados.length === 0) return
    setCargando(true)
    setErrorIA(null)
    try {
      const prompt = buildPromptGenerar()
      const resultado = await llamarIA(prompt)
      setRespuestaIA({ tipo: 'generar', datos: resultado })
      setModalConfirm(true)
    } catch (e) {
      setErrorIA('Error al conectar con la IA. Verifica tu conexión.')
    } finally {
      setCargando(false)
    }
  }

  async function ajustarPrograma() {
    const progActivo = progSeleccionado
    if (!progActivo) return
    setCargando(true)
    setErrorIA(null)
    try {
      const prompt = buildPromptAjustar()
      const resultado = await llamarIA(prompt)
      setRespuestaIA({ tipo: 'ajustar', datos: resultado })
      setModalConfirm(true)
    } catch (e) {
      setErrorIA('Error al conectar con la IA. Verifica tu conexión.')
    } finally {
      setCargando(false)
    }
  }

  async function aplicarPrograma() {
    if (!respuestaIA || respuestaIA.tipo !== 'generar') return
    const datos = respuestaIA.datos
    try {
      // Construir estructura compatible con el sistema existente
      const nuevoProg = {
        id: Date.now().toString(),
        nombre: datos.nombrePrograma,
        objetivo: formGen.objetivo,
        estado: 'activo',
        fechaInicio: new Date().toISOString().split('T')[0],
        semanas: parseInt(formGen.semanas),
        bloques: datos.bloques.map((b, i) => ({
          id: `bloque_${Date.now()}_${i}`,
          nombre: b.nombre,
          tipo: b.tipo,
          semanas: b.semanas,
          orden: i,
        }))
      }

      const progActual = await cargarPrograma(userId)
      const programas = progActual?.programas || []
      programas.push(nuevoProg)

      // Guardar ejercicios por día por bloque
      const dias = { ...progActual?.dias }
      nuevoProg.bloques.forEach((bloque, bi) => {
        const bloqueData = datos.bloques[bi]
        Object.entries(bloqueData.ejerciciosPorDia || {}).forEach(([diaIdx, ejercs]) => {
          const key = `ejercicios_${bloque.id}_${diaIdx}`
          dias[key] = ejercs.map(e => ({
            id: `${Date.now()}_${Math.random()}`,
            nombre: e.nombre,
            grupo: e.grupo,
            series: e.series,
            repsMin: e.repsMin,
            repsMax: e.repsMax,
            rir: e.rir,
            peso: '',
          }))
        })
        // Configurar días activos
        dias[`dias_${bloque.id}`] = formGen.diasSeleccionados
      })

      await guardarYSincronizar(userId, { programas, dias })
      setModalConfirm(false)
      setModo(null)
      setRespuestaIA(null)
      if (onProgramaGenerado) onProgramaGenerado()
    } catch (e) {
      setErrorIA('Error al guardar el programa.')
    }
  }

  // ── Pantalla de selección de modo ──────────────────────────────
  if (!modo) {
    const progActivo = programa?.programas?.find(p => p.estado === 'activo')
    return (
      <LinearGradient colors={['#000000', '#050510', '#0a0a1f']} style={styles.gradient}>
        <ScrollView contentContainerStyle={[styles.container, { paddingBottom: LAYOUT.bottomTabSpace }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iaBadge}>
              <Text style={styles.iaBadgeText}>IA</Text>
            </View>
            <Text style={styles.titulo}>Asistente RepForge</Text>
            <Text style={styles.subtitulo}>
              Crea o ajusta tu programa con inteligencia artificial basada en periodización RP Strength
            </Text>
          </View>

          {/* Modo 1 — Generar */}
          <Pressable
            style={({ pressed }) => [styles.modoCard, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
            onPress={() => setModo('generar')}
          >
            <LinearGradient colors={['#0a0520', '#050215']} style={styles.modoGradient}>
              <View style={styles.modoIconWrap}>
                <Text style={styles.modoEmoji}>✨</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modoTitulo}>Generar programa</Text>
                <Text style={styles.modoDesc}>
                  La IA crea un programa completo con bloques, ejercicios, series y RIR según tu perfil y objetivo
                </Text>
              </View>
              <AntDesign name="right" size={16} color="#9933ff" />
            </LinearGradient>
          </Pressable>

          {/* Modo 2 — Ajustar */}
          {(() => {
            const disponibles = programa?.programas?.filter(p => p.estado !== 'archivado') || []
            const hayProgramas = disponibles.length > 0
            return (
              <Pressable
                style={({ pressed }) => [
                  styles.modoCard,
                  !hayProgramas && styles.modoCardDisabled,
                  pressed && hayProgramas && { opacity: 0.85, transform: [{ scale: 0.98 }] }
                ]}
                onPress={() => hayProgramas && setModo('ajustar')}
                disabled={!hayProgramas}
              >
                <LinearGradient
                  colors={hayProgramas ? ['#0a1520', '#050f18'] : ['#080808', '#050505']}
                  style={styles.modoGradient}
                >
                  <View style={styles.modoIconWrap}>
                    <AntDesign name="setting" size={22} color={hayProgramas ? '#4488ff' : '#1a2a4a'} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modoTitulo, !hayProgramas && { color: '#2a4488' }]}>
                      Ajustar programa
                    </Text>
                    <Text style={styles.modoDesc}>
                      {hayProgramas
                        ? disponibles.length + ' programa' + (disponibles.length > 1 ? 's disponibles' : ' disponible')
                        : 'No tienes programas disponibles'}
                    </Text>
                  </View>
                  <AntDesign name="right" size={16} color={hayProgramas ? '#4488ff' : '#1a2a4a'} />
                </LinearGradient>
              </Pressable>
            )
          })()}

          {/* Info */}
          <View style={styles.infoCard}>
            <AntDesign name="info" size={14} color="#2a4488" />
            <Text style={styles.infoText}>
              La IA usa tu perfil del onboarding, historial y métricas para personalizar cada recomendación
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>
    )
  }

  // ── Formulario Generar ──────────────────────────────────────────
  if (modo === 'generar') {
    const puedeGenerar = formGen.objetivo && formGen.nivel && formGen.diasSeleccionados.length > 0
    return (
      <LinearGradient colors={['#000000', '#050510', '#0a0a1f']} style={styles.gradient}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <Pressable
                style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
                onPress={() => setModo(null)}
              >
                <AntDesign name="left" size={16} color="#4488ff" />
              </Pressable>
              <Text style={styles.titulo}>Nuevo programa con IA</Text>
            </View>

            {/* Objetivo */}
            <Text style={styles.sectionLabel}>OBJETIVO</Text>
            <View style={styles.opcionesGrid}>
              {OBJETIVOS.map(o => (
                <Pressable
                  key={o.key}
                  style={({ pressed }) => [
                    styles.opcionBtn,
                    formGen.objetivo === o.key && styles.opcionBtnActivo,
                    pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] }
                  ]}
                  onPress={() => setFormGen(p => ({ ...p, objetivo: o.key }))}
                >
                  <Text style={[styles.opcionLabel, formGen.objetivo === o.key && { color: '#9933ff' }]}>
                    {o.label}
                  </Text>
                  <Text style={styles.opcionDesc}>{o.desc}</Text>
                </Pressable>
              ))}
            </View>

            {/* Nivel */}
            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>NIVEL DE EXPERIENCIA</Text>
            <View style={styles.nivelRow}>
              {NIVELES.map(n => (
                <Pressable
                  key={n}
                  style={({ pressed }) => [
                    styles.nivelBtn,
                    formGen.nivel === n && styles.nivelBtnActivo,
                    pressed && { opacity: 0.8 }
                  ]}
                  onPress={() => setFormGen(p => ({ ...p, nivel: n }))}
                >
                  <Text style={[styles.nivelText, formGen.nivel === n && { color: '#9933ff' }]}>{n}</Text>
                </Pressable>
              ))}
            </View>

            {/* Días */}
            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>DÍAS DE ENTRENAMIENTO</Text>
            <View style={styles.diasRow}>
              {DIAS_SEMANA.map((d, i) => (
                <Pressable
                  key={i}
                  style={({ pressed }) => [
                    styles.diaBtn,
                    formGen.diasSeleccionados.includes(i) && styles.diaBtnActivo,
                    pressed && { opacity: 0.8 }
                  ]}
                  onPress={() => toggleDia(i)}
                >
                  <Text style={[styles.diaText, formGen.diasSeleccionados.includes(i) && { color: '#fff' }]}>
                    {d}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Semanas */}
            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>DURACIÓN (SEMANAS)</Text>
            <View style={styles.semanasRow}>
              {['8', '10', '12', '16', '20'].map(s => (
                <Pressable
                  key={s}
                  style={({ pressed }) => [
                    styles.semanaBtn,
                    formGen.semanas === s && styles.semanaBtnActivo,
                    pressed && { opacity: 0.8 }
                  ]}
                  onPress={() => setFormGen(p => ({ ...p, semanas: s }))}
                >
                  <Text style={[styles.semanaText, formGen.semanas === s && { color: '#9933ff' }]}>{s}</Text>
                </Pressable>
              ))}
            </View>

            {/* Equipamento */}
            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>EQUIPAMENTO</Text>
            <View style={styles.equipRow}>
              {[
                { key: 'gimnasio', label: 'Gimnasio' },
                { key: 'casa', label: 'Casa' },
                { key: 'calistenia', label: '🤸 Calistenia' },
              ].map(e => (
                <Pressable
                  key={e.key}
                  style={({ pressed }) => [
                    styles.equipBtn,
                    formGen.equipamento === e.key && styles.equipBtnActivo,
                    pressed && { opacity: 0.8 }
                  ]}
                  onPress={() => setFormGen(p => ({ ...p, equipamento: e.key }))}
                >
                  <Text style={[styles.equipText, formGen.equipamento === e.key && { color: '#9933ff' }]}>
                    {e.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Notas */}
            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>NOTAS ADICIONALES (OPCIONAL)</Text>
            <TextInput
              style={styles.notasInput}
              placeholder="Ej: tengo dolor de rodilla, prefiero no hacer sentadilla..."
              placeholderTextColor="#1a2a4a"
              multiline
              numberOfLines={3}
              value={formGen.notas}
              onChangeText={t => setFormGen(p => ({ ...p, notas: t }))}
            />

            {/* Error */}
            {errorIA && (
              <View style={styles.errorBox}>
                <AntDesign name="exclamationcircle" size={14} color="#ff3355" />
                <Text style={styles.errorText}>{errorIA}</Text>
              </View>
            )}

            {/* Botón generar */}
            <Pressable
              style={({ pressed }) => [
                styles.generarBtn,
                !puedeGenerar && { opacity: 0.4 },
                pressed && puedeGenerar && { opacity: 0.85, transform: [{ scale: 0.98 }] }
              ]}
              onPress={generarPrograma}
              disabled={!puedeGenerar || cargando}
            >
              <LinearGradient colors={['#9933ff', '#6600cc']} style={styles.generarGradient}>
                {cargando ? (
                  <>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={styles.generarText}>Generando con IA...</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.generarText}>Generar programa</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>

            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Modal preview resultado */}
        <Modal visible={modalConfirm} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <Pressable style={{ flex: 1 }} onPress={() => setModalConfirm(false)} />
            <View style={styles.modalBox}>
              <View style={styles.modalHandle} />
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalIaBadge}>
                  <Text style={styles.modalIaBadgeText}>GENERADO POR IA</Text>
                </View>
                {respuestaIA?.datos && (
                  <>
                    <Text style={styles.modalTitulo}>{respuestaIA.datos.nombrePrograma}</Text>
                    <Text style={styles.modalDesc}>{respuestaIA.datos.descripcion}</Text>

                    <Text style={[styles.sectionLabel, { marginTop: 16 }]}>BLOQUES</Text>
                    {respuestaIA.datos.bloques?.map((b, i) => (
                      <View key={i} style={styles.bloquePreview}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                          <Text style={styles.bloqueNombre}>{b.nombre}</Text>
                          <Text style={styles.bloqueSemanas}>{b.semanas} sem</Text>
                        </View>
                        <Text style={styles.bloqueTipo}>{b.tipo}</Text>
                        {Object.entries(b.ejerciciosPorDia || {}).slice(0, 1).map(([dia, ejs]) => (
                          <View key={dia} style={{ marginTop: 8 }}>
                            <Text style={styles.bloqueEjsTitulo}>
                              {DIAS_SEMANA[parseInt(dia)]} — {ejs.length} ejercicios
                            </Text>
                            {ejs.slice(0, 3).map((e, j) => (
                              <Text key={j} style={styles.bloqueEj}>
                                · {e.nombre} — {e.series}×{e.repsMin}-{e.repsMax} RIR{e.rir}
                              </Text>
                            ))}
                            {ejs.length > 3 && (
                              <Text style={styles.bloqueEjMas}>+{ejs.length - 3} más...</Text>
                            )}
                          </View>
                        ))}
                      </View>
                    ))}
                  </>
                )}

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
                  <Pressable
                    style={({ pressed }) => [styles.modalCancelarBtn, pressed && { opacity: 0.7 }]}
                    onPress={() => setModalConfirm(false)}
                  >
                    <Text style={styles.modalCancelarText}>Descartar</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.modalAplicarBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
                    onPress={aplicarPrograma}
                  >
                    <LinearGradient colors={['#9933ff', '#6600cc']} style={styles.modalAplicarGradient}>
                      <AntDesign name="check" size={15} color="#fff" />
                      <Text style={styles.modalAplicarText}>Aplicar programa</Text>
                    </LinearGradient>
                  </Pressable>
                </View>
                <View style={{ height: 20 }} />
              </ScrollView>
            </View>
          </View>
        </Modal>
      </LinearGradient>
    )
  }

  // ── Pantalla Ajustar ────────────────────────────────────────────
  if (modo === 'ajustar') {
    const progActivo = programa?.programas?.find(p => p.estado === 'activo')
    return (
      <LinearGradient colors={['#000000', '#050510', '#0a0a1f']} style={styles.gradient}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <Pressable
                style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
                onPress={() => setModo(null)}
              >
                <AntDesign name="left" size={16} color="#4488ff" />
              </Pressable>
              <Text style={styles.titulo}>Ajustar con IA</Text>
            </View>

            {/* Selector de programa — carrusel */}
            <Text style={styles.sectionLabel}>PROGRAMA A ANALIZAR</Text>
            {(() => {
              const disponibles = programa?.programas?.filter(p => p.estado !== 'archivado') || []
              if (!disponibles.length) return null
              const idx = Math.min(carruselIdx, disponibles.length - 1)
              const prog = disponibles[idx]
              return (
                <View style={styles.carruselWrap}>
                  {/* Flecha izquierda */}
                  <Pressable
                    style={({ pressed }) => [styles.carruselArrow, idx === 0 && styles.carruselArrowDis, pressed && { opacity: 0.6 }]}
                    onPress={() => navCarrusel(-1, disponibles.length)}
                    disabled={idx === 0}
                  >
                    <AntDesign name="left" size={16} color={idx === 0 ? '#1a2a4a' : '#4488ff'} />
                  </Pressable>

                  {/* Card animada */}
                  <Animated.View style={[styles.carruselCard, { transform: [{ translateX: carruselAnim }] }]}>
                    <Text style={styles.carruselNombre}>{prog.nombre}</Text>
                    <Text style={styles.carruselMeta}>
                      {prog.bloques?.length || 0} bloques · {prog.semanas} sem
                    </Text>
                    <View style={styles.carruselEstadoBadge}>
                      <Text style={styles.carruselEstadoText}>{prog.estado}</Text>
                    </View>
                  </Animated.View>

                  {/* Flecha derecha */}
                  <Pressable
                    style={({ pressed }) => [styles.carruselArrow, idx >= disponibles.length - 1 && styles.carruselArrowDis, pressed && { opacity: 0.6 }]}
                    onPress={() => navCarrusel(1, disponibles.length)}
                    disabled={idx >= disponibles.length - 1}
                  >
                    <AntDesign name="right" size={16} color={idx >= disponibles.length - 1 ? '#1a2a4a' : '#4488ff'} />
                  </Pressable>
                </View>
              )
            })()}
            {/* Indicadores de posición */}
            {(() => {
              const disponibles = programa?.programas?.filter(p => p.estado !== 'archivado') || []
              if (disponibles.length <= 1) return null
              return (
                <View style={styles.carruselDots}>
                  {disponibles.map((_, i) => (
                    <View key={i} style={[styles.carruselDot, i === carruselIdx && styles.carruselDotActivo]} />
                  ))}
                </View>
              )
            })()}

            {/* Qué quiere ajustar */}
            <Text style={styles.sectionLabel}>¿QUÉ QUIERES MEJORAR?</Text>
            <TextInput
              style={[styles.notasInput, { minHeight: 100 }]}
              placeholder="Ej: quiero más volumen en piernas, reducir ejercicios de bíceps, ajustar el RIR para las últimas semanas..."
              placeholderTextColor="#1a2a4a"
              multiline
              value={mensajeExtra}
              onChangeText={setMensajeExtra}
            />

            <View style={styles.infoCard}>
              <AntDesign name="infocirlceo" size={13} color="#2a4488" />
              <Text style={styles.infoText}>
                La IA analizará tu programa completo y propondrá ajustes específicos con justificación de cada cambio
              </Text>
            </View>

            {errorIA && (
              <View style={styles.errorBox}>
                <AntDesign name="exclamationcircle" size={14} color="#ff3355" />
                <Text style={styles.errorText}>{errorIA}</Text>
              </View>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.generarBtn,
                pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }
              ]}
              onPress={ajustarPrograma}
              disabled={cargando}
            >
              <LinearGradient colors={['#4488ff', '#1a3aff']} style={styles.generarGradient}>
                {cargando ? (
                  <>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={styles.generarText}>Analizando programa...</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.generarText}>Analizar y ajustar</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Modal resultado ajustes */}
        <Modal visible={modalConfirm} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <Pressable style={{ flex: 1 }} onPress={() => setModalConfirm(false)} />
            <View style={styles.modalBox}>
              <View style={styles.modalHandle} />
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={[styles.modalIaBadge, { backgroundColor: '#1a3aff22', borderColor: '#1a3aff' }]}>
                  <Text style={[styles.modalIaBadgeText, { color: '#4488ff' }]}>ANÁLISIS IA</Text>
                </View>

                {respuestaIA?.datos && (
                  <>
                    <Text style={styles.modalTitulo}>Análisis del programa</Text>
                    <Text style={styles.modalDesc}>{respuestaIA.datos.analisis}</Text>

                    <Text style={[styles.sectionLabel, { marginTop: 16 }]}>
                      AJUSTES PROPUESTOS ({respuestaIA.datos.ajustes?.length || 0})
                    </Text>
                    {respuestaIA.datos.ajustes?.map((a, i) => (
                      <View key={i} style={styles.ajusteCard}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                          <Text style={styles.ajusteBloque}>{a.bloque} · {DIAS_SEMANA[a.dia]}</Text>
                          <View style={[styles.ajusteTipoBadge, {
                            backgroundColor: a.cambio === 'reemplazar' ? '#ff660022' :
                              a.cambio === 'agregar' ? '#00cc4422' :
                              a.cambio === 'eliminar' ? '#ff335522' : '#4488ff22'
                          }]}>
                            <Text style={[styles.ajusteTipoText, {
                              color: a.cambio === 'reemplazar' ? '#ff6600' :
                                a.cambio === 'agregar' ? '#00cc44' :
                                a.cambio === 'eliminar' ? '#ff3355' : '#4488ff'
                            }]}>{a.cambio}</Text>
                          </View>
                        </View>
                        {a.ejercicioActual && (
                          <Text style={styles.ajusteEjActual}>
                            Actual: {a.ejercicioActual}
                          </Text>
                        )}
                        {a.ejercicioNuevo && (
                          <Text style={styles.ajusteEjNuevo}>
                            → {a.ejercicioNuevo} · {a.seriesNuevas}×{a.repsMinNuevas}-{a.repsMaxNuevas} RIR{a.rirNuevo}
                          </Text>
                        )}
                        <Text style={styles.ajusteRazon}>{a.razon}</Text>
                      </View>
                    ))}

                    {respuestaIA.datos.recomendacionGeneral && (
                      <View style={styles.recomendacionCard}>
                        <Text style={styles.recomendacionLabel}>RECOMENDACIÓN GENERAL</Text>
                        <Text style={styles.recomendacionText}>{respuestaIA.datos.recomendacionGeneral}</Text>
                      </View>
                    )}
                  </>
                )}

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
                  <Pressable
                    style={({ pressed }) => [styles.modalCancelarBtn, pressed && { opacity: 0.7 }]}
                    onPress={() => setModalConfirm(false)}
                  >
                    <Text style={styles.modalCancelarText}>Cerrar</Text>
                  </Pressable>
                </View>
                <View style={{ height: 20 }} />
              </ScrollView>
            </View>
          </View>
        </Modal>
      </LinearGradient>
    )
  }

  return null
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { padding: 20, paddingTop: 56, paddingBottom: LAYOUT.bottomTabSpace || 150 },

  // Header
  header: { alignItems: 'center', paddingVertical: 24 },
  iaBadge: { backgroundColor: '#9933ff22', borderWidth: 1, borderColor: '#9933ff', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6, marginBottom: 16 },
  iaBadgeText: { color: '#9933ff', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  titulo: { fontSize: 24, fontWeight: '900', color: '#fff', marginBottom: 8 },
  subtitulo: { color: '#2a4488', fontSize: 13, textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },

  // Modos
  modoCard: { borderRadius: 18, overflow: 'hidden', marginBottom: 14, borderWidth: 1, borderColor: '#9933ff33' },
  modoCardDisabled: { borderColor: '#0f1a3a', opacity: 0.5 },
  modoGradient: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 16 },
  modoIconWrap: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#0a0a1f', justifyContent: 'center', alignItems: 'center' },
  modoEmoji: { fontSize: 24 },
  modoTitulo: { color: '#fff', fontSize: 16, fontWeight: '800', marginBottom: 4 },
  modoDesc: { color: '#2a4488', fontSize: 12, lineHeight: 18 },

  // Info
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#05050f', borderRadius: 12, borderWidth: 1, borderColor: '#0f1a3a', padding: 12, marginTop: 8 },
  infoText: { flex: 1, color: '#2a4488', fontSize: 12, lineHeight: 18 },

  // Back
  backBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: '#1a3aff', backgroundColor: '#05051f', justifyContent: 'center', alignItems: 'center' },

  // Sección labels
  sectionLabel: { color: '#2a4488', fontSize: 10, fontWeight: '800', letterSpacing: 2, marginBottom: 12 },

  // Objetivos
  opcionesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  opcionBtn: { width: '47%', backgroundColor: '#05050f', borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 14, padding: 14, alignItems: 'center', gap: 6 },
  opcionBtnActivo: { borderColor: '#9933ff', backgroundColor: '#9933ff11' },
  opcionLabel: { color: '#fff', fontSize: 13, fontWeight: '800' },
  opcionDesc: { color: '#2a4488', fontSize: 11, textAlign: 'center' },

  // Nivel
  nivelRow: { flexDirection: 'row', gap: 8 },
  nivelBtn: { flex: 1, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#0f1a3a', backgroundColor: '#05050f', alignItems: 'center' },
  nivelBtnActivo: { borderColor: '#9933ff', backgroundColor: '#9933ff11' },
  nivelText: { color: '#2a4488', fontSize: 11, fontWeight: '700' },

  // Días
  diasRow: { flexDirection: 'row', gap: 6 },
  diaBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#0f1a3a', backgroundColor: '#05050f', alignItems: 'center' },
  diaBtnActivo: { borderColor: '#9933ff', backgroundColor: '#9933ff' },
  diaText: { color: '#2a4488', fontSize: 11, fontWeight: '700' },

  // Semanas
  semanasRow: { flexDirection: 'row', gap: 8 },
  semanaBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#0f1a3a', backgroundColor: '#05050f', alignItems: 'center' },
  semanaBtnActivo: { borderColor: '#9933ff', backgroundColor: '#9933ff11' },
  semanaText: { color: '#2a4488', fontSize: 14, fontWeight: '800' },

  // Equipamento
  equipRow: { flexDirection: 'row', gap: 8 },
  equipBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#0f1a3a', backgroundColor: '#05050f', alignItems: 'center' },
  equipBtnActivo: { borderColor: '#9933ff', backgroundColor: '#9933ff11' },
  equipText: { color: '#2a4488', fontSize: 12, fontWeight: '700' },

  // Notas
  notasInput: { backgroundColor: '#05050f', borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 14, padding: 14, color: '#fff', fontSize: 13, lineHeight: 20, minHeight: 80, textAlignVertical: 'top' },

  // Error
  errorBox: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: '#1a0008', borderRadius: 10, borderWidth: 1, borderColor: '#ff335544', padding: 12, marginVertical: 8 },
  errorText: { flex: 1, color: '#ff3355', fontSize: 12 },

  // Botón generar
  generarBtn: { borderRadius: 16, overflow: 'hidden', marginTop: 24 },
  generarGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 18 },
  generarText: { color: '#fff', fontSize: 16, fontWeight: '900' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,2,15,0.92)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#08080f', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 40, borderWidth: 1, borderColor: '#9933ff33', maxHeight: '92%' },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#1a1a3a', alignSelf: 'center', marginBottom: 16 },
  modalIaBadge: { alignSelf: 'flex-start', backgroundColor: '#9933ff22', borderWidth: 1, borderColor: '#9933ff', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, marginBottom: 12 },
  modalIaBadgeText: { color: '#9933ff', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  modalTitulo: { fontSize: 20, fontWeight: '900', color: '#fff', marginBottom: 8 },
  modalDesc: { color: '#2a4488', fontSize: 13, lineHeight: 20, marginBottom: 4 },

  // Bloque preview
  bloquePreview: { backgroundColor: '#05050f', borderRadius: 14, borderWidth: 1, borderColor: '#0f1a3a', padding: 14, marginBottom: 10 },
  bloqueNombre: { color: '#fff', fontSize: 14, fontWeight: '800' },
  bloqueSemanas: { color: '#9933ff', fontSize: 12, fontWeight: '700' },
  bloqueTipo: { color: '#9933ff', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  bloqueEjsTitulo: { color: '#4488ff', fontSize: 11, fontWeight: '700', marginBottom: 4 },
  bloqueEj: { color: '#2a4488', fontSize: 11, marginBottom: 2 },
  bloqueEjMas: { color: '#1a2a4a', fontSize: 11, fontStyle: 'italic' },

  // Botones modal
  modalCancelarBtn: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#1a3aff44', backgroundColor: '#05051a', alignItems: 'center' },
  modalCancelarText: { color: '#4488ff', fontWeight: '700', fontSize: 13 },
  modalAplicarBtn: { flex: 2, borderRadius: 12, overflow: 'hidden' },
  modalAplicarGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 12 },
  modalAplicarText: { color: '#fff', fontWeight: '900', fontSize: 14 },

  // Ajustes
  ajusteCard: { backgroundColor: '#05050f', borderRadius: 14, borderWidth: 1, borderColor: '#0f1a3a', padding: 14, marginBottom: 10 },
  ajusteBloque: { color: '#4488ff', fontSize: 11, fontWeight: '700' },
  ajusteTipoBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  ajusteTipoText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  ajusteEjActual: { color: '#2a4488', fontSize: 12, marginBottom: 4, textDecorationLine: 'line-through' },
  ajusteEjNuevo: { color: '#00cc44', fontSize: 13, fontWeight: '700', marginBottom: 6 },
  ajusteRazon: { color: '#2a4488', fontSize: 11, lineHeight: 16, borderTopWidth: 1, borderTopColor: '#0f1a3a', paddingTop: 8, marginTop: 4 },

  // Recomendación
  recomendacionCard: { backgroundColor: '#0a1020', borderRadius: 14, borderWidth: 1, borderColor: '#4488ff33', padding: 16, marginTop: 8 },
  recomendacionLabel: { color: '#4488ff', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 8 },
  recomendacionText: { color: '#aabbdd', fontSize: 13, lineHeight: 20 },

  // Programa activo
  progActivoCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#05050f', borderRadius: 16, borderWidth: 1, borderColor: '#4488ff33', padding: 16, marginBottom: 20 },
  progActivoLabel: { color: '#2a4488', fontSize: 9, fontWeight: '800', letterSpacing: 1.5, marginBottom: 4 },
  progActivoNombre: { color: '#fff', fontSize: 16, fontWeight: '900', marginBottom: 2 },
  progActivoMeta: { color: '#2a4488', fontSize: 12 },
  progSelectorItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#05050f', borderRadius: 14, borderWidth: 1, borderColor: '#0f1a3a', padding: 14, marginBottom: 8 },
  progSelectorItemActivo: { borderColor: '#4488ff', backgroundColor: '#4488ff11' },
  progSelectorNombre: { color: '#fff', fontSize: 14, fontWeight: '800', marginBottom: 3 },
  progSelectorMeta: { color: '#2a4488', fontSize: 11 },
  carruselWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  carruselArrow: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: '#1a3aff', backgroundColor: '#05051f', justifyContent: 'center', alignItems: 'center' },
  carruselArrowDis: { borderColor: '#0f1a3a', backgroundColor: '#05050f' },
  carruselCard: { flex: 1, backgroundColor: '#05050f', borderRadius: 16, borderWidth: 1, borderColor: '#4488ff44', padding: 16 },
  carruselNombre: { color: '#fff', fontSize: 15, fontWeight: '900', marginBottom: 4 },
  carruselMeta: { color: '#2a4488', fontSize: 12, marginBottom: 8 },
  carruselEstadoBadge: { alignSelf: 'flex-start', backgroundColor: '#4488ff22', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#4488ff44' },
  carruselEstadoText: { color: '#4488ff', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  carruselDots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 16 },
  carruselDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#1a2a4a' },
  carruselDotActivo: { width: 18, backgroundColor: '#4488ff' },
})
