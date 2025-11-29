import type { ConversationMetadata } from '@/app/lib/types/conversation';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useConversations } from '@/contexts/conversation-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { IconSymbol } from './ui/icon-symbol';

// Helper function to format timestamp
const formatDate = (timestamp: number) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

interface ConversationSidebarProps {
  onClose?: () => void;
}

export function ConversationSidebar({ onClose }: ConversationSidebarProps) {
  const {
    conversations,
    currentConversation,
    loadConversation,
    startNewConversation,
    deleteConversation,
  } = useConversations();
  const { user, signOut } = useAuth();

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              console.error('Failed to sign out:', error);
            }
          },
        },
      ]
    );
  };

  const handleSelectConversation = async (id: string) => {
    try {
      await loadConversation(id);
      onClose?.();
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  const handleNewChat = async () => {
    try {
      await startNewConversation();
      onClose?.();
    } catch (error) {
      console.error('Failed to create new conversation:', error);
    }
  };

  const handleDeleteConversation = (id: string, title: string) => {
    console.log('🗑️ handleDeleteConversation called');
    console.log('  - ID:', id);
    console.log('  - Title:', title);
    
    // 在 Web 环境下使用 window.confirm
    const confirmed = window.confirm(`确定要删除 "${title}" 吗？`);
    console.log('🤔 用户选择:', confirmed ? '确认删除' : '取消');
    
    if (confirmed) {
      console.log('✅ 用户确认删除');
      (async () => {
        try {
          console.log('🔄 开始删除对话...');
          await deleteConversation(id);
          console.log('✅ 删除成功');
        } catch (error) {
          console.error('❌ 删除失败:', error);
          window.alert('删除对话失败，请重试');
        }
      })();
    } else {
      console.log('❌ 用户取消删除');
    }
  };

  const sortedConversations = [...conversations].sort(
    (a, b) => b.updatedAt - a.updatedAt
  );

  return (
    <View style={[styles.container, { backgroundColor: '#000000' }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: '#333333' }]}>
        <Text style={[styles.headerTitle, { color: '#ffffff' }]}>
          Conversations
        </Text>
        <TouchableOpacity
          onPress={handleNewChat}
          style={[styles.newChatButton, { backgroundColor: colors.accent }]}
          activeOpacity={0.8}
        >
          <IconSymbol name="plus" size={18} color="#fff" />
          <Text style={styles.newChatButtonText}>New Chat</Text>
        </TouchableOpacity>
      </View>

      {/* Conversation List */}
      <ScrollView style={styles.conversationList}>
        {sortedConversations.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: '#888888' }]}>
              No conversations yet
            </Text>
          </View>
        ) : (
          sortedConversations.map((conv) => (
            <ConversationItem
              key={conv.id}
              conversation={conv}
              isActive={currentConversation?.id === conv.id}
              onSelect={() => handleSelectConversation(conv.id)}
              onDelete={() => handleDeleteConversation(conv.id, conv.title)}
            />
          ))
        )}
      </ScrollView>

      {/* User Section */}
      {user && (
        <View style={[styles.userSection, { borderTopColor: '#333333' }]}>
          <Text style={styles.userEmail} numberOfLines={1}>
            {user.email}
          </Text>
          <TouchableOpacity
            onPress={handleSignOut}
            style={styles.signOutButton}
            activeOpacity={0.7}
          >
            <IconSymbol name="rectangle.portrait.and.arrow.right" size={16} color="#ff4444" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

interface ConversationItemProps {
  conversation: ConversationMetadata;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function ConversationItem({
  conversation,
  isActive,
  onSelect,
  onDelete,
}: ConversationItemProps) {
  return (
    <View
      style={[
        styles.conversationItem,
        {
          backgroundColor: isActive ? '#1a1a1a' : 'transparent',
          borderLeftColor: isActive ? '#0ea5e9' : 'transparent',
        },
      ]}
    >
      <TouchableOpacity
        style={styles.conversationContent}
        onPress={() => {
          console.log('📱 对话被点击:', conversation.title);
          onSelect();
        }}
        activeOpacity={0.7}
      >
        <View style={styles.conversationHeader}>
          <Text
            style={[
              styles.conversationTitle,
              { color: '#ffffff' },
              isActive && styles.activeTitle,
            ]}
            numberOfLines={1}
          >
            {conversation.title}
          </Text>
        </View>
        <View style={styles.conversationMeta}>
          <Text style={[styles.messageCount, { color: '#888888' }]}>
            {conversation.messageCount} messages
          </Text>
          <Text style={[styles.timestamp, { color: '#888888' }]}>
            {formatDate(conversation.updatedAt)}
          </Text>
        </View>
      </TouchableOpacity>
      
      {/* Delete Button - 独立的绝对定位 */}
      <View style={styles.deleteButtonContainer}>
        <TouchableOpacity
          onPress={() => {
            console.log('🖱️ 删除按钮被点击');
            console.log('  - Conversation ID:', conversation.id);
            console.log('  - Conversation Title:', conversation.title);
            onDelete();
          }}
          style={styles.deleteButton}
          activeOpacity={0.6}
        >
          <Text style={styles.deleteButtonText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: 280,
    overflow: 'visible',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  newChatButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  conversationList: {
    flex: 1,
    overflow: 'visible',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  conversationItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderLeftWidth: 3,
    position: 'relative',
    overflow: 'visible',
  },
  conversationContent: {
    paddingRight: 40,
  },
  deleteButtonContainer: {
    position: 'absolute',
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    zIndex: 10,
  },
  conversationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  conversationTitle: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  activeTitle: {
    fontWeight: '600',
  },
  deleteButton: {
    padding: 8,
    minWidth: 32,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderRadius: 4,
  },
  deleteButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ff4444',
  },
  conversationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  messageCount: {
    fontSize: 12,
  },
  timestamp: {
    fontSize: 12,
  },
  userSection: {
    padding: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  userEmail: {
    fontSize: 13,
    color: '#888888',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  signOutText: {
    fontSize: 14,
    color: '#ff4444',
    fontWeight: '500',
  },
});
