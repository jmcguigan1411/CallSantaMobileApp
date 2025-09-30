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

// Constants for call timing
const MAX_CALL_DURATION = 180; // 3 minutes in seconds
const WARNING_TIME = 150; // Show warning at 2.5 minutes

// Audio-level VAD hook with silence timer reset
const useVoiceActivityDetection = (addLog) => {
  const [vadState, setVadState] = useState({
    isListening: false,
    isRecording: false,
    recordingDuration: 0,
    waitingForSilence: false,
    silenceStartTime: null,
    audioLevel: 0,
  });

  const vadRef = useRef({
    recordingRef: null,
    isActive: false,
    recordingStartTime: null,
    silenceTimer: null,
    durationTimer: null,
    meteringTimer: null,
    onVoiceStart: null,
    onVoiceEnd: null,
    onSilenceDetected: null,
    hasDetectedVoice: false,
    lastSoundTime: null,
  });

  const VAD_CONFIG = {
    MIN_RECORDING_TIME: 1500,
    SILENCE_DETECTION_TIME: 5000,
    MAX_RECORDING_TIME: 30000,
    DURATION_UPDATE_INTERVAL: 100,
    METERING_INTERVAL: 100,
    VOICE_THRESHOLD: -40,
  };

  const logSafe = (msg) => {
    if (typeof addLog === 'function') {
      addLog(msg);
    } else {
      console.log(msg);
    }
  };

  const initializeVAD = async (recordingInstance, callbacks = {}) => {
    logSafe('🔊 === INITIALIZING AUDIO-LEVEL VAD SYSTEM ===');

    vadRef.current.recordingRef = recordingInstance;
    vadRef.current.onVoiceStart = callbacks.onVoiceStart;
    vadRef.current.onVoiceEnd = callbacks.onVoiceEnd;
    vadRef.current.onSilenceDetected = callbacks.onSilenceDetected;
    vadRef.current.isActive = true;
    vadRef.current.recordingStartTime = Date.now();
    vadRef.current.lastSoundTime = Date.now();
    vadRef.current.hasDetectedVoice = false;

    setVadState({
      isListening: true,
      isRecording: true,
      recordingDuration: 0,
      waitingForSilence: false,
      silenceStartTime: null,
      audioLevel: 0,
    });

    if (Platform.OS === 'ios') {
  logSafe('🎤 Setting up iOS metering...');
  
  vadRef.current.meteringTimer = setInterval(async () => {
    if (!vadRef.current.isActive || !vadRef.current.recordingRef) {
      logSafe('⚠️ Metering stopped: VAD inactive or no recording');
      return;
    }

    try {
      const status = await vadRef.current.recordingRef.getStatusAsync();
      
      // Debug: Always log metering status
      logSafe(`📊 Metering: ${status.metering !== undefined ? status.metering.toFixed(1) + ' dB' : 'UNDEFINED'}`);
      
      if (status.isRecording && status.metering !== undefined) {
        const audioLevel = status.metering;
        setVadState(prev => ({ ...prev, audioLevel }));

        if (audioLevel > VAD_CONFIG.VOICE_THRESHOLD) {
          vadRef.current.lastSoundTime = Date.now();
          logSafe(`🔊 Voice detected! Last sound time updated`);
          
          if (!vadRef.current.hasDetectedVoice) {
            logSafe('🗣️ FIRST VOICE DETECTED');
            vadRef.current.hasDetectedVoice = true;
            vadRef.current.onVoiceStart?.();
          }
        }
      } else {
        logSafe(`⚠️ Not recording or no metering: recording=${status.isRecording}, metering=${status.metering}`);
      }
    } catch (error) {
      logSafe(`❌ Metering error: ${error.message}`);
    }
  }, VAD_CONFIG.METERING_INTERVAL);
}

    startAudioLevelDetection();
    return true;
  };

  const startAudioLevelDetection = () => {
    logSafe('🎤 === STARTING AUDIO LEVEL DETECTION ===');

    vadRef.current.meteringTimer = setInterval(async () => {
      if (!vadRef.current.isActive || !vadRef.current.recordingRef) {
        return;
      }

      try {
        const status = await vadRef.current.recordingRef.getStatusAsync();
        
        if (status.isRecording && status.metering !== undefined) {
          const audioLevel = status.metering;
          setVadState(prev => ({ ...prev, audioLevel }));

          if (audioLevel > VAD_CONFIG.VOICE_THRESHOLD) {
            vadRef.current.lastSoundTime = Date.now();
            
            if (!vadRef.current.hasDetectedVoice) {
              logSafe('🗣️ VOICE DETECTED');
              vadRef.current.hasDetectedVoice = true;
              vadRef.current.onVoiceStart?.();
            }
          }
        }
      } catch (error) {
        logSafe(`⚠️ Metering error: ${error.message}`);
      }
    }, VAD_CONFIG.METERING_INTERVAL);

    vadRef.current.durationTimer = setInterval(() => {
      if (!vadRef.current.isActive) {
        clearInterval(vadRef.current.durationTimer);
        return;
      }

      const currentTime = Date.now();
      const duration = currentTime - vadRef.current.recordingStartTime;
      const timeSinceLastSound = currentTime - (vadRef.current.lastSoundTime || vadRef.current.recordingStartTime);

      setVadState(prev => ({
        ...prev,
        recordingDuration: duration,
        waitingForSilence: duration >= VAD_CONFIG.MIN_RECORDING_TIME && timeSinceLastSound > 1000,
      }));

      if (duration >= VAD_CONFIG.MIN_RECORDING_TIME) {
        if (timeSinceLastSound >= VAD_CONFIG.SILENCE_DETECTION_TIME) {
          logSafe(`✅ SILENCE DETECTED (${(timeSinceLastSound/1000).toFixed(1)}s quiet)`);
          vadRef.current.onSilenceDetected?.();
          stopVAD();
        }
      }

      if (duration >= VAD_CONFIG.MAX_RECORDING_TIME) {
        logSafe('⏰ MAX RECORDING TIME REACHED');
        if (vadRef.current.hasDetectedVoice) {
          vadRef.current.onSilenceDetected?.();
        } else {
          vadRef.current.onVoiceEnd?.();
        }
        stopVAD();
      }

    }, VAD_CONFIG.DURATION_UPDATE_INTERVAL);
  };

  const stopVAD = () => {
    vadRef.current.isActive = false;

    if (vadRef.current.durationTimer) {
      clearInterval(vadRef.current.durationTimer);
      vadRef.current.durationTimer = null;
    }

    if (vadRef.current.meteringTimer) {
      clearInterval(vadRef.current.meteringTimer);
      vadRef.current.meteringTimer = null;
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
      audioLevel: 0,
    });

    vadRef.current.hasDetectedVoice = false;
    vadRef.current.lastSoundTime = null;
  };

  return { vadState, initializeVAD, stopVAD, VAD_CONFIG };
};

