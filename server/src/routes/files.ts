import { Router, Request, Response } from 'express';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import FileModel, { IFile } from '../models/File';

const router = Router();

// ============================================
// 配置常量
// ============================================

/** 上传目录 */
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

/** 最大文件大小（默认 100MB） */
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '104857600', 10);

/** 允许的 MIME 类型 */
const ALLOWED_MIMETYPES = [
  // 图片
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/bmp',
  'image/tiff',
  // 文档
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // 视频
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  'video/x-msvideo',
  // 音频
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/webm',
  'audio/aac',
  // 压缩包
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
  'application/gzip',
  'application/x-tar',
];

/** 禁止的文件扩展名 */
const FORBIDDEN_EXTENSIONS = ['.exe', '.bat', '.cmd', '.sh', '.php', '.jsp', '.asp', '.aspx', '.dll', '.bin'];

// ============================================
// 确保上传目录存在
// ============================================

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// ============================================
// 存储引擎配置
// ============================================

/**
 * 本地存储引擎
 */
const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // 按日期创建子目录
    const date = new Date();
    const subDir = path.join(
      UPLOAD_DIR,
      date.getFullYear().toString(),
      (date.getMonth() + 1).toString().padStart(2, '0'),
      date.getDate().toString().padStart(2, '0')
    );

    if (!fs.existsSync(subDir)) {
      fs.mkdirSync(subDir, { recursive: true });
    }

    cb(null, subDir);
  },
  filename: (req, file, cb) => {
    // 生成唯一文件名
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

/**
 * 模拟云存储引擎（内存存储，实际项目中可替换为 AWS S3、阿里云 OSS 等）
 */
const mockCloudStorage = multer.memoryStorage();

// ============================================
// 文件过滤函数
// ============================================

/**
 * 文件类型验证
 */
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback): void => {
  const ext = path.extname(file.originalname).toLowerCase();

  // 检查禁止的扩展名
  if (FORBIDDEN_EXTENSIONS.includes(ext)) {
    cb(new Error(`不支持的文件类型: ${ext}`));
    return;
  }

  // 检查 MIME 类型
  if (!ALLOWED_MIMETYPES.includes(file.mimetype)) {
    cb(new Error(`不支持的 MIME 类型: ${file.mimetype}`));
    return;
  }

  cb(null, true);
};

// ============================================
// Multer 配置
// ============================================

/**
 * 本地上传配置
 */
const localUpload = multer({
  storage: localStorage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 10, // 单次最多上传 10 个文件
  },
});

/**
 * 模拟云上传配置
 */
const cloudUpload = multer({
  storage: mockCloudStorage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 10,
  },
});

// ============================================
// 辅助函数
// ============================================

/**
 * 模拟云存储上传（实际项目中替换为真实的云存储 SDK）
 */
async function uploadToMockCloud(
  file: Express.Multer.File
): Promise<{ url: string; storedName: string }> {
  // 模拟上传到云存储的延迟
  await new Promise((resolve) => setTimeout(resolve, 100));

  const storedName = `${uuidv4()}${path.extname(file.originalname)}`;
  // 模拟返回的 URL
  const url = `https://mock-cloud-storage.example.com/uploads/${storedName}`;

  // 实际项目中，这里应该调用云存储 SDK 上传文件
  // 例如 AWS S3: await s3.upload({ Bucket, Key, Body }).promise();

  return { url, storedName };
}

/**
 * 模拟从云存储删除文件
 */
async function deleteFromMockCloud(storedName: string): Promise<void> {
  // 模拟删除延迟
  await new Promise((resolve) => setTimeout(resolve, 50));
  console.log(`[Mock Cloud] Deleted file: ${storedName}`);
}

/**
 * 格式化文件响应
 */
interface FileResponse {
  id: any;
  originalName: string;
  storedName: string;
  size: number;
  formattedSize: string;
  mimetype: string;
  category: string;
  storageType: string;
  userId?: string;
  description?: string;
  tags?: string[];
  downloadCount: number;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  isExpired: boolean;
  url: string;
}

