// ============================================
// RUTINAS SCREENS — Pantallas de rutinas
// Exportadas sin ciclo de dependencias
// app/(app)/RutinasScreens.jsx
// ============================================
import { useState, useCallback, useRef, useContext, createContext } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Modal, Alert, Pressable, Animated, Image, Switch, Linking
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { AntDesign } from '@expo/vector-icons'
import { LAYOUT } from '../../components/constans'
import { supabase } from '../../lib/supabase'
import { guardarYSincronizar, cargarPrograma } from '../../lib/storage'
import RegistrarSeries from './rutinas/RegistrarSeries'


const DIAS_SEMANA = [
  { key: 0, label: 'LUN' },
  { key: 1, label: 'MAR' },
  { key: 2, label: 'MIÉ' },
  { key: 3, label: 'JUE' },
  { key: 4, label: 'VIE' },
  { key: 5, label: 'SÁB' },
  { key: 6, label: 'DOM' },
]
const GRUPOS_MUSCULARES = [
  'Pecho', 'Espalda', 'Hombros', 'Bíceps', 'Tríceps',
  'Cuádriceps', 'Femorales', 'Glúteos', 'Pantorrillas',
  'Abdomen', 'Trapecio', 'Antebrazos', 'Movilidad', 'Cardio'
]
const TIPOS_BLOQUE = ['Adaptativo', 'Acumulación', 'Intensificación', 'Peaking', 'Descarga']
const ETIQUETAS_DIA = ['PUSH','PULL','LEGS','FULLBODY','UPPER','LOWER','CARDIO','ARMS','CORE']
const coloresTipo = {
  'Adaptativo': '#2255aa', 'Acumulación': '#0033ff',
  'Intensificación': '#ff6600', 'Peaking': '#ff0044', 'Descarga': '#00aa44',
}
const UserContext    = createContext({ userId: null })
const RefreshContext = createContext({ triggerRefresh: () => {} })

export function ListaBloques({ route, navigation }) {
  const { programaId, userId } = route.params
  const [programa, setPrograma] = useState({ programas: [], dias: {} })
  const [modalVisible, setModalVisible] = useState(false)
  const [bloqueEditando, setBloqueEditando] = useState(null)
  const [nuevoBloque, setNuevoBloque] = useState({ nombre: '', tipo: 'Adaptativo', semanas: '4' })
  const [bloqueAEliminar, setBloqueAEliminar] = useState(null)
  const [volumenBloqueId, setVolumenBloqueId] = useState(null)
  const [alertaMensaje, setAlertaMensaje] = useState(null)
  
  // Recargar programa cada vez que la pantalla recibe foco
  useFocusEffect(
    useCallback(() => {
      async function loadPrograma() {
        const local = await cargarPrograma(userId)
        if (local) {
          console.log('🔄 Programa recargado en ListaBloques')
          // Asegurar estructura válida
          if (!local.programas) local.programas = []
          if (!local.dias) local.dias = {}
          setPrograma(local)
        }
      }
      loadPrograma()
    }, [userId])
  )

  // Obtener programa actual
  const programaActual = programa.programas?.find(p => p.id === programaId)
  if (!programaActual) {
    return (
      <LinearGradient colors={['#000000', '#050510', '#0a0a1f']} style={styles.gradient}>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>Programa no encontrado</Text>
        </View>
      </LinearGradient>
    )
  }

  const bloques = programaActual.bloques || []

  // Calcular semanas usadas y disponibles
  const semanasUsadas = bloques.reduce((acc, b) => acc + (b.semanas || 0), 0)
  const semanasDisponibles = programaActual.duracionSemanas - semanasUsadas
  const porcentajeUsado = Math.round((semanasUsadas / programaActual.duracionSemanas) * 100)

  function abrirModalNuevo() {
    // Verificar si el programa ya está completo
    if (semanasDisponibles === 0) {
      setAlertaMensaje('El programa ya está completo. Todas las semanas están asignadas.')
      return
    }
    
    setBloqueEditando(null)
    setNuevoBloque({ nombre: '', tipo: 'Adaptativo', semanas: '4' })
    setModalVisible(true)
  }

  function abrirModalEditar(bloque) {
    setBloqueEditando(bloque)
    setNuevoBloque({
      nombre: bloque.nombre,
      tipo: bloque.tipo,
      semanas: bloque.semanas.toString()
    })
    setModalVisible(true)
  }

  async function guardarBloque() {
    if (!nuevoBloque.nombre.trim()) return

    const semanasBloque = parseInt(nuevoBloque.semanas) || 4

    // Validar semanas disponibles (solo al crear nuevo)
    if (!bloqueEditando) {
      if (semanasBloque > semanasDisponibles) {
        setAlertaMensaje(`Solo quedan ${semanasDisponibles} semana(s) disponibles en este programa`)
        return
      }
    } else {
      // Al editar, validar contra semanas disponibles + semanas del bloque actual
      const semanasBloqueActual = bloques.find(b => b.id === bloqueEditando.id)?.semanas || 0
      const semanasDisponiblesParaEdicion = semanasDisponibles + semanasBloqueActual
      if (semanasBloque > semanasDisponiblesParaEdicion) {
        setAlertaMensaje(`Solo hay ${semanasDisponiblesParaEdicion} semana(s) disponibles`)
        return
      }
    }

    let nuevoBloques

    if (bloqueEditando) {
      nuevoBloques = bloques.map(b =>
        b.id === bloqueEditando.id
          ? {
              ...b,
              nombre: nuevoBloque.nombre,
              tipo: nuevoBloque.tipo,
              semanas: semanasBloque,
            }
          : b
      )
    } else {
      const nuevo = {
        id: `bloque_${Date.now()}`,
        nombre: nuevoBloque.nombre,
        tipo: nuevoBloque.tipo,
        semanas: semanasBloque,
        completado: false
      }
      nuevoBloques = [...bloques, nuevo]
    }

    // Actualizar programa con nuevos bloques
    const nuevosProgramas = programa.programas.map(p =>
      p.id === programaId ? { ...p, bloques: nuevoBloques } : p
    )

    const nuevoPrograma = { ...programa, programas: nuevosProgramas }
    setPrograma(nuevoPrograma)
    await guardarYSincronizar(userId, nuevoPrograma)
    
    setNuevoBloque({ nombre: '', tipo: 'Adaptativo', semanas: '4' })
    setBloqueEditando(null)
    setModalVisible(false)
  }

  async function eliminarBloque(id) {
    // Limpiar historial de ejercicios del bloque
    const diasALimpiar = {}
    ;[0,1,2,3,4,5,6].forEach(diaKey => {
      const k = `ejercicios_${id}_${diaKey}`
      if (programa.dias[k]) diasALimpiar[k] = undefined
    })
    diasALimpiar[`dias_${id}`] = undefined
    diasALimpiar[`etiquetas_${id}`] = undefined
    const diasLimpios = Object.fromEntries(
      Object.entries({ ...programa.dias, ...diasALimpiar }).filter(([, v]) => v !== undefined)
    )
    const nuevosBloques = bloques.filter(b => b.id !== id)
    const nuevosProgramas = programa.programas.map(p =>
      p.id === programaId ? { ...p, bloques: nuevosBloques } : p
    )
    const nuevoPrograma = { ...programa, programas: nuevosProgramas, dias: diasLimpios }
    setPrograma(nuevoPrograma)
    await guardarYSincronizar(userId, nuevoPrograma)
  }

  async function reordenarBloques(index, direccion) {
    const nuevos = [...bloques]
    if (direccion === 'arriba' && index === 0) return
    if (direccion === 'abajo' && index === bloques.length - 1) return

    const targetIndex = direccion === 'arriba' ? index - 1 : index + 1
    ;[nuevos[index], nuevos[targetIndex]] = [nuevos[targetIndex], nuevos[index]]

    const nuevosProgramas = programa.programas.map(p =>
      p.id === programaId ? { ...p, bloques: nuevos } : p
    )
    const nuevoPrograma = { ...programa, programas: nuevosProgramas }
    setPrograma(nuevoPrograma)
    await guardarYSincronizar(userId, nuevoPrograma)
  }

  return (
    <LinearGradient colors={['#000000', '#050510', '#0a0a1f']} style={styles.gradient}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Programas</Text>
        </TouchableOpacity>

        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.programaNombreRow}>
              <Text style={styles.saludo}>{programaActual.nombre}</Text>
              {semanasDisponibles === 0 && (
                <View style={styles.completoBadge}>
                  <AntDesign name="check" size={11} color="#00cc44" />
                  <Text style={styles.completoBadgeText}>{semanasUsadas}/{programaActual.duracionSemanas} sem</Text>
                </View>
              )}
            </View>
            <Text style={styles.fecha}>
              {semanasUsadas}/{programaActual.duracionSemanas} semanas asignadas
            </Text>
          </View>
          <TouchableOpacity 
            style={[styles.addButton, semanasDisponibles === 0 && styles.addButtonDisabled]} 
            onPress={abrirModalNuevo}
            disabled={semanasDisponibles === 0}
          >
            <AntDesign name="plus" size={20} color={semanasDisponibles === 0 ? '#2a2a4a' : '#4488ff'} />
          </TouchableOpacity>
        </View>

        {/* Barra de progreso — solo si NO está completo */}
        {semanasDisponibles !== 0 && <View style={[
          styles.semanasProgresoBox,
          semanasUsadas > 0 && semanasDisponibles > 0 && styles.semanasProgresoIncompleto
        ]}>
          <View style={styles.semanasProgresoInfo}>
            <Text style={styles.semanasProgresoLabel}>
              {semanasUsadas === 0
                ? `${programaActual.duracionSemanas} semanas por asignar`
                : `⚠️ Faltan ${semanasDisponibles} semana(s)`}
            </Text>
            <Text style={styles.semanasProgresoPct}>{porcentajeUsado}%</Text>
          </View>
          <View style={styles.semanasProgresoTrack}>
            <View style={[
              styles.semanasProgresoFill,
              {
                width: `${porcentajeUsado}%`,
                backgroundColor: '#0033ff'
              }
            ]} />
          </View>
        </View>}

        {bloques.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyTitle}>Sin bloques</Text>
            <Text style={styles.emptySub}>
              Agrega bloques para estructurar tu programa de {programaActual.duracionSemanas} semanas
            </Text>
            <Pressable style={({ pressed }) => [styles.emptyButton, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]} onPress={abrirModalNuevo}>
              <LinearGradient colors={['#1a3aff', '#0022cc']} style={styles.emptyButtonGradient}>
                <Text style={styles.emptyButtonText}>+ Crear bloque</Text>
              </LinearGradient>
            </Pressable>
          </View>
        ) : (
          <>
            {bloques.map((bloque, index) => {
              const fechaBase = programaActual?.fechaInicio
                ? new Date(programaActual.fechaInicio + 'T12:00:00')
                : new Date()
              let cursor = new Date(fechaBase)
              for (let i = 0; i < index; i++) {
                cursor.setDate(cursor.getDate() + (bloques[i].semanas || 0) * 7)
              }
              const inicio = new Date(cursor)
              const fin = new Date(cursor)
              fin.setDate(fin.getDate() + (bloque.semanas || 0) * 7 - 1)
              const fmt = d => d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
              return (
                <View key={bloque.id} style={styles.bloqueCard}>
                  {/* FILA SUPERIOR */}
                  <View style={styles.bloqueTopRow}>
                    <View style={[styles.tipoBadge, { backgroundColor: coloresTipo[bloque.tipo] + '22', borderColor: coloresTipo[bloque.tipo] }]}>
                      <Text style={[styles.tipoText, { color: coloresTipo[bloque.tipo] }]}>{bloque.tipo.toUpperCase()}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.volumenHeaderInline}
                      onPress={() => setVolumenBloqueId(volumenBloqueId === bloque.id ? null : bloque.id)}
                    >
                      <Text style={styles.volumenTituloInline}>VOLUMEN SEMANAL</Text>
                      <AntDesign name={volumenBloqueId === bloque.id ? 'up' : 'down'} size={11} color="#ff6600" />
                    </TouchableOpacity>
                  </View>

                  {/* NOMBRE */}
                  <TouchableOpacity onPress={() => navigation.navigate('DiasBloque', { bloqueId: bloque.id, userId })}>
                    <Text style={styles.bloqueNombre}>{bloque.nombre}</Text>
                    <Text style={styles.bloqueSub}>
                      {bloque.semanas} {bloque.semanas === 1 ? 'semana' : 'semanas'}  ·  {fmt(inicio)} – {fmt(fin)}
                    </Text>
                  </TouchableOpacity>

                  {/* VOLUMEN SEMANAL */}
                  {volumenBloqueId === bloque.id && (
                    <VolumenSemanal bloque={bloque} dias={programa.dias} />
                  )}

                  {/* CONTROLES */}
                  <View style={styles.bloqueControles}>
                    <Pressable style={({ pressed }) => [styles.controlBtn, pressed && { opacity: 0.7, transform: [{ scale: 0.9 }] }]} onPress={() => reordenarBloques(index, 'arriba')}>
                      <AntDesign name="up" size={16} color={index === 0 ? '#1a1a3a' : '#4488ff'} />
                    </Pressable>
                    <Pressable style={({ pressed }) => [styles.controlBtn, pressed && { opacity: 0.7, transform: [{ scale: 0.9 }] }]} onPress={() => reordenarBloques(index, 'abajo')}>
                      <AntDesign name="down" size={16} color={index === bloques.length - 1 ? '#1a1a3a' : '#4488ff'} />
                    </Pressable>
                    <Pressable style={({ pressed }) => [styles.controlBtn, pressed && { opacity: 0.7, transform: [{ scale: 0.9 }] }]} onPress={() => setBloqueAEliminar(bloque)}>
                      <AntDesign name="delete" size={16} color="#ff3355" />
                    </Pressable>
                    <Pressable style={({ pressed }) => [styles.controlBtn, pressed && { opacity: 0.7, transform: [{ scale: 0.9 }] }]} onPress={() => abrirModalEditar(bloque)}>
                      <AntDesign name="edit" size={16} color="#4488ff" />
                    </Pressable>
                  </View>
                </View>
              )
            })}

            {/* Advertencia si programa incompleto */}
            {bloques.length > 0 && semanasDisponibles > 0 && (
              <View style={styles.advertenciaBox}>
                <Text style={styles.advertenciaIcon}>⚠️</Text>
                <View style={styles.advertenciaTexto}>
                  <Text style={styles.advertenciaTitulo}>Programa incompleto</Text>
                  <Text style={styles.advertenciaSub}>
                    Faltan {semanasDisponibles} semana(s) por asignar. Agrega más bloques para completar las {programaActual.duracionSemanas} semanas.
                  </Text>
                </View>
              </View>
            )}
          </>
        )}

        {/* Modal nuevo/editar bloque */}
        <Modal visible={modalVisible} transparent animationType="slide">
          <View style={styles.modalOverlayBottom}>
            <TouchableOpacity 
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={() => {
                setModalVisible(false)
                setBloqueEditando(null)
              }}
            />
            <View style={styles.modalBoxBottom}>
              <Text style={styles.modalTitulo}>
                {bloqueEditando ? 'Editar Bloque' : 'Nuevo Bloque'}
              </Text>

              <Text style={styles.modalLabel}>NOMBRE</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: Bloque 1"
                  placeholderTextColor="#2a2a4a"
                  value={nuevoBloque.nombre}
                  onChangeText={t => setNuevoBloque(p => ({ ...p, nombre: t }))}
                />
              </View>

              <Text style={styles.modalLabel}>TIPO</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {TIPOS_BLOQUE.map(tipo => (
                  <TouchableOpacity
                    key={tipo}
                    style={[styles.tipoBtn, nuevoBloque.tipo === tipo && styles.tipoBtnActivo]}
                    onPress={() => setNuevoBloque(p => ({ ...p, tipo }))}
                  >
                    <Text style={[styles.tipoBtnText, nuevoBloque.tipo === tipo && styles.tipoBtnTextActivo]}>{tipo}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalLabel}>SEMANAS</Text>
              <View style={styles.selectorRow}>
                {['1', '2', '3', '4', '5', '6'].map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.selectorChip, nuevoBloque.semanas === s && styles.selectorChipActivo]}
                    onPress={() => setNuevoBloque(p => ({ ...p, semanas: s }))}
                  >
                    <Text style={[styles.selectorChipText, nuevoBloque.semanas === s && styles.selectorChipTextActivo]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalButtons}>
                <Pressable style={({ pressed }) => [styles.modalCancelar, pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] }]} onPress={() => {
                  setModalVisible(false)
                  setBloqueEditando(null)
                }}>
                  <Text style={styles.modalCancelarText}>Cancelar</Text>
                </Pressable>
                <Pressable style={({ pressed }) => [styles.modalGuardar, pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]} onPress={guardarBloque}>
                  <LinearGradient colors={['#1a3aff', '#0022cc']} style={styles.modalGuardarGradient}>
                    <Text style={styles.modalGuardarText}>
                      {bloqueEditando ? 'Guardar' : 'Crear'}
                    </Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

      </ScrollView>

      {/* Modal alerta estilizada */}
      <Modal visible={!!alertaMensaje} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.alertaBox}>
            <View style={styles.alertaIconBox}>
              <AntDesign name="exclamation" size={26} color="#ff9900" />
            </View>
            <Text style={styles.alertaTitulo}>Atención</Text>
            <Text style={styles.alertaMsg}>{alertaMensaje}</Text>
            <Pressable style={({ pressed }) => [styles.alertaBtn, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]} onPress={() => setAlertaMensaje(null)}>
              <LinearGradient colors={['#ff9900', '#cc7700']} style={styles.alertaBtnGradient}>
                <Text style={styles.alertaBtnText}>Entendido</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Modal confirmación eliminar */}
      <Modal visible={!!bloqueAEliminar} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBoxEstilo}>
            <View style={styles.confirmIconBox}>
              <AntDesign name="delete" size={26} color="#ff4444" />
            </View>
            <Text style={styles.confirmTituloEstilo}>¿Eliminar bloque?</Text>
            <Text style={styles.confirmSubEstilo}>"{bloqueAEliminar?.nombre}"</Text>
            <Text style={styles.confirmWarnEstilo}>Todos sus ejercicios serán eliminados permanentemente.</Text>
            <View style={styles.confirmBtnsEstilo}>
              <Pressable style={({ pressed }) => [styles.confirmCancelarEstilo, pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] }]} onPress={() => setBloqueAEliminar(null)}>
                <Text style={styles.confirmCancelarTextEstilo}>Cancelar</Text>
              </Pressable>
              <TouchableOpacity
                style={styles.confirmEliminarEstilo}
                onPress={() => { eliminarBloque(bloqueAEliminar.id); setBloqueAEliminar(null) }}
              >
                <LinearGradient colors={['#ff3355', '#cc0022']} style={styles.confirmEliminarGradientEstilo}>
                  <AntDesign name="delete" size={13} color="#fff" />
                  <Text style={styles.confirmEliminarTextEstilo}>Eliminar</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </LinearGradient>
  )
}

