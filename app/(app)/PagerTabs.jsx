// ════════════════════════════════════════════════════════════════
// PagerTabs — Tabs con swipe horizontal nativo
// Sin destellos blancos. Fondo negro siempre visible.
// app/(app)/PagerTabs.jsx
// ════════════════════════════════════════════════════════════════
import { useRef, useState } from 'react'
import {
  View, Animated, PanResponder, Dimensions,
  StyleSheet, Text, Pressable,
} from 'react-native'
import { AntDesign } from '@expo/vector-icons'

const { width: W } = Dimensions.get('window')
const SWIPE_DIST = 48
const SWIPE_VEL  = 0.25

export default function PagerTabs({ tabs, initialIndex = 0 }) {
  const [index, setIndex]  = useState(initialIndex)
  const translateX         = useRef(new Animated.Value(-initialIndex * W)).current
  const currentI           = useRef(initialIndex)
  const settling           = useRef(false)
  const lastTap            = useRef({})

  function goTo(i, animated = true) {
    if (i < 0 || i >= tabs.length || i === currentI.current) return
    currentI.current = i
    setIndex(i)
    Animated.spring(translateX, {
      toValue: -i * W,
      useNativeDriver: true,
      tension: 120,
      friction: 16,
      overshootClamping: true,
    }).start(() => { settling.current = false })
  }

  const pan = useRef(PanResponder.create({
    // Capturar cuando el movimiento horizontal domina claramente
    onMoveShouldSetPanResponder: (_, { dx, dy }) =>
      Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.8,
    onMoveShouldSetPanResponderCapture: (_, { dx, dy }) =>
      Math.abs(dx) > 20 && Math.abs(dx) > Math.abs(dy) * 2.5,
    onPanResponderGrant: () => {
      settling.current = false
      translateX.stopAnimation()
    },
    onPanResponderMove: (_, { dx }) => {
      const base    = -currentI.current * W
      const atStart = currentI.current === 0 && dx > 0
      const atEnd   = currentI.current === tabs.length - 1 && dx < 0
      // Resistencia elástica en extremos
      translateX.setValue(atStart || atEnd ? base + dx * 0.15 : base + dx)
    },
    onPanResponderRelease: (_, { dx, vx }) => {
      if (settling.current) return
      const i = currentI.current
      if ((dx < -SWIPE_DIST || vx < -SWIPE_VEL) && i < tabs.length - 1) {
        settling.current = true
        goTo(i + 1)
      } else if ((dx > SWIPE_DIST || vx > SWIPE_VEL) && i > 0) {
        settling.current = true
        goTo(i - 1)
      } else {
        Animated.spring(translateX, {
          toValue: -i * W,
          useNativeDriver: true,
          tension: 80,
          friction: 12,
        }).start()
      }
    },
    onPanResponderTerminate: () => {
      Animated.spring(translateX, {
        toValue: -currentI.current * W,
        useNativeDriver: true,
        tension: 120,
        friction: 16,
      }).start()
    },
  })).current

  return (
    <View style={styles.root}>
      {/* Área deslizable — fondo negro siempre */}
      <View style={styles.pagerArea} {...pan.panHandlers}>
        <Animated.View
          style={[styles.strip, { width: W * tabs.length, transform: [{ translateX }] }]}
        >
          {tabs.map((tab, i) => (
            <View key={tab.name} style={styles.page}>
              <tab.component />
            </View>
          ))}
        </Animated.View>
      </View>

      {/* Tab Bar flotante */}
      <View style={styles.tabBar} pointerEvents="box-none">
        {tabs.map((tab, i) => {
          const focused = index === i
          const color   = focused ? '#4488ff' : '#3a4a6a'
          return (
            <Pressable
              key={tab.name}
              onPress={() => {
                if (i !== currentI.current) {
                  goTo(i)
                  return
                }
                // Detectar doble tap con timer
                const now = Date.now()
                if (lastTap.current[i] && now - lastTap.current[i] < 300) {
                  lastTap.current[i] = 0
                  tab.onReselect?.()
                } else {
                  lastTap.current[i] = now
                }
              }}
              style={styles.tabItem}
            >
              <View style={[styles.pill, focused && styles.pillActive]}>
                <AntDesign name={tab.icon} size={20} color={color} />
                <Text numberOfLines={1} style={[styles.tabLabel, { color }]}>
                  {tab.name}
                </Text>
              </View>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  pagerArea: {
    flex: 1,
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
  strip: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#000000',
  },
  page: {
    width: W,
    flex: 1,
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
  tabBar: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#08091a',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#0f1a3a',
    elevation: 20,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    paddingHorizontal: 6,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  pill: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 22,
    gap: 2,
  },
  pillActive: {
    backgroundColor: 'rgba(68,136,255,0.15)',
    borderRadius: 22,
    overflow: 'hidden',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
})
