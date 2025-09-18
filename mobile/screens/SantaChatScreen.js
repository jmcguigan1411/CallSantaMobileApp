import React, { useState, useEffect, useRef, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Platform,
} from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { AuthContext } from '../context/AuthContext';
import { chatWithSantaAudio } from '../services/aiService';

export default function SantaCallScreen({ route, navigation }) {
  const child = route?.params?.child;
  const { token } = useContext(AuthContext);

  // ADD TOKEN DEBUG LOGGING
  console.log('[Santa Call] Auth Context Debug:', {
    hasToken: !!token,
    tokenLength: token?.length,
    tokenPreview: token ? token.substring(0, 20) + '...' : 'NO_TOKEN'
  });

  const [callStatus, setCallStatus] = useState('Calling...');
  const [callDuration, setCallDuration] = useState(0);
  const [santaSpeaking, setSantaSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [devLogs, setDevLogs] = useState([]);

  const recordingRef = useRef(null);
  const soundRef = useRef(null);
  const timerId = useRef(null);
  const silenceTimerRef = useRef(null);
  const recordingStartTime = useRef(null);
  const meteringRef = useRef(null);
  const voiceActivityRef = useRef(false);

  // Constants
  const SILENCE_DURATION = 3000; // 3 seconds of silence
  const MIN_RECORDING_TIME = 1000; // Minimum 1 second recording
  const VOICE_THRESHOLD = -30; // dB threshold for voice activity
  const METERING_INTERVAL = 200; // Check audio levels every 200ms

  // Custom recording options optimized for speech
  const recordingOptions = {
    android: {
      extension: '.m4a',
      outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
      audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
      sampleRate: 16000,
      numberOfChannels: 1,
      bitRate: 64000,
    },
    ios: {
      extension: '.m4a',
      audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_MEDIUM,
      sampleRate: 16000,
      numberOfChannels: 1,
      bitRate: 64000,
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
    },
  };

  // Utility: add dev log
  const addLog = (msg) => {
    if (__DEV__) {
      const timestamp = new Date().toLocaleTimeString();
      console.log(msg);
      setDevLogs((prev) => [...prev.slice(-15), `[${timestamp}] ${msg}`]);
    }
  };

  // --- Initialize call sequence ---
  useEffect(() => {
    // Log token availability when component mounts
    addLog(`🔑 Token check: ${token ? 'Available' : 'MISSING'}`);
    if (!token) {
      addLog('❌ NO TOKEN - User may need to log in again');
    }

    const ringTimeout = setTimeout(async () => {
      await initializeCall();
    }, 3000);

    return () => {
      clearTimeout(ringTimeout);
      cleanup();
    };
  }, []);

  // --- Initialize call ---
  const initializeCall = async () => {
    try {
      setCallStatus('In Call');
      addLog('📞 Call connected!');

      // Check and request permissions
      const permissionResponse = await Audio.requestPermissionsAsync();
      if (permissionResponse.status !== 'granted') {
        addLog('❌ Microphone permission denied');
        alert('Microphone permission is required for Santa calls!');
        return;
      }

      addLog('✅ Microphone permission granted');

      // Setup audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });

      addLog('🎵 Audio mode configured');

      // Start call timer
      timerId.current = setInterval(() => setCallDuration((prev) => prev + 1), 1000);

      // Play Santa greeting first
      await santaGreeting();
    } catch (error) {
      console.error('Initialize call error:', error);
      addLog(`❌ Init error: ${error.message}`);
      alert(`Call setup failed: ${error.message}`);
    }
  };

  // --- Santa greeting with phonetic name ---
  const santaGreeting = async () => {
    try {
      setSantaSpeaking(true);
      addLog('🎅 Preparing Santa greeting...');
      
      // Enhanced debugging
      addLog(`🔍 Route params: ${JSON.stringify(route?.params)}`);
      addLog(`🔍 Child object: ${JSON.stringify(child)}`);
      addLog(`🔑 Token status: ${token ? 'Present' : 'MISSING'}`);
      
      // Check for missing token before making request
      if (!token) {
        throw new Error('Authentication token missing - please log out and log back in');
      }
      
      // Validate child data step by step
      if (!child) {
        throw new Error('No child data in route params');
      }
      
      if (!child._id) {
        addLog(`❌ Child has no _id field. Child keys: ${Object.keys(child)}`);
        throw new Error(`Child object missing _id. Available fields: ${Object.keys(child).join(', ')}`);
      }
      
      const childId = child._id;
      const displayName = child.name || 'friend';
      const spokenName = (child.phoneticSpelling && child.phoneticSpelling.trim()) || child.name || 'friend';
      
      addLog(`✅ Child ID: ${childId}`);
      addLog(`📝 Display name: "${displayName}"`);
      addLog(`🗣️ Using phonetic: "${spokenName}"`);
      
      const greeting = `Ho ho ho! Hello ${spokenName}! This is Santa calling from the North Pole. What would you like for Christmas this year?`;
      
      // Send greeting with validated child ID and token
      const response = await chatWithSantaAudio(
        childId,
        null,
        token, // Pass the token
        { 
          isGreeting: true, 
          greetingText: greeting,
          childName: spokenName
        }
      );

      if (response?.audioBase64) {
        addLog('🔊 Playing Santa greeting...');
        await playAudioFromBase64(response.audioBase64);
      } else {
        addLog('❌ No greeting audio received');
        setTimeout(() => startListening(), 2000);
      }

    } catch (error) {
      console.error('Greeting error:', error);
      addLog(`❌ Greeting error: ${error.message}`);
      
      // Special handling for auth errors
      if (error.message.includes('token') || error.message.includes('401')) {
        addLog('🔐 Authentication issue - please log out and back in');
        alert('Session expired. Please log out and log back in.');
      }
      
      setTimeout(() => startListening(), 3000);
    }
  };

  // --- Start continuous recording with voice activity detection ---
  const startListening = async () => {
    try {
      // Double-check permissions before starting
      const { status } = await Audio.getPermissionsAsync();
      if (status !== 'granted') {
        addLog('❌ No microphone permission');
        return;
      }

      setListening(true);
      setSantaSpeaking(false);
      addLog('🎤 Starting to listen...');

      // Create recording with optimized settings
      const { recording } = await Audio.Recording.createAsync(recordingOptions);
      recordingRef.current = recording;
      recordingStartTime.current = Date.now();
      voiceActivityRef.current = false;

      addLog('📊 Recording started successfully');

      // Enable metering for voice activity detection
      await recording.startAsync();
      
      // Start voice activity detection
      startVoiceActivityDetection();
      
    } catch (error) {
      console.error('Start listening error:', error);
      addLog(`❌ Listen error: ${error.message}`);
      setListening(false);
      
      // Retry after delay
      setTimeout(() => {
        addLog('🔄 Retrying to start listening...');
        startListening();
      }, 2000);
    }
  };

  // --- Voice activity detection with metering ---
  const startVoiceActivityDetection = () => {
    let lastVoiceTime = Date.now();
    let hasDetectedVoice = false;

    meteringRef.current = setInterval(async () => {
      if (!recordingRef.current || !listening) {
        return;
      }

      try {
        // Get recording status with metering
        const status = await recordingRef.current.getStatusAsync();
        
        if (status.isRecording) {
          const currentTime = Date.now();
          
          // Check if we have metering data
          if (status.metering !== undefined) {
            const audioLevel = status.metering;
            
            // Voice detected if audio level is above threshold
            if (audioLevel > VOICE_THRESHOLD) {
              if (!hasDetectedVoice) {
                addLog('🗣️ Voice detected!');
                hasDetectedVoice = true;
              }
              lastVoiceTime = currentTime;
              voiceActivityRef.current = true;
            }
          } else {
            // Fallback: assume voice activity if recording is working
            if (!hasDetectedVoice && currentTime - recordingStartTime.current > 1000) {
              addLog('🔊 Audio recording active (no metering)');
              hasDetectedVoice = true;
              lastVoiceTime = currentTime;
              voiceActivityRef.current = true;
            }
          }

          // Check for silence after voice was detected
          const silenceDuration = currentTime - lastVoiceTime;
          const totalDuration = currentTime - recordingStartTime.current;

          if (hasDetectedVoice && silenceDuration >= SILENCE_DURATION && totalDuration >= MIN_RECORDING_TIME) {
            addLog(`🔇 Silence detected (${Math.round(silenceDuration/1000)}s)`);
            clearInterval(meteringRef.current);
            await processUserSpeech();
          }

          // Timeout after 30 seconds of no processing
          if (totalDuration > 30000) {
            addLog('⏰ Recording timeout (30s)');
            if (hasDetectedVoice) {
              clearInterval(meteringRef.current);
              await processUserSpeech();
            } else {
              clearInterval(meteringRef.current);
              await stopListening();
              setTimeout(() => startListening(), 1000);
            }
          }
        }
      } catch (error) {
        console.error('Metering error:', error);
        addLog(`❌ Metering error: ${error.message}`);
      }
    }, METERING_INTERVAL);

    addLog(`⏱️ Voice detection started (${SILENCE_DURATION/1000}s silence threshold)`);
  };

  // --- Stop listening ---
  const stopListening = async () => {
    setListening(false);
    
    if (meteringRef.current) {
      clearInterval(meteringRef.current);
      meteringRef.current = null;
    }

    if (recordingRef.current) {
      try {
        const status = await recordingRef.current.getStatusAsync();
        if (status.isRecording) {
          await recordingRef.current.stopAndUnloadAsync();
        }
      } catch (error) {
        console.error('Stop recording error:', error);
      }
    }
  };

  // --- Process user speech ---
  const processUserSpeech = async () => {
    if (!recordingRef.current) return;

    try {
      await stopListening();
      addLog('📦 Processing user speech...');

      // Check token before processing
      if (!token) {
        addLog('❌ No token available for processing speech');
        throw new Error('Authentication token missing');
      }

      // Stop and get recording
      const status = await recordingRef.current.getStatusAsync();
      if (status.isRecording) {
        await recordingRef.current.stopAndUnloadAsync();
      }
      
      const audioUri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!audioUri) {
        addLog('❌ No audio URI generated');
        setTimeout(() => startListening(), 2000);
        return;
      }

      // Verify file exists and has content
      const fileInfo = await FileSystem.getInfoAsync(audioUri);
      if (!fileInfo.exists || fileInfo.size < 1000) {
        addLog(`❌ Audio file too small or missing (${fileInfo.size} bytes)`);
        setTimeout(() => startListening(), 2000);
        return;
      }

      const recordingDuration = Date.now() - recordingStartTime.current;
      addLog(`📁 Audio file ready (${Math.round(recordingDuration/1000)}s, ${Math.round(fileInfo.size/1024)}KB)`);
      addLog('🤖 Sending to ChatGPT...');

      // Send to backend: audio -> Whisper -> ChatGPT -> ElevenLabs
      const response = await chatWithSantaAudio(child?._id, audioUri, token);
      
      if (response?.text) {
        addLog(`💭 ChatGPT: "${response.text.substring(0, 50)}${response.text.length > 50 ? '...' : ''}"`);
      }
      
      if (response?.audioBase64) {
        addLog('🎵 ElevenLabs audio received');
        await playAudioFromBase64(response.audioBase64);
      } else {
        addLog('❌ No audio response received');
        setTimeout(() => startListening(), 2000);
      }

    } catch (error) {
      console.error('Process speech error:', error);
      addLog(`❌ Process error: ${error.message}`);
      
      // Handle auth errors specifically
      if (error.message.includes('token') || error.message.includes('401')) {
        addLog('🔐 Token issue during speech processing');
      }
      
      setTimeout(() => startListening(), 3000);
    }
  };

  // --- Play audio from base64 ---
  const playAudioFromBase64 = async (audioBase64) => {
    try {
      setSantaSpeaking(true);
      addLog('▶️ Playing Santa response...');
      
      // Create temporary file for better compatibility
      const tempUri = `${FileSystem.documentDirectory}temp_santa_audio.mp3`;
      await FileSystem.writeAsStringAsync(tempUri, audioBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      const { sound } = await Audio.Sound.createAsync(
        { uri: tempUri },
        { shouldPlay: true, volume: 1.0 }
      );
      
      soundRef.current = sound;

      sound.setOnPlaybackStatusUpdate(async (status) => {
        if (status.didJustFinish) {
          addLog('✅ Santa finished speaking');
          setSantaSpeaking(false);
          
          try {
            await sound.unloadAsync();
            await FileSystem.deleteAsync(tempUri, { idempotent: true });
          } catch (cleanupError) {
            console.error('Audio cleanup error:', cleanupError);
          }
          
          soundRef.current = null;
          
          // After Santa finishes, start listening again
          setTimeout(() => {
            if (callStatus === 'In Call') {
              startListening();
            }
          }, 800);
        }

        if (status.error) {
          addLog(`❌ Audio playback error: ${status.error}`);
          setSantaSpeaking(false);
          setTimeout(() => startListening(), 1000);
        }
      });

    } catch (error) {
      console.error('Play audio error:', error);
      addLog(`❌ Audio playback error: ${error.message}`);
      setSantaSpeaking(false);
      setTimeout(() => startListening(), 2000);
    }
  };

  // --- Cleanup function ---
  const cleanup = async () => {
    addLog('🧹 Cleaning up...');
    
    if (timerId.current) {
      clearInterval(timerId.current);
      timerId.current = null;
    }

    if (meteringRef.current) {
      clearInterval(meteringRef.current);
      meteringRef.current = null;
    }

    await stopListening();

    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch (error) {
        console.error('Cleanup sound error:', error);
      }
      soundRef.current = null;
    }

    // Clean up temp files
    try {
      const tempUri = `${FileSystem.documentDirectory}temp_santa_audio.mp3`;
      await FileSystem.deleteAsync(tempUri, { idempotent: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  };

  // --- End call ---
  const endCall = async () => {
    setCallStatus('Call Ended');
    addLog('📞 Call ended by user');
    
    await cleanup();
    
    setTimeout(() => navigation.goBack(), 2000);
  };

  // --- Format call duration ---
  const formatDuration = (sec) => {
    const h = Math.floor(sec / 3600).toString().padStart(2, '0');
    const m = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  // --- Get status text ---
  const getStatusText = () => {
    if (santaSpeaking) return '🎅 Santa is speaking...';
    if (listening) return '🎤 Listening for your voice...';
    return callStatus;
  };

  return (
    <View style={styles.container}>
      {/* Call Background */}
      <View style={styles.callGradient} />

      {/* Caller Info */}
      <View style={styles.callerContainer}>
        <View style={[
          styles.callerAvatar, 
          santaSpeaking && styles.speakingPulse,
          listening && styles.listeningPulse
        ]}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400' }}
            style={styles.avatarImage}
          />
        </View>
        <Text style={styles.callerName}>🎅 Santa Claus</Text>
        <Text style={styles.callerNumber}>North Pole Workshop</Text>
        <Text style={styles.callStatus}>{getStatusText()}</Text>
        {callStatus === 'In Call' && (
          <Text style={styles.duration}>{formatDuration(callDuration)}</Text>
        )}
        
        {/* Visual feedback for listening */}
        {listening && (
          <View style={styles.listeningIndicator}>
            <Text style={styles.listeningText}>Speak now... (3s silence to send)</Text>
          </View>
        )}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity 
          style={[styles.controlButton, styles.endButton]} 
          onPress={endCall}
        >
          <Text style={styles.endButtonText}>📞</Text>
        </TouchableOpacity>
      </View>

      {/* Dev Panel */}
      {__DEV__ && devLogs.length > 0 && (
        <View style={styles.devPanel}>
          <Text style={styles.devTitle}>Debug Logs</Text>
          <ScrollView style={styles.devScrollView} showsVerticalScrollIndicator={false}>
            {devLogs.map((log, idx) => (
              <Text key={idx} style={styles.devLog}>{log}</Text>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  callGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1a4d3a', // Christmas green
  },
  callerContainer: {
    alignItems: 'center',
    padding: 40,
    flex: 1,
    justifyContent: 'center',
  },
  callerAvatar: {
    width: 150,
    height: 150,
    borderRadius: 75,
    overflow: 'hidden',
    borderWidth: 5,
    borderColor: '#fff',
    elevation: 15,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  speakingPulse: {
    borderColor: '#ff4444',
    shadowColor: '#ff4444',
    shadowOpacity: 1,
    shadowRadius: 25,
    transform: [{ scale: 1.05 }],
  },
  listeningPulse: {
    borderColor: '#44ff44',
    shadowColor: '#44ff44',
    shadowOpacity: 0.8,
    shadowRadius: 20,
    transform: [{ scale: 1.02 }],
  },
  callerName: {
    color: '#fff',
    fontSize: 34,
    fontWeight: 'bold',
    marginTop: 25,
    textAlign: 'center',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  callerNumber: {
    color: '#ddd',
    fontSize: 18,
    marginTop: 8,
    textAlign: 'center',
  },
  callStatus: {
    color: '#fff',
    fontSize: 20,
    marginTop: 20,
    textAlign: 'center',
    fontWeight: '600',
  },
  duration: {
    color: '#44ff44',
    fontSize: 22,
    marginTop: 10,
    fontWeight: 'bold',
  },
  listeningIndicator: {
    backgroundColor: 'rgba(68, 255, 68, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    marginTop: 15,
    borderWidth: 1,
    borderColor: '#44ff44',
  },
  listeningText: {
    color: '#44ff44',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 60,
  },
  controlButton: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  endButton: {
    backgroundColor: '#d32f2f',
  },
  endButtonText: {
    fontSize: 32,
  },
  devPanel: {
    position: 'absolute',
    bottom: 150,
    left: 16,
    right: 16,
    maxHeight: 220,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    borderRadius: 15,
    padding: 15,
    borderWidth: 1,
    borderColor: '#444',
  },
  devTitle: {
    color: '#44ff44',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  devScrollView: {
    maxHeight: 180,
  },
  devLog: {
    color: '#00ff88',
    fontSize: 12,
    marginBottom: 3,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});