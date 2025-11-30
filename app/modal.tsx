import { Link } from 'expo-router';
import { View, Text } from 'react-native';

export default function ModalScreen() {
  return (
    <View className="flex-1 items-center justify-center p-5 bg-background">
      <Text className="text-3xl font-bold text-foreground">This is a modal</Text>
      <Link href="/" dismissTo className="mt-4 py-4">
        <Text className="text-base text-primary underline">Go to home screen</Text>
      </Link>
    </View>
  );
}
