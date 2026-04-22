import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { supabase } from '../../lib/supabase'
import Toast from 'react-native-toast-message'

export default function ForgotPassword({ navigation }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleReset() {
    if (!email) {
      Toast.show({ type: 'error', text1: 'Campo vacío', text2: 'Ingresa tu correo electrónico' })
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: error.message })
    } else {
      setSent(true)
      Toast.show({ type: 'success', text1: '¡Correo enviado! ⚡', text2: 'Revisa tu bandeja de entrada' })
    }
    setLoading(false)
  }

  return (
    <LinearGradient colors={['#000000', '#050510', '#0a0a1f']} style={styles.gradient}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>← Volver</Text>
        </TouchableOpacity>

        <View style={styles.content}>
          <Text style={styles.title}>Recuperar{'\n'}<Text style={styles.titleBlue}>contraseña</Text></Text>
          <Text style={styles.desc}>
            Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
          </Text>

          {!sent ? (
            <>
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

              <TouchableOpacity style={styles.buttonWrapper} onPress={handleReset} disabled={loading}>
                <LinearGradient colors={['#1a3aff', '#0022cc', '#001199']} style={styles.button}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>ENVIAR ENLACE</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.sentBox}>
              <Text style={styles.sentIcon}>📩</Text>
              <Text style={styles.sentTitle}>¡Correo enviado!</Text>
              <Text style={styles.sentDesc}>Revisa tu bandeja de entrada y sigue las instrucciones para restablecer tu contraseña.</Text>
              <TouchableOpacity style={styles.buttonWrapper} onPress={() => navigation.navigate('login')}>
                <LinearGradient colors={['#1a3aff', '#0022cc']} style={styles.button}>
                  <Text style={styles.buttonText}>VOLVER AL LOGIN</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1, padding: 24, paddingTop: 60 },
  back: { marginBottom: 32 },
  backText: { color: '#4488ff', fontSize: 14, fontWeight: '600' },
  content: { flex: 1 },
  title: { fontSize: 34, fontWeight: '900', color: '#fff', marginBottom: 12, lineHeight: 40 },
  titleBlue: { color: '#4488ff', textShadowColor: 'rgba(68,136,255,0.4)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12 },
  desc: { color: '#8E8E93', fontSize: 14, marginBottom: 36, lineHeight: 22, fontWeight: '500' },
  label: { color: '#8E8E93', fontSize: 10, letterSpacing: 2, marginBottom: 6, fontWeight: '800', textTransform: 'uppercase' },
  inputWrapper: {
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.03)', marginBottom: 20,
  },
  input: { color: '#fff', padding: 16, fontSize: 15, fontWeight: '500' },
  buttonWrapper: { borderRadius: 16, overflow: 'hidden' },
  button: { padding: 17, alignItems: 'center', borderRadius: 16 },
  buttonText: { color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 3 },
  sentBox: { alignItems: 'center', gap: 16, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 24, padding: 28 },
  sentIcon: { fontSize: 52, marginBottom: 8 },
  sentTitle: { fontSize: 24, fontWeight: '900', color: '#fff' },
  sentDesc: { color: '#8E8E93', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 16, fontWeight: '500' },
})