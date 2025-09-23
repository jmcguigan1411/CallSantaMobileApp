// Complete Fixed SantaCallScreen.js with Time-Based VAD Integration
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

// Time-based VAD hook that doesn't require metering
const useVoiceActivityDetection = (addLog) => {
  const [vadState, setVadState] = useState({
    isListening: false,
    isRecording: false,
    recordingDuration: 0,
    waitingForSilence: false,
    silenceStartTime: null,
  });

  const vadRef = useRef({
    recordingRef: null,
    isActive: false,
    recordingStartTime: null,
    silenceTimer: null,
    durationTimer: null,
    onVoiceStart: null,
    onVoiceEnd: null,
    onSilenceDetected: null,
    hasDetectedVoice: false,
  });

  const VAD_CONFIG = {
    MIN_RECORDING_TIME: 1500,       // Minimum 1.5 seconds before considering silence
    SILENCE_DETECTION_TIME: 3000,   // 3 seconds of silence after minimum time
    MAX_RECORDING_TIME: 20000,      // Maximum 20 seconds total
    DURATION_UPDATE_INTERVAL: 100,  // Update duration every 100ms
  };

  const logSafe = (msg) => {
    if (typeof addLog === 'function') {
      addLog(msg);
    } else {
      console.log(msg);
    }
  };

  const initializeVAD = async (recordingInstance, callbacks = {}) => {
    logSafe('🔊 === INITIALIZING TIME-BASED VAD SYSTEM ===');
    logSafe('📋 This system uses timing instead of audio levels for voice detection');
    
    vadRef.current.recordingRef = recordingInstance;
    vadRef.current.onVoiceStart = callbacks.onVoiceStart;
    vadRef.current.onVoiceEnd = callbacks.onVoiceEnd;
    vadRef.current.onSilenceDetected = callbacks.onSilenceDetected;
    vadRef.current.isActive = true;
    vadRef.current.recordingStartTime = Date.now();
    vadRef.current.hasDetectedVoice = false;

    setVadState({
      isListening: true,
      isRecording: true,
      recordingDuration: 0,
      waitingForSilence: false,
      silenceStartTime: null,
    });

    logSafe(`⚙️ Time-based VAD Config:`);
    logSafe(`   Min recording: ${VAD_CONFIG.MIN_RECORDING_TIME/1000}s`);
    logSafe(`   Silence detection: ${VAD_CONFIG.SILENCE_DETECTION_TIME/1000}s`);
    logSafe(`   Max recording: ${VAD_CONFIG.MAX_RECORDING_TIME/1000}s`);
    
    // Start the time-based detection
    startTimeBasedDetection();

    return true;
  };

  const startTimeBasedDetection = () => {
    logSafe('⏰ === STARTING TIME-BASED DETECTION ===');
    logSafe('🎤 Recording started - speak now!');
    
    // Immediately notify that "voice" has started (since user will speak)
    setTimeout(() => {
      if (vadRef.current.isActive && !vadRef.current.hasDetectedVoice) {
        logSafe('🗣️ VOICE ACTIVITY ASSUMED (time-based)');
        vadRef.current.hasDetectedVoice = true;
        vadRef.current.onVoiceStart?.();
      }
    }, 500); // Give user 500ms to start speaking

    // Start duration tracking
    vadRef.current.durationTimer = setInterval(() => {
      if (!vadRef.current.isActive) {
        clearInterval(vadRef.current.durationTimer);
        return;
      }

      const currentTime = Date.now();
      const duration = currentTime - vadRef.current.recordingStartTime;
      
      setVadState(prev => ({
        ...prev,
        recordingDuration: duration
      }));

      // Check if we've reached minimum recording time
      if (duration >= VAD_CONFIG.MIN_RECORDING_TIME && !vadRef.current.waitingForSilence) {
        logSafe('⏱️ Minimum recording time reached - now detecting silence...');
        logSafe('🤫 Stop speaking to process your message');
        
        vadRef.current.waitingForSilence = true;
        setVadState(prev => ({
          ...prev,
          waitingForSilence: true,
          silenceStartTime: currentTime
        }));
        
        // Start silence detection
        startSilenceDetection();
      }

      // Maximum recording time protection
      if (duration >= VAD_CONFIG.MAX_RECORDING_TIME) {
        logSafe(`⏰ MAXIMUM RECORDING TIME REACHED (${VAD_CONFIG.MAX_RECORDING_TIME/1000}s)`);
        logSafe('✅ Auto-processing speech due to timeout');
        
        if (vadRef.current.hasDetectedVoice) {
          vadRef.current.onSilenceDetected?.();
        } else {
          vadRef.current.onVoiceEnd?.();
        }
        
        stopVAD();
      }

      // Status logging every 2 seconds
      if (Math.floor(duration / 2000) !== Math.floor((duration - VAD_CONFIG.DURATION_UPDATE_INTERVAL) / 2000)) {
        const status = vadRef.current.waitingForSilence ? 
          `Waiting for silence (${(duration/1000).toFixed(1)}s)` :
          `Recording (${(duration/1000).toFixed(1)}s)`;
        logSafe(`📊 Time-based VAD: ${status}`);
      }

    }, VAD_CONFIG.DURATION_UPDATE_INTERVAL);
  };

  const startSilenceDetection = () => {
    logSafe('🔇 === STARTING SILENCE DETECTION ===');
    logSafe(`🤐 Waiting ${VAD_CONFIG.SILENCE_DETECTION_TIME/1000}s for silence...`);
    
    // Simple silence timer - assumes user stops speaking
    vadRef.current.silenceTimer = setTimeout(() => {
      if (vadRef.current.isActive) {
        const totalDuration = Date.now() - vadRef.current.recordingStartTime;
        logSafe('✅ SILENCE DETECTED (time-based)');
        logSafe(`📊 Final recording stats: ${(totalDuration/1000).toFixed(1)}s total`);
        
        vadRef.current.onSilenceDetected?.();
        stopVAD();
      }
    }, VAD_CONFIG.SILENCE_DETECTION_TIME);
  };

  const stopVAD = () => {
    logSafe('🛑 === STOPPING TIME-BASED VAD SYSTEM ===');
    
    vadRef.current.isActive = false;
    vadRef.current.waitingForSilence = false;
    
    if (vadRef.current.durationTimer) {
      clearInterval(vadRef.current.durationTimer);
      vadRef.current.durationTimer = null;
    }
    
    if (vadRef.current.silenceTimer) {
      clearTimeout(vadRef.current.silenceTimer);
      vadRef.current.silenceTimer = null;
    }
    
    setVadState({
      isListening: false,
      isRecording: false,
      recordingDuration: 0,
      waitingForSilence: false,
      silenceStartTime: null,
    });
    
    vadRef.current.hasDetectedVoice = false;
  };

  return { vadState, initializeVAD, stopVAD, VAD_CONFIG };
};

