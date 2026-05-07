import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { authenticate } from '../middleware/auth';
import Team, { ITeamDocument, TeamStatus } from '../models/Team';
import TeamMember, { ITeamMemberDocument, MemberStatus, MemberPermission } from '../models/TeamMember';
import User from '../models/User';
import { IAuthRequest, IApiResponse } from '../types/index';

const router = Router();

// 扩展 IAuthRequest 类型以包含 team 信息
declare global {
  namespace Express {
    interface Request {
      team?: ITeamDocument;
      membership?: ITeamMemberDocument;
    }
  }
}

// ==================== 中间件 ====================

/**
 * 团队访问权限中间件
 * 检查用户是否有权访问该团队
 */
const requireTeamAccess = async (
  req: IAuthRequest,
  res: Response,
  next: Function
): Promise<void> => {
  try {
    const { teamId } = req.params;

    if (!Types.ObjectId.isValid(teamId as string)) {
      res.status(400).json({
        success: false,
        message: '无效的团队ID',
        error: 'BadRequest'
      });
      return;
    }

    const team = await Team.findById(teamId as string);
    if (!team) {
      res.status(404).json({
        success: false,
        message: '团队不存在',
        error: 'NotFound'
      });
      return;
    }

    // 检查团队状态
    if (team.status !== TeamStatus.ACTIVE) {
      res.status(403).json({
        success: false,
        message: '团队当前不可用',
        error: 'Forbidden'
      });
      return;
    }

    // 检查用户是否是团队成员
    const membership = await TeamMember.findByTeamAndUser(teamId as string, req.user!._id.toString());

    if (!membership || membership.status !== MemberStatus.ACTIVE) {
      res.status(403).json({
        success: false,
        message: '您不是该团队的成员',
        error: 'Forbidden'
      });
      return;
    }

    req.team = team;
    req.membership = membership;
    next();
  } catch (error) {
    console.error('团队访问权限检查错误:', error);
    res.status(500).json({
      success: false,
      message: '权限检查过程中发生错误',
      error: 'InternalServerError'
    });
  }
};

/**
 * 团队管理员权限中间件
 */
const requireTeamAdmin = async (
  req: IAuthRequest,
  res: Response,
  next: Function
): Promise<void> => {
  try {
    const { teamId } = req.params;
    const membership = await TeamMember.findByTeamAndUser(teamId as string, req.user!._id.toString());

    if (!membership || membership.status !== MemberStatus.ACTIVE) {
      res.status(403).json({
        success: false,
        message: '您不是该团队的成员',
        error: 'Forbidden'
      });
      return;
    }

    if (membership.role !== MemberPermission.OWNER && membership.role !== MemberPermission.ADMIN) {
      res.status(403).json({
        success: false,
        message: '需要管理员权限',
        error: 'Forbidden'
      });
      return;
    }

    next();
  } catch (error) {
    console.error('团队管理员权限检查错误:', error);
    res.status(500).json({
      success: false,
      message: '权限检查过程中发生错误',
      error: 'InternalServerError'
    });
  }
};

/**
 * 团队所有者权限中间件
 */
const requireTeamOwner = async (
  req: IAuthRequest,
  res: Response,
  next: Function
): Promise<void> => {
  try {
    const { teamId } = req.params;
    const team = await Team.findById(teamId);

    if (!team) {
      res.status(404).json({
        success: false,
        message: '团队不存在',
        error: 'NotFound'
      });
      return;
    }

    if (team.owner.toString() !== req.user!._id.toString()) {
      res.status(403).json({
        success: false,
        message: '需要团队所有者权限',
        error: 'Forbidden'
      });
      return;
    }

    next();
  } catch (error) {
    console.error('团队所有者权限检查错误:', error);
    res.status(500).json({
      success: false,
      message: '权限检查过程中发生错误',
      error: 'InternalServerError'
    });
  }
};

// ==================== 团队 CRUD ====================

/**
 * @swagger
 * /api/teams:
 *   post:
 *     summary: 创建团队
 *     tags: [团队]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               avatar:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: 团队创建成功
 */
