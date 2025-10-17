import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TooltipContext = createContext();

export const useTooltips = () => {
  const context = useContext(TooltipContext);
  if (!context) {
    throw new Error('useTooltips must be used within TooltipProvider');
  }
  return context;
};

export const TooltipProvider = ({ children }) => {
  const [tooltipsEnabled, setTooltipsEnabled] = useState(true);
  const [currentStep, setCurrentStep] = useState(null);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [isFirstLogin, setIsFirstLogin] = useState(false);

  const TUTORIAL_STEPS = {
    WELCOME: 'welcome',
    ADD_CHILD: 'add_child',
    CHAT_WITH_SANTA: 'chat_with_santa',
    VIEW_WISHLIST: 'view_wishlist',
    COMPLETE: 'complete'
  };

  useEffect(() => {
    loadTooltipPreferences();
  }, []);

  const loadTooltipPreferences = async () => {
    try {
      const enabled = await AsyncStorage.getItem('tooltipsEnabled');
      const completed = await AsyncStorage.getItem('completedSteps');
      const firstLogin = await AsyncStorage.getItem('isFirstLogin');

      setTooltipsEnabled(enabled !== 'false');
      setCompletedSteps(completed ? JSON.parse(completed) : []);

      if (firstLogin === null) {
        setIsFirstLogin(true);
        setCurrentStep(TUTORIAL_STEPS.WELCOME);
        await AsyncStorage.setItem('isFirstLogin', 'false');
      }
    } catch (error) {
      console.error('Error loading tooltip preferences:', error);
    }
  };

  const toggleTooltips = async (enabled) => {
    try {
      setTooltipsEnabled(enabled);
      await AsyncStorage.setItem('tooltipsEnabled', enabled.toString());

      if (!enabled) {
        setCurrentStep(null);
      }
    } catch (error) {
      console.error('Error toggling tooltips:', error);
    }
  };

  const completeStep = async (step) => {
    try {
      const updated = [...completedSteps, step];
      setCompletedSteps(updated);
      await AsyncStorage.setItem('completedSteps', JSON.stringify(updated));

      const stepOrder = Object.values(TUTORIAL_STEPS);
      const currentIndex = stepOrder.indexOf(step);
      if (currentIndex < stepOrder.length - 1) {
        setCurrentStep(stepOrder[currentIndex + 1]);
      } else {
        setCurrentStep(null);
      }
    } catch (error) {
      console.error('Error completing step:', error);
    }
  };

  const resetTutorial = async () => {
    try {
      setCompletedSteps([]);
      setCurrentStep(TUTORIAL_STEPS.WELCOME);
      await AsyncStorage.setItem('completedSteps', JSON.stringify([]));
    } catch (error) {
      console.error('Error resetting tutorial:', error);
    }
  };

  const startTutorial = () => {
    setCurrentStep(TUTORIAL_STEPS.WELCOME);
  };

  const skipTutorial = async () => {
    try {
      setCurrentStep(null);
      const allSteps = Object.values(TUTORIAL_STEPS);
      setCompletedSteps(allSteps);
      await AsyncStorage.setItem('completedSteps', JSON.stringify(allSteps));
    } catch (error) {
      console.error('Error skipping tutorial:', error);
    }
  };

  const shouldShowTooltip = (step) => {
    return tooltipsEnabled && currentStep === step && !completedSteps.includes(step);
  };

  const value = {
    tooltipsEnabled,
    currentStep,
    completedSteps,
    isFirstLogin,
    TUTORIAL_STEPS,
    toggleTooltips,
    completeStep,
    resetTutorial,
    startTutorial,
    skipTutorial,
    shouldShowTooltip,
    setCurrentStep
  };

  return (
    <TooltipContext.Provider value={value}>
      {children}
    </TooltipContext.Provider>
  );
};