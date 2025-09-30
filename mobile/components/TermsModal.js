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
          <Text style={styles.title}>Terms & Privacy Policy</Text>
          <Text style={styles.subtitle}>Last Updated: September 30, 2025</Text>
        </View>
        
        <ScrollView style={styles.content} showsVerticalScrollIndicator={true}>
          
          <Text style={styles.sectionTitle}>1. Introduction</Text>
          <Text style={styles.text}>
            Welcome to Call Santa ("we," "our," or "the App"). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application. This policy applies to all users, including parents and children.
            {'\n\n'}
            By using the App, you agree to the collection and use of information in accordance with this policy. If you do not agree with our policies and practices, please do not use the App.
          </Text>

          <Text style={styles.sectionTitle}>2. Information We Collect</Text>
          
          <Text style={styles.subsectionTitle}>2.1 Personal Information</Text>
          <Text style={styles.text}>
            When you register and use the App, we collect:
            {'\n\n'}
            • <Text style={styles.bold}>Account Information:</Text> Name, email address, and password (encrypted)
            {'\n'}
            • <Text style={styles.bold}>Child Profile Data:</Text> Child's name, age, gender, and phonetic name spelling
            {'\n'}
            • <Text style={styles.bold}>Authentication Data:</Text> Social login credentials (Google/Apple sign-in tokens)
          </Text>

          <Text style={styles.subsectionTitle}>2.2 Audio Recordings</Text>
          <Text style={styles.text}>
            During "Santa calls," we collect and process:
            {'\n\n'}
            • <Text style={styles.bold}>Voice Recordings:</Text> Audio recordings of conversations between children and the AI-powered Santa character
            {'\n'}
            • <Text style={styles.bold}>Transcriptions:</Text> Text transcriptions of spoken conversations
            {'\n'}
            • <Text style={styles.bold}>Storage:</Text> Audio files are stored on our secure servers and associated with your account
            {'\n'}
            • <Text style={styles.bold}>Retention:</Text> Recordings are retained until you delete them or close your account
          </Text>

          <Text style={styles.subsectionTitle}>2.3 Usage Data</Text>
          <Text style={styles.text}>
            We automatically collect:
            {'\n\n'}
            • Device information (model, operating system, unique device identifiers)
            {'\n'}
            • App usage statistics (features used, session duration, timestamps)
            {'\n'}
            • IP address and approximate geographic location
            {'\n'}
            • Crash reports and diagnostic data
          </Text>

          <Text style={styles.sectionTitle}>3. How We Use Your Information</Text>
          <Text style={styles.text}>
            We use collected information for:
            {'\n\n'}
            • <Text style={styles.bold}>Service Delivery:</Text> Providing AI-powered Santa conversations, generating responses, and creating voice audio
            {'\n'}
            • <Text style={styles.bold}>Personalization:</Text> Customizing Santa's responses based on child profiles and conversation history
            {'\n'}
            • <Text style={styles.bold}>Wishlist Generation:</Text> Analyzing conversation transcripts to extract gift preferences
            {'\n'}
            • <Text style={styles.bold}>Account Management:</Text> Creating and maintaining user accounts, authentication, and password recovery
            {'\n'}
            • <Text style={styles.bold}>Technical Support:</Text> Troubleshooting issues and improving app performance
            {'\n'}
            • <Text style={styles.bold}>Legal Compliance:</Text> Complying with applicable laws and responding to legal requests
          </Text>

          <Text style={styles.sectionTitle}>4. Third-Party Service Providers</Text>
          <Text style={styles.text}>
            We share data with the following third-party services to operate the App:
          </Text>

          <Text style={styles.subsectionTitle}>4.1 OpenAI</Text>
          <Text style={styles.text}>
            • <Text style={styles.bold}>Purpose:</Text> Speech-to-text transcription (Whisper API) and AI conversation generation (GPT-4)
            {'\n'}
            • <Text style={styles.bold}>Data Shared:</Text> Audio recordings, transcriptions, child names and ages
            {'\n'}
            • <Text style={styles.bold}>Privacy Policy:</Text> https://openai.com/privacy
            {'\n'}
            • <Text style={styles.bold}>Data Retention:</Text> Per OpenAI's API data usage policies
          </Text>

          <Text style={styles.subsectionTitle}>4.2 ElevenLabs</Text>
          <Text style={styles.text}>
            • <Text style={styles.bold}>Purpose:</Text> Text-to-speech voice generation for Santa's responses
            {'\n'}
            • <Text style={styles.bold}>Data Shared:</Text> Generated text responses (does not include child audio)
            {'\n'}
            • <Text style={styles.bold}>Privacy Policy:</Text> https://elevenlabs.io/privacy
          </Text>

          <Text style={styles.subsectionTitle}>4.3 Authentication Providers</Text>
          <Text style={styles.text}>
            • <Text style={styles.bold}>Google Sign-In:</Text> OAuth tokens, email, display name
            {'\n'}
            • <Text style={styles.bold}>Apple Sign-In:</Text> OAuth tokens, email (may be private relay), display name
          </Text>

          <Text style={styles.sectionTitle}>5. Children's Privacy (COPPA Compliance)</Text>
          <Text style={styles.text}>
            We take children's privacy seriously and comply with the Children's Online Privacy Protection Act (COPPA):
            {'\n\n'}
            • <Text style={styles.bold}>Parental Consent:</Text> The App requires parental account creation and supervision. By creating child profiles, parents provide verifiable consent for data collection.
            {'\n'}
            • <Text style={styles.bold}>Limited Collection:</Text> We collect only information necessary to provide the service
            {'\n'}
            • <Text style={styles.bold}>No Direct Marketing:</Text> We do not use children's information for marketing purposes
            {'\n'}
            • <Text style={styles.bold}>Parental Control:</Text> Parents can review, modify, or delete their children's information at any time
            {'\n'}
            • <Text style={styles.bold}>Supervision Required:</Text> Parents must supervise all Santa calls
          </Text>

          <Text style={styles.sectionTitle}>6. Data Security</Text>
          <Text style={styles.text}>
            We implement industry-standard security measures:
            {'\n\n'}
            • <Text style={styles.bold}>Encryption:</Text> Data transmitted over HTTPS; passwords hashed with bcrypt
            {'\n'}
            • <Text style={styles.bold}>Access Controls:</Text> Authentication required; role-based access to data
            {'\n'}
            • <Text style={styles.bold}>Secure Storage:</Text> Audio files and database records stored on protected servers
            {'\n'}
            • <Text style={styles.bold}>Regular Updates:</Text> Software and security patches applied regularly
            {'\n\n'}
            However, no method of transmission over the internet or electronic storage is 100% secure. We cannot guarantee absolute security.
          </Text>

          <Text style={styles.sectionTitle}>7. Your Rights and Choices</Text>
          <Text style={styles.text}>
            You have the right to:
            {'\n\n'}
            • <Text style={styles.bold}>Access:</Text> Request copies of your personal data and audio recordings
            {'\n'}
            • <Text style={styles.bold}>Correction:</Text> Update or correct inaccurate information
            {'\n'}
            • <Text style={styles.bold}>Deletion:</Text> Request deletion of your account and all associated data (including audio recordings)
            {'\n'}
            • <Text style={styles.bold}>Data Portability:</Text> Receive your data in a portable format
            {'\n'}
            • <Text style={styles.bold}>Withdraw Consent:</Text> Stop using the service at any time
            {'\n'}
            • <Text style={styles.bold}>Object to Processing:</Text> Object to certain data processing activities
            {'\n\n'}
            To exercise these rights, contact us through the app settings or email.
          </Text>

          <Text style={styles.sectionTitle}>8. Data Retention</Text>
          <Text style={styles.text}>
            We retain your information for as long as your account is active or as needed to provide services. Specifically:
            {'\n\n'}
            • <Text style={styles.bold}>Account Data:</Text> Retained until account deletion
            {'\n'}
            • <Text style={styles.bold}>Audio Recordings:</Text> Stored indefinitely until manually deleted or account closure
            {'\n'}
            • <Text style={styles.bold}>Transcriptions:</Text> Stored with audio recordings
            {'\n'}
            • <Text style={styles.bold}>Usage Logs:</Text> Retained for up to 90 days
            {'\n\n'}
            Upon account deletion, we will permanently delete all personal information within 30 days, except where retention is required by law.
          </Text>

          <Text style={styles.sectionTitle}>9. International Data Transfers</Text>
          <Text style={styles.text}>
            Your information may be transferred to and processed in countries other than your country of residence. These countries may have different data protection laws. By using the App, you consent to such transfers.
          </Text>

          <Text style={styles.sectionTitle}>10. Changes to This Policy</Text>
          <Text style={styles.text}>
            We may update this Privacy Policy from time to time. We will notify you of material changes by:
            {'\n\n'}
            • Posting the new Privacy Policy in the App
            {'\n'}
            • Updating the "Last Updated" date
            {'\n'}
            • Requiring re-acceptance for significant changes
            {'\n\n'}
            Continued use of the App after changes constitutes acceptance of the updated policy.
          </Text>

          <Text style={styles.sectionTitle}>11. Terms of Service</Text>
          
          <Text style={styles.subsectionTitle}>11.1 Acceptable Use</Text>
          <Text style={styles.text}>
            You agree to:
            {'\n\n'}
            • Use the service lawfully and appropriately
            {'\n'}
            • Provide accurate information
            {'\n'}
            • Supervise children during all Santa calls
            {'\n'}
            • Maintain the security of your account credentials
            {'\n'}
            • Not attempt to hack, reverse engineer, or misuse the service
            {'\n'}
            • Not use the service for illegal, harmful, or fraudulent purposes
          </Text>

          <Text style={styles.subsectionTitle}>11.2 Service Availability</Text>
          <Text style={styles.text}>
            The service is provided "as is" without warranties of any kind. We do not guarantee:
            {'\n\n'}
            • Uninterrupted or error-free operation
            {'\n'}
            • Accuracy or reliability of AI-generated content
            {'\n'}
            • Compatibility with all devices or operating systems
            {'\n\n'}
            We reserve the right to modify, suspend, or discontinue the service at any time without notice.
          </Text>

          <Text style={styles.subsectionTitle}>11.3 Limitation of Liability</Text>
          <Text style={styles.text}>
            To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the App.
          </Text>

          <Text style={styles.sectionTitle}>12. Contact Information</Text>
          <Text style={styles.text}>
            For questions about this Privacy Policy or to exercise your rights, contact us:
            {'\n\n'}
            Email: privacy@callsanta.app
            {'\n'}
            In-App: Settings → Support → Privacy Inquiry
          </Text>

          <Text style={styles.sectionTitle}>13. Governing Law</Text>
          <Text style={styles.text}>
            This Privacy Policy and Terms of Service shall be governed by and construed in accordance with applicable laws. Any disputes shall be resolved in the appropriate jurisdiction.
          </Text>

          <View style={{ height: 40 }} />
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
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#f8f8f8',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
  },
  subtitle: {
    fontSize: 12,
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
    marginTop: 25,
    marginBottom: 10,
    color: '#b71c1c',
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 15,
    marginBottom: 8,
    color: '#333',
  },
  text: {
    fontSize: 13,
    lineHeight: 20,
    color: '#444',
    marginBottom: 12,
  },
  bold: {
    fontWeight: '600',
    color: '#222',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#f8f8f8',
  },
  acceptButton: {
    backgroundColor: '#b71c1c',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});