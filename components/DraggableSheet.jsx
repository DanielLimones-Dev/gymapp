// Bottom sheet con animación de drag-to-close + tap-fuera-cierra
// — Usa Pressable NATIVO para bloquear swipes fantasmas
// — handle + header siempre draggable
// — body draggable solo cuando scrollable es false
import { useRef, useEffect, useState } from 'react'
import {
  Animated, PanResponder, StyleSheet, View, Dimensions, Keyboard, Pressable
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

const AnimatedBackdrop = Animated.createAnimatedComponent(Pressable)
const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient)
const FALLBACK_COLORS = ['rgba(10,15,35,0.98)', 'rgba(5,5,24,0.98)', 'rgba(13,13,37,0.98)']
const { height: SCREEN_HEIGHT } = Dimensions.get('window')

export default function DraggableSheet({
  onClose,
  children,
  scrollable = false,
  containerStyle,
  gradientColors,   // cuando se pasa, usa LinearGradient como fondo
  header,
}) {
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current
  const overlayOpacity = useRef(new Animated.Value(0)).current
  const onCloseRef = useRef(onClose)
  const scrollableRef = useRef(scrollable)
  // Android cachea los bounds de hit-testing cuando la vista monta off-screen.
  // Al terminar la animación, el setState fuerza un re-layout que los recalcula.
  const [interactive, setInteractive] = useState(false)

  useEffect(() => { scrollableRef.current = scrollable }, [scrollable])
  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  // Animación de entrada — al terminar, setInteractive(true) fuerza re-layout
  // que recalcula los bounds de hit-testing en Android
  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 220, friction: 24 }),
      Animated.timing(overlayOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start(() => setInteractive(true))
  }, [])

  // Reset posición cuando el teclado se oculta
  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidHide', () => {
      Animated.spring(translateY, {
        toValue: 0, useNativeDriver: true, tension: 80, friction: 12,
      }).start()
    })
    return () => sub.remove()
  }, [])

  function closeWithAnimation() {
    Animated.parallel([
      Animated.timing(translateY, { toValue: SCREEN_HEIGHT, duration: 280, useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => onCloseRef.current())
  }

  function handleRelease(dy, vy) {
    if (dy > 80 || vy > 0.8) {
      closeWithAnimation()
    } else {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }),
        Animated.spring(overlayOpacity, { toValue: 1, useNativeDriver: true, tension: 80, friction: 12 }),
      ]).start()
    }
  }

  // Handle + Header — SIEMPRE captura el gesto de arrastre
  const topPan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, { dy }) => dy > 2,
    onPanResponderMove: (_, { dy }) => { if (dy > 0) translateY.setValue(dy) },
    onPanResponderRelease: (_, { dy, vy }) => handleRelease(dy, vy),
    onPanResponderTerminate: () => {
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start()
    },
  })).current

  // Body — solo captura swipe cuando scrollableRef.current es false
  const sheetPan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, { dy, dx }) =>
      !scrollableRef.current && dy > 5 && dy > Math.abs(dx),
    onPanResponderMove: (_, { dy }) => { if (dy > 0) translateY.setValue(dy) },
    onPanResponderRelease: (_, { dy, vy }) => handleRelease(dy, vy),
    onPanResponderTerminate: () => {
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start()
    },
  })).current

  return (
    <View style={styles.root} collapsable={false} pointerEvents={interactive ? 'auto' : 'none'}>
      {/* Overlay oscuro con tap para cerrar */}
      <AnimatedBackdrop
        onPress={closeWithAnimation}
        style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: 'rgba(0, 2, 15, 0.95)', opacity: overlayOpacity },
        ]}
      />

      <AnimatedGradient
        colors={gradientColors || FALLBACK_COLORS}
        style={[styles.container, containerStyle, { transform: [{ translateY }] }]}
        {...sheetPan.panHandlers}
      >
        {/* Zona draggable: handle + header */}
        <View {...topPan.panHandlers} style={{ width: '100%', paddingBottom: 8 }}>
          <View style={styles.handle} />
          {header}
        </View>

        <View style={{ flex: 1 }}>
          {children}
        </View>
      </AnimatedGradient>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: '92%',
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 12,
  },
})
