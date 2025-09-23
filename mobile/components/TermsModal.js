// mobile/components/TermsModal.js
import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';

export default function TermsModal({ visible, onAccept }) {
  return (
    <Modal 
      visible={visible} 
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Terms & Privacy</Text>
          <Text style={styles.subtitle}>Please review before continuing</Text>
        </View>
        
        <ScrollView style={styles.content} showsVerticalScrollIndicator={true}>
          <Text style={styles.sectionTitle}>Privacy Policy</Text>
          <Text style={styles.text}>
            Your privacy is important to us. This Santa call app collects and processes:
            {'\n\n'}• Audio recordings during Santa conversations
            {'\n'}• Child profile information (name, age, gender, preferences)
            {'\n'}• Usage data to improve the experience
            {'\n'}• Device information for technical support
            {'\n\n'}Audio recordings are processed securely through OpenAI Whisper for speech recognition and are not permanently stored on our servers.
          </Text>
          
          <Text style={styles.sectionTitle}>Third-Party Services</Text>
          <Text style={styles.text}>
            We use the following services to provide Santa conversations:
            {'\n\n'}• OpenAI (speech-to-text and AI responses)
            {'\n'}• ElevenLabs (text-to-speech for Santa's voice)
            {'\n\n'}Your data may be processed by these services in accordance with their respective privacy policies.
          </Text>
          
          <Text style={styles.sectionTitle}>Terms of Service</Text>
          <Text style={styles.text}>
            By using this app, you agree to:
            {'\n\n'}• Use the service responsibly and appropriately
            {'\n'}• Provide accurate information about your children
            {'\n'}• Supervise children during all Santa calls
            {'\n'}• Not attempt to misuse, hack, or reverse engineer the service
            {'\n'}• Not use the app for any illegal or harmful purposes
            {'\n\n'}The service is provided "as is" without warranties. We reserve the right to modify or discontinue the service at any time.
          </Text>
          
          <Text style={styles.sectionTitle}>Children's Safety</Text>
          <Text style={styles.text}>
            This app is designed for family use under parental supervision. We are committed to protecting children's privacy and safety online. Parents should always supervise their children's use of this app.
          </Text>
        </ScrollView>
        
        <View style={styles.footer}>
          <TouchableOpacity style={styles.acceptButton} onPress={onAccept}>
            <Text style={styles.acceptButtonText}>I Accept & Continue</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
    marginTop: 5,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: '#b71c1c',
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
    color: '#444',
    marginBottom: 15,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  acceptButton: {
    backgroundColor: '#b71c1c',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});