// ════════════════════════════════════════════════════════════════
// SwipeableModal v5 — Zona de captura invisible en la parte superior
// La zona superior (onStartShouldSetPanResponder: true) garantiza
// swipe desde cualquier punto horizontal sin icono visual.
// El cuerpo mantiene el comportamiento original para no bloquear scroll.
// ════════════════════════════════════════════════════════════════
import { useRef, useEffect, useState } from 'react'
import {
  Modal, View, Animated, PanResponder,
  Dimensions, StyleSheet
} from 'react-native'
import { openModal, closeModal, getCount } from '../lib/modalState'

const { height: SCREEN_H } = Dimensions.get('window')

export default function SwipeableModal({ visible, onClose, children, backgroundColor = '#000', captureHeight = 28, noBodySwipe = false }) {
  const translateY = useRef(new Animated.Value(SCREEN_H)).current
  const [show, setShow] = useState(false)
  const myLevel = useRef(0)

  useEffect(() => {
    if (visible) {
      openModal()
      myLevel.current = getCount()
      setShow(true)
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 72,
        friction: 14,
      }).start()
    } else {
      close()
    }
  }, [visible])

  function close() {
    closeModal()
    Animated.timing(translateY, {
      toValue: SCREEN_H,
      duration: 260,
      useNativeDriver: true,
    }).start(() => {
      setShow(false)
      translateY.setValue(SCREEN_H)
    })
  }

  function handleClose() {
    close()
    onClose()
  }

  function isTopModal() { return getCount() <= myLevel.current }

  function buildPan(alwaysCapture) {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => alwaysCapture && isTopModal(),
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, { dx, dy }) => isTopModal() && dy > 10 && dy > Math.abs(dx) * 1.5,
      onMoveShouldSetPanResponderCapture: () => false,
      onPanResponderMove: (_, { dy }) => {
        if (dy > 0) translateY.setValue(dy)
      },
      onPanResponderRelease: (_, { dy, vy }) => {
        if (dy > 80 || vy > 0.8) {
          Animated.timing(translateY, {
            toValue: SCREEN_H,
            duration: 240,
            useNativeDriver: true,
          }).start(() => {
            translateY.setValue(SCREEN_H)
            setShow(false)
            onClose()
          })
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 80,
            friction: 14,
          }).start()
        }
      },
      onPanResponderTerminate: () => {
        Animated.timing(translateY, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start()
      },
    })
  }

  // Zona superior: siempre captura (sin icono, solo área táctil)
  const topPan  = useRef(buildPan(true)).current
  // Cuerpo: solo captura si el gesto es claramente hacia abajo
  const bodyPan = useRef(buildPan(false)).current

  if (!show) return null

  return (
    <Modal
      visible={show}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[styles.sheet, { backgroundColor, transform: [{ translateY }] }]}
        >
          {/* Zona de captura con handle visual */}
          <View style={[styles.captureZone, { height: captureHeight }]} {...topPan.panHandlers}>
            <View style={styles.handle} />
          </View>

          {/* Contenido */}
          <View style={{ flex: 1, overflow: 'hidden' }} {...(noBodySwipe ? {} : bodyPan.panHandlers)}>
            {children}
          </View>
        </Animated.View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,2,15,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    height: '96%',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: 'hidden',
  },
  captureZone: {
    width: '100%',
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
})
