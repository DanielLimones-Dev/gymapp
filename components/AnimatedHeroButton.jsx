import React, { useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { StyleSheet, View, Dimensions, Modal, TouchableOpacity, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
  Easing
} from 'react-native-reanimated';

const { width: SW, height: SH } = Dimensions.get('screen');

const SPRING_CONFIG_SUAVE = {
  damping: 18,
  stiffness: 300,
  mass: 0.6,
  overshootClamping: false,
};

const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);

export const AnimatedHeroButton = forwardRef(({
  children,
  onOpen,
  renderContent,
  gradientColors,
}, ref) => {
  const FALLBACK = ['#0a0a2e', '#050518', '#0d0d25']
  const buttonRef = useRef(null);
  const [visible, setVisible] = useState(false);
  
  const layoutX = useSharedValue(0);
  const layoutY = useSharedValue(0);
  const layoutW = useSharedValue(40);
  const layoutH = useSharedValue(40);
  const progress = useSharedValue(0);

  // FIX DEFINITIVO PARA EL TAP:
  // Usamos Timing para el cierre para garantizar la destrucción inmediata del Modal
  const close = useCallback(() => {
    progress.value = withTiming(0, { 
      duration: 250, 
      easing: Easing.bezier(0.33, 1, 0.68, 1) 
    }, (finished) => {
      if (finished) {
        runOnJS(setVisible)(false);
      }
    });
  }, []);

  useImperativeHandle(ref, () => ({ close }), [close]);

  const open = useCallback(() => {
    if (visible) return;
    buttonRef.current?.measureInWindow((x, y, w, h) => {
      if (!w || !h) { x = SW - 60; y = 60; w = 40; h = 40; }
      const isAndroid = Platform.OS === 'android';
      
      layoutX.value = x;
      layoutY.value = isAndroid ? y + 24 : y;
      layoutW.value = w;
      layoutH.value = h;
      
      if (onOpen) onOpen();
      setVisible(true);

      requestAnimationFrame(() => {
        progress.value = withSpring(1, SPRING_CONFIG_SUAVE);
      });
    });
  }, [onOpen, visible]);

  const containerStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      position: 'absolute',
      overflow: 'hidden',
      left:   interpolate(p, [0, 1], [layoutX.value, 0]),
      top:    interpolate(p, [0, 1], [layoutY.value, 0]),
      width:  interpolate(p, [0, 1], [layoutW.value, SW]),
      height: interpolate(p, [0, 1], [layoutH.value, SH + 100]),
      borderRadius: interpolate(p, [0, 0.5, 1], [layoutW.value / 2, 32, 0], Extrapolation.CLAMP),
      opacity: interpolate(p, [0, 0.05], [0, 1], Extrapolation.CLAMP)
    };
  });

  const contentStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const opacity = interpolate(p, [0.3, 0.7], [0, 1], Extrapolation.CLAMP);
    const scale = interpolate(p, [0, 1], [0.95, 1], Extrapolation.CLAMP);

    return {
      width: SW,
      height: SH,
      opacity,
      transform: [
        { translateX: interpolate(p, [0, 1], [-layoutX.value, 0]) },
        { translateY: interpolate(p, [0, 1], [-layoutY.value, 0]) },
        { scale }
      ],
    };
  });

  return (
    <>
      <TouchableOpacity activeOpacity={0.7} onPress={open}>
        <View ref={buttonRef} collapsable={false}>
          {children}
        </View>
      </TouchableOpacity>

      <Modal transparent visible={visible} animationType="none" statusBarTranslucent onRequestClose={close}>
        {/* FIX: pointerEvents='none' cuando el progreso es bajo libera los toques al instante */}
        <Animated.View 
          style={[StyleSheet.absoluteFill, useAnimatedStyle(() => ({
            pointerEvents: progress.value < 0.15 ? 'none' : 'auto'
          }))]}
        >
          <AnimatedGradient
            colors={gradientColors || FALLBACK}
            style={containerStyle}
            renderToHardwareTextureAndroid={true}
            shouldRasterizeLayer={true}
          >
            <Animated.View style={contentStyle}>
              {renderContent ? renderContent(close) : null}
            </Animated.View>
          </AnimatedGradient>
        </Animated.View>
      </Modal>
    </>
  );
});

