import React, { useState, useContext } from 'react';
import {
  View,
  TextInput,
  Button,
  FlatList,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Audio } from 'expo-av'; // 🎵 play Santa’s voice
import { AuthContext } from '../context/AuthContext';
import { chatWithSanta } from '../services/aiService';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig.extra?.apiBaseUrl || "http://localhost:5000";

export default function SantaChatScreen({ route }) {
  const childId = route?.params?.childId; // ✅ safe access
  const { token } = useContext(AuthContext);

  // If no childId, show an error screen
  if (!childId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          No child selected. Please go back and select a child before chatting with Santa.
        </Text>
      </View>
    );
  }

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);

  const sendMessage = async () => {
    if (!childId) return; // extra guard
    if (!input.trim()) return;

    const newMessage = { id: Date.now().toString(), text: input, sender: 'child' };
    setMessages((prev) => [...prev, newMessage]);
    setInput('');
    setLoading(true);

    try {
      const { reply, audioUrl } = await chatWithSanta(childId, input, token);

      const santaMessage = {
        id: Date.now().toString() + '-santa',
        text: reply || "Ho ho ho! Santa didn’t quite catch that.",
        sender: 'santa',
      };
      setMessages((prev) => [...prev, santaMessage]);

      if (audioUrl) {
        const sound = new Audio.Sound();
        try {
          const uri = audioUrl.startsWith('http') ? audioUrl : `${API_URL}${audioUrl}`;
          await sound.loadAsync({ uri });
          setPlaying(true);
          sound.setOnPlaybackStatusUpdate(async (status) => {
            if (status.didJustFinish) {
              setPlaying(false);
              await sound.unloadAsync();
            }
          });
          await sound.playAsync();
        } catch (err) {
          console.error("Santa voice play error:", err);
          setPlaying(false);
        }
      }
    } catch (error) {
      console.error("Santa chat error:", error.message);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString() + '-error',
          text: "Oops! Santa’s busy feeding the reindeer 🦌. Try again soon!",
          sender: 'santa',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => (
    <View
      style={[
        styles.messageContainer,
        item.sender === 'child' ? styles.childMessage : styles.santaMessage,
      ]}
    >
      <Text style={styles.messageText}>{item.text}</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <FlatList
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.chatContainer}
      />

      {playing && (
        <Text style={styles.playingIndicator}>🎅 Santa is speaking...</Text>
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Write your message to Santa..."
          value={input}
          onChangeText={setInput}
          editable={!loading && !playing}
        />
        {loading ? (
          <ActivityIndicator size="small" color="#d62828" style={{ marginLeft: 10 }} />
        ) : (
          <Button title="Send" onPress={sendMessage} disabled={playing} />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  chatContainer: { padding: 10 },
  messageContainer: {
    padding: 10,
    borderRadius: 10,
    marginVertical: 5,
    maxWidth: '80%',
  },
  childMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#DCF8C6',
  },
  santaMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFEBEE',
  },
  messageText: { fontSize: 16 },
  playingIndicator: {
    textAlign: 'center',
    color: '#d62828',
    marginVertical: 5,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    paddingHorizontal: 15,
    marginRight: 10,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#d62828',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
