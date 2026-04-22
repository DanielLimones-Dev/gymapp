// Handle táctil invisible que cierra el bottom sheet al deslizar hacia abajo
import { useRef, useEffect } from 'react'
import { View, PanResponder, StyleSheet } from 'react-native'

export default function SwipeHandle({ onClose }) {
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, { dy }) => dy > 5,
    onPanResponderRelease: (_, { dy, vy }) => {
      if (dy > 50 || vy > 0.5) onCloseRef.current()
    },
  })).current

  return (
    <View style={styles.zone} {...pan.panHandlers}>
      <View style={styles.pill} />
    </View>
  )
}

const styles = StyleSheet.create({
  zone: { width: '100%', paddingTop: 12, paddingBottom: 8, alignItems: 'center' },
  pill: { width: 40, height: 4, backgroundColor: '#1a2a5a', borderRadius: 2 },
})
