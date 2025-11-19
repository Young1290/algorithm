import { SafeAreaView, StyleSheet } from 'react-native';
import { ConversationList } from '@/components/conversation-list';

export default function TabTwoScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ConversationList />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
