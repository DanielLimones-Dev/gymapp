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
import { AntDesign } from '@expo/vector-icons'
import TermsModal from '../../components/TermsModal'
import AsyncStorage from '@react-native-async-storage/async-storage'

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

export default function Register({ navigation }) {
  const [name, setName]               = useState('')
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [loading, setLoading]         = useState(false)
  const [loadingSocial, setLoadingSocial] = useState(null)
  const [showPassword, setShowPassword]   = useState(false)
  const [termsRead, setTermsRead]         = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [showTerms, setShowTerms]         = useState(false)
  const [rolSeleccionado, setRolSeleccionado] = useState('cliente')

  async function signInWithProvider(provider) {
    if (!termsAccepted) {
      Toast.show({ type: 'error', text1: 'Términos requeridos', text2: 'Debes aceptar los Términos y Condiciones' })
      return
    }
    await AsyncStorage.setItem('pending_rol', rolSeleccionado)
    setLoadingSocial(provider)
    try {
      const redirectTo = makeRedirectUri({ scheme: 'com.repforge.app', path: 'auth-callback' })
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      })
      if (error || !data?.url) throw error || new Error('No se pudo obtener URL de autenticación')
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
      Toast.show({ type: 'error', text1: 'Error', text2: e.message || 'No se pudo iniciar sesión' })
    } finally {
      setLoadingSocial(null)
    }
  }

  async function handleRegister() {
    if (!termsAccepted) {
      Toast.show({ type: 'error', text1: 'Términos requeridos', text2: 'Debes aceptar los Términos y Condiciones' })
      return
    }
    if (!name || !email || !password) {
      Toast.show({ type: 'error', text1: 'Campos vacíos', text2: 'Completa todos los campos' })
      return
    }
    if (password.length < 6) {
      Toast.show({ type: 'error', text1: 'Contraseña muy corta', text2: 'Mínimo 6 caracteres' })
      return
    }
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } }
    })
    const yaExiste = error?.message?.includes('already registered')
      || error?.message?.includes('already been registered')
      || data?.user?.identities?.length === 0
    if (yaExiste) {
      Toast.show({ type: 'error', text1: '¡Correo ya registrado!', text2: 'Ese correo ya tiene cuenta. Inicia sesión.' })
    } else if (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: error.message })
    } else {
      await AsyncStorage.setItem('pending_rol', rolSeleccionado)
      Toast.show({ type: 'success', text1: '¡Bienvenido a RepForge! ⚡', text2: 'Configurando tu perfil...' })
    }
    setLoading(false)
  }

  return (
    <LinearGradient colors={['#000000', '#050510', '#0a0a1f']} style={styles.gradient}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

          <View style={styles.header}>
            <RFLogo size={72} />
            <Text style={styles.titleRep}>REP<Text style={styles.titleForge}>FORGE</Text></Text>
            <Text style={styles.subtitle}>CREA TU CUENTA</Text>
          </View>

          <View style={styles.form}>
            {/* SELECTOR DE ROL */}
            <Text style={styles.label}>SOY</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
              {[
                { key: 'cliente', label: 'Atleta', icon: 'thunderbolt' },
                { key: 'coach',   label: 'Coach',  icon: 'team' },
              ].map(r => (
                <TouchableOpacity
                  key={r.key}
                  onPress={() => setRolSeleccionado(r.key)}
                  activeOpacity={0.8}
                  style={[styles.rolCard, rolSeleccionado === r.key && styles.rolCardActivo]}
                >
                  <AntDesign name={r.icon} size={18} color={rolSeleccionado === r.key ? '#4488ff' : '#2a4488'} />
                  <Text style={[styles.rolCardText, rolSeleccionado === r.key && { color: '#4488ff' }]}>{r.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>NOMBRE COMPLETO</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Tu nombre"
                placeholderTextColor="rgba(255,255,255,0.2)"
                value={name}
                onChangeText={setName}
              />
            </View>

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
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor="rgba(255,255,255,0.2)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={{ paddingHorizontal: 14 }}>
                <AntDesign name={showPassword ? 'eye' : 'eye-invisible'} size={20} color="#2a4488" />
              </TouchableOpacity>
            </View>

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

            {/* REGISTRO EMAIL DESHABILITADO — pendiente evaluar OAuth-only (Google + Apple) */}
            <TouchableOpacity style={[styles.buttonWrapper, { opacity: 0.2 }]} onPress={handleRegister} disabled={true}>
              <LinearGradient colors={['#1a3aff', '#0022cc', '#001199']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.button}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>CREAR CUENTA</Text>}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>o continúa con</Text>
              <View style={styles.divider} />
            </View>

            <View style={styles.socialRow}>
              <TouchableOpacity style={styles.socialButton} onPress={() => signInWithProvider('google')} disabled={!!loadingSocial}>
                {loadingSocial === 'google' ? <ActivityIndicator size={20} color="#fff" /> : <AntDesign name="google" size={20} color="#ffffff" />}
                <Text style={styles.socialText}>Google</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.socialButton, Platform.OS !== 'ios' && { opacity: 0.5 }]} onPress={() => signInWithProvider('apple')} disabled={!!loadingSocial || Platform.OS !== 'ios'}>
                {loadingSocial === 'apple' ? <ActivityIndicator size={20} color="#fff" /> : <AntDesign name="apple" size={20} color="#ffffff" />}
                <Text style={styles.socialText}>Apple</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => navigation.navigate('login')}>
              <Text style={styles.link}>¿Ya tienes cuenta? <Text style={styles.linkBold}>Inicia sesión</Text></Text>
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
  rolCard: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14, borderWidth: 1.5,
    borderColor: '#0f1a3a', backgroundColor: '#05050f',
  },
  rolCardActivo: { borderColor: '#4488ff', backgroundColor: '#4488ff12' },
  rolCardText: { color: '#2a4488', fontWeight: '800', fontSize: 14 },
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
  buttonWrapper: { borderRadius: 16, overflow: 'hidden', marginBottom: 8, marginTop: 4 },
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
  link: { color: '#8E8E93', textAlign: 'center', fontSize: 13, marginBottom: 40, fontWeight: '500' },
  linkBold: { color: '#4488ff', fontWeight: 'bold' },
})
