import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { ConversationSidebar } from './conversation-sidebar';

interface ResponsiveSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const SIDEBAR_WIDTH = 280;
const ANIMATION_DURATION = 250;

export function ResponsiveSidebar({ isOpen, onClose }: ResponsiveSidebarProps) {
  const translateX = useSharedValue(-SIDEBAR_WIDTH);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    translateX.value = withTiming(isOpen ? 0 : -SIDEBAR_WIDTH, {
      duration: ANIMATION_DURATION,
      easing: Easing.out(Easing.cubic),
    });
    backdropOpacity.value = withTiming(isOpen ? 0.5 : 0, {
      duration: ANIMATION_DURATION,
    });
  }, [isOpen, translateX, backdropOpacity]);

  const sidebarStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  // Don't render anything if closed and animation complete
  if (!isOpen && translateX.value === -SIDEBAR_WIDTH) {
    return null;
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={isOpen ? 'auto' : 'none'}>
      {/* Backdrop overlay */}
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Close sidebar"
        />
      </Animated.View>

      {/* Animated sidebar */}
      <Animated.View
        style={[styles.sidebar, sidebarStyle]}
      >
        <ConversationSidebar onClose={onClose} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 1)',
    zIndex: 40,
  },
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: '#ffffff',
    zIndex: 50,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
  },
});
