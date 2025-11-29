import { ConversationSidebar } from "@/components/conversation-sidebar";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors, getProseStyles } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { generateAPIUrl } from "@/utils";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import Markdown from "react-native-markdown-display";

// 定义消息结构
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function App() {
  const [isMounted, setIsMounted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);

  const { t, i18n } = useTranslation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const proseStyles = getProseStyles(isDark);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: userText };
    
    // 1. UI 立即显示用户消息
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      // 2. 发起请求
      const response = await fetch(generateAPIUrl("/api/chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({
            role: m.role,
            content: m.content
          })),
          language: i18n.language
        })
      });

      if (!response.ok) throw new Error("Network error");

      // 3. 准备接收 AI 消息
      const aiMsgId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { id: aiMsgId, role: 'assistant', content: '' }]);

      // 4. 读取流
      if (!response.body) throw new Error("No body");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value, { stream: true });
        
        // 简单清洗 Vercel AI SDK 的协议前缀 (0:"...")
        // 这行正则去掉了大部分协议噪音，只保留文本
        const cleanChunk = chunkValue
          .replace(/^0:"/gm, '') 
          .replace(/"$/gm, '')
          .replace(/\\n/g, '\n'); 

        setMessages(prev => 
          prev.map(msg => 
            msg.id === aiMsgId 
              ? { ...msg, content: msg.content + cleanChunk } 
              : msg
          )
        );
      }
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: "⚠️ 出错啦，请重试。" }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isMounted) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.backgroundSecondary }]}>
      <View style={styles.mainLayout}>
        {sidebarVisible && (
          <View style={[styles.sidebar, { borderRightColor: '#333333' }]}>
            <ConversationSidebar onClose={() => setSidebarVisible(false)} />
          </View>
        )}

        <View style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
          <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setSidebarVisible(!sidebarVisible)} style={[styles.menuButton, { backgroundColor: colors.accent }]}>
              <Text style={styles.menuButtonText}>{sidebarVisible ? "✕" : "☰"}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.map((m) => (
              <View key={m.id} style={[styles.messageWrapper, m.role === "user" && styles.userMessageWrapper]}>
                <View style={[styles.messageBubble, { backgroundColor: m.role === "user" ? colors.userMessage : colors.aiMessage, borderColor: colors.border }]}>
                  <Markdown style={proseStyles}>
                    {m.content}
                  </Markdown>
                </View>
              </View>
            ))}
            {isLoading && (
              <View style={{ padding: 10 }}>
                <ActivityIndicator color={colors.accent} />
              </View>
            )}
          </ScrollView>

          <View style={[styles.inputContainer, { backgroundColor: colors.background, borderTopColor: colors.border, flexDirection: "row" }]}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.input, borderColor: colors.inputBorder, color: colors.text, flex: 1, marginRight: 16 }]}
              placeholderTextColor={colors.textTertiary}
              placeholder={t("chat.placeholder")}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={sendMessage} // 按回车发送
              multiline
            />
            <TouchableOpacity onPress={sendMessage} style={[styles.sendButton, { backgroundColor: colors.accent }]} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color="white" /> : <IconSymbol name="paperplane.fill" size={24} color="white" />}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ... 保持原来的 styles 不变 ...
const styles = StyleSheet.create({
  // 把你原来文件底部的 styles 完整复制过来即可
  safeArea: { flex: 1 },
  mainLayout: { flex: 1, flexDirection: "row" },
  sidebar: { borderRightWidth: 1, width: 250 }, // 稍微给个宽度默认值
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", padding: 12, borderBottomWidth: 1 },
  menuButton: { padding: 8, borderRadius: 8, width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  menuButtonText: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  messagesContainer: { flex: 1 },
  messagesContent: { padding: 16 },
  messageWrapper: { marginBottom: 16 },
  userMessageWrapper: { alignItems: "flex-end" },
  messageBubble: { maxWidth: "85%", borderRadius: 12, borderWidth: 1, padding: 12 },
  inputContainer: { padding: 16, borderTopWidth: 1 },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 15, maxHeight: 100 },
  sendButton: { padding: 10, borderRadius: 50, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});