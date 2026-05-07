import { Router, Response } from 'express';
import User from '../models/User';
import { authenticate, authorize, requireAdmin } from '../middleware/auth';
import {
  IAuthRequest,
  IApiResponse,
  IUserResponse,
  IUpdateProfileRequest,
  IUpdateSettingsRequest,
  UserRole
} from '../types';

const router = Router();

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: 获取当前用户资料
 *     tags: [用户]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 用户资料
 */
router.get(
  '/profile',
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

      // 重新查询以获取最新数据
      const user = await User.findById(req.user._id);

      if (!user) {
        res.status(404).json({
          success: false,
          message: '用户不存在',
          error: 'NotFound'
        });
        return;
      }

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
        message: '获取用户资料成功',
        data: userResponse
      });
    } catch (error) {
      console.error('获取用户资料错误:', error);
      res.status(500).json({
        success: false,
        message: '获取用户资料过程中发生错误',
        error: 'InternalServerError'
      });
    }
  }
);

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     summary: 更新用户资料
 *     tags: [用户]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               avatar:
 *                 type: string
 *     responses:
 *       200:
 *         description: 更新成功
 */
router.put(
  '/profile',
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

      const { name, avatar } = req.body as IUpdateProfileRequest;

      // 验证输入
      if (name !== undefined) {
        if (name.length < 2 || name.length > 50) {
          res.status(400).json({
            success: false,
            message: '用户名长度必须在2-50位之间',
            error: 'BadRequest'
          });
          return;
        }
      }

      // 构建更新对象
      const updateData: Partial<IUpdateProfileRequest> = {};
      if (name !== undefined) updateData.name = name.trim();
      if (avatar !== undefined) updateData.avatar = avatar;

      // 如果没有要更新的字段
      if (Object.keys(updateData).length === 0) {
        res.status(400).json({
          success: false,
          message: '没有提供要更新的字段',
          error: 'BadRequest'
        });
        return;
      }

      // 更新用户
      const user = await User.findByIdAndUpdate(
        req.user._id,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!user) {
        res.status(404).json({
          success: false,
          message: '用户不存在',
          error: 'NotFound'
        });
        return;
      }

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
        message: '用户资料更新成功',
        data: userResponse
      });
    } catch (error) {
      console.error('更新用户资料错误:', error);
      res.status(500).json({
        success: false,
        message: '更新用户资料过程中发生错误',
        error: 'InternalServerError'
      });
    }
  }
);

/**
 * @swagger
 * /api/users/settings:
 *   get:
 *     summary: 获取用户设置
 *     tags: [用户]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 用户设置
 */
router.get(
  '/settings',
  authenticate,
  async (req: IAuthRequest, res: Response<IApiResponse<IUserResponse['settings']>>): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: '未认证',
          error: 'Unauthorized'
        });
        return;
      }

      const user = await User.findById(req.user._id);

      if (!user) {
        res.status(404).json({
          success: false,
          message: '用户不存在',
          error: 'NotFound'
        });
        return;
      }

      res.json({
        success: true,
        message: '获取用户设置成功',
        data: user.settings
      });
    } catch (error) {
      console.error('获取用户设置错误:', error);
      res.status(500).json({
        success: false,
        message: '获取用户设置过程中发生错误',
        error: 'InternalServerError'
      });
    }
  }
);

/**
 * @swagger
 * /api/users/settings:
 *   put:
 *     summary: 更新用户设置
 *     tags: [用户]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 设置更新成功
 */
