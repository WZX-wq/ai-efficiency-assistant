import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import Team from '../models/Team';
import TeamMember, { MemberStatus, MemberPermission } from '../models/TeamMember';
import User from '../models/User';

// 从环境变量获取JWT密钥
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// ==================== 类型定义 ====================

// 协作事件类型
export enum CollaborationEventType {
  // 连接相关
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  AUTHENTICATE = 'authenticate',
  AUTHENTICATED = 'authenticated',
  AUTH_ERROR = 'auth_error',

  // 房间相关
  JOIN_TEAM = 'join_team',
  LEAVE_TEAM = 'leave_team',
  JOIN_PROJECT = 'join_project',
  LEAVE_PROJECT = 'leave_project',
  USER_JOINED = 'user_joined',
  USER_LEFT = 'user_left',

  // 文档协作
  DOC_EDIT = 'doc_edit',
  DOC_CURSOR = 'doc_cursor',
  DOC_SELECTION = 'doc_selection',
  DOC_CHANGE = 'doc_change',
  DOC_SYNC = 'doc_sync',
  DOC_LOCK = 'doc_lock',
  DOC_UNLOCK = 'doc_unlock',

  // 实时通信
  TYPING = 'typing',
  STOP_TYPING = 'stop_typing',
  MESSAGE = 'message',
  REACTION = 'reaction',

  // 文件操作
  FILE_UPLOAD = 'file_upload',
  FILE_DELETE = 'file_delete',
  FILE_SHARE = 'file_share',

  // 项目操作
  PROJECT_CREATE = 'project_create',
  PROJECT_UPDATE = 'project_update',
  PROJECT_DELETE = 'project_delete',

  // 通知
  NOTIFICATION = 'notification',
  MENTION = 'mention',

  // 系统
  PING = 'ping',
  PONG = 'pong',
  ERROR = 'error'
}

// 用户在线状态
export enum UserStatus {
  ONLINE = 'online',
  AWAY = 'away',
  BUSY = 'busy',
  OFFLINE = 'offline'
}

// 协作消息接口
export interface CollaborationMessage {
  type: CollaborationEventType;
  payload: any;
  timestamp: number;
  sender?: {
    userId: string;
    name: string;
    avatar?: string;
  };
  room?: string;
}

// 在线用户接口
export interface OnlineUser {
  userId: string;
  socketId: string;
  name: string;
  email: string;
  avatar?: string;
  status: UserStatus;
  currentRoom?: string;
  lastActivity: number;
}

// 文档编辑操作
export interface DocEditOperation {
  docId: string;
  operation: 'insert' | 'delete' | 'replace';
  position: number;
  content?: string;
  length?: number;
  version: number;
}

// 光标位置
export interface CursorPosition {
  docId: string;
  position: number;
  selection?: {
    start: number;
    end: number;
  };
}

// ==================== WebSocket 服务类 ====================

export class WebSocketService {
  private io: SocketIOServer;
  private onlineUsers: Map<string, OnlineUser> = new Map(); // socketId -> OnlineUser
  private userSockets: Map<string, string[]> = new Map(); // userId -> socketIds[]
  private teamRooms: Map<string, Set<string>> = new Map(); // teamId -> Set<socketId>
  private projectRooms: Map<string, Set<string>> = new Map(); // projectId -> Set<socketId>

  constructor(server: HttpServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.setupMiddleware();
    this.setupEventHandlers();
    this.startCleanupInterval();
  }

