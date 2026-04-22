// ─────────────────────────────────────────────────────────────────
// CardEntrance — Origin-aware spring animation (iOS-feel)
//
// Modos:
//   1. Card nuevo (anima al montar):
//      <CardEntrance animate={esNuevo} style={styles.card} />
//
//   2. Modal / sheet con morph + exit animado:
//      <CardEntrance ref={cardRef} trigger={visible} originRect={rect} style={styles.box} />
//      Para cerrar: cardRef.current.animateOut(() => setVisible(false))
//
// animateOut(callback):
//   Animación de salida simétrica — scale↓, translateY↓, opacity→0
//   Llama callback cuando termina (para setVisible(false))
// ─────────────────────────────────────────────────────────────────
import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { Animated, Easing } from 'react-native'

const SPRING    = { tension: 180, friction: 18, useNativeDriver: true }
const EXIT_MS   = 220   // duración de la salida

const CardEntrance = forwardRef(function CardEntrance({
  children,
  style,
  animate    = false,
  delay      = 0,
  trigger,
  originRect,
}, ref) {
  const viewRef    = useRef(null)
  const isTriggerMode = trigger !== undefined
  const translateY = useRef(new Animated.Value(animate ? 6 : 0)).current
  const scale      = useRef(new Animated.Value(animate ? 0.96 : 1)).current
  // 0.001 en lugar de 0 — en Android, opacity exactamente 0 con native driver bloquea touch events
  // En trigger mode: empieza en 0.001 para evitar flash de 1 frame al montar con el Modal visible
  const opacity    = useRef(new Animated.Value((animate || isTriggerMode) ? 0.001 : 1)).current

  // Guarda los valores iniciales del último enter para que el exit
  // sea el espejo exacto (misma magnitud de translateY y scale)
  const lastEnterState = useRef({ ty: 20, sc: 0.7 })

  // ─── Animación de entrada ─────────────────────────────────────
  function animate_({ from, cy, ch }) {
    let initTY, initSC
    if (from && ch > 0) {
      const cardCenterY = cy + ch / 2
      const btnCenterY  = from.y + from.height / 2
      initTY = btnCenterY - cardCenterY
      initSC = from.width / ch * 0.5
    } else {
      initTY = 20
      initSC = 0.7
    }
    lastEnterState.current = { ty: initTY, sc: initSC }

    translateY.setValue(initTY)
    scale.setValue(initSC)
    opacity.setValue(0.001)

    Animated.parallel([
      Animated.spring(scale,      { toValue: 1, ...SPRING }),
      Animated.spring(translateY, { toValue: 0, ...SPRING }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start()
  }

  function runAnimation(from) {
    opacity.setValue(0.001)
    requestAnimationFrame(() => {
      viewRef.current?.measureInWindow((cx, cy, cw, ch) => {
        animate_({ from, cy, ch })
      })
    })
  }

  // ─── Animación de salida (simétrica) — expuesta via ref ───────
  useImperativeHandle(ref, () => ({
    animateOut(onDone) {
      const { ty, sc } = lastEnterState.current
      Animated.parallel([
        Animated.timing(scale, {
          toValue: sc,
          duration: EXIT_MS,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: ty,
          duration: EXIT_MS,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: EXIT_MS - 30,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => onDone?.())
    },
  }))

  // Modo 1 — al montar (cards nuevos)
  useEffect(() => {
    if (animate && trigger === undefined) {
      lastEnterState.current = { ty: 6, sc: 0.96 }
      opacity.setValue(0.001)
      translateY.setValue(6)
      scale.setValue(0.96)
      const t = setTimeout(() => {
        Animated.parallel([
          Animated.spring(scale,      { toValue: 1, ...SPRING }),
          Animated.spring(translateY, { toValue: 0, ...SPRING }),
          Animated.timing(opacity, {
            toValue: 1, duration: 220,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start()
      }, delay)
      return () => clearTimeout(t)
    }
  }, [])

  // Modo 2 — trigger (modales)
  useEffect(() => {
    if (trigger === undefined) return
    if (trigger) runAnimation(originRect ?? null)
  }, [trigger, originRect])

  return (
    <Animated.View
      ref={viewRef}
      style={[style, { opacity, transform: [{ translateY }, { scale }] }]}
    >
      {children}
    </Animated.View>
  )
})

export default CardEntrance
