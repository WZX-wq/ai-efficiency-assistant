/**
 * AI 效率助手 API 集成测试
 *
 * 使用 Node.js 内置 assert 模块，无需额外测试框架
 * 运行方式: npx ts-node tests/api.test.ts
 *          或编译后: node dist/tests/api.test.js
 *
 * 前提条件:
 * - 服务器运行在 http://localhost:3001
 * - MongoDB 已启动并连接
 */

import * as http from 'http';

const BASE_URL = 'http://localhost:3001/api';

// ==================== 简单测试运行器 ====================

let passed = 0;
let failed = 0;
let total = 0;

async function test(name: string, fn: () => Promise<void>) {
  total++;
  try {
    await fn();
    passed++;
    console.log(`  [PASS] ${name}`);
  } catch (err: any) {
    failed++;
    console.log(`  [FAIL] ${name}: ${err.message || err}`);
  }
}

function assert(condition: any, message: string) {
  if (!condition) throw new Error(message);
}

function assertEqual(actual: any, expected: any, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

function assertStatus(res: any, expectedStatus: number, message: string) {
  if (res.statusCode !== expectedStatus) {
    throw new Error(`${message}: expected status ${expectedStatus}, got ${res.statusCode}`);
  }
}

async function request(
  method: string,
  path: string,
  body?: any,
  headers?: Record<string, string>
): Promise<{ statusCode: number; data: any }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options: http.RequestOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      timeout: 10000,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode || 0, data: JSON.parse(data) });
        } catch {
          resolve({ statusCode: res.statusCode || 0, data });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// ==================== 测试用例 ====================

async function runTests() {
  let authToken = '';
  let refreshToken = '';
  const testEmail = `test_${Date.now()}@example.com`;
  const testPassword = 'Test123456';
  const testName = 'TestUser';

  console.log('\n========================================');
  console.log(' AI 效率助手 API 集成测试');
  console.log('========================================\n');

  // ==================== 1. 健康检查 ====================
  console.log('--- 1. 健康检查 ---');

  await test('GET /api/health - 服务健康检查', async () => {
    const res = await request('GET', '/health');
    assertStatus(res, 200, '健康检查失败');
    assertEqual(res.data.status, 'ok', '状态应为 ok');
    assert(res.data.timestamp, '应包含时间戳');
    assertEqual(res.data.version, '2.0.0', '版本应为 2.0.0');
  });

  // ==================== 2. 认证模块 ====================
  console.log('\n--- 2. 认证模块 ---');

  await test('POST /api/auth/register - 用户注册', async () => {
    const res = await request('POST', '/auth/register', {
      email: testEmail,
      password: testPassword,
      name: testName,
    });
    assertStatus(res, 201, '注册失败');
    assert(res.data.success, '注册应成功');
    assert(res.data.data?.token, '应返回 token');
    authToken = res.data.data.token;
    refreshToken = res.data.data.refreshToken;
  });

  await test('POST /api/auth/register - 重复注册应失败', async () => {
    const res = await request('POST', '/auth/register', {
      email: testEmail,
      password: testPassword,
      name: testName,
    });
    assertStatus(res, 409, '重复注册应返回 409');
  });

  await test('POST /api/auth/register - 参数校验(缺少密码)', async () => {
    const res = await request('POST', '/auth/register', {
      email: 'bad@example.com',
      name: 'Bad',
    });
    assertStatus(res, 400, '缺少密码应返回 400');
  });

  await test('POST /api/auth/login - 用户登录', async () => {
    const res = await request('POST', '/auth/login', {
      email: testEmail,
      password: testPassword,
    });
    assertStatus(res, 200, '登录失败');
    assert(res.data.success, '登录应成功');
    assert(res.data.data?.token, '应返回 token');
    authToken = res.data.data.token;
    refreshToken = res.data.data.refreshToken;
  });

  await test('POST /api/auth/login - 错误密码应失败', async () => {
    const res = await request('POST', '/auth/login', {
      email: testEmail,
      password: 'wrongpassword',
    });
    assertStatus(res, 401, '错误密码应返回 401');
  });

  await test('GET /api/auth/me - 获取当前用户信息', async () => {
    const res = await request('GET', '/auth/me', null, {
      Authorization: `Bearer ${authToken}`,
    });
    assertStatus(res, 200, '获取用户信息失败');
    assert(res.data.success, '应成功');
    assertEqual(res.data.data?.email, testEmail, '邮箱应匹配');
    assertEqual(res.data.data?.name, testName, '姓名应匹配');
  });

  await test('GET /api/auth/me - 未认证应返回 401', async () => {
    const res = await request('GET', '/auth/me');
    assertStatus(res, 401, '未认证应返回 401');
  });

  await test('POST /api/auth/refresh - 刷新令牌', async () => {
    const res = await request('POST', '/auth/refresh', {
      refreshToken,
    });
    assertStatus(res, 200, '刷新令牌失败');
    assert(res.data.data?.token, '应返回新 token');
    authToken = res.data.data.token;
  });

  await test('POST /api/auth/change-password - 修改密码', async () => {
    const res = await request(
      'POST',
      '/auth/change-password',
      {
        currentPassword: testPassword,
        newPassword: 'NewPass123456',
      },
      { Authorization: `Bearer ${authToken}` }
    );
    assertStatus(res, 200, '修改密码失败');
  });

  await test('POST /api/auth/login - 使用新密码登录', async () => {
    const res = await request('POST', '/auth/login', {
      email: testEmail,
      password: 'NewPass123456',
    });
    assertStatus(res, 200, '新密码登录失败');
    authToken = res.data.data.token;
    refreshToken = res.data.data.refreshToken;
  });

  await test('POST /api/auth/logout - 登出', async () => {
    const res = await request('POST', '/auth/logout', null, {
      Authorization: `Bearer ${authToken}`,
    });
    assertStatus(res, 200, '登出失败');
  });

  // ==================== 3. AI 文本处理 ====================
  console.log('\n--- 3. AI 文本处理 ---');

  await test('POST /api/ai/process - 改写 (rewrite)', async () => {
    const res = await request(
      'POST',
      '/ai/process',
      { text: '这是一段测试文本', action: 'rewrite' },
      { Authorization: `Bearer ${authToken}` }
    );
    // 可能返回 200 或 500 (取决于 AI 服务是否配置)
    assert(
      res.statusCode === 200 || res.statusCode === 500,
      '应返回 200 或 500'
    );
  });

  await test('POST /api/ai/process - 扩写 (expand)', async () => {
    const res = await request(
      'POST',
      '/ai/process',
      { text: '人工智能', action: 'expand' },
      { Authorization: `Bearer ${authToken}` }
    );
    assert(
      res.statusCode === 200 || res.statusCode === 500,
      '应返回 200 或 500'
    );
  });

  await test('POST /api/ai/process - 翻译 (translate)', async () => {
    const res = await request(
      'POST',
      '/ai/process',
      { text: '你好世界', action: 'translate', targetLang: 'english' },
      { Authorization: `Bearer ${authToken}` }
    );
    assert(
      res.statusCode === 200 || res.statusCode === 500,
      '应返回 200 或 500'
    );
  });

  await test('POST /api/ai/process - 摘要 (summarize)', async () => {
    const res = await request(
      'POST',
      '/ai/process',
      {
        text: '这是一段很长的文本，需要被摘要。人工智能（Artificial Intelligence，简称AI）是计算机科学的一个分支，致力于创建能够模拟人类智能的系统。',
        action: 'summarize',
      },
      { Authorization: `Bearer ${authToken}` }
    );
    assert(
      res.statusCode === 200 || res.statusCode === 500,
      '应返回 200 或 500'
    );
  });

  await test('POST /api/ai/process - 无效 action 应返回 400', async () => {
    const res = await request(
      'POST',
      '/ai/process',
      { text: 'test', action: 'invalid' },
      { Authorization: `Bearer ${authToken}` }
    );
    assertStatus(res, 400, '无效 action 应返回 400');
  });

  // ==================== 4. AI 对话 ====================
  console.log('\n--- 4. AI 对话 ---');

  await test('POST /api/ai/chat - 流式对话', async () => {
    const res = await request(
      'POST',
      '/ai/chat',
      {
        messages: [{ role: 'user', content: '你好' }],
      },
      { Authorization: `Bearer ${authToken}` }
    );
    assert(
      res.statusCode === 200 || res.statusCode === 500,
      '应返回 200 或 500'
    );
  });

  // ==================== 5. 图片生成 ====================
  console.log('\n--- 5. 图片生成 ---');

  await test('GET /api/image/sizes - 获取支持的尺寸', async () => {
    const res = await request('GET', '/image/sizes');
    assertStatus(res, 200, '获取尺寸失败');
    assert(Array.isArray(res.data.data), '应返回数组');
  });

  await test('GET /api/image/styles - 获取支持的风格', async () => {
    const res = await request('GET', '/image/styles');
    assertStatus(res, 200, '获取风格失败');
    assert(Array.isArray(res.data.data), '应返回数组');
  });

  await test('GET /api/image/qualities - 获取支持的质量', async () => {
    const res = await request('GET', '/image/qualities');
    assertStatus(res, 200, '获取质量失败');
    assert(Array.isArray(res.data.data), '应返回数组');
  });

  await test('GET /api/image/status - 获取服务状态', async () => {
    const res = await request('GET', '/image/status');
    assertStatus(res, 200, '获取状态失败');
  });

  await test('POST /api/image/generate - 文生图', async () => {
    const res = await request(
      'POST',
      '/image/generate',
      { prompt: '一只可爱的猫咪', n: 1, size: '1024x1024' },
      { Authorization: `Bearer ${authToken}` }
    );
    assert(
      res.statusCode === 200 || res.statusCode === 500,
      '应返回 200 或 500'
    );
  });

  // ==================== 6. 文件操作 ====================
  console.log('\n--- 6. 文件操作 ---');

  await test('GET /api/files - 获取文件列表', async () => {
    const res = await request('GET', '/files', null, {
      Authorization: `Bearer ${authToken}`,
    });
    assertStatus(res, 200, '获取文件列表失败');
    assert(res.data.success, '应成功');
  });

  await test('GET /api/files/stats/overview - 获取文件统计', async () => {
    const res = await request('GET', '/files/stats/overview', null, {
      Authorization: `Bearer ${authToken}`,
    });
    assertStatus(res, 200, '获取文件统计失败');
  });

  // ==================== 7. 监控模块 ====================
  console.log('\n--- 7. 监控模块 ---');

  await test('GET /api/monitor/metrics - 获取性能指标', async () => {
    const res = await request('GET', '/monitor/metrics', null, {
      Authorization: `Bearer ${authToken}`,
    });
    assertStatus(res, 200, '获取指标失败');
    assert(res.data.success, '应成功');
  });

  await test('GET /api/monitor/system - 获取系统信息', async () => {
    const res = await request('GET', '/monitor/system', null, {
      Authorization: `Bearer ${authToken}`,
    });
    assertStatus(res, 200, '获取系统信息失败');
  });

  await test('GET /api/monitor/processes - 获取进程列表', async () => {
    const res = await request('GET', '/monitor/processes', null, {
      Authorization: `Bearer ${authToken}`,
    });
    assertStatus(res, 200, '获取进程列表失败');
  });

  await test('GET /api/monitor/services - 获取服务状态', async () => {
    const res = await request('GET', '/monitor/services', null, {
      Authorization: `Bearer ${authToken}`,
    });
    assertStatus(res, 200, '获取服务状态失败');
  });

  await test('GET /api/monitor/dashboard - 获取仪表盘数据', async () => {
    const res = await request('GET', '/monitor/dashboard', null, {
      Authorization: `Bearer ${authToken}`,
    });
    assertStatus(res, 200, '获取仪表盘数据失败');
  });

  await test('GET /api/monitor/status - 获取监控状态', async () => {
    const res = await request('GET', '/monitor/status', null, {
      Authorization: `Bearer ${authToken}`,
    });
    assertStatus(res, 200, '获取监控状态失败');
  });

  // ==================== 8. 画布 CRUD ====================
  console.log('\n--- 8. 画布 CRUD ---');

  let canvasId = '';

  await test('POST /api/canvas - 创建画布', async () => {
    const res = await request(
      'POST',
      '/canvas',
      {
        title: '测试画布',
        description: '这是一个测试画布',
        canvasWidth: 1920,
        canvasHeight: 1080,
      },
      { Authorization: `Bearer ${authToken}` }
    );
    assertStatus(res, 201, '创建画布失败');
    canvasId = res.data.data?._id || res.data.data?.id;
    assert(canvasId, '应返回画布 ID');
  });

  await test('GET /api/canvas - 获取画布列表', async () => {
    const res = await request('GET', '/canvas', null, {
      Authorization: `Bearer ${authToken}`,
    });
    assertStatus(res, 200, '获取画布列表失败');
  });

  await test('GET /api/canvas/templates - 获取画布模板', async () => {
    const res = await request('GET', '/canvas/templates');
    assertStatus(res, 200, '获取模板失败');
  });

  if (canvasId) {
    await test('GET /api/canvas/:id - 获取画布详情', async () => {
      const res = await request('GET', `/canvas/${canvasId}`, null, {
        Authorization: `Bearer ${authToken}`,
      });
      assertStatus(res, 200, '获取画布详情失败');
    });

    await test('DELETE /api/canvas/:id - 删除画布', async () => {
      const res = await request('DELETE', `/canvas/${canvasId}`, null, {
        Authorization: `Bearer ${authToken}`,
      });
      assertStatus(res, 200, '删除画布失败');
    });
  }

  // ==================== 9. 表格 CRUD ====================
  console.log('\n--- 9. 表格 CRUD ---');

  let spreadsheetId = '';

  await test('POST /api/spreadsheet - 创建表格', async () => {
    const res = await request(
      'POST',
      '/spreadsheet',
      {
        title: '测试表格',
        description: '这是一个测试表格',
      },
      { Authorization: `Bearer ${authToken}` }
    );
    assertStatus(res, 201, '创建表格失败');
    spreadsheetId = res.data.data?._id || res.data.data?.id;
    assert(spreadsheetId, '应返回表格 ID');
  });

  await test('GET /api/spreadsheet - 获取表格列表', async () => {
    const res = await request('GET', '/spreadsheet', null, {
      Authorization: `Bearer ${authToken}`,
    });
    assertStatus(res, 200, '获取表格列表失败');
  });

  await test('GET /api/spreadsheet/templates - 获取表格模板', async () => {
    const res = await request('GET', '/spreadsheet/templates');
    assertStatus(res, 200, '获取模板失败');
  });

  if (spreadsheetId) {
    await test('GET /api/spreadsheet/:id - 获取表格详情', async () => {
      const res = await request('GET', `/spreadsheet/${spreadsheetId}`, null, {
        Authorization: `Bearer ${authToken}`,
      });
      assertStatus(res, 200, '获取表格详情失败');
    });

    await test('DELETE /api/spreadsheet/:id - 删除表格', async () => {
      const res = await request(
        'DELETE',
        `/spreadsheet/${spreadsheetId}`,
        null,
        { Authorization: `Bearer ${authToken}` }
      );
      assertStatus(res, 200, '删除表格失败');
    });
  }

  // ==================== 10. 代码执行 ====================
  console.log('\n--- 10. 代码执行 ---');

  await test('GET /api/code/languages - 获取支持的语言', async () => {
    const res = await request('GET', '/code/languages', null, {
      Authorization: `Bearer ${authToken}`,
    });
    assertStatus(res, 200, '获取语言列表失败');
    assert(Array.isArray(res.data.data), '应返回数组');
  });

  await test('POST /api/code/execute - 执行 JavaScript 代码', async () => {
    const res = await request(
      'POST',
      '/code/execute',
      {
        code: 'const sum = (a, b) => a + b; console.log(sum(1, 2));',
        language: 'javascript',
      },
      { Authorization: `Bearer ${authToken}` }
    );
    assertStatus(res, 200, '代码执行失败');
    assert(res.data.success, '执行应成功');
  });

  await test('POST /api/code/execute - 执行 Python 代码', async () => {
    const res = await request(
      'POST',
      '/code/execute',
      {
        code: 'print("Hello from Python")',
        language: 'python',
      },
      { Authorization: `Bearer ${authToken}` }
    );
    assert(
      res.statusCode === 200 || res.statusCode === 500,
      '应返回 200 或 500'
    );
  });

  await test('POST /api/code/analyze - 代码分析', async () => {
    const res = await request(
      'POST',
      '/code/analyze',
      {
        code: 'function add(a, b) { return a + b; }',
        language: 'javascript',
        action: 'explain',
      },
      { Authorization: `Bearer ${authToken}` }
    );
    assert(
      res.statusCode === 200 || res.statusCode === 500,
      '应返回 200 或 500'
    );
  });

  // ==================== 11. 团队操作 ====================
  console.log('\n--- 11. 团队操作 ---');

  let teamId = '';

  await test('POST /api/teams - 创建团队', async () => {
    const res = await request(
      'POST',
      '/teams',
      {
        name: '测试团队',
        description: '这是一个测试团队',
      },
      { Authorization: `Bearer ${authToken}` }
    );
    assertStatus(res, 201, '创建团队失败');
    teamId = res.data.data?._id || res.data.data?.id;
    assert(teamId, '应返回团队 ID');
  });

  await test('GET /api/teams - 获取团队列表', async () => {
    const res = await request('GET', '/teams', null, {
      Authorization: `Bearer ${authToken}`,
    });
    assertStatus(res, 200, '获取团队列表失败');
  });

  if (teamId) {
    await test('GET /api/teams/:teamId - 获取团队详情', async () => {
      const res = await request('GET', `/teams/${teamId}`, null, {
        Authorization: `Bearer ${authToken}`,
      });
      assertStatus(res, 200, '获取团队详情失败');
    });

    await test('DELETE /api/teams/:teamId - 删除团队', async () => {
      const res = await request('DELETE', `/teams/${teamId}`, null, {
        Authorization: `Bearer ${authToken}`,
      });
      assertStatus(res, 200, '删除团队失败');
    });
  }

  // ==================== 12. 数据可视化 ====================
  console.log('\n--- 12. 数据可视化 ---');

  await test('GET /api/visualization/chart-types - 获取图表类型', async () => {
    const res = await request('GET', '/visualization/chart-types', null, {
      Authorization: `Bearer ${authToken}`,
    });
    assertStatus(res, 200, '获取图表类型失败');
  });

  await test('GET /api/visualization/data-source-types - 获取数据源类型', async () => {
    const res = await request(
      'GET',
      '/visualization/data-source-types',
      null,
      { Authorization: `Bearer ${authToken}` }
    );
    assertStatus(res, 200, '获取数据源类型失败');
  });

  await test('GET /api/visualization/system-metrics - 获取系统指标', async () => {
    const res = await request(
      'GET',
      '/visualization/system-metrics',
      null,
      { Authorization: `Bearer ${authToken}` }
    );
    assertStatus(res, 200, '获取系统指标失败');
  });

  await test('GET /api/visualization/time-ranges - 获取时间范围', async () => {
    const res = await request('GET', '/visualization/time-ranges', null, {
      Authorization: `Bearer ${authToken}`,
    });
    assertStatus(res, 200, '获取时间范围失败');
  });

  // ==================== 13. 数据库模块 ====================
  console.log('\n--- 13. 数据库模块 ---');

  await test('GET /api/database/connections - 获取连接列表', async () => {
    const res = await request('GET', '/database/connections', null, {
      Authorization: `Bearer ${authToken}`,
    });
    assertStatus(res, 200, '获取连接列表失败');
  });

  await test('GET /api/database/history - 获取查询历史', async () => {
    const res = await request('GET', '/database/history', null, {
      Authorization: `Bearer ${authToken}`,
    });
    assertStatus(res, 200, '获取查询历史失败');
  });

  // ==================== 14. 语音模块 ====================
  console.log('\n--- 14. 语音模块 ---');

  await test('GET /api/voice/voices - 获取语音列表', async () => {
    const res = await request('GET', '/voice/voices');
    assertStatus(res, 200, '获取语音列表失败');
  });

  await test('GET /api/voice/formats - 获取音频格式', async () => {
    const res = await request('GET', '/voice/formats');
    assertStatus(res, 200, '获取音频格式失败');
  });

  await test('GET /api/voice/status - 获取语音服务状态', async () => {
    const res = await request('GET', '/voice/status');
    assertStatus(res, 200, '获取语音服务状态失败');
  });

  // ==================== 15. 用户模块 ====================
  console.log('\n--- 15. 用户模块 ---');

  await test('GET /api/users/profile - 获取用户资料', async () => {
    const res = await request('GET', '/users/profile', null, {
      Authorization: `Bearer ${authToken}`,
    });
    assertStatus(res, 200, '获取用户资料失败');
  });

  await test('GET /api/users/settings - 获取用户设置', async () => {
    const res = await request('GET', '/users/settings', null, {
      Authorization: `Bearer ${authToken}`,
    });
    assertStatus(res, 200, '获取用户设置失败');
  });

  // ==================== 16. 告警模块 ====================
  console.log('\n--- 16. 告警模块 ---');

  await test('GET /api/alerts - 获取告警列表', async () => {
    const res = await request('GET', '/alerts');
    assertStatus(res, 200, '获取告警列表失败');
  });

  await test('GET /api/alerts/stats - 获取告警统计', async () => {
    const res = await request('GET', '/alerts/stats');
    assertStatus(res, 200, '获取告警统计失败');
  });

  // ==================== 17. 代码片段 CRUD ====================
  console.log('\n--- 17. 代码片段 CRUD ---');

  await test('POST /api/code/snippets - 创建代码片段', async () => {
    const res = await request(
      'POST',
      '/code/snippets',
      {
        title: '测试片段',
        code: 'console.log("hello")',
        language: 'javascript',
        description: '测试用代码片段',
        tags: ['test'],
        isPublic: false,
      },
      { Authorization: `Bearer ${authToken}` }
    );
    assertStatus(res, 201, '创建代码片段失败');
  });

  await test('GET /api/code/snippets - 获取代码片段列表', async () => {
    const res = await request('GET', '/code/snippets', null, {
      Authorization: `Bearer ${authToken}`,
    });
    assertStatus(res, 200, '获取代码片段列表失败');
  });

  await test('GET /api/code/snippets/public - 获取公开代码片段', async () => {
    const res = await request('GET', '/code/snippets/public', null, {
      Authorization: `Bearer ${authToken}`,
    });
    assertStatus(res, 200, '获取公开代码片段失败');
  });

  // ==================== 18. 监控告警规则 ====================
  console.log('\n--- 18. 监控告警规则 ---');

  await test('GET /api/monitor/alerts - 获取告警', async () => {
    const res = await request('GET', '/monitor/alerts', null, {
      Authorization: `Bearer ${authToken}`,
    });
    assertStatus(res, 200, '获取告警失败');
  });

  await test('GET /api/monitor/alert-rules - 获取告警规则', async () => {
    const res = await request('GET', '/monitor/alert-rules', null, {
      Authorization: `Bearer ${authToken}`,
    });
    assertStatus(res, 200, '获取告警规则失败');
  });

  await test('GET /api/monitor/metrics/history - 获取指标历史', async () => {
    const res = await request('GET', '/monitor/metrics/history?limit=10', null, {
      Authorization: `Bearer ${authToken}`,
    });
    assertStatus(res, 200, '获取指标历史失败');
  });

  // ==================== 测试结果汇总 ====================
  console.log('\n========================================');
  console.log(` 测试结果: ${passed}/${total} 通过, ${failed} 失败`);
  console.log('========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

// 运行测试
runTests().catch((err) => {
  console.error('测试运行出错:', err);
  process.exit(1);
});
