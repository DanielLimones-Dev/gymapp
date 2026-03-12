import { useEffect, useState } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { View, ActivityIndicator } from 'react-native'
import { supabase } from './lib/supabase'
import Login from './app/(auth)/login'
import Register from './app/(auth)/register'
import ForgotPassword from './app/(auth)/forgotPassword'
import Dashboard from './app/(app)/dashboard'
import Onboarding from './app/onboarding'
import Splash from './app/splash'
import Toast from 'react-native-toast-message'

const Stack = createNativeStackNavigator()

export default function App() {
  const [session, setSession] = useState(null)
  const [showSplash, setShowSplash] = useState(true)
  const [perfilCompleto, setPerfilCompleto] = useState(null)
  const [cargando, setCargando] = useState(true)

  // Verificar si el usuario ya completó su perfil en Supabase
  async function verificarPerfil(userId) {
    const { data } = await supabase
      .from('perfiles')
      .select('id, objetivo')
      .eq('id', userId)
      .single()

    setPerfilCompleto(!!data?.objetivo)
    setCargando(false)
  }

  useEffect(() => {
    setTimeout(() => setShowSplash(false), 2800)

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        verificarPerfil(session.user.id)
      } else {
        setCargando(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (newSession?.user) {
        verificarPerfil(newSession.user.id)
      } else {
        setPerfilCompleto(null)
        setCargando(false)
      }
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

    return () => {
      subscription.unsubscribe()
      supabase.removeChannel(channel)
    }
  }, [])

  if (showSplash) return <Splash />

  if (cargando) return (
    <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator color="#4488ff" size="large" />
    </View>
  )

  return (
    <>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!session ? (
            <>
              <Stack.Screen name="login" component={Login} />
              <Stack.Screen name="register" component={Register} />
              <Stack.Screen name="forgotPassword" component={ForgotPassword} />
            </>
          ) : !perfilCompleto ? (
            <Stack.Screen name="onboarding" component={Onboarding} />
          ) : (
            <Stack.Screen name="dashboard">
              {() => <Dashboard userId={session?.user?.id} />}
            </Stack.Screen>
          )}
        </Stack.Navigator>
      </NavigationContainer>
      <Toast />
    </>
  )
}