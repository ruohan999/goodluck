import { useEffect, useState, useMemo } from 'react';
import { Table, Progress, Col, Row, Checkbox } from 'antd';
import _ from 'lodash';
import codelist from '@/chat/codelist';
import './index.less';
import ElShow from '@/components/ElShow';

const isLocal = window.location.hostname.includes('localhost') || window.location.hostname.includes('testdev.taikoohui.com');

const stockCodes = [
  { code: 'sh000001',name: '上证指数', enName: '上SZ' },
  { code: 'sh000300',name: '沪深300', enName: 'HS300' },
  { code: 'sz399006',name: '创业板指',  enName: '创CY' },
  { code: 'sh000688',name: '科创50', enName: '科KC' },
  { code: 'sz399102', name: '创业板综', enName: 'CYZ' },
  { code: 'sh000687', name: '科创综指', enName: 'KCZ' },
  // { code: 'sz399001',name: '深圳成指' },
  // { code: 'sh000016',name: '上证50' },
  // { code: 'sz399005',name: '中小板指' },
  // { code: 'sh000905',name: '中证500' },
  // { code: 'sh000852',name: '中证1000' },
  // { code: 'sh000010',name: '上证180' },
  // { code: 'sz399330', name: '深证100' },
];

// 在组件外部定义全局的jsonpgz函数
let jsonpgzPromiseResolve: ((data: any) => void) | null = null;
(window as any).jsonpgz = (data: any) => {
  if (jsonpgzPromiseResolve) {
    jsonpgzPromiseResolve(data);
    jsonpgzPromiseResolve = null;
  }
};

// 专门处理API的JSONP请求
async function fetchFundData(fundCode: string): Promise<any> {
  return new Promise((resolve, reject) => {
    // 保存resolve函数
    jsonpgzPromiseResolve = resolve;
    
    // 创建script标签
    const script = document.createElement('script');
    const url = `https://fundgz.1234567.com.cn/js/${fundCode}.js?rt=${Date.now()}`;
    script.src = url;
    script.async = true;
    
    // 设置超时
    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error('请求超时'));
    }, 10000);
    
    // 清理函数
    const cleanup = () => {
      clearTimeout(timeoutId);
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
    
    // 处理脚本加载错误
    script.onerror = () => {
      cleanup();
      reject(new Error('脚本加载失败'));
    };
    
    // 添加脚本到页面
    document.body.appendChild(script);
  });
}

