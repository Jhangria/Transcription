import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Easing,
  StyleSheet,
  FlatList,
  ScrollView,
} from "react-native";
import { Audio } from "expo-av";
import { RNS3 } from "react-native-aws3";
import AWS from "aws-sdk";
import { AWS_CONFIG } from "../../aws-config";

const ExploreScreen = () => {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordings, setRecordings] = useState<string[]>([]);
  const [transcriptions, setTranscriptions] = useState<string[]>([]);
  const [recordTime, setRecordTime] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const pulseAnim = useState(new Animated.Value(1))[0];
  const opacityAnim = useState(new Animated.Value(0.6))[0];

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

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
      setRecordTime(0);
    } catch (err) {
      console.error("Failed to start recording", err);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();

    if (uri) {
      setRecordings((prev) => [uri, ...prev]);

      const file = {
        uri,
        name: `recording-${new Date().toISOString()}.mp4`,
        type: "audio/mp4",
      };

      const options = {
        keyPrefix: "recordings/",
        bucket: "my-transcription-app", // exactly this name
        region: "us-east-2",             // your S3 region
        accessKey: "YOUR_ACCESS_KEY",
        secretKey: "YOUR_SECRET_KEY",
        successActionStatus: 201,
        awsUrl: "https://s3.us-east-2.amazonaws.com",
        };

      RNS3.put(file, options)
        .then((response: any) => {
          if (response.status === 201) {
            console.log("Upload success", response.body);
            startTranscription(response.body.postResponse.location);
          } else {
            console.error("Upload failed", response);
          }
        })
        .catch((error: any) => console.error("Upload error:", error));
    }

    setRecording(null);
  };

  const startTranscription = async (audioUrl: string) => {
    setIsTranscribing(true);

    AWS.config.update({
      accessKeyId: AWS_CONFIG.accessKeyId,
      secretAccessKey: AWS_CONFIG.secretAccessKey,
      region: AWS_CONFIG.region,
    });

    const transcribeService = new AWS.TranscribeService();
    const jobName = `Transcription-${Date.now()}`;

    const params: AWS.TranscribeService.StartTranscriptionJobRequest = {
      TranscriptionJobName: jobName,
      Media: { MediaFileUri: audioUrl },
      MediaFormat: "mp4",
      LanguageCode: "en-US",
    };

    try {
      await transcribeService.startTranscriptionJob(params).promise();
      console.log("Transcription started...");
      checkTranscriptionStatus(jobName);
    } catch (error) {
      console.error("Error starting transcription:", error);
      setIsTranscribing(false);
    }
  };

  const checkTranscriptionStatus = async (jobName: string) => {
    const transcribeService = new AWS.TranscribeService();

    try {
      const response = await transcribeService
        .getTranscriptionJob({ TranscriptionJobName: jobName })
        .promise();

      const transcriptFileUri =
        response.TranscriptionJob?.Transcript?.TranscriptFileUri;

      if (
        response.TranscriptionJob &&
        response.TranscriptionJob.TranscriptionJobStatus === "COMPLETED" &&
        transcriptFileUri
      ) {
        console.log("Transcription complete:", transcriptFileUri);
        downloadTranscription(transcriptFileUri);
      } else if (
        response.TranscriptionJob?.TranscriptionJobStatus === "FAILED"
      ) {
        console.error("Transcription failed.");
        setIsTranscribing(false);
      } else {
        console.log("Still processing...");
        setTimeout(() => checkTranscriptionStatus(jobName), 4000);
      }
    } catch (error) {
      console.error("Error checking transcription:", error);
      setIsTranscribing(false);
    }
  };

  const downloadTranscription = async (transcriptUrl: string) => {
    try {
      const response = await fetch(transcriptUrl);
      const data = await response.json();
      const transcriptionText = data.results.transcripts[0]?.transcript;
      if (transcriptionText) {
        setTranscriptions((prev) => [transcriptionText, ...prev]);
      }
    } catch (error) {
      console.error("Error downloading transcript:", error);
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>🎙️ Voice Recorder</Text>

      <TouchableOpacity
        onPress={recording ? stopRecording : startRecording}
        style={[
          styles.recordButton,
          { backgroundColor: recording ? "#FF3B30" : "#4CAF50" },
        ]}
      >
        <Text style={styles.recordText}>
          {recording ? "Stop Recording" : "Start Recording"}
        </Text>
      </TouchableOpacity>

      {recording && (
        <Text style={styles.timer}>Recording: {recordTime}s</Text>
      )}

      {isTranscribing && (
        <Text style={styles.transcribing}>Transcribing your audio...</Text>
      )}

      {transcriptions.length > 0 && (
        <>
          <Text style={styles.subtitle}>📝 Transcriptions</Text>
          <FlatList
            data={transcriptions}
            renderItem={({ item }) => (
              <View style={styles.transcriptionBox}>
                <Text style={styles.transcriptionText}>{item}</Text>
              </View>
            )}
            keyExtractor={(item, index) => index.toString()}
          />
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 80,
    paddingBottom: 50,
    paddingHorizontal: 20,
    backgroundColor: "#121212",
    flexGrow: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#FF3B30",
    textAlign: "center",
    marginBottom: 30,
  },
  subtitle: {
    fontSize: 20,
    color: "#ffffff",
    marginVertical: 10,
    fontWeight: "600",
  },
  recordButton: {
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 10,
    alignSelf: "center",
  },
  recordText: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "bold",
  },
  timer: {
    color: "#ffffff",
    textAlign: "center",
    fontSize: 16,
    marginTop: 10,
  },
  transcribing: {
    fontStyle: "italic",
    color: "#aaa",
    textAlign: "center",
    marginVertical: 20,
  },
  transcriptionBox: {
    backgroundColor: "#1e1e1e",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  transcriptionText: {
    color: "#fff",
    fontSize: 16,
  },
});

export default ExploreScreen;
