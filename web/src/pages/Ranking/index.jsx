import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Card, Layout, Table, Typography, Space, Tag, Avatar, Radio, Tabs, TabPane, Button, Input } from '@douyinfe/semi-ui';
import { IconCrown, IconSignal, IconActivity, IconGlobe, IconArrowRight, IconSearch } from '@douyinfe/semi-icons';
import { useTranslation } from 'react-i18next';
import { API, showError } from '../../helpers';
import { VChart } from '@visactor/react-vchart';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const Ranking = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('global');

  return (
    <Layout>
      <Content style={{ padding: '24px', marginTop: '100px' }}>
        <Card>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
                <IconActivity style={{ fontSize: 36, color: 'var(--semi-color-primary)', marginRight: 16 }} />
                <div>
                    <Title heading={3} style={{ margin: 0 }}>{t('模型排行榜')}</Title>
                    <Text type="tertiary">{t('基于平台实时使用数据与外部权威评分')}</Text>
                </div>
            </div>

            <Tabs type="line" activeKey={activeTab} onChange={setActiveTab}>
                <TabPane tab={<span><IconGlobe /> {t('全球能力榜 (OpenLM)')}</span>} itemKey="global">
                    <GlobalLeaderboard />
                </TabPane>
                <TabPane tab={<span><IconActivity /> {t('平台热度榜')}</span>} itemKey="platform">
                    <PlatformRanking />
                </TabPane>
            </Tabs>
        </Card>
      </Content>
    </Layout>
  );
};

const PlatformRanking = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [rankingData, setRankingData] = useState([]);
  const [timeRange, setTimeRange] = useState('24h');

  // 模拟的外部评分数据 (后续可替换为后端 API 获取)
  const mockExternalScores = {
    'gpt-4': 1287,
    'gpt-4-turbo': 1255,
    'claude-3-opus-20240229': 1248,
    'gpt-4-1106-preview': 1245,
    'gemini-1.5-pro-latest': 1230,
    'claude-3-sonnet-20240229': 1200,
    'gpt-3.5-turbo-0125': 1100,
  };

  const fetchRankingData = async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/status');
      const { success, data } = res.data;
      if (success) {
        let models = [];
        if (timeRange === '24h') {
          models = data.ranking_24h || [];
        } else {
          models = data.ranking_7d || [];
        }
        
        // 处理数据，添加模拟的外部评分
        const processedData = models.map((item, index) => {
            // 简单的模糊匹配逻辑，实际生产中需要更精准的映射表
            let score = '-';
            const modelNameLower = item.model_name.toLowerCase();
            for (const [key, value] of Object.entries(mockExternalScores)) {
                if (modelNameLower.includes(key)) {
                    score = value;
                    break;
                }
            }
            
            return {
                ...item,
                rank: index + 1,
                external_score: score
            };
        });

        setRankingData(processedData);
      }
    } catch (error) {
      showError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRankingData();
  }, [timeRange]);

  const columns = [
    {
      title: t('排名'),
      dataIndex: 'rank',
      key: 'rank',
      width: 80,
      render: (text, record) => {
        let icon = null;
        if (record.rank === 1) icon = <IconCrown style={{ color: '#FFD700', fontSize: 24 }} />;
        else if (record.rank === 2) icon = <IconCrown style={{ color: '#C0C0C0', fontSize: 24 }} />;
        else if (record.rank === 3) icon = <IconCrown style={{ color: '#CD7F32', fontSize: 24 }} />;
        else icon = <span style={{ fontSize: 18, fontWeight: 'bold', marginLeft: 8 }}>{record.rank}</span>;
        
        return <div style={{ display: 'flex', alignItems: 'center' }}>{icon}</div>;
      }
    },
    {
      title: t('模型名称'),
      dataIndex: 'model_name',
      key: 'model_name',
      render: (text) => (
        <Space>
          <Avatar size="small" color={stringToColor(text)}>{text[0].toUpperCase()}</Avatar>
          <Text strong>{text}</Text>
        </Space>
      )
    },
    {
      title: t('调用热度 (次)'),
      dataIndex: 'count',
      key: 'count',
      render: (text) => (
        <Space>
           <IconSignal style={{ color: '#ff4d4f' }} />
           <Text>{text}</Text>
        </Space>
      )
    },
    {
      title: t('Token 消耗'),
      dataIndex: 'quota',
      key: 'quota',
      render: (text) => <Tag color="blue">{renderQuota(text)}</Tag>
    },
    {
        title: t('质量评分 (LMSYS参考)'),
        dataIndex: 'external_score',
        key: 'external_score',
        render: (text) => text === '-' ? <Text type="tertiary">-</Text> : <Tag color="green" type="solid">{text}</Tag>
    }
  ];

  const stringToColor = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00ffffff).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
  };

  const renderQuota = (quota) => {
    return (quota / 500000).toFixed(2) + ' $'; 
  };

  return (
    <>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 20 }}>
            <Radio.Group 
                type='button'
                value={timeRange} 
                onChange={(e) => setTimeRange(e.target.value)}
                options={[
                    { label: t('24小时'), value: '24h' },
                    { label: t('7天'), value: '7d' }
                ]}
            />
        </div>

        <Table 
            columns={columns} 
            dataSource={rankingData} 
            loading={loading} 
            pagination={false}
            rowKey="model_name"
            empty={t('暂无数据')}
        />
    </>
  );
};

