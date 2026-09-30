import AsyncStorage from '@react-native-async-storage/async-storage';

const P = 'ora:';
export async function load<T>(key: string, fallback: T): Promise<T> {
  try {
    const v = await AsyncStorage.getItem(P + key);
    return v == null ? fallback : (JSON.parse(v) as T);
  } catch {
    return fallback;
  }
}
export async function save(key: string, value: unknown) {
  try {
    await AsyncStorage.setItem(P + key, JSON.stringify(value));
  } catch {}
}
export const todayKey = () => new Date().toDateString();
