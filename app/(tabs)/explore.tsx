import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Animated, Easing, StyleSheet } from "react-native";
import { Audio } from "expo-av";

const ExploreScreen = () => {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [recordTime, setRecordTime] = useState(0);
  const pulseAnim = useState(new Animated.Value(1))[0]; // Pulsating effect
  const opacityAnim = useState(new Animated.Value(0.6))[0]; // Fade effect

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null; // Properly initialized timer variable

    if (recording) {
      timer = setInterval(() => {
        setRecordTime((prevTime) => prevTime + 1);
      }, 1000);
      startPulseAnimation();
    } else {
      if (timer) clearInterval(timer);
      pulseAnim.setValue(1);
      opacityAnim.setValue(0.6);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [recording]);

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.5,
            duration: 800,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(opacityAnim, {
            toValue: 0.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0.6,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        alert("Permission to access microphone is required!");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);
      setRecordTime(0); // Reset timer on new recording
    } catch (err) {
      console.error("Failed to start recording", err);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setAudioUri(uri);
    setRecording(null);
  };

  const playRecording = async () => {
    if (!audioUri) return;

    const { sound } = await Audio.Sound.createAsync({ uri: audioUri });
    setSound(sound);
    await sound.playAsync();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎙️ Voice Recorder</Text>

      {/* Pulsating Background */}
      <View style={styles.recordContainer}>
        <Animated.View
          style={[
            styles.pulseEffect,
            recording && {
              transform: [{ scale: pulseAnim }],
              opacity: opacityAnim,
            },
          ]}
        />
        {/* Floating Record Button with Timer */}
        <TouchableOpacity
          style={[styles.recordButton, recording && styles.recording]}
          onPress={recording ? stopRecording : startRecording}
        >
          <Text style={styles.timerText}>{recording ? formatTime(recordTime) : "Start"}</Text>
        </TouchableOpacity>
      </View>

      {/* Play Recording Button */}
      {audioUri && (
        <TouchableOpacity style={styles.playButton} onPress={playRecording}>
          <Text style={styles.playText}>▶️ Play Recording</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1E1E1E", // Dark background
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 50,
  },
  recordContainer: {
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  pulseEffect: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255, 0, 0, 0.4)", // Soft red glow
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FF3B30",
    justifyContent: "center",
    alignItems: "center",
    elevation: 10, // Android shadow
    shadowColor: "#FF3B30",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
  },
  recording: {
    backgroundColor: "#FF6B6B",
  },
  playButton: {
    backgroundColor: "#457B9D",
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 10,
    marginTop: 30,
  },
  playText: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "bold",
  },
  timerText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "bold",
  },
});

export default ExploreScreen;
