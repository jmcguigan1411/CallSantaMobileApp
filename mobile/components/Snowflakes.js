// components/Snowflakes.js
import React, { useEffect, useRef } from 'react';
import { Animated, Text, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export default function Snowflakes() {
  const flakes = Array.from({ length: 20 }).map(() => ({
    x: Math.random() * width,
    size: Math.random() * 20 + 10,
    duration: Math.random() * 5000 + 5000,
  }));

  return (
    <>
      {flakes.map((flake, i) => (
        <FallingSnowflake key={i} {...flake} />
      ))}
    </>
  );
}

function FallingSnowflake({ x, size, duration }) {
  const translateY = useRef(new Animated.Value(-50)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: height + 50,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -50,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [translateY, duration]);

  return (
    <Animated.Text
      style={{
        position: 'absolute',
        left: x,
        transform: [{ translateY }],
        fontSize: size,
        color: 'white',
      }}
    >
      ❄
    </Animated.Text>
  );
}
