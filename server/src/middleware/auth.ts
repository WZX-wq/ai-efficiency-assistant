import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { IAuthRequest, IJwtPayload } from '../types/index';
import { UserRole } from '../types/user';

// 从环境变量获取JWT密钥
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';

/**
 * 验证JWT令牌中间件
 * 验证请求头中的Authorization Bearer令牌
 */
export const authenticate = async (
  req: IAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 获取Authorization头
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: '未提供认证令牌',
        error: 'Unauthorized'
      });
      return;
    }

    // 提取令牌
    const token = authHeader.substring(7);

    if (!token) {
      res.status(401).json({
        success: false,
        message: '认证令牌格式无效',
        error: 'Unauthorized'
      });
      return;
    }

    try {
      // 验证令牌
      const decoded = jwt.verify(token, JWT_SECRET) as IJwtPayload;

      // 查找用户
      const user = await User.findById(decoded.userId);

      if (!user) {
        res.status(401).json({
          success: false,
          message: '用户不存在',
          error: 'Unauthorized'
        });
        return;
      }

      // 检查用户是否被禁用
      if (!user.isActive) {
        res.status(403).json({
          success: false,
          message: '账户已被禁用',
          error: 'Forbidden'
        });
        return;
      }

      // 将用户信息和令牌附加到请求对象
      req.user = user;
      req.token = token;

      next();
    } catch (jwtError) {
      // 区分令牌过期和其他错误
      if (jwtError instanceof jwt.TokenExpiredError) {
        res.status(401).json({
          success: false,
          message: '认证令牌已过期',
          error: 'TokenExpired'
        });
        return;
      }

      res.status(401).json({
        success: false,
        message: '认证令牌无效',
        error: 'Unauthorized'
      });
      return;
    }
  } catch (error) {
    console.error('认证中间件错误:', error);
    res.status(500).json({
      success: false,
      message: '认证过程中发生错误',
      error: 'InternalServerError'
    });
    return;
  }
};

/**
 * 可选认证中间件
 * 验证令牌（如果存在），但不强制要求
 */
export const optionalAuth = async (
  req: IAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);

    if (!token) {
      return next();
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as IJwtPayload;
      const user = await User.findById(decoded.userId);

      if (user && user.isActive) {
        req.user = user;
        req.token = token;
      }
    } catch {
      // 可选认证失败不阻止请求
    }

    next();
  } catch (error) {
    console.error('可选认证中间件错误:', error);
    next();
  }
};

/**
 * 角色授权中间件工厂函数
 * 创建检查用户角色的中间件
 */
export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: IAuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: '未认证，无法访问此资源',
        error: 'Unauthorized'
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: '权限不足，无法访问此资源',
        error: 'Forbidden'
      });
      return;
    }

    next();
  };
};

/**
 * 管理员权限检查中间件
 */
export const requireAdmin = (req: IAuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: '未认证，无法访问此资源',
      error: 'Unauthorized'
    });
    return;
  }

  if (req.user.role !== UserRole.ADMIN) {
    res.status(403).json({
      success: false,
      message: '需要管理员权限',
      error: 'Forbidden'
    });
    return;
  }

  next();
};

/**
 * 生成访问令牌
 */
export const generateAccessToken = (payload: { userId: string; email: string; role: UserRole }): string => {
  return jwt.sign(
    {
      userId: payload.userId,
      email: payload.email,
      role: payload.role
    },
    JWT_SECRET,
    { expiresIn: '15m' } // 访问令牌15分钟过期
  );
};

/**
 * 生成刷新令牌
 */
export const generateRefreshToken = (payload: { userId: string; email: string; role: UserRole }): string => {
  return jwt.sign(
    {
      userId: payload.userId,
      email: payload.email,
      role: payload.role
    },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' } // 刷新令牌7天过期
  );
};

/**
 * 验证刷新令牌
 */
export const verifyRefreshToken = (token: string): IJwtPayload => {
  return jwt.verify(token, JWT_REFRESH_SECRET) as IJwtPayload;
};

/**
 * 生成令牌对（访问令牌 + 刷新令牌）
 */
export const generateTokenPair = (user: { _id: string; email: string; role: UserRole }) => {
  const payload = {
    userId: user._id.toString(),
    email: user.email,
    role: user.role
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  // 解析访问令牌以获取过期时间
  const decoded = jwt.decode(accessToken) as IJwtPayload;
  const expiresIn = decoded.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 900;

  return {
    accessToken,
    refreshToken,
    expiresIn
  };
};

export default {
  authenticate,
  optionalAuth,
  authorize,
  requireAdmin,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  generateTokenPair
};

// 导出 authenticateToken 作为 authenticate 的别名
export const authenticateToken = authenticate;