router.post(
  '/',
  authenticate,
  async (req: IAuthRequest, res: Response<IApiResponse<any>>): Promise<void> => {
    try {
      const { name, description, avatar, tags, settings } = req.body;

      // 验证必填字段
      if (!name) {
        res.status(400).json({
          success: false,
          message: '团队名称是必填项',
          error: 'BadRequest'
        });
        return;
      }

      // 创建团队
      const team = new Team({
        name,
        description: description || '',
        avatar: avatar || null,
        owner: req.user!._id,
        tags: tags || [],
        settings: settings || {}
      });

      await team.save();

      // 创建所有者成员记录
      const teamMember = new TeamMember({
        team: team._id,
        user: req.user!._id,
        role: MemberPermission.OWNER,
        status: MemberStatus.ACTIVE,
        joinedAt: new Date()
      });

      await teamMember.save();

      res.status(201).json({
        success: true,
        data: {
          team: team.toJSON(),
          membership: teamMember.toJSON()
        },
        message: '团队创建成功'
      });
    } catch (error: any) {
      console.error('创建团队错误:', error);
      res.status(500).json({
        success: false,
        message: error.message || '创建团队失败',
        error: 'InternalServerError'
      });
    }
  }
);

/**
 * @swagger
 * /api/teams:
 *   get:
 *     summary: 获取用户的所有团队
 *     tags: [团队]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 团队列表
 */
router.get(
  '/',
  authenticate,
  async (req: IAuthRequest, res: Response<IApiResponse<any>>): Promise<void> => {
    try {
      const { page = 1, limit = 10, search } = req.query;
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);

      // 获取用户所属的所有团队ID
      const memberships = await TeamMember.find({ user: req.user!._id })
        .select('team role status joinedAt');
      const teamIds = memberships.map(m => m.team);

      // 构建查询条件
      const query: any = {
        _id: { $in: teamIds },
        status: TeamStatus.ACTIVE
      };

      if (search) {
        query.$text = { $search: search as string };
      }

      // 查询团队
      const teams = await Team.find(query)
        .populate('owner', 'name email avatar')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum);

      const total = await Team.countDocuments(query);

      // 合并团队信息和成员角色
      const teamsWithRole = teams.map(team => {
        const membership = memberships.find(m =>
          m.team.toString() === team._id.toString()
        );
        return {
          ...team.toJSON(),
          myRole: membership?.role || null,
          myStatus: membership?.status || null,
          joinedAt: membership?.joinedAt || null
        };
      });

      res.json({
        success: true,
        data: {
          teams: teamsWithRole,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum)
          }
        }
      });
    } catch (error: any) {
      console.error('获取团队列表错误:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取团队列表失败',
        error: 'InternalServerError'
      });
    }
  }
);

/**
 * @swagger
 * /api/teams/{teamId}:
 *   get:
 *     summary: 获取团队详情
 *     tags: [团队]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 团队详情
 */
router.get(
  '/:teamId',
  authenticate,
  requireTeamAccess,
  async (req: IAuthRequest, res: Response<IApiResponse<any>>): Promise<void> => {
    try {
      const team = req.team!;

      // 获取成员信息
      const members = await TeamMember.findByTeam(team._id.toString());

      // 获取所有者信息
      const owner = await User.findById(team.owner).select('name email avatar');

      res.json({
        success: true,
        data: {
          team: team.toJSON(),
          owner: owner?.toJSON(),
          members: members.map(m => m.toJSON()),
          myRole: req.membership?.role,
          myPermissions: req.membership?.permissions
        }
      });
    } catch (error: any) {
      console.error('获取团队详情错误:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取团队详情失败',
        error: 'InternalServerError'
      });
    }
  }
);

/**
 * @swagger
 * /api/teams/{teamId}:
 *   put:
 *     summary: 更新团队信息
 *     tags: [团队]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 团队信息更新成功
 */
router.put(
  '/:teamId',
  authenticate,
  requireTeamAdmin,
  async (req: IAuthRequest, res: Response<IApiResponse<any>>): Promise<void> => {
    try {
      const { teamId } = req.params;
      const { name, description, avatar, tags, settings, status } = req.body;

      const team = await Team.findById(teamId);
      if (!team) {
        res.status(404).json({
          success: false,
          message: '团队不存在',
          error: 'NotFound'
        });
        return;
      }

      // 更新字段
      if (name !== undefined) team.name = name;
      if (description !== undefined) team.description = description;
      if (avatar !== undefined) team.avatar = avatar;
      if (tags !== undefined) team.tags = tags;
      if (settings !== undefined) {
        team.settings = { ...team.settings, ...settings };
      }

      // 只有所有者可以更改状态
      if (status !== undefined && team.owner.toString() === req.user!._id.toString()) {
        team.status = status;
      }

      await team.save();

      res.json({
        success: true,
        data: team.toJSON(),
        message: '团队信息更新成功'
      });
    } catch (error: any) {
      console.error('更新团队错误:', error);
      res.status(500).json({
        success: false,
        message: error.message || '更新团队失败',
        error: 'InternalServerError'
      });
    }
  }
);

