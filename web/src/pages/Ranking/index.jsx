import React, { useEffect, useState } from 'react';
import { Card, Layout, Table, Typography, Space, Tag, Avatar, Radio } from '@douyinfe/semi-ui';
import { IconCrown, IconSignal, IconActivity } from '@douyinfe/semi-icons';
import { useTranslation } from 'react-i18next';
import { API, showError } from '../../helpers';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const Ranking = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [rankingData, setRankingData] = useState([]);
  const [timeRange, setTimeRange] = useState('24h'); // '24h' or '7d'
  
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

  // 辅助函数：根据字符串生成颜色
  const stringToColor = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00ffffff).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
  };

  const renderQuota = (quota) => {
    return (quota / 500000).toFixed(2) + ' $'; // 假设 500000 quota = 1$ (根据实际情况调整)
  };

  return (
    <Layout>
      <Content style={{ padding: '24px' }}>
        <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Space align="center">
                    <IconActivity style={{ fontSize: 36, color: 'var(--semi-color-primary)' }} />
                    <div>
                        <Title heading={3} style={{ margin: 0 }}>{t('模型排行榜')}</Title>
                        <Text type="tertiary">{t('基于平台实时使用数据与外部权威评分')}</Text>
                    </div>
                </Space>
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
        </Card>
      </Content>
    </Layout>
  );
};

export default Ranking;
