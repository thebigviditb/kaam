import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Dev-bypass tokens are kept in SecureStore on device and AsyncStorage (localStorage) on web.
const KEY = 'kaam.devToken';

export const tokenStore = {
  async get(): Promise<string | null> {
    try {
      if (Platform.OS === 'web') return await AsyncStorage.getItem(KEY);
      return await SecureStore.getItemAsync(KEY);
    } catch {
      return null;
    }
  },
  async set(value: string): Promise<void> {
    if (Platform.OS === 'web') await AsyncStorage.setItem(KEY, value);
    else await SecureStore.setItemAsync(KEY, value);
  },
  async clear(): Promise<void> {
    try {
      if (Platform.OS === 'web') await AsyncStorage.removeItem(KEY);
      else await SecureStore.deleteItemAsync(KEY);
    } catch {
      /* ignore */
    }
  },
};