function formatFileResponse(file: IFile): FileResponse {
  return {
    id: file._id,
    originalName: file.originalName,
    storedName: file.storedName,
    size: file.size,
    formattedSize: file.formatSize(),
    mimetype: file.mimetype,
    category: file.category,
    storageType: file.storageType,
    userId: file.userId,
    description: file.description,
    tags: file.tags,
    downloadCount: file.downloadCount,
    isPublic: file.isPublic,
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
    expiresAt: file.expiresAt,
    isExpired: file.isExpired(),
    url: file.storageType === 'local' ? `/uploads/${path.relative(UPLOAD_DIR, file.path)}` : file.path,
  };
}

// ============================================
// 路由定义
// ============================================

/**
 * @swagger
 * /api/files/upload:
 *   post:
 *     summary: 单文件上传
 *     description: 上传单个文件到本地存储
 *     tags: [文件]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               description:
 *                 type: string
 *               tags:
 *                 type: string
 *               isPublic:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: 文件上传成功
 *       413:
 *         description: 文件大小超过限制
 */
router.post(
  '/upload',
  localUpload.single('file'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: '未找到上传的文件',
        });
        return;
      }

      const { description, tags, isPublic } = req.body;
      const userId = req.headers['x-user-id'] as string | undefined;

      // 创建文件记录
      const fileDoc = new FileModel({
        originalName: req.file.originalname,
        storedName: req.file.filename,
        path: req.file.path,
        size: req.file.size,
        mimetype: req.file.mimetype,
        category: FileModel.getCategoryFromMimetype(req.file.mimetype),
        storageType: 'local',
        userId,
        description: description || undefined,
        tags: tags ? tags.split(',').map((t: string) => t.trim()) : [],
        isPublic: isPublic === 'true' || isPublic === true,
      });

      await fileDoc.save();

      res.status(201).json({
        success: true,
        message: '文件上传成功',
        data: formatFileResponse(fileDoc),
      });
    } catch (error) {
      console.error('[File Upload Error]', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '文件上传失败',
      });
    }
  }
);

/**
 * @swagger
 * /api/files/upload-multiple:
 *   post:
 *     summary: 多文件上传
 *     description: 上传多个文件到本地存储（最多10个）
 *     tags: [文件]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [files]
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: 文件上传成功
 */
router.post(
  '/upload-multiple',
  localUpload.array('files', 10),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        res.status(400).json({
          success: false,
          error: '未找到上传的文件',
        });
        return;
      }

      const { description, tags, isPublic } = req.body;
      const userId = req.headers['x-user-id'] as string | undefined;

      const fileDocs = await Promise.all(
        req.files.map(async (file) => {
          const fileDoc = new FileModel({
            originalName: file.originalname,
            storedName: file.filename,
            path: file.path,
            size: file.size,
            mimetype: file.mimetype,
            category: FileModel.getCategoryFromMimetype(file.mimetype),
            storageType: 'local',
            userId,
            description: description || undefined,
            tags: tags ? tags.split(',').map((t: string) => t.trim()) : [],
            isPublic: isPublic === 'true' || isPublic === true,
          });
          await fileDoc.save();
          return formatFileResponse(fileDoc);
        })
      );

      res.status(201).json({
        success: true,
        message: `成功上传 ${fileDocs.length} 个文件`,
        data: fileDocs,
      });
    } catch (error) {
      console.error('[Multiple File Upload Error]', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '文件上传失败',
      });
    }
  }
);

/**
 * @swagger
 * /api/files/upload-cloud:
 *   post:
 *     summary: 云存储上传
 *     description: 上传单个文件到模拟云存储
 *     tags: [文件]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: 文件上传成功
 */
