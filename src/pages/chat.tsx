import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import _ from 'lodash';
import * as echarts from 'echarts';
import codelist from '@/chat/codelist';
import chatData from '@/chat/index';

import dateList from '@/date/20260210';
import { InputNumber } from 'antd';

export default function ChatPage() {
  const [page, setPage] = useState<number>(1);
  const [size, setSize] = useState<number>(5);
  const chartRef = useRef(null)

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchData();
  }, [page, size]);

  const echartsResize = () => {
    chartRef?.current && echarts?.init(chartRef?.current)?.resize();
  }

  useLayoutEffect(() => {
    echartsResize()
  }, [])

  useEffect(() => {
    window.addEventListener('resize', echartsResize)
    return () => {
      window.removeEventListener('resize', echartsResize)
    }
  }, [])

  async function fetchData () {
    console.log('echarts==',echarts, chartRef.current);
    if (echarts && chartRef.current) {
      echarts.dispose(chartRef.current);
    }
    const _codeList = _.cloneDeep(codelist).map((x: any) => x.fundcode);
    console.log('_codeList', chatData, _codeList.slice((page - 1) * size, page * size));
    const series = _codeList.slice((page - 1) * size, page * size).map((x: any) => {
      const findData = _.find(dateList, { fundcode: x });
      return {
        name: _.get(findData, 'name'),
        fundcode: x,
        type: 'line',
        labelLayout: {
          moveOverlap: 'shiftY'
        },
        // endLabel: {
        //   show: true,
        //   formatter: function (params: any) {
        //     return params.seriesName;
        //   }
        // },
        data: [
          ..._.find(chatData.legendList, { fundcode: x }).data || [],
          // ...[Number(_.get(findData, 'gszzl') || 0)]
        ]
      }
    });
    const myChart = echarts?.init(chartRef?.current);
    const options =  {
      title: { text: '' },
      animationDuration: 1000,
      tooltip: {
        trigger: 'axis'
      },
      // legend: {
      //   data: series.map((x: any) => x.name)
      // },
      grid: {
        right: 300
      },
      toolbox: {
        feature: {
          saveAsImage: {}
        }
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: chatData.timeList
      },
      yAxis: {
        type: 'value'
      },
      series
    };
    console.log('options', JSON.stringify(series));
    options && myChart?.setOption(options);
  }

  return (
    <div>
      <div 
        style={{ 
          display: 'flex', justifyContent: 'center', alignItems: 'center', 
          position: 'fixed', top: 10, left: '50%', transform: 'translateX(-50%)', backgroundColor: '#fff', zIndex: 999, padding: '10px 0'
        }}>
        <span
          onClick={ () => {
            if (page <= 1) {
              return;
            }
            setPage(page - 1) 
          }} 
          style={{ color: page <= 1 ? 'rgba(0, 0, 0, 0.2)' : 'rgba(33, 150, 243, 0.6)', fontSize: '12px' }}
        >上一页</span>
        <span 
          onClick={() => { 
            if (page * size >= codelist.length) {
              return;
            }
            setPage(page + 1) 
          }} 
          style={{ color: page * size >= codelist.length ? 'rgba(0, 0, 0, 0.2)' : 'rgba(33, 150, 243, 0.6)', fontSize: '12px', marginLeft: 15 }}
        >下一页</span>
        <div style={{ fontSize: '10px', marginLeft: 15 }}>当前第 {page} 页，共 {Math.ceil(codelist.length / size)} 页; 当前页面显示 {size} 条数据</div>
        <InputNumber
          style={{ marginLeft: 15 }}
          value={size}
          onPressEnter={(value:any) => {
            console.log('value', value);
            const _value = value?.target?.value || 0
            if (_value) {
              setSize(Number(_value));
            }
          }}
          min={1}
          max={1000}
          step={1}
        />
      </div>
      <div id="myChat" ref={chartRef} style={{ minWidth: '100%', height: '355px', marginTop: '20px', overflow: 'auto' }}></div>
    </div>
  )
}