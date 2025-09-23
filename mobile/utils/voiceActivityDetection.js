// utils/voiceActivityDetection.js
// Enhanced Voice Activity Detection System for Santa Calls

import { useState, useRef } from 'react';

// VAD Configuration - Tuned for natural conversation
const VAD_CONFIG = {
  // Core detection thresholds
  VOICE_THRESHOLD: -35,           // dB - Primary voice detection level
  BACKGROUND_THRESHOLD: -50,      // dB - Background noise baseline
  SILENCE_DURATION: 2500,         // ms - Silence time before processing speech
  MIN_VOICE_DURATION: 800,        // ms - Minimum speech duration to be valid
  MIN_RECORDING_TIME: 1000,       // ms - Minimum total recording time
  MAX_RECORDING_TIME: 15000,      // ms - Maximum recording time (timeout)
  
  // Timing and responsiveness
  METERING_INTERVAL: 100,         // ms - Audio level check frequency
  VOICE_CONFIRMATION_TIME: 300,   // ms - Consistent voice needed to start
  STARTUP_DELAY: 1000,            // ms - Delay after Santa stops speaking
  CALIBRATION_TIME: 2000,         // ms - Background noise calibration period
  
  // Advanced detection
  ADAPTIVE_THRESHOLD: true,       // Enable adaptive threshold adjustment
  NOISE_GATE: true,               // Enable noise gate filtering
  HYSTERESIS_FACTOR: 0.8,         // Prevent voice detection flicker
};

/**
 * Enhanced Voice Activity Detection Hook
 * Provides robust voice detection with calibration and adaptive thresholds
 */