// 使用 JSONP 方式获取股票数据，避免 CORS 问题
async function fetchStockDataViaJSONP(stockCodes: string[]): Promise<any> {
  return new Promise((resolve, reject) => {
    // 创建全局回调函数
    const callbackName = `stockDataCallback_${Date.now()}`;
    (window as any)[callbackName] = (data: any) => {
      resolve(data);
      // 清理
      delete (window as any)[callbackName];
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
    
    // 构建请求 URL
    const codes = stockCodes.map((x) => x.replace('.', '$')).join(',');
    const url = `https://hq.sinajs.cn/list=${codes}`;
    
    // 创建 script 标签
    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    
    // 设置超时
    const timeoutId = setTimeout(() => {
      delete (window as any)[callbackName];
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      reject(new Error('请求超时'));
    }, 10000);
    
    // 处理脚本加载错误
    script.onerror = () => {
      delete (window as any)[callbackName];
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      reject(new Error('脚本加载失败'));
    };
    
    // 添加脚本到页面
    document.body.appendChild(script);
  });
}

// 顺序获取多个数据
async function sequentialFetchWithFixedCallback(fundCodes: string[]): Promise<any[]> {
  const results = [];
  for (const code of fundCodes) {
    try {
      const data = await fetchFundData(code);
      results.push(data);
    } catch (error) {
      console.error(`获取 ${code} 数据失败:`, error);
      results.push(null);
    }
    
    // 添加延迟避免请求过于频繁
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return results;
}

// 解析新浪财经返回的JavaScript格式数据
function parseSinaStockData(textData: string) {
  const result: any = {};
  const lines = textData.split('\n');
  
  lines.forEach(line => {
    line = line.trim();
    if (!line) return;
    
    // 匹配 var hq_str_code="数据,数据,..."; 格式
    const match = line.match(/var hq_str_(\w+)="([^"]+)"/);
    if (match) {
      const code = match[1];
      const dataStr = match[2];
      const dataArray = dataStr.split(',');
      
      // 构建股票数据对象
      // 注意：不同类型的股票数据字段可能不同，这里提供一个通用的解析
      result[code] = {
        name: dataArray[0],
        open: dataArray[1],
        prevClose: dataArray[2],
        price: dataArray[3],
        high: dataArray[4],
        low: dataArray[5],
        volume: dataArray[8],
        amount: dataArray[9],
        // 可以根据需要添加更多字段
      };
    }
  });

  return result;
}


export default function HomePage() {

  const [dataSource, setDataSource] = useState<any[]>([]);
  const [stockData, setStockData] = useState<any>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [stockOpen, setStockOpen] = useState<boolean>(false);
  const [isSale, setIsSale] = useState<boolean>(false);
  const [isPadding, setIsPadding] = useState<boolean>(false);

  console.log('dataSource', JSON.stringify(dataSource));

  useEffect(() => {
    fetchData();
    fetchStockData();
  }, []);

  async function fetchData () {
    setLoading(true);
    const _codeList = _.cloneDeep(codelist).map((x: any) => x.fundcode);
    const resList = await sequentialFetchWithFixedCallback(_codeList);
    setLoading(false);
    setDataSource(resList.filter(x => !!x).sort((a, b) => Number(b.gszzl) - Number(a.gszzl)));
    setTimeout(() => {
      fetchData();
    }, 10000);
  }

  // 根据环境选择不同的获取方式
  async function fetchStockData () {
    if (isLocal) {
      // 本地开发环境：使用代理
      await fetchStockDataViaProxy();
    } else {
      // 生产环境：使用 JSONP
      await fetchStockDataViaJSONP();
    }

    setTimeout(() => {
      fetchStockData();
    }, 3500);
  }

  // 本地开发环境：通过代理获取股票数据
  async function fetchStockDataViaProxy () {
    try {
      const codes = stockCodes.map((x) => x.code.replace('.', '$')).join(',');
      const url = `/stock/list=${codes}&_t=${Date.now()}`;
      
      const resp = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Referer': 'https://finance.sina.com.cn/',
        },
        credentials: 'include',
      });

      if (resp.ok) {
        const textData = await resp.text();
        const stockData = parseSinaStockData(textData);
        setStockData(stockData);
        console.log('股票数据:', stockData);
      }
    } catch (error: any) {
      console.error('通过代理获取股票数据失败:', error);
    }
  }

  // 生产环境：从静态 JSON 文件获取股票数据（由 GitHub Action 定期更新）
  async function fetchStockDataViaJSONP () {
    try {
      // 从 gh-pages 分支获取静态 JSON 文件
      const url = `${window.location.origin}${window.location.pathname}stock_data.json?_t=${Date.now()}`;
      
      console.log('获取股票数据:', url);

      const resp = await fetch(url);

      if (resp.ok) {
        const stockData = await resp.json();
        console.log('股票数据:', stockData);
        setStockData(stockData);
      } else {
        console.error('请求失败:', resp.status);
        
        // 如果 JSON 文件不存在，尝试 JS 文件
        await fetchStockDataViaJSFile();
      }
    } catch (error: any) {
      console.error('获取股票数据失败:', error);
      
      // 备用：尝试直接解析 JS 文件
      try {
        await fetchStockDataViaJSFile();
      } catch (backupError) {
        console.error('备用方案也失败:', backupError);
      }
    }
  }

  // 从静态 JS 文件获取股票数据
  async function fetchStockDataViaJSFile () {
    try {
      const url = `${window.location.origin}${window.location.pathname}stock_data.js?_t=${Date.now()}`;
      
      console.log('获取股票数据(JS文件):', url);

      const resp = await fetch(url);
      if (resp.ok) {
        const textData = await resp.text();
        const stockData: any = {};
        
        stockCodes.forEach((x) => {
          // 使用正则匹配新浪数据格式
          const regex = new RegExp(`hq_str_${x.code}="([^"]+)"`);
          const match = textData.match(regex);
          
          if (match) {
            const dataArray = match[1].split(',');
            stockData[x.code] = {
              name: dataArray[0] || x.name,
              price: dataArray[3] || '0',
              prevClose: dataArray[2] || '0',
              open: dataArray[1] || '0',
              high: dataArray[4] || '0',
              low: dataArray[5] || '0',
              volume: dataArray[8] || '0',
              amount: dataArray[9] || '0',
            };
          }
        });
        
        setStockData(stockData);
        console.log('从JS文件解析的股票数据:', stockData);
      }
    } catch (error) {
      console.error('从JS文件获取股票数据失败:', error);
    }
  }

  const columns = [
    {
      title: '编号',
      dataIndex: 'fundcode',
      className: 'base_columns'
    },
    {
      title: '名称',
      dataIndex: 'name',
      className: 'base_columns'
    },
    {
      title: '值',
      dataIndex: 'gszzl',
      className: 'base_columns',
      render: (gszzl: string) => {
        return Number(gszzl) > 0 ? <span style={{ color: 'rgba(255, 0, 0, 0.6)' }}>{gszzl}</span> : <span style={{ color: 'rgba(7, 193, 96, 0.5)' }}>{gszzl}</span>
      }
    }
  ];

  const renderStockElement = useMemo(() => {
    return stockCodes.map((x) => {
      const item:any = stockData[x.code] || {};
      const NumberItem = (value:number, suffix: string = '') => {
        return (
          <span style={{ color: value > 0 ? 'rgba(255, 0, 0, 0.6)' : 'rgba(7, 193, 96, 0.5)' }}>{`${value.toFixed(2)}${suffix}` || '-'} </span>
        )
      }
      return (
        <div key={x.code}>
          <div
            style={{ 
              border: '1px solid #d1a9a9', paddingInline: '8px', 
              minHeight: '30px', borderRadius: '6px'
            }}
            onDoubleClick={() => {
              setStockOpen(!stockOpen);
            }}
          >
            <div style={{ fontSize: '11px' }}>
              <div style={{ fontWeight: 'bold', margin: '4px 0' }}>
                {x.enName}  
                {/* {x.code} */}
              </div>
              <div style={{ marginBottom: '6px' }}>
                <span>dis: </span> {item?.price ? NumberItem(Number(item?.price) - Number(item?.prevClose)) : '-'}
                <span style={{ marginLeft: 8 }}>百分比:  </span> {item?.price ? NumberItem(((Number(item?.price) - Number(item?.prevClose)) / Number(item?.prevClose) * 100), '%') : '-'}
              </div>
              <ElShow when={stockOpen}>
                <>
                  <div style={{ marginBottom: '6px' }}>
                    昨收:  {Number(item?.prevClose).toFixed(2) || '-'}
                  </div>
                  <div style={{ marginBottom: '6px' }}>
                    <span>开盘: </span> {Number(item?.open).toFixed(2) || '-'}
                    <span style={{ marginLeft: 8 }}>收盘: </span> {Number(item?.price).toFixed(2) || '-'}
                  </div>
                  <div style={{ marginBottom: '6px' }}>
                    <span>最高: </span> {Number(item?.high).toFixed(2) || '-'}
                    <span style={{ marginLeft: 8 }}>最低: </span> {Number(item?.low).toFixed(2) || '-'}
                  </div>
                  <div style={{ marginBottom: '6px' }}>
                    <span>成交: </span> {`${(Number(item?.amount) / 100000000).toFixed(2)}` || '-'} 亿
                  </div>
                  <div style={{ marginBottom: '6px' }}>
                    <span>增量: {NumberItem(Number((Number(item?.volume) / 100000000).toFixed(2)))}亿</span> 
                  </div>
                </>
              </ElShow>
            </div>
          </div>
        </div>
      )
    })
  }, [stockCodes, stockData, stockOpen])

  console.log('dataSource', dataSource);

  const dataList = dataSource.filter(x => {
    return ((_.get(_.find(codelist, { fundcode: x.fundcode }), 'isSale') || false) === isSale) && (_.get(_.find(codelist, { fundcode: x.fundcode }), 'isPadding') || false) === isPadding
  });

  return (
    <div className='index_container'>
      <div style={{ marginBottom: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gridColumnGap: '6px', gridRowGap: '6px', width: '100%' }}>
        {renderStockElement}
      </div>
      <Progress percent={loading ? 58 : 100} strokeColor={{ '0%': '#87d068', '50%': '#ffe58f', '100%': '#ffccc7' }} />
      <Checkbox checked={isSale} disabled={isPadding} onChange={(e) => setIsSale(e.target.checked)} style={{ color: 'rgba(256, 256, 256, 0.25)'}}>SALE</Checkbox>
      <Checkbox checked={isPadding} disabled={isSale} onChange={(e) => setIsPadding(e.target.checked)} style={{ color: 'rgba(256, 256, 256, 0.25)'}}>Padding</Checkbox>
      <div style={{ fontSize: '11px', marginBottom: 8 }} 
        onDoubleClick={() => {
        window.location.href = '/chat';
       }}
      >
        UP: {dataList.filter(x => Number(x.gszzl) > 0).length}  DOWN: {dataList.filter(x => Number(x.gszzl) < 0).length}
      </div>
      {/* <Table 
        columns={columns}
        // dataSource={dataList}
        dataSource={[]}
        size='small'
        rowKey={(record: any) => `${record.fundcode}-${record.name}`}
        pagination={false}
        // loading={loading}
      /> */}
      {
        dataList.map((x, index) => (
          <div key={index} style={{ 
            display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 12,
            color: isLocal ? 'rgba(255, 255, 255, 0.52)' : 'rgba(256, 256, 256, 0.82)' 
          }}>
            <div>{x.fundcode} {x.name} </div>
            <div>
              {Number(x.gszzl) > 0 ? (
                <span style={{ color: isLocal ? 'rgba(255, 0, 0, 0.5)' : 'rgba(255, 0, 0, 0.82)' }}>{x.gszzl}</span>
              ) : (
                <span style={{ color: isLocal ? 'rgba(7, 193, 96, 0.5)' : 'rgba(7, 193, 96, 0.82)' }}>{x.gszzl}</span>
              )}
            </div>
          </div>
        ))
      }
    </div>
  );
}
