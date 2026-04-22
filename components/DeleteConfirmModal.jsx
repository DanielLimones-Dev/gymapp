import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import ManagedModal from './ManagedModal';

export default function DeleteConfirmModal({ visible, onCancel, onConfirm, title, subtitle, warning }) {
  return (
    <ManagedModal visible={visible} transparent animationType="fade">
      <Pressable style={styles.overlay} onPress={onCancel}>
        <View style={styles.alertBox} onStartShouldSetResponder={() => true}>
          <View style={styles.content}>
            <Text style={styles.title}>{title || '¿Eliminar?'}</Text>
            {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            {!!warning && <Text style={styles.warning}>{warning}</Text>}
          </View>
          
          <View style={styles.separator} />
          
          <View style={styles.buttonRow}>
            <Pressable
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
              onPress={onCancel}
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>
            
            <View style={styles.verticalSeparator} />
            
            <Pressable
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
              onPress={onConfirm}
            >
              <Text style={styles.deleteText}>Eliminar</Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </ManagedModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 2, 15, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertBox: {
    width: 290,
    backgroundColor: 'rgba(10, 15, 35, 0.95)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(68, 136, 255, 0.2)',
    overflow: 'hidden',
  },
  content: {
    paddingTop: 24,
    paddingBottom: 22,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#aaccff',
    textAlign: 'center',
    lineHeight: 18,
  },
  warning: {
    fontSize: 12,
    fontWeight: '500',
    color: '#ff3355',
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.9,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(68, 136, 255, 0.15)',
  },
  verticalSeparator: {
    width: 1,
    backgroundColor: 'rgba(68, 136, 255, 0.15)',
  },
  buttonRow: {
    flexDirection: 'row',
    height: 52,
  },
  button: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonPressed: {
    backgroundColor: 'rgba(68, 136, 255, 0.1)',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4488ff',
  },
  deleteText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ff3355',
  },
});