export const useVoiceActivityDetection = (addLog) => {
  const [vadState, setVadState] = useState({
    isListening: false,
    isCalibrating: false,
    voiceDetected: false,
    backgroundNoise: -60,
    currentLevel: -60,
    adaptiveThreshold: VAD_CONFIG.VOICE_THRESHOLD,
    voiceDuration: 0,
    silenceDuration: 0,
    confidenceLevel: 0,
  });

  const vadRef = useRef({
    meteringTimer: null,
    recordingRef: null,
    isActive: false,
    
    // Timing tracking
    voiceStartTime: null,
    lastVoiceTime: null,
    recordingStartTime: null,
    
    // Calibration data
    backgroundLevels: [],
    recentLevels: [],
    
    // Callbacks
    onVoiceStart: null,
    onVoiceEnd: null,
    onSilenceDetected: null,
    
    // Detection state
    consecutiveVoiceFrames: 0,
    consecutiveSilenceFrames: 0,
    voiceConfirmed: false,
  });

  /**
   * Initialize the VAD system with a recording instance
   */
  const initializeVAD = async (recordingInstance, callbacks = {}) => {
    addLog('🔊 === INITIALIZING ENHANCED VAD SYSTEM ===');
    
    // Store references and callbacks
    vadRef.current.recordingRef = recordingInstance;
    vadRef.current.onVoiceStart = callbacks.onVoiceStart;
    vadRef.current.onVoiceEnd = callbacks.onVoiceEnd;
    vadRef.current.onSilenceDetected = callbacks.onSilenceDetected;
    vadRef.current.isActive = true;
    vadRef.current.recordingStartTime = Date.now();
    
    // Reset detection state
    vadRef.current.backgroundLevels = [];
    vadRef.current.recentLevels = [];
    vadRef.current.consecutiveVoiceFrames = 0;
    vadRef.current.consecutiveSilenceFrames = 0;
    vadRef.current.voiceConfirmed = false;
    vadRef.current.voiceStartTime = null;
    vadRef.current.lastVoiceTime = null;

    setVadState(prev => ({
      ...prev,
      isListening: true,
      isCalibrating: true,
      voiceDetected: false,
      adaptiveThreshold: VAD_CONFIG.VOICE_THRESHOLD,
    }));

    addLog(`⚙️ VAD Config: Threshold=${VAD_CONFIG.VOICE_THRESHOLD}dB, Silence=${VAD_CONFIG.SILENCE_DURATION}ms, Adaptive=${VAD_CONFIG.ADAPTIVE_THRESHOLD}`);
    
    // Start calibration phase
    addLog('🎙️ Starting background noise calibration...');
    await calibrateBackgroundNoise();
    
    // Begin main detection loop after calibration
    setTimeout(() => {
      if (vadRef.current.isActive) {
        startMainDetectionLoop();
      }
    }, VAD_CONFIG.CALIBRATION_TIME);

    return true;
  };

  /**
   * Calibrate background noise levels for adaptive threshold
   */
  const calibrateBackgroundNoise = async () => {
    return new Promise((resolve) => {
      let sampleCount = 0;
      const maxSamples = VAD_CONFIG.CALIBRATION_TIME / VAD_CONFIG.METERING_INTERVAL;
      
      const calibrationTimer = setInterval(async () => {
        try {
          if (!vadRef.current.recordingRef || !vadRef.current.isActive) {
            clearInterval(calibrationTimer);
            resolve();
            return;
          }

          const status = await vadRef.current.recordingRef.getStatusAsync();
          
          if (status.isRecording && status.metering !== undefined) {
            vadRef.current.backgroundLevels.push(status.metering);
            sampleCount++;
            
            // Update current level display
            setVadState(prev => ({ ...prev, currentLevel: status.metering }));
            
            if (sampleCount >= maxSamples) {
              // Calculate statistics
              const sortedLevels = [...vadRef.current.backgroundLevels].sort((a, b) => b - a);
              const avgBackground = vadRef.current.backgroundLevels.reduce((a, b) => a + b, 0) / vadRef.current.backgroundLevels.length;
              const medianBackground = sortedLevels[Math.floor(sortedLevels.length / 2)];
              const maxBackground = Math.max(...vadRef.current.backgroundLevels);
              
              // Set adaptive threshold
              let adaptiveThreshold = VAD_CONFIG.VOICE_THRESHOLD;
              if (VAD_CONFIG.ADAPTIVE_THRESHOLD) {
                // Adaptive threshold: background + margin, but not too sensitive
                const margin = Math.max(8, Math.abs(avgBackground) * 0.2);
                adaptiveThreshold = Math.max(
                  VAD_CONFIG.VOICE_THRESHOLD,
                  Math.min(-20, avgBackground + margin)
                );
              }
              
              setVadState(prev => ({
                ...prev,
                backgroundNoise: avgBackground,
                adaptiveThreshold: adaptiveThreshold,
                isCalibrating: false,
              }));
              
              addLog(`📊 Calibration complete:`);
              addLog(`   Background: avg=${avgBackground.toFixed(1)}dB, median=${medianBackground.toFixed(1)}dB, max=${maxBackground.toFixed(1)}dB`);
              addLog(`   Adaptive threshold: ${adaptiveThreshold.toFixed(1)}dB`);
              
              clearInterval(calibrationTimer);
              resolve();
            }
          }
        } catch (error) {
          addLog(`❌ Calibration error: ${error.message}`);
          clearInterval(calibrationTimer);
          resolve();
        }
      }, VAD_CONFIG.METERING_INTERVAL);
    });
  };

  /**
   * Main voice activity detection loop
   */
  const startMainDetectionLoop = () => {
    addLog('👂 === STARTING ENHANCED VAD DETECTION LOOP ===');
    
    vadRef.current.meteringTimer = setInterval(async () => {
      try {
        if (!vadRef.current.isActive || !vadRef.current.recordingRef) {
          stopVAD();
          return;
        }

        const status = await vadRef.current.recordingRef.getStatusAsync();
        
        if (!status.isRecording) {
          addLog('⚠️ Recording stopped unexpectedly');
          stopVAD();
          return;
        }

        const currentTime = Date.now();
        const audioLevel = status.metering !== undefined ? status.metering : -60;
        const threshold = vadState.adaptiveThreshold;
        
        // Update recent levels for smoothing
        vadRef.current.recentLevels.push(audioLevel);
        if (vadRef.current.recentLevels.length > 5) {
          vadRef.current.recentLevels.shift();
        }
        
        // Smoothed audio level
        const smoothedLevel = vadRef.current.recentLevels.reduce((a, b) => a + b, 0) / vadRef.current.recentLevels.length;
        
        // Update display
        setVadState(prev => ({ 
          ...prev, 
          currentLevel: smoothedLevel,
          confidenceLevel: Math.max(0, Math.min(100, ((smoothedLevel - threshold + 20) / 20) * 100))
        }));

        // Voice activity detection with hysteresis
        const isVoiceDetected = smoothedLevel > threshold;
        const hysteresisThreshold = threshold * VAD_CONFIG.HYSTERESIS_FACTOR;
        const isVoiceContinued = smoothedLevel > hysteresisThreshold;

        if (isVoiceDetected || (vadRef.current.voiceConfirmed && isVoiceContinued)) {
          vadRef.current.consecutiveVoiceFrames++;
          vadRef.current.consecutiveSilenceFrames = 0;
          
          // Confirm voice activity after consistent detection
          if (!vadRef.current.voiceConfirmed && 
              vadRef.current.consecutiveVoiceFrames >= (VAD_CONFIG.VOICE_CONFIRMATION_TIME / VAD_CONFIG.METERING_INTERVAL)) {
            
            vadRef.current.voiceConfirmed = true;
            vadRef.current.voiceStartTime = currentTime;
            
            setVadState(prev => ({
              ...prev,
              voiceDetected: true,
              voiceDuration: 0,
              silenceDuration: 0
            }));
            
            addLog(`🗣️ VOICE CONFIRMED! Level: ${smoothedLevel.toFixed(1)}dB (threshold: ${threshold.toFixed(1)}dB)`);
            vadRef.current.onVoiceStart?.();
          }
          
          vadRef.current.lastVoiceTime = currentTime;
          
        } else {
          vadRef.current.consecutiveSilenceFrames++;
          vadRef.current.consecutiveVoiceFrames = 0;
        }

        // Update timing information
        if (vadRef.current.voiceConfirmed && vadRef.current.voiceStartTime) {
          const voiceDuration = (vadRef.current.lastVoiceTime || currentTime) - vadRef.current.voiceStartTime;
          const silenceDuration = vadRef.current.lastVoiceTime ? currentTime - vadRef.current.lastVoiceTime : 0;
          
          setVadState(prev => ({
            ...prev,
            voiceDuration,
            silenceDuration
          }));

          // Check for end of speech
          if (silenceDuration >= VAD_CONFIG.SILENCE_DURATION && 
              voiceDuration >= VAD_CONFIG.MIN_VOICE_DURATION) {
            
            addLog(`🔇 SPEECH COMPLETED!`);
            addLog(`   Voice duration: ${(voiceDuration/1000).toFixed(1)}s`);
            addLog(`   Silence duration: ${(silenceDuration/1000).toFixed(1)}s`);
            addLog(`   Final level: ${smoothedLevel.toFixed(1)}dB`);
            
            vadRef.current.onSilenceDetected?.();
            stopVAD();
            return;
          }
        }

        // Maximum recording timeout
        const totalDuration = currentTime - vadRef.current.recordingStartTime;
        if (totalDuration > VAD_CONFIG.MAX_RECORDING_TIME) {
          addLog(`⏰ MAXIMUM RECORDING TIME REACHED (${VAD_CONFIG.MAX_RECORDING_TIME/1000}s)`);
          
          if (vadRef.current.voiceConfirmed && vadRef.current.voiceStartTime) {
            const voiceDuration = (vadRef.current.lastVoiceTime || currentTime) - vadRef.current.voiceStartTime;
            if (voiceDuration >= VAD_CONFIG.MIN_VOICE_DURATION) {
              addLog('✅ Processing speech due to timeout...');
              vadRef.current.onSilenceDetected?.();
            } else {
              addLog('❌ Insufficient speech detected, restarting...');
              vadRef.current.onVoiceEnd?.();
            }
          } else {
            addLog('❌ No voice detected during timeout, restarting...');
            vadRef.current.onVoiceEnd?.();
          }
          
          stopVAD();
          return;
        }

        // Periodic status logging (every 3 seconds)
        if (Math.floor(currentTime / 3000) !== Math.floor((currentTime - VAD_CONFIG.METERING_INTERVAL) / 3000)) {
          const statusMsg = vadRef.current.voiceConfirmed ? 
            `Speaking (${((currentTime - vadRef.current.voiceStartTime)/1000).toFixed(1)}s)` :
            'Waiting for voice...';
          addLog(`📊 VAD: ${statusMsg} | Level: ${smoothedLevel.toFixed(1)}dB | Confidence: ${Math.round(vadState.confidenceLevel)}%`);
        }

      } catch (error) {
        addLog(`❌ VAD Loop Error: ${error.message}`);
        vadRef.current.onVoiceEnd?.();
        stopVAD();
      }
    }, VAD_CONFIG.METERING_INTERVAL);

    addLog(`⚡ Enhanced VAD loop started (${VAD_CONFIG.METERING_INTERVAL}ms intervals)`);
    addLog(`🎯 Detection: Voice threshold ${vadState.adaptiveThreshold?.toFixed(1) || VAD_CONFIG.VOICE_THRESHOLD}dB, Silence timeout ${VAD_CONFIG.SILENCE_DURATION}ms`);
  };

  /**
   * Stop the VAD system and clean up
   */
  const stopVAD = () => {
    addLog('🛑 === STOPPING ENHANCED VAD SYSTEM ===');
    
    vadRef.current.isActive = false;
    
    if (vadRef.current.meteringTimer) {
      clearInterval(vadRef.current.meteringTimer);
      vadRef.current.meteringTimer = null;
    }
    
    // Reset state
    setVadState({
      isListening: false,
      isCalibrating: false,
      voiceDetected: false,
      backgroundNoise: -60,
      currentLevel: -60,
      adaptiveThreshold: VAD_CONFIG.VOICE_THRESHOLD,
      voiceDuration: 0,
      silenceDuration: 0,
      confidenceLevel: 0,
    });
    
    // Reset internal state
    vadRef.current.voiceConfirmed = false;
    vadRef.current.voiceStartTime = null;
    vadRef.current.lastVoiceTime = null;
    vadRef.current.consecutiveVoiceFrames = 0;
    vadRef.current.consecutiveSilenceFrames = 0;
    
    addLog('✅ Enhanced VAD system stopped and reset');
  };

  return {
    vadState,
    initializeVAD,
    stopVAD,
    isActive: vadRef.current.isActive,
    config: VAD_CONFIG,
  };
};

/**
 * Utility function to create optimized recording options for voice detection
 */
export const getVADRecordingOptions = () => ({
  android: {
    extension: '.m4a',
    outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
    audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
    sampleRate: 16000,        // Optimal for speech recognition
    numberOfChannels: 1,      // Mono for speech
    bitRate: 64000,          // Good quality for speech
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
});

export default { useVoiceActivityDetection, getVADRecordingOptions, VAD_CONFIG };