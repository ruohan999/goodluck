const https = require('https');

console.log('=== 验证远程部署 ===');

https.get('https://ruohan999.github.io/goodluck/', (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    console.log('index.html Status:', res.statusCode);
    console.log('Has umi.js:', d.includes('umi.js'));
    
    https.get('https://ruohan999.github.io/goodluck/stock_data.json', (res2) => {
      let d2 = '';
      res2.on('data', c => d2 += c);
      res2.on('end', () => {
        console.log('stock_data.json Status:', res2.statusCode);
        console.log('');
        console.log('远程访问地址: https://ruohan999.github.io/goodluck/#/home');
        console.log('本地访问地址: http://localhost:8001/#/home');
      });
    });
  });
});
