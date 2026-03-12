// ════════════════════════════════════════════════════════════════
// SwipeableModal v3 — Swipe SOLO desde el handle
// No compite con scroll interno. Funciona iOS + Android.
// app/(app)/SwipeableModal.jsx
// ════════════════════════════════════════════════════════════════
import { useRef, useEffect, useState } from 'react'
import {
  Modal, View, Animated, PanResponder,
  Dimensions, StyleSheet
} from 'react-native'

const { height: SCREEN_H } = Dimensions.get('window')

export default function SwipeableModal({ visible, onClose, children, backgroundColor = '#000' }) {
  const translateY = useRef(new Animated.Value(SCREEN_H)).current
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (visible) {
      setShow(true)
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 60,
        friction: 12,
        overshootClamping: true,
      }).start()
    } else {
      close()
    }
  }, [visible])

  function close() {
    Animated.timing(translateY, {
      toValue: SCREEN_H,
      duration: 250,
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

  // PanResponder SOLO para el handle — no interfiere con scroll
  const handlePan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, { dy }) => Math.abs(dy) > 5,
      onPanResponderMove: (_, { dy }) => {
        if (dy > 0) translateY.setValue(dy)
      },
      onPanResponderRelease: (_, { dy, vy }) => {
        if (dy > 80 || vy > 0.8) {
          Animated.timing(translateY, {
            toValue: SCREEN_H,
            duration: 220,
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
            friction: 12,
            overshootClamping: true,
          }).start()
        }
      },
    })
  ).current

  if (!show) return null

  return (
    <Modal
      visible={show}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      {/* Fondo oscuro — tap para cerrar */}
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.sheet,
            { backgroundColor, transform: [{ translateY }] }
          ]}
        >
          {/* HANDLE — única zona de swipe */}
          <View style={styles.handleContainer} {...handlePan.panHandlers}>
            <View style={styles.handle} />
          </View>

          {/* Contenido sin interferencia */}
          <View style={{ flex: 1, overflow: 'hidden' }}>
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
  handleContainer: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 20,
    backgroundColor: 'transparent',
    zIndex: 99,
    // Zona grande para facilitar el swipe
    minHeight: 50,
  },
  handle: {
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#2a3a6a',
  },
})