// ============================================
// PANTALLA: DÍAS DEL BLOQUE
// ============================================

export function DiasBloque({ route, navigation }) {
  const { bloqueId, userId } = route.params
  const [programa, setPrograma] = useState({ programas: [], dias: {} })
  const [editandoDias, setEditandoDias] = useState(false)
  const [dropdownAbierto, setDropdownAbierto] = useState(null)
  const { triggerRefresh } = useContext(RefreshContext) || {}

  // Recargar programa cada vez que la pantalla recibe foco
  useFocusEffect(
    useCallback(() => {
      async function loadPrograma() {
        const local = await cargarPrograma(userId)
        if (local) {
          console.log('🔄 Programa recargado en DiasBloque')
          // Asegurar estructura válida
          if (!local.programas) local.programas = []
          if (!local.dias) local.dias = {}
          setPrograma(local)
        }
      }
      loadPrograma()
    }, [userId])
  )

  const bloque = programa.programas?.flatMap(p => p.bloques || []).find(b => b.id === bloqueId)
  if (!bloque) return null

  const diasKey = `dias_${bloque.id}`
  const etiquetasKey = `etiquetas_${bloque.id}`
  const diasActivos = programa.dias[diasKey] || [0, 1, 3, 4, 5]
  const etiquetas = programa.dias[etiquetasKey] || {}

  async function toggleDia(key) {
    const nuevoDias = diasActivos.includes(key)
      ? diasActivos.filter(d => d !== key)
      : [...diasActivos, key].sort((a, b) => a - b)

    const nuevoPrograma = {
      ...programa,
      dias: { ...programa.dias, [diasKey]: nuevoDias }
    }
    
    console.log('✅ Guardando días:', nuevoDias)
    setPrograma(nuevoPrograma)
    await guardarYSincronizar(userId, nuevoPrograma)
    triggerRefresh?.()
  }

  async function guardarEtiqueta(diaKey, etiqueta) {
    const nuevasEtiquetas = {
      ...etiquetas,
      [diaKey]: etiqueta.trim().toUpperCase()
    }

    const nuevoPrograma = {
      ...programa,
      dias: { ...programa.dias, [etiquetasKey]: nuevasEtiquetas }
    }

    console.log('🏷️ Guardando etiqueta:', diaKey, etiqueta)
    setPrograma(nuevoPrograma)
    await guardarYSincronizar(userId, nuevoPrograma)
    triggerRefresh?.()
  }

  const nombresDia = {
    0: 'Lunes', 1: 'Martes', 2: 'Miércoles',
    3: 'Jueves', 4: 'Viernes', 5: 'Sábado', 6: 'Domingo'
  }

  return (
    <LinearGradient colors={['#000000', '#050510', '#0a0a1f']} style={styles.gradient}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Bloques</Text>
        </TouchableOpacity>

        <View style={styles.headerRow}>
          <View>
            <Text style={styles.saludo}>{bloque.nombre}</Text>
            <Text style={styles.fecha}>{bloque.tipo} · {bloque.semanas} {bloque.semanas === 1 ? 'semana' : 'semanas'}</Text>
          </View>
          <TouchableOpacity
            style={[styles.editDiasBtn, editandoDias && styles.editDiasBtnActivo]}
            onPress={() => setEditandoDias(!editandoDias)}
          >
            <Text style={[styles.editDiasBtnText, editandoDias && styles.editDiasBtnTextActivo]}>
              {editandoDias ? 'Listo ✓' : 'Editar días'}
            </Text>
          </TouchableOpacity>
        </View>

        {editandoDias && (
          <View style={styles.diasEditorBox}>
            <Text style={styles.modalLabel}>SELECCIONA TUS DÍAS DE ENTRENAMIENTO</Text>
            <View style={styles.diasRow}>
              {DIAS_SEMANA.map(d => (
                <TouchableOpacity
                  key={d.key}
                  style={[styles.diaChip, diasActivos.includes(d.key) && styles.diaChipActivo]}
                  onPress={() => toggleDia(d.key)}
                >
                  <Text style={[styles.diaChipText, diasActivos.includes(d.key) && styles.diaChipTextActivo]}>
                    {d.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {DIAS_SEMANA.map(dia => {
          const activo = diasActivos.includes(dia.key)
          const ejerciciosKey = `ejercicios_${bloque.id}_${dia.key}`
          const numEjercicios = programa.dias[ejerciciosKey]?.length || 0
          const etiqueta = etiquetas[dia.key] || ''

          return (
            <View key={dia.key} style={styles.diaCardWrapper}>
              <TouchableOpacity
                style={[styles.diaCard, !activo && styles.diaDescanso]}
                onPress={() => {
                  if (activo && !editandoDias && !dropdownAbierto) {
                    navigation.navigate('Ejercicios', { 
                      bloqueId: bloque.id,
                      diaKey: dia.key,
                      userId 
                    })
                  }
                }}
                disabled={!activo && !editandoDias}
                activeOpacity={0.7}
              >
                <View style={[styles.diaLabelBox, activo && styles.diaLabelBoxActivo]}>
                  <Text style={[styles.diaLabel, activo && styles.diaLabelActivo]}>{dia.label}</Text>
                </View>
                <View style={styles.diaInfo}>
                  <Text style={styles.diaNombre}>{activo ? nombresDia[dia.key] : 'Descanso'}</Text>
                  
                  {/* Selector de etiqueta */}
                  {activo && (
                    <View style={styles.etiquetaContainer}>
                      <TouchableOpacity
                        style={styles.etiquetaSelector}
                        onPress={() => {
                          setDropdownAbierto(dropdownAbierto === dia.key ? null : dia.key)
                        }}
                      >
                        <Text style={[styles.etiquetaText, !etiqueta && styles.etiquetaPlaceholder]}>
                          {etiqueta || 'Seleccionar etiqueta'}
                        </Text>
                        <AntDesign name={dropdownAbierto === dia.key ? 'up' : 'down'} size={12} color="#4488ff" />
                      </TouchableOpacity>
                    </View>
                  )}
                  
                  <Text style={styles.diaGrupos}>
                    {activo
                      ? numEjercicios > 0
                        ? `${numEjercicios} ejercicio${numEjercicios > 1 ? 's' : ''}`
                        : 'Sin ejercicios — toca para agregar'
                      : 'Día de recuperación'}
                  </Text>
                </View>
                {activo && !dropdownAbierto && <AntDesign name="right" size={14} color="#2a4488" />}
              </TouchableOpacity>
            </View>
          )
        })}

        {/* Modal selector de etiqueta - centrado */}
        {dropdownAbierto !== null && (
          <Modal
            visible={true}
            transparent
            animationType="fade"
            onRequestClose={() => setDropdownAbierto(null)}
          >
            <TouchableOpacity
              style={styles.modalOverlayBottom}
              activeOpacity={1}
              onPress={() => setDropdownAbierto(null)}
            >
              <View style={styles.etiquetaModalFlotante}>
                <View style={styles.etiquetaModalHeader}>
                  <Text style={styles.etiquetaModalTitulo}>Seleccionar etiqueta</Text>
                  <TouchableOpacity onPress={() => setDropdownAbierto(null)}>
                    <AntDesign name="close" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.etiquetaModalScroll} showsVerticalScrollIndicator={false}>
                  {ETIQUETAS_DIA.map((etiq) => (
                    <TouchableOpacity
                      key={etiq}
                      style={[styles.etiquetaModalItem, etiquetas[dropdownAbierto] === etiq && styles.etiquetaModalItemActivo]}
                      onPress={() => {
                        guardarEtiqueta(dropdownAbierto, etiq)
                        setDropdownAbierto(null)
                      }}
                    >
                      <Text style={[styles.etiquetaModalItemText, etiquetas[dropdownAbierto] === etiq && styles.etiquetaModalItemTextActivo]}>
                        {etiq}
                      </Text>
                      {etiquetas[dropdownAbierto] === etiq && <AntDesign name="check" size={16} color="#4488ff" />}
                    </TouchableOpacity>
                  ))}

                  {/* Opción para limpiar */}
                  {etiquetas[dropdownAbierto] && (
                    <TouchableOpacity
                      style={styles.etiquetaModalItemLimpiar}
                      onPress={() => {
                        guardarEtiqueta(dropdownAbierto, '')
                        setDropdownAbierto(null)
                      }}
                    >
                      <Text style={styles.etiquetaModalItemLimpiarText}>Limpiar etiqueta</Text>
                      <AntDesign name="close" size={16} color="#ff3355" />
                    </TouchableOpacity>
                  )}
                </ScrollView>
              </View>
            </TouchableOpacity>
          </Modal>
        )}

      </ScrollView>
    </LinearGradient>
  )
}

// ============================================
// PANTALLA: EJERCICIOS DEL DÍA
// ============================================

export function EjerciciosDelDia({ route, navigation }) {
  const { bloqueId, diaKey, userId } = route.params
  const [programa, setPrograma] = useState({ programas: [], dias: {} })
  const [modalVisible, setModalVisible] = useState(false)
  const [grupoVisible, setGrupoVisible] = useState(false)
  const [modalGrupoVisible, setModalGrupoVisible] = useState(false)
  const [ejercicioEditando, setEjercicioEditando] = useState(null)
  const [ejercicioRegistrando, setEjercicioRegistrando] = useState(null)
  const [modoEliminar, setModoEliminar] = useState(false)
  const [seleccionados, setSeleccionados] = useState([])
  const [confirmarEliminarEjs, setConfirmarEliminarEjs] = useState(false)
  const [nuevoEjercicio, setNuevoEjercicio] = useState({
    nombre: '', grupo: '', series: '3', repsMin: '8', repsMax: '12', rir: '2', peso: '', videoUrl: ''
  })

  // Recargar programa cada vez que la pantalla recibe foco
  useFocusEffect(
    useCallback(() => {
      async function loadPrograma() {
        const local = await cargarPrograma(userId)
        if (local) {
          console.log('🔄 Programa recargado en Ejercicios')
          // Asegurar estructura válida
          if (!local.programas) local.programas = []
          if (!local.dias) local.dias = {}
          setPrograma(local)
        }
      }
      loadPrograma()
    }, [userId])
  )

  const bloque = programa.programas?.flatMap(p => p.bloques || []).find(b => b.id === bloqueId)
  if (!bloque) return null

  const ejerciciosKey = `ejercicios_${bloqueId}_${diaKey}`
  const ejercicios = programa.dias[ejerciciosKey] || []

  async function actualizarEjercicios(nuevosEjercicios) {
    const nuevoPrograma = {
      ...programa,
      dias: { ...programa.dias, [ejerciciosKey]: nuevosEjercicios }
    }
    
    console.log('✅ Guardando ejercicios:', nuevosEjercicios.length)
    setPrograma(nuevoPrograma)
    await guardarYSincronizar(userId, nuevoPrograma)
  }

  async function agregarEjercicio() {
    if (!nuevoEjercicio.nombre.trim() || !nuevoEjercicio.grupo) return

    if (ejercicioEditando) {
      // EDITAR ejercicio existente conservando historial
      const actualizado = {
        ...ejercicioEditando,
        nombre: nuevoEjercicio.nombre,
        grupo: nuevoEjercicio.grupo,
        series: parseInt(nuevoEjercicio.series) || 3,
        reps: `${nuevoEjercicio.repsMin}-${nuevoEjercicio.repsMax}`,
        rir: parseInt(nuevoEjercicio.rir) || 2,
        peso: parseFloat(nuevoEjercicio.peso) || 0,
        videoUrl: nuevoEjercicio.videoUrl?.trim() || '',
      }
      await actualizarEjercicios(ejercicios.map(e => e.id === ejercicioEditando.id ? actualizado : e))
      setEjercicioEditando(null)
    } else {
      // CREAR nuevo ejercicio
      const nuevo = {
        id: `ej_${Date.now()}`,
        nombre: nuevoEjercicio.nombre,
        grupo: nuevoEjercicio.grupo,
        series: parseInt(nuevoEjercicio.series) || 3,
        reps: `${nuevoEjercicio.repsMin}-${nuevoEjercicio.repsMax}`,
        rir: parseInt(nuevoEjercicio.rir) || 2,
        peso: parseFloat(nuevoEjercicio.peso) || 0,
        videoUrl: nuevoEjercicio.videoUrl?.trim() || '',
      }
      await actualizarEjercicios([...ejercicios, nuevo])
    }

    setNuevoEjercicio({ nombre: '', grupo: '', series: '3', repsMin: '8', repsMax: '12', rir: '2', peso: '', videoUrl: '' })
    setModalVisible(false)
  }

  function abrirEdicionEjercicio(ej) {
    setEjercicioEditando(ej)
    setNuevoEjercicio({
      nombre: ej.nombre,
      grupo: ej.grupo,
      series: ej.series?.toString() || '3',
      repsMin: ej.reps?.split('-')[0] || '8',
      repsMax: ej.reps?.split('-')[1] || '12',
      rir: ej.rir?.toString() || '2',
      peso: ej.peso?.toString() || '',
      videoUrl: ej.videoUrl || '',
    })
    setModalVisible(true)
  }

  function toggleSeleccion(id) {
    setSeleccionados(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  function toggleTodos() {
    if (seleccionados.length === ejercicios.length) {
      setSeleccionados([])
    } else {
      setSeleccionados(ejercicios.map(e => e.id))
    }
  }

  function cancelarModoEliminar() {
    setModoEliminar(false)
    setSeleccionados([])
    setConfirmarEliminarEjs(false)
  }

  async function confirmarEliminarSeleccionados() {
    await actualizarEjercicios(ejercicios.filter(e => !seleccionados.includes(e.id)))
    cancelarModoEliminar()
  }

  async function eliminarEjercicio(id) {
    await actualizarEjercicios(ejercicios.filter(e => e.id !== id))
  }

  async function guardarSesion(sesion) {
    console.log('💾 Guardando sesión:', sesion)
    
    // Normalizar fecha de la sesión a solo día (sin hora)
    const fechaSesion = new Date(sesion.fecha)
    fechaSesion.setHours(0, 0, 0, 0)
    const fechaSesionStr = fechaSesion.toDateString()
    
    // Agregar o reemplazar sesión en el historial del ejercicio
    const ejerciciosKey = `ejercicios_${bloqueId}_${diaKey}`
    const ejerciciosActualizados = ejercicios.map(ej => {
      if (ej.id === sesion.ejercicioId) {
        const historialActual = Array.isArray(ej.historial) ? ej.historial : []
        
        // Buscar si ya existe una sesión de este ejercicio en esta fecha
        const indiceSesionExistente = historialActual.findIndex(s => {
          const fechaExistente = new Date(s.fecha)
          fechaExistente.setHours(0, 0, 0, 0)
          return fechaExistente.toDateString() === fechaSesionStr
        })
        
        let nuevoHistorial
        if (indiceSesionExistente >= 0) {
          // REEMPLAZAR sesión existente
          nuevoHistorial = [...historialActual]
          nuevoHistorial[indiceSesionExistente] = sesion
          console.log(`🔄 Sesión del ${fechaSesionStr} REEMPLAZADA`)
        } else {
          // AGREGAR nueva sesión
          nuevoHistorial = [...historialActual, sesion]
          console.log(`✨ Nueva sesión del ${fechaSesionStr} AGREGADA`)
        }
        
        console.log(`📊 Ejercicio "${ej.nombre}" ahora tiene ${nuevoHistorial.length} sesiones`)
        
        return {
          ...ej,
          historial: nuevoHistorial,
          ultimaSesion: sesion
        }
      }
      return ej
    })

    const nuevoPrograma = {
      ...programa,
      dias: { ...programa.dias, [ejerciciosKey]: ejerciciosActualizados }
    }
    
    setPrograma(nuevoPrograma)
    await guardarYSincronizar(userId, nuevoPrograma)
    
    console.log('✅ Sesión guardada')
  }

  const nombresDia = {
    0: 'Lunes', 1: 'Martes', 2: 'Miércoles',
    3: 'Jueves', 4: 'Viernes', 5: 'Sábado', 6: 'Domingo'
  }

  return (
    <LinearGradient colors={['#000000', '#050510', '#0a0a1f']} style={styles.gradient}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← {bloque.nombre}</Text>
        </TouchableOpacity>

        <View style={styles.headerRow}>
          <View>
            <Text style={styles.saludo}>{nombresDia[diaKey]}</Text>
            <Text style={styles.fecha}>{bloque.tipo}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {ejercicios.length > 0 && (
              <TouchableOpacity
                style={[styles.addButton, modoEliminar && { borderColor: '#ff3355', backgroundColor: '#1a0005' }]}
                onPress={() => modoEliminar ? cancelarModoEliminar() : (setModoEliminar(true), setSeleccionados([]))}
              >
                <AntDesign name={modoEliminar ? 'close' : 'delete'} size={18} color="#ff3355" />
              </TouchableOpacity>
            )}
            {modoEliminar ? (
              <TouchableOpacity
                style={[styles.addButton, { borderColor: seleccionados.length === ejercicios.length ? '#4488ff' : '#0f1a3a', paddingHorizontal: 10 }]}
                onPress={toggleTodos}
              >
                <Text style={{ color: '#4488ff', fontSize: 11, fontWeight: '800' }}>
                  {seleccionados.length === ejercicios.length ? 'Ninguno' : 'Todo'}
                </Text>
              </TouchableOpacity>
            ) : (
              <Pressable style={({ pressed }) => [styles.addButton, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]} onPress={() => setModalVisible(true)}>
                <AntDesign name="plus" size={20} color="#4488ff" />
              </Pressable>
            )}
          </View>
        </View>

        {/* Banner modo eliminar */}
        {modoEliminar && (
          <View style={styles.modoEliminarBanner}>
            <Text style={styles.modoEliminarTxt}>
              {seleccionados.length === 0
                ? 'Selecciona los ejercicios a eliminar'
                : `${seleccionados.length} seleccionado${seleccionados.length > 1 ? 's' : ''}`}
            </Text>
            {seleccionados.length > 0 && (
              <TouchableOpacity
                style={styles.modoEliminarBtn}
                onPress={() => setConfirmarEliminarEjs(true)}
              >
                <LinearGradient colors={['#ff3355', '#cc0022']} style={styles.modoEliminarBtnGradient}>
                  <AntDesign name="delete" size={13} color="#fff" />
                  <Text style={styles.modoEliminarBtnText}>Eliminar ({seleccionados.length})</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        )}

        {ejercicios.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>🏋️</Text>
            <Text style={styles.emptyTitle}>Sin ejercicios</Text>
            <Text style={styles.emptySub}>Toca el + para agregar ejercicios a este día</Text>
            <Pressable style={({ pressed }) => [styles.emptyButton, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]} onPress={() => setModalVisible(true)}>
              <LinearGradient colors={['#1a3aff', '#0022cc']} style={styles.emptyButtonGradient}>
                <Text style={styles.emptyButtonText}>+ Agregar ejercicio</Text>
              </LinearGradient>
            </Pressable>
          </View>
        ) : (
          ejercicios.map((ej, index) => (
            <TouchableOpacity
              key={ej.id}
              activeOpacity={modoEliminar ? 0.7 : 1}
              onPress={() => modoEliminar && toggleSeleccion(ej.id)}
            >
              <View style={[
                styles.ejercicioCard,
                modoEliminar && seleccionados.includes(ej.id) && styles.ejercicioCardSeleccionado
              ]}>
                <View style={styles.ejercicioHeader}>
                  {modoEliminar ? (
                    <View style={styles.checkboxBox}>
                      <AntDesign
                        name={seleccionados.includes(ej.id) ? 'check' : 'checkcircleo'}
                        size={20}
                        color={seleccionados.includes(ej.id) ? '#ff3355' : '#2a4488'}
                      />
                    </View>
                  ) : (
                    <View style={styles.ejercicioNum}>
                      <Text style={styles.ejercicioNumText}>{index + 1}</Text>
                    </View>
                  )}
                  <View style={styles.ejercicioInfo}>
                    <Text style={styles.ejercicioNombre}>{ej.nombre}</Text>
                    <Text style={styles.ejercicioGrupo}>{ej.grupo}</Text>
                  </View>
                  {!modoEliminar && (
                    <View style={styles.ejercicioAcciones}>
                      <TouchableOpacity
                        style={{ padding: 2 }}
                        onPress={() => {
                          const url = ej.videoUrl && ej.videoUrl.trim()
                          if (url) {
                            Linking.openURL(url).catch(() =>
                              Alert.alert('Sin video', 'No se pudo abrir el link. Verifica que sea una URL válida.')
                            )
                          } else {
                            // Sin URL — abrir edición para agregar
                            abrirEdicionEjercicio(ej)
                          }
                        }}
                      >
                        <AntDesign name="youtube" size={20} color={ej.videoUrl ? "#ff3355" : "#2a4488"} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => abrirEdicionEjercicio(ej)} style={{ marginLeft: 12 }}>
                        <AntDesign name="edit" size={18} color="#4488ff" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {!modoEliminar && (
                  <>
                    <View style={styles.prescripcionRow}>
                      <View style={styles.prescripcionItem}>
                        <Text style={styles.prescripcionNum}>{ej.series}</Text>
                        <Text style={styles.prescripcionLabel}>series</Text>
                      </View>
                      <View style={styles.prescripcionDivider} />
                      <View style={styles.prescripcionItem}>
                        <Text style={styles.prescripcionNum}>{ej.reps}</Text>
                        <Text style={styles.prescripcionLabel}>reps</Text>
                      </View>
                      <View style={styles.prescripcionDivider} />
                      <View style={styles.prescripcionItem}>
                        <Text style={styles.prescripcionNum}>RIR {ej.rir}</Text>
                        <Text style={styles.prescripcionLabel}>reserva</Text>
                      </View>
                      <View style={styles.prescripcionDivider} />
                      <View style={styles.prescripcionItem}>
                        <Text style={styles.prescripcionNum}>{ej.peso > 0 ? `${ej.peso}kg` : '—'}</Text>
                        <Text style={styles.prescripcionLabel}>sugerido</Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.registrarBtn}
                      onPress={() => setEjercicioRegistrando(ej)}
                    >
                      <Text style={styles.registrarBtnText}>+ Registrar series</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}

        {ejercicios.length > 0 && !modoEliminar && (
          <Pressable style={({ pressed }) => [styles.agregarMasBtn, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]} onPress={() => setModalVisible(true)}>
            <AntDesign name="plus" size={16} color="#4488ff" />
            <Text style={styles.agregarMasText}>Agregar ejercicio</Text>
          </Pressable>
        )}

        {/* Modal agregar/editar ejercicio */}
        <Modal visible={modalVisible} transparent animationType="slide">
          <View style={styles.modalOverlayBottom}>
            <TouchableOpacity
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={() => { setModalVisible(false); setEjercicioEditando(null) }}
            />
            <View style={styles.modalBoxBottom}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitulo}>{ejercicioEditando ? 'Editar Ejercicio' : 'Nuevo Ejercicio'}</Text>

                <Text style={styles.modalLabel}>NOMBRE DEL EJERCICIO</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="Ej: Press de Banca"
                    placeholderTextColor="#2a2a4a"
                    value={nuevoEjercicio.nombre}
                    onChangeText={t => setNuevoEjercicio(p => ({ ...p, nombre: t }))}
                  />
                </View>

                <Text style={styles.modalLabel}>GRUPO MUSCULAR</Text>
                <TouchableOpacity
                  style={[styles.inputWrapper, { marginBottom: 16 }]}
                  onPress={() => setModalGrupoVisible(true)}
                >
                  <View style={[styles.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                    <Text style={{ color: nuevoEjercicio.grupo ? '#fff' : '#2a2a4a', fontSize: 15 }}>
                      {nuevoEjercicio.grupo || 'Selecciona grupo muscular'}
                    </Text>
                    <AntDesign name="down" size={14} color="#2a4488" />
                  </View>
                </TouchableOpacity>

                <Text style={styles.modalLabel}>SERIES</Text>
                <View style={styles.selectorRow}>
                  {['2', '3', '4', '5', '6'].map(s => (
                    <TouchableOpacity
                      key={s}
                      style={[styles.selectorChip, nuevoEjercicio.series === s && styles.selectorChipActivo]}
                      onPress={() => setNuevoEjercicio(p => ({ ...p, series: s }))}
                    >
                      <Text style={[styles.selectorChipText, nuevoEjercicio.series === s && styles.selectorChipTextActivo]}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.modalLabel}>RANGO DE REPS</Text>
                <View style={styles.repsRow}>
                  <View style={[styles.inputWrapper, { flex: 1, marginBottom: 0 }]}>
                    <TextInput
                      style={styles.input}
                      placeholder="Min"
                      placeholderTextColor="#2a2a4a"
                      value={nuevoEjercicio.repsMin}
                      onChangeText={t => setNuevoEjercicio(p => ({ ...p, repsMin: t }))}
                      keyboardType="number-pad"
                    />
                  </View>
                  <Text style={styles.repsGuion}>—</Text>
                  <View style={[styles.inputWrapper, { flex: 1, marginBottom: 0 }]}>
                    <TextInput
                      style={styles.input}
                      placeholder="Max"
                      placeholderTextColor="#2a2a4a"
                      value={nuevoEjercicio.repsMax}
                      onChangeText={t => setNuevoEjercicio(p => ({ ...p, repsMax: t }))}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>

                <Text style={[styles.modalLabel, { marginTop: 16 }]}>RIR (REPS EN RESERVA)</Text>
                <View style={styles.selectorRow}>
                  {['0', '1', '2', '3', '4'].map(r => (
                    <TouchableOpacity
                      key={r}
                      style={[styles.selectorChip, nuevoEjercicio.rir === r && styles.selectorChipActivo]}
                      onPress={() => setNuevoEjercicio(p => ({ ...p, rir: r }))}
                    >
                      <Text style={[styles.selectorChipText, nuevoEjercicio.rir === r && styles.selectorChipTextActivo]}>{r}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.modalLabel}>PESO SUGERIDO (kg) — OPCIONAL</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="Ej: 80"
                    placeholderTextColor="#2a2a4a"
                    value={nuevoEjercicio.peso}
                    onChangeText={t => setNuevoEjercicio(p => ({ ...p, peso: t }))}
                    keyboardType="decimal-pad"
                  />
                </View>

                <Text style={[styles.modalLabel, { marginTop: 16 }]}>VIDEO DE REFERENCIA — OPCIONAL</Text>
                <Text style={{ color: '#1a3a6a', fontSize: 11, marginBottom: 6 }}>YouTube, Instagram, TikTok, etc.</Text>
                <View style={[styles.inputWrapper, { flexDirection: 'row', alignItems: 'center' }]}>
                  <AntDesign name="youtube" size={18} color="#ff3355" style={{ marginLeft: 12 }} />
                  <TextInput
                    style={[styles.input, { flex: 1, borderWidth: 0, paddingLeft: 8 }]}
                    placeholder="https://youtube.com/watch?v=..."
                    placeholderTextColor="#2a2a4a"
                    value={nuevoEjercicio.videoUrl}
                    onChangeText={t => setNuevoEjercicio(p => ({ ...p, videoUrl: t }))}
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                  {nuevoEjercicio.videoUrl?.length > 5 && (
                    <TouchableOpacity onPress={() => setNuevoEjercicio(p => ({ ...p, videoUrl: '' }))} style={{ paddingRight: 12 }}>
                      <AntDesign name="closecircle" size={16} color="#2a4488" />
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.modalButtons}>
                  <Pressable
                    style={styles.modalCancelar}
                    onPress={() => {
                      setModalVisible(false)
                      setEjercicioEditando(null)
                      setNuevoEjercicio({ nombre: '', grupo: '', series: '3', repsMin: '8', repsMax: '12', rir: '2', peso: '', videoUrl: '' })
                    }}
                  >
                    <Text style={styles.modalCancelarText}>Cancelar</Text>
                  </Pressable>
                  <Pressable style={({ pressed }) => [styles.modalGuardar, pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]} onPress={agregarEjercicio}>
                    <LinearGradient colors={['#1a3aff', '#0022cc']} style={styles.modalGuardarGradient}>
                      <Text style={styles.modalGuardarText}>{ejercicioEditando ? 'Guardar' : 'Agregar'}</Text>
                    </LinearGradient>
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

      </ScrollView>

      {/* MODAL CONFIRMAR ELIMINAR SELECCIONADOS */}
      <Modal visible={confirmarEliminarEjs} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBoxEstilo}>
            <View style={styles.confirmIconBox}>
              <AntDesign name="delete" size={26} color="#ff4444" />
            </View>
            <Text style={styles.confirmTituloEstilo}>¿Eliminar ejercicios?</Text>
            <Text style={styles.confirmSubEstilo}>
              {seleccionados.length} ejercicio{seleccionados.length > 1 ? 's' : ''} seleccionado{seleccionados.length > 1 ? 's' : ''}
            </Text>
            <Text style={styles.confirmWarnEstilo}>Esta acción no se puede deshacer.</Text>
            <View style={styles.confirmBtnsEstilo}>
              <Pressable style={({ pressed }) => [styles.confirmCancelarEstilo, pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] }]} onPress={() => setConfirmarEliminarEjs(false)}>
                <Text style={styles.confirmCancelarTextEstilo}>Cancelar</Text>
              </Pressable>
              <Pressable style={({ pressed }) => [styles.confirmEliminarEstilo, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]} onPress={confirmarEliminarSeleccionados}>
                <LinearGradient colors={['#ff3355', '#cc0022']} style={styles.confirmEliminarGradientEstilo}>
                  <AntDesign name="delete" size={13} color="#fff" />
                  <Text style={styles.confirmEliminarTextEstilo}>Eliminar</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL GRUPO MUSCULAR */}
      <Modal visible={modalGrupoVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalGrupoVisible(false)}
        >
          <View style={styles.selectorModal}>
            <View style={styles.selectorHeader}>
              <Text style={styles.selectorTitulo}>Grupo muscular</Text>
              <TouchableOpacity onPress={() => setModalGrupoVisible(false)}>
                <AntDesign name="close" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.grupoGrid}>
              {GRUPOS_MUSCULARES.map(g => (
                <TouchableOpacity
                  key={g}
                  style={[styles.grupoChip, nuevoEjercicio.grupo === g && styles.grupoChipActivo]}
                  onPress={() => {
                    setNuevoEjercicio(p => ({ ...p, grupo: g }))
                    setModalGrupoVisible(false)
                  }}
                >
                  <Text style={[styles.grupoChipText, nuevoEjercicio.grupo === g && styles.grupoChipTextActivo]}>{g}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* MODAL REGISTRAR SERIES */}
      {ejercicioRegistrando && (
        <RegistrarSeries
          visible={!!ejercicioRegistrando}
          onClose={() => setEjercicioRegistrando(null)}
            ejercicio={ejercicioRegistrando}
            onGuardar={guardarSesion}
          />
        )}

    </LinearGradient>
  )
}

// Stack de rutinas
function RutinasTab() {
  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      <RutinaStack.Navigator 
        screenOptions={{ 
          headerShown: false,
          contentStyle: { backgroundColor: '#000000' },
          animation: 'none'
        }}
      >
        <RutinaStack.Screen name="ListaProgramas" component={ListaProgramas} />
        <RutinaStack.Screen name="ListaBloques" component={ListaBloques} />
        <RutinaStack.Screen name="DiasBloque" component={DiasBloque} />
        <RutinaStack.Screen name="Ejercicios" component={EjerciciosDelDia} />
      </RutinaStack.Navigator>
    </View>
  )
}

function ProgresoScreen() {
  const { userId } = useContext(UserContext)
  return <Progreso userId={userId} />
}

function IATab() {
  const { userId } = useContext(UserContext)
  return <IAScreen userId={userId} />
}

function PerfilScreen() {
  const { userId } = useContext(UserContext)
  const [modalAjustes, setModalAjustes] = useState(false)
  const [, forceOpenAjustes] = useState(0)
  const [perfil, setPerfil] = useState(null)
  const [fotoUrlLocal, setFotoUrlLocal] = useState(null)

  useFocusEffect(useCallback(() => {
    supabase.from('perfiles').select('*').eq('id', userId).single().then(({ data }) => {
      if (data) setPerfil(data)
      if (data?.avatar_url) setFotoUrlLocal(data.avatar_url)
    })
    setModalAjustes(true)
  }, []))

  return (
    <LinearGradient colors={['#000000', '#050510', '#0a0a1f']} style={styles.gradient}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#4488ff" />
      </View>
    </LinearGradient>
  )
}

function ComunidadScreen() {
  const { userId } = useContext(UserContext)
  return <Comunidad userId={userId} esCoach={false} />
}

function ChatScreen() {
  const { userId } = useContext(UserContext)
  return <Chat userId={userId} esCoach={false} />
}

// ── Toast global fuera de cualquier Modal ──────────────────────
function GlobalToast({ msg, tipo, anim, opacityAnim }) {
  if (!msg) return null
  const color = tipo === 'ok' ? '#00cc44' : '#ff3355'
  const colorText = tipo === 'ok' ? '#00ff66' : '#ff4466'
  const colorSub = tipo === 'ok' ? '#00aa44' : '#cc2244'
  const colorBg = tipo === 'ok' ? '#003a18' : '#3a0010'
  const gradColors = tipo === 'ok' ? ['#001f0a', '#002a10', '#001a08'] : ['#220008', '#1a0005', '#0f0003']
  return (
    <Animated.View
      style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        zIndex: 99999, elevation: 99,
        opacity: opacityAnim,
        transform: [{ translateX: anim }],
      }}
      pointerEvents="none"
    >
      <LinearGradient
        colors={gradColors}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={{
          flexDirection: 'row', alignItems: 'center', gap: 14,
          paddingHorizontal: 20, paddingVertical: 18,
          borderBottomWidth: 1.5, borderBottomColor: color,
          shadowColor: color, shadowOpacity: 0.5, shadowRadius: 20,
          shadowOffset: { width: 0, height: 6 }, elevation: 30,
        }}
      >
        <View style={{
          width: 40, height: 40, borderRadius: 12,
          backgroundColor: colorBg, borderWidth: 1.5, borderColor: color,
          justifyContent: 'center', alignItems: 'center',
        }}>
          <AntDesign name={tipo === 'ok' ? 'checkcircle' : 'closecircle'} size={20} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colorText, fontWeight: '900', fontSize: 15, letterSpacing: 0.3 }}>
            {tipo === 'ok' ? 'Guardado' : 'Error'}
          </Text>
          <Text style={{ color: colorSub, fontSize: 12, marginTop: 2, fontWeight: '600' }}>
            {msg}
          </Text>
        </View>
        <View style={{ width: 6, height: 40, borderRadius: 3, backgroundColor: color, opacity: 0.6 }} />
      </LinearGradient>
    </Animated.View>
  )
}


const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { padding: 20, paddingTop: 56, paddingBottom: LAYOUT.bottomTabSpace || 150 },
  tabBar: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#08091a',
    borderWidth: 1,
    borderColor: '#0f1a3a',
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    paddingBottom: 0,
    paddingTop: 0,
    paddingHorizontal: 6,
  },
  tabItem: {
    paddingTop: 0,
    paddingBottom: 0,
    height: 72,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  tabItemWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '95%',          // <-- Toma casi todo el ancho disponible sin chocar
    paddingVertical: 8,    
    borderRadius: 18,      
    overflow: 'hidden',    
    backgroundColor: 'transparent',
  },
  tabItemWrapActive: {
    backgroundColor: 'rgba(68, 136, 255, 0.15)', 
    borderRadius: 18,      
  },
  tabLabel: {
    fontSize: 9.5,       // <-- Bajamos medio punto para que "Comunidad" respire
    fontWeight: '700',
    marginTop: 3,
    textAlign: 'center', 
    letterSpacing: 0,    
  },
  tabIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
  },
  tabPillActive: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#1a3aff',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#1a3aff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 12,
    elevation: 8,
  },
  tabPillLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  tabIconWrapActive: {
    backgroundColor: '#0a1535',
    borderRadius: 21,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  saludo: { fontSize: 26, fontWeight: '900', color: '#fff' },
  fecha: { fontSize: 13, color: '#2a4488', marginTop: 2 },
  
  semanasProgresoBox: { backgroundColor: '#05050f', borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 14, padding: 16, marginBottom: 20 },
  semanasProgresoCompleto: { borderColor: '#00cc44', backgroundColor: '#001a0f' },
  semanasProgresoIncompleto: { borderColor: '#ff9900', backgroundColor: '#1a0f00' },
  semanasProgresoInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  semanasProgresoLabel: { color: '#fff', fontWeight: '700', fontSize: 13 },
  semanasProgresoPct: { color: '#4488ff', fontWeight: '700', fontSize: 13 },
  semanasProgresoTrack: { height: 6, backgroundColor: '#0a0a2a', borderRadius: 3, overflow: 'hidden' },
  semanasProgresoFill: { height: '100%', backgroundColor: '#0033ff', borderRadius: 3 },
  
  addButton: { padding: 8, borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 10, backgroundColor: '#05050f' },
  addButtonDisabled: { opacity: 0.3 },
  
  advertenciaBox: { flexDirection: 'row', backgroundColor: '#1a0f00', borderWidth: 1, borderColor: '#ff9900', borderRadius: 14, padding: 16, marginTop: 12, gap: 12 },
  advertenciaIcon: { fontSize: 24 },
  advertenciaTexto: { flex: 1 },
  advertenciaTitulo: { color: '#ff9900', fontSize: 14, fontWeight: '700', marginBottom: 4 },
  advertenciaSub: { color: '#ff9900', fontSize: 12, lineHeight: 18, opacity: 0.8 },
  
  rfBadge: { flexDirection: 'row', backgroundColor: '#0a0a2a', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#1a1a3a' },
  rfR: { fontSize: 18, fontWeight: '900', color: '#fff' },
  rfF: { fontSize: 18, fontWeight: '900', color: '#4488ff' },
  addButton: { padding: 8, borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 10, backgroundColor: '#05050f' },
  deleteBtn: { padding: 4 },
  card: { backgroundColor: '#05050f', borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 16, padding: 18, marginBottom: 14 },
  cardLabel: { fontSize: 10, color: '#2a4488', letterSpacing: 2, fontWeight: '700', marginBottom: 8 },
  cardTitle: { fontSize: 17, color: '#fff', fontWeight: '700', marginBottom: 4 },
  cardSub: { fontSize: 13, color: '#2a4488', marginBottom: 14 },
  cardRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  cardSmall: { backgroundColor: '#05050f', borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 16, padding: 18, alignItems: 'center' },
  cardSmallIcon: { fontSize: 24, marginBottom: 6 },
  cardSmallNum: { fontSize: 24, fontWeight: '900', color: '#fff' },
  cardSmallLabel: { fontSize: 11, color: '#2a4488', marginTop: 2 },
  linkButton: { marginTop: 4 },
  linkButtonText: { color: '#4488ff', fontSize: 13, fontWeight: '600' },
  bloqueCard: { backgroundColor: '#05050f', borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 16, padding: 18, marginBottom: 12 },
  tipoBadge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  tipoText: { fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  bloqueNombre: { fontSize: 20, fontWeight: '900', color: '#fff', marginBottom: 4 },
  bloqueSub: { fontSize: 13, color: '#2a4488', marginBottom: 16 },
  bloqueTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  volumenHeaderInline: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: '#ff6600', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  volumenTituloInline: { fontSize: 9, fontWeight: '800', color: '#ff6600', letterSpacing: 1.5 },
  
  // ═══ CONTROLES HORIZONTALES ABAJO ═══
  bloqueControles: { 
    flexDirection: 'row', 
    gap: 6, 
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#0f1a3a'
  },
  controlBtn: { 
    flex: 1,
    padding: 8, 
    borderWidth: 1, 
    borderColor: '#0f1a3a', 
    borderRadius: 8, 
    backgroundColor: '#0a0a1f',
    alignItems: 'center',
    justifyContent: 'center'
  },
  bloqueFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bloqueEstado: { fontSize: 12, color: '#2a4488' },
  backButton: { marginBottom: 16 },
  backText: { color: '#4488ff', fontSize: 14, fontWeight: '600' },
  editDiasBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#0f1a3a', backgroundColor: '#05050f' },
  editDiasBtnActivo: { borderColor: '#0033ff', backgroundColor: '#05051f' },
  editDiasBtnText: { color: '#2a4488', fontSize: 12, fontWeight: '700' },
  editDiasBtnTextActivo: { color: '#4488ff' },
  diasEditorBox: { backgroundColor: '#05050f', borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 14, padding: 16, marginBottom: 16 },
  diasRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 8 },
  diaChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#0a2a0a', backgroundColor: '#050f05' },
  diaChipActivo: { borderColor: '#00cc44', backgroundColor: '#002a10', shadowColor: '#00cc44', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 6 },
  diaChipText: { color: '#1a4a1a', fontWeight: '700', fontSize: 12 },
  diaChipTextActivo: { color: '#00ee55' },
  diaCardWrapper: { position: 'relative', zIndex: 1 },
  diaCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#05050f', borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 14, padding: 16, marginBottom: 10 },
  diaDescanso: { opacity: 0.35 },
  diaLabelBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#0a0a2a', borderWidth: 1, borderColor: '#1a1a3a', justifyContent: 'center', alignItems: 'center' },
  diaLabelBoxActivo: { borderColor: '#0033ff' },
  diaLabel: { color: '#2a4488', fontWeight: '900', fontSize: 12 },
  diaLabelActivo: { color: '#4488ff' },
  diaInfo: { flex: 1 },
  diaNombre: { color: '#fff', fontWeight: '700', fontSize: 15 },
  
  etiquetaContainer: { marginTop: 6, marginBottom: 6 },
  etiquetaSelector: { 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0a0a2a', 
    borderWidth: 1, 
    borderColor: '#0f1a3a',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 36
  },
  etiquetaText: { color: '#4488ff', fontSize: 12, fontWeight: '700' },
  etiquetaPlaceholder: { color: '#2a4488', fontWeight: '600' },
  
  // Modal flotante centrado
  etiquetaModalFlotante: {
    backgroundColor: '#05050f',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#0033ff',
    padding: 16,
    maxHeight: '60%',
    width: '75%',
    alignSelf: 'center',
    shadowColor: '#0033ff',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 10
  },
  etiquetaModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#0f1a3a'
  },
  etiquetaModalTitulo: {
    fontSize: 16,
    fontWeight: '900',
    color: '#fff'
  },
  etiquetaModalScroll: {
    maxHeight: 350
  },
  etiquetaModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: '#0a0a1f',
    borderWidth: 1,
    borderColor: '#0f1a3a'
  },
  etiquetaModalItemActivo: {
    backgroundColor: '#0a0a2a',
    borderColor: '#0033ff'
  },
  etiquetaModalItemText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },
  etiquetaModalItemTextActivo: {
    color: '#4488ff',
    fontWeight: '700'
  },
  etiquetaModalItemLimpiar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    marginTop: 6,
    backgroundColor: '#1a0f0f',
    borderWidth: 1,
    borderColor: '#ff3355'
  },
  etiquetaModalItemLimpiarText: {
    color: '#ff3355',
    fontSize: 14,
    fontWeight: '600'
  },

  // Volumen semanal
  volumenVacio: { color: '#2a4488', fontSize: 12, fontWeight: '600', fontStyle: 'italic' },
  programaNombreRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  completoBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#001a0f', borderWidth: 1, borderColor: '#00cc44', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  completoBadgeText: { color: '#00cc44', fontSize: 10, fontWeight: '800' },

  // Modal alerta estilizada
  alertaBox: { backgroundColor: '#05050f', borderRadius: 20, padding: 26, width: '100%', borderWidth: 1, borderColor: '#ff9900', alignItems: 'center' },
  alertaIconBox: { width: 54, height: 54, borderRadius: 14, backgroundColor: '#1a0f00', borderWidth: 1, borderColor: '#ff9900', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  alertaTitulo: { fontSize: 18, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 8 },
  alertaMsg: { fontSize: 13, color: '#2a4488', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  alertaBtn: { width: '100%', borderRadius: 11, overflow: 'hidden' },
  alertaBtnGradient: { padding: 13, alignItems: 'center' },
  alertaBtnText: { color: '#fff', fontWeight: '900', fontSize: 13 },

  // Modal eliminar bloque — estilo Progreso
  confirmOverlay: { flex: 1, backgroundColor: 'rgba(0,2,15,0.92)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  confirmBoxEstilo: { backgroundColor: '#08080f', borderRadius: 22, padding: 26, width: '100%', borderWidth: 1, borderColor: '#ff335566', alignItems: 'center', shadowColor: '#ff3355', shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
  confirmIconBox: { width: 54, height: 54, borderRadius: 14, backgroundColor: '#1a0000', borderWidth: 1, borderColor: '#ff3355', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  confirmTituloEstilo: { fontSize: 18, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 6 },
  confirmSubEstilo: { fontSize: 14, color: '#4488ff', fontWeight: '600', textAlign: 'center', marginBottom: 4 },
  confirmWarnEstilo: { fontSize: 11, color: '#ff4444', textAlign: 'center', marginBottom: 20 },
  confirmBtnsEstilo: { flexDirection: 'row', gap: 10, width: '100%' },
  confirmCancelarEstilo: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#1a3aff44', backgroundColor: '#05051a', alignItems: 'center' },
  confirmCancelarTextEstilo: { color: '#2a4488', fontWeight: '700', fontSize: 13 },
  confirmEliminarEstilo: { flex: 1, borderRadius: 11, overflow: 'hidden' },
  confirmEliminarGradientEstilo: { padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 11 },
  confirmEliminarTextEstilo: { color: '#fff', fontWeight: '900', fontSize: 13 },
  volumenHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12 },
  volumenTitulo: { fontSize: 10, fontWeight: '800', color: '#ff6600', letterSpacing: 2 },
  volumenContent: { paddingHorizontal: 14, paddingBottom: 14, gap: 10 },
  volumenRow: { gap: 6 },
  volumenGrupo: { color: '#fff', fontSize: 12, fontWeight: '700' },
  volumenBarTrack: { height: 6, backgroundColor: '#0a0a2a', borderRadius: 4, overflow: 'hidden' },
  volumenBarFill: { height: '100%', backgroundColor: '#4488ff', borderRadius: 4 },
  volumenSeriesRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  volumenSeries: { color: '#4488ff', fontSize: 11, fontWeight: '700', position: 'absolute', right: 28, top: 0 },
  volumenInfoBtn: { position: 'absolute', right: 0, top: -2, width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: '#2a4488', alignItems: 'center', justifyContent: 'center' },
  volumenInfoIcon: { color: '#2a4488', fontSize: 10, fontWeight: '900' },
  volumenTooltip: { backgroundColor: '#0a0a2a', borderWidth: 1, borderColor: '#1a3aff', borderRadius: 12, padding: 14, marginTop: 6, gap: 6 },
  volumenTooltipTitulo: { color: '#fff', fontSize: 13, fontWeight: '900', marginBottom: 4 },
  volumenTooltipText: { color: '#2a4488', fontSize: 12 },
  volumenTooltipNum: { color: '#4488ff', fontWeight: '700' },
  volumenTooltipClose: { alignSelf: 'flex-end', marginTop: 4 },
  volumenTooltipCloseText: { color: '#4488ff', fontSize: 12, fontWeight: '700' },

  diaGrupos: { color: '#2a4488', fontSize: 12, marginTop: 2 },
  emptyBox: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { fontSize: 52, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '900', color: '#fff', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#2a4488', textAlign: 'center', marginBottom: 24 },
  emptyButton: { borderRadius: 14, overflow: 'hidden' },
  emptyButtonGradient: { paddingHorizontal: 24, paddingVertical: 14 },
  emptyButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  ejercicioCard: { backgroundColor: '#05050f', borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 16, padding: 16, marginBottom: 12 },
  ejercicioCardSeleccionado: { borderColor: '#ff3355', backgroundColor: '#1a0005' },
  ejercicioHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  checkboxBox: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  modoEliminarBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1a0005', borderWidth: 1, borderColor: '#ff3355', borderRadius: 12, padding: 12, marginBottom: 12 },
  modoEliminarTxt: { color: '#ff3355', fontSize: 12, fontWeight: '700', flex: 1 },
  modoEliminarBtn: { borderRadius: 8, overflow: 'hidden' },
  modoEliminarBtnGradient: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8 },
  modoEliminarBtnText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  ejercicioNum: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#0a0a2a', borderWidth: 1, borderColor: '#1a1a3a', justifyContent: 'center', alignItems: 'center' },
  ejercicioNumText: { color: '#4488ff', fontWeight: '900', fontSize: 13 },
  ejercicioInfo: { flex: 1 },
  ejercicioNombre: { color: '#fff', fontWeight: '700', fontSize: 15 },
  ejercicioGrupo: { color: '#2a4488', fontSize: 12, marginTop: 2 },
  ejercicioAcciones: { flexDirection: 'row', alignItems: 'center' },
  prescripcionRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0a0a1f', borderRadius: 12, padding: 12, marginBottom: 12 },
  prescripcionItem: { flex: 1, alignItems: 'center' },
  prescripcionNum: { color: '#fff', fontWeight: '900', fontSize: 14 },
  prescripcionLabel: { color: '#2a4488', fontSize: 10, marginTop: 2 },
  prescripcionDivider: { width: 1, height: 30, backgroundColor: '#0f1a3a' },
  registrarBtn: { borderWidth: 1, borderColor: '#0033ff', borderRadius: 10, padding: 12, alignItems: 'center' },
  registrarBtnText: { color: '#4488ff', fontWeight: '700', fontSize: 13 },
  agregarMasBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 14, padding: 16, marginTop: 4, backgroundColor: '#05050f' },
  agregarMasText: { color: '#4488ff', fontWeight: '700', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,2,15,0.92)', justifyContent: 'center', alignItems: 'center' },
  modalOverlayBottom: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.85)' },
  modalBackdrop: { flex: 1 },
  modalBox: { backgroundColor: '#08080f', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderWidth: 1, borderColor: '#1a3aff33' },
  modalBoxBottom: { backgroundColor: '#05050f', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, borderWidth: 1, borderColor: '#0f1a3a' },
  modalTitulo: { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 8 },
  modalSub: { fontSize: 13, color: '#2a4488', marginBottom: 20, lineHeight: 20 },
  modalLabel: { color: '#2a4488', fontSize: 10, letterSpacing: 2, fontWeight: '700', marginBottom: 8 },
  inputWrapper: { borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 14, backgroundColor: '#0a0a1f', marginBottom: 16 },
  input: { color: '#fff', padding: 14, fontSize: 15 },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 8, marginBottom: 24 },
  modalCancelar: { flex: 1, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#1a3aff44', backgroundColor: '#05051a', alignItems: 'center' },
  modalCancelarText: { color: '#2a4488', fontWeight: '700' },
  modalGuardar: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  modalGuardarGradient: { padding: 14, alignItems: 'center' },
  modalGuardarText: { color: '#fff', fontWeight: '700' },
  tipoBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#0f1a3a', backgroundColor: '#0a0a1f' },
  tipoBtnActivo: { borderColor: '#0033ff', backgroundColor: '#05051f' },
  tipoBtnText: { color: '#2a4488', fontWeight: '700', fontSize: 13 },
  tipoBtnTextActivo: { color: '#4488ff' },
  selectorRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  selectorChip: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#0f1a3a', backgroundColor: '#0a0a1f', alignItems: 'center' },
  selectorChipActivo: { borderColor: '#0033ff', backgroundColor: '#05051f' },
  selectorChipText: { color: '#2a4488', fontWeight: '700', fontSize: 14 },
  selectorChipTextActivo: { color: '#4488ff' },
  repsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 0 },
  repsGuion: { color: '#2a4488', fontSize: 18, fontWeight: '900' },
  grupoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16, padding: 16 },
  grupoChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#0f1a3a', backgroundColor: '#0a0a1f' },
  grupoChipActivo: { borderColor: '#0033ff', backgroundColor: '#05051f' },
  grupoChipText: { color: '#2a4488', fontWeight: '700', fontSize: 12 },
  grupoChipTextActivo: { color: '#4488ff' },
  selectorModal: { backgroundColor: '#05050f', borderRadius: 18, borderWidth: 1, borderColor: '#0033ff', width: '92%', overflow: 'hidden' },
  selectorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#0f1a3a' },
  selectorTitulo: { fontSize: 15, fontWeight: '900', color: '#fff' },
  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholderIcon: { fontSize: 52, marginBottom: 12 },
  placeholderText: { fontSize: 24, fontWeight: '900', color: '#fff' },
  placeholderSub: { fontSize: 14, color: '#2a4488', marginTop: 6 },
  
  // INICIO
  iniContainer: { padding: 20, paddingTop: 56, paddingBottom: 150 },
  iniHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  iniPerfilCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#05050f', borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 16, padding: 14, marginBottom: 16 },
  iniPerfilAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#0a1a3f', borderWidth: 1, borderColor: '#1a3aff', justifyContent: 'center', alignItems: 'center' },
  iniPerfilAvatarText: { color: '#4488ff', fontSize: 17, fontWeight: '900' },
  iniPerfilNombre: { color: '#fff', fontSize: 15, fontWeight: '900', marginBottom: 5 },
  iniPerfilSubRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  iniPerfilSub: { color: '#4488ff', fontSize: 10, fontWeight: '700', backgroundColor: '#0a1535', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  iniMetricaAddBtn: { width: 30, height: 30, borderRadius: 8, borderWidth: 1, borderColor: '#0f1a3a', backgroundColor: '#0a0a1f', justifyContent: 'center', alignItems: 'center' },
  metricaModal: { backgroundColor: '#05050f', borderRadius: 20, padding: 22, width: '100%', borderWidth: 1, borderColor: '#1a3aff' },
  metricaModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  metricaModalTitulo: { color: '#fff', fontSize: 16, fontWeight: '900' },
  metricaLabel: { color: '#2a4488', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 6, marginTop: 4 },
  metricaUnidadRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  metricaUnidadBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#0f1a3a', backgroundColor: '#0a0a1f' },
  metricaUnidadBtnActivo: { borderColor: '#1a3aff', backgroundColor: '#05051f' },
  metricaUnidadText: { color: '#2a4488', fontWeight: '700', fontSize: 13 },
  metricaUnidadTextActivo: { color: '#4488ff' },
  rfRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 4 },
  rfR: { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: 2 },
  rfF: { fontSize: 22, fontWeight: '900', color: '#4488ff', letterSpacing: 2 },
  iniProgramaNombre: { fontSize: 11, color: '#2a4488', letterSpacing: 1, fontWeight: '600' },
  iniBellBtn: { padding: 10, borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 12, backgroundColor: '#05050f', position: 'relative' },

  // AJUSTES
  ajustesOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  ajustesContainer: { backgroundColor: '#05050f', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderColor: '#0f1a3a', paddingHorizontal: 20, paddingBottom: 40, maxHeight: '90%' },
  ajustesHandle: { width: 40, height: 4, backgroundColor: '#1a2a5a', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  ajustesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#0f1a3a', marginBottom: 20 },
  ajustesTitulo: { fontSize: 20, fontWeight: '900', color: '#fff' },
  ajustesCerrarBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#0a0a1f', borderWidth: 1, borderColor: '#0f1a3a', justifyContent: 'center', alignItems: 'center' },
  ajustesSectionLabel: { color: '#2a4488', fontSize: 10, fontWeight: '800', letterSpacing: 2, marginBottom: 8, marginTop: 4 },
  ajustesCard: { backgroundColor: '#080812', borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 16, marginBottom: 20, overflow: 'hidden' },
  ajustesPerfilRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingRight: 16 },
  ajustesAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#0a1a3f', borderWidth: 2, borderColor: '#1a3aff', justifyContent: 'center', alignItems: 'center' },
  ajustesAvatarText: { color: '#4488ff', fontSize: 20, fontWeight: '900' },
  ajustesAvatarWrap: { position: 'relative', width: 64, height: 64 },
  ajustesCamaraBtn: { position: 'absolute', bottom: 0, right: 0, width: 22, height: 22, borderRadius: 11, backgroundColor: '#1a3aff', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#08080f' },
  ajustesNombre: { color: '#fff', fontSize: 16, fontWeight: '800', marginBottom: 2 },
  ajustesEmail: { color: '#2a4488', fontSize: 12 },
  ajustesEditBtn: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, borderColor: '#0f1a3a', backgroundColor: '#0a0a1f', justifyContent: 'center', alignItems: 'center' },
  ajustesInputLabel: { color: '#2a4488', fontSize: 9, fontWeight: '800', letterSpacing: 1.5, marginBottom: 6 },
  ajustesInput: { backgroundColor: '#0a0a1f', borderWidth: 1, borderColor: '#1a3aff', borderRadius: 10, padding: 11, color: '#fff', fontSize: 14 },
  ajustesEditForm: { borderTopWidth: 1, borderTopColor: '#0f1a3a', padding: 20, gap: 18, backgroundColor: '#04040e' },
  ajustesEditRow: { flexDirection: 'row', gap: 12 },
  ajustesEditLabel: { color: '#3a5aaa', fontSize: 9, fontWeight: '900', letterSpacing: 2, marginBottom: 8, textTransform: 'uppercase' },
  ajustesEditInput: { backgroundColor: '#08091a', borderWidth: 1.5, borderColor: '#0f1e40', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, color: '#fff', fontSize: 15, fontWeight: '600' },
  ajustesEditInputFocused: { borderColor: '#4488ff', backgroundColor: '#060d20' },
  ajustesEditChip: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, borderColor: '#0f1e40', backgroundColor: '#08091a', alignItems: 'center', justifyContent: 'center' },
  ajustesEditChipLg: { paddingHorizontal: 14, paddingVertical: 11, borderRadius: 12, borderWidth: 1.5, borderColor: '#0f1e40', backgroundColor: '#08091a' },
  ajustesGuardarBtn: { borderRadius: 16, overflow: 'hidden', marginTop: 8 },
  ajustesGuardarGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, paddingHorizontal: 24 },
  ajustesGuardarText: { color: '#fff', fontWeight: '900', fontSize: 15, letterSpacing: 0.5 },
  toastBox: { position: 'absolute', bottom: 108, left: 20, right: 20, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 18, borderWidth: 1.5, backgroundColor: '#001a0a', borderColor: '#00cc44', zIndex: 9999, elevation: 30, shadowColor: '#00cc44', shadowOpacity: 0.7, shadowRadius: 20, shadowOffset: { width: 0, height: 0 } },
  toastText: { flex: 1, fontSize: 13, fontWeight: '700' },
  ajustesPesoRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  unidadRowSmall: { flexDirection: 'row', gap: 6 },
  unidadBtnSmall: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#0f1a3a', backgroundColor: '#0a0a1f' },
  unidadBtnSmallActivo: { borderColor: '#1a3aff', backgroundColor: '#05051f' },
  unidadTextSmall: { color: '#2a4488', fontWeight: '700', fontSize: 12 },
  ajustesRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingHorizontal: 16 },
  ajustesRowText: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '600', flexShrink: 1 },
  ajustesDivider: { height: 1, backgroundColor: '#0f1a3a', marginHorizontal: 16 },
  ajustesVersion: { color: '#1a2a5a', fontSize: 11, textAlign: 'center', marginTop: 8, marginBottom: 20 },
  ajustesSubSection: { paddingHorizontal: 16, paddingBottom: 16, gap: 10 },
  ajustesMsg: { fontSize: 12, fontWeight: '700', marginTop: 4 },

  // Notificaciones toggle
  ajustesNotifRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, gap: 12 },
  ajustesNotifLabel: { color: '#fff', fontSize: 13, fontWeight: '600' },
  ajustesNotifSub: { color: '#2a4488', fontSize: 11, marginTop: 2 },
  ajustesNotifCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#05103a', borderWidth: 1, borderColor: '#1a3aff', borderRadius: 12, padding: 12, marginBottom: 8 },
  ajustesNotifCardIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#0a1a3f', justifyContent: 'center', alignItems: 'center' },
  ajustesNotifCardTitulo: { color: '#fff', fontSize: 13, fontWeight: '700' },
  ajustesNotifCardSub: { color: '#2a4488', fontSize: 11, marginTop: 2 },
  ajustesNotifCardTiempo: { color: '#2a4488', fontSize: 10 },
  ajustesToggle: { width: 44, height: 24, borderRadius: 12, backgroundColor: '#1a1a3a', borderWidth: 1, borderColor: '#0f1a3a', justifyContent: 'center', paddingHorizontal: 2 },
  ajustesToggleOn: { backgroundColor: '#0033ff', borderColor: '#1a3aff' },
  ajustesToggleThumb: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#2a4488' },
  ajustesToggleThumbOn: { backgroundColor: '#fff', transform: [{ translateX: 20 }] },

  // Coach
  ajustesCoachRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  ajustesCoachBtn: { borderRadius: 10, overflow: 'hidden' },
  ajustesCoachBtnGradient: { paddingHorizontal: 16, paddingVertical: 12 },
  ajustesCoachBtnText: { color: '#fff', fontWeight: '900', fontSize: 13 },
  ajustesCoachInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  ajustesCoachAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#0a1a3f', borderWidth: 1, borderColor: '#1a3aff', justifyContent: 'center', alignItems: 'center' },
  ajustesCoachAvatarText: { color: '#4488ff', fontSize: 16, fontWeight: '900' },
  ajustesCoachNombre: { color: '#fff', fontSize: 14, fontWeight: '800' },
  ajustesCoachSub: { color: '#2a4488', fontSize: 11 },

  // Facturación
  ajustesPlanCard: { borderRadius: 14, overflow: 'hidden', marginBottom: 12 },
  ajustesPlanGradient: { padding: 16, borderWidth: 1, borderColor: '#ff6600', borderRadius: 14 },
  ajustesPlanHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  ajustesPlanNombre: { color: '#fff', fontSize: 18, fontWeight: '900' },
  ajustesPlanBadge: { backgroundColor: '#00cc44', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  ajustesPlanBadgeText: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  ajustesPlanPrecio: { color: '#ff6600', fontSize: 28, fontWeight: '900' },
  ajustesPlanPeriodo: { color: '#2a4488', fontSize: 14 },
  ajustesPlanVence: { color: '#2a4488', fontSize: 11, marginTop: 4 },
  ajustesFeaturesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  ajustesFeatureItem: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#001a00', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  ajustesFeatureText: { color: '#00cc44', fontSize: 11, fontWeight: '600' },
  ajustesRenovarBtn: { borderRadius: 12, overflow: 'hidden', marginBottom: 8 },
  ajustesRenovarGradient: { padding: 13, alignItems: 'center' },
  ajustesRenovarText: { color: '#fff', fontWeight: '900', fontSize: 13 },
  ajustesCancelarSubBtn: { padding: 10, alignItems: 'center' },
  ajustesCancelarSubText: { color: '#2a4488', fontSize: 12, textDecorationLine: 'underline' },
  ajustesLinkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#0f1a3a' },
  ajustesLinkText: { color: '#aabbdd', fontSize: 13, fontWeight: '600' },
  ajustesAcercaRow: { alignItems: 'center', paddingVertical: 12, marginBottom: 8 },
  ajustesAcercaLogoR: { color: '#fff', fontSize: 18, fontWeight: '900' },
  ajustesAcercaLogoF: { color: '#4488ff', fontSize: 18, fontWeight: '900' },
  ajustesAcercaVersion: { color: '#2a4488', fontSize: 12, marginTop: 4 },
  ajustesAcercaSub: { color: '#2a4488', fontSize: 11, textAlign: 'center', marginTop: 4 },
  ajustesPlanLibre: { color: '#2a4488', fontSize: 13, marginBottom: 12, textAlign: 'center' },
  ajustesPlanOpcion: { borderRadius: 12, overflow: 'hidden', marginBottom: 8 },
  ajustesPlanOpcionGradient: { padding: 14 },
  ajustesPlanOpcionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  ajustesPlanOpcionNombre: { color: '#fff', fontSize: 15, fontWeight: '900' },
  ajustesPlanOpcionPrecio: { color: '#fff', fontSize: 20, fontWeight: '900' },
  iniBellBadge: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: '#4488ff' },
  iniWeekRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#05050f', borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 16, padding: 16, marginBottom: 16 },
  iniDayCol: { alignItems: 'center', gap: 8 },
  iniDayLabel: { fontSize: 11, color: '#2a4488', fontWeight: '700', marginBottom: 4 },
  iniDayLabelHoy: { color: '#fff' },
  iniDayDot: { width: 30, height: 30, borderRadius: 9, backgroundColor: '#0a0a1f', borderWidth: 1, borderColor: '#0f1a3a', justifyContent: 'center', alignItems: 'center' },
  iniDayDotDone: { backgroundColor: '#0033ff', borderColor: '#0033ff' },
  iniDayDotHoy: { borderColor: '#4488ff', borderWidth: 2, backgroundColor: '#05103a' },
  iniDayDotFuturo: { backgroundColor: '#050510', borderColor: '#1a2a5a', borderStyle: 'dashed' },
  iniDayDotDescanso: { backgroundColor: '#050508', borderColor: '#0a0a15' },
  iniDayDotCenter: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4488ff' },
  iniCardHoy: { backgroundColor: '#05050f', borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 18, padding: 18, marginBottom: 16 },
  iniCardHoyTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  iniCardHoyLabel: { fontSize: 10, color: '#2a4488', letterSpacing: 2, fontWeight: '700', marginBottom: 6 },
  iniCardHoyTitulo: { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 4 },
  iniCardHoySub: { fontSize: 13, color: '#2a4488' },
  iniCardHoyBadge: { backgroundColor: '#0a0a2a', borderWidth: 1, borderColor: '#0033ff', borderRadius: 12, padding: 10, alignItems: 'center', minWidth: 52 },
  iniCardHoyBadgeNum: { fontSize: 20, fontWeight: '900', color: '#4488ff' },
  iniCardHoyBadgeLabel: { fontSize: 10, color: '#2a4488', marginTop: 2 },
  iniStartBtn: { borderRadius: 12, overflow: 'hidden' },
  iniStartGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, gap: 8 },
  iniStartText: { color: '#fff', fontWeight: '900', fontSize: 13, letterSpacing: 2 },
  iniDescansoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#0f1a3a', backgroundColor: '#05050f' },
  iniDescansoText: { color: '#2a4488', fontWeight: '800', fontSize: 13, letterSpacing: 2 },
  iniMetricasRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  iniMetricaCard: { flex: 1, backgroundColor: '#05050f', borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 14, padding: 14, alignItems: 'center' },
  iniMetricaIcon: { fontSize: 20, marginBottom: 6 },
  iniMetricaNum: { fontSize: 20, fontWeight: '900', color: '#fff', marginBottom: 2 },
  iniMetricaLabel: { fontSize: 10, color: '#2a4488', textAlign: 'center' },
  iniSection: { marginBottom: 16 },
  iniSectionLabel: { fontSize: 10, color: '#2a4488', letterSpacing: 3, fontWeight: '800', marginBottom: 8 },
  iniSemanaCard: { backgroundColor: '#05050f', borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 16, padding: 16 },
  iniBarrasRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 80, marginBottom: 12 },
  iniBarraCol: { flex: 1, alignItems: 'center', gap: 6 },
  iniBarraTrack: { flex: 1, width: '65%', backgroundColor: '#0a0a18', borderRadius: 4, overflow: 'hidden', justifyContent: 'flex-end' },
  iniBarraFill: { width: '100%' },
  iniSemanaFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#0f1a3a' },
  iniBarraDia: { fontSize: 11, color: '#2a4488', fontWeight: '700' },
  iniBarraDiaHoy: { color: '#4488ff' },

  iniSemanaFooterText: { fontSize: 12, color: '#2a4488' },
  iniSemanaFooterNum: { fontSize: 12, color: '#4488ff', fontWeight: '700' },
  iniCoachCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#05050f', borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 16, padding: 14, gap: 12 },
  iniCoachAvatar: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#0a0a2a', borderWidth: 1, borderColor: '#1a1a3a', justifyContent: 'center', alignItems: 'center' },
  iniCoachAvatarText: { color: '#2a4488', fontWeight: '900', fontSize: 18 },
  iniCoachInfo: { flex: 1 },
  iniCoachNombre: { color: '#fff', fontWeight: '700', fontSize: 14, marginBottom: 2 },
  iniCoachSub: { color: '#2a4488', fontSize: 11 },
  iniCoachBtn: { paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#0033ff', borderRadius: 10 },
  iniCoachBtnText: { color: '#4488ff', fontWeight: '700', fontSize: 12 },
  iniMsgCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#05050f', borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 14, padding: 14, marginBottom: 0 },
  iniMsgText: { color: '#2a4488', fontSize: 13 },
  iniMsgDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1a3aff', marginLeft: 8 },
  iniSectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  iniBadgeRojo: { backgroundColor: '#ff3355', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  iniBadgeRojoText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  iniSubCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#100800', borderWidth: 1, borderColor: '#ff6600', borderRadius: 16, padding: 14 },
  iniSubInfo: { flex: 1 },
  iniSubTitulo: { color: '#fff', fontWeight: '700', fontSize: 15, marginBottom: 2 },
  iniSubSub: { color: '#ff6600', fontSize: 12 },
  iniSubBtn: { borderRadius: 10, overflow: 'hidden' },
  iniSubBtnGradient: { paddingHorizontal: 14, paddingVertical: 8 },
  iniSubBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  confirmBox: { backgroundColor: '#05050f', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderWidth: 1, borderColor: '#ff3355' },
  confirmIcon: { fontSize: 40, textAlign: 'center', marginBottom: 12 },
  confirmTitulo: { fontSize: 20, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 8 },
  confirmSub: { fontSize: 13, color: '#2a4488', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  confirmEliminarBtn: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  confirmEliminarGradient: { padding: 14, alignItems: 'center' },
  confirmEliminarText: { color: '#fff', fontWeight: '700' },
})
