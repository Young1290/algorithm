import { ConversationSidebar } from "@/components/conversation-sidebar";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { getProseStyles } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { usePersistedChat } from "@/hooks/use-persisted-chat";
import { generateAPIUrl } from "@/utils";
import { DefaultChatTransport } from "ai";
import { fetch as expoFetch } from "expo/fetch";
import { Button } from "heroui-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
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
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const { t, i18n } = useTranslation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const proseStyles = getProseStyles(isDark);

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
    <SafeAreaView className="flex-1 bg-default-100">
      <View className="flex-1 flex-row">
        {/* Sidebar */}
        {sidebarVisible && (
          <View className="border-r border-default-300">
            <ConversationSidebar onClose={() => setSidebarVisible(false)} />
          </View>
        )}

        {/* Main Content */}
        <View className="flex-1 bg-default-100">
          {/* Header */}
          <View className="flex-row items-center px-4 py-3 bg-background border-b border-default-200">
            <TouchableOpacity
              onPress={() => setSidebarVisible(!sidebarVisible)}
              className="p-2 mr-2 rounded-lg bg-primary min-w-[40px] min-h-[40px] items-center justify-center"
              activeOpacity={0.7}
            >
              <Text className="text-2xl font-semibold text-white">
                {sidebarVisible ? "✕" : "☰"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Messages */}
          <ScrollView className="flex-1 px-4 py-3">
            {messages.map((m) => (
              <View
                key={m.id}
                className={`mb-4 ${m.role === "user" ? "items-end" : ""}`}
              >
                <View
                  className={`max-w-full rounded-xl border px-4 py-3 ${
                    m.role === "user"
                      ? "bg-default-200 border-default-300"
                      : "bg-background border-default-200"
                  }`}
                >
                  {m.parts.map((part, i) => {
                    switch (part.type) {
                      case "text":
                        return (
                          <View key={`${m.id}-${i}`} className="w-full">
                            <Markdown
                              style={proseStyles}
                              rules={{
                                table: (node, children, parent, styles) => (
                                  <ScrollView
                                    key={node.key}
                                    horizontal
                                    showsHorizontalScrollIndicator={true}
                                    style={{ marginVertical: 12 }}
                                  >
                                    <View style={styles.table}>{children}</View>
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
                            <Text className="text-xs font-mono text-default-500">
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

          {/* Input */}
          <View className="flex-row px-4 py-3 bg-background border-t border-default-200">
            <TextInput
              className="flex-1 mr-4 px-4 py-3 rounded-xl border bg-default-100 border-default-300 text-foreground text-base min-h-[44px] max-h-[120px]"
              placeholder={t("chat.placeholder")}
              placeholderTextColor="#94a3b8"
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
            <Button
              className="justify-center items-center bg-primary"
              onPress={() => {
                sendMessage({ text: input });
                setInput("");
              }}
            >
              <IconSymbol name="paperplane.fill" size={24} color="white" />
            </Button>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
