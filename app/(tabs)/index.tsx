import { generateAPIUrl } from "@/utils";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { fetch as expoFetch } from "expo/fetch";
import { useState } from "react";
import { SafeAreaView, ScrollView, Text, TextInput, View } from "react-native";
import Markdown from "react-native-markdown-display";
import { useTranslation } from "react-i18next";
import { LanguageSelector } from "@/components/language-selector";

export default function App() {
  const [input, setInput] = useState("");
  const { t, i18n } = useTranslation();
  const { messages, error, sendMessage } = useChat({
    transport: new DefaultChatTransport({
      fetch: expoFetch as unknown as typeof globalThis.fetch,
      api: generateAPIUrl("/api/chat"),
      body: {
        language: i18n.language,
      },
    }),
    onError: (error) => console.error(error, "ERROR"),
  });

  if (error) return <Text>{error.message}</Text>;

  return (
    <SafeAreaView style={{ height: "100%" }}>
      <View
        style={{
          height: "95%",
          display: "flex",
          flexDirection: "column",
          paddingHorizontal: 8,
        }}
      >
        <LanguageSelector />
        <ScrollView style={{ flex: 1 }}>
          {messages.map((m) => (
            <View key={m.id} style={{ marginVertical: 8 }}>
              <View>
                <Text style={{ fontWeight: 700 }}>
                  {m.role === "user" ? t("chat.user") : t("chat.assistant")}
                </Text>
                {m.parts.map((part, i) => {
                  switch (part.type) {
                    case "text":
                      return (
                        <Markdown key={`${m.id}-${i}`}>
                          {part.text}
                        </Markdown>
                      );
                    case "tool-weather":
                    case "tool-convertFahrenheitToCelsius":
                      return (
                        <Text key={`${m.id}-${i}`}>
                          {JSON.stringify(part, null, 2)}
                        </Text>
                      );
                  }
                })}
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={{ marginTop: 8 }}>
          <TextInput
            style={{ backgroundColor: "white", padding: 8 }}
            placeholder={t("chat.placeholder")}
            value={input}
            onChange={(e) => setInput(e.nativeEvent.text)}
            onSubmitEditing={(e) => {
              e.preventDefault();
              sendMessage({ text: input });
              setInput("");
            }}
            autoFocus={true}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
