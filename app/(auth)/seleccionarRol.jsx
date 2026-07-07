// ============================================
// SELECCIONAR ROL \u2014 Pantalla para usuarios nuevos
// que entran por Google sin haber seleccionado rol
// ============================================
import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { AntDesign } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'

const { width: W } = Dimensions.get('window')

const ROLES = [
  {
    key: 'cliente',
    titulo: 'Soy Atleta',
    sub: 'Quiero entrenar, registrar mis series y ver mi progreso',
    icono: 'user',
    color: '#4488ff',
    features: ['Rutinas personalizadas', 'Progreso y estad\u00edsticas', 'Chat con mi coach', 'IA de entrenamiento'],
  },
  {
    key: 'coach',
    titulo: 'Soy Coach',
    sub: 'Quiero gestionar mis clientes y crear programas de entrenamiento',
    icono: 'team',
    color: '#9933ff',
    features: ['Panel de clientes', 'Crear rutinas y programas', 'Seguimiento de atletas', 'Mensajer\u00eda directa'],
  },
]

export default function SeleccionarRol({ onSelect }) {
  const [seleccionado, setSeleccionado] = useState(null)

  function elegir(rol) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setSeleccionado(rol)
  }

  function confirmar() {
    if (!seleccionado) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    onSelect(seleccionado)
  }

  return (
    <LinearGradient colors={['#000000', '#050510', '#0a0a1f']} style={{ flex: 1 }}>
      <View style={styles.container}>

        <View style={styles.header}>
          <View style={styles.logoWrap}>
            <LinearGradient colors={['#1a1a2e', '#0f0f23']} style={styles.logoInner}>
              <Text style={styles.logoR}>REP</Text>
              <Text style={styles.logoF}>FORGE</Text>
            </LinearGradient>
          </View>
          <Text style={styles.titulo}>\u00bfC\u00f3mo usar\u00e1s{'\n'}RepForge?</Text>
          <Text style={styles.sub}>Elige tu rol para personalizar tu experiencia</Text>
        </View>

        <View style={styles.cards}>
          {ROLES.map(rol => {
            const activo = seleccionado === rol.key
            return (
              <TouchableOpacity
                key={rol.key}
                activeOpacity={0.85}
                onPress={() => elegir(rol.key)}
                style={[
                  styles.card,
                  { borderColor: activo ? rol.color : rol.color + '33' },
                  activo && { backgroundColor: rol.color + '10' },
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.iconWrap, { backgroundColor: rol.color + '22', borderColor: rol.color + '55' }]}>
                    <AntDesign name={rol.icono} size={26} color={rol.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitulo}>{rol.titulo}</Text>
                    <Text style={[styles.cardSub, { color: rol.color + 'aa' }]}>{rol.sub}</Text>
                  </View>
                  <View style={[styles.radio, activo && { borderColor: rol.color, backgroundColor: rol.color }]}>
                    {activo && <AntDesign name="check" size={11} color="#fff" />}
                  </View>
                </View>

                <View style={styles.features}>
                  {rol.features.map(f => (
                    <View key={f} style={styles.featureRow}>
                      <AntDesign name="check-circle" size={12} color={rol.color} />
                      <Text style={styles.featureText}>{f}</Text>
                    </View>
                  ))}
                </View>

                {activo && (
                  <TouchableOpacity onPress={confirmar} activeOpacity={0.85}>
                    <LinearGradient
                      colors={[rol.color + 'dd', rol.color + '99']}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={styles.cardBtn}
                    >
                      <Text style={styles.cardBtnText}>Continuar como {rol.titulo.split(' ')[1]}</Text>
                      <AntDesign name="arrow-right" size={15} color="#fff" />
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            )
          })}
        </View>

      </View>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 36 },
  logoWrap: {
    width: 64, height: 64, borderRadius: 18,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#4488ff', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 16, elevation: 16, marginBottom: 20,
  },
  logoInner: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', borderRadius: 18 },
  logoR: { fontSize: 13, fontWeight: '900', color: '#fff' },
  logoF: { fontSize: 13, fontWeight: '900', color: '#4488ff' },
  titulo: { fontSize: 28, fontWeight: '900', color: '#fff', textAlign: 'center', lineHeight: 34, marginBottom: 10 },
  sub: { fontSize: 13, color: '#2a4488', textAlign: 'center', lineHeight: 19 },
  cards: { gap: 16 },
  card: {
    borderRadius: 20, borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#05050f',
    padding: 18, gap: 14,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  iconWrap: {
    width: 52, height: 52, borderRadius: 14, borderWidth: 1,
    justifyContent: 'center', alignItems: 'center',
  },
  cardTitulo: { color: '#fff', fontSize: 17, fontWeight: '900', marginBottom: 4 },
  cardSub: { fontSize: 12, fontWeight: '500', lineHeight: 17, paddingRight: 8 },
  radio: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'transparent',
    justifyContent: 'center', alignItems: 'center', marginTop: 2,
  },
  features: { gap: 7, paddingLeft: 4 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureText: { color: '#aabbdd', fontSize: 12, fontWeight: '600' },
  cardBtn: {
    borderRadius: 12, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  cardBtnText: { color: '#fff', fontWeight: '900', fontSize: 13, letterSpacing: 0.3 },
})
