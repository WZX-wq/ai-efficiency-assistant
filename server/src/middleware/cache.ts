import express, { Request, Response, NextFunction } from 'express';

/**
 * 缓存条目接口
 */
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  createdAt: number;
}

/**
 * 缓存统计信息
 */
interface CacheStats {
  size: number;
  keys: string[];
}

/**
 * 内存缓存管理器
 * 支持TTL过期，可后续替换为Redis实现
 */
class CacheManager {
  private store: Map<string, CacheEntry<any>>;
  private defaultTTL: number; // 毫秒
  private cleanupInterval: NodeJS.Timeout | null;

  constructor(defaultTTLMs: number = 5 * 60 * 1000) {
    this.store = new Map();
    this.defaultTTL = defaultTTLMs;
    this.cleanupInterval = null;

    // 每60秒自动清理过期条目
    this.cleanupInterval = setInterval(() => {
      const removed = this.cleanup();
      if (removed > 0) {
        console.log(`[Cache] 清理了 ${removed} 个过期条目`);
      }
    }, 60 * 1000);

    // 防止定时器阻止进程退出
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * 获取缓存数据
   * @param key 缓存键
   * @returns 缓存数据，如果不存在或已过期则返回null
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) {
      return null;
    }

    // 检查是否过期
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * 设置缓存数据
   * @param key 缓存键
   * @param data 缓存数据
   * @param ttlMs 过期时间（毫秒），默认使用构造函数中的defaultTTL
   */
  set<T>(key: string, data: T, ttlMs?: number): void {
    const ttl = ttlMs !== undefined ? ttlMs : this.defaultTTL;
    const entry: CacheEntry<T> = {
      data,
      expiresAt: Date.now() + ttl,
      createdAt: Date.now(),
    };
    this.store.set(key, entry);
  }

  /**
   * 删除缓存条目
   * @param key 缓存键
   * @returns 是否成功删除
   */
  delete(key: string): boolean {
    return this.store.delete(key);
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * 检查缓存键是否存在且未过期
   * @param key 缓存键
   * @returns 是否存在
   */
  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) {
      return false;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return false;
    }

    return true;
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): CacheStats {
    // 先清理过期条目再统计
    this.cleanup();
    return {
      size: this.store.size,
      keys: Array.from(this.store.keys()),
    };
  }

  /**
   * 清理所有过期条目
   * @returns 清理的条目数量
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
        removed++;
      }
    }
    return removed;
  }

  /**
   * 销毁缓存管理器，清理定时器
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.store.clear();
  }
}

// 导出全局缓存实例，默认5分钟TTL
export const cache = new CacheManager(5 * 60 * 1000);

/**
 * 根据请求生成缓存键
 * 包含方法、路径和查询参数
 */
export function getCacheKey(req: Request): string {
  const url = req.originalUrl || req.url;
  const sortedParams = Object.keys(req.query)
    .sort()
    .map(k => `${k}=${req.query[k]}`)
    .join('&');
  const paramsStr = sortedParams ? `?${sortedParams}` : '';
  return `${req.method}:${url}${paramsStr}`;
}

/**
 * Express缓存中间件
 * 仅缓存GET请求的成功响应
 * @param ttlMs 缓存时间（毫秒）
 */
export function cacheMiddleware(ttlMs?: number): express.RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    // 仅缓存GET请求
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = getCacheKey(req);

    // 检查是否有缓存
    const cached = cache.get(cacheKey);
    if (cached) {
      res.set('X-Cache', 'HIT');
      res.json(cached);
      return;
    }

    // 保存原始的json方法
    const originalJson = res.json.bind(res);

    // 重写json方法以缓存响应
    res.json = (body: any): Response => {
      // 仅缓存成功的响应
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(cacheKey, body, ttlMs);
        res.set('X-Cache', 'MISS');
      }
      return originalJson(body);
    };

    next();
  };
}

export { CacheManager, CacheEntry, CacheStats };
export default cache;
