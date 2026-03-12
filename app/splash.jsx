import { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Animated } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

function RFLogo({ size = 80 }) {
  return (
    <View style={[styles.logoOuter, { width: size, height: size, borderRadius: size * 0.28 }]}>
      <LinearGradient
        colors={['#1a1a2e', '#0f0f23']}
        style={[styles.logoInner, { width: size, height: size, borderRadius: size * 0.28 }]}
      >
        <Text style={[styles.logoR, { fontSize: size * 0.38 }]}>R</Text>
        <Text style={[styles.logoF, { fontSize: size * 0.38 }]}>F</Text>
      </LinearGradient>
    </View>
  )
}

export default function Splash() {
  const fadeAnim = useRef(new Animated.Value(0)).current
  const scaleAnim = useRef(new Animated.Value(0.5)).current
  const taglineAnim = useRef(new Animated.Value(0)).current
  const glowAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(taglineAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    ]).start()
  }, [])

  return (
    <LinearGradient colors={['#000000', '#050510', '#0a0a1f']} style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <RFLogo size={100} />
        <View style={styles.titleRow}>
          <Text style={styles.titleRep}>REP</Text>
          <Text style={styles.titleForge}>FORGE</Text>
        </View>
      </Animated.View>
      <Animated.Text style={[styles.tagline, { opacity: taglineAnim }]}>
        BUILD MUSCLE INTELLIGENTLY
      </Animated.Text>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { alignItems: 'center' },
  logoOuter: {
    borderWidth: 1.5, borderColor: '#2a2a5a',
    marginBottom: 24,
    shadowColor: '#4466ff', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1, shadowRadius: 30, elevation: 30,
  },
  logoInner: { justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 2 },
  logoR: { fontWeight: '900', color: '#ffffff', letterSpacing: -2 },
  logoF: { fontWeight: '900', color: '#4488ff', letterSpacing: -2 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  titleRep: {
    fontSize: 38, fontWeight: '900', color: '#ffffff',
    letterSpacing: 4,
    textShadowColor: 'rgba(255,255,255,0.3)',
    textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10,
  },
  titleForge: {
    fontSize: 38, fontWeight: '900', letterSpacing: 4,
    color: '#4488ff',
    textShadowColor: 'rgba(68,136,255,0.6)',
    textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 16,
  },
  tagline: {
    position: 'absolute', bottom: 70,
    fontSize: 11, color: '#3355aa',
    letterSpacing: 4,
  },
})