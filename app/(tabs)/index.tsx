import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Animated, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

export default function HomeScreen() {
  const router = useRouter();
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.Text style={[styles.title, { opacity: fadeAnim }]}>
        🎙️ Transcription App
      </Animated.Text>

      <Text style={styles.subtitle}>Record, Play, and Transcribe with Ease</Text>

      <TouchableOpacity style={styles.startButton} onPress={() => router.push("/explore")}>
        <Text style={styles.startButtonText}>Start Recording</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1E1E1E", // Dark theme
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FF3B30",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#BBBBBB",
    marginBottom: 40,
  },
  startButton: {
    backgroundColor: "#FF3B30",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    elevation: 10, // Android shadow
    shadowColor: "#FF3B30",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  startButtonText: {
    fontSize: 18,
    color: "#ffffff",
    fontWeight: "bold",
  },
});