export default function SantaCallScreen({ route, navigation }) {
  const child = route?.params?.child;
  const { token } = useContext(AuthContext);

  // Existing state
  const [callStatus, setCallStatus] = useState('Calling...');
  const [callDuration, setCallDuration] = useState(0);
  const [santaSpeaking, setSantaSpeaking] = useState(false);
  const [devLogs, setDevLogs] = useState([]);

  // Utility function defined before VAD hook
  const addLog = (msg) => {
    if (__DEV__) {
      const timestamp = new Date().toLocaleTimeString();
      console.log(msg);
      setDevLogs((prev) => [...prev.slice(-25), `[${timestamp}] ${msg}`]);
    }
  };

  // Enhanced VAD integration with proper addLog function
  const { vadState, initializeVAD, stopVAD, VAD_CONFIG } = useVoiceActivityDetection(addLog);

  // Refs
  const recordingRef = useRef(null);
  const soundRef = useRef(null);
  const timerId = useRef(null);
  const isCleaningUp = useRef(false);
  const isListeningActive = useRef(false); // Track if listening is active to prevent multiple instances

  // Recording options
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

  // Initialize call
  useEffect(() => {
    addLog('🚀 Initializing Santa call with time-based VAD...');
    const initTimeout = setTimeout(() => initializeCall(), 3000);

    return () => {
      addLog('🧹 Component unmounting...');
      isCleaningUp.current = true;
      clearTimeout(initTimeout);
      cleanup();
    };
  }, []);

  const initializeCall = async () => {
    try {
      addLog('📱 Call connected!');
      setCallStatus('In Call');

      // Request permissions
      const permissionResponse = await Audio.requestPermissionsAsync();
      if (permissionResponse.status !== 'granted') {
        throw new Error('Microphone permission required');
      }

      // Setup audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });

      // Start call timer
      timerId.current = setInterval(() => setCallDuration(prev => prev + 1), 1000);

      // Play Santa greeting
      await santaGreeting();
    } catch (error) {
      addLog(`❌ Call initialization error: ${error.message}`);
      alert(`Call setup failed: ${error.message}`);
    }
  };

  // Enhanced Santa greeting
  const santaGreeting = async () => {
    try {
      setSantaSpeaking(true);
      addLog('🎅 Playing Santa greeting...');

      if (!token || !child?._id) {
        throw new Error('Missing authentication or child data');
      }

      const spokenName = (child.phoneticSpelling?.trim()) || child.name || 'friend';
      const greeting = `Ho ho ho! Hello ${spokenName}! This is Santa calling from the North Pole. What would you like for Christmas this year?`;

      addLog(`🗣️ Greeting: "${greeting}"`);
      
      const response = await chatWithSantaAudio(
        child._id,
        null,
        token,
        { isGreeting: true, greetingText: greeting, childName: spokenName }
      );

      if (response?.audioBase64) {
        await playAudioFromBase64(response.audioBase64);
      } else {
        addLog('❌ No greeting audio received, starting listening...');
        setSantaSpeaking(false);
        setTimeout(() => startEnhancedListening(), 2000);
      }
    } catch (error) {
      addLog(`❌ Greeting error: ${error.message}`);
      setSantaSpeaking(false);
      setTimeout(() => startEnhancedListening(), 3000);
    }
  };

  // FIXED: Enhanced listening with time-based VAD
  const startEnhancedListening = async () => {
    try {
      addLog('🎤 === STARTING TIME-BASED LISTENING ===');

      if (isCleaningUp.current || callStatus === 'Call Ended') {
        addLog('ℹ️ Call ended or cleaning up, not starting listening');
        return;
      }

      if (isListeningActive.current) {
        addLog('⚠️ Listening already active, skipping...');
        return;
      }

      if (santaSpeaking) {
        addLog('⏸️ Waiting for Santa to finish speaking...');
        setTimeout(() => startEnhancedListening(), 1000);
        return;
      }

      // CRITICAL: Clean up any existing recording first to prevent "Only one Recording object" error
      if (recordingRef.current) {
        addLog('🧹 Cleaning up existing recording before starting new one...');
        try {
          const status = await recordingRef.current.getStatusAsync();
          if (status.isRecording) {
            await recordingRef.current.stopAndUnloadAsync();
          }
        } catch (cleanupError) {
          addLog(`⚠️ Cleanup error: ${cleanupError.message}`);
        }
        recordingRef.current = null;
      }

      // Stop any existing VAD
      stopVAD();

      // Verify permissions
      const { status } = await Audio.getPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Microphone permission not available');
      }

      isListeningActive.current = true;
      addLog('🎙️ Creating recording with time-based VAD...');
      
      const { recording } = await Audio.Recording.createAsync(recordingOptions);
      recordingRef.current = recording;

      await recording.startAsync();
      addLog('🟢 Recording started - initializing time-based VAD system...');

      // Initialize time-based VAD with callbacks
      await initializeVAD(recording, {
        onVoiceStart: () => {
          addLog('🎯 Time-based VAD: Voice activity started');
        },
        onVoiceEnd: () => {
          addLog('🔇 Time-based VAD: Voice ended without sufficient speech');
          isListeningActive.current = false;
          setTimeout(() => {
            if (!isCleaningUp.current && callStatus !== 'Call Ended') {
              startEnhancedListening();
            }
          }, 1500);
        },
        onSilenceDetected: async () => {
          addLog('✅ Time-based VAD: Processing detected speech...');
          isListeningActive.current = false;
          await processUserSpeech();
        }
      });

    } catch (error) {
      addLog(`❌ Enhanced listening error: ${error.message}`);
      isListeningActive.current = false;
      
      // Clean up on error
      if (recordingRef.current) {
        try {
          await recordingRef.current.stopAndUnloadAsync();
        } catch (cleanupError) {
          // Ignore cleanup errors
        }
        recordingRef.current = null;
      }
      
      setTimeout(() => {
        if (!isCleaningUp.current) {
          startEnhancedListening();
        }
      }, 2000);
    }
  };

  // Enhanced stop listening
  const stopListening = async () => {
    addLog('🛑 === STOPPING TIME-BASED LISTENING ===');
    isListeningActive.current = false;
    
    // Stop VAD system
    stopVAD();

    if (recordingRef.current) {
      try {
        const status = await recordingRef.current.getStatusAsync();
        if (status.isRecording) {
          await recordingRef.current.stopAndUnloadAsync();
        }
      } catch (error) {
        addLog(`⚠️ Error stopping recording: ${error.message}`);
      }
      recordingRef.current = null;
    }
  };

  // Enhanced process user speech
  const processUserSpeech = async () => {
    try {
      addLog('🧠 === PROCESSING USER SPEECH WITH TIME-BASED VAD ===');

      if (!recordingRef.current) {
        addLog('❌ No recording available');
        return;
      }

      const audioUri = recordingRef.current.getURI();
      await stopListening();

      if (!audioUri) {
        addLog('❌ No audio URI generated');
        setTimeout(() => startEnhancedListening(), 2000);
        return;
      }

      // Verify file
      const fileInfo = await FileSystem.getInfoAsync(audioUri);
      if (!fileInfo.exists || fileInfo.size < 1000) {
        addLog(`❌ Audio file too small: ${fileInfo.size} bytes`);
        setTimeout(() => startEnhancedListening(), 2000);
        return;
      }

      addLog(`✅ Processing ${Math.round(fileInfo.size/1024)}KB audio file`);

      // Send to backend
      const response = await chatWithSantaAudio(child?._id, audioUri, token);

      if (response?.audioBase64) {
        addLog('🎵 Playing Santa response...');
        await playAudioFromBase64(response.audioBase64);
      } else {
        addLog('❌ No audio response received');
        setTimeout(() => startEnhancedListening(), 2000);
      }

    } catch (error) {
      addLog(`❌ Speech processing error: ${error.message}`);
      setTimeout(() => startEnhancedListening(), 3000);
    }
  };

  // Enhanced audio playback
  const playAudioFromBase64 = async (audioBase64) => {
    try {
      addLog('🔊 === PLAYING SANTA AUDIO ===');
      setSantaSpeaking(true);

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
            addLog(`⚠️ Audio cleanup error: ${cleanupError.message}`);
          }

          soundRef.current = null;

          // Start enhanced listening after Santa finishes
          addLog('⏳ Starting enhanced listening after Santa response...');
          setTimeout(() => {
            if (callStatus !== 'Call Ended' && !isCleaningUp.current) {
              startEnhancedListening();
            }
          }, 1000);
        }

        if (status.error) {
          addLog(`❌ Audio playback error: ${status.error}`);
          setSantaSpeaking(false);
          setTimeout(() => startEnhancedListening(), 1000);
        }
      });

    } catch (error) {
      addLog(`❌ Audio playback setup error: ${error.message}`);
      setSantaSpeaking(false);
      setTimeout(() => startEnhancedListening(), 2000);
    }
  };

  // Enhanced cleanup
  const cleanup = async () => {
    addLog('🧹 === ENHANCED CLEANUP ===');
    isCleaningUp.current = true;
    isListeningActive.current = false;

    if (timerId.current) {
      clearInterval(timerId.current);
      timerId.current = null;
    }

    stopVAD();
    await stopListening();

    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch (error) {
        addLog(`⚠️ Sound cleanup error: ${error.message}`);
      }
      soundRef.current = null;
    }

    // Clean temp files
    try {
      const tempUri = `${FileSystem.documentDirectory}temp_santa_audio.mp3`;
      await FileSystem.deleteAsync(tempUri, { idempotent: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  };

  const endCall = async () => {
    addLog('📞 === ENDING CALL ===');
    setCallStatus('Call Ended');
    await cleanup();
    setTimeout(() => navigation.goBack(), 2000);
  };

  const formatDuration = (sec) => {
    const h = Math.floor(sec / 3600).toString().padStart(2, '0');
    const m = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  // FIXED: Status text function that works with time-based VAD
  const getStatusText = () => {
    if (santaSpeaking) return '🎅 Santa is speaking...';
    if (vadState.isRecording && !vadState.waitingForSilence) {
      const duration = (vadState.recordingDuration / 1000).toFixed(1);
      return `🎤 Recording (${duration}s)...`;
    }
    if (vadState.waitingForSilence) {
      const duration = (vadState.recordingDuration / 1000).toFixed(1);
      return `🤫 Stop speaking (${duration}s)`;
    }
    if (vadState.isListening) return '👂 Ready to listen...';
    return callStatus;
  };

  return (
    <View style={styles.container}>
      <View style={styles.callGradient} />

      <View style={styles.callerContainer}>
        <View style={[
          styles.callerAvatar,
          santaSpeaking && styles.speakingPulse,
          vadState.isListening && !santaSpeaking && styles.listeningPulse,
          vadState.isRecording && styles.recordingPulse,
          vadState.waitingForSilence && styles.waitingPulse
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

        {/* FIXED: Time-based VAD indicators */}
        {vadState.isListening && !santaSpeaking && (
          <View style={styles.vadIndicator}>
            <Text style={styles.vadText}>
              {vadState.waitingForSilence 
                ? `Stop speaking to send (${(vadState.recordingDuration/1000).toFixed(1)}s)`
                : vadState.isRecording
                ? `Recording... (${(vadState.recordingDuration/1000).toFixed(1)}s)`
                : 'Ready to record!'
              }
            </Text>
            <View style={styles.audioLevelBar}>
              <View 
                style={[
                  styles.audioLevel,
                  { 
                    width: `${Math.max(10, Math.min(100, (vadState.recordingDuration / VAD_CONFIG.MAX_RECORDING_TIME) * 100))}%`,
                    backgroundColor: vadState.waitingForSilence ? '#ffaa00' : vadState.isRecording ? '#44ff44' : '#666'
                  }
                ]}
              />
            </View>
          </View>
        )}
      </View>

      <View style={styles.controls}>
        <TouchableOpacity 
          style={[styles.controlButton, styles.endButton]} 
          onPress={endCall}
        >
          <Text style={styles.endButtonText}>📞</Text>
        </TouchableOpacity>
      </View>

      {/* Enhanced dev panel */}
      {__DEV__ && devLogs.length > 0 && (
        <View style={styles.devPanel}>
          <Text style={styles.devTitle}>
            Time-Based VAD Debug - 
            {vadState.isListening ? 
              vadState.waitingForSilence ? 'Waiting for silence' : 'Recording' :
              'Idle'
            }
          </Text>
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
    backgroundColor: '#1a4d3a',
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
    borderColor: '#4488ff',
    shadowColor: '#4488ff',
    shadowOpacity: 0.8,
    shadowRadius: 20,
    transform: [{ scale: 1.02 }],
  },
  recordingPulse: {
    borderColor: '#44ff44',
    shadowColor: '#44ff44',
    shadowOpacity: 1,
    shadowRadius: 25,
    transform: [{ scale: 1.05 }],
  },
  waitingPulse: {
    borderColor: '#ffaa00',
    shadowColor: '#ffaa00',
    shadowOpacity: 1,
    shadowRadius: 30,
    transform: [{ scale: 1.08 }],
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
  vadIndicator: {
    backgroundColor: 'rgba(68, 136, 255, 0.15)',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#4488ff',
    minWidth: 280,
    alignItems: 'center',
  },
  vadText: {
    color: '#4488ff',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 8,
  },
  audioLevelBar: {
    width: 200,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  audioLevel: {
    height: '100%',
    borderRadius: 3,
    minWidth: 2,
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
    backgroundColor: '#ff4444',
  },
  endButtonText: {
    fontSize: 40,
    color: '#fff',
  },
  devPanel: {
    position: 'absolute',
    bottom: 120,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 8,
    padding: 12,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#333',
  },
  devTitle: {
    color: '#4488ff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  devScrollView: {
    maxHeight: 150,
  },
  devLog: {
    color: '#ccc',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 14,
    marginBottom: 2,
  },
});