/**
 * @swagger
 * /api/teams/{teamId}:
 *   delete:
 *     summary: 删除团队
 *     tags: [团队]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 团队已删除
 */
router.delete(
  '/:teamId',
  authenticate,
  requireTeamOwner,
  async (req: IAuthRequest, res: Response<IApiResponse<null>>): Promise<void> => {
    try {
      const { teamId } = req.params;

      // 删除团队
      await Team.findByIdAndDelete(teamId);

      // 删除所有成员记录
      await TeamMember.deleteMany({ team: teamId });

      res.json({
        success: true,
        message: '团队已删除',
        data: null
      });
    } catch (error: any) {
      console.error('删除团队错误:', error);
      res.status(500).json({
        success: false,
        message: error.message || '删除团队失败',
        error: 'InternalServerError'
      });
    }
  }
);

// ==================== 成员管理 ====================

/**
 * @swagger
 * /api/teams/{teamId}/members/invite:
 *   post:
 *     summary: 邀请成员加入团队
 *     tags: [团队]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *               role:
 *                 type: string
 *     responses:
 *       201:
 *         description: 邀请发送成功
 */
router.post(
  '/:teamId/members/invite',
  authenticate,
  requireTeamAdmin,
  async (req: IAuthRequest, res: Response<IApiResponse<any>>): Promise<void> => {
    try {
      const { teamId } = req.params;
      const { email, role = MemberPermission.VIEW } = req.body;

      if (!email) {
        res.status(400).json({
          success: false,
          message: '邮箱地址是必填项',
          error: 'BadRequest'
        });
        return;
      }

      // 查找用户
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        res.status(404).json({
          success: false,
          message: '用户不存在',
          error: 'NotFound'
        });
        return;
      }

      // 检查是否已经是成员
      const existingMember = await TeamMember.findByTeamAndUser(teamId as string, user._id.toString());
      if (existingMember) {
        res.status(400).json({
          success: false,
          message: '该用户已经是团队成员',
          error: 'BadRequest'
        });
        return;
      }

      // 创建成员记录
      const teamMember = new TeamMember({
        team: teamId as string,
        user: user._id,
        role: role,
        status: MemberStatus.PENDING,
        invitedBy: req.user!._id
      });

      await teamMember.save();

      // 更新团队成员计数
      const team = await Team.findById(teamId as string);
      if (team) {
        await (team as any).updateMemberCount();
      }

      res.status(201).json({
        success: true,
        data: teamMember.toJSON(),
        message: '邀请发送成功'
      });
    } catch (error: any) {
      console.error('邀请成员错误:', error);
      res.status(500).json({
        success: false,
        message: error.message || '邀请成员失败',
        error: 'InternalServerError'
      });
    }
  }
);

/**
 * @swagger
 * /api/teams/{teamId}/members/accept:
 *   post:
 *     summary: 接受团队邀请
 *     tags: [团队]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 已成功加入团队
 */
router.post(
  '/:teamId/members/accept',
  authenticate,
  async (req: IAuthRequest, res: Response<IApiResponse<any>>): Promise<void> => {
    try {
      const { teamId } = req.params;

      const membership = await TeamMember.findByTeamAndUser(teamId as string, req.user!._id.toString());

      if (!membership) {
        res.status(404).json({
          success: false,
          message: '邀请不存在',
          error: 'NotFound'
        });
        return;
      }

      if (membership.status !== MemberStatus.PENDING) {
        res.status(400).json({
          success: false,
          message: '邀请状态无效',
          error: 'BadRequest'
        });
        return;
      }

      await (membership as any).acceptInvitation();

      res.json({
        success: true,
        data: membership.toJSON(),
        message: '已成功加入团队'
      });
    } catch (error: any) {
      console.error('接受邀请错误:', error);
      res.status(500).json({
        success: false,
        message: error.message || '接受邀请失败',
        error: 'InternalServerError'
      });
    }
  }
);

