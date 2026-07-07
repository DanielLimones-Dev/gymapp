import * as Sentry from '@sentry/react-native'

Sentry.init({
  dsn: 'https://b3ca4badda5c72a36d3b7c41826da8ea@o4511081907224576.ingest.us.sentry.io/4511081936650240',
  tracesSampleRate: 1.0,
})

import { useEffect, useState } from 'react'
import { useFonts } from 'expo-font'
import { AntDesign, FontAwesome } from '@expo/vector-icons'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import * as SplashScreen from 'expo-splash-screen'
import { StripeProvider } from '@stripe/stripe-react-native'
import { View, Text, Animated, DeviceEventEmitter } from 'react-native'

// Evitar que el splash nativo se oculte hasta que la app esté lista
SplashScreen.preventAutoHideAsync()
import { registrarPushToken } from './lib/notifications'
import { supabase } from './lib/supabase'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Login from './app/(auth)/login'
import Register from './app/(auth)/register'
import ForgotPassword from './app/(auth)/forgotPassword'
import Dashboard from './app/(app)/dashboard'
import Onboarding from './app/onboarding'
import OnboardingCoach from './app/onboarding-coach'
import Splash from './app/splash'
import Toast from 'react-native-toast-message'

const Stack = createNativeStackNavigator()

const toastConfig = {
  success: ({ text1, props }) => {
    const color = props?.color || '#00cc66'
    const icon  = props?.icon  || 'check-circle'
    return (
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 10,
        marginHorizontal: 30, paddingHorizontal: 14, paddingVertical: 10,
        borderRadius: 22, backgroundColor: 'rgba(5,5,20,0.94)',
        borderWidth: 1, borderColor: color + '33',
        shadowColor: color, shadowOpacity: 0.25, shadowRadius: 10,
        shadowOffset: { width: 0, height: 5 }, elevation: 15,
      }}>
        <AntDesign name={icon} size={14} color={color} />
        <Text style={{ flex: 1, color: '#fff', fontWeight: '600', fontSize: 13, letterSpacing: -0.2 }}>
          {text1}
        </Text>
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
      </View>
    )
  },
  error: ({ text1, props }) => {
    const color = props?.color || '#ff3355'
    return (
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 10,
        marginHorizontal: 30, paddingHorizontal: 14, paddingVertical: 10,
        borderRadius: 22, backgroundColor: 'rgba(5,5,20,0.94)',
        borderWidth: 1, borderColor: color + '33',
        shadowColor: color, shadowOpacity: 0.25, shadowRadius: 10,
        shadowOffset: { width: 0, height: 5 }, elevation: 15,
      }}>
        <AntDesign name="close-circle" size={14} color={color} />
        <Text style={{ flex: 1, color: '#fff', fontWeight: '600', fontSize: 13, letterSpacing: -0.2 }}>
          {text1}
        </Text>
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
      </View>
    )
  },
}

function App() {
  const [fontsLoaded] = useFonts({ ...AntDesign.font, ...FontAwesome.font })
  const [session, setSession] = useState(null)
  const [showSplash, setShowSplash] = useState(true)
  const fadeIn = useState(new Animated.Value(0))[0]

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false)
    }, 1500)
    return () => clearTimeout(timer)
  }, [])

  // Fade in del contenido principal
  useEffect(() => {
    if (!showSplash && !cargando && fontsLoaded) {
      fadeIn.setValue(0)
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start()
    }
  }, [showSplash, cargando, fontsLoaded])
  const [perfilCompleto, setPerfilCompleto] = useState(null)
  const [rol, setRol] = useState(null)
  const [cargando, setCargando] = useState(true)

  // Verificar si el usuario ya completó su perfil en Supabase
  async function verificarPerfil(userId) {
    try {
      const { data, error } = await supabase
        .from('perfiles')
        .select('id, objetivo, rol, team_name')
        .eq('id', userId)
        .single()

      if (error && error.code !== 'PGRST116') throw error

      if (!data) {
        // Usuario nuevo: leer rol seleccionado durante el registro
        const pendingRol = await AsyncStorage.getItem('pending_rol')
        setRol(pendingRol || 'cliente')
        setPerfilCompleto(false)
      } else {
        setRol(data.rol)
        const completo = data.rol === 'coach' ? !!data.team_name : !!data.objetivo
        setPerfilCompleto(completo)
      }
    } catch (err) {
      setPerfilCompleto(false)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        verificarPerfil(session.user.id)
        registrarPushToken(session.user.id)
      } else {
        setCargando(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (newSession?.user) {
        setCargando(true)
        verificarPerfil(newSession.user.id)
        registrarPushToken(newSession.user.id)
      } else {
        setPerfilCompleto(null)
        setCargando(false)
      }
      console.log("Sesión detectada:", newSession)
    })

    const channel = supabase
      .channel('perfil_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'perfiles' },
        (payload) => {
          if (payload.new?.objetivo) {
            setPerfilCompleto(true)
            setCargando(false)
          }
        }
      )
      .subscribe()

    const eventSub = DeviceEventEmitter.addListener('onboarding_complete', () => {
      setPerfilCompleto(true)
      setCargando(false)
    })

    return () => {
      subscription.unsubscribe()
      supabase.removeChannel(channel)
      eventSub.remove()
    }
  }, [])

  // Ocultar splash nativo cuando la app esté lista
  useEffect(() => {
    if (!showSplash && !cargando && fontsLoaded) {
      SplashScreen.hideAsync()
    }
  }, [showSplash, cargando, fontsLoaded])

  if (!fontsLoaded || showSplash || cargando) return <Splash />

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#0a0a2e' }}>
      <Animated.View style={{ flex: 1, opacity: fadeIn }}>
      <StripeProvider publishableKey="pk_test_REEMPLAZAR_CON_TU_CLAVE_PUBLICA_STRIPE">
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!session ? (
            <>
              <Stack.Screen name="login" component={Login} />
              <Stack.Screen name="register" component={Register} />
              <Stack.Screen name="forgotPassword" component={ForgotPassword} />
              <Stack.Screen name="onboarding" component={Onboarding} />
            </>
          ) : !perfilCompleto ? (
            rol === 'coach'
              ? <Stack.Screen name="onboarding" component={OnboardingCoach} />
              : <Stack.Screen name="onboarding" component={Onboarding} />
          ) : (
            <Stack.Screen name="dashboard">
              {() => <Dashboard userId={session?.user?.id} />}
            </Stack.Screen>
          )}
        </Stack.Navigator>
      </NavigationContainer>
      </StripeProvider>
      <Toast config={toastConfig} />
      </Animated.View>
    </GestureHandlerRootView>
  )
}

export default Sentry.wrap(App)