import { defineConfig } from "umi";

export default defineConfig({
  npmClient: 'pnpm',
  publicPath: '/goodluck/',
  base: '/goodluck/',
  routes: [
    {
      path: '/',
      component: '@/layouts/index',
      routes: [
        { path: '/', redirect: '/home' },
        { path: '/home', component: '@/pages/home' },
        { path: '/chat', component: '@/pages/chat' },
        { path: '/docs', component: '@/pages/docs' },
      ],
    },
  ],
  proxy: {
    '/stock': {
      target: 'https://hq.sinajs.cn',
      changeOrigin: true,
      secure: false,
      pathRewrite: {
        '^/stock': ''
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://finance.sina.com.cn/',
      }
    },
    '/fund': {
      target: 'https://fundgz.1234567.com.cn',
      changeOrigin: true,
      secure: false,
      pathRewrite: {
        '^/fund': ''
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://fundgz.1234567.com.cn/',
      }
    },
  },
});
