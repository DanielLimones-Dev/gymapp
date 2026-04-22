// ─────────────────────────────────────────────────────────────────
// StaggerChildren — Entrada escalonada tipo iOS para secciones de modal
//
// Uso básico (modales):
//   <StaggerChildren trigger={visible} delay={70} step={55}>
//
// Uso premium (pantallas):
//   <StaggerChildren trigger={visible} delay={80} step={90}
//     translateYStart={30} springTension={90} springFriction={13} opacityDuration={350}>
//
// Cada hijo directo recibe delay + index*step ms de retraso.
// Al cerrar (trigger→false) todos vuelven a opacity 0 instantáneamente.
// ─────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef, Children, isValidElement } from 'react'
import { Animated, Easing } from 'react-native'

function StaggerItem({ children, delay, gen, translateYStart, springTension, springFriction, opacityDuration }) {
  // Nota: 0.001 en lugar de 0 — en Android, opacity exactamente 0 con native driver
  // hace que la vista no reciba touch events (el compositor nativo la descarta en hit testing)
  const opacity    = useRef(new Animated.Value(0.001)).current
  const translateY = useRef(new Animated.Value(translateYStart)).current

  useEffect(() => {
    if (gen === 0) {
      opacity.setValue(0.001)
      translateY.setValue(translateYStart)
      return
    }
    opacity.setValue(0.001)
    translateY.setValue(translateYStart)
    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: opacityDuration,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          tension: springTension,
          friction: springFriction,
          useNativeDriver: true,
        }),
      ]).start()
    }, delay)
    return () => clearTimeout(t)
  }, [gen])

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  )
}

export default function StaggerChildren({
  children,
  trigger,
  delay          = 70,
  step           = 55,
  translateYStart = 6,
  springTension  = 220,
  springFriction = 22,
  opacityDuration = 220,
}) {
  const [gen, setGen] = useState(0)

  useEffect(() => {
    if (trigger) {
      setGen(g => g + 1)
    } else {
      setGen(0)
    }
  }, [trigger])

  let index = 0
  return Children.map(children, child => {
    if (!isValidElement(child)) return child
    const itemDelay = delay + index * step
    index++
    return (
      <StaggerItem
        key={index}
        delay={itemDelay}
        gen={gen}
        translateYStart={translateYStart}
        springTension={springTension}
        springFriction={springFriction}
        opacityDuration={opacityDuration}
      >
        {child}
      </StaggerItem>
    )
  })
}
