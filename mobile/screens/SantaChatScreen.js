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
      setDevLogs((prev) => [...prev.slice(-20), `[${timestamp}] ${msg}`]);
    }
  };

  // --- Initialize call sequence ---
  useEffect(() => {
    addLog('🚀 Component mounted, initializing call in 3 seconds...');
    const ringTimeout = setTimeout(async () => {
      await initializeCall();
    }, 3000);

    return () => {
      addLog('🔄 Component unmounting, cleaning up...');
      clearTimeout(ringTimeout);
      cleanup();
    };
  }, []);

  // --- Initialize call ---
  const initializeCall = async () => {
    try {
      addLog('📱 Starting call initialization...');
      addLog('📞 Call connected!');
      setCallStatus('In Call');
      addLog('✅ Call status set to: In Call');

      // Check and request permissions
      addLog('🔐 Requesting microphone permissions...');
      const permissionResponse = await Audio.requestPermissionsAsync();
      if (permissionResponse.status !== 'granted') {
        addLog('❌ Microphone permission denied');
        alert('Microphone permission is required for Santa calls!');
        return;
      }

      addLog('✅ Microphone permission granted');

      // Setup audio mode
      addLog('🔧 Configuring audio mode...');
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });

      addLog('🎵 Audio mode configured successfully');

      // Start call timer
      addLog('⏰ Starting call timer...');
      timerId.current = setInterval(() => setCallDuration((prev) => prev + 1), 1000);

      // Play Santa greeting first
      addLog('🎅 Preparing to play Santa greeting...');
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
      addLog('🎭 Setting Santa speaking state...');
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
      addLog(`📜 Greeting text: "${greeting}"`);
      
      addLog('🌐 Sending greeting request to server...');
      // Send greeting with validated child ID and token
      const response = await chatWithSantaAudio(
        childId,
        null,
        token,
        { 
          isGreeting: true, 
          greetingText: greeting,
          childName: spokenName
        }
      );

      addLog('📨 Server response received for greeting');
      if (response?.audioBase64) {
        addLog('🔊 Audio data received, preparing to play...');
        await playAudioFromBase64(response.audioBase64);
      } else {
        addLog('❌ No greeting audio received from server');
        addLog('🔧 Will start listening without greeting...');
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
      
      addLog('⏳ Will start listening after 3 second delay...');
      setTimeout(() => startListening(), 3000);
    }
  };

  // --- Start continuous recording with voice activity detection ---
  const startListening = async () => {
    try {
      addLog('🎤 === STARTING LISTENING PHASE ===');
      addLog(`🔍 Current states: listening=${listening}, santaSpeaking=${santaSpeaking}, callStatus="${callStatus}"`);
      
      // Wait for Santa to completely finish speaking before starting to listen
      if (santaSpeaking) {
        addLog('⏸️ Santa is still speaking, waiting 1 second before starting to listen...');
        setTimeout(() => startListening(), 1000);
        return;
      }
      
      // Double-check permissions before starting
      addLog('🔐 Double-checking microphone permissions...');
      const { status } = await Audio.getPermissionsAsync();
      if (status !== 'granted') {
        addLog('❌ No microphone permission available');
        return;
      }
      addLog('✅ Microphone permission confirmed');

      addLog('🎭 Setting listening state to true...');
      setListening(true);
      // DON'T set santaSpeaking to false here - let the audio playback manage it
      
      // Wait for state to update before proceeding
      await new Promise(resolve => setTimeout(resolve, 100));
      addLog(`🔍 States after setting and waiting: listening should be true`);
      addLog('🎤 Starting to listen for user voice...');

      // Create recording with optimized settings
      addLog('🔧 Creating recording instance with optimized settings...');
      const { recording } = await Audio.Recording.createAsync(recordingOptions);
      recordingRef.current = recording;
      recordingStartTime.current = Date.now();
      voiceActivityRef.current = false;

      addLog('📊 Recording instance created successfully');
      addLog(`⚙️ Recording settings: ${JSON.stringify(recordingOptions)}`);

      // Enable metering for voice activity detection
      addLog('▶️ Starting recording...');
      await recording.startAsync();
      addLog('🟢 Recording started successfully');
      
      // Start voice activity detection immediately since we just set the states
      addLog('👂 Starting voice activity detection...');
      // Don't check the listening state here since we just set it - start immediately
      startVoiceActivityDetection();
      
    } catch (error) {
      console.error('Start listening error:', error);
      addLog(`❌ Listen error: ${error.message}`);
      addLog('🔄 Setting listening state to false due to error');
      setListening(false);
      
      // Retry after delay
      addLog('⏳ Scheduling retry in 2 seconds...');
      setTimeout(() => {
        addLog('🔄 Retrying to start listening...');
        startListening();
      }, 2000);
    }
  };

  // --- Voice activity detection with metering ---
  const startVoiceActivityDetection = () => {
    addLog('🔍 === VOICE ACTIVITY DETECTION STARTED ===');
    addLog(`⚙️ Detection settings: Threshold=${VOICE_THRESHOLD}dB, Silence=${SILENCE_DURATION}ms, MinTime=${MIN_RECORDING_TIME}ms`);
    
    let lastVoiceTime = Date.now();
    let hasDetectedVoice = false;
    let meteringCount = 0;
    let isActive = true; // Use local flag instead of relying on React state

    meteringRef.current = setInterval(async () => {
      meteringCount++;
      
      // Check local flag instead of React state
      if (!isActive) {
        addLog('⚠️ Metering stopped - detection marked as inactive');
        clearInterval(meteringRef.current);
        return;
      }
      
      // Debug state checking
      if (!recordingRef.current) {
        addLog('⚠️ Metering stopped - no recording reference');
        isActive = false;
        clearInterval(meteringRef.current);
        return;
      }

      try {
        // Get recording status with metering
        const status = await recordingRef.current.getStatusAsync();
        
        if (status.isRecording) {
          const currentTime = Date.now();
          const totalDuration = currentTime - recordingStartTime.current;
          
          // Log every 20 metering checks (4 seconds)
          if (meteringCount % 20 === 0) {
            addLog(`📊 Metering check #${meteringCount} - Total duration: ${Math.round(totalDuration/1000)}s`);
          }
          
          // Check if we have metering data
          if (status.metering !== undefined) {
            const audioLevel = status.metering;
            
            // Log audio levels occasionally
            if (meteringCount % 25 === 0) {
              addLog(`🔊 Audio level: ${audioLevel}dB (threshold: ${VOICE_THRESHOLD}dB)`);
            }
            
            // Voice detected if audio level is above threshold
            if (audioLevel > VOICE_THRESHOLD) {
              if (!hasDetectedVoice) {
                addLog('🗣️ VOICE DETECTED! User started speaking');
                hasDetectedVoice = true;
              }
              lastVoiceTime = currentTime;
              voiceActivityRef.current = true;
            }
          } else {
            // Fallback: assume voice activity if recording is working
            if (!hasDetectedVoice && totalDuration > 1000) {
              addLog('🔊 Audio recording active (no metering data available)');
              addLog('📝 Assuming voice activity due to recording duration');
              hasDetectedVoice = true;
              lastVoiceTime = currentTime;
              voiceActivityRef.current = true;
            }
          }

          // Check for silence after voice was detected
          const silenceDuration = currentTime - lastVoiceTime;

          if (hasDetectedVoice && silenceDuration >= SILENCE_DURATION && totalDuration >= MIN_RECORDING_TIME) {
            addLog(`🔇 SILENCE DETECTED! (${Math.round(silenceDuration/1000)}s of silence)`);
            addLog(`📊 Recording stats: Total=${Math.round(totalDuration/1000)}s, Silence=${Math.round(silenceDuration/1000)}s`);
            addLog('🛑 Stopping voice detection timer...');
            clearInterval(meteringRef.current);
            addLog('📦 Proceeding to process user speech...');
            await processUserSpeech();
            return;
          }

          // Timeout after 30 seconds of no processing
          if (totalDuration > 30000) {
            addLog('⏰ RECORDING TIMEOUT (30s reached)');
            if (hasDetectedVoice) {
              addLog('✅ Voice was detected, processing speech...');
              clearInterval(meteringRef.current);
              await processUserSpeech();
            } else {
              addLog('❌ No voice detected during timeout, restarting...');
              clearInterval(meteringRef.current);
              await stopListening();
              addLog('⏳ Restarting listening in 1 second...');
              setTimeout(() => startListening(), 1000);
            }
          }
        } else {
          addLog('⚠️ Recording is not active during metering check');
        }
      } catch (error) {
        console.error('Metering error:', error);
        addLog(`❌ Metering error: ${error.message}`);
      }
    }, METERING_INTERVAL);

    addLog(`⏱️ Voice detection timer started (checking every ${METERING_INTERVAL}ms)`);
    addLog(`🤫 Waiting for ${SILENCE_DURATION/1000}s silence to process speech...`);
  };

  // --- Stop listening ---
  const stopListening = async () => {
    addLog('🛑 === STOPPING LISTENING ===');
    addLog('🎭 Setting listening state to false...');
    setListening(false);
    
    if (meteringRef.current) {
      addLog('⏹️ Clearing voice detection timer...');
      clearInterval(meteringRef.current);
      meteringRef.current = null;
    }

    if (recordingRef.current) {
      try {
        addLog('📊 Checking recording status before stopping...');
        const status = await recordingRef.current.getStatusAsync();
        if (status.isRecording) {
          addLog('🛑 Stopping and unloading recording...');
          await recordingRef.current.stopAndUnloadAsync();
          addLog('✅ Recording stopped successfully');
        } else {
          addLog('ℹ️ Recording was already stopped');
        }
      } catch (error) {
        console.error('Stop recording error:', error);
        addLog(`❌ Error stopping recording: ${error.message}`);
      }
      recordingRef.current = null; // Clear the reference
    }
    addLog('✅ Stop listening completed');
  };

  // --- Process user speech ---
  const processUserSpeech = async () => {
    addLog('🧠 === PROCESSING USER SPEECH ===');
    
    if (!recordingRef.current) {
      addLog('❌ No recording reference available');
      return;
    }

    try {
      // Get the audio URI BEFORE stopping the recording
      addLog('📁 Retrieving audio URI before stopping...');
      const audioUri = recordingRef.current.getURI();
      
      addLog('🛑 Stopping listening before processing...');
      await stopListening();
      addLog('📦 Starting speech processing pipeline...');

      if (!audioUri) {
        addLog('❌ No audio URI generated from recording');
        addLog('⏳ Will restart listening in 2 seconds...');
        setTimeout(() => startListening(), 2000);
        return;
      }

      addLog(`📍 Audio URI obtained: ${audioUri}`);

      // Verify file exists and has content
      addLog('🔍 Verifying audio file...');
      const fileInfo = await FileSystem.getInfoAsync(audioUri);
      addLog(`📊 File info: exists=${fileInfo.exists}, size=${fileInfo.size} bytes`);
      
      if (!fileInfo.exists || fileInfo.size < 1000) {
        addLog(`❌ Audio file too small or missing (${fileInfo.size} bytes)`);
        addLog('⏳ Will restart listening in 2 seconds...');
        setTimeout(() => startListening(), 2000);
        return;
      }

      const recordingDuration = Date.now() - recordingStartTime.current;
      addLog(`✅ Audio file validated: ${Math.round(recordingDuration/1000)}s duration, ${Math.round(fileInfo.size/1024)}KB`);
      
      // Check token before processing
      if (!token) {
        addLog('❌ No authentication token available for processing');
        throw new Error('Authentication token missing');
      }

      addLog('🤖 Sending audio to backend pipeline...');
      addLog('📡 Pipeline: Audio → Whisper (speech-to-text) → ChatGPT → ElevenLabs → Response');

      // Send to backend: audio -> Whisper -> ChatGPT -> ElevenLabs
      const response = await chatWithSantaAudio(child?._id, audioUri, token);
      
      addLog('📨 Backend response received');
      
      if (response?.text) {
        const previewText = response.text.substring(0, 100);
        addLog(`💭 Santa's response: "${previewText}${response.text.length > 100 ? '...' : ''}"`);
      } else {
        addLog('❌ No text response from backend');
      }
      
      if (response?.audioBase64) {
        addLog(`🎵 Audio response received (${response.audioBase64.length} characters)`);
        addLog('▶️ Starting audio playback...');
        await playAudioFromBase64(response.audioBase64);
      } else {
        addLog('❌ No audio response received from backend');
        addLog('⏳ Will restart listening in 2 seconds...');
        setTimeout(() => startListening(), 2000);
      }

    } catch (error) {
      console.error('Process speech error:', error);
      addLog(`❌ Speech processing error: ${error.message}`);
      
      // Handle auth errors specifically
      if (error.message.includes('token') || error.message.includes('401')) {
        addLog('🔐 Authentication error during speech processing');
      }
      
      addLog('⏳ Will restart listening in 3 seconds...');
      setTimeout(() => startListening(), 3000);
    }
  };

  // --- Play audio from base64 ---
  const playAudioFromBase64 = async (audioBase64) => {
    try {
      addLog('🔊 === PLAYING SANTA AUDIO ===');
      addLog('🎭 Setting Santa speaking state...');
      setSantaSpeaking(true);
      addLog('▶️ Preparing audio playback...');
      
      // Create temporary file for better compatibility
      const tempUri = `${FileSystem.documentDirectory}temp_santa_audio.mp3`;
      addLog(`📁 Creating temporary audio file: ${tempUri}`);
      
      await FileSystem.writeAsStringAsync(tempUri, audioBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      addLog('✅ Temporary audio file created');
      
      addLog('🔧 Creating audio sound instance...');
      const { sound } = await Audio.Sound.createAsync(
        { uri: tempUri },
        { shouldPlay: true, volume: 1.0 }
      );
      
      soundRef.current = sound;
      addLog('🔊 Audio playback started');

      sound.setOnPlaybackStatusUpdate(async (status) => {
        if (status.didJustFinish) {
          addLog('✅ Santa finished speaking');
          addLog('🎭 Resetting speaking state...');
          setSantaSpeaking(false);
          
          try {
            addLog('🧹 Cleaning up audio resources...');
            await sound.unloadAsync();
            await FileSystem.deleteAsync(tempUri, { idempotent: true });
            addLog('✅ Audio cleanup completed');
          } catch (cleanupError) {
            console.error('Audio cleanup error:', cleanupError);
            addLog(`⚠️ Audio cleanup error: ${cleanupError.message}`);
          }
          
          soundRef.current = null;
          
          // After Santa finishes, start listening again
          addLog('⏳ Scheduling next listening session in 2 seconds... (increased delay)');
          addLog(`🔍 DEBUG: Current call status: "${callStatus}"`);
          setTimeout(() => {
            // Always restart listening unless call was explicitly ended
            addLog(`🔍 DEBUG: Call status check: "${callStatus}" !== "Call Ended"?`);
            if (callStatus !== 'Call Ended') {
              addLog('🔄 Restarting listening for next user input...');
              startListening();
            } else {
              addLog('ℹ️ Call was ended, not restarting listening');
            }
          }, 2000); // Increased from 800ms to 2000ms
        }

        if (status.error) {
          addLog(`❌ Audio playback error: ${status.error}`);
          setSantaSpeaking(false);
          addLog('⏳ Will restart listening in 1 second due to playback error...');
          setTimeout(() => startListening(), 1000);
        }
      });

    } catch (error) {
      console.error('Play audio error:', error);
      addLog(`❌ Audio playback error: ${error.message}`);
      setSantaSpeaking(false);
      addLog('⏳ Will restart listening in 2 seconds due to playback setup error...');
      setTimeout(() => startListening(), 2000);
    }
  };

  // --- Cleanup function ---
  const cleanup = async () => {
    addLog('🧹 === CLEANING UP RESOURCES ===');
    
    if (timerId.current) {
      addLog('⏰ Clearing call timer...');
      clearInterval(timerId.current);
      timerId.current = null;
    }

    if (meteringRef.current) {
      addLog('⏹️ Clearing voice detection timer...');
      clearInterval(meteringRef.current);
      meteringRef.current = null;
    }

    addLog('🛑 Stopping listening...');
    await stopListening();

    if (soundRef.current) {
      try {
        addLog('🔊 Stopping and unloading audio...');
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        addLog('✅ Audio cleanup completed');
      } catch (error) {
        console.error('Cleanup sound error:', error);
        addLog(`⚠️ Audio cleanup error: ${error.message}`);
      }
      soundRef.current = null;
    }

    // Clean up temp files
    try {
      const tempUri = `${FileSystem.documentDirectory}temp_santa_audio.mp3`;
      addLog('🗑️ Removing temporary audio file...');
      await FileSystem.deleteAsync(tempUri, { idempotent: true });
      addLog('✅ Temporary file cleanup completed');
    } catch (error) {
      addLog('ℹ️ Temporary file cleanup skipped (file may not exist)');
    }
    
    addLog('✅ === CLEANUP COMPLETED ===');
  };

  // --- End call ---
  const endCall = async () => {
    addLog('📞 === ENDING CALL ===');
    setCallStatus('Call Ended');
    addLog('📞 Call ended by user');
    
    await cleanup();
    
    addLog('⏳ Navigating back in 2 seconds...');
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
});