router.put(
  '/settings',
  authenticate,
  async (req: IAuthRequest, res: Response<IApiResponse<IUserResponse['settings']>>): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: '未认证',
          error: 'Unauthorized'
        });
        return;
      }

      const { theme, language, notifications, privacy } = req.body as IUpdateSettingsRequest;

      // 构建更新对象
      const updateData: Record<string, unknown> = {};

      if (theme !== undefined) {
        if (!['light', 'dark', 'auto'].includes(theme)) {
          res.status(400).json({
            success: false,
            message: '主题必须是 light、dark 或 auto',
            error: 'BadRequest'
          });
          return;
        }
        updateData['settings.theme'] = theme;
      }

      if (language !== undefined) {
        updateData['settings.language'] = language;
      }

      if (notifications !== undefined) {
        if (notifications.email !== undefined) {
          updateData['settings.notifications.email'] = notifications.email;
        }
        if (notifications.push !== undefined) {
          updateData['settings.notifications.push'] = notifications.push;
        }
        if (notifications.desktop !== undefined) {
          updateData['settings.notifications.desktop'] = notifications.desktop;
        }
      }

      if (privacy !== undefined) {
        if (privacy.showProfile !== undefined) {
          updateData['settings.privacy.showProfile'] = privacy.showProfile;
        }
        if (privacy.showActivity !== undefined) {
          updateData['settings.privacy.showActivity'] = privacy.showActivity;
        }
      }

      // 如果没有要更新的字段
      if (Object.keys(updateData).length === 0) {
        res.status(400).json({
          success: false,
          message: '没有提供要更新的设置字段',
          error: 'BadRequest'
        });
        return;
      }

      // 更新用户设置
      const user = await User.findByIdAndUpdate(
        req.user._id,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!user) {
        res.status(404).json({
          success: false,
          message: '用户不存在',
          error: 'NotFound'
        });
        return;
      }

      res.json({
        success: true,
        message: '用户设置更新成功',
        data: user.settings
      });
    } catch (error) {
      console.error('更新用户设置错误:', error);
      res.status(500).json({
        success: false,
        message: '更新用户设置过程中发生错误',
        error: 'InternalServerError'
      });
    }
  }
);

/**
 * @swagger
 * /api/users/account:
 *   delete:
 *     summary: 注销账户（软删除）
 *     tags: [用户]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 账户已注销
 */
router.delete(
  '/account',
  authenticate,
  async (req: IAuthRequest, res: Response<IApiResponse<null>>): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: '未认证',
          error: 'Unauthorized'
        });
        return;
      }

      // 软删除：将用户标记为不活跃
      const user = await User.findByIdAndUpdate(
        req.user._id,
        { $set: { isActive: false } },
        { new: true }
      );

      if (!user) {
        res.status(404).json({
          success: false,
          message: '用户不存在',
          error: 'NotFound'
        });
        return;
      }

      res.json({
        success: true,
        message: '账户已注销',
        data: null
      });
    } catch (error) {
      console.error('注销账户错误:', error);
      res.status(500).json({
        success: false,
        message: '注销账户过程中发生错误',
        error: 'InternalServerError'
      });
    }
  }
);

// ==================== 管理员路由 ====================

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: 获取所有用户列表（管理员）
 *     tags: [用户]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 用户列表
 */
router.get(
  '/',
  authenticate,
  requireAdmin,
  async (req: IAuthRequest, res: Response<IApiResponse<{ users: IUserResponse[]; total: number }>>): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      // 构建查询条件
      const query: Record<string, unknown> = {};

      // 角色过滤
      if (req.query.role) {
        query.role = req.query.role;
      }

      // 状态过滤
      if (req.query.isActive !== undefined) {
        query.isActive = req.query.isActive === 'true';
      }

      // 搜索
      if (req.query.search) {
        const searchRegex = new RegExp(req.query.search as string, 'i');
        query.$or = [
          { name: searchRegex },
          { email: searchRegex }
        ];
      }

      // 执行查询
      const [users, total] = await Promise.all([
        User.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        User.countDocuments(query)
      ]);

      const usersResponse: IUserResponse[] = users.map(user => ({
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
      }));

      res.json({
        success: true,
        message: '获取用户列表成功',
        data: {
          users: usersResponse,
          total
        }
      });
    } catch (error) {
      console.error('获取用户列表错误:', error);
      res.status(500).json({
        success: false,
        message: '获取用户列表过程中发生错误',
        error: 'InternalServerError'
      });
    }
  }
);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: 获取用户详情（管理员）
 *     tags: [用户]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 用户详情
 */
