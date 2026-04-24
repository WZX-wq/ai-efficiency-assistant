// Cloudflare Worker - AI API 代理（支持流式输出）
// 隐藏真实 API Key，前端通过此代理调用 AI 服务

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: '只允许 POST 请求' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    try {
      const body = await request.json();

      if (!body.messages || !Array.isArray(body.messages)) {
        return new Response(
          JSON.stringify({ error: '缺少 messages 字段' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const apiKey = env.API_KEY;
      if (!apiKey) {
        return new Response(
          JSON.stringify({ error: '服务端 API Key 未配置' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const useStream = body.stream !== false; // 默认开启流式

      const upstreamResponse = await fetch('https://api.edgefn.net/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: body.model || 'DeepSeek-V3',
          messages: body.messages,
          temperature: body.temperature ?? 0.7,
          max_tokens: body.max_tokens ?? 2048,
          stream: useStream,
        }),
      });

      if (useStream) {
        // 流式模式：直接透传 SSE 流
        return new Response(upstreamResponse.body, {
          status: upstreamResponse.status,
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        });
      } else {
        // 非流式模式：返回完整 JSON
        const data = await upstreamResponse.json();
        return new Response(JSON.stringify(data), {
          status: upstreamResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } catch (err) {
      return new Response(
        JSON.stringify({ error: '代理服务内部错误' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  },
};

interface Env {
  API_KEY: string;
}
