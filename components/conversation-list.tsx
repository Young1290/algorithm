/**
 * Conversation list component
 * Displays all saved conversations and allows switching between them
 */

import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { useConversations } from '@/contexts/conversation-context';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

export function ConversationList() {
  const {
    conversations,
    currentConversation,
    loadConversation,
    deleteConversation,
    startNewConversation,
  } = useConversations();
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

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
    <View style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>{t('conversation.history', 'Conversation History')}</Text>
        <TouchableOpacity
          onPress={startNewConversation}
          style={[styles.newButton, { backgroundColor: colors.accent }]}
          activeOpacity={0.8}
        >
          <Text style={styles.newButtonText}>+ {t('conversation.new', 'New')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.list}>
        {conversations.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
              {t('conversation.noConversations', 'No conversations yet')}
            </Text>
          </View>
        ) : (
          conversations.map((conv) => {
            const isActive = conv.id === currentConversation?.id;

            return (
              <View
                key={conv.id}
                style={[
                  styles.conversationItem,
                  {
                    backgroundColor: colors.background,
                    borderColor: isActive ? colors.accent : colors.border,
                  }
                ]}
              >
                <TouchableOpacity
                  onPress={() => loadConversation(conv.id)}
                  style={[
                    styles.conversationButton,
                    isActive && { backgroundColor: colors.backgroundTertiary }
                  ]}
                  activeOpacity={0.7}
                >
                  <View style={styles.conversationInfo}>
                    <Text
                      style={[
                        styles.conversationTitle,
                        { color: isActive ? colors.accent : colors.text }
                      ]}
                      numberOfLines={1}
                    >
                      {conv.title}
                    </Text>
                    <View style={styles.conversationMeta}>
                      <Text style={[styles.conversationMetaText, { color: colors.textSecondary }]}>
                        {conv.messageCount} {t('conversation.messages', 'messages')}
                      </Text>
                      <Text style={[styles.conversationMetaText, { color: colors.textTertiary }]}>•</Text>
                      <Text style={[styles.conversationMetaText, { color: colors.textSecondary }]}>{formatDate(conv.updatedAt)}</Text>
                    </View>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    Alert.alert(
                      t('conversation.deleteTitle', 'Delete Conversation'),
                      t('conversation.deleteConfirm', 'Are you sure you want to delete this conversation?'),
                      [
                        {
                          text: t('conversation.cancel', 'Cancel'),
                          style: 'cancel',
                        },
                        {
                          text: t('conversation.delete', 'Delete'),
                          style: 'destructive',
                          onPress: () => deleteConversation(conv.id),
                        },
                      ]
                    );
                  }}
                  style={styles.deleteButton}
                  activeOpacity={0.8}
                >
                  <Text style={styles.deleteButtonText}>×</Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  newButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  newButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  list: {
    flex: 1,
  },
  emptyState: {
    padding: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
  },
  conversationItem: {
    flexDirection: 'row',
    marginVertical: 6,
    marginHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  conversationButton: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  conversationInfo: {
    flex: 1,
  },
  conversationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  conversationMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  conversationMetaText: {
    fontSize: 13,
  },
  deleteButton: {
    width: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ef4444',
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 28,
  },
});