/**
 * @swagger
 * /api/teams/{teamId}/members/reject:
 *   post:
 *     summary: 拒绝团队邀请
 *     tags: [团队]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 已拒绝邀请
 */
router.post(
  '/:teamId/members/reject',
  authenticate,
  async (req: IAuthRequest, res: Response<IApiResponse<null>>): Promise<void> => {
    try {
      const { teamId } = req.params;

      const membership = await TeamMember.findByTeamAndUser(teamId as string, req.user!._id.toString());

      if (!membership) {
        res.status(404).json({
          success: false,
          message: '邀请不存在',
          error: 'NotFound'
        });
        return;
      }

      if (membership.status !== MemberStatus.PENDING) {
        res.status(400).json({
          success: false,
          message: '邀请状态无效',
          error: 'BadRequest'
        });
        return;
      }

      membership.status = MemberStatus.REJECTED;
      await membership.save();

      res.json({
        success: true,
        message: '已拒绝邀请',
        data: null
      });
    } catch (error: any) {
      console.error('拒绝邀请错误:', error);
      res.status(500).json({
        success: false,
        message: error.message || '拒绝邀请失败',
        error: 'InternalServerError'
      });
    }
  }
);

/**
 * @swagger
 * /api/teams/{teamId}/members/{memberId}:
 *   delete:
 *     summary: 移除团队成员
 *     tags: [团队]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成员已移除
 */
router.delete(
  '/:teamId/members/:memberId',
  authenticate,
  requireTeamAdmin,
  async (req: IAuthRequest, res: Response<IApiResponse<null>>): Promise<void> => {
    try {
      const { teamId, memberId } = req.params;

      const membership = await TeamMember.findById(memberId as string);

      if (!membership || membership.team.toString() !== teamId) {
        res.status(404).json({
          success: false,
          message: '成员不存在',
          error: 'NotFound'
        });
        return;
      }

      // 不能移除所有者
      if (membership.role === MemberPermission.OWNER) {
        res.status(403).json({
          success: false,
          message: '不能移除团队所有者',
          error: 'Forbidden'
        });
        return;
      }

      // 检查权限：只有所有者和更高权限的管理员可以移除成员
      const myMembership = await TeamMember.findByTeamAndUser(teamId as string, req.user!._id.toString());
      if (
        myMembership?.role !== MemberPermission.OWNER &&
        membership.role === MemberPermission.ADMIN
      ) {
        res.status(403).json({
          success: false,
          message: '权限不足，无法移除该成员',
          error: 'Forbidden'
        });
        return;
      }

      await TeamMember.findByIdAndDelete(memberId as string);

      // 更新团队成员计数
      const team = await Team.findById(teamId as string);
      if (team) {
        await (team as any).updateMemberCount();
      }

      res.json({
        success: true,
        message: '成员已移除',
        data: null
      });
    } catch (error: any) {
      console.error('移除成员错误:', error);
      res.status(500).json({
        success: false,
        message: error.message || '移除成员失败',
        error: 'InternalServerError'
      });
    }
  }
);

/**
 * @swagger
 * /api/teams/{teamId}/members/{memberId}/role:
 *   put:
 *     summary: 更新成员角色/权限
 *     tags: [团队]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成员权限更新成功
 */
router.put(
  '/:teamId/members/:memberId/role',
  authenticate,
  requireTeamAdmin,
  async (req: IAuthRequest, res: Response<IApiResponse<any>>): Promise<void> => {
    try {
      const { teamId, memberId } = req.params;
      const { role, permissions } = req.body;

      const membership = await TeamMember.findById(memberId as string);

      if (!membership || membership.team.toString() !== teamId) {
        res.status(404).json({
          success: false,
          message: '成员不存在',
          error: 'NotFound'
        });
        return;
      }

      // 不能更改所有者角色
      if (membership.role === MemberPermission.OWNER) {
        res.status(403).json({
          success: false,
          message: '不能更改所有者的角色',
          error: 'Forbidden'
        });
        return;
      }

      // 只有所有者可以将成员设为管理员
      const myMembership = await TeamMember.findByTeamAndUser(teamId as string, req.user!._id.toString());
      if (
        role === MemberPermission.ADMIN &&
        myMembership?.role !== MemberPermission.OWNER
      ) {
        res.status(403).json({
          success: false,
          message: '只有所有者可以设置管理员',
          error: 'Forbidden'
        });
        return;
      }

      // 更新角色
      if (role) {
        await (membership as any).updateRole(role);
      }

      // 更新自定义权限
      if (permissions) {
        membership.permissions = { ...membership.permissions, ...permissions };
        await membership.save();
      }

      res.json({
        success: true,
        data: membership.toJSON(),
        message: '成员权限更新成功'
      });
    } catch (error: any) {
      console.error('更新成员角色错误:', error);
      res.status(500).json({
        success: false,
        message: error.message || '更新成员角色失败',
        error: 'InternalServerError'
      });
    }
  }
);

