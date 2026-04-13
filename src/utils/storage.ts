import type { ExtensionSettings } from '@/types';
import { DEFAULT_SETTINGS } from '@/types/constants';

const SETTINGS_KEY = 'ai_assistant_settings';

/**
 * 从 Chrome Storage 中加载设置
 */
export async function loadSettings(): Promise<ExtensionSettings> {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(SETTINGS_KEY, (result) => {
        if (result[SETTINGS_KEY]) {
          resolve({ ...DEFAULT_SETTINGS, ...result[SETTINGS_KEY] });
        } else {
          resolve({ ...DEFAULT_SETTINGS });
        }
      });
    } else {
      resolve({ ...DEFAULT_SETTINGS });
    }
  });
}

/**
 * 保存设置到 Chrome Storage
 */
export async function saveSettings(settings: ExtensionSettings): Promise<void> {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ [SETTINGS_KEY]: settings }, () => {
        resolve();
      });
    } else {
      resolve();
    }
  });
}
