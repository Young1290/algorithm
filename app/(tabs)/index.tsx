import { generateAPIUrl } from "@/utils";
import { DefaultChatTransport } from "ai";
import { fetch as expoFetch } from "expo/fetch";
import { useState } from "react";
import { SafeAreaView, ScrollView, Text, TextInput, View, TouchableOpacity, StyleSheet } from "react-native";
import Markdown from "react-native-markdown-display";
import { useTranslation } from "react-i18next";
import { LanguageSelector } from "@/components/language-selector";
import { usePersistedChat } from "@/hooks/use-persisted-chat";
import { useConversations } from "@/contexts/conversation-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors, getProseStyles } from "@/constants/theme";

export default function App() {
  const [input, setInput] = useState("");
  const { t, i18n } = useTranslation();
  const { startNewConversation } = useConversations();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;
  const proseStyles = getProseStyles(isDark);

  const { messages, error, sendMessage, conversationLoading } = usePersistedChat({
    transport: new DefaultChatTransport({
      fetch: expoFetch as unknown as typeof globalThis.fetch,
      api: generateAPIUrl("/api/chat"),
      body: {
        language: i18n.language,
      },
    }),
    onError: (error) => console.error(error, "ERROR"),
  });

  if (error) return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={{ color: colors.text }}>{error.message}</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.backgroundSecondary }]}>
      <View style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
        <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          <LanguageSelector />
          <TouchableOpacity
            onPress={startNewConversation}
            style={[styles.newChatButton, { backgroundColor: colors.accent }]}
            activeOpacity={0.8}
          >
            <Text style={styles.newChatButtonText}>
              {t("chat.newConversation", "New Chat")}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
        >
          {messages.map((m) => (
            <View
              key={m.id}
              style={[
                styles.messageWrapper,
                m.role === "user" && styles.userMessageWrapper,
              ]}
            >
              <View
                style={[
                  styles.messageBubble,
                  {
                    backgroundColor: m.role === "user" ? colors.userMessage : colors.aiMessage,
                    borderColor: colors.border,
                  }
                ]}
              >
                <Text style={[styles.roleLabel, { color: colors.textSecondary }]}>
                  {m.role === "user" ? t("chat.user") : t("chat.assistant")}
                </Text>
                {m.parts.map((part, i) => {
                  switch (part.type) {
                    case "text":
                      return (
                        <View key={`${m.id}-${i}`} style={styles.messageContent}>
                          <Markdown style={proseStyles}>
                            {part.text}
                          </Markdown>
                        </View>
                      );
                    case "tool-weather":
                    case "tool-convertFahrenheitToCelsius":
                      return (
                        <View key={`${m.id}-${i}`} style={styles.toolResult}>
                          <Text style={[styles.toolResultText, { color: colors.textSecondary }]}>
                            {JSON.stringify(part, null, 2)}
                          </Text>
                        </View>
                      );
                  }
                })}
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={[styles.inputContainer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.input,
                borderColor: colors.inputBorder,
                color: colors.text,
              }
            ]}
            placeholderTextColor={colors.textTertiary}
            placeholder={t("chat.placeholder")}
            value={input}
            onChange={(e) => setInput(e.nativeEvent.text)}
            onSubmitEditing={(e) => {
              e.preventDefault();
              sendMessage({ text: input });
              setInput("");
            }}
            multiline
            maxLength={2000}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  newChatButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  newChatButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  messageWrapper: {
    marginBottom: 16,
    alignItems: "flex-start",
  },
  userMessageWrapper: {
    alignItems: "flex-end",
  },
  messageBubble: {
    maxWidth: "85%",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  roleLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  messageContent: {
    width: "100%",
  },
  toolResult: {
    marginTop: 8,
  },
  toolResultText: {
    fontSize: 12,
    fontFamily: "monospace",
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    maxHeight: 120,
    minHeight: 44,
  },
});