/**
 * @swagger
 * /api/teams/{teamId}/members:
 *   get:
 *     summary: 获取团队成员列表
 *     tags: [团队]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成员列表
 */
router.get(
  '/:teamId/members',
  authenticate,
  requireTeamAccess,
  async (req: IAuthRequest, res: Response<IApiResponse<any>>): Promise<void> => {
    try {
      const { teamId } = req.params;
      const { status, role, page = 1, limit = 20 } = req.query;

      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);

      // 构建查询条件
      const query: any = { team: teamId as string };
      if (status) query.status = status;
      if (role) query.role = role;

      const members = await TeamMember.find(query)
        .populate('user', 'name email avatar lastLoginAt')
        .populate('invitedBy', 'name email')
        .sort({ role: 1, joinedAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum);

      const total = await TeamMember.countDocuments(query);

      res.json({
        success: true,
        data: {
          members: members.map(m => m.toJSON()),
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum)
          }
        }
      });
    } catch (error: any) {
      console.error('获取成员列表错误:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取成员列表失败',
        error: 'InternalServerError'
      });
    }
  }
);

// ==================== 团队项目/文件共享 ====================

/**
 * @swagger
 * /api/teams/{teamId}/projects:
 *   get:
 *     summary: 获取团队项目列表
 *     tags: [团队]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 项目列表
 */
router.get(
  '/:teamId/projects',
  authenticate,
  requireTeamAccess,
  async (req: IAuthRequest, res: Response<IApiResponse<any>>): Promise<void> => {
    try {
      const { teamId } = req.params;
      const { page = 1, limit = 10, visibility } = req.query;

      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);

      // 这里应该查询项目模型，示例返回模拟数据
      // 实际项目中应该使用 Project 模型查询
      const mockProjects = [
        {
          id: '1',
          name: '示例项目 1',
          description: '这是一个示例项目',
          visibility: 'team',
          createdBy: req.user!._id,
          team: teamId,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      res.json({
        success: true,
        data: {
          projects: mockProjects,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: 1,
            totalPages: 1
          }
        }
      });
    } catch (error: any) {
      console.error('获取项目列表错误:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取项目列表失败',
        error: 'InternalServerError'
      });
    }
  }
);

/**
 * @swagger
 * /api/teams/{teamId}/projects:
 *   post:
 *     summary: 创建团队项目
 *     tags: [团队]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: 项目创建成功
 */
