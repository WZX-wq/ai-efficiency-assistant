import { execSync } from 'child_process';
import { v4 as uuidv4 } from 'uuid';

// ==================== 白山智算 API 配置 ====================
const API_BASE_URL = process.env.BAISHAN_API_URL || 'https://api.edgefn.net/v1/chat/completions';
const API_KEY = process.env.BAISHAN_API_KEY || process.env.DEEPSEEK_API_KEY || '';
const MODEL = 'DeepSeek-R1-0528';

// ==================== 类型定义 ====================
export interface AnalysisResult {
  id: string;
  summary: string;
  statistics: Record<string, { mean: number; median: number; std: number; min: number; max: number }>;
  insights: string[];
  recommendations: string[];
  chartSuggestions: Array<{ type: string; title: string; xField: string; yField: string; description: string }>;
}

interface ChartSuggestion {
  type: string;
  title: string;
  xField: string;
  yField: string;
  description: string;
}

interface ParsedData {
  headers: string[];
  rows: string[][];
  numericColumns: Map<string, number[]>;
  columnTypes: Map<string, 'numeric' | 'string' | 'date'>;
}

// ==================== 统计计算工具函数 ====================

function calcMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function calcMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function calcStd(values: number[]): number {
  if (values.length <= 1) return 0;
  const avg = calcMean(values);
  const squareDiffs = values.map((v) => (v - avg) * (v - avg));
  return Math.sqrt(squareDiffs.reduce((sum, v) => sum + v, 0) / (values.length - 1));
}

function calcMin(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.min(...values);
}

function calcMax(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.max(...values);
}

// ==================== 数据解析 ====================

function parseCSV(data: string): ParsedData {
  const lines = data.trim().split('\n').map((line) => line.trim()).filter((line) => line.length > 0);

  if (lines.length < 2) {
    throw new Error('CSV 数据至少需要包含表头和一行数据');
  }

  const headers = splitCSVLine(lines[0]);
  const rows: string[][] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = splitCSVLine(lines[i]);
    if (row.length === headers.length) {
      rows.push(row);
    }
  }

  return analyzeColumns(headers, rows);
}

function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());

  return result;
}

function parseJSONData(data: string): ParsedData {
  const parsed = JSON.parse(data);

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('JSON 数据必须是非空数组');
  }

  const headers = Object.keys(parsed[0]);
  const rows: string[][] = [];

  for (const item of parsed) {
    const row = headers.map((h) => String(item[h] ?? ''));
    rows.push(row);
  }

  return analyzeColumns(headers, rows);
}

function analyzeColumns(headers: string[], rows: string[][]): ParsedData {
  const numericColumns = new Map<string, number[]>();
  const columnTypes = new Map<string, 'numeric' | 'string' | 'date'>();

  for (let colIdx = 0; colIdx < headers.length; colIdx++) {
    const header = headers[colIdx];
    const values: number[] = [];
    let numericCount = 0;
    let dateCount = 0;

    for (const row of rows) {
      const val = row[colIdx];
      if (val === '' || val === null || val === undefined) continue;

      const num = Number(val);
      if (!isNaN(num) && val.trim() !== '') {
        values.push(num);
        numericCount++;
      }

      if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(val) || /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/.test(val)) {
        dateCount++;
      }
    }

    const totalNonEmpty = rows.filter((r) => r[headers.indexOf(header)] !== '').length;

    if (totalNonEmpty > 0 && numericCount / totalNonEmpty > 0.8 && values.length > 0) {
      numericColumns.set(header, values);
      columnTypes.set(header, 'numeric');
    } else if (totalNonEmpty > 0 && dateCount / totalNonEmpty > 0.8) {
      columnTypes.set(header, 'date');
    } else {
      columnTypes.set(header, 'string');
    }
  }

  return { headers, rows, numericColumns, columnTypes };
}

// ==================== API 调用 ====================

