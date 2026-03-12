import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { supabase } from '../../lib/supabase'
import Toast from 'react-native-toast-message'
import { AntDesign, FontAwesome } from '@expo/vector-icons'

function RFLogo({ size = 64 }) {
  return (
    <View style={[styles.logoOuter, { width: size, height: size, borderRadius: size * 0.28 }]}>
      <LinearGradient
        colors={['#1a1a2e', '#0f0f23']}
        style={[styles.logoInner, { width: size, height: size, borderRadius: size * 0.28 }]}
      >
        <Text style={[styles.logoR, { fontSize: size * 0.38 }]}>R</Text>
        <Text style={[styles.logoF, { fontSize: size * 0.38 }]}>F</Text>
      </LinearGradient>
    </View>
  )
}

export default function Login({ navigation }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    if (!email || !password) {
      Toast.show({ type: 'error', text1: 'Campos vacíos', text2: 'Ingresa tu correo y contraseña' })
      return
    }
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    
    // Ver exactamente qué responde Supabase
    console.log('DATA:', JSON.stringify(data))
    console.log('ERROR:', JSON.stringify(error))
    
    if (error) Toast.show({ type: 'error', text1: 'Error', text2: error.message })
    setLoading(false)
  }

  return (
    <LinearGradient colors={['#000000', '#050510', '#0a0a1f']} style={styles.gradient}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

          <View style={styles.header}>
            <RFLogo size={72} />
            <View style={styles.titleRow}>
              <Text style={styles.titleRep}>REP</Text>
              <Text style={styles.titleForge}>FORGE</Text>
            </View>
            <Text style={styles.subtitle}>BUILD MUSCLE INTELLIGENTLY</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>CORREO ELECTRÓNICO</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="tu@correo.com"
                placeholderTextColor="#2a2a4a"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <Text style={styles.label}>CONTRASEÑA</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#2a2a4a"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity onPress={() => navigation.navigate('forgotPassword')} style={styles.forgotRow}>
              <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.buttonWrapper} onPress={handleLogin} disabled={loading}>
              <LinearGradient colors={['#1a3aff', '#0022cc', '#001199']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.button}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>INICIAR SESIÓN</Text>}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>o continúa con</Text>
              <View style={styles.divider} />
            </View>

            <View style={styles.socialRow}>
              <TouchableOpacity style={styles.socialButton}>
                <AntDesign name="google" size={20} color="#ffffff" />
                <Text style={styles.socialText}>Google</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialButton}>
                <AntDesign name="apple" size={20} color="#ffffff" />
                <Text style={styles.socialText}>Apple</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => navigation.navigate('register')}>
              <Text style={styles.link}>¿No tienes cuenta? <Text style={styles.linkBold}>Regístrate</Text></Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { padding: 24, paddingTop: 60 },
  header: { alignItems: 'center', marginBottom: 40 },
  logoOuter: {
    borderWidth: 1, borderColor: '#1a1a3a', marginBottom: 16,
    shadowColor: '#2244ff', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1, shadowRadius: 20, elevation: 20,
  },
  logoInner: { justifyContent: 'center', alignItems: 'center', flexDirection: 'row' },
  logoR: { fontWeight: '900', color: '#ffffff' },
  logoF: { fontWeight: '900', color: '#4488ff' },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  titleRep: {
    fontSize: 30, fontWeight: '900', color: '#ffffff', letterSpacing: 3,
    textShadowColor: 'rgba(255,255,255,0.2)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8,
  },
  titleForge: {
    fontSize: 30, fontWeight: '900', color: '#4488ff', letterSpacing: 3,
    textShadowColor: 'rgba(68,136,255,0.5)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12,
  },
  subtitle: { fontSize: 10, color: '#2a4488', letterSpacing: 3, marginTop: 6 },
  form: { gap: 6 },
  label: { color: '#4488ff', fontSize: 13, letterSpacing: 2, marginBottom: 6, fontWeight: '700' },
  inputWrapper: {
    borderWidth: 1, borderColor: '#0f1a3a', borderRadius: 14,
    backgroundColor: '#05050f', marginBottom: 16,
    shadowColor: '#1a2aff', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15, shadowRadius: 8,
  },
  input: { color: '#fff', padding: 16, fontSize: 17 },
  input: { color: '#fff', padding: 16, fontSize: 17 },
  forgotRow: { alignItems: 'flex-end', marginBottom: 16, marginTop: -8 },
  forgotText: { color: '#3355aa', fontSize: 12 },
  buttonWrapper: { borderRadius: 14, overflow: 'hidden', marginBottom: 8 },
  button: { padding: 17, alignItems: 'center', borderRadius: 14 },
  buttonText: { color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 3 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  divider: { flex: 1, height: 1, backgroundColor: '#0f1a3a' },
  dividerText: { color: '#2a3a6a', marginHorizontal: 12, fontSize: 11 },
  socialRow: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  socialButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 14, borderRadius: 14, borderWidth: 1,
    borderColor: '#0f1a3a', backgroundColor: '#05050f', gap: 8,
  },
  socialText: { color: '#aaaacc', fontWeight: '600', fontSize: 14 },
  link: { color: '#2a3a6a', textAlign: 'center', fontSize: 13 },
  linkBold: { color: '#4488ff', fontWeight: 'bold' },
})