router.post(
  '/:teamId/projects',
  authenticate,
  requireTeamAccess,
  async (req: IAuthRequest, res: Response<IApiResponse<any>>): Promise<void> => {
    try {
      const { teamId } = req.params;
      const { name, description, visibility = 'team' } = req.body;

      // 检查权限
      const canCreate = await TeamMember.hasPermission(
        teamId as string,
        req.user!._id.toString(),
        'canCreateProject'
      );

      if (!canCreate) {
        res.status(403).json({
          success: false,
          message: '没有创建项目的权限',
          error: 'Forbidden'
        });
        return;
      }

      if (!name) {
        res.status(400).json({
          success: false,
          message: '项目名称是必填项',
          error: 'BadRequest'
        });
        return;
      }

      // 这里应该创建项目，示例返回模拟数据
      const newProject = {
        id: new Types.ObjectId().toString(),
        name,
        description: description || '',
        visibility,
        createdBy: req.user!._id,
        team: teamId as string,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // 更新团队项目计数
      const team = await Team.findById(teamId as string);
      if (team) {
        (team as any).projectCount += 1;
        await team.save();
      }

      res.status(201).json({
        success: true,
        data: newProject,
        message: '项目创建成功'
      });
    } catch (error: any) {
      console.error('创建项目错误:', error);
      res.status(500).json({
        success: false,
        message: error.message || '创建项目失败',
        error: 'InternalServerError'
      });
    }
  }
);

/**
 * @swagger
 * /api/teams/{teamId}/files:
 *   get:
 *     summary: 获取团队共享文件
 *     tags: [团队]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 文件列表
 */
router.get(
  '/:teamId/files',
  authenticate,
  requireTeamAccess,
  async (req: IAuthRequest, res: Response<IApiResponse<any>>): Promise<void> => {
    try {
      const { teamId } = req.params;
      const { page = 1, limit = 20, type } = req.query;

      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);

      // 这里应该查询文件模型，示例返回模拟数据
      const mockFiles = [
        {
          id: '1',
          filename: 'team-document.pdf',
          originalName: '团队文档.pdf',
          mimeType: 'application/pdf',
          size: 1024000,
          type: 'document',
          url: `/uploads/teams/${teamId}/team-document.pdf`,
          uploadedBy: req.user!._id,
          team: teamId,
          createdAt: new Date()
        }
      ];

      res.json({
        success: true,
        data: {
          files: mockFiles,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: 1,
            totalPages: 1
          }
        }
      });
    } catch (error: any) {
      console.error('获取文件列表错误:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取文件列表失败',
        error: 'InternalServerError'
      });
    }
  }
);

// ==================== 活动日志 ====================

/**
 * @swagger
 * /api/teams/{teamId}/activity:
 *   get:
 *     summary: 获取团队活动日志
 *     tags: [团队]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 活动日志
 */
router.get(
  '/:teamId/activity',
  authenticate,
  requireTeamAccess,
  async (req: IAuthRequest, res: Response<IApiResponse<any>>): Promise<void> => {
    try {
      const { teamId } = req.params;
      const { page = 1, limit = 20, action, userId, startDate, endDate } = req.query;

      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);

      // 这里应该查询活动日志模型，示例返回模拟数据
      const mockActivities = [
        {
          id: '1',
          action: 'member_joined',
          description: '新成员加入团队',
          user: {
            id: req.user!._id,
            name: req.user!.name,
            email: req.user!.email
          },
          team: teamId,
          metadata: {},
          createdAt: new Date()
        },
        {
          id: '2',
          action: 'project_created',
          description: '创建了新项目',
          user: {
            id: req.user!._id,
            name: req.user!.name,
            email: req.user!.email
          },
          team: teamId,
          metadata: { projectName: '示例项目' },
          createdAt: new Date(Date.now() - 3600000)
        }
      ];

      res.json({
        success: true,
        data: {
          activities: mockActivities,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: 2,
            totalPages: 1
          }
        }
      });
    } catch (error: any) {
      console.error('获取活动日志错误:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取活动日志失败',
        error: 'InternalServerError'
      });
    }
  }
);

/**
 * @swagger
 * /api/teams/{teamId}/activity:
 *   post:
 *     summary: 记录团队活动
 *     tags: [团队]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: 活动记录成功
 */
router.post(
  '/:teamId/activity',
  authenticate,
  requireTeamAccess,
  async (req: IAuthRequest, res: Response<IApiResponse<any>>): Promise<void> => {
    try {
      const { teamId } = req.params;
      const { action, description, metadata } = req.body;

      if (!action || !description) {
        res.status(400).json({
          success: false,
          message: 'action 和 description 是必填项',
          error: 'BadRequest'
        });
        return;
      }

      // 这里应该保存活动日志，示例返回模拟数据
      const newActivity = {
        id: new Types.ObjectId().toString(),
        action,
        description,
        user: {
          id: req.user!._id,
          name: req.user!.name,
          email: req.user!.email
        },
        team: teamId,
        metadata: metadata || {},
        createdAt: new Date()
      };

      res.status(201).json({
        success: true,
        data: newActivity,
        message: '活动记录成功'
      });
    } catch (error: any) {
      console.error('记录活动错误:', error);
      res.status(500).json({
        success: false,
        message: error.message || '记录活动失败',
        error: 'InternalServerError'
      });
    }
  }
);

// ==================== 团队统计 ====================

/**
 * @swagger
 * /api/teams/{teamId}/stats:
 *   get:
 *     summary: 获取团队统计信息
 *     tags: [团队]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 团队统计数据
 */
