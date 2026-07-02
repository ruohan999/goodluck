import { useEffect, useState, useMemo } from 'react';
import { Table, Progress, Col, Row, Checkbox } from 'antd';
import _ from 'lodash';
import codelist from '@/chat/codelist';
import './index.less';
import ElShow from '@/components/ElShow';

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

// 在组件外部定义全局的jsonpgz函数和股票回调函数
let jsonpgzPromiseResolve: ((data: any) => void) | null = null;
let stockCallbackPromiseResolve: ((data: any) => void) | null = null;
let stockScriptId = 0;
(window as any).jsonpgz = (data: any) => {
  if (jsonpgzPromiseResolve) {
    jsonpgzPromiseResolve(data);
    jsonpgzPromiseResolve = null;
  }
};
// 东方财富股票数据回调函数（JSONP）
(window as any).stockCallback = (data: any) => {
  if (stockCallbackPromiseResolve) {
    stockCallbackPromiseResolve(data);
    stockCallbackPromiseResolve = null;
  }
};

// 专门处理API的JSONP请求
async function fetchFundData(fundCode: string): Promise<any> {
  return new Promise((resolve, reject) => {
    // 保存resolve函数
    jsonpgzPromiseResolve = resolve;
    
    // 创建script标签
    const script = document.createElement('script');
    // 生产环境直接访问真实API地址（绕过代理）
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

// 解析东方财富返回的JSON数据格式（修正字段映射）
// 东方财富字段映射：f43=最新价, f44=最高, f45=最低, f46=今开, f47=成交量, f48=成交额, f57=代码, f58=名称, f60=昨收, f169=涨跌额, f170=涨跌幅
function parseSinaStockData(data: any) {
  const result: any = {};
  
  if (data && data.data) {
    const item = data.data;
    const code = item.f57 || '';
    
    // 构建完整code如sh000001
    // 指数代码000开头是上海，普通股票6开头是上海，其他是深圳
    let marketPrefix = 'sz';
    if (code.startsWith('0') || code.startsWith('6') || code.startsWith('9')) {
      marketPrefix = 'sh';
    }
    const fullCode = `${marketPrefix}${code}`;
    
    result[fullCode] = {
      name: item.f58,      // 股票名称
      price: item.f43,     // 当前价格（最新价）
      prevClose: item.f60, // 昨收
      open: item.f46,      // 今开
      high: item.f44,      // 最高
      low: item.f45,       // 最低
      volume: item.f47,    // 成交量（手）
      amount: item.f48,    // 成交额（万元）
      change: item.f169,   // 涨跌额
      changePercent: item.f170 / 100, // 涨跌幅（百分比，需除以100）
    };
  }
  
  return result;
}


export default function HomePage() {

  const [dataSource, setDataSource] = useState<any[]>([]);
  const [stockData, setStockData] = useState<any>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [stockOpen, setStockOpen] = useState<boolean>(false);
  const [isSale, setIsSale] = useState<boolean>(false);
  const [isPadding, setIsPadding] = useState<boolean>(false);
  
  const url = `https://hq.sinajs.cn/list=${stockCodes
    .map((x) => x.code.replace('.', '$')) // 新浪接口中点号替换为$
    .join(',')}`;

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

  // 使用东方财富JSONP获取股票数据（直接使用原始代码作为键）
  async function fetchStockData () {
    try {
      const results: any = {};
      
      // 逐个查询股票数据，直接使用原始stock.code作为键
      for (const stock of stockCodes) {
        const data = await fetchSingleStock(stock.code);
        if (data && data.data) {
          const item = data.data;
          // 东方财富API返回的数值是乘以100后的整数，需要除以100得到实际值
          // f43/f44/f45/f46/f60/f169 除以100，f170 除以100（已经是百分比的100倍）
          results[stock.code] = {
            name: item.f58,      // 股票名称
            price: item.f43 / 100,           // 当前价格（最新价）208259/100=2082.59
            prevClose: item.f60 / 100,       // 昨收 215304/100=2153.04
            open: item.f46 / 100,            // 今开
            high: item.f44 / 100,            // 最高
            low: item.f45 / 100,             // 最低
            volume: item.f47,                 // 成交量（手）
            amount: item.f48,                 // 成交额（元）
            change: item.f169 / 100,          // 涨跌额 -7045/100=-70.45
            changePercent: item.f170 / 100,   // 涨跌幅（百分比）-327/100=-3.27%
          };
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      setStockData(results);
      console.log('股票数据:', results);
    } catch (error: any) {
      console.error('获取股票数据失败:', error);
    }
    setTimeout(() => {
      fetchStockData();
    }, 5000); // 5秒自动刷新
  }
  
  // 使用东方财富JSONP接口查询单个股票数据
  function fetchSingleStock(code: string): Promise<any> {
    return new Promise((resolve, reject) => {
      stockCallbackPromiseResolve = resolve;
      
      const script = document.createElement('script');
      const prefix = code.startsWith('sh') ? '1.' : '0.';
      const secid = `${prefix}${code.substring(2)}`;
      
      // 东方财富push2 API，支持cb回调参数，需要f60（昨收）字段
      script.src = `https://push2.eastmoney.com/api/qt/stock/get?secid=${secid}&fields=f43,f44,f45,f46,f47,f48,f57,f58,f60,f169,f170&cb=stockCallback&_=${Date.now()}`;
      script.async = true;
      script.id = `stock-script-${++stockScriptId}`;
      
      const timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error('请求超时'));
      }, 5000);
      
      const cleanup = () => {
        clearTimeout(timeoutId);
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
      };
      
      script.onerror = () => {
        cleanup();
        reject(new Error('脚本加载失败'));
      };
      
      document.body.appendChild(script);
    });
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
                {x.enName}&nbsp;&nbsp; {item?.price?.toFixed(2) || '-'}
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
          <div key={index} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 12, color: 'rgba(255, 255, 255, 0.52)' }}>
            <div>{x.fundcode} {x.name} </div>
            <div>
              {Number(x.gszzl) > 0 ? <span style={{ color: 'rgba(255, 0, 0, 0.5)' }}>{x.gszzl}</span> : <span style={{ color: 'rgba(7, 193, 96, 0.5)' }}>{x.gszzl}</span>}
            </div>
          </div>
        ))
      }
    </div>
  );
}