router.post(
  '/upload-cloud',
  cloudUpload.single('file'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: '未找到上传的文件',
        });
        return;
      }

      const { description, tags, isPublic } = req.body;
      const userId = req.headers['x-user-id'] as string | undefined;

      // 上传到模拟云存储
      const { url, storedName } = await uploadToMockCloud(req.file);

      // 创建文件记录
      const fileDoc = new FileModel({
        originalName: req.file.originalname,
        storedName,
        path: url,
        size: req.file.size,
        mimetype: req.file.mimetype,
        category: FileModel.getCategoryFromMimetype(req.file.mimetype),
        storageType: 'mock-cloud',
        userId,
        description: description || undefined,
        tags: tags ? tags.split(',').map((t: string) => t.trim()) : [],
        isPublic: isPublic === 'true' || isPublic === true,
      });

      await fileDoc.save();

      res.status(201).json({
        success: true,
        message: '文件已上传到云存储',
        data: formatFileResponse(fileDoc),
      });
    } catch (error) {
      console.error('[Cloud Upload Error]', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '云存储上传失败',
      });
    }
  }
);

/**
 * @swagger
 * /api/files:
 *   get:
 *     summary: 获取文件列表
 *     tags: [文件]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: storageType
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 文件列表
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = '1',
      limit = '20',
      category,
      storageType,
      search,
      userId,
      isPublic,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    // 构建查询条件
    const query: any = {};

    if (category) {
      query.category = category;
    }

    if (storageType) {
      query.storageType = storageType;
    }

    if (userId) {
      query.userId = userId;
    }

    if (isPublic !== undefined) {
      query.isPublic = isPublic === 'true';
    }

    if (search) {
      query.$text = { $search: search as string };
    }

    // 排除已过期的文件（除非明确指定）
    query.$or = [
      { expiresAt: { $exists: false } },
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } },
    ];

    // 执行查询
    const [files, total] = await Promise.all([
      FileModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      FileModel.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: files.map((f: any) => formatFileResponse(f as IFile)),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasMore: pageNum * limitNum < total,
      },
    });
  } catch (error) {
    console.error('[List Files Error]', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取文件列表失败',
    });
  }
});

/**
 * @swagger
 * /api/files/{id}:
 *   get:
 *     summary: 获取单个文件信息
 *     tags: [文件]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 文件信息
 *       404:
 *         description: 文件不存在
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const file = await FileModel.findById(req.params.id as string);

    if (!file) {
      res.status(404).json({
        success: false,
        error: '文件不存在',
      });
      return;
    }

    if (file.isExpired()) {
      res.status(410).json({
        success: false,
        error: '文件已过期',
      });
      return;
    }

    res.json({
      success: true,
      data: formatFileResponse(file),
    });
  } catch (error) {
    console.error('[Get File Error]', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取文件信息失败',
    });
  }
});

/**
 * @swagger
 * /api/files/{id}/download:
 *   get:
 *     summary: 下载文件
 *     tags: [文件]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 文件内容
 *       404:
 *         description: 文件不存在
 */
router.get('/:id/download', async (req: Request, res: Response): Promise<void> => {
  try {
    const file = await FileModel.findById(req.params.id as string);

    if (!file) {
      res.status(404).json({
        success: false,
        error: '文件不存在',
      });
      return;
    }

    if ((file as any).isExpired()) {
      res.status(410).json({
        success: false,
        error: '文件已过期',
      });
      return;
    }

    // 增加下载计数
    await (file as any).incrementDownloadCount();

    if (file.storageType === 'local') {
      // 本地文件直接发送
      if (!fs.existsSync(file.path)) {
        res.status(404).json({
          success: false,
          error: '文件在磁盘上不存在',
        });
        return;
      }

      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.originalName)}"`);
      res.setHeader('Content-Type', file.mimetype);
      res.sendFile(path.resolve(file.path));
    } else {
      // 云存储文件重定向到 URL
      res.redirect(file.path);
    }
  } catch (error) {
    console.error('[Download File Error]', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '下载文件失败',
    });
  }
});

