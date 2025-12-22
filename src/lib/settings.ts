import prisma from './prisma';

const settingsCache = new Map<string, { value: string; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute

export async function getSetting(key: string): Promise<string | null> {
  // Check cache first
  const cached = settingsCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.value;
  }

  const setting = await prisma.systemSetting.findUnique({
    where: { key },
  });

  if (setting) {
    settingsCache.set(key, { value: setting.value, timestamp: Date.now() });
    return setting.value;
  }

  return null;
}

export async function getSettings(keys: string[]): Promise<Record<string, string>> {
  const result: Record<string, string> = {};

  for (const key of keys) {
    const value = await getSetting(key);
    if (value) {
      result[key] = value;
    }
  }

  return result;
}

export function clearSettingsCache(): void {
  settingsCache.clear();
}
