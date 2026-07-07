import { useState, useCallback, useRef, useMemo } from 'react'
import { View, Dimensions, StyleSheet, Pressable } from 'react-native'
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, withSpring, runOnJS,
} from 'react-native-reanimated'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { AntDesign } from '@expo/vector-icons'
import { hexToRgb } from '../lib/coachTheme'
import { modalCountSV } from '../lib/modalState'

const { width: W } = Dimensions.get('window')
const BAR_H = 56
const PILL_V = 6
const SWIPE_THRESHOLD = 50

export default function PagerTabs({ tabs, initialIndex = 0, accentColor = '#4488ff', switcherRef, pageBackground = 'transparent' }) {
  const [index, setIndex] = useState(initialIndex)
  const [visited, setVisited] = useState(() => new Set([initialIndex]))

  const tabWidth = (W - 48) / tabs.length
  const pillPad = 5
  const pillW = tabWidth - pillPad * 2
  const tabsLen = tabs.length

  // Shared values — UI thread
  const translateX    = useSharedValue(-initialIndex * W)
  const pillAnim      = useSharedValue(initialIndex)
  const currentIndex  = useSharedValue(initialIndex)
  const isAnimating   = useSharedValue(false)

  const stripStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }))

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pillAnim.value * tabWidth + pillPad }],
  }))

  const onAnimDone = useCallback((i) => {
    setVisited(prev => prev.has(i) ? prev : new Set([...prev, i]))
  }, [])

  const goTo = useCallback((i) => {
    if (i < 0 || i >= tabsLen) return
    currentIndex.value = i
    isAnimating.value = true
    setIndex(i)
    translateX.value = withTiming(-i * W, { duration: 220 }, (finished) => {
      if (finished) {
        isAnimating.value = false
        runOnJS(onAnimDone)(i)
      }
    })
    pillAnim.value = withSpring(i, { stiffness: 280, damping: 30 })
  }, [tabsLen, onAnimDone])

  if (switcherRef) switcherRef.current = goTo

  const panGesture = useMemo(() => Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-15, 15])
    .onUpdate((e) => {
      if (modalCountSV.value > 0 || isAnimating.value) return
      const cur = currentIndex.value
      const raw = -cur * W + e.translationX
      translateX.value = Math.max(-(tabsLen - 1) * W, Math.min(0, raw))
    })
    .onEnd((e) => {
      if (isAnimating.value) return
      const cur = currentIndex.value
      if (e.translationX < -SWIPE_THRESHOLD && cur < tabsLen - 1) {
        const next = cur + 1
        currentIndex.value = next
        isAnimating.value = true
        translateX.value = withTiming(-next * W, { duration: 180 }, (finished) => {
          if (finished) {
            isAnimating.value = false
            runOnJS(onAnimDone)(next)
          }
        })
        pillAnim.value = withSpring(next, { stiffness: 280, damping: 30 })
        runOnJS(setIndex)(next)
      } else if (e.translationX > SWIPE_THRESHOLD && cur > 0) {
        const next = cur - 1
        currentIndex.value = next
        isAnimating.value = true
        translateX.value = withTiming(-next * W, { duration: 180 }, (finished) => {
          if (finished) {
            isAnimating.value = false
            runOnJS(onAnimDone)(next)
          }
        })
        pillAnim.value = withSpring(next, { stiffness: 280, damping: 30 })
        runOnJS(setIndex)(next)
      } else {
        translateX.value = withTiming(-cur * W, { duration: 180 })
      }
    }), [tabsLen, onAnimDone])

  const rgb = hexToRgb(accentColor)

  const tabList = useMemo(() => tabs.map((tab, i) => (
    <View key={i} style={[styles.page, { backgroundColor: pageBackground }]}>
      {visited.has(i) && <tab.component />}
    </View>
  )), [tabs, pageBackground, visited])

  return (
    <View style={[styles.root, { backgroundColor: pageBackground }]}>
      <GestureDetector gesture={panGesture}>
        <View style={[styles.pagerArea, { overflow: 'hidden' }]}>
          <Animated.View style={[styles.strip, { width: W * tabsLen }, stripStyle]}>
            {tabList}
          </Animated.View>
        </View>
      </GestureDetector>

      <View style={styles.barOuter}>
        <View style={[styles.barBody, {
          backgroundColor: `rgba(${rgb}, 0.04)`,
          borderColor: `rgba(${rgb}, 0.12)`
        }]} />

        <Animated.View style={[styles.pillWrapper, { width: pillW }, pillStyle]}>
          <View style={[styles.pillBody, {
            backgroundColor: `rgba(${rgb}, 0.25)`,
            borderColor: `rgba(${rgb}, 0.40)`,
          }]} />
        </Animated.View>

        <View style={styles.tabRow}>
          {tabs.map((tab, i) => (
            <Pressable
              key={i}
              onPress={() => i === currentIndex.value ? tab.onReselect?.() : goTo(i)}
              style={[styles.tabItem, { width: tabWidth }]}
              android_ripple={null}
            >
              <AntDesign
                name={tab.icon}
                size={22}
                color={index === i ? accentColor : `rgba(${rgb}, 0.45)`}
              />
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  pagerArea: { flex: 1 },
  strip: { flex: 1, flexDirection: 'row' },
  page: { width: W, flex: 1 },

  barOuter: {
    position: 'absolute',
    bottom: 28,
    left: 24,
    right: 24,
    height: BAR_H,
  },

  barBody: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 34,
    borderWidth: 1,
  },

  pillWrapper: {
    position: 'absolute',
    top: PILL_V,
    bottom: PILL_V,
    zIndex: 5,
  },

  pillBody: {
    flex: 1,
    borderRadius: 26,
    borderWidth: 1,
  },

  tabRow: {
    flexDirection: 'row',
    height: BAR_H,
    zIndex: 10,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
})
