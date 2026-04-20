import { useThemeMode } from '@/stores/themeStore';
import { useMemo } from 'react';
import { useColorScheme } from 'react-native';

export type ResolvedTheme = 'light' | 'dark';

export const useResolvedTheme = () => {
  const themeMode = useThemeMode();
  const systemScheme = useColorScheme();

  const resolvedTheme: ResolvedTheme = useMemo(() => {
    if (themeMode === 'system') {
      return systemScheme === 'dark' ? 'dark' : 'light';
    }
    return themeMode;
  }, [themeMode, systemScheme]);

  return {
    mode: themeMode,
    resolvedTheme,
    isDark: resolvedTheme === 'dark',
  };
};
