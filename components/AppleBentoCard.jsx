import { BlurView } from 'expo-blur'
import { StyleSheet, View } from 'react-native'

export default function AppleBentoCard({
  children,
  style,
  accentColor = '#4488ff',
}) {
  return (
    <View
      style={[
        styles.wrapper,
        { borderColor: accentColor + '26' },
        style,
      ]}
    >
      <BlurView intensity={8} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" />
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#08091a',
    borderRadius: 20,
    borderWidth: 0.5,
    overflow: 'hidden',
  },
})
