import express, { Request, Response, NextFunction } from 'express';

/**
 * 日志级别枚举
 */
enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * 日志条目结构
 */
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  module?: string;
  [key: string]: any;
}

/**
 * ANSI 颜色代码
 */
const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  white: '\x1b[37m',
  bold: '\x1b[1m',
};

/**
 * 日志级别对应的颜色和标签
 */
const LEVEL_CONFIG: Record<LogLevel, { color: string; label: string }> = {
  [LogLevel.DEBUG]: { color: COLORS.gray, label: 'DEBUG' },
  [LogLevel.INFO]: { color: COLORS.green, label: 'INFO ' },
  [LogLevel.WARN]: { color: COLORS.yellow, label: 'WARN ' },
  [LogLevel.ERROR]: { color: COLORS.red, label: 'ERROR' },
};

/**
 * HTTP 状态码颜色映射
 */
function getStatusColor(status: number): string {
  if (status >= 500) return COLORS.red;
  if (status >= 400) return COLORS.yellow;
  if (status >= 300) return COLORS.cyan;
  if (status >= 200) return COLORS.green;
  return COLORS.white;
}

/**
 * 格式化时间戳
 */
function formatTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const ms = String(now.getMilliseconds()).padStart(3, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${ms}`;
}

/**
 * 结构化JSON日志器
 * 支持彩色控制台输出和结构化日志记录
 */
class Logger {
  private level: LogLevel;

  constructor(level: LogLevel = LogLevel.INFO) {
    this.level = level;
  }

  /**
   * 设置日志级别
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * 获取当前日志级别
   */
  getLevel(): LogLevel {
    return this.level;
  }

  /**
   * 核心日志方法
   */
  private log(level: LogLevel, message: string, meta?: Record<string, any>, module?: string): void {
    if (level < this.level) {
      return;
    }

    const entry: LogEntry = {
      timestamp: formatTimestamp(),
      level,
      message,
      module,
      ...meta,
    };

    const config = LEVEL_CONFIG[level];
    const moduleStr = module ? `${COLORS.magenta}[${module}]${COLORS.reset} ` : '';

    // 彩色控制台输出
    const consoleOutput = `${COLORS.gray}${entry.timestamp}${COLORS.reset} ${config.color}${COLORS.bold}${config.label}${COLORS.reset} ${moduleStr}${message}`;

    if (Object.keys(meta || {}).length > 0) {
      console.log(consoleOutput, meta);
    } else {
      console.log(consoleOutput);
    }
  }

  /**
   * DEBUG 级别日志
   */
  debug(message: string, meta?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, meta);
  }

  /**
   * INFO 级别日志
   */
  info(message: string, meta?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, meta);
  }

  /**
   * WARN 级别日志
   */
  warn(message: string, meta?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, meta);
  }

  /**
   * ERROR 级别日志
   */
  error(message: string, meta?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, meta);
  }

  /**
   * 创建带模块名的子日志器
   */
  child(module: string): { debug: (msg: string, meta?: Record<string, any>) => void; info: (msg: string, meta?: Record<string, any>) => void; warn: (msg: string, meta?: Record<string, any>) => void; error: (msg: string, meta?: Record<string, any>) => void } {
    return {
      debug: (msg: string, meta?: Record<string, any>) => this.log(LogLevel.DEBUG, msg, meta, module),
      info: (msg: string, meta?: Record<string, any>) => this.log(LogLevel.INFO, msg, meta, module),
      warn: (msg: string, meta?: Record<string, any>) => this.log(LogLevel.WARN, msg, meta, module),
      error: (msg: string, meta?: Record<string, any>) => this.log(LogLevel.ERROR, msg, meta, module),
    };
  }

  /**
   * HTTP 请求日志中间件
   * 记录方法、URL、状态码、响应时间和客户端IP
   */
  httpLogger(): express.RequestHandler {
    return (req: Request, res: Response, next: NextFunction): void => {
      const startTime = Date.now();

      // 监听响应完成事件
      res.on('finish', () => {
        const responseTime = Date.now() - startTime;
        const status = res.statusCode;
        const method = req.method;
        const url = req.originalUrl || req.url;
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        const userAgent = req.headers['user-agent'] || '-';
        const contentLength = res.get('Content-Length') || '-';

        const statusColor = getStatusColor(status);
        const methodColor = method === 'GET' ? COLORS.green
          : method === 'POST' ? COLORS.cyan
          : method === 'PUT' ? COLORS.yellow
          : method === 'DELETE' ? COLORS.red
          : COLORS.white;

        const logMessage = `${methodColor}${COLORS.bold}${String(method).padEnd(7)}${COLORS.reset} ${url} ${statusColor}${status}${COLORS.reset} ${String(responseTime).padStart(4)}ms ${COLORS.gray}${contentLength}b${COLORS.reset} ${COLORS.gray}${ip}${COLORS.reset}`;

        // 根据状态码选择日志级别
        if (status >= 500) {
          this.error(logMessage, { method, url, status, responseTime, ip, userAgent });
        } else if (status >= 400) {
          this.warn(logMessage, { method, url, status, responseTime, ip, userAgent });
        } else if (responseTime > 1000) {
          this.warn(`[SLOW] ${logMessage}`, { method, url, status, responseTime, ip, userAgent });
        } else {
          this.info(logMessage, { method, url, status, responseTime, ip, userAgent });
        }
      });

      next();
    };
  }
}

// 解析日志级别环境变量
function parseLogLevel(envValue: string | undefined): LogLevel {
  if (!envValue) return LogLevel.INFO;
  const upper = envValue.toUpperCase();
  switch (upper) {
    case 'DEBUG': return LogLevel.DEBUG;
    case 'INFO': return LogLevel.INFO;
    case 'WARN': return LogLevel.WARN;
    case 'ERROR': return LogLevel.ERROR;
    default: return LogLevel.INFO;
  }
}

// 导出全局日志实例
export const logger = new Logger(parseLogLevel(process.env.LOG_LEVEL));

export { Logger, LogLevel, LogEntry };
export default logger;