export default function SantaCallScreen({ route, navigation }) {
  const child = route?.params?.child;
  const { token } = useContext(AuthContext);

  const [callStatus, setCallStatus] = useState('Calling...');
  const [callDuration, setCallDuration] = useState(0);
  const [santaSpeaking, setSantaSpeaking] = useState(false);
  const [devLogs, setDevLogs] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasShownWarning, setHasShownWarning] = useState(false);
  const [callEnding, setCallEnding] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);

  const addLog = (msg) => {
    if (__DEV__) {
      const timestamp = new Date().toLocaleTimeString();
      console.log(msg);
      setDevLogs((prev) => [...prev.slice(-25), `[${timestamp}] ${msg}`]);
    }
  };

  const { vadState, initializeVAD, stopVAD, VAD_CONFIG } = useVoiceActivityDetection(addLog);

  const recordingRef = useRef(null);
  const soundRef = useRef(null);
  const timerId = useRef(null);
  const isCleaningUp = useRef(false);
  const isListeningActive = useRef(false);
  const fillerSoundRef = useRef(null);
  const fillerTimeoutRef = useRef(null);
  const isPlayingFillers = useRef(false);

  const SANTA_FILLERS = [
    require('../assets/santa-fillers/ahh.mp3'),
    require('../assets/santa-fillers/cough.mp3'),
    require('../assets/santa-fillers/coughaha.mp3'),
    require('../assets/santa-fillers/hmmm.mp3'),
    require('../assets/santa-fillers/hohoho.mp3'),
    require('../assets/santa-fillers/isee.mp3'),
    require('../assets/santa-fillers/wellnow.mp3'),
  ];

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
      isMeteringEnabled: true,
    },
  };

  const detectGoodbye = (text) => {
    const goodbyePhrases = [
      'goodbye', 'good bye', 'bye', 'bye bye', 'see you', 'see ya',
      'gotta go', 'have to go', 'talk later', 'talk to you later'
    ];
    
    const lowerText = text.toLowerCase();
    return goodbyePhrases.some(phrase => lowerText.includes(phrase));
  };

  const handleTimeWarning = async () => {
    if (callEnding) return;
    
    const warningMessage = "Ho ho ho! I'm getting very busy here at the North Pole! We need to wrap up soon!";
    
    try {
      setSantaSpeaking(true);
      await startFillers();
      
      const response = await chatWithSantaAudio(
        child?._id,
        null,
        token,
        { isGreeting: true, greetingText: warningMessage }
      );
      
      await stopFillers();
      
      if (response?.audioBase64) {
        await playAudioFromBase64(response.audioBase64);
      } else {
        setSantaSpeaking(false);
      }
    } catch (error) {
      addLog(`❌ Warning error: ${error.message}`);
      await stopFillers();
      setSantaSpeaking(false);
    }
  };

  const handleTimeLimitReached = async () => {
    if (callEnding) return;
    setCallEnding(true);
    
    const spokenName = (child?.phoneticSpelling?.trim()) || child?.name || 'friend';
    const farewellMessage = `Ho ho ho! I must go now, ${spokenName}! Remember to be nice to mummy and daddy, and stay on the nice list! Merry Christmas!`;
    
    try {
      setSantaSpeaking(true);
      await startFillers();
      
      const response = await chatWithSantaAudio(
        child?._id,
        null,
        token,
        { isGreeting: true, greetingText: farewellMessage }
      );
      
      await stopFillers();
      
      if (response?.audioBase64) {
        await playAudioFromBase64(response.audioBase64, true);
      } else {
        setSantaSpeaking(false);
        setTimeout(() => endCall(), 1000);
      }
    } catch (error) {
      addLog(`❌ Farewell error: ${error.message}`);
      await stopFillers();
      setSantaSpeaking(false);
      setTimeout(() => endCall(), 1000);
    }
  };

  const handleChildGoodbye = async () => {
    if (callEnding) return;
    setCallEnding(true);
    
    addLog('👋 Child said goodbye, Santa responding...');
    
    const spokenName = (child?.phoneticSpelling?.trim()) || child?.name || 'friend';
    const goodbyeMessage = `Goodbye ${spokenName}! Remember to be nice to mummy and daddy! Stay on the nice list! Merry Christmas!`;
    
    try {
      setSantaSpeaking(true);
      await startFillers();
      
      const response = await chatWithSantaAudio(
        child?._id,
        null,
        token,
        { isGreeting: true, greetingText: goodbyeMessage }
      );
      
      await stopFillers();
      
      if (response?.audioBase64) {
        await playAudioFromBase64(response.audioBase64, true);
      } else {
        setSantaSpeaking(false);
        setTimeout(() => endCall(), 1000);
      }
    } catch (error) {
      addLog(`❌ Goodbye error: ${error.message}`);
      await stopFillers();
      setSantaSpeaking(false);
      setTimeout(() => endCall(), 1000);
    }
  };

  const toggleSpeaker = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: !isSpeakerOn,
        staysActiveInBackground: false,
      });
      setIsSpeakerOn(!isSpeakerOn);
      addLog(`🔊 Speaker ${!isSpeakerOn ? 'ON' : 'OFF'}`);
    } catch (error) {
      addLog(`❌ Speaker toggle error: ${error.message}`);
    }
  };

  const playRandomFiller = async () => {
    if (!isPlayingFillers.current) return;

    try {
      if (fillerSoundRef.current) {
        await fillerSoundRef.current.stopAsync();
        await fillerSoundRef.current.unloadAsync();
        fillerSoundRef.current = null;
      }

      const randomFiller = SANTA_FILLERS[Math.floor(Math.random() * SANTA_FILLERS.length)];
      
      const { sound } = await Audio.Sound.createAsync(
        randomFiller,
        { shouldPlay: true, volume: 0.7 }
      );

      fillerSoundRef.current = sound;

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          fillerSoundRef.current = null;
          if (isPlayingFillers.current) {
            const delay = 800 + Math.random() * 1700;
            fillerTimeoutRef.current = setTimeout(() => {
              if (isPlayingFillers.current && !isCleaningUp.current) {
                playRandomFiller();
              }
            }, delay);
          }
        }
      });
    } catch (error) {
      addLog(`⚠️ Filler playback error: ${error.message}`);
    }
  };

  const startFillers = async () => {
    addLog('🎭 Starting filler sounds...');
    isPlayingFillers.current = true;
    await playRandomFiller();
  };

  const stopFillers = async () => {
    addLog('🛑 Stopping filler sounds');
    isPlayingFillers.current = false;

    if (fillerTimeoutRef.current) {
      clearTimeout(fillerTimeoutRef.current);
      fillerTimeoutRef.current = null;
    }

    if (fillerSoundRef.current) {
      try {
        await fillerSoundRef.current.stopAsync();
        await fillerSoundRef.current.unloadAsync();
      } catch (error) {
        // Ignore
      }
      fillerSoundRef.current = null;
    }
  };

  useEffect(() => {
    addLog('🚀 Initializing Santa call...');
    const initTimeout = setTimeout(() => initializeCall(), 3000);

    return () => {
      addLog('🧹 Component unmounting...');
      isCleaningUp.current = true;
      clearTimeout(initTimeout);
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (callStatus === 'In Call' && callDuration >= MAX_CALL_DURATION && !callEnding) {
      addLog('⏰ Maximum call duration reached');
      handleTimeLimitReached();
    } else if (callStatus === 'In Call' && callDuration >= WARNING_TIME && !hasShownWarning && !callEnding) {
      addLog('⚠️ Approaching time limit, sending warning...');
      setHasShownWarning(true);
      handleTimeWarning();
    }
  }, [callDuration, callStatus]);

  const initializeCall = async () => {
    try {
      addLog('📱 Call connected!');
      setCallStatus('In Call');

      const permissionResponse = await Audio.requestPermissionsAsync();
      if (permissionResponse.status !== 'granted') {
        throw new Error('Microphone permission required');
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });

      timerId.current = setInterval(() => setCallDuration(prev => prev + 1), 1000);

      await santaGreeting();
    } catch (error) {
      addLog(`❌ Call initialization error: ${error.message}`);
      alert(`Call setup failed: ${error.message}`);
    }
  };

  const santaGreeting = async () => {
    try {
      setSantaSpeaking(true);
      addLog('🎅 Playing Santa greeting...');

      if (!token || !child?._id) {
        throw new Error('Missing authentication or child data');
      }

      const spokenName = (child.phoneticSpelling?.trim()) || child.name || 'friend';
      const greeting = `Ho ho ho! Hello ${spokenName}! This is Santa calling from the North Pole. What would you like for Christmas this year?`;

      const response = await chatWithSantaAudio(
        child._id,
        null,
        token,
        { isGreeting: true, greetingText: greeting, childName: spokenName }
      );

      if (response?.audioBase64) {
        await playAudioFromBase64(response.audioBase64);
      } else {
        setSantaSpeaking(false);
        setTimeout(() => startEnhancedListening(), 2000);
      }
    } catch (error) {
      addLog(`❌ Greeting error: ${error.message}`);
      setSantaSpeaking(false);
      setTimeout(() => startEnhancedListening(), 3000);
    }
  };

  const startEnhancedListening = async () => {
    try {
      if (isCleaningUp.current || callStatus === 'Call Ended' || callEnding) {
        return;
      }

      if (isListeningActive.current) {
        return;
      }

      if (santaSpeaking) {
        setTimeout(() => startEnhancedListening(), 1000);
        return;
      }

      if (recordingRef.current) {
        try {
          const status = await recordingRef.current.getStatusAsync();
          if (status.isRecording) {
            await recordingRef.current.stopAndUnloadAsync();
          }
        } catch (cleanupError) {
          // Ignore
        }
        recordingRef.current = null;
      }

      stopVAD();

      const { status } = await Audio.getPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Microphone permission not available');
      }

      isListeningActive.current = true;
      
      const { recording } = await Audio.Recording.createAsync(recordingOptions);
      recordingRef.current = recording;

      await recording.startAsync();

      await initializeVAD(recording, {
        onVoiceStart: () => {
          addLog('🎯 Voice activity started');
        },
        onVoiceEnd: () => {
          isListeningActive.current = false;
          setTimeout(() => {
            if (!isCleaningUp.current && callStatus !== 'Call Ended' && !callEnding) {
              startEnhancedListening();
            }
          }, 1500);
        },
        onSilenceDetected: async () => {
          isListeningActive.current = false;
          await processUserSpeech();
        }
      });

    } catch (error) {
      addLog(`❌ Enhanced listening error: ${error.message}`);
      isListeningActive.current = false;
      
      if (recordingRef.current) {
        try {
          await recordingRef.current.stopAndUnloadAsync();
        } catch (cleanupError) {
          // Ignore
        }
        recordingRef.current = null;
      }
      
      setTimeout(() => {
        if (!isCleaningUp.current && !callEnding) {
          startEnhancedListening();
        }
      }, 2000);
    }
  };

  const stopListening = async () => {
    isListeningActive.current = false;
    stopVAD();

    if (recordingRef.current) {
      try {
        const status = await recordingRef.current.getStatusAsync();
        if (status.isRecording) {
          await recordingRef.current.stopAndUnloadAsync();
        }
      } catch (error) {
        // Ignore
      }
      recordingRef.current = null;
    }
  };

  const processUserSpeech = async () => {
    try {
      if (!recordingRef.current) {
        return;
      }

      const audioUri = recordingRef.current.getURI();
      await stopListening();

      if (!audioUri) {
        setTimeout(() => startEnhancedListening(), 2000);
        return;
      }

      const fileInfo = await FileSystem.getInfoAsync(audioUri);
      if (!fileInfo.exists || fileInfo.size < 1000) {
        setTimeout(() => startEnhancedListening(), 2000);
        return;
      }

      setIsProcessing(true);
      setSantaSpeaking(true);
      await startFillers();

      const response = await chatWithSantaAudio(child?._id, audioUri, token);

      await stopFillers();
      setIsProcessing(false);

      if (response?.audioBase64) {
        if (response.text && detectGoodbye(response.text)) {
          addLog('👋 Goodbye detected');
          await handleChildGoodbye();
          return;
        }
        
        await playAudioFromBase64(response.audioBase64);
      } else {
        setSantaSpeaking(false);
        setTimeout(() => startEnhancedListening(), 2000);
      }

    } catch (error) {
      addLog(`❌ Speech processing error: ${error.message}`);
      await stopFillers();
      setIsProcessing(false);
      setSantaSpeaking(false);
      setTimeout(() => startEnhancedListening(), 3000);
    }
  };

  const playAudioFromBase64 = async (audioBase64, shouldEndCall = false) => {
    try {
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
          setSantaSpeaking(false);

          try {
            await sound.unloadAsync();
            await FileSystem.deleteAsync(tempUri, { idempotent: true });
          } catch (cleanupError) {
            // Ignore
          }

          soundRef.current = null;

          if (shouldEndCall) {
            setTimeout(() => endCall(), 2000);
          } else {
            setTimeout(() => {
              if (callStatus !== 'Call Ended' && !isCleaningUp.current && !callEnding) {
                startEnhancedListening();
              }
            }, 1000);
          }
        }

        if (status.error) {
          setSantaSpeaking(false);
          if (shouldEndCall) {
            setTimeout(() => endCall(), 1000);
          } else {
            setTimeout(() => startEnhancedListening(), 1000);
          }
        }
      });

    } catch (error) {
      addLog(`❌ Audio playback error: ${error.message}`);
      setSantaSpeaking(false);
      if (shouldEndCall) {
        setTimeout(() => endCall(), 1000);
      } else {
        setTimeout(() => startEnhancedListening(), 2000);
      }
    }
  };

  const cleanup = async () => {
    isCleaningUp.current = true;
    isListeningActive.current = false;

    if (timerId.current) {
      clearInterval(timerId.current);
      timerId.current = null;
    }

    stopVAD();
    await stopListening();
    await stopFillers();

    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch (error) {
        // Ignore
      }
      soundRef.current = null;
    }

    try {
      const tempUri = `${FileSystem.documentDirectory}temp_santa_audio.mp3`;
      await FileSystem.deleteAsync(tempUri, { idempotent: true });
    } catch (error) {
      // Ignore
    }
  };

  const endCall = async () => {
    addLog('📞 === ENDING CALL ===');
    setCallStatus('Call Ended');
    await cleanup();
    setTimeout(() => navigation.goBack(), 2000);
  };

  const formatDuration = (sec) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const getStatusText = () => {
    if (isProcessing) return '🎅 Santa is thinking...';
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
          style={[styles.controlButton, styles.speakerButton, isSpeakerOn && styles.speakerButtonActive]}
          onPress={toggleSpeaker}
        >
          <Text style={styles.speakerButtonText}>
            {isSpeakerOn ? '🔊' : '🔈'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.controlButton, styles.endButton]} 
          onPress={endCall}
        >
          <Text style={styles.endButtonText}>📞</Text>
        </TouchableOpacity>
      </View>

      {__DEV__ && devLogs.length > 0 && (
        <View style={styles.devPanel}>
          <Text style={styles.devTitle}>Debug</Text>
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
    gap: 20,
  },
  speakerButton: {
    backgroundColor: '#4488ff',
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
  speakerButtonActive: {
    backgroundColor: '#44ff44',
  },
  speakerButtonText: {
    fontSize: 40,
    color: '#fff',
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