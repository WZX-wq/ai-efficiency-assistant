import { Request, Response, NextFunction } from 'express';

const API_KEY = process.env.API_KEY;

/**
 * API Key 验证中间件
 * 客户端需要在请求头中携带 Authorization: Bearer <api_key>
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  // 如果未配置 API_KEY，则跳过验证（开发模式）
  if (!API_KEY) {
    next();
    return;
  }

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({
      success: false,
      error: '缺少 Authorization 请求头',
    });
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    res.status(401).json({
      success: false,
      error: 'Authorization 格式错误，应为: Bearer <api_key>',
    });
    return;
  }

  const token = parts[1];
  if (token !== API_KEY) {
    res.status(403).json({
      success: false,
      error: 'API Key 无效',
    });
    return;
  }

  next();
}
