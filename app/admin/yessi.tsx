import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Send, Bot, User, Sparkles, TrendingUp, ShoppingBag, Users, HelpCircle } from 'lucide-react-native';
import Colors from '@/constants/colors';
import TouchableSound from '@/components/TouchableSound';
import { processYessiQuery, getYessiGreeting, YessiMessage, YessiDataResult } from '@/services/yessi-bi';

export default function YessiScreen() {
  const [messages, setMessages] = useState<YessiMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    // Saludo inicial de Yessi
    const greeting: YessiMessage = {
      id: 'greeting',
      role: 'yessi',
      content: getYessiGreeting(),
      timestamp: new Date().toISOString(),
    };
    setMessages([greeting]);
  }, []);

  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;

    const userMsg: YessiMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const result = await processYessiQuery(messageText);

      const yessiMsg: YessiMessage = {
        id: `yessi-${Date.now()}`,
        role: 'yessi',
        content: result.text,
        timestamp: new Date().toISOString(),
        data: result.data,
      };

      setMessages(prev => [...prev, yessiMsg]);
    } catch (error) {
      const errorMsg: YessiMessage = {
        id: `error-${Date.now()}`,
        role: 'yessi',
        content: 'Lo siento, hubo un error al procesar tu consulta. Intenta de nuevo.',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
    }
  };

  const quickActions = [
    { label: 'Como vamos?', icon: TrendingUp, query: 'Como vamos hoy?' },
    { label: 'Top Negocios', icon: ShoppingBag, query: 'Negocios con mas ventas' },
    { label: 'Top Drivers', icon: Users, query: 'Mejores repartidores' },
    { label: 'Ayuda', icon: HelpCircle, query: 'ayuda' },
  ];

  const renderDataResult = (data: YessiDataResult) => (
    <View style={styles.dataContainer}>
      <Text style={styles.dataTitle}>{data.title}</Text>
      {data.rows?.map((row, i) => (
        <View key={i} style={styles.dataRow}>
          <Text style={styles.dataLabel} numberOfLines={1}>{row.label}</Text>
          <View style={styles.dataValues}>
            <Text style={styles.dataValue}>{row.value}</Text>
            {row.extra && <Text style={styles.dataExtra}>{row.extra}</Text>}
          </View>
        </View>
      ))}
    </View>
  );

  const renderMessage = (msg: YessiMessage) => {
    const isYessi = msg.role === 'yessi';

    return (
      <View key={msg.id} style={[styles.messageRow, isYessi ? styles.yessiRow : styles.userRow]}>
        {isYessi && (
          <View style={styles.avatarYessi}>
            <Bot size={18} color={Colors.white} />
          </View>
        )}
        <View style={[styles.bubble, isYessi ? styles.yessiBubble : styles.userBubble]}>
          <Text style={[styles.messageText, isYessi ? styles.yessiText : styles.userText]}>
            {msg.content}
          </Text>
          {msg.data && renderDataResult(msg.data)}
        </View>
        {!isYessi && (
          <View style={styles.avatarUser}>
            <User size={18} color={Colors.white} />
          </View>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      {/* Quick Actions */}
      {messages.length <= 1 && (
        <View style={styles.quickActions}>
          <View style={styles.quickHeader}>
            <Sparkles size={16} color={Colors.gold} />
            <Text style={styles.quickTitle}>Consultas rapidas</Text>
          </View>
          <View style={styles.quickGrid}>
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <TouchableSound
                  key={action.label}
                  style={styles.quickButton}
                  onPress={() => sendMessage(action.query)}
                  activeOpacity={0.7}
                >
                  <Icon size={20} color={Colors.primary} />
                  <Text style={styles.quickLabel}>{action.label}</Text>
                </TouchableSound>
              );
            })}
          </View>
        </View>
      )}

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.messageList}
        contentContainerStyle={styles.messageContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map(renderMessage)}

        {isLoading && (
          <View style={[styles.messageRow, styles.yessiRow]}>
            <View style={styles.avatarYessi}>
              <Bot size={18} color={Colors.white} />
            </View>
            <View style={[styles.bubble, styles.yessiBubble]}>
              <View style={styles.typingIndicator}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.typingText}>Consultando datos...</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Preguntale a Yessi..."
          placeholderTextColor={Colors.text.light}
          multiline
          maxLength={500}
          onSubmitEditing={() => sendMessage()}
          returnKeyType="send"
          editable={!isLoading}
        />
        <TouchableSound
          style={[styles.sendButton, (!input.trim() || isLoading) && styles.sendButtonDisabled]}
          onPress={() => sendMessage()}
          disabled={!input.trim() || isLoading}
          activeOpacity={0.7}
        >
          <Send size={20} color={Colors.white} />
        </TouchableSound>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },

  // Quick Actions
  quickActions: {
    padding: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  quickHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  quickTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: `${Colors.primary}10`,
    borderWidth: 1,
    borderColor: `${Colors.primary}30`,
  },
  quickLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },

  // Messages
  messageList: {
    flex: 1,
  },
  messageContent: {
    padding: 16,
    paddingBottom: 8,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  yessiRow: {
    justifyContent: 'flex-start',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  avatarYessi: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginTop: 4,
  },
  avatarUser: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    marginTop: 4,
  },
  bubble: {
    maxWidth: '75%',
    borderRadius: 16,
    padding: 12,
  },
  yessiBubble: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 4,
    shadowColor: Colors.shadow.light,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 1,
  },
  userBubble: {
    backgroundColor: Colors.primary,
    borderTopRightRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  yessiText: {
    color: Colors.text.primary,
  },
  userText: {
    color: Colors.white,
  },

  // Data Results
  dataContainer: {
    marginTop: 10,
    backgroundColor: Colors.background.secondary,
    borderRadius: 10,
    padding: 10,
  },
  dataTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 8,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border.light,
  },
  dataLabel: {
    fontSize: 13,
    color: Colors.text.primary,
    flex: 1,
    marginRight: 8,
  },
  dataValues: {
    alignItems: 'flex-end',
  },
  dataValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  dataExtra: {
    fontSize: 11,
    color: Colors.text.secondary,
    marginTop: 1,
  },

  // Typing
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typingText: {
    fontSize: 13,
    color: Colors.text.secondary,
    fontStyle: 'italic',
  },

  // Input
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text.primary,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.lightGray,
  },
});
