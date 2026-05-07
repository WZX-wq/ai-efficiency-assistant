import { Router, Request, Response } from 'express';
import User from '../models/User';
import {
  authenticate,
  generateTokenPair,
  verifyRefreshToken,
  generateAccessToken
} from '../middleware/auth';
import {
  ILoginRequest,
  IRegisterRequest,
  IAuthRequest,
  IApiResponse,
  IUserResponse,
  ITokenResponse,
  IJwtPayload
} from '../types';

const router = Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: 用户注册
 *     description: 使用邮箱、密码和用户名注册新账户，注册成功后自动登录并返回令牌
 *     tags: [认证]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, name]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: password123
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 example: 张三
 *     responses:
 *       201:
 *         description: 注册成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       400:
 *         description: 参数错误
 *       409:
 *         description: 邮箱已被注册
 */
router.post(
  '/register',
  async (req: Request, res: Response<IApiResponse<IUserResponse & ITokenResponse>>): Promise<void> => {
    try {
      const { email, password, name } = req.body as IRegisterRequest;

      // 验证必填字段
      if (!email || !password || !name) {
        res.status(400).json({
          success: false,
          message: '请提供所有必填字段：email, password, name',
          error: 'BadRequest'
        });
        return;
      }

      // 验证邮箱格式
      const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({
          success: false,
          message: '请输入有效的邮箱地址',
          error: 'BadRequest'
        });
        return;
      }

      // 验证密码长度
      if (password.length < 6) {
        res.status(400).json({
          success: false,
          message: '密码长度至少为6位',
          error: 'BadRequest'
        });
        return;
      }

      // 验证用户名长度
      if (name.length < 2 || name.length > 50) {
        res.status(400).json({
          success: false,
          message: '用户名长度必须在2-50位之间',
          error: 'BadRequest'
        });
        return;
      }

      // 检查邮箱是否已存在
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        res.status(409).json({
          success: false,
          message: '该邮箱已被注册',
          error: 'Conflict'
        });
        return;
      }

      // 创建新用户
      const user = new User({
        email: email.toLowerCase(),
        password,
        name: name.trim()
      });

      await user.save();

      // 生成令牌对
      const tokens = generateTokenPair({
        _id: user._id.toString(),
        email: user.email,
        role: user.role
      });

      // 更新最后登录时间
      await user.updateLastLogin();

      // 构建响应数据
      const userResponse: IUserResponse = {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        avatar: user.avatar || undefined,
        role: user.role,
        settings: user.settings,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLoginAt: user.lastLoginAt || undefined
      };

      res.status(201).json({
        success: true,
        message: '注册成功',
        data: {
          ...userResponse,
          ...tokens
        }
      });
    } catch (error) {
      console.error('注册错误:', error);
      res.status(500).json({
        success: false,
        message: '注册过程中发生错误',
        error: 'InternalServerError'
      });
    }
  }
);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: 用户登录
 *     description: 使用邮箱和密码登录，返回访问令牌和刷新令牌
 *     tags: [认证]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: 登录成功
 *       401:
 *         description: 邮箱或密码错误
 *       403:
 *         description: 账户已被禁用
 */
router.post(
  '/login',
  async (req: Request, res: Response<IApiResponse<IUserResponse & ITokenResponse>>): Promise<void> => {
    try {
      const { email, password } = req.body as ILoginRequest;

      // 验证必填字段
      if (!email || !password) {
        res.status(400).json({
          success: false,
          message: '请提供邮箱和密码',
          error: 'BadRequest'
        });
        return;
      }

      // 查找用户（包含密码字段）
      const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

      if (!user) {
        res.status(401).json({
          success: false,
          message: '邮箱或密码错误',
          error: 'Unauthorized'
        });
        return;
      }

      // 检查用户是否被禁用
      if (!user.isActive) {
        res.status(403).json({
          success: false,
          message: '账户已被禁用，请联系管理员',
          error: 'Forbidden'
        });
        return;
      }

      // 验证密码
      const isPasswordValid = await user.comparePassword(password);

      if (!isPasswordValid) {
        res.status(401).json({
          success: false,
          message: '邮箱或密码错误',
          error: 'Unauthorized'
        });
        return;
      }

      // 生成令牌对
      const tokens = generateTokenPair({
        _id: user._id.toString(),
        email: user.email,
        role: user.role
      });

      // 更新最后登录时间
      await user.updateLastLogin();

      // 构建响应数据
      const userResponse: IUserResponse = {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        avatar: user.avatar || undefined,
        role: user.role,
        settings: user.settings,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLoginAt: user.lastLoginAt || undefined
      };

      res.json({
        success: true,
        message: '登录成功',
        data: {
          ...userResponse,
          ...tokens
        }
      });
    } catch (error) {
      console.error('登录错误:', error);
      res.status(500).json({
        success: false,
        message: '登录过程中发生错误',
        error: 'InternalServerError'
      });
    }
  }
);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: 刷新访问令牌
 *     description: 使用有效的刷新令牌获取新的令牌对
 *     tags: [认证]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     responses:
 *       200:
 *         description: 令牌刷新成功
 *       401:
 *         description: 刷新令牌无效或已过期
 */