function callAPI(messages: Array<{ role: string; content: string }>): string {
  const requestBody: Record<string, unknown> = {
    model: MODEL,
    messages,
    stream: false,
    temperature: 0.3,
    max_tokens: 4096,
  };

  const bodyStr = JSON.stringify(requestBody);
  const escapedBody = bodyStr.replace(/'/g, "'\\''");

  const command = `curl -s --max-time 120 -X POST '${API_BASE_URL}' \
    -H 'Content-Type: application/json' \
    -H 'Authorization: Bearer ${API_KEY}' \
    -d '${escapedBody}'`;

  const responseData = execSync(command, {
    encoding: 'utf-8',
    timeout: 125000,
    maxBuffer: 10 * 1024 * 1024,
  });

  const parsed = JSON.parse(responseData);
  if (parsed.error) {
    throw new Error(`API 错误: ${parsed.error.message || JSON.stringify(parsed.error)}`);
  }

  return parsed.choices[0]?.message?.content || '';
}

// ==================== 数据摘要生成 ====================

function generateDataSummary(parsed: ParsedData): string {
  const { headers, rows, numericColumns, columnTypes } = parsed;
  let summary = `数据集包含 ${rows.length} 行数据，${headers.length} 个字段。\n\n`;

  summary += '字段信息：\n';
  for (const header of headers) {
    const type = columnTypes.get(header) || 'string';
    const nonEmpty = rows.filter((r) => r[headers.indexOf(header)] !== '').length;
    summary += `- ${header} (${type}): ${nonEmpty} 条非空值`;

    if (type === 'numeric' && numericColumns.has(header)) {
      const values = numericColumns.get(header)!;
      summary += `，范围 [${calcMin(values).toFixed(2)}, ${calcMax(values).toFixed(2)}]，均值 ${calcMean(values).toFixed(2)}`;
    }
    summary += '\n';
  }

  return summary;
}

// ==================== 公共方法 ====================

/**
 * 分析数据 - 核心方法
 */
export async function analyzeData(
  data: string,
  format: 'csv' | 'json',
  question?: string,
): Promise<AnalysisResult> {
  let parsed: ParsedData;
  try {
    parsed = format === 'csv' ? parseCSV(data) : parseJSONData(data);
  } catch (error) {
    throw new Error(`数据解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }

  const statistics: AnalysisResult['statistics'] = {};
  for (const [colName, values] of parsed.numericColumns) {
    statistics[colName] = {
      mean: parseFloat(calcMean(values).toFixed(4)),
      median: parseFloat(calcMedian(values).toFixed(4)),
      std: parseFloat(calcStd(values).toFixed(4)),
      min: parseFloat(calcMin(values).toFixed(4)),
      max: parseFloat(calcMax(values).toFixed(4)),
    };
  }

  const dataSummary = generateDataSummary(parsed);

  let insights: string[] = [];
  let recommendations: string[] = [];

  try {
    const analysisPrompt = `你是一个专业的数据分析师。请分析以下数据集，提供洞察和建议。

数据概览：
${dataSummary}

统计信息：
${JSON.stringify(statistics, null, 2)}

${question ? `用户问题：${question}\n\n` : ''}请严格按以下JSON格式回复，不要添加任何其他内容：
{"insights":["洞察1","洞察2","洞察3"],"recommendations":["建议1","建议2","建议3"]}

要求：
- insights: 3-5条数据洞察，基于统计信息发现数据中的规律、趋势或异常
- recommendations: 3-5条建议，基于数据洞察给出可操作的建议
- 如果用户提出了具体问题，请针对问题给出洞察和建议`;

    const result = callAPI([
      { role: 'system', content: '你是一个专业的数据分析师，擅长从数据中发现规律和趋势。' },
      { role: 'user', content: analysisPrompt },
    ]);

    const cleanedResult = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const jsonMatch = cleanedResult.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const analysisData = JSON.parse(jsonMatch[0]);
      insights = Array.isArray(analysisData.insights) ? analysisData.insights : [];
      recommendations = Array.isArray(analysisData.recommendations) ? analysisData.recommendations : [];
    }
  } catch (error) {
    console.error('[DataAnalysis] LLM 分析失败:', error);
    insights = ['数据分析服务暂时无法生成深度洞察，请稍后重试。'];
    recommendations = ['建议检查数据格式是否正确，确保数值字段包含有效数字。'];
  }

  const chartSuggestions = suggestChartsFromData(parsed);

  return {
    id: uuidv4(),
    summary: dataSummary,
    statistics,
    insights,
    recommendations,
    chartSuggestions,
  };
}

/**
 * 基于数据结构智能推荐图表类型
 */
function suggestChartsFromData(parsed: ParsedData): ChartSuggestion[] {
  const suggestions: ChartSuggestion[] = [];
  const { headers, numericColumns, columnTypes } = parsed;
  const numericCols = Array.from(numericColumns.keys());
  const stringCols = headers.filter((h) => columnTypes.get(h) === 'string');

  if (stringCols.length > 0 && numericCols.length > 0) {
    suggestions.push({
      type: 'bar',
      title: `${stringCols[0]} 与 ${numericCols[0]} 的分布`,
      xField: stringCols[0],
      yField: numericCols[0],
      description: `展示不同${stringCols[0]}类别下${numericCols[0]}的数值对比`,
    });
  }

  if (numericCols.length >= 2) {
    suggestions.push({
      type: 'line',
      title: `${numericCols[0]} 与 ${numericCols[1]} 的趋势对比`,
      xField: numericCols[0],
      yField: numericCols[1],
      description: `展示${numericCols[0]}和${numericCols[1]}之间的关系趋势`,
    });
  }

  const dateCols = headers.filter((h) => columnTypes.get(h) === 'date');
  if (dateCols.length > 0 && numericCols.length > 0) {
    suggestions.push({
      type: 'line',
      title: `${numericCols[0]} 随时间变化趋势`,
      xField: dateCols[0],
      yField: numericCols[0],
      description: `展示${numericCols[0]}随${dateCols[0]}的变化趋势`,
    });
  }

  if (numericCols.length >= 2) {
    suggestions.push({
      type: 'scatter',
      title: `${numericCols[0]} 与 ${numericCols[1]} 的相关性`,
      xField: numericCols[0],
      yField: numericCols[1],
      description: `展示${numericCols[0]}和${numericCols[1]}之间的相关关系`,
    });
  }

  if (stringCols.length > 0 && numericCols.length > 0) {
    suggestions.push({
      type: 'pie',
      title: `${numericCols[0]} 在 ${stringCols[0]} 中的占比`,
      xField: stringCols[0],
      yField: numericCols[0],
      description: `展示各${stringCols[0]}类别在${numericCols[0]}中的占比分布`,
    });
  }

  if (numericCols.length >= 3) {
    suggestions.push({
      type: 'radar',
      title: '多维度数值对比',
      xField: numericCols.slice(0, 3).join(', '),
      yField: numericCols[0],
      description: `展示${numericCols.slice(0, 3).join('、')}等多个维度的数值对比`,
    });
  }

  return suggestions;
}

/**
 * 生成数据分析报告
 */
export async function generateReport(
  data: string,
  format: 'csv' | 'json',
  reportType: 'summary' | 'detailed' | 'executive',
): Promise<string> {
  const analysis = await analyzeData(data, format);

  const reportPrompts: Record<string, string> = {
    summary: `请基于以下数据分析结果，生成一份简洁的数据摘要报告（300字以内）。
报告应包含：数据概况、核心发现、关键建议。

数据摘要：
${analysis.summary}

统计信息：
${JSON.stringify(analysis.statistics, null, 2)}

洞察：
${analysis.insights.join('\n')}

建议：
${analysis.recommendations.join('\n')}`,

    detailed: `请基于以下数据分析结果，生成一份详细的数据分析报告。
报告应包含：
1. 数据概况（数据量、字段说明）
2. 统计分析（各字段的统计指标解读）
3. 深度洞察（数据中的规律、趋势、异常）
4. 图表建议（推荐的可视化方案）
5. 行动建议（基于数据的具体建议）
6. 结论

数据摘要：
${analysis.summary}

统计信息：
${JSON.stringify(analysis.statistics, null, 2)}

洞察：
${analysis.insights.join('\n')}

建议：
${analysis.recommendations.join('\n')}

图表建议：
${analysis.chartSuggestions.map((c) => `- ${c.type}: ${c.title} (${c.description})`).join('\n')}`,

    executive: `请基于以下数据分析结果，生成一份面向管理层的执行摘要报告（500字以内）。
报告应包含：核心业务指标、关键发现、战略建议、风险提示。

数据摘要：
${analysis.summary}

统计信息：
${JSON.stringify(analysis.statistics, null, 2)}

洞察：
${analysis.insights.join('\n')}

建议：
${analysis.recommendations.join('\n')}`,
  };

  try {
    const result = callAPI([
      {
        role: 'system',
        content: '你是一个专业的数据分析师，擅长撰写清晰、专业的数据分析报告。请使用中文撰写报告，使用 Markdown 格式。',
      },
      { role: 'user', content: reportPrompts[reportType] },
    ]);

    return result;
  } catch (error) {
    console.error('[DataAnalysis] 报告生成失败:', error);
    return `# 数据分析报告\n\n## 数据概况\n${analysis.summary}\n\n## 洞察\n${analysis.insights.map((i) => `- ${i}`).join('\n')}\n\n## 建议\n${analysis.recommendations.map((r) => `- ${r}`).join('\n')}`;
  }
}

/**
 * 自然语言查询数据
 */
export async function queryData(
  data: string,
  format: 'csv' | 'json',
  question: string,
): Promise<string> {
  let parsed: ParsedData;
  try {
    parsed = format === 'csv' ? parseCSV(data) : parseJSONData(data);
  } catch (error) {
    throw new Error(`数据解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }

  const dataSummary = generateDataSummary(parsed);

  // 生成数据样本（前5行）
  const sampleRows = parsed.rows.slice(0, 5);
  const sampleData = sampleRows.map((row) => {
    const obj: Record<string, string> = {};
    parsed.headers.forEach((h, i) => {
      obj[h] = row[i];
    });
    return obj;
  });
  const sampleStr = JSON.stringify(sampleData, null, 2);

  const queryPrompt = `你是一个专业的数据分析助手。用户有一个关于数据集的自然语言问题，请基于提供的数据信息进行回答。

数据集信息：
${dataSummary}

数据样本（前5行）：
${sampleStr}

用户问题：${question}

请基于以上数据信息回答用户的问题。如果数据不足以回答问题，请诚实说明。使用清晰、简洁的中文回答。`;

  try {
    const result = callAPI([
      {
        role: 'system',
        content: '你是一个专业的数据分析助手，擅长基于数据回答用户的自然语言问题。',
      },
      { role: 'user', content: queryPrompt },
    ]);

    return result;
  } catch (error) {
    console.error('[DataAnalysis] 数据查询失败:', error);
    throw new Error('数据查询失败，请稍后重试');
  }
}

/**
 * 推荐图表配置
 */
export async function suggestCharts(
  data: string,
  format: 'csv' | 'json',
): Promise<Array<{ type: string; title: string; xField: string; yField: string; description: string }>> {
  let parsed: ParsedData;
  try {
    parsed = format === 'csv' ? parseCSV(data) : parseJSONData(data);
  } catch (error) {
    throw new Error(`数据解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }

  // 先基于数据结构生成基础图表建议
  const baseSuggestions = suggestChartsFromData(parsed);

  // 使用 LLM 优化图表建议
  const dataSummary = generateDataSummary(parsed);

  try {
    const chartPrompt = `你是一个数据可视化专家。请基于以下数据集信息，推荐最适合的图表配置。

数据集信息：
${dataSummary}

当前基础建议：
${baseSuggestions.map((s) => `- ${s.type}: ${s.title} (x: ${s.xField}, y: ${s.yField}) - ${s.description}`).join('\n')}

请评估并优化图表建议，严格按以下JSON数组格式回复，不要添加任何其他内容：
[{"type":"图表类型","title":"图表标题","xField":"X轴字段","yField":"Y轴字段","description":"图表说明"}]

图表类型可选：bar, line, pie, scatter, radar, area, heatmap
推荐3-5个最有价值的图表。`;

    const result = callAPI([
      {
        role: 'system',
        content: '你是一个数据可视化专家，擅长为不同类型的数据推荐最合适的图表。',
      },
      { role: 'user', content: chartPrompt },
    ]);

    const cleanedResult = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const jsonMatch = cleanedResult.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const llmSuggestions = JSON.parse(jsonMatch[0]);
      if (Array.isArray(llmSuggestions) && llmSuggestions.length > 0) {
        return llmSuggestions.map((s: Record<string, unknown>) => ({
          type: String(s.type || 'bar'),
          title: String(s.title || '未命名图表'),
          xField: String(s.xField || ''),
          yField: String(s.yField || ''),
          description: String(s.description || ''),
        }));
      }
    }
  } catch (error) {
    console.error('[DataAnalysis] LLM 图表建议失败:', error);
  }

  // LLM 失败时返回基础建议
  return baseSuggestions;
}

/**
 * 获取服务配置信息
 */
export function getServiceConfig(): Record<string, unknown> {
  return {
    name: 'AI 数据分析助手',
    version: '1.0.0',
    model: MODEL,
    features: [
      '数据统计分析',
      '智能洞察生成',
      '自然语言查询',
      '图表配置推荐',
      '多格式报告生成',
    ],
    supportedFormats: ['csv', 'json'],
    supportedReportTypes: ['summary', 'detailed', 'executive'],
    supportedChartTypes: ['bar', 'line', 'pie', 'scatter', 'radar', 'area', 'heatmap'],
  };
}