const parseScore = (scoreStr) => {
    if (!scoreStr || scoreStr === '-') return 0;
    const score = parseFloat(scoreStr.replace(/[^0-9.]/g, ''));
    return isNaN(score) ? 0 : score;
};

const ChartCard = React.memo(({ title, metricKey, data }) => {
    const chartRef = useRef(null);
    const [chartSize, setChartSize] = useState({ width: 0, height: 0 });
    
    const topModels = useMemo(() => {
        if (!data || data.length === 0) return [];
        return [...data]
            .filter(item => item[metricKey] && item[metricKey] !== '-')
            .sort((a, b) => parseScore(b[metricKey]) - parseScore(a[metricKey]))
            .slice(0, 8)
            .map((item, index) => ({
                model: item.model,
                score: parseScore(item[metricKey]),
                organization: item.organization,
                showLabel: index % 2 === 0
            }));
    }, [data, metricKey]);

    const isDarkMode = document.body.getAttribute('theme-mode') === 'dark';
    const axisColor = isDarkMode ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)';
    const tickColor = isDarkMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)';

    useEffect(() => {
        const updateSize = () => {
            if (chartRef.current) {
                const rect = chartRef.current.getBoundingClientRect();
                setChartSize({ width: rect.width, height: rect.height });
            }
        };
        updateSize();
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, []);

    const spec = useMemo(() => {
        if (topModels.length === 0) return null;

        const scores = topModels.map(m => m.score).filter(s => typeof s === 'number' && !isNaN(s));
        const maxScore = Math.max(...scores);
        const minScore = Math.min(...scores);
        
        const safeMax = Math.ceil(maxScore * 1.05);
        const safeMin = Math.max(0, Math.floor(minScore * 0.9));

        return {
            type: 'bar',
            data: [
                {
                    id: `barData_${metricKey}`,
                    values: topModels
                }
            ],
            xField: 'model',
            yField: 'score',
            seriesField: 'organization',
            color: ['#1e5eff', '#00ce7d', '#ff9a2e', '#ff4d4f', '#9c27b0', '#fadb14'],
            barMaxWidth: 40,
            animation: false,
            animationAppear: false,
            axes: [
                {
                    orient: 'left',
                    type: 'linear',
                    label: {
                        style: { fill: tickColor }
                    },
                    domainLine: {
                        style: { stroke: axisColor }
                    },
                    zero: false,
                    min: safeMin,
                    max: safeMax
                },
                {
                    orient: 'bottom',
                    type: 'band',
                    sampling: false,
                    label: {
                        autoRotate: false,
                        autoHide: false,
                        style: {
                            fill: tickColor,
                            fontSize: 10,
                            angle: 0
                        },
                        formatMethod: (text) => {
                            const item = topModels.find(x => x.model === text);
                            if (!item) return text;
                            if (item.showLabel) {
                                return [item.model, item.organization];
                            }
                            return '';
                        }
                    },
                    domainLine: {
                        style: { stroke: axisColor }
                    }
                }
            ],
            legends: {
                visible: true,
                position: 'bottom',
                orient: 'bottom',
                item: {
                    label: {
                        style: {
                            fill: tickColor
                        }
                    }
                }
            },
            tooltip: {
                visible: true,
                mark: {
                    content: [
                        {
                            key: '模型',
                            value: (datum) => datum.model
                        },
                        {
                            key: '分数',
                            value: (datum) => Math.round(datum.score)
                        },
                        {
                            key: '厂商',
                            value: (datum) => datum.organization
                        }
                    ]
                }
            },
            label: {
                visible: false
            },
            background: 'transparent'
        };
    }, [topModels, metricKey, isDarkMode, axisColor, tickColor]);

    const labelPositions = useMemo(() => {
        if (!chartSize.width || topModels.length === 0) return [];
        
        const scores = topModels.map(m => m.score);
        const maxScore = Math.max(...scores);
        const minScore = Math.min(...scores);
        const safeMax = Math.ceil(maxScore * 1.05);
        const safeMin = Math.max(0, Math.floor(minScore * 0.9));
        const range = safeMax - safeMin;
        
        const chartArea = {
            left: 50,
            right: 20,
            top: 20,
            bottom: 80
        };
        
        const plotWidth = chartSize.width - chartArea.left - chartArea.right;
        const plotHeight = chartSize.height - chartArea.top - chartArea.bottom;
        
        const barWidth = plotWidth / topModels.length;
        
        return topModels.map((model, index) => {
            const x = chartArea.left + barWidth * index + barWidth / 2;
            const normalizedScore = (model.score - safeMin) / range;
            const barHeight = normalizedScore * plotHeight;
            const barTopY = chartArea.top + plotHeight - barHeight;
            const y = barTopY - 5;
            
            return {
                x,
                y,
                score: Math.round(model.score)
            };
        });
    }, [topModels, chartSize]);

    if (topModels.length === 0) return <Card title={title} loading={true}></Card>;

    return (
        <Card 
            title={title} 
            headerStyle={{ borderBottom: '1px solid var(--semi-color-border)' }}
            bodyStyle={{ padding: '16px' }}
            style={{ height: '100%', background: isDarkMode ? 'var(--semi-color-bg-1)' : '#fff' }}
        >
            <div ref={chartRef} style={{ height: 400, position: 'relative' }}>
                {spec && <VChart spec={spec} />}
                {labelPositions.map((pos, index) => (
                    <div
                        key={index}
                        style={{
                            position: 'absolute',
                            left: pos.x,
                            top: pos.y,
                            transform: 'translate(-50%, 0)',
                            color: '#FFFFFF',
                            fontSize: 11,
                            fontWeight: 'bold',
                            textShadow: '0 0 3px rgba(0,0,0,0.8), 0 0 5px rgba(0,0,0,0.5)',
                            pointerEvents: 'none',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        {pos.score}
                    </div>
                ))}
            </div>
        </Card>
    );
}, (prevProps, nextProps) => {
    return prevProps.title === nextProps.title && 
           prevProps.metricKey === nextProps.metricKey &&
           JSON.stringify(prevProps.data) === JSON.stringify(nextProps.data);
});

const GlobalLeaderboard = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState([]);
    const [updatedAt, setUpdatedAt] = useState('');
    const [viewMode, setViewMode] = useState('dashboard'); // 'dashboard' or 'table'
    const [availableModels, setAvailableModels] = useState(new Set());
    const [searchText, setSearchText] = useState('');

    // Load available models from site configuration
    useEffect(() => {
        const fetchAvailableModels = async () => {
            try {
                // Get all models available in the system using the public endpoint
                const res = await API.get('/api/models/public');
                if (res.data.success) {
                    const models = res.data.data || [];
                    console.log('Available models loaded:', models.length);
                    if (models.length > 0) {
                        console.log('First 5 models:', models.slice(0, 5));
                    }
                    
                    // Extract model IDs (names) and normalize
                    // Note: models from PublicListModels are strings (IDs), not objects
                    const modelSet = new Set(models.map(m => (typeof m === 'string' ? m : m.id).toLowerCase()));
                    setAvailableModels(modelSet);
                }
            } catch (error) {
                console.error("Failed to load available models", error);
            }
        };
        fetchAvailableModels();
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const res = await API.get('/api/leaderboard');
                const { success, data, updated_at } = res.data;
                if (success) {
                    console.log('Leaderboard data loaded:', data.length, 'entries');
                    
                    // Filter data to only include models available on this site
                    // We use partial matching because leaderboard names might be slightly different
                    // e.g. "gpt-4-turbo" vs "GPT-4 Turbo"
                    const filteredData = data.filter(item => {
                        // If availableModels is empty (loaded but empty), show NOTHING or ALL?
                        // User asked to hide models not on site. So if site has 0 models, show 0.
                        if (availableModels.size === 0) {
                            console.log('No available models found on site, filtering all out');
                            return false; 
                        }
                        
                        const leaderboardName = item.model.toLowerCase();
                        // Check if any available model ID is contained in the leaderboard name or vice versa
                        // This is a fuzzy match strategy
                        for (let availModel of availableModels) {
                            // Try both directions of inclusion and handle common variations
                            if (leaderboardName === availModel || // Exact match
                                leaderboardName.includes(availModel) || // leaderboard contains site model
                                availModel.includes(leaderboardName) || // site model contains leaderboard name
                                leaderboardName.replace(/-/g, ' ').includes(availModel.replace(/-/g, ' ')) || // ignore dashes
                                availModel.replace(/-/g, ' ').includes(leaderboardName.replace(/-/g, ' ')) ||
                                // Specific logic for your case: "Seed2.0 Pro" vs "Seed-2.0-Pro"
                                leaderboardName.replace(/[^a-z0-9]/g, '') === availModel.replace(/[^a-z0-9]/g, '') // ignore all special chars
                            ) {
                                return true;
                            }
                        }
                        return false;
                    });
                    
                    console.log('Filtered data:', filteredData.length, 'entries');
                    setData(filteredData);
                    setUpdatedAt(updated_at);
                }
            } catch (error) {
                showError(error);
            } finally {
                setLoading(false);
            }
        };
        
        // Wait for available models to load before fetching leaderboard
        // or just fetch both in parallel and filter later. 
        // For simplicity, we trigger this effect when availableModels changes too, 
        // but we need to avoid double fetching.
        if (availableModels.size > 0 || loading) {
             fetchData();
        }
    }, [availableModels]);

    if (viewMode === 'dashboard') {
        return (
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <Text type="tertiary">{t('数据来源: OpenLM.ai | 上次更新')}: {updatedAt ? new Date(updatedAt).toLocaleString() : '-'}</Text>
                    <Button onClick={() => setViewMode('table')} icon={<IconArrowRight />} theme='solid' type='primary'>
                        {t('查看完整榜单')}
                    </Button>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
                    <ChartCard title={t('综合能力 (Arena Elo)')} metricKey="arena_elo" data={data} />
                    <ChartCard title={t('代码能力 (Coding)')} metricKey="coding" data={data} />
                    <ChartCard title={t('视觉能力 (Vision)')} metricKey="vision" data={data} />
                    <ChartCard title={t('逻辑推理 (MMLU-Pro)')} metricKey="mmlu_pro" data={data} />
                </div>
            </div>
        );
    }

    // Table View
    const filteredTableData = searchText 
        ? data.filter(item => item.model.toLowerCase().includes(searchText.toLowerCase()))
        : data;

    const columns = [
        { 
            title: t('排名'), 
            dataIndex: 'rank', 
            key: 'rank', 
            width: 80,
            render: (text) => {
                let icon = null;
                if (text && text.includes("🏆")) icon = <IconCrown style={{ color: '#FFD700', fontSize: 24 }} />;
                else if (text && text.includes("🥇")) icon = <IconCrown style={{ color: '#C0C0C0', fontSize: 24 }} />;
                else if (text && text.includes("🥈")) icon = <IconCrown style={{ color: '#CD7F32', fontSize: 24 }} />;
                else if (text && text.includes("🥉")) icon = <IconCrown style={{ color: '#A52A2A', fontSize: 24 }} />;
                else icon = <span style={{ fontSize: 18, marginLeft: 8 }}>{text}</span>;
                return <div style={{ display: 'flex', alignItems: 'center' }}>{icon}</div>;
            }
        },
        { 
            title: t('模型'), 
            dataIndex: 'model', 
            key: 'model', 
            width: 250, 
            render: text => <Text strong>{text}</Text> 
        },
        { 
            title: t('综合能力 (Arena Elo)'), 
            dataIndex: 'arena_elo', 
            key: 'arena_elo',
            render: text => <Tag color="blue" type='solid'>{text}</Tag>,
            sorter: (a, b) => parseScore(a.arena_elo) - parseScore(b.arena_elo)
        },
        { title: t('代码能力 (Coding)'), dataIndex: 'coding', key: 'coding', sorter: (a, b) => parseScore(a.coding) - parseScore(b.coding) },
        { title: t('视觉能力 (Vision)'), dataIndex: 'vision', key: 'vision', sorter: (a, b) => parseScore(a.vision) - parseScore(b.vision) },
        { title: t('逻辑推理 (MMLU-Pro)'), dataIndex: 'mmlu_pro', key: 'mmlu_pro', sorter: (a, b) => parseScore(a.mmlu_pro) - parseScore(b.mmlu_pro) },
        { title: t('机构'), dataIndex: 'organization', key: 'organization' },
        { title: t('许可'), dataIndex: 'license', key: 'license' },
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Space>
                    <Button onClick={() => setViewMode('dashboard')} icon={<IconActivity />} theme='light'>
                        {t('返回仪表盘')}
                    </Button>
                    <Input 
                        prefix={<IconSearch />} 
                        placeholder={t('搜索模型名称...')} 
                        value={searchText}
                        onChange={v => setSearchText(v)}
                        showClear
                        style={{ width: 250 }}
                    />
                </Space>
                <Text type="tertiary">{t('数据来源: OpenLM.ai | 上次更新')}: {updatedAt ? new Date(updatedAt).toLocaleString() : '-'}</Text>
            </div>
            <Table 
                columns={columns} 
                dataSource={filteredTableData} 
                loading={loading} 
                pagination={{ pageSize: 20 }}
                rowKey="model"
                size="small"
                empty={t('暂无数据')}
            />
        </div>
    );
}

export default Ranking;
