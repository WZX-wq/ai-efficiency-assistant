/**
 * 轻量级性能监控工具
 *
 * 使用 PerformanceObserver API 监控 Core Web Vitals：
 * - LCP (Largest Contentful Paint)
 * - FID (First Input Delay)
 * - CLS (Cumulative Layout Shift)
 * - FCP (First Contentful Paint)
 * - TTFB (Time to First Byte)
 * - INP (Interaction to Next Paint)
 *
 * 开发环境下输出到控制台，生产环境可对接监控服务。
 */

interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}

/** 评分阈值 */
const THRESHOLDS: Record<string, [number, number]> = {
  LCP: [2500, 4000],
  FID: [100, 300],
  CLS: [0.1, 0.25],
  FCP: [1800, 3000],
  TTFB: [800, 1800],
  INP: [200, 500],
};

function getRating(name: string, value: number): PerformanceMetric['rating'] {
  const [good, poor] = THRESHOLDS[name] ?? [0, Infinity];
  if (value <= good) return 'good';
  if (value <= poor) return 'needs-improvement';
  return 'poor';
}

/** 发送指标到分析服务 */
function sendMetric(metric: PerformanceMetric) {
  if (import.meta.env.DEV) {
    const emoji = metric.rating === 'good' ? '✓' : metric.rating === 'needs-improvement' ? '△' : '✗';
    console.log(
      `[Performance] ${emoji} ${metric.name}: ${metric.value.toFixed(2)}ms (${metric.rating})`
    );
  }
  // TODO: 生产环境对接监控服务
  // if (navigator.sendBeacon) {
  //   navigator.sendBeacon('/api/vitals', JSON.stringify(metric));
  // }
}

/** 监控 LCP (Largest Contentful Paint) */
function observeLCP() {
  if (!('PerformanceObserver' in window)) return;

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as PerformanceEntry & { startTime: number };
      sendMetric({
        name: 'LCP',
        value: lastEntry.startTime,
        rating: getRating('LCP', lastEntry.startTime),
      });
    });
    observer.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch {
    // 浏览器不支持
  }
}

/** 监控 FID (First Input Delay) */
function observeFID() {
  if (!('PerformanceObserver' in window)) return;

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries() as PerformanceEntry[];
      entries.forEach((entry) => {
        const processingStart = (entry as any).processingStart;
        if (processingStart) {
          const fid = processingStart - entry.startTime;
          sendMetric({
            name: 'FID',
            value: fid,
            rating: getRating('FID', fid),
          });
        }
      });
    });
    observer.observe({ type: 'first-input', buffered: true });
  } catch {
    // 浏览器不支持
  }
}

/** 监控 CLS (Cumulative Layout Shift) */
function observeCLS() {
  if (!('PerformanceObserver' in window)) return;

  try {
    let clsScore = 0;
    const observer = new PerformanceObserver((list) => {
      let sessionValue = 0;
      let sessionEntries: any[] = [];

      list.getEntries().forEach((entry: any) => {
        // 只计算非用户输入导致的布局偏移
        if (!entry.hadRecentInput) {
          const firstEntry = sessionEntries[0];
          const lastEntry = sessionEntries[sessionEntries.length - 1];

          // 如果与上一次偏移间隔超过 1 秒或超过 5 秒的窗口，重置会话
          if (
            firstEntry &&
            lastEntry &&
            entry.startTime - lastEntry.startTime > 1000 &&
            entry.startTime - firstEntry.startTime < 5000
          ) {
            sessionValue += entry.value;
          } else {
            sessionValue = entry.value;
          }
          sessionEntries = [...sessionEntries, entry];
          clsScore = Math.max(clsScore, sessionValue);
        }
      });

      sendMetric({
        name: 'CLS',
        value: clsScore,
        rating: getRating('CLS', clsScore),
      });
    });
    observer.observe({ type: 'layout-shift', buffered: true });
  } catch {
    // 浏览器不支持
  }
}

/** 监控 FCP (First Contentful Paint) */
function observeFCP() {
  if (!('PerformanceObserver' in window)) return;

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries() as PerformanceEntry[];
      const fcpEntry = entries.find((e) => e.name === 'first-contentful-paint');
      if (fcpEntry) {
        sendMetric({
          name: 'FCP',
          value: fcpEntry.startTime,
          rating: getRating('FCP', fcpEntry.startTime),
        });
      }
    });
    observer.observe({ type: 'paint', buffered: true });
  } catch {
    // 浏览器不支持
  }
}

/** 监控 TTFB (Time to First Byte) */
function observeTTFB() {
  if (!('PerformanceObserver' in window)) return;

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries() as PerformanceEntry[];
      const navEntry = entries.find((e) => e.entryType === 'navigation');
      if (navEntry) {
        const ttfb = (navEntry as any).responseStart - navEntry.startTime;
        sendMetric({
          name: 'TTFB',
          value: ttfb,
          rating: getRating('TTFB', ttfb),
        });
      }
    });
    observer.observe({ type: 'navigation', buffered: true });
  } catch {
    // 浏览器不支持
  }
}

/** 监控 INP (Interaction to Next Paint) */
function observeINP() {
  if (!('PerformanceObserver' in window)) return;

  try {
    let maxINP = 0;
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry: any) => {
        const duration = entry.duration || (entry.processingEnd - entry.startTime);
        if (duration > maxINP) {
          maxINP = duration;
        }
      });
      sendMetric({
        name: 'INP',
        value: maxINP,
        rating: getRating('INP', maxINP),
      });
    });
    observer.observe({ type: 'event', buffered: true });
  } catch {
    // 浏览器不支持
  }
}

/** 监控长任务 (Long Tasks) */
function observeLongTasks() {
  if (!('PerformanceObserver' in window)) return;

  try {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry: any) => {
        if (entry.duration > 50) {
          if (import.meta.env.DEV) {
            console.warn(
              `[Performance] Long Task detected: ${entry.duration.toFixed(2)}ms`,
              entry.name
            );
          }
        }
      });
    });
    observer.observe({ type: 'longtask', buffered: true });
  } catch {
    // 浏览器不支持
  }
}

/**
 * 启动所有性能监控
 * 应在应用入口 (main.tsx) 中调用
 */
export function reportWebVitals() {
  // 等待页面加载完成后再开始监控
  if (typeof window === 'undefined') return;

  observeLCP();
  observeFID();
  observeCLS();
  observeFCP();
  observeTTFB();
  observeINP();
  observeLongTasks();
}

/**
 * 手动测量自定义性能指标
 * @example
 * ```ts
 * const start = markStart('my-feature');
 * // ... 执行操作 ...
 * measureCustom('my-feature', start);
 * ```
 */
export function markStart(label: string): number {
  if (typeof performance !== 'undefined') {
    performance.mark(`${label}-start`);
    return performance.now();
  }
  return Date.now();
}

export function measureCustom(label: string, startTime: number): number {
  const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const duration = endTime - startTime;

  if (import.meta.env.DEV) {
    console.log(`[Performance] ${label}: ${duration.toFixed(2)}ms`);
  }

  return duration;
}
