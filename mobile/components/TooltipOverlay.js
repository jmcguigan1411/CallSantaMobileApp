import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  Animated
} from 'react-native';
import { useTooltips } from '../context/TooltipContext';

const { width, height } = Dimensions.get('window');

export default function TooltipOverlay({ step, title, message, position = 'center' }) {
  const { shouldShowTooltip, completeStep } = useTooltips();
  const [fadeAnim] = useState(new Animated.Value(0));
  const visible = shouldShowTooltip(step);

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleDismiss = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      completeStep(step);
    });
  };

  if (!visible) return null;

  const getPositionStyle = () => {
    switch (position) {
      case 'top':
        return { top: 100, alignSelf: 'center' };
      case 'bottom':
        return { bottom: 100, alignSelf: 'center' };
      case 'center':
      default:
        return { top: height / 2 - 150, alignSelf: 'center' };
    }
  };

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={handleDismiss}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={handleDismiss}>
        <Animated.View style={[styles.tooltipContainer, getPositionStyle(), { opacity: fadeAnim }]}>
          <View style={styles.tooltip}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>
            <TouchableOpacity style={styles.button} onPress={handleDismiss}>
              <Text style={styles.buttonText}>Got it!</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tooltipContainer: {
    width: width * 0.85,
    maxWidth: 400,
  },
  tooltip: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a472a',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#c41e3a',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});