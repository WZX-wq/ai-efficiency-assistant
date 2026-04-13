import type { ActionType, ExtensionMessage } from '@/types';

/**
 * Content Script - 注入到网页中
 * 功能：监听用户选中文本，显示浮动按钮和快捷操作面板
 */

// ============ DOM 元素创建 ============

/** 创建浮动按钮 */
function createFloatingButton(): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = 'ai-assistant-float-btn';
  btn.title = 'AI 效率助手';
  btn.innerHTML = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
  </svg>`;
  return btn;
}

/** 创建快捷操作面板 */
function createPanel(): HTMLDivElement {
  const panel = document.createElement('div');
  panel.className = 'ai-assistant-panel';

  const actions: { type: ActionType; label: string; desc: string; iconClass: string; icon: string }[] = [
    { type: 'rewrite', label: '改写', desc: '重新表达选中文字', iconClass: 'rewrite', icon: 'Aa' },
    { type: 'expand', label: '扩写', desc: '扩展补充更多内容', iconClass: 'expand', icon: '+' },
    { type: 'translate', label: '翻译', desc: '中英文互译', iconClass: 'translate', icon: 'T' },
    { type: 'summarize', label: '总结', desc: '提炼核心要点', iconClass: 'summarize', icon: 'S' },
  ];

  panel.innerHTML = `
    <div class="ai-assistant-panel-header">AI 效率助手</div>
    ${actions
      .map(
        (a) => `
      <button class="ai-assistant-panel-item" data-action="${a.type}">
        <span class="ai-assistant-panel-item-icon ${a.iconClass}">${a.icon}</span>
        <div>
          <div class="ai-assistant-panel-item-label">${a.label}</div>
          <div class="ai-assistant-panel-item-desc">${a.desc}</div>
        </div>
      </button>
    `,
      )
      .join('')}
  `;

  return panel;
}

// ============ 状态管理 ============

let floatingBtn: HTMLButtonElement;
let panel: HTMLDivElement;
let selectedText = '';
let isPanelVisible = false;

// ============ 位置计算 ============

function getSelectionRect(): DOMRect | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return null;
  }
  const range = selection.getRangeAt(0);
  return range.getBoundingClientRect();
}

function positionElements(rect: DOMRect) {
  const btnX = rect.right + 8;
  const btnY = rect.top - 8;

  // 确保浮动按钮不超出视口
  const maxBtnX = window.innerWidth - 48;
  const finalBtnX = Math.min(btnX, maxBtnX);
  const finalBtnY = Math.max(btnY, 8);

  floatingBtn.style.left = `${finalBtnX}px`;
  floatingBtn.style.top = `${finalBtnY}px`;

  // 面板位置
  const panelX = rect.right + 8;
  const panelY = rect.bottom + 8;
  const maxPanelX = window.innerWidth - 220;
  const maxPanelY = window.innerHeight - 250;

  panel.style.left = `${Math.min(panelX, maxPanelX)}px`;
  panel.style.top = `${Math.min(panelY, maxPanelY)}px`;
}

// ============ 事件处理 ============

function handleMouseUp() {
  // 延迟一帧获取选区，确保选区已更新
  requestAnimationFrame(() => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();

    if (text && text.length > 0) {
      selectedText = text;
      const rect = getSelectionRect();
      if (rect) {
        positionElements(rect);
        floatingBtn.classList.add('visible');
      }
    } else {
      hideAll();
    }
  });
}

function handleMouseDown(e: MouseEvent) {
  const target = e.target as Node;
  if (!floatingBtn.contains(target) && !panel.contains(target)) {
    hideAll();
  }
}

function handleFloatBtnClick(e: MouseEvent) {
  e.preventDefault();
  e.stopPropagation();

  if (isPanelVisible) {
    hidePanel();
  } else {
    showPanel();
  }
}

function handlePanelAction(e: MouseEvent) {
  const target = e.target as HTMLElement;
  const actionItem = target.closest('.ai-assistant-panel-item') as HTMLElement;

  if (actionItem) {
    const actionType = actionItem.dataset.action as ActionType;
    if (actionType && selectedText) {
      // 发送消息给 background script
      chrome.runtime.sendMessage({
        type: 'AI_ACTION',
        action: actionType,
        selectedText,
      } as ExtensionMessage);

      hideAll();
    }
  }
}

function showPanel() {
  panel.classList.add('visible');
  isPanelVisible = true;
}

function hidePanel() {
  panel.classList.remove('visible');
  isPanelVisible = false;
}

function hideAll() {
  floatingBtn.classList.remove('visible');
  hidePanel();
  selectedText = '';
}

// ============ 初始化 ============

function init() {
  // 创建 DOM 元素
  floatingBtn = createFloatingButton();
  panel = createPanel();

  document.body.appendChild(floatingBtn);
  document.body.appendChild(panel);

  // 绑定事件
  document.addEventListener('mouseup', handleMouseUp);
  document.addEventListener('mousedown', handleMouseDown);
  floatingBtn.addEventListener('click', handleFloatBtnClick);
  panel.addEventListener('click', handlePanelAction);

  // 监听来自 background 的消息（如右键菜单触发）
  chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
    if (message.type === 'GET_SELECTED_TEXT') {
      const selection = window.getSelection();
      const text = selection?.toString().trim() || '';
      sendResponse({ selectedText: text });
      return true; // 保持异步通道
    }
  });
}

// 启动
init();
