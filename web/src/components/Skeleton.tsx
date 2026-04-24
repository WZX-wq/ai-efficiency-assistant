/**
 * 企业级骨架屏组件
 * 参考自 shadcn/ui Skeleton 设计
 */

/** 基础骨架条 */
export function Skeleton({
  className = '',
  variant = 'text',
}: {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
}) {
  const base = 'animate-pulse bg-gray-200 dark:bg-gray-700';

  const variants = {
    text: 'rounded-md h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-xl',
  };

  return <div className={`${base} ${variants[variant]} ${className}`} />;
}

/** 卡片骨架 */
export function CardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10" variant="circular" />
        <div className="flex-1 space-y-2">
          <Skeleton className="w-1/3 h-4" />
          <Skeleton className="w-1/2 h-3" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="w-full h-3" />
        <Skeleton className="w-4/5 h-3" />
        <Skeleton className="w-3/5 h-3" />
      </div>
    </div>
  );
}

/** 表单骨架 */
export function FormSkeleton({ fields = 3 }: { fields?: number }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <Skeleton className="w-10 h-10" variant="circular" />
        <div className="space-y-2">
          <Skeleton className="w-32 h-5" />
          <Skeleton className="w-48 h-3" />
        </div>
      </div>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="w-20 h-3.5" />
          <Skeleton className="w-full h-10" variant="rectangular" />
        </div>
      ))}
      <Skeleton className="w-full h-11" variant="rectangular" />
    </div>
  );
}

/** 聊天消息骨架 */
export function ChatMessageSkeleton() {
  return (
    <div className="flex gap-3 animate-pulse">
      <Skeleton className="w-8 h-8 shrink-0" variant="circular" />
      <div className="flex-1 space-y-2">
        <Skeleton className="w-3/4 h-4" />
        <Skeleton className="w-full h-4" />
        <Skeleton className="w-1/2 h-4" />
      </div>
    </div>
  );
}

/** 页面骨架 */
export function PageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="w-48 h-8" />
          <Skeleton className="w-72 h-4" />
        </div>
        <CardSkeleton />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    </div>
  );
}

/** 工具页骨架 */
export function ToolPageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20 space-y-6">
        <div className="space-y-2">
          <Skeleton className="w-12 h-3" />
          <Skeleton className="w-40 h-9" />
          <Skeleton className="w-64 h-4" />
        </div>
        <FormSkeleton fields={4} />
      </div>
    </div>
  );
}
