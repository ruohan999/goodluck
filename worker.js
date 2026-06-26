// Cloudflare Worker: Sina Stock API Proxy
// 部署地址: https://sina-stock-proxy.your-name.workers.dev

export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext) {
    // 获取请求参数
    const url = new URL(request.url);
    const list = url.searchParams.get('list');
    
    if (!list) {
      return new Response('缺少 list 参数', { status: 400 });
    }

    // 构建新浪 API 请求
    const sinaUrl = `https://hq.sinajs.cn/list=${list}`;
    
    // 发起请求到新浪 API，设置正确的头部
    const response = await fetch(sinaUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://finance.sina.com.cn/',
        'Accept': '*/*',
      },
    });

    // 获取响应内容
    const text = await response.text();

    // 返回响应，添加 CORS 头部
    return new Response(text, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'text/javascript; charset=utf-8',
      },
    });
  },
};
