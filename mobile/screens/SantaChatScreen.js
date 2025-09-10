import React, { useState, useContext } from 'react';
import { View, TextInput, Button, FlatList, Text, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';

export default function SantaChatScreen({ route }) {
  const { childId } = route.params; // Pass the child's ID when navigating
  const { user, token } = useContext(AuthContext);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const newMessage = { text: input, sender: 'child' };
    setMessages([...messages, newMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await axios.post(
        `http://localhost:5000/api/ai/chat/${childId}`,
        { message: input },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const santaReply = response.data.reply;
      setMessages(prev => [...prev, { text: santaReply, sender: 'santa' }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { text: "Oops! Santa is busy right now.", sender: 'santa' }]);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => (
    <View style={[styles.messageContainer, item.sender === 'child' ? styles.childMessage : styles.santaMessage]}>
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
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={styles.chatContainer}
      />
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type your message..."
          value={input}
          onChangeText={setInput}
        />
        <Button title={loading ? "..." : "Send"} onPress={sendMessage} disabled={loading} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  chatContainer: { padding: 10 },
  messageContainer: { padding: 10, borderRadius: 10, marginVertical: 5, maxWidth: '80%' },
  childMessage: { alignSelf: 'flex-end', backgroundColor: '#DCF8C6' },
  santaMessage: { alignSelf: 'flex-start', backgroundColor: '#EEE' },
  messageText: { fontSize: 16 },
  inputContainer: { flexDirection: 'row', padding: 10, borderTopWidth: 1, borderColor: '#ccc' },
  input: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 20, paddingHorizontal: 15, marginRight: 10 },
});
