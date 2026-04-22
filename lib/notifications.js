// ============================================
// NOTIFICATIONS — Push tokens + envío
// lib/notifications.js
// ============================================
import Constants from 'expo-constants'
import { Platform } from 'react-native'
import { supabase } from './supabase'

// Expo Go SDK 53+ — usar appOwnership, executionEnvironment no es fiable en dev build
const isExpoGo = Constants.appOwnership === 'expo'

function getNotifications() {
  if (isExpoGo) return null
  return require('expo-notifications')
}

// Configurar handler solo en dev build
if (!isExpoGo) {
  const Notifications = require('expo-notifications')
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  })
}

// Registra el token Expo Push del dispositivo y lo guarda en Supabase
export async function registrarPushToken(userId) {
  if (Platform.OS === 'web' || isExpoGo) return null
  try {
    const Notifications = getNotifications()
    const { status: existing } = await Notifications.getPermissionsAsync()
    let finalStatus = existing
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }
    if (finalStatus !== 'granted') return null

    const projectId = Constants.expoConfig?.extra?.eas?.projectId
    const { data: token } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : {}
    )
    await supabase.from('perfiles').update({ push_token: token }).eq('id', userId)
    return token
  } catch (e) {}
  return null
}

// Envía push al destinatario cuando se manda un mensaje de chat
export async function enviarPushMensaje(recipientId, senderId, texto) {
  if (isExpoGo) return
  try {
    const [{ data: dest }, { data: src }] = await Promise.all([
      supabase.from('perfiles').select('push_token').eq('id', recipientId).single(),
      supabase.from('perfiles').select('nombre_completo').eq('id', senderId).single(),
    ])
    if (!dest?.push_token) return

    fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: dest.push_token,
        title: `💬 ${src?.nombre_completo || 'RepForge'}`,
        body: texto.length > 100 ? texto.slice(0, 97) + '…' : texto,
        sound: 'default',
        data: { type: 'mensaje', senderId },
      }),
    })
  } catch (e) {}
}

// Programa notificaciones locales (recordatorios de entrenamiento)
export async function programarNotificacionesLocales(notifs, diasActivosSemana) {
  if (isExpoGo) return
  try {
    const Notifications = getNotifications()
    await Notifications.cancelAllScheduledNotificationsAsync()

    if (notifs.entrenamiento && diasActivosSemana?.length > 0) {
      for (const diaKey of diasActivosSemana) {
        const weekday = diaKey === 6 ? 1 : diaKey + 2
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '💪 Día de entrenamiento',
            body: 'Tienes entrenamiento programado hoy. ¡A darle!',
            sound: true,
          },
          trigger: { weekday, hour: 8, minute: 0, repeats: true },
        })
      }
    }

    if (notifs.progreso) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '📊 Resumen semanal',
          body: 'Revisa tu progreso de la semana en RepForge',
          sound: true,
        },
        trigger: { weekday: 2, hour: 9, minute: 0, repeats: true },
      })
    }
  } catch (e) {}
}
