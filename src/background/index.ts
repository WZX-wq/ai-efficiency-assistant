import type { ActionType, ExtensionMessage, ExtensionSettings } from '@/types';
import { getActionPrompt } from '@/types/constants';
import { loadSettings } from '@/utils/storage';
import { callDeepSeekAPI } from '@/utils/api';

/**
 * Background Service Worker
 * 功能：处理右键菜单、管理 API 调用、消息路由
 */

// ============ 右键菜单 ============

/** 创建右键菜单 */
chrome.runtime.onInstalled.addListener(() => {
  const actions: { type: ActionType; title: string }[] = [
    { type: 'rewrite', title: 'AI 改写' },
    { type: 'expand', title: 'AI 扩写' },
    { type: 'translate', title: 'AI 翻译' },
    { type: 'summarize', title: 'AI 总结' },
  ];

  // 创建父菜单
  chrome.contextMenus.create({
    id: 'ai-assistant-parent',
    title: 'AI 效率助手',
    contexts: ['selection'],
  });

  // 创建子菜单
  actions.forEach((action) => {
    chrome.contextMenus.create({
      id: `ai-assistant-${action.type}`,
      parentId: 'ai-assistant-parent',
      title: action.title,
      contexts: ['selection'],
    });
  });
});

/** 右键菜单点击事件 */
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;

  const menuId = info.menuItemId as string;
  const actionTypeMap: Record<string, ActionType> = {
    'ai-assistant-rewrite': 'rewrite',
    'ai-assistant-expand': 'expand',
    'ai-assistant-translate': 'translate',
    'ai-assistant-summarize': 'summarize',
  };

  const actionType = actionTypeMap[menuId];
  if (!actionType || !info.selectionText) return;

  // 向 content script 获取选中文本（右键菜单已有 selectionText）
  const selectedText = info.selectionText;

  // 执行 AI 操作
  try {
    const settings = await loadSettings();
    const prompt = getActionPrompt(actionType, selectedText);
    const result = await callDeepSeekAPI(prompt, settings);

    // 将结果发送到 content script 显示
    chrome.tabs.sendMessage(tab.id, {
      type: 'ACTION_RESULT',
      action: actionType,
      result,
    } as ExtensionMessage);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    chrome.tabs.sendMessage(tab.id, {
      type: 'ACTION_RESULT',
      action: actionType,
      error: errorMessage,
    } as ExtensionMessage);
  }
});

// ============ 消息处理 ============

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse) => {
    if (message.type === 'AI_ACTION') {
      // 来自 content script 的 AI 操作请求
      handleAIAction(message.action!, message.selectedText!)
        .then((result) => {
          sendResponse({ type: 'ACTION_RESULT', result });
        })
        .catch((error) => {
          sendResponse({
            type: 'ACTION_RESULT',
            error: error instanceof Error ? error.message : '未知错误',
          });
        });
      return true; // 保持异步通道
    }

    if (message.type === 'LOAD_SETTINGS') {
      loadSettings().then((settings) => {
        sendResponse({ type: 'LOAD_SETTINGS', settings });
      });
      return true;
    }

    if (message.type === 'STORE_SETTINGS') {
      const settings = message.settings as ExtensionSettings;
      chrome.storage.local.set({ ai_assistant_settings: settings }, () => {
        sendResponse({ type: 'STORE_SETTINGS', success: true });
      });
      return true;
    }
  },
);

/**
 * 处理 AI 操作
 */
async function handleAIAction(
  actionType: ActionType,
  selectedText: string,
): Promise<string> {
  const settings = await loadSettings();
  const prompt = getActionPrompt(actionType, selectedText);
  return callDeepSeekAPI(prompt, settings);
}
