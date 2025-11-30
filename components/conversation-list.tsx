/**
 * Conversation list component
 * Displays all saved conversations and allows switching between them
 */

import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useConversations } from '@/contexts/conversation-context';
import { useTranslation } from 'react-i18next';

export function ConversationList() {
  const {
    conversations,
    currentConversation,
    loadConversation,
    deleteConversation,
    startNewConversation,
  } = useConversations();
  const { t } = useTranslation();

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('conversation.justNow', 'Just now');
    if (diffMins < 60) return t('conversation.minutesAgo', { count: diffMins }, `${diffMins}m ago`);
    if (diffHours < 24) return t('conversation.hoursAgo', { count: diffHours }, `${diffHours}h ago`);
    if (diffDays < 7) return t('conversation.daysAgo', { count: diffDays }, `${diffDays}d ago`);

    return date.toLocaleDateString();
  };

  return (
    <View className="flex-1 bg-default-100">
      <View className="flex-row justify-between items-center px-4 py-3 bg-background border-b border-default-200">
        <Text className="text-xl font-bold text-foreground">
          {t('conversation.history', 'Conversation History')}
        </Text>
        <TouchableOpacity
          onPress={startNewConversation}
          className="px-4 py-2 rounded-lg bg-primary"
          activeOpacity={0.8}
        >
          <Text className="text-white font-semibold text-sm">
            + {t('conversation.new', 'New')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1">
        {conversations.length === 0 ? (
          <View className="p-12 items-center">
            <Text className="text-base text-default-400">
              {t('conversation.noConversations', 'No conversations yet')}
            </Text>
          </View>
        ) : (
          conversations.map((conv) => {
            const isActive = conv.id === currentConversation?.id;

            return (
              <View
                key={conv.id}
                className={`flex-row my-1.5 mx-3 rounded-xl border overflow-hidden bg-background ${
                  isActive ? 'border-primary' : 'border-default-200'
                }`}
              >
                <TouchableOpacity
                  onPress={() => loadConversation(conv.id)}
                  className={`flex-1 px-4 py-3 ${isActive ? 'bg-default-100' : ''}`}
                  activeOpacity={0.7}
                >
                  <View className="flex-1">
                    <Text
                      className={`text-base font-semibold mb-1.5 ${
                        isActive ? 'text-primary' : 'text-foreground'
                      }`}
                      numberOfLines={1}
                    >
                      {conv.title}
                    </Text>
                    <View className="flex-row gap-2">
                      <Text className="text-sm text-default-500">
                        {conv.messageCount} {t('conversation.messages', 'messages')}
                      </Text>
                      <Text className="text-sm text-default-400">•</Text>
                      <Text className="text-sm text-default-500">
                        {formatDate(conv.updatedAt)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    Alert.alert(
                      t('conversation.deleteTitle', 'Delete Conversation'),
                      t('conversation.deleteConfirm', 'Are you sure you want to delete this conversation?'),
                      [
                        { text: t('conversation.cancel', 'Cancel'), style: 'cancel' },
                        {
                          text: t('conversation.delete', 'Delete'),
                          style: 'destructive',
                          onPress: () => deleteConversation(conv.id),
                        },
                      ]
                    );
                  }}
                  className="w-12 justify-center items-center bg-danger"
                  activeOpacity={0.8}
                >
                  <Text className="text-white text-3xl font-light">×</Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
