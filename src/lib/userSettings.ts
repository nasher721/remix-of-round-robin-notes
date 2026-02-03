import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export type UserSettingsPayload = {
  appSettings?: {
    globalFontSize?: number;
    todosAlwaysVisible?: boolean;
    sortBy?: string;
    showLabFishbones?: boolean;
  };
  systemsConfig?: Json;
  printSettings?: Json;
};

const mergeSettings = (
  base: UserSettingsPayload | null,
  update: UserSettingsPayload
): UserSettingsPayload => ({
  ...(base ?? {}),
  ...update,
});

export const fetchUserSettings = async (userId: string): Promise<UserSettingsPayload | null> => {
  const { data, error } = await supabase
    .from('user_settings')
    .select('settings')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Failed to load user settings:', error);
    return null;
  }

  return (data?.settings as UserSettingsPayload | undefined) ?? null;
};

export const saveUserSettings = async (
  userId: string,
  update: UserSettingsPayload,
  existing?: UserSettingsPayload | null
): Promise<UserSettingsPayload | null> => {
  const base = existing ?? (await fetchUserSettings(userId));
  const merged = mergeSettings(base, update);

  const { error } = await supabase.from('user_settings').upsert({
    user_id: userId,
    settings: merged,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error('Failed to save user settings:', error);
    return base ?? null;
  }

  return merged;
};
