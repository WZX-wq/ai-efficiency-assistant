import express, { Request, Response, NextFunction } from 'express';

/**
 * 速率限制配置
 */
interface RateLimitConfig {
  /** 时间窗口（毫秒） */
  windowMs: number;
  /** 时间窗口内最大请求数 */
  maxRequests: number;
  /** 自定义错误消息 */
  message?: string;
}

/**
 * 速率限制信息
 */
interface RateLimitInfo {
  /** 剩余请求数 */
  remaining: number;
  /** 重置时间（Unix时间戳，秒） */
  resetTime: number;
  /** 请求限制 */
  limit: number;
}

/**
 * 内部存储条目
 */
interface RateLimitEntry {
  /** 当前窗口已用请求数 */
  count: number;
  /** 窗口重置时间（毫秒时间戳） */
  resetTime: number;
}

/**
 * 创建速率限制中间件
 * 基于固定窗口算法，按客户端IP限制请求频率
 * @param config 速率限制配置
 */
export function rateLimit(config: RateLimitConfig): express.RequestHandler {
  const store = new Map<string, RateLimitEntry>();
  const { windowMs, maxRequests, message } = config;

  // 定期清理过期条目，防止内存泄漏
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now >= entry.resetTime) {
        store.delete(key);
      }
    }
  }, Math.max(windowMs, 60 * 1000));

  // 防止定时器阻止进程退出
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const entry = store.get(ip);

    if (!entry || now >= entry.resetTime) {
      // 新窗口，重置计数
      const resetTime = now + windowMs;
      store.set(ip, {
        count: 1,
        resetTime,
      });

      // 设置速率限制响应头
      const info: RateLimitInfo = {
        remaining: maxRequests - 1,
        resetTime: Math.ceil(resetTime / 1000),
        limit: maxRequests,
      };
      res.set('X-RateLimit-Limit', String(info.limit));
      res.set('X-RateLimit-Remaining', String(info.remaining));
      res.set('X-RateLimit-Reset', String(info.resetTime));

      next();
      return;
    }

    if (entry.count >= maxRequests) {
      // 超过限制
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      const info: RateLimitInfo = {
        remaining: 0,
        resetTime: Math.ceil(entry.resetTime / 1000),
        limit: maxRequests,
      };

      res.set('X-RateLimit-Limit', String(info.limit));
      res.set('X-RateLimit-Remaining', '0');
      res.set('X-RateLimit-Reset', String(info.resetTime));
      res.set('Retry-After', String(retryAfter));

      res.status(429).json({
        success: false,
        error: message || '请求过于频繁，请稍后再试',
        retryAfter,
      });
      return;
    }

    // 正常请求，递增计数
    entry.count += 1;
    const remaining = maxRequests - entry.count;

    res.set('X-RateLimit-Limit', String(maxRequests));
    res.set('X-RateLimit-Remaining', String(remaining));
    res.set('X-RateLimit-Reset', String(Math.ceil(entry.resetTime / 1000)));

    next();
  };
}

export { RateLimitConfig, RateLimitInfo };
export default rateLimit;