/**
 * @swagger
 * /api/files/{id}:
 *   put:
 *     summary: 更新文件信息
 *     tags: [文件]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               description:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               isPublic:
 *                 type: boolean
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: 更新成功
 */
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { description, tags, isPublic, expiresAt } = req.body;

    const updateData: any = {};
    if (description !== undefined) updateData.description = description;
    if (tags !== undefined) updateData.tags = Array.isArray(tags) ? tags : tags.split(',').map((t: string) => t.trim());
    if (isPublic !== undefined) updateData.isPublic = isPublic;
    if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;

    const file = await FileModel.findByIdAndUpdate(
      req.params.id as string,
      updateData,
      { new: true, runValidators: true }
    );

    if (!file) {
      res.status(404).json({
        success: false,
        error: '文件不存在',
      });
      return;
    }

    res.json({
      success: true,
      message: '文件信息已更新',
      data: formatFileResponse(file),
    });
  } catch (error) {
    console.error('[Update File Error]', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '更新文件信息失败',
    });
  }
});

/**
 * @swagger
 * /api/files/{id}:
 *   delete:
 *     summary: 删除文件
 *     tags: [文件]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 删除成功
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const file = await FileModel.findById(req.params.id as string);

    if (!file) {
      res.status(404).json({
        success: false,
        error: '文件不存在',
      });
      return;
    }

    // 根据存储类型删除实际文件
    if (file.storageType === 'local') {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
        // 尝试删除空目录
        const dir = path.dirname(file.path);
        try {
          fs.rmdirSync(dir);
        } catch {
          // 目录不为空，忽略错误
        }
      }
    } else if (file.storageType === 'mock-cloud') {
      await deleteFromMockCloud(file.storedName);
    }

    // 删除数据库记录
    await FileModel.findByIdAndDelete(req.params.id as string);

    res.json({
      success: true,
      message: '文件已删除',
    });
  } catch (error) {
    console.error('[Delete File Error]', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '删除文件失败',
    });
  }
});

/**
 * @swagger
 * /api/files/stats/overview:
 *   get:
 *     summary: 获取文件统计信息
 *     tags: [文件]
 *     responses:
 *       200:
 *         description: 文件统计数据
 */
router.get('/stats/overview', async (req: Request, res: Response): Promise<void> => {
  try {
    const [
      totalFiles,
      totalSize,
      categoryStats,
      storageTypeStats,
      recentUploads,
    ] = await Promise.all([
      FileModel.countDocuments(),
      FileModel.aggregate([{ $group: { _id: null, total: { $sum: '$size' } } }]),
      FileModel.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 }, size: { $sum: '$size' } } },
      ]),
      FileModel.aggregate([
        { $group: { _id: '$storageType', count: { $sum: 1 }, size: { $sum: '$size' } } },
      ]),
      FileModel.find().sort({ createdAt: -1 }).limit(5).lean(),
    ]);

    res.json({
      success: true,
      data: {
        totalFiles,
        totalSize: totalSize[0]?.total || 0,
        categoryStats: categoryStats.reduce((acc, curr) => {
          acc[curr._id] = { count: curr.count, size: curr.size };
          return acc;
        }, {} as Record<string, { count: number; size: number }>),
        storageTypeStats: storageTypeStats.reduce((acc, curr) => {
          acc[curr._id] = { count: curr.count, size: curr.size };
          return acc;
        }, {} as Record<string, { count: number; size: number }>),
        recentUploads: recentUploads.map((f: any) => formatFileResponse(f as IFile)),
      },
    });
  } catch (error) {
    console.error('[File Stats Error]', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取文件统计失败',
    });
  }
});

/**
 * Multer 错误处理中间件
 */
export function handleMulterError(err: any, req: Request, res: Response, next: Function): void {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({
        success: false,
        error: `文件大小超过限制（最大 ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(0)}MB）`,
      });
      return;
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      res.status(413).json({
        success: false,
        error: '上传文件数量超过限制',
      });
      return;
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      res.status(400).json({
        success: false,
        error: '意外的文件字段名，请使用 "file" 或 "files"',
      });
      return;
    }
  }

  if (err) {
    res.status(400).json({
      success: false,
      error: err.message || '文件上传失败',
    });
    return;
  }

  next();
}

export default router;
