// screens/SettingsScreen.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  Alert
} from 'react-native';
import { useTooltips } from '../context/TooltipContext';
import { cleanupOrphanedFiles } from '../services/localAudioService';

const SettingsScreen = ({ navigation }) => {
  const { 
    tooltipsEnabled, 
    toggleTooltips, 
    resetTutorial,
    completedSteps,
    TUTORIAL_STEPS
  } = useTooltips();

  const handleToggleTooltips = async (value) => {
    await toggleTooltips(value);
  };

  const handleResetTutorial = () => {
    Alert.alert(
      'Reset Tutorial',
      'This will restart the tutorial from the beginning. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await resetTutorial();
            Alert.alert('Success', 'Tutorial has been reset. You can start it from the dashboard.');
          }
        }
      ]
    );
  };

  const handleCleanupStorage = () => {
    Alert.alert(
      'Clean Up Storage',
      'This will remove any orphaned audio files that are no longer needed. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clean Up',
          onPress: async () => {
            try {
              await cleanupOrphanedFiles();
              Alert.alert('Success', 'Storage cleaned up successfully!');
            } catch (error) {
              Alert.alert('Error', 'Failed to clean up storage.');
            }
          }
        }
      ]
    );
  };

  const tutorialProgress = () => {
    const totalSteps = Object.keys(TUTORIAL_STEPS).length - 1; // Exclude COMPLETE
    const completed = completedSteps.length;
    return `${completed}/${totalSteps}`;
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* App Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Settings</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Tutorial Tips</Text>
              <Text style={styles.settingDescription}>
                Show helpful tips as you use the app
              </Text>
            </View>
            <Switch
              value={tooltipsEnabled}
              onValueChange={handleToggleTooltips}
              trackColor={{ false: '#ddd', true: '#c41e3a' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Tutorial Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tutorial</Text>
          
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Progress:</Text>
            <Text style={styles.infoValue}>{tutorialProgress()} steps completed</Text>
          </View>

          <TouchableOpacity 
            style={styles.button}
            onPress={handleResetTutorial}
          >
            <Text style={styles.buttonText}>Reset Tutorial</Text>
          </TouchableOpacity>
        </View>

        {/* Storage Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Storage</Text>
          
          <View style={styles.infoBox}>
            <Text style={styles.infoDescription}>
              Audio recordings are stored locally on your device for privacy and security.
            </Text>
          </View>

          <TouchableOpacity 
            style={[styles.button, styles.buttonSecondary]}
            onPress={handleCleanupStorage}
          >
            <Text style={styles.buttonText}>Clean Up Storage</Text>
          </TouchableOpacity>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Version:</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoDescription}>
              Call Santa - A magical experience for children to chat with Santa and create their wishlist.
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa'
  },
  content: {
    padding: 20
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a472a',
    marginBottom: 16
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8
  },
  settingInfo: {
    flex: 1,
    marginRight: 16
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  settingDescription: {
    fontSize: 14,
    color: '#666'
  },
  infoBox: {
    marginBottom: 12
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4
  },
  infoValue: {
    fontSize: 16,
    color: '#333'
  },
  infoDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20
  },
  button: {
    backgroundColor: '#c41e3a',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8
  },
  buttonSecondary: {
    backgroundColor: '#1a472a'
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  }
});

export default SettingsScreen;
