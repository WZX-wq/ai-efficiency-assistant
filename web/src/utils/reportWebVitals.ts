import { onCLS, onLCP, onFCP, onTTFB, onINP, type Metric } from 'web-vitals';

function sendToAnalytics(metric: Metric) {
  // 在开发环境下输出到控制台，生产环境可发送到监控服务
  if (import.meta.env.DEV) {
    console.log(`[Web Vitals] ${metric.name}: ${metric.value.toFixed(2)} (${metric.rating})`);
  }
  // TODO: 生产环境可发送到 Google Analytics / Sentry / 自定义端点
  // if (navigator.sendBeacon) {
  //   navigator.sendBeacon('/api/vitals', JSON.stringify(metric));
  // }
}

export function reportWebVitals() {
  onCLS(sendToAnalytics);
  onLCP(sendToAnalytics);
  onFCP(sendToAnalytics);
  onTTFB(sendToAnalytics);
  onINP(sendToAnalytics);
}
