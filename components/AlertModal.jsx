import { forwardRef, useImperativeHandle, useState } from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import ManagedModal from './ManagedModal'

const AlertModal = forwardRef((_props, ref) => {
  const [config, setConfig] = useState(null)

  useImperativeHandle(ref, () => ({
    show: (cfg) => setConfig(cfg),
  }))

  if (!config) return null

  const { title, message, buttons = [{ text: 'OK' }] } = config

  function pressBtn(btn) {
    setConfig(null)
    btn.onPress?.()
  }

  function pressOverlay() {
    const cancel = buttons.find(b => b.style === 'cancel')
    if (cancel) { setConfig(null); cancel.onPress?.() }
    else if (buttons.length === 1) pressBtn(buttons[0])
  }

  return (
    <ManagedModal visible={!!config} transparent animationType="fade">
      <Pressable style={styles.overlay} onPress={pressOverlay}>
        <View style={styles.box} onStartShouldSetResponder={() => true}>

          <View style={styles.content}>
            <Text style={styles.title}>{title}</Text>
            {!!message && <Text style={styles.message}>{message}</Text>}
          </View>

          <View style={styles.separator} />

          <View style={styles.btnRow}>
            {buttons.map((btn, i) => (
              <View key={i} style={{ flex: 1, flexDirection: 'row' }}>
                {i > 0 && <View style={styles.vSeparator} />}
                <Pressable
                  style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
                  onPress={() => pressBtn(btn)}
                >
                  <Text style={[
                    styles.btnText,
                    btn.style === 'destructive' ? styles.destructive
                    : btn.style === 'cancel'    ? styles.cancel
                    : styles.primary,
                  ]}>
                    {btn.text}
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>

        </View>
      </Pressable>
    </ManagedModal>
  )
})

export default AlertModal

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,2,15,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  box: {
    width: 290,
    backgroundColor: 'rgba(10,15,35,0.97)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(68,136,255,0.2)',
    overflow: 'hidden',
  },
  content: {
    paddingTop: 24, paddingBottom: 20, paddingHorizontal: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 17, fontWeight: '800', color: '#fff',
    textAlign: 'center', marginBottom: 8, letterSpacing: -0.2,
  },
  message: {
    fontSize: 13, fontWeight: '500', color: '#aaccff',
    textAlign: 'center', lineHeight: 18,
  },
  separator: {
    height: 1, backgroundColor: 'rgba(68,136,255,0.15)',
  },
  vSeparator: {
    width: 1, backgroundColor: 'rgba(68,136,255,0.15)',
  },
  btnRow: {
    flexDirection: 'row', height: 52,
  },
  btn: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
  },
  btnPressed: {
    backgroundColor: 'rgba(68,136,255,0.1)',
  },
  btnText: {
    fontSize: 16, fontWeight: '700',
  },
  primary: { color: '#4488ff' },
  cancel:  { color: '#4488ff', fontWeight: '600' },
  destructive: { color: '#ff3355', fontWeight: '800' },
})
