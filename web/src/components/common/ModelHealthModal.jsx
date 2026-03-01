import React, { useMemo } from 'react';
import { Modal, Empty, Spin } from '@douyinfe/semi-ui';
import {
  IllustrationNoContent,
  IllustrationNoContentDark,
} from '@douyinfe/semi-illustrations';
import { useTranslation } from 'react-i18next';
import { useIsMobile } from '../../hooks/common/useIsMobile';

const STATUS_COLORS = {
  1: 'bg-emerald-500',
  0: 'bg-red-500',
  2: 'bg-amber-400',
};

const STATUS_LABELS = {
  1: 'success',
  0: 'fail',
  2: 'highLatency',
};

const HealthBlock = ({ value }) => {
  const { t } = useTranslation();
  const color = STATUS_COLORS[value] ?? 'bg-zinc-600';
  const label = STATUS_LABELS[value] ?? t('无数据');
  return (
    <div
      className={`w-2.5 h-2.5 rounded-sm ${color} transition-colors`}
      title={label}
    />
  );
};

const ChannelRow = ({ channel }) => {
  const history = channel.history ?? [];
  const padded = [...Array(15)].map((_, i) => history[i] ?? null);

  const availability = useMemo(() => {
    const valid = history.filter((v) => v === 0 || v === 1);
    if (valid.length === 0) return null;
    const ok = valid.filter((v) => v === 1).length;
    return Math.round((ok / valid.length) * 100);
  }, [history]);

  const availColor =
    availability === null
      ? 'text-zinc-500'
      : availability >= 90
        ? 'text-emerald-400'
        : availability >= 60
          ? 'text-amber-400'
          : 'text-red-400';

  return (
    <div className='flex flex-col gap-1.5 px-4 py-3 rounded-lg bg-zinc-800/60 hover:bg-zinc-700/60 transition-colors'>
      <div className='flex items-center justify-between'>
        <span className='text-sm text-zinc-200 font-medium truncate max-w-[60%]'>
          {channel.name}
        </span>
        <span className={`text-xs font-mono ${availColor}`}>
          {availability !== null ? `${availability}%` : '-'}
        </span>
      </div>
      <div className='flex items-center gap-0.5'>
        {padded.map((val, i) => (
          <HealthBlock key={i} value={val} />
        ))}
      </div>
    </div>
  );
};

const ModelHealthModal = ({ visible, onClose, data, loading }) => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  const channels = data?.channels ?? [];

  return (
    <Modal
      title={
        <span className='text-zinc-100'>{t('渠道健康状态')}</span>
      }
      visible={visible}
      onCancel={onClose}
      footer={null}
      size={isMobile ? 'full-width' : 'medium'}
      bodyStyle={{
        background: '#18181b',
        padding: '12px',
        maxHeight: '70vh',
        overflowY: 'auto',
      }}
      headerStyle={{
        background: '#18181b',
        borderBottom: '1px solid #27272a',
      }}
      style={{ background: '#18181b' }}
      maskStyle={{ background: 'rgba(0,0,0,0.6)' }}
    >
      {loading ? (
        <div className='flex items-center justify-center py-16'>
          <Spin size='large' />
        </div>
      ) : channels.length === 0 ? (
        <div className='py-12'>
          <Empty
            image={
              <IllustrationNoContent style={{ width: 150, height: 150 }} />
            }
            darkModeImage={
              <IllustrationNoContentDark
                style={{ width: 150, height: 150 }}
              />
            }
            description={
              <span className='text-zinc-400'>{t('暂无健康数据')}</span>
            }
          />
        </div>
      ) : (
        <>
          <div className='flex items-center gap-4 px-4 pb-3 text-[11px] text-zinc-500'>
            <span className='flex items-center gap-1'>
              <span className='inline-block w-2 h-2 rounded-sm bg-emerald-500' />
              {t('成功')}
            </span>
            <span className='flex items-center gap-1'>
              <span className='inline-block w-2 h-2 rounded-sm bg-red-500' />
              {t('失败')}
            </span>
            <span className='flex items-center gap-1'>
              <span className='inline-block w-2 h-2 rounded-sm bg-amber-400' />
              {t('高延迟')}
            </span>
            <span className='flex items-center gap-1'>
              <span className='inline-block w-2 h-2 rounded-sm bg-zinc-600' />
              {t('无数据')}
            </span>
          </div>
          <div className='flex flex-col gap-2'>
            {channels.map((ch, idx) => (
              <ChannelRow key={ch.id || idx} channel={ch} />
            ))}
          </div>
        </>
      )}
    </Modal>
  );
};

export default ModelHealthModal;