  // 设置中间件
  private setupMiddleware(): void {
    // 认证中间件
    this.io.use(async (socket: Socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.query.token;

        if (!token) {
          return next(new Error('Authentication required'));
        }

        const decoded = jwt.verify(token as string, JWT_SECRET) as any;
        const user = await User.findById(decoded.userId);

        if (!user || !user.isActive) {
          return next(new Error('User not found or inactive'));
        }

        socket.data.user = {
          userId: user._id.toString(),
          email: user.email,
          name: user.name,
          avatar: user.avatar
        };

        next();
      } catch (error) {
        console.error('Socket authentication error:', error);
        next(new Error('Authentication failed'));
      }
    });
  }

  // 设置事件处理器
  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log(`User connected: ${socket.data.user?.name} (${socket.id})`);

      // 添加用户到在线列表
      this.addOnlineUser(socket);

      // 发送认证成功事件
      socket.emit(CollaborationEventType.AUTHENTICATED, {
        socketId: socket.id,
        user: socket.data.user
      });

      // 设置房间事件处理器
      this.setupRoomHandlers(socket);

      // 设置文档协作事件处理器
      this.setupDocCollaborationHandlers(socket);

      // 设置通信事件处理器
      this.setupCommunicationHandlers(socket);

      // 设置项目事件处理器
      this.setupProjectHandlers(socket);

      // 设置文件事件处理器
      this.setupFileHandlers(socket);

      // 设置系统事件处理器
      this.setupSystemHandlers(socket);

      // 断开连接处理
      socket.on('disconnect', (reason) => {
        console.log(`User disconnected: ${socket.data.user?.name} (${socket.id}), reason: ${reason}`);
        this.removeOnlineUser(socket);
      });
    });
  }

  // 设置房间事件处理器
  private setupRoomHandlers(socket: Socket): void {
    // 加入团队房间
    socket.on(CollaborationEventType.JOIN_TEAM, async (data: { teamId: string }, callback) => {
      try {
        const { teamId } = data;
        const userId = socket.data.user?.userId;

        // 验证用户是否是团队成员
        const isMember = await TeamMember.isMember(teamId, userId);
        if (!isMember) {
          return callback?.({ success: false, error: 'Not a team member' });
        }

        const roomName = `team:${teamId}`;
        await socket.join(roomName);

        // 记录到团队房间
        if (!this.teamRooms.has(teamId)) {
          this.teamRooms.set(teamId, new Set());
        }
        this.teamRooms.get(teamId)!.add(socket.id);

        // 更新用户当前房间
        const onlineUser = this.onlineUsers.get(socket.id);
        if (onlineUser) {
          onlineUser.currentRoom = roomName;
        }

        // 通知房间内其他用户
        socket.to(roomName).emit(CollaborationEventType.USER_JOINED, {
          user: socket.data.user,
          room: roomName,
          timestamp: Date.now()
        });

        // 获取房间内其他在线用户
        const roomSockets = await this.io.in(roomName).fetchSockets();
        const otherUsers = roomSockets
          .filter(s => s.id !== socket.id)
          .map(s => ({
            userId: s.data.user?.userId,
            name: s.data.user?.name,
            avatar: s.data.user?.avatar
          }));

        callback?.({ success: true, room: roomName, onlineUsers: otherUsers });
      } catch (error) {
        console.error('Join team error:', error);
        callback?.({ success: false, error: 'Failed to join team' });
      }
    });

    // 离开团队房间
    socket.on(CollaborationEventType.LEAVE_TEAM, async (data: { teamId: string }, callback) => {
      try {
        const { teamId } = data;
        const roomName = `team:${teamId}`;

        await socket.leave(roomName);

        // 从团队房间移除
        this.teamRooms.get(teamId)?.delete(socket.id);

        // 通知房间内其他用户
        socket.to(roomName).emit(CollaborationEventType.USER_LEFT, {
          user: socket.data.user,
          room: roomName,
          timestamp: Date.now()
        });

        callback?.({ success: true });
      } catch (error) {
        console.error('Leave team error:', error);
        callback?.({ success: false, error: 'Failed to leave team' });
      }
    });

    // 加入项目房间
    socket.on(CollaborationEventType.JOIN_PROJECT, async (data: { projectId: string; teamId: string }, callback) => {
      try {
        const { projectId, teamId } = data;
        const userId = socket.data.user?.userId;

        // 验证用户是否是团队成员
        const isMember = await TeamMember.isMember(teamId, userId);
        if (!isMember) {
          return callback?.({ success: false, error: 'Not a team member' });
        }

        const roomName = `project:${projectId}`;
        await socket.join(roomName);

        // 记录到项目房间
        if (!this.projectRooms.has(projectId)) {
          this.projectRooms.set(projectId, new Set());
        }
        this.projectRooms.get(projectId)!.add(socket.id);

        // 更新用户当前房间
        const onlineUser = this.onlineUsers.get(socket.id);
        if (onlineUser) {
          onlineUser.currentRoom = roomName;
        }

        // 通知房间内其他用户
        socket.to(roomName).emit(CollaborationEventType.USER_JOINED, {
          user: socket.data.user,
          room: roomName,
          timestamp: Date.now()
        });

        // 获取房间内其他在线用户
        const roomSockets = await this.io.in(roomName).fetchSockets();
        const otherUsers = roomSockets
          .filter(s => s.id !== socket.id)
          .map(s => ({
            userId: s.data.user?.userId,
            name: s.data.user?.name,
            avatar: s.data.user?.avatar
          }));

        callback?.({ success: true, room: roomName, onlineUsers: otherUsers });
      } catch (error) {
        console.error('Join project error:', error);
        callback?.({ success: false, error: 'Failed to join project' });
      }
    });

    // 离开项目房间
    socket.on(CollaborationEventType.LEAVE_PROJECT, async (data: { projectId: string }, callback) => {
      try {
        const { projectId } = data;
        const roomName = `project:${projectId}`;

        await socket.leave(roomName);

        // 从项目房间移除
        this.projectRooms.get(projectId)?.delete(socket.id);

        // 通知房间内其他用户
        socket.to(roomName).emit(CollaborationEventType.USER_LEFT, {
          user: socket.data.user,
          room: roomName,
          timestamp: Date.now()
        });

        callback?.({ success: true });
      } catch (error) {
        console.error('Leave project error:', error);
        callback?.({ success: false, error: 'Failed to leave project' });
      }
    });
  }

  // 设置文档协作事件处理器
  private setupDocCollaborationHandlers(socket: Socket): void {
    // 文档编辑
    socket.on(CollaborationEventType.DOC_EDIT, (data: {
      docId: string;
      operation: DocEditOperation;
      room: string;
    }) => {
      const { docId, operation, room } = data;

      // 广播编辑操作给房间内其他用户
      socket.to(room).emit(CollaborationEventType.DOC_CHANGE, {
        docId,
        operation,
        sender: socket.data.user,
        timestamp: Date.now()
      });
    });

    // 光标位置更新
    socket.on(CollaborationEventType.DOC_CURSOR, (data: {
      docId: string;
      position: CursorPosition;
      room: string;
    }) => {
      const { docId, position, room } = data;

      socket.to(room).emit(CollaborationEventType.DOC_CURSOR, {
        docId,
        position,
        user: socket.data.user,
        timestamp: Date.now()
      });
    });

    // 文本选择更新
    socket.on(CollaborationEventType.DOC_SELECTION, (data: {
      docId: string;
      selection: { start: number; end: number };
      room: string;
    }) => {
      const { docId, selection, room } = data;

      socket.to(room).emit(CollaborationEventType.DOC_SELECTION, {
        docId,
        selection,
        user: socket.data.user,
        timestamp: Date.now()
      });
    });

    // 请求文档同步
    socket.on(CollaborationEventType.DOC_SYNC, (data: {
      docId: string;
      room: string;
    }, callback) => {
      // 这里应该从数据库获取文档最新状态
      // 示例返回
      callback?.({
        success: true,
        docId: data.docId,
        content: '', // 从数据库获取
        version: 1
      });
    });

    // 锁定文档
    socket.on(CollaborationEventType.DOC_LOCK, (data: {
      docId: string;
      room: string;
    }, callback) => {
      const { docId, room } = data;

      // 广播文档被锁定
      this.io.to(room).emit(CollaborationEventType.DOC_LOCK, {
        docId,
        lockedBy: socket.data.user,
        timestamp: Date.now()
      });

      callback?.({ success: true });
    });

    // 解锁文档
    socket.on(CollaborationEventType.DOC_UNLOCK, (data: {
      docId: string;
      room: string;
    }, callback) => {
      const { docId, room } = data;

      // 广播文档解锁
      this.io.to(room).emit(CollaborationEventType.DOC_UNLOCK, {
        docId,
        unlockedBy: socket.data.user,
        timestamp: Date.now()
      });

      callback?.({ success: true });
    });
  }

  // 设置通信事件处理器
  private setupCommunicationHandlers(socket: Socket): void {
    // 正在输入
    socket.on(CollaborationEventType.TYPING, (data: {
      room: string;
      target?: string;
    }) => {
      const { room, target } = data;

      if (target) {
        // 私聊正在输入
        const targetSockets = this.userSockets.get(target);
        if (targetSockets) {
          targetSockets.forEach(socketId => {
            this.io.to(socketId).emit(CollaborationEventType.TYPING, {
              user: socket.data.user,
              timestamp: Date.now()
            });
          });
        }
      } else {
        // 广播到房间
        socket.to(room).emit(CollaborationEventType.TYPING, {
          user: socket.data.user,
          timestamp: Date.now()
        });
      }
    });

    // 停止输入
    socket.on(CollaborationEventType.STOP_TYPING, (data: {
      room: string;
      target?: string;
    }) => {
      const { room, target } = data;

      if (target) {
        const targetSockets = this.userSockets.get(target);
        if (targetSockets) {
          targetSockets.forEach(socketId => {
            this.io.to(socketId).emit(CollaborationEventType.STOP_TYPING, {
              user: socket.data.user,
              timestamp: Date.now()
            });
          });
        }
      } else {
        socket.to(room).emit(CollaborationEventType.STOP_TYPING, {
          user: socket.data.user,
          timestamp: Date.now()
        });
      }
    });

    // 发送消息
    socket.on(CollaborationEventType.MESSAGE, (data: {
      room: string;
      content: string;
      type?: 'text' | 'image' | 'file';
      metadata?: any;
    }, callback) => {
      const { room, content, type = 'text', metadata } = data;

      const message = {
        id: new mongoose.Types.ObjectId().toString(),
        content,
        type,
        metadata,
        sender: socket.data.user,
        timestamp: Date.now()
      };

      // 广播消息到房间
      this.io.to(room).emit(CollaborationEventType.MESSAGE, message);

      callback?.({ success: true, message });
    });

    // 表情反应
    socket.on(CollaborationEventType.REACTION, (data: {
      room: string;
      messageId: string;
      emoji: string;
    }) => {
      const { room, messageId, emoji } = data;

      this.io.to(room).emit(CollaborationEventType.REACTION, {
        messageId,
        emoji,
        user: socket.data.user,
        timestamp: Date.now()
      });
    });
  }

  // 设置项目事件处理器
  private setupProjectHandlers(socket: Socket): void {
    // 创建项目
    socket.on(CollaborationEventType.PROJECT_CREATE, async (data: {
      teamId: string;
      project: any;
    }, callback) => {
      try {
        const { teamId, project } = data;
        const userId = socket.data.user?.userId;

        // 检查权限
        const canCreate = await TeamMember.hasPermission(teamId, userId, 'canCreateProject');
        if (!canCreate) {
          return callback?.({ success: false, error: 'Permission denied' });
        }

        // 广播到团队
        const roomName = `team:${teamId}`;
        this.io.to(roomName).emit(CollaborationEventType.PROJECT_CREATE, {
          project,
          createdBy: socket.data.user,
          timestamp: Date.now()
        });

        callback?.({ success: true, project });
      } catch (error) {
        console.error('Project create error:', error);
        callback?.({ success: false, error: 'Failed to create project' });
      }
    });

    // 更新项目
    socket.on(CollaborationEventType.PROJECT_UPDATE, (data: {
      teamId: string;
      projectId: string;
      updates: any;
    }) => {
      const { teamId, projectId, updates } = data;

      const roomName = `team:${teamId}`;
      this.io.to(roomName).emit(CollaborationEventType.PROJECT_UPDATE, {
        projectId,
        updates,
        updatedBy: socket.data.user,
        timestamp: Date.now()
      });
    });

    // 删除项目
    socket.on(CollaborationEventType.PROJECT_DELETE, (data: {
      teamId: string;
      projectId: string;
    }) => {
      const { teamId, projectId } = data;

      const roomName = `team:${teamId}`;
      this.io.to(roomName).emit(CollaborationEventType.PROJECT_DELETE, {
        projectId,
        deletedBy: socket.data.user,
        timestamp: Date.now()
      });
    });
  }

  // 设置文件事件处理器
  private setupFileHandlers(socket: Socket): void {
    // 文件上传
    socket.on(CollaborationEventType.FILE_UPLOAD, (data: {
      teamId: string;
      file: any;
    }) => {
      const { teamId, file } = data;

      const roomName = `team:${teamId}`;
      this.io.to(roomName).emit(CollaborationEventType.FILE_UPLOAD, {
        file,
        uploadedBy: socket.data.user,
        timestamp: Date.now()
      });
    });

    // 文件删除
    socket.on(CollaborationEventType.FILE_DELETE, (data: {
      teamId: string;
      fileId: string;
    }) => {
      const { teamId, fileId } = data;

      const roomName = `team:${teamId}`;
      this.io.to(roomName).emit(CollaborationEventType.FILE_DELETE, {
        fileId,
        deletedBy: socket.data.user,
        timestamp: Date.now()
      });
    });

    // 文件分享
    socket.on(CollaborationEventType.FILE_SHARE, (data: {
      teamId: string;
      fileId: string;
      targetUsers: string[];
    }) => {
      const { teamId, fileId, targetUsers } = data;

      // 发送给目标用户
      targetUsers.forEach(userId => {
        const userSocketIds = this.userSockets.get(userId);
        if (userSocketIds) {
          userSocketIds.forEach(socketId => {
            this.io.to(socketId).emit(CollaborationEventType.FILE_SHARE, {
              fileId,
              sharedBy: socket.data.user,
              timestamp: Date.now()
            });
          });
        }
      });
    });
  }

  // 设置系统事件处理器
  private setupSystemHandlers(socket: Socket): void {
    // Ping
    socket.on(CollaborationEventType.PING, (callback) => {
      callback?.({ timestamp: Date.now() });
    });

    // 更新用户状态
    socket.on('update_status', (data: { status: UserStatus }) => {
      const onlineUser = this.onlineUsers.get(socket.id);
      if (onlineUser) {
        onlineUser.status = data.status;

        // 通知相关房间
        const rooms = Array.from(socket.rooms);
        rooms.forEach(room => {
          if (room !== socket.id) {
            socket.to(room).emit('user_status_changed', {
              userId: socket.data.user?.userId,
              status: data.status,
              timestamp: Date.now()
            });
          }
        });
      }
    });

    // 获取在线用户列表
    socket.on('get_online_users', async (data: { room: string }, callback) => {
      try {
        const roomSockets = await this.io.in(data.room).fetchSockets();
        const users = roomSockets.map(s => ({
          userId: s.data.user?.userId,
          name: s.data.user?.name,
          avatar: s.data.user?.avatar,
          status: this.onlineUsers.get(s.id)?.status || UserStatus.ONLINE
        }));

        callback?.({ success: true, users });
      } catch (error) {
        callback?.({ success: false, error: 'Failed to get online users' });
      }
    });
  }

  // 添加在线用户
  private addOnlineUser(socket: Socket): void {
    const userId = socket.data.user?.userId;

    const onlineUser: OnlineUser = {
      userId,
      socketId: socket.id,
      name: socket.data.user?.name,
      email: socket.data.user?.email,
      avatar: socket.data.user?.avatar,
      status: UserStatus.ONLINE,
      lastActivity: Date.now()
    };

    this.onlineUsers.set(socket.id, onlineUser);

    // 记录用户的所有socket连接
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, []);
    }
    this.userSockets.get(userId)!.push(socket.id);
  }

  // 移除在线用户
  private removeOnlineUser(socket: Socket): void {
    const userId = socket.data.user?.userId;

    this.onlineUsers.delete(socket.id);

    // 从用户的socket列表中移除
    const userSocketIds = this.userSockets.get(userId);
    if (userSocketIds) {
      const index = userSocketIds.indexOf(socket.id);
      if (index > -1) {
        userSocketIds.splice(index, 1);
      }
      if (userSocketIds.length === 0) {
        this.userSockets.delete(userId);
      }
    }

    // 从所有房间中移除
    this.teamRooms.forEach((sockets, teamId) => {
      if (sockets.has(socket.id)) {
        sockets.delete(socket.id);
        socket.to(`team:${teamId}`).emit(CollaborationEventType.USER_LEFT, {
          user: socket.data.user,
          timestamp: Date.now()
        });
      }
    });

    this.projectRooms.forEach((sockets, projectId) => {
      if (sockets.has(socket.id)) {
        sockets.delete(socket.id);
        socket.to(`project:${projectId}`).emit(CollaborationEventType.USER_LEFT, {
          user: socket.data.user,
          timestamp: Date.now()
        });
      }
    });
  }

  // 启动清理定时器
  private startCleanupInterval(): void {
    // 每5分钟清理一次不活跃的用户
    setInterval(() => {
      const now = Date.now();
      const timeout = 10 * 60 * 1000; // 10分钟

      this.onlineUsers.forEach((user, socketId) => {
        if (now - user.lastActivity > timeout) {
          const socket = this.io.sockets.sockets.get(socketId);
          if (socket) {
            socket.disconnect(true);
          }
        }
      });
    }, 5 * 60 * 1000);
  }

  // ==================== 公共方法 ====================

  // 发送通知给特定用户
  public sendNotification(userId: string, notification: any): void {
    const socketIds = this.userSockets.get(userId);
    if (socketIds) {
      socketIds.forEach(socketId => {
        this.io.to(socketId).emit(CollaborationEventType.NOTIFICATION, {
          ...notification,
          timestamp: Date.now()
        });
      });
    }
  }

  // 发送通知给团队所有成员
  public sendTeamNotification(teamId: string, notification: any): void {
    this.io.to(`team:${teamId}`).emit(CollaborationEventType.NOTIFICATION, {
      ...notification,
      timestamp: Date.now()
    });
  }

  // 发送消息给项目所有成员
  public sendProjectMessage(projectId: string, message: any): void {
    this.io.to(`project:${projectId}`).emit(CollaborationEventType.MESSAGE, {
      ...message,
      timestamp: Date.now()
    });
  }

  // 广播文档变更
  public broadcastDocChange(docId: string, operation: DocEditOperation, excludeUserId?: string): void {
    // 找到所有正在编辑该文档的用户
    this.onlineUsers.forEach((user, socketId) => {
      if (user.userId !== excludeUserId) {
        this.io.to(socketId).emit(CollaborationEventType.DOC_CHANGE, {
          docId,
          operation,
          timestamp: Date.now()
        });
      }
    });
  }

  // 获取在线用户列表
  public getOnlineUsers(): OnlineUser[] {
    return Array.from(this.onlineUsers.values());
  }

  // 获取团队的在线用户
  public getTeamOnlineUsers(teamId: string): OnlineUser[] {
    const socketIds = this.teamRooms.get(teamId);
    if (!socketIds) return [];

    return Array.from(socketIds)
      .map(socketId => this.onlineUsers.get(socketId))
      .filter((user): user is OnlineUser => user !== undefined);
  }

  // 获取项目的在线用户
  public getProjectOnlineUsers(projectId: string): OnlineUser[] {
    const socketIds = this.projectRooms.get(projectId);
    if (!socketIds) return [];

    return Array.from(socketIds)
      .map(socketId => this.onlineUsers.get(socketId))
      .filter((user): user is OnlineUser => user !== undefined);
  }

  // 检查用户是否在线
  public isUserOnline(userId: string): boolean {
    const socketIds = this.userSockets.get(userId);
    return !!socketIds && socketIds.length > 0;
  }

  // 获取IO实例
  public getIO(): SocketIOServer {
    return this.io;
  }
}

// 单例实例
let wsService: WebSocketService | null = null;

// 初始化WebSocket服务
export function initializeWebSocket(server: HttpServer): WebSocketService {
  if (!wsService) {
    wsService = new WebSocketService(server);
  }
  return wsService;
}

// 获取WebSocket服务实例
export function getWebSocketService(): WebSocketService | null {
  return wsService;
}

export default WebSocketService;
