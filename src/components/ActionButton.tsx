import type { ActionConfig } from '@/types';

interface ActionButtonProps {
  action: ActionConfig;
  onClick: () => void;
  disabled: boolean;
  isLoading: boolean;
}

/** 操作按钮的样式映射 */
const BUTTON_STYLES: Record<string, { bg: string; hover: string; active: string; icon: string }> = {
  rewrite: {
    bg: 'bg-violet-50 text-violet-600 border-violet-200',
    hover: 'hover:bg-violet-100 hover:border-violet-300',
    active: 'active:bg-violet-200',
    icon: 'Aa',
  },
  expand: {
    bg: 'bg-blue-50 text-blue-600 border-blue-200',
    hover: 'hover:bg-blue-100 hover:border-blue-300',
    active: 'active:bg-blue-200',
    icon: '+',
  },
  translate: {
    bg: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    hover: 'hover:bg-emerald-100 hover:border-emerald-300',
    active: 'active:bg-emerald-200',
    icon: 'T',
  },
  summarize: {
    bg: 'bg-amber-50 text-amber-600 border-amber-200',
    hover: 'hover:bg-amber-100 hover:border-amber-300',
    active: 'active:bg-amber-200',
    icon: 'S',
  },
};

/**
 * 操作按钮组件
 */
export default function ActionButton({
  action,
  onClick,
  disabled,
  isLoading,
}: ActionButtonProps) {
  const style = BUTTON_STYLES[action.type] || BUTTON_STYLES.rewrite;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg border text-xs font-medium
        transition-all duration-150 cursor-pointer
        ${style.bg} ${style.hover} ${style.active}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      title={action.description}
    >
      {isLoading ? (
        <svg
          className="w-4 h-4 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        <span className="text-sm font-bold">{style.icon}</span>
      )}
      <span>{action.label}</span>
    </button>
  );
}
