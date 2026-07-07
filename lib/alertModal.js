import { createRef } from 'react'

export const alertRef = createRef()

// Drop-in replacement for Alert.alert(title, message?, buttons?)
export function showAlert(title, message, buttons) {
  alertRef.current?.show({ title, message, buttons })
}
