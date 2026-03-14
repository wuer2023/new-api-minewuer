import React, { useEffect, useMemo, useState } from 'react';
import { Card, Empty, Radio, RadioGroup, Skeleton, Typography } from '@douyinfe/semi-ui';
import { VChart } from '@visactor/react-vchart';
import { initVChartSemiTheme } from '@visactor/vchart-semi-theme';
import { CHART_CONFIG } from '../../constants/dashboard.constants';
import { API, renderNumber } from '../../helpers';
import { useTranslation } from 'react-i18next';

const { Text, Title } = Typography;

const formatCompactNumber = (value) => {
  if (!value) return '0';
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(value);
};

const formatUpdatedAt = (updatedAt) => {
  if (!updatedAt) return '--';
  return new Date(updatedAt * 1000).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const HomeStatusPanel = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [rankingRange, setRankingRange] = useState('24h');
  const [trendRange, setTrendRange] = useState('24h');
  const [statusData, setStatusData] = useState(null);

  useEffect(() => {
    initVChartSemiTheme({ isWatchingThemeSwitch: true });
  }, []);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await API.get('/api/home/status');
        const { success, data } = res.data;
        if (success) {
          setStatusData(data);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, []);

  const trendSpec = useMemo(() => {
    let rawTrendData = trendRange === '24h' ? statusData?.trend_24h || [] : statusData?.trend_7d || [];
    let trendData = rawTrendData;

    // 针对 24 小时趋势进行严格的时间窗口处理
    if (trendRange === '24h') {
      const now = new Date();
      now.setMinutes(0, 0, 0);
      const buckets = [];
      // Generate past 24h buckets, including current hour
      for (let i = 23; i >= 0; i--) {
        const t = new Date(now.getTime() - i * 3600 * 1000);
        const m = (t.getMonth() + 1).toString().padStart(2, '0');
        const d = t.getDate().toString().padStart(2, '0');
        const h = t.getHours().toString().padStart(2, '0');
        buckets.push(`${m}-${d} ${h}:00`);
      }

      const dataMap = new Map();
      rawTrendData.forEach((item) => {
        dataMap.set(item.time, item);
      });

      trendData = buckets.map((timeStr) => {
        const item = dataMap.get(timeStr) || {};
        return {
          time: timeStr,
          count: Number(item.count || 0),
          token_used: Number(item.token_used || 0),
        };
      });
    }

    return {
      type: 'bar',
      data: [{ id: 'trend', values: trendData }],
      xField: 'time',
      yField: 'count',
      padding: { top: 16, right: 20, bottom: 36, left: 48 },
      title: {
        visible: false,
      },
      axes: [
        {
          orient: 'bottom',
          type: 'band', // Keep band for discrete hourly buckets to ensure equal spacing
          label: { 
            visible: true,
            // Show label every 6 hours to avoid crowding
            formatMethod: (val, index) => {
              if (index % 6 === 0) return val.split(' ')[1]; 
              return '';
            }
          }, 
          grid: { visible: false },
        },
        {
          orient: 'left',
          type: 'linear',
          min: 0, // 强制 Y 轴从 0 开始
          grid: { visible: true, style: { lineDash: [4, 4], stroke: 'rgba(255, 255, 255, 0.08)' } },
        },
      ],
      bar: {
        style: {
          cornerRadius: [6, 6, 0, 0],
          fill: {
            gradient: 'linear',
            x0: 0,
            y0: 0,
            x1: 0,
            y1: 1,
            stops: [
              { offset: 0, color: '#3b82f6' },
              { offset: 1, color: 'rgba(59, 130, 246, 0.1)' }
            ]
          }
        },
        state: {
          hover: {
            fill: {
              gradient: 'linear',
              x0: 0,
              y0: 0,
              x1: 0,
              y1: 1,
              stops: [
                { offset: 0, color: '#60a5fa' },
                { offset: 1, color: 'rgba(96, 165, 250, 0.2)' }
              ]
            }
          }
        }
      },
      barWidth: 16, // 限制柱子最大宽度，使其看起来更精致
      tooltip: {
        mark: {
          content: [
            {
              key: (datum) => datum.time,
              value: (datum) => `${renderNumber(datum.count)} / ${formatCompactNumber(datum.token_used)} Tokens`,
            },
          ],
        },
      },
      crosshair: {
        xField: { visible: true, label: { visible: true } },
        yField: { visible: true, label: { visible: true } },
      },
    };
  }, [statusData, t, trendRange]);

  const rankingSpec = useMemo(() => {
    const rankingData =
      rankingRange === '24h'
        ? statusData?.ranking_24h || []
        : statusData?.ranking_7d || [];

    return {
      type: 'bar',
      data: [
        {
          id: 'ranking',
          values: rankingData.map((item) => ({
            model: item.model_name,
            count: item.count,
          })),
        },
      ],
      xField: 'model',
      yField: 'count',
      title: {
        visible: true,
        text: rankingRange === '24h' ? t('24 小时模型排行') : t('7 天模型排行'),
        subtext: t('按请求次数排序，仅展示前 10'),
      },
      axes: [
        { orient: 'bottom', type: 'band', label: { visible: true, style: { angle: -20 } } },
        { orient: 'left', type: 'linear' },
      ],
      bar: { style: { cornerRadius: [6, 6, 0, 0] } },
      color: ['#10b981'],
      tooltip: {
        mark: {
          content: [
            {
              key: (datum) => datum.model,
              value: (datum) => renderNumber(datum.count),
            },
          ],
        },
      },
    };
  }, [rankingRange, statusData, t]);

  if (loading) {
    return (
      <div className='w-full max-w-6xl mx-auto px-4 py-10'>
        <Skeleton placeholder={<Skeleton.Image style={{ width: '100%', height: 420 }} />} loading={true} active />
      </div>
    );
  }

  if (!statusData?.enabled) {
    return null;
  }

  const summary = statusData.summary_24h;
  const rankingList = rankingRange === '24h' ? statusData.ranking_24h : statusData.ranking_7d;

  return (
    <section className='w-full max-w-6xl mx-auto px-4 py-12'>
      <div className='flex flex-col gap-3 mb-8'>
        <Title heading={3} className='!mb-0'>
          {t('平台实时状态')}
        </Title>
        <Text type='secondary'>
          {t('基于公开聚合数据展示最近使用情况，接口已做服务端缓存，尽量减少首页额外开销。')}
        </Text>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6'>
        <Card className="relative overflow-hidden">
          <Text type='secondary'>{t('24 小时调用次数')}</Text>
          <div className='text-3xl font-semibold mt-2'>{renderNumber(summary.total_count)}</div>
          <svg className="absolute right-4 bottom-4 w-12 h-12 text-gray-500 opacity-10 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
        </Card>
        <Card className="relative overflow-hidden">
          <Text type='secondary'>{t('24 小时 Token')}</Text>
          <div className='text-3xl font-semibold mt-2'>{formatCompactNumber(summary.total_token_used)}</div>
          <svg className="absolute right-4 bottom-4 w-12 h-12 text-gray-500 opacity-10 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
        </Card>
        <Card className="relative overflow-hidden">
          <Text type='secondary'>{t('平均 RPM / TPM')}</Text>
          <div className='text-3xl font-semibold mt-2'>
            {summary.avg_rpm.toFixed(2)} / {formatCompactNumber(summary.avg_tpm)}
          </div>
          <svg className="absolute right-4 bottom-4 w-12 h-12 text-gray-500 opacity-10 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        </Card>
        <Card className="relative overflow-hidden">
          <Text type='secondary'>{t('活跃模型数')}</Text>
          <div className='text-3xl font-semibold mt-2'>{renderNumber(summary.active_models)}</div>
          <Text type='tertiary' className='block mt-2'>
            {t('最近更新时间')}：{formatUpdatedAt(statusData.updated_at)}
          </Text>
          <svg className="absolute right-4 bottom-4 w-12 h-12 text-gray-500 opacity-10 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
        </Card>
      </div>

      <div className='grid grid-cols-1 xl:grid-cols-5 gap-6'>
        <Card className='xl:col-span-3'>
          <div className='flex items-center justify-between mb-4'>
            <div>
              <Title heading={5} className='!mb-1'>
                {trendRange === '24h' ? t('24 小时请求趋势') : t('7 天请求趋势')}
              </Title>
              <Text type='tertiary'>
                {trendRange === '24h'
                  ? `${t('峰值小时请求')}：${renderNumber(statusData?.summary_24h?.peak_hour_count || 0)}`
                  : t('最近 7 天请求走势')}
              </Text>
            </div>
            <RadioGroup
              type='button'
              size='small'
              value={trendRange}
              onChange={(event) => setTrendRange(event.target.value)}
            >
              <Radio value='24h'>24H</Radio>
              <Radio value='7d'>7D</Radio>
            </RadioGroup>
          </div>
          <VChart spec={trendSpec} option={CHART_CONFIG} style={{ height: 380 }} />
        </Card>

        <Card className='xl:col-span-2'>
          <div className='flex items-center justify-between mb-4'>
            <div>
              <Title heading={5} className='!mb-1'>
                {t('模型排行')}
              </Title>
              <Text type='tertiary'>{t('最近热门模型分布')}</Text>
            </div>
            <RadioGroup
              type='button'
              size='small'
              value={rankingRange}
              onChange={(event) => setRankingRange(event.target.value)}
            >
              <Radio value='24h'>24H</Radio>
              <Radio value='7d'>7D</Radio>
            </RadioGroup>
          </div>

          {rankingList?.length ? (
            <>
              <VChart spec={rankingSpec} option={CHART_CONFIG} style={{ height: 260 }} />
              <div className='mt-4 space-y-3'>
                {rankingList.slice(0, 5).map((item, index) => (
                  <div
                    key={`${rankingRange}-${item.model_name}`}
                    className='flex items-center justify-between rounded-xl border border-semi-color-border px-3 py-2'
                  >
                    <div className='flex items-center gap-3 min-w-0'>
                      <div className='w-6 h-6 rounded-full bg-semi-color-fill-0 flex items-center justify-center text-xs font-medium'>
                        {index + 1}
                      </div>
                      <div className='truncate font-medium'>{item.model_name}</div>
                    </div>
                    <div className='text-right'>
                      <div className='font-medium'>{renderNumber(item.count)}</div>
                      <Text type='tertiary'>{formatCompactNumber(item.token_used)} Tokens</Text>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <Empty description={t('暂无公开统计数据')} />
          )}
        </Card>
      </div>
    </section>
  );
};

export default HomeStatusPanel;
