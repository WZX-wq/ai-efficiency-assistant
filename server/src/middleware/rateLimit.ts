import { Request, Response, NextFunction } from 'express';
import { RateLimitEntry } from '../types';

/**
 * 简单的内存速率限制中间件
 * 基于客户端 IP 地址，每个时间窗口内限制最大请求数
 */
export function rateLimit(maxRequests: number, windowMs: number) {
  const store = new Map<string, RateLimitEntry>();

  // 定期清理过期条目，防止内存泄漏
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now >= entry.resetTime) {
        store.delete(key);
      }
    }
  }, windowMs);

  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const entry = store.get(ip);

    if (!entry || now >= entry.resetTime) {
      // 新窗口，重置计数
      store.set(ip, {
        count: 1,
        resetTime: now + windowMs,
      });
      next();
      return;
    }

    if (entry.count >= maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      res.status(429).json({
        success: false,
        error: `请求过于频繁，请在 ${retryAfter} 秒后重试`,
        retryAfter,
      });
      return;
    }

    entry.count += 1;
    next();
  };
}
