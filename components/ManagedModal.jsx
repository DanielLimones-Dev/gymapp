// Wrapper de Modal que actualiza el flag global al abrir/cerrar
// Reemplaza <Modal> en toda la app para bloquear PagerTabs automáticamente
import { useEffect } from 'react'
import { Modal, View } from 'react-native'
import { openModal, closeModal } from '../lib/modalState'

export default function ManagedModal({ visible, children, ...props }) {
  useEffect(() => {
    if (visible) {
      openModal()
      return () => closeModal()
    }
  }, [visible])

  return (
    <Modal visible={visible} {...props}>
      <View style={{ flex: 1 }}>
        {children}
      </View>
    </Modal>
  )
}
