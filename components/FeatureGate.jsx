// ── FeatureGate ──────────────────────────────────────────────────
// Muestra un overlay "No disponible" si el feature flag está off.
// bypass=true (superadmin) → siempre muestra el contenido.
import { useState, useEffect } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { AntDesign } from '@expo/vector-icons'
import { fetchFlags } from '../lib/featureFlags'

export default function FeatureGate({ flagId, bypass = false, children }) {
  const [habilitado, setHabilitado] = useState(true)
  const [checked,    setChecked]    = useState(false)

  useEffect(() => {
    if (bypass) { setChecked(true); return }
    fetchFlags().then(flags => {
      // Si el flag no existe en la tabla → habilitado por defecto
      setHabilitado(flags[flagId] !== false)
      setChecked(true)
    })
  }, [flagId, bypass])

  if (!checked) return null
  if (habilitado || bypass) return children

  return (
    <View style={styles.container}>
      <View style={styles.iconBox}>
        <AntDesign name="lock" size={30} color="#e63560" />
      </View>
      <Text style={styles.title}>No disponible</Text>
      <Text style={styles.desc}>
        Esta función ha sido deshabilitada{'\n'}temporalmente por el administrador.
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#06060e',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  iconBox: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: 'rgba(230,53,96,0.08)',
    borderWidth: 1, borderColor: 'rgba(230,53,96,0.25)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  desc: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
})