router.post(
  '/refresh',
  async (req: Request, res: Response<IApiResponse<ITokenResponse>>): Promise<void> => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          message: '请提供刷新令牌',
          error: 'BadRequest'
        });
        return;
      }

      try {
        // 验证刷新令牌
        const decoded = verifyRefreshToken(refreshToken);

        // 查找用户
        const user = await User.findById(decoded.userId);

        if (!user || !user.isActive) {
          res.status(401).json({
            success: false,
            message: '用户不存在或已被禁用',
            error: 'Unauthorized'
          });
          return;
        }

        // 生成新的令牌对
        const tokens = generateTokenPair({
          _id: user._id.toString(),
          email: user.email,
          role: user.role
        });

        res.json({
          success: true,
          message: '令牌刷新成功',
          data: tokens
        });
      } catch (jwtError) {
        res.status(401).json({
          success: false,
          message: '刷新令牌无效或已过期',
          error: 'Unauthorized'
        });
        return;
      }
    } catch (error) {
      console.error('刷新令牌错误:', error);
      res.status(500).json({
        success: false,
        message: '刷新令牌过程中发生错误',
        error: 'InternalServerError'
      });
    }
  }
);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: 用户登出
 *     description: 客户端需要清除令牌
 *     tags: [认证]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 登出成功
 *       401:
 *         description: 未认证
 */
router.post(
  '/logout',
  authenticate,
  async (req: IAuthRequest, res: Response<IApiResponse<null>>): Promise<void> => {
    try {
      // 在客户端清除令牌即可
      // 如果需要实现令牌黑名单，可以在这里将令牌加入黑名单

      res.json({
        success: true,
        message: '登出成功',
        data: null
      });
    } catch (error) {
      console.error('登出错误:', error);
      res.status(500).json({
        success: false,
        message: '登出过程中发生错误',
        error: 'InternalServerError'
      });
    }
  }
);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: 获取当前登录用户信息
 *     description: 根据JWT令牌获取当前用户的详细信息
 *     tags: [认证]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 获取用户信息成功
 *       401:
 *         description: 未认证
 */
router.get(
  '/me',
  authenticate,
  async (req: IAuthRequest, res: Response<IApiResponse<IUserResponse>>): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: '未认证',
          error: 'Unauthorized'
        });
        return;
      }

      const userResponse: IUserResponse = {
        id: req.user._id.toString(),
        email: req.user.email,
        name: req.user.name,
        avatar: req.user.avatar || undefined,
        role: req.user.role,
        settings: req.user.settings,
        isActive: req.user.isActive,
        createdAt: req.user.createdAt,
        updatedAt: req.user.updatedAt,
        lastLoginAt: req.user.lastLoginAt || undefined
      };

      res.json({
        success: true,
        message: '获取用户信息成功',
        data: userResponse
      });
    } catch (error) {
      console.error('获取用户信息错误:', error);
      res.status(500).json({
        success: false,
        message: '获取用户信息过程中发生错误',
        error: 'InternalServerError'
      });
    }
  }
);

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: 修改密码
 *     description: 需要提供当前密码和新密码，新密码长度至少6位
 *     tags: [认证]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 example: oldpassword123
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *                 example: newpassword456
 *     responses:
 *       200:
 *         description: 密码修改成功
 *       400:
 *         description: 参数错误
 *       401:
 *         description: 当前密码错误
 */
router.post(
  '/change-password',
  authenticate,
  async (req: IAuthRequest, res: Response<IApiResponse<null>>): Promise<void> => {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        res.status(400).json({
          success: false,
          message: '请提供当前密码和新密码',
          error: 'BadRequest'
        });
        return;
      }

      if (newPassword.length < 6) {
        res.status(400).json({
          success: false,
          message: '新密码长度至少为6位',
          error: 'BadRequest'
        });
        return;
      }

      if (!req.user) {
        res.status(401).json({
          success: false,
          message: '未认证',
          error: 'Unauthorized'
        });
        return;
      }

      // 获取包含密码的用户文档
      const user = await User.findById(req.user._id).select('+password');

      if (!user) {
        res.status(404).json({
          success: false,
          message: '用户不存在',
          error: 'NotFound'
        });
        return;
      }

      // 验证当前密码
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);

      if (!isCurrentPasswordValid) {
        res.status(401).json({
          success: false,
          message: '当前密码错误',
          error: 'Unauthorized'
        });
        return;
      }

      // 更新密码
      user.password = newPassword;
      await user.save();

      res.json({
        success: true,
        message: '密码修改成功',
        data: null
      });
    } catch (error) {
      console.error('修改密码错误:', error);
      res.status(500).json({
        success: false,
        message: '修改密码过程中发生错误',
        error: 'InternalServerError'
      });
    }
  }
);

export default router;
