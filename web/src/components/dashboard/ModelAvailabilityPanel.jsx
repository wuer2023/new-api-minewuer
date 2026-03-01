import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Button, Spin, Empty } from '@douyinfe/semi-ui';
import { HeartPulse, RefreshCw } from 'lucide-react';
import {
  IllustrationConstruction,
  IllustrationConstructionDark,
} from '@douyinfe/semi-illustrations';
import ScrollableContainer from '../common/ui/ScrollableContainer';
import { useTranslation } from 'react-i18next';

const STATUS_COLORS = {
  1: '#10b981',
  0: '#ef4444',
  2: '#f59e0b',
};

const STATUS_LABELS_KEYS = {
  1: '成功',
  0: '失败',
  2: '高延迟',
};

const HealthBlock = ({ value, t }) => {
  const color = STATUS_COLORS[value] ?? '#71717a';
  const label = STATUS_LABELS_KEYS[value] ? t(STATUS_LABELS_KEYS[value]) : t('无数据');
  return (
    <div
      style={{
        width: 10,
        height: 10,
        borderRadius: 2,
        backgroundColor: color,
        transition: 'background-color 0.2s',
      }}
      title={label}
    />
  );
};

const ModelRow = ({ model, t }) => {
  const history = model.history ?? [];
  const padded = [...Array(15)].map((_, i) => history[i] ?? null);

  const availability = useMemo(() => {
    const valid = history.filter((v) => v === 0 || v === 1);
    if (valid.length === 0) return null;
    const ok = valid.filter((v) => v === 1).length;
    return Math.round((ok / valid.length) * 100);
  }, [history]);

  const availColor =
    availability === null
      ? 'var(--semi-color-text-3)'
      : availability >= 90
        ? '#10b981'
        : availability >= 60
          ? '#f59e0b'
          : '#ef4444';

  return (
    <div
      className='flex flex-col gap-1.5 p-3 rounded-lg hover:bg-semi-color-fill-0'
      style={{ transition: 'background-color 0.2s' }}
    >
      <div className='flex items-center justify-between'>
        <span
          className='text-sm font-medium truncate'
          style={{ color: 'var(--semi-color-text-0)', maxWidth: '60%' }}
        >
          {model.name}
        </span>
        <span className='text-xs font-mono' style={{ color: availColor }}>
          {availability !== null ? `${availability}%` : '-'}
        </span>
      </div>
      <div className='flex items-center gap-0.5'>
        {padded.map((val, i) => (
          <HealthBlock key={i} value={val} t={t} />
        ))}
      </div>
    </div>
  );
};

const ModelAvailabilityPanel = ({ CARD_PROPS, ILLUSTRATION_SIZE }) => {
  const { t } = useTranslation();
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchHealthData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/model_health.json');
      if (res.ok) {
        const json = await res.json();
        setHealthData(json);
      } else {
        setHealthData(null);
      }
    } catch {
      setHealthData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealthData();
  }, [fetchHealthData]);

  const models = healthData?.models ?? [];

  return (
    <Card
      {...CARD_PROPS}
      className='shadow-sm !rounded-2xl'
      title={
        <div className='flex items-center justify-between w-full gap-2'>
          <div className='flex items-center gap-2'>
            <HeartPulse size={16} />
            {t('模型可用性')}
          </div>
          <Button
            icon={<RefreshCw size={14} />}
            onClick={fetchHealthData}
            loading={loading}
            size='small'
            theme='borderless'
            type='tertiary'
            className='text-gray-500 hover:text-blue-500 hover:bg-blue-50 !rounded-full'
          />
        </div>
      }
      bodyStyle={{ padding: 0 }}
    >
      <Spin spinning={loading}>
        {models.length > 0 ? (
          <>
            <div className='flex items-center gap-4 px-4 pt-2 pb-1 text-xs' style={{ color: 'var(--semi-color-text-3)' }}>
              <span className='flex items-center gap-1'>
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, backgroundColor: '#10b981' }} />
                {t('成功')}
              </span>
              <span className='flex items-center gap-1'>
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, backgroundColor: '#ef4444' }} />
                {t('失败')}
              </span>
              <span className='flex items-center gap-1'>
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, backgroundColor: '#f59e0b' }} />
                {t('高延迟')}
              </span>
              <span className='flex items-center gap-1'>
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, backgroundColor: '#71717a' }} />
                {t('无数据')}
              </span>
            </div>
            <ScrollableContainer maxHeight='24rem'>
              <div className='flex flex-col gap-1 px-2 pb-2'>
                {models.map((m, idx) => (
                  <ModelRow key={m.name || idx} model={m} t={t} />
                ))}
              </div>
            </ScrollableContainer>
          </>
        ) : (
          <div className='flex justify-center items-center py-8'>
            <Empty
              image={<IllustrationConstruction style={ILLUSTRATION_SIZE} />}
              darkModeImage={
                <IllustrationConstructionDark style={ILLUSTRATION_SIZE} />
              }
              title={t('暂无健康数据')}
              description={t('请确认 model_health.json 是否可用')}
            />
          </div>
        )}
      </Spin>
    </Card>
  );
};

export default ModelAvailabilityPanel;
