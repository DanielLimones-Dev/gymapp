import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import * as WebBrowser from 'expo-web-browser'
import { makeRedirectUri } from 'expo-auth-session'
import { supabase } from '../../lib/supabase'
import Toast from 'react-native-toast-message'
import { AntDesign, FontAwesome } from '@expo/vector-icons'
import TermsModal from '../../components/TermsModal'

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
  const [loadingSocial, setLoadingSocial] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [termsRead, setTermsRead]         = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [showTerms, setShowTerms]         = useState(false)

  async function signInWithGoogle() {
    if (!termsAccepted) {
      Toast.show({ type: 'error', text1: 'Términos requeridos', text2: 'Debes aceptar los Términos y Condiciones' })
      return
    }
    setLoadingSocial('google')
    try {
      const redirectTo = makeRedirectUri({ scheme: 'com.repforge.app', path: 'auth-callback' })
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      })
      if (error || !data?.url) throw error || new Error('No se pudo obtener URL')
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)
      if (result.type !== 'success' || !result.url) return
      const codeMatch = result.url.match(/[?&]code=([^&\s]+)/)
      if (!codeMatch) {
        Toast.show({ type: 'error', text1: 'Error OAuth', text2: 'No se recibió código' })
        return
      }
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(codeMatch[1])
      if (exchangeError) Toast.show({ type: 'error', text1: 'Error', text2: exchangeError.message })
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error', text2: e.message })
    } finally {
      setLoadingSocial(null)
    }
  }

  async function handleLogin() {
    if (!termsAccepted) {
      Toast.show({ type: 'error', text1: 'Términos requeridos', text2: 'Debes aceptar los Términos y Condiciones' })
      return
    }
    if (!email || !password) {
      Toast.show({ type: 'error', text1: 'Campos vacíos', text2: 'Ingresa tu correo y contraseña' })
      return
    }
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) Toast.show({ type: 'error', text1: 'Error', text2: error.message })
    setLoading(false)
  }

  return (
    <LinearGradient colors={['#000000', '#050510', '#0a0a1f']} style={styles.gradient}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

          <View style={styles.header}>
            <RFLogo size={72} />
            <Text style={styles.titleRep}>REP<Text style={styles.titleForge}>FORGE</Text></Text>
            <Text style={styles.subtitle}>BUILD MUSCLE INTELLIGENTLY</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>CORREO ELECTRÓNICO</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="tu@correo.com"
                placeholderTextColor="rgba(255,255,255,0.2)"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <Text style={styles.label}>CONTRASEÑA</Text>
            <View style={[styles.inputWrapper, { flexDirection: 'row', alignItems: 'center' }]}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="••••••••"
                placeholderTextColor="rgba(255,255,255,0.2)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={{ paddingHorizontal: 14 }}>
                <AntDesign name={showPassword ? 'eye' : 'eye-invisible'} size={20} color="#2a4488" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => navigation.navigate('forgotPassword')} style={styles.forgotRow}>
              <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.termsRow}
              onPress={() => {
                if (!termsRead) {
                  Toast.show({ type: 'info', text1: 'Lee los Términos primero', text2: 'Toca "Términos y Condiciones" para leerlos' })
                  return
                }
                setTermsAccepted(v => !v)
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, termsAccepted && styles.checkboxActive, !termsRead && styles.checkboxLocked]}>
                {termsAccepted
                  ? <AntDesign name="check" size={12} color="#fff" />
                  : !termsRead && <AntDesign name="lock" size={10} color="#2a4488" />
                }
              </View>
              <Text style={styles.termsText}>
                Acepto los{' '}
                <Text style={styles.termsLink} onPress={() => setShowTerms(true)}>
                  Términos y Condiciones
                </Text>
                {!termsRead && <Text style={styles.termsPending}> — léelos primero</Text>}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.buttonWrapper, !termsAccepted && { opacity: 0.45 }]} onPress={handleLogin} disabled={loading}>
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
              <TouchableOpacity
                style={styles.socialButton}
                onPress={signInWithGoogle}
                disabled={!!loadingSocial}
              >
                {loadingSocial === 'google' ? <ActivityIndicator size={20} color="#fff" /> : <AntDesign name="google" size={20} color="#ffffff" />}
                <Text style={styles.socialText}>Google</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.socialButton, Platform.OS !== 'ios' && { opacity: 0.5 }]}
                disabled={Platform.OS !== 'ios' || !!loadingSocial}
              >
                <AntDesign name="apple" size={20} color="#ffffff" />
                <Text style={styles.socialText}>Apple</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => navigation.navigate('register')}>
              <Text style={styles.link}>¿No tienes cuenta? <Text style={styles.linkBold}>Regístrate</Text></Text>
            </TouchableOpacity>
          </View>

          <TermsModal
            visible={showTerms}
            onClose={() => setShowTerms(false)}
            onAccept={() => { setTermsRead(true); setTermsAccepted(true) }}
          />
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
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginBottom: 16,
    shadowColor: '#2244ff', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1, shadowRadius: 20, elevation: 20,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  logoInner: { justifyContent: 'center', alignItems: 'center', flexDirection: 'row' },
  logoR: { fontWeight: '900', color: '#ffffff' },
  logoF: { fontWeight: '900', color: '#4488ff' },
  titleRep: {
    fontSize: 30, fontWeight: '900', color: '#ffffff', letterSpacing: 3,
    textShadowColor: 'rgba(255,255,255,0.2)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8,
  },
  titleForge: {
    fontSize: 30, fontWeight: '900', color: '#4488ff', letterSpacing: 3,
    textShadowColor: 'rgba(68,136,255,0.5)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12,
  },
  subtitle: { fontSize: 10, color: '#8E8E93', letterSpacing: 3, marginTop: 6, fontWeight: '700' },
  form: { gap: 6 },
  label: { color: '#8E8E93', fontSize: 10, letterSpacing: 2, marginBottom: 8, fontWeight: '800', textTransform: 'uppercase' },
  inputWrapper: {
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.03)', marginBottom: 16,
  },
  input: { color: '#fff', paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, fontWeight: '500' },
  termsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16, marginTop: 4 },
  checkbox: {
    width: 20, height: 20, borderRadius: 6, borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'transparent',
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: '#1a3aff', borderColor: '#1a3aff' },
  checkboxLocked: { borderColor: '#1a2a4a', backgroundColor: 'rgba(255,255,255,0.02)' },
  termsText: { flex: 1, color: '#8E8E93', fontSize: 13, fontWeight: '500' },
  termsLink: { color: '#4488ff', fontWeight: '700' },
  termsPending: { color: '#2a4060', fontSize: 12, fontWeight: '500' },
  forgotRow: { alignItems: 'flex-end', marginBottom: 16, marginTop: -8 },
  forgotText: { color: '#8E8E93', fontSize: 12, fontWeight: '500' },
  buttonWrapper: { borderRadius: 16, overflow: 'hidden', marginBottom: 8 },
  button: { padding: 17, alignItems: 'center', borderRadius: 16 },
  buttonText: { color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 3 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  divider: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.05)' },
  dividerText: { color: '#8E8E93', marginHorizontal: 12, fontSize: 11, fontWeight: '500' },
  socialRow: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  socialButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 16, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.03)', gap: 8,
  },
  socialText: { color: '#8E8E93', fontWeight: '600', fontSize: 14 },
  link: { color: '#8E8E93', textAlign: 'center', fontSize: 13, fontWeight: '500' },
  linkBold: { color: '#4488ff', fontWeight: 'bold' },
})
