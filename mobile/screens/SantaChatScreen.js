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
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../context/AuthContext';
import { useTooltips } from '../context/TooltipContext';
import TooltipOverlay from '../components/TooltipOverlay';
import { chatWithSantaAudio } from '../services/aiService';
import * as localAudioService from '../services/localAudioService';

// Constants for call timing
const MAX_CALL_DURATION = 180; // 3 minutes in seconds
const WARNING_TIME = 150; // Show warning at 2.5 minutes

// Audio-level VAD hook with simple time-based recording
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
    durationTimer: null,
    onVoiceStart: null,
    onVoiceEnd: null,
    onSilenceDetected: null,
  });

  const VAD_CONFIG = {
    AUTO_STOP_TIME: 5000, // Stop after 5 seconds of recording
    MIN_RECORDING_TIME: 1000, // 1 second minimum
    MAX_RECORDING_TIME: 30000, // 30 seconds max
    DURATION_UPDATE_INTERVAL: 100,
  };

  const logSafe = (msg) => {
    if (typeof addLog === 'function') {
      addLog(msg);
    }
    console.log(msg);
  };

  const initializeVAD = async (recordingInstance, callbacks = {}) => {
    logSafe('🔊 [VAD] Initializing simple time-based VAD...');

    vadRef.current.recordingRef = recordingInstance;
    vadRef.current.onVoiceStart = callbacks.onVoiceStart;
    vadRef.current.onVoiceEnd = callbacks.onVoiceEnd;
    vadRef.current.onSilenceDetected = callbacks.onSilenceDetected;
    vadRef.current.isActive = true;
    vadRef.current.recordingStartTime = Date.now();

    setVadState({
      isListening: true,
      isRecording: true,
      recordingDuration: 0,
      waitingForSilence: false,
      silenceStartTime: null,
      audioLevel: 0,
    });

    // Assume voice starts immediately
    setTimeout(() => {
      if (vadRef.current.isActive) {
        logSafe('🗣️ [VAD] Voice activity started');
        vadRef.current.onVoiceStart?.();
      }
    }, 500);

    startDurationTracking();
    return true;
  };

  const startDurationTracking = () => {
    logSafe('⏱️ [VAD] Starting duration tracking...');

    vadRef.current.durationTimer = setInterval(() => {
      if (!vadRef.current.isActive) return;

      const currentTime = Date.now();
      const duration = currentTime - vadRef.current.recordingStartTime;

      setVadState(prev => ({
        ...prev,
        recordingDuration: duration,
        waitingForSilence: duration >= VAD_CONFIG.MIN_RECORDING_TIME,
      }));

      // Auto-stop after 5 seconds
      if (duration >= VAD_CONFIG.AUTO_STOP_TIME) {
        logSafe(`✅ [VAD] Auto-stopping after ${(duration/1000).toFixed(1)}s`);
        vadRef.current.onSilenceDetected?.();
        stopVAD();
      }

      // Failsafe max time
      if (duration >= VAD_CONFIG.MAX_RECORDING_TIME) {
        logSafe(`⏰ [VAD] Max recording time reached (30s)`);
        vadRef.current.onSilenceDetected?.();
        stopVAD();
      }
    }, VAD_CONFIG.DURATION_UPDATE_INTERVAL);
  };

  const stopVAD = () => {
    logSafe('🛑 [VAD] Stopping VAD');
    vadRef.current.isActive = false;

    if (vadRef.current.durationTimer) {
      clearInterval(vadRef.current.durationTimer);
      vadRef.current.durationTimer = null;
    }

    setVadState({
      isListening: false,
      isRecording: false,
      recordingDuration: 0,
      waitingForSilence: false,
      silenceStartTime: null,
      audioLevel: 0,
    });
  };

  return { vadState, initializeVAD, stopVAD, VAD_CONFIG };
};