router.get(
  '/:id',
  authenticate,
  requireAdmin,
  async (req: IAuthRequest, res: Response<IApiResponse<IUserResponse>>): Promise<void> => {
    try {
      const user = await User.findById(req.params.id);

      if (!user) {
        res.status(404).json({
          success: false,
          message: '用户不存在',
          error: 'NotFound'
        });
        return;
      }

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
        message: '获取用户详情成功',
        data: userResponse
      });
    } catch (error) {
      console.error('获取用户详情错误:', error);
      res.status(500).json({
        success: false,
        message: '获取用户详情过程中发生错误',
        error: 'InternalServerError'
      });
    }
  }
);

/**
 * @swagger
 * /api/users/{id}/role:
 *   put:
 *     summary: 修改用户角色（管理员）
 *     tags: [用户]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 角色更新成功
 */
router.put(
  '/:id/role',
  authenticate,
  requireAdmin,
  async (req: IAuthRequest, res: Response<IApiResponse<IUserResponse>>): Promise<void> => {
    try {
      const { role } = req.body;

      if (!role || !Object.values(UserRole).includes(role)) {
        res.status(400).json({
          success: false,
          message: '请提供有效的角色（user, admin, premium）',
          error: 'BadRequest'
        });
        return;
      }

      // 防止管理员降级自己
      if (req.params.id === req.user?._id.toString() && role !== UserRole.ADMIN) {
        res.status(400).json({
          success: false,
          message: '不能修改自己的管理员权限',
          error: 'BadRequest'
        });
        return;
      }

      const user = await User.findByIdAndUpdate(
        req.params.id,
        { $set: { role } },
        { new: true }
      );

      if (!user) {
        res.status(404).json({
          success: false,
          message: '用户不存在',
          error: 'NotFound'
        });
        return;
      }

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
        message: '用户角色更新成功',
        data: userResponse
      });
    } catch (error) {
      console.error('更新用户角色错误:', error);
      res.status(500).json({
        success: false,
        message: '更新用户角色过程中发生错误',
        error: 'InternalServerError'
      });
    }
  }
);

/**
 * @swagger
 * /api/users/{id}/status:
 *   put:
 *     summary: 启用/禁用用户账户（管理员）
 *     tags: [用户]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 状态更新成功
 */
router.put(
  '/:id/status',
  authenticate,
  requireAdmin,
  async (req: IAuthRequest, res: Response<IApiResponse<IUserResponse>>): Promise<void> => {
    try {
      const { isActive } = req.body;

      if (typeof isActive !== 'boolean') {
        res.status(400).json({
          success: false,
          message: '请提供有效的状态值（true 或 false）',
          error: 'BadRequest'
        });
        return;
      }

      // 防止管理员禁用自己
      if (req.params.id === req.user?._id.toString() && !isActive) {
        res.status(400).json({
          success: false,
          message: '不能禁用自己的账户',
          error: 'BadRequest'
        });
        return;
      }

      const user = await User.findByIdAndUpdate(
        req.params.id,
        { $set: { isActive } },
        { new: true }
      );

      if (!user) {
        res.status(404).json({
          success: false,
          message: '用户不存在',
          error: 'NotFound'
        });
        return;
      }

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
        message: isActive ? '用户账户已启用' : '用户账户已禁用',
        data: userResponse
      });
    } catch (error) {
      console.error('更新用户状态错误:', error);
      res.status(500).json({
        success: false,
        message: '更新用户状态过程中发生错误',
        error: 'InternalServerError'
      });
    }
  }
);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: 删除用户（仅管理员）
 *     tags: [用户]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 用户已删除
 */
router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  async (req: IAuthRequest, res: Response<IApiResponse<null>>): Promise<void> => {
    try {
      // 防止管理员删除自己
      if (req.params.id === req.user?._id.toString()) {
        res.status(400).json({
          success: false,
          message: '不能删除自己的账户',
          error: 'BadRequest'
        });
        return;
      }

      const user = await User.findByIdAndDelete(req.params.id);

      if (!user) {
        res.status(404).json({
          success: false,
          message: '用户不存在',
          error: 'NotFound'
        });
        return;
      }

      res.json({
        success: true,
        message: '用户已删除',
        data: null
      });
    } catch (error) {
      console.error('删除用户错误:', error);
      res.status(500).json({
        success: false,
        message: '删除用户过程中发生错误',
        error: 'InternalServerError'
      });
    }
  }
);

export default router;
