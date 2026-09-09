import { Redirect } from 'expo-router';

// The Gate in _layout.tsx sends signed-in users to their tabs; this is the cold-start target.
export default function Index() {
  return <Redirect href="/(auth)/welcome" />;
}
