import { Component, ReactNode, ErrorInfo } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  showDetails: boolean;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, showDetails: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, showDetails: false };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] 捕获到渲染错误:', error, info.componentStack);
  }

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null, showDetails: false });
    window.location.href = '/';
  };

  private handleReload = () => {
    this.setState({ hasError: false, error: null, showDetails: false });
    window.location.reload();
  };

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, showDetails: false });
  };

  private toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-red-50 via-orange-50 to-amber-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
          <div className="max-w-md w-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 dark:border-gray-700 p-8 text-center">
            {/* 错误图标 - larger */}
            <div className="mx-auto w-20 h-20 flex items-center justify-center rounded-full bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900/40 dark:to-orange-900/40 mb-6 shadow-inner">
              <svg
                className="w-10 h-10 text-red-500 dark:text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            </div>

            {/* 标题 */}
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              页面加载出错
            </h2>

            {/* 错误信息 */}
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 break-words">
              {this.state.error?.message || '发生了未知错误，请稍后重试。'}
            </p>

            {/* 查看详情 toggle */}
            {this.state.error?.stack && (
              <div className="mb-6">
                <button
                  onClick={this.toggleDetails}
                  className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
                >
                  {this.state.showDetails ? '收起详情 ▲' : '查看详情 ▼'}
                </button>
                {this.state.showDetails && (
                  <pre className="mt-2 p-3 text-left text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 rounded-lg overflow-auto max-h-40 break-all whitespace-pre-wrap">
                    {this.state.error.stack}
                  </pre>
                )}
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={this.handleGoHome}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors cursor-pointer"
              >
                返回首页
              </button>
              <button
                onClick={this.handleRetry}
                className="px-5 py-2.5 text-sm font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition-colors shadow-sm cursor-pointer"
              >
                重试
              </button>
              <button
                onClick={this.handleReload}
                className="px-5 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors shadow-sm cursor-pointer"
              >
                刷新页面
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
