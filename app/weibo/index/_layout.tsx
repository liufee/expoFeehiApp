import { Stack } from 'expo-router';

export default function WeiboIndexStack() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      {/* index.tsx 会自动作为默认路由，不需要显式声明 */}
      <Stack.Screen name="detail" />
      <Stack.Screen name="repost" />
      <Stack.Screen name="TSRVerify" />
    </Stack>
  );
}