export default function SantaCallScreen({ route, navigation }) {
  const child = route?.params?.child;
  const { token } = useContext(AuthContext);
  const { TUTORIAL_STEPS, completeStep } = useTooltips();

  const [callStatus, setCallStatus] = useState('Calling...');
  const [callDuration, setCallDuration] = useState(0);
  const [santaSpeaking, setSantaSpeaking] = useState(false);
  const [devLogs, setDevLogs] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasShownWarning, setHasShownWarning] = useState(false);
  const [callEnding, setCallEnding] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [showDebug, setShowDebug] = useState(true);

  const addLog = (msg, category = 'INFO') => {
    const timestamp = new Date().toLocaleTimeString();
    const formattedMsg = `[${timestamp}] [${category}] ${msg}`;
    console.log(formattedMsg);
    setDevLogs((prev) => [...prev.slice(-50), formattedMsg]);
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
      sampleRate: 44100,
      numberOfChannels: 1,
      bitRate: 128000,
    },
    ios: {
      extension: '.m4a',
      audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
      sampleRate: 44100,
      numberOfChannels: 1,
      bitRate: 128000,
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
    
    addLog('Sending time warning to child', 'WARNING');
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
      addLog(`Warning error: ${error.message}`, 'ERROR');
      await stopFillers();
      setSantaSpeaking(false);
    }
  };

  const handleTimeLimitReached = async () => {
    if (callEnding) return;
    setCallEnding(true);
    
    addLog('Maximum call duration reached, ending call', 'WARNING');
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
      addLog(`Farewell error: ${error.message}`, 'ERROR');
      await stopFillers();
      setSantaSpeaking(false);
      setTimeout(() => endCall(), 1000);
    }
  };

  const handleChildGoodbye = async () => {
    if (callEnding) return;
    setCallEnding(true);
    
    addLog('Child said goodbye, Santa responding with farewell', 'GOODBYE');
    
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
      addLog(`Goodbye error: ${error.message}`, 'ERROR');
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
      addLog(`Speaker ${!isSpeakerOn ? 'ON' : 'OFF'}`, 'AUDIO');
    } catch (error) {
      addLog(`Speaker toggle error: ${error.message}`, 'ERROR');
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
      addLog(`Filler playback error: ${error.message}`, 'ERROR');
    }
  };

  const startFillers = async () => {
    addLog('Starting filler sounds', 'AUDIO');
    isPlayingFillers.current = true;
    await playRandomFiller();
  };

  const stopFillers = async () => {
    addLog('Stopping filler sounds', 'AUDIO');
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
    addLog('=== SANTA CALL INITIALIZING ===', 'INIT');
    addLog(`Child: ${child?.name} (ID: ${child?._id})`, 'INIT');
    addLog(`Token present: ${!!token}`, 'INIT');
    
    const initTimeout = setTimeout(() => initializeCall(), 3000);

    return () => {
      addLog('Component unmounting, cleanup initiated', 'CLEANUP');
      isCleaningUp.current = true;
      clearTimeout(initTimeout);
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (callStatus === 'In Call' && callDuration >= MAX_CALL_DURATION && !callEnding) {
      addLog('Maximum call duration reached', 'WARNING');
      handleTimeLimitReached();
    } else if (callStatus === 'In Call' && callDuration >= WARNING_TIME && !hasShownWarning && !callEnding) {
      addLog('Approaching time limit, sending warning', 'WARNING');
      setHasShownWarning(true);
      handleTimeWarning();
    }
  }, [callDuration, callStatus]);

  const initializeCall = async () => {
    try {
      addLog('Call connected, initializing audio system', 'INIT');
      setCallStatus('In Call');

      const permissionResponse = await Audio.requestPermissionsAsync();
      addLog(`Microphone permission: ${permissionResponse.status}`, 'INIT');
      
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
      addLog('Audio mode configured', 'INIT');

      timerId.current = setInterval(() => setCallDuration(prev => prev + 1), 1000);
      addLog('Call timer started', 'INIT');

      await santaGreeting();
    } catch (error) {
      addLog(`Call initialization error: ${error.message}`, 'ERROR');
      alert(`Call setup failed: ${error.message}`);
    }
  };

  const santaGreeting = async () => {
    try {
      setSantaSpeaking(true);
      addLog('Playing Santa greeting...', 'GREETING');

      if (!token || !child?._id) {
        throw new Error('Missing authentication or child data');
      }

      const spokenName = (child.phoneticSpelling?.trim()) || child.name || 'friend';
      const greeting = `Ho ho ho! Hello ${spokenName}! This is Santa calling from the North Pole. What would you like for Christmas this year?`;
      
      addLog(`Greeting text: "${greeting}"`, 'GREETING');
      addLog('Sending greeting request to server...', 'REQUEST');

      const response = await chatWithSantaAudio(
        child._id,
        null,
        token,
        { isGreeting: true, greetingText: greeting, childName: spokenName }
      );

      addLog(`Server response received: ${response?.audioBase64 ? 'SUCCESS' : 'NO AUDIO'}`, 'RESPONSE');

      if (response?.audioBase64) {
        addLog(`Audio size: ${response.audioBase64.length} characters`, 'RESPONSE');
        await playAudioFromBase64(response.audioBase64);
      } else {
        addLog('No audio in response, starting listening', 'WARNING');
        setSantaSpeaking(false);
        setTimeout(() => startEnhancedListening(), 2000);
      }
    } catch (error) {
      addLog(`Greeting error: ${error.message}`, 'ERROR');
      setSantaSpeaking(false);
      setTimeout(() => startEnhancedListening(), 3000);
    }
  };

  const startEnhancedListening = async () => {
    try {
      addLog('=== START LISTENING ===', 'RECORDING');
      
      if (isCleaningUp.current || callStatus === 'Call Ended' || callEnding) {
        addLog(`NOT starting: cleanup=${isCleaningUp.current}, status=${callStatus}, ending=${callEnding}`, 'RECORDING');
        return;
      }

      if (isListeningActive.current) {
        addLog('Already listening, skipping', 'RECORDING');
        return;
      }

      if (santaSpeaking) {
        addLog('Santa still speaking, will retry in 1s', 'RECORDING');
        setTimeout(() => startEnhancedListening(), 1000);
        return;
      }

      addLog('Stopping fillers before recording', 'AUDIO');
      await stopFillers();
      await new Promise(resolve => setTimeout(resolve, 300));

      if (recordingRef.current) {
        try {
          const status = await recordingRef.current.getStatusAsync();
          addLog(`Previous recording status: recording=${status.isRecording}, canRecord=${status.canRecord}`, 'RECORDING');
          if (status.isRecording) {
            addLog('Cleaning up previous recording', 'RECORDING');
            await recordingRef.current.stopAndUnloadAsync();
          }
        } catch (cleanupError) {
          addLog(`Cleanup error: ${cleanupError.message}`, 'WARNING');
        }
        recordingRef.current = null;
      }

      stopVAD();

      const { status } = await Audio.getPermissionsAsync();
      addLog(`Permission status: ${status}`, 'RECORDING');
      if (status !== 'granted') {
        throw new Error('Microphone permission not available');
      }

      addLog('Setting audio mode for recording', 'AUDIO');
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
          staysActiveInBackground: false,
        });
        addLog('Audio mode set successfully', 'AUDIO');
      } catch (audioModeError) {
        addLog(`Audio mode error: ${audioModeError.message}`, 'ERROR');
        throw audioModeError;
      }

      isListeningActive.current = true;
      addLog('Creating new recording instance', 'RECORDING');
      
      const recording = new Audio.Recording();
      addLog('Recording instance created', 'RECORDING');
      
      addLog(`Preparing with options: sampleRate=${recordingOptions.android.sampleRate}, bitRate=${recordingOptions.android.bitRate}`, 'RECORDING');
      await recording.prepareToRecordAsync(recordingOptions);
      addLog('Recording prepared', 'RECORDING');
      
      recordingRef.current = recording;

      await new Promise(resolve => setTimeout(resolve, 150));

      addLog('🎤 Starting recording NOW', 'RECORDING');
      await recording.startAsync();
      
      const recordingStatus = await recording.getStatusAsync();
      addLog(`Recording status: isRecording=${recordingStatus.isRecording}, canRecord=${recordingStatus.canRecord}, durationMillis=${recordingStatus.durationMillis}`, 'RECORDING');
      
      if (!recordingStatus.isRecording) {
        throw new Error('Recording failed to start - isRecording is false');
      }
      
      addLog('✅ Recording started and verified', 'RECORDING');

      await initializeVAD(recording, {
        onVoiceStart: () => {
          addLog('Voice activity detected', 'VAD');
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
          addLog('Silence detected, processing speech', 'VAD');
          isListeningActive.current = false;
          await processUserSpeech();
        }
      });

    } catch (error) {
      addLog(`❌ Listening error: ${error.message}`, 'ERROR');
      addLog(`Error stack: ${error.stack}`, 'ERROR');
      isListeningActive.current = false;
      
      if (recordingRef.current) {
        try {
          await recordingRef.current.stopAndUnloadAsync();
        } catch (cleanupError) {
          addLog(`Cleanup after error failed: ${cleanupError.message}`, 'ERROR');
        }
        recordingRef.current = null;
      }
      
      setTimeout(() => {
        if (!isCleaningUp.current && !callEnding) {
          addLog('Retrying listening in 2s', 'RECORDING');
          startEnhancedListening();
        }
      }, 2000);
    }
  };

  const stopListening = async () => {
    addLog('Stopping listening', 'RECORDING');
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
      addLog('=== PROCESSING SPEECH ===', 'PROCESSING');
      
      if (!recordingRef.current) {
        addLog('❌ No recording ref available', 'ERROR');
        setTimeout(() => startEnhancedListening(), 2000);
        return;
      }

      const preStopStatus = await recordingRef.current.getStatusAsync();
      addLog(`Pre-stop status: isRecording=${preStopStatus.isRecording}, durationMillis=${preStopStatus.durationMillis}`, 'PROCESSING');

      const audioUri = recordingRef.current.getURI();
      addLog(`Audio URI: ${audioUri}`, 'PROCESSING');
      
      await stopListening();

      if (!audioUri) {
        addLog('❌ No audio URI, restarting listening', 'ERROR');
        setTimeout(() => startEnhancedListening(), 2000);
        return;
      }

      const fileInfo = await FileSystem.getInfoAsync(audioUri);
      addLog(`📁 File: size=${fileInfo.size} bytes, exists=${fileInfo.exists}, uri=${fileInfo.uri}`, 'PROCESSING');
      
      if (!fileInfo.exists) {
        addLog(`❌ File doesn't exist at ${audioUri}`, 'ERROR');
        setTimeout(() => startEnhancedListening(), 2000);
        return;
      }
      
      if (fileInfo.size < 500) {
        addLog(`⚠️ File very small (${fileInfo.size} bytes), but sending anyway`, 'WARNING');
      }

      addLog(`📤 Sending ${fileInfo.size} bytes (${(preStopStatus.durationMillis/1000).toFixed(1)}s) to server`, 'REQUEST');
      setIsProcessing(true);
      setSantaSpeaking(true);
      await startFillers();

      const response = await chatWithSantaAudio(child?._id, audioUri, token);

      addLog('📥 Server response received', 'RESPONSE');
      addLog(`Response: hasAudio=${!!response?.audioBase64}, hasText=${!!response?.text}, hasTranscription=${!!response?.transcription}`, 'RESPONSE');
      
      if (response?.transcription) {
        addLog(`Transcription: "${response.transcription}"`, 'RESPONSE');
      }
      if (response?.text) {
        addLog(`Santa text: "${response.text.substring(0, 100)}..."`, 'RESPONSE');
      }

      await stopFillers();
      setIsProcessing(false);

      if (response?.audioBase64) {
        // Save recording locally with transcription
       if (response.transcription && response.transcription.trim()) {
  try {
    addLog(`💾 Attempting to save recording...`, 'SAVE');
    addLog(`   - Audio URI: ${audioUri}`, 'SAVE');
    addLog(`   - Child ID: ${child._id}`, 'SAVE');
    addLog(`   - Child Name: ${child.name}`, 'SAVE');
    addLog(`   - Transcription: "${response.transcription.substring(0, 50)}..."`, 'SAVE');
    
    const savedMetadata = await localAudioService.saveRecording(
      audioUri,
      child._id,
      child.name,
      response.transcription
    );
    
    addLog(`✅ Recording saved successfully!`, 'SAVE');
    addLog(`   - File: ${savedMetadata.fileName}`, 'SAVE');
    addLog(`   - Sequence: #${savedMetadata.sequenceNumber}`, 'SAVE');
  } catch (saveError) {
    addLog(`⚠️ Failed to save recording: ${saveError.message}`, 'ERROR');
    addLog(`   - Error stack: ${saveError.stack}`, 'ERROR');
  }
} else {
  addLog(`⚠️ No transcription available, recording NOT saved`, 'WARNING');
  addLog(`   - Has transcription: ${!!response.transcription}`, 'WARNING');
  addLog(`   - Transcription value: "${response.transcription}"`, 'WARNING');
}

// Check if child said goodbye
if (response.text && detectGoodbye(response.text)) {
  addLog(`👋 Goodbye detected in: "${response.text}"`, 'GOODBYE');
  await handleChildGoodbye();
  return;
}

addLog(`🔊 Playing Santa response (${response.audioBase64.length} chars)`, 'RESPONSE');
await playAudioFromBase64(response.audioBase64);
} else {
addLog('⚠️ No audio in response, restarting listening', 'WARNING');
setSantaSpeaking(false);
setTimeout(() => startEnhancedListening(), 2000);
}
} catch (error) {
addLog(`❌ Speech processing error: ${error.message}`, 'ERROR');
addLog(`Error stack: ${error.stack}`, 'ERROR');
await stopFillers();
setIsProcessing(false);
setSantaSpeaking(false);
setTimeout(() => startEnhancedListening(), 3000);
}
};

  const playAudioFromBase64 = async (audioBase64, shouldEndCall = false) => {
    try {
      setSantaSpeaking(true);
      addLog('Playing Santa audio...', 'AUDIO');

      const tempUri = `${FileSystem.documentDirectory}temp_santa_audio.mp3`;
      await FileSystem.writeAsStringAsync(tempUri, audioBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      addLog(`Audio written to: ${tempUri}`, 'AUDIO');

      const { sound } = await Audio.Sound.createAsync(
        { uri: tempUri },
        { shouldPlay: true, volume: 1.0 }
      );

      soundRef.current = sound;
      addLog('Audio playback started', 'AUDIO');

      sound.setOnPlaybackStatusUpdate(async (status) => {
        if (status.didJustFinish) {
          addLog('Audio finished playing', 'AUDIO');
          setSantaSpeaking(false);

          try {
            await sound.unloadAsync();
            await FileSystem.deleteAsync(tempUri, { idempotent: true });
          } catch (cleanupError) {
            // Ignore
          }

          soundRef.current = null;

          if (shouldEndCall) {
            addLog('Ending call after audio', 'AUDIO');
            setTimeout(() => endCall(), 2000);
          } else {
            addLog('Preparing to start listening after audio', 'AUDIO');
            setTimeout(() => {
              if (!isCleaningUp.current && !callEnding) {
                addLog('Starting listening after audio finished', 'RECORDING');
                startEnhancedListening();
              } else {
                addLog(`NOT starting listening: cleanup=${isCleaningUp.current}, ending=${callEnding}`, 'RECORDING');
              }
            }, 1000);
          }
        }

        if (status.error) {
          addLog(`Audio playback error: ${status.error}`, 'ERROR');
          setSantaSpeaking(false);
          if (shouldEndCall) {
            setTimeout(() => endCall(), 1000);
          } else {
            setTimeout(() => startEnhancedListening(), 1000);
          }
        }
      });

    } catch (error) {
      addLog(`Audio playback error: ${error.message}`, 'ERROR');
      setSantaSpeaking(false);
      if (shouldEndCall) {
        setTimeout(() => endCall(), 1000);
      } else {
        setTimeout(() => startEnhancedListening(), 2000);
      }
    }
  };

  const cleanup = async () => {
    addLog('=== CLEANUP STARTED ===', 'CLEANUP');
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
    
    addLog('Cleanup completed', 'CLEANUP');
  };

  const endCall = async () => {
    addLog('=== ENDING CALL ===', 'END');
    setCallStatus('Call Ended');
    setCallEnded(true);
    
    // Complete the chat tutorial step
    completeStep(TUTORIAL_STEPS.CHAT_WITH_SANTA);
    
    await cleanup();
    
    // Show tooltip for a moment before navigating back
    setTimeout(() => {
      addLog('Navigating back', 'END');
      navigation.goBack();
    }, 3000);
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

      {/* Tooltip for call ended */}
      {callEnded && (
        <TooltipOverlay
          step={TUTORIAL_STEPS.VIEW_WISHLIST}
          title="Call Complete! 🎄"
          message="Great job! Your call with Santa has been saved. You can view all recordings in the Audio Files menu from the drawer!"
          position="center"
        />
      )}

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