router.get(
  '/:teamId/stats',
  authenticate,
  requireTeamAccess,
  async (req: IAuthRequest, res: Response<IApiResponse<any>>): Promise<void> => {
    try {
      const { teamId } = req.params;

      const team = await Team.findById(teamId);
      if (!team) {
        res.status(404).json({
          success: false,
          message: '团队不存在',
          error: 'NotFound'
        });
        return;
      }

      // 获取成员统计
      const memberStats = await TeamMember.aggregate([
        { $match: { team: new Types.ObjectId(teamId as string) } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      const stats = {
        team: {
          name: team.name,
          memberCount: team.memberCount,
          projectCount: team.projectCount,
          storageUsed: team.storageUsed,
          createdAt: team.createdAt
        },
        members: {
          total: team.memberCount,
          active: memberStats.find(s => s._id === MemberStatus.ACTIVE)?.count || 0,
          pending: memberStats.find(s => s._id === MemberStatus.PENDING)?.count || 0
        },
        activity: {
          last7Days: 0, // 应该查询活动日志
          last30Days: 0
        }
      };

      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      console.error('获取团队统计错误:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取团队统计失败',
        error: 'InternalServerError'
      });
    }
  }
);

/**
 * @swagger
 * /api/teams/{teamId}/leave:
 *   post:
 *     summary: 离开团队
 *     tags: [团队]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 已成功离开团队
 */
router.post(
  '/:teamId/leave',
  authenticate,
  requireTeamAccess,
  async (req: IAuthRequest, res: Response<IApiResponse<null>>): Promise<void> => {
    try {
      const { teamId } = req.params;

      // 所有者不能离开团队，必须先转让所有权
      if (req.membership?.role === MemberPermission.OWNER) {
        res.status(400).json({
          success: false,
          message: '团队所有者不能离开团队，请先转让所有权',
          error: 'BadRequest'
        });
        return;
      }

      await TeamMember.findOneAndDelete({
        team: teamId as string,
        user: req.user!._id
      });

      // 更新团队成员计数
      const team = await Team.findById(teamId as string);
      if (team) {
        await (team as any).updateMemberCount();
      }

      res.json({
        success: true,
        message: '已成功离开团队',
        data: null
      });
    } catch (error: any) {
      console.error('离开团队错误:', error);
      res.status(500).json({
        success: false,
        message: error.message || '离开团队失败',
        error: 'InternalServerError'
      });
    }
  }
);

/**
 * @swagger
 * /api/teams/{teamId}/transfer-ownership:
 *   post:
 *     summary: 转让团队所有权
 *     tags: [团队]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 所有权转让成功
 */
router.post(
  '/:teamId/transfer-ownership',
  authenticate,
  requireTeamOwner,
  async (req: IAuthRequest, res: Response<IApiResponse<any>>): Promise<void> => {
    try {
      const { teamId } = req.params;
      const { newOwnerId } = req.body;

      if (!newOwnerId) {
        res.status(400).json({
          success: false,
          message: '新所有者ID是必填项',
          error: 'BadRequest'
        });
        return;
      }

      // 检查新所有者是否是团队成员
      const newOwnerMembership = await TeamMember.findByTeamAndUser(teamId as string, newOwnerId);
      if (!newOwnerMembership || newOwnerMembership.status !== MemberStatus.ACTIVE) {
        res.status(400).json({
          success: false,
          message: '指定的用户不是团队成员',
          error: 'BadRequest'
        });
        return;
      }

      // 更新团队所有者
      const team = await Team.findById(teamId as string);
      if (team) {
        (team as any).owner = new Types.ObjectId(newOwnerId);
        await team.save();
      }

      // 更新原所有者为管理员
      await TeamMember.findOneAndUpdate(
        { team: teamId as string, user: req.user!._id },
        { role: MemberPermission.ADMIN }
      );

      // 更新新所有者为所有者
      await (newOwnerMembership as any).updateRole(MemberPermission.OWNER);

      res.json({
        success: true,
        message: '团队所有权转让成功',
        data: {
          newOwner: newOwnerId
        }
      });
    } catch (error: any) {
      console.error('转让所有权错误:', error);
      res.status(500).json({
        success: false,
        message: error.message || '转让所有权失败',
        error: 'InternalServerError'
      });
    }
  }
);

export default router;
