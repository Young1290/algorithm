/**
 * Conversation list component
 * Displays all saved conversations and allows switching between them
 */

import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('conversation.history', 'Conversation History')}</Text>
        <TouchableOpacity onPress={startNewConversation} style={styles.newButton}>
          <Text style={styles.newButtonText}>+ {t('conversation.new', 'New')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.list}>
        {conversations.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {t('conversation.noConversations', 'No conversations yet')}
            </Text>
          </View>
        ) : (
          conversations.map((conv) => {
            const isActive = conv.id === currentConversation?.id;

            return (
              <View key={conv.id} style={styles.conversationItem}>
                <TouchableOpacity
                  onPress={() => loadConversation(conv.id)}
                  style={[styles.conversationButton, isActive && styles.conversationButtonActive]}
                >
                  <View style={styles.conversationInfo}>
                    <Text
                      style={[styles.conversationTitle, isActive && styles.conversationTitleActive]}
                      numberOfLines={1}
                    >
                      {conv.title}
                    </Text>
                    <View style={styles.conversationMeta}>
                      <Text style={styles.conversationMetaText}>
                        {conv.messageCount} {t('conversation.messages', 'messages')}
                      </Text>
                      <Text style={styles.conversationMetaText}>•</Text>
                      <Text style={styles.conversationMetaText}>{formatDate(conv.updatedAt)}</Text>
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
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  newButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
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
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#999',
    fontSize: 14,
  },
  conversationItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginVertical: 4,
    marginHorizontal: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  conversationButton: {
    flex: 1,
    padding: 12,
  },
  conversationButtonActive: {
    backgroundColor: '#e3f2fd',
  },
  conversationInfo: {
    flex: 1,
  },
  conversationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
  },
  conversationTitleActive: {
    color: '#007AFF',
  },
  conversationMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  conversationMetaText: {
    fontSize: 12,
    color: '#999',
  },
  deleteButton: {
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ff3b30',
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: '700',
  },
});
