import { ConversationSidebar } from "@/components/conversation-sidebar";
import { ResponsiveSidebar } from "@/components/responsive-sidebar";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { getProseStyles } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { usePersistedChat } from "@/hooks/use-persisted-chat";
import { useResponsive } from "@/hooks/use-responsive";
import { generateAPIUrl } from "@/utils";
import { DefaultChatTransport } from "ai";
import { fetch as expoFetch } from "expo/fetch";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Markdown from "react-native-markdown-display";

export default function App() {
  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isMobile, isDesktop } = useResponsive();
  const { t, i18n } = useTranslation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Generate prose styles for user and AI messages
  const userProseStyles = getProseStyles(isDark, true);
  const aiProseStyles = getProseStyles(isDark, false);

  const handleSend = () => {
    if (input.trim()) {
      sendMessage({ text: input });
      setInput("");
    }
  };

  // Handle key press for web - Enter sends, Shift+Enter creates new line
  const handleKeyPress = (e: any) => {
    if (
      Platform.OS === "web" &&
      e.nativeEvent.key === "Enter" &&
      !e.nativeEvent.shiftKey
    ) {
      e.preventDefault();
      handleSend();
    }
  };

  const { messages, error, sendMessage } = usePersistedChat({
    transport: new DefaultChatTransport({
      fetch: expoFetch as unknown as typeof globalThis.fetch,
      api: generateAPIUrl("/api/chat"),
      body: {
        language: i18n.language,
      },
    }),
    onError: (error) => console.error(error, "ERROR"),
  });

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Text className="text-foreground">{error.message}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 flex-row">
        {/* Desktop: always visible sidebar */}
        {isDesktop && (
          <View className="border-r border-slate-100">
            <ConversationSidebar />
          </View>
        )}

        {/* Main Content */}
        <View className="flex-1 bg-slate-50">
          {/* Header */}
          <View className="flex-row items-center px-4 py-3 bg-white border-b border-slate-200">
            {/* Mobile only: hamburger menu */}
            {isMobile && (
              <TouchableOpacity
                onPress={() => setSidebarOpen(true)}
                className="p-2 mr-2 rounded-lg active:bg-slate-100"
                activeOpacity={0.7}
                accessibilityLabel="Open menu"
                accessibilityRole="button"
              >
                <IconSymbol
                  name="line.3.horizontal"
                  size={22}
                  color="#64748b"
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Messages */}
          <ScrollView className="flex-1 px-4 py-4">
            {messages.length === 0 ? (
              <View className="flex-1 items-center justify-center py-12">
                <Text className="text-2xl font-bold text-slate-800 mb-2 text-center">
                  {t("chat.welcome.title")}
                </Text>
                <Text className="text-base text-slate-500 mb-8 text-center px-4">
                  {t("chat.welcome.subtitle")}
                </Text>
                <View className="w-full max-w-[400px] gap-3 px-4">
                  {[
                    t("chat.welcome.prompts.analyzePosition"),
                    t("chat.welcome.prompts.calculateTargets"),
                    t("chat.welcome.prompts.riskManagement"),
                    t("chat.welcome.prompts.positionSizing"),
                  ].map((prompt, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => {
                        sendMessage({ text: prompt });
                      }}
                      className="bg-white border border-slate-200 rounded-2xl px-4 py-3 active:bg-slate-50"
                      activeOpacity={0.7}
                    >
                      <Text className="text-slate-700 text-sm">{prompt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : (
              messages.map((m) => {
              const isUser = m.role === "user";
              return (
                <View
                  key={m.id}
                  className={`mb-3 ${isUser ? "items-end" : "items-start"}`}
                >
                  <View
                    className={`max-w-[85%] rounded-2xl px-4 pt-3 ${
                      isUser
                        ? "bg-blue-500"
                        : "bg-white border border-slate-200"
                    }`}
                    style={
                      isUser
                        ? { borderBottomRightRadius: 4 }
                        : { borderBottomLeftRadius: 4 }
                    }
                  >
                    {m.parts.map((part, i) => {
                      switch (part.type) {
                        case "text":
                          return (
                            <View key={`${m.id}-${i}`} className="w-full">
                              <Markdown
                                style={isUser ? userProseStyles : aiProseStyles}
                                rules={{
                                  table: (node, children, parent, styles) => (
                                    <ScrollView
                                      key={node.key}
                                      horizontal
                                      showsHorizontalScrollIndicator={true}
                                      style={{ marginVertical: 12 }}
                                    >
                                      <View style={styles.table}>
                                        {children}
                                      </View>
                                    </ScrollView>
                                  ),
                                }}
                              >
                                {part.text}
                              </Markdown>
                            </View>
                          );
                        case "tool-weather":
                        case "tool-convertFahrenheitToCelsius":
                          return (
                            <View key={`${m.id}-${i}`} className="mt-2">
                              <Text
                                className={`text-xs font-mono ${
                                  isUser ? "text-white/80" : "text-slate-500"
                                }`}
                              >
                                {JSON.stringify(part, null, 2)}
                              </Text>
                            </View>
                          );
                      }
                    })}
                  </View>
                </View>
              );
            })
            )}
          </ScrollView>

          {/* Input */}
          <View className="px-4 py-3 bg-white border-t border-slate-200">
            <View className="flex-row items-end bg-slate-50 rounded-2xl border border-slate-200">
              <TextInput
                className="flex-1 px-4 py-3 text-slate-800 text-base min-h-[44px] max-h-[120px]"
                placeholder={t("chat.placeholder")}
                placeholderTextColor="#94a3b8"
                value={input}
                onChange={(e) => setInput(e.nativeEvent.text)}
                onKeyPress={handleKeyPress}
                onSubmitEditing={handleSend}
                multiline
                maxLength={2000}
                blurOnSubmit={Platform.OS !== "web"}
              />
              <TouchableOpacity
                onPress={handleSend}
                className={`p-3 mr-1 mb-1 rounded-xl ${
                  input.trim() ? "bg-blue-500" : "bg-slate-200"
                }`}
                disabled={!input.trim()}
                activeOpacity={0.7}
              >
                <IconSymbol
                  name="paperplane.fill"
                  size={20}
                  color={input.trim() ? "white" : "#94a3b8"}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Mobile: overlay sidebar */}
        {isMobile && (
          <ResponsiveSidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
