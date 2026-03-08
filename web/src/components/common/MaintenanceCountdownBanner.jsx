import React, { useEffect, useMemo, useState } from 'react';
import { Typography } from '@douyinfe/semi-ui';
import { Clock3 } from 'lucide-react';

const getRemainingText = (targetTime, t) => {
  const diff = targetTime.getTime() - Date.now();
  if (diff <= 0) {
    return t('维护即将开始');
  }
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) {
    return `${days}${t('天')} ${hours}${t('小时')} ${minutes}${t('分钟')}`;
  }
  if (hours > 0) {
    return `${hours}${t('小时')} ${minutes}${t('分钟')} ${seconds}${t('秒')}`;
  }
  return `${minutes}${t('分钟')} ${seconds}${t('秒')}`;
};

const MaintenanceCountdownBanner = ({
  announcement,
  t,
  compact = false,
  navMode = false,
}) => {
  const [, setTick] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTick(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const targetTime = useMemo(() => {
    if (!announcement?.countdownTarget) {
      return null;
    }
    const parsed = new Date(announcement.countdownTarget);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }, [announcement?.countdownTarget]);

  if (!announcement?.maintenanceEnabled || !targetTime) {
    return null;
  }

  const remainingText = getRemainingText(targetTime, t);
  const title = announcement.countdownTitle || t('系统维护倒计时');
  const targetText = `${t('维护时间')}：${targetTime.toLocaleString()}`;
  const estimatedEndText = announcement.estimatedCompletionTime
    ? `${t('预计完成时间')}：${new Date(announcement.estimatedCompletionTime).toLocaleString()}`
    : '';

  if (navMode) {
    return (
      <div className='flex justify-center'>
        <button
          type='button'
          className='flex w-[24rem] max-w-[24rem] items-center justify-between gap-3 rounded-xl border border-red-300 bg-gradient-to-r from-red-700 via-red-600 to-rose-600 px-4 py-2 text-left text-white shadow-lg'
        >
          <div className='flex min-w-0 items-center gap-2 overflow-hidden'>
            <Clock3 size={16} className='shrink-0' />
            <div className='min-w-0 overflow-hidden'>
              <div className='truncate text-sm font-bold'>{title}</div>
              <div className='truncate text-xs text-red-100'>{remainingText}</div>
            </div>
          </div>
          <div className='ml-2 min-w-0 flex-1 overflow-hidden text-right text-xs text-red-100'>
            <div className='truncate'>{estimatedEndText || targetText}</div>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-2 rounded-xl border border-red-400 bg-gradient-to-r from-red-600 via-red-500 to-rose-500 text-white shadow-sm ${compact ? 'mb-3 px-3 py-2' : 'px-3 py-2'} max-w-full overflow-hidden`}
    >
      <div className='shrink-0 text-red-100'>
        <Clock3 size={compact ? 16 : 18} />
      </div>
      <div className='flex min-w-0 flex-1 flex-col gap-1 overflow-hidden'>
        <div className='flex items-center gap-2 flex-wrap'>
          <Typography.Text strong style={{ color: 'white', margin: 0 }}>
            {title}
          </Typography.Text>
          <span className='rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold text-white'>
            {remainingText}
          </span>
        </div>
        <Typography.Text size='small' style={{ color: 'rgba(255,255,255,0.8)', margin: 0 }}>
          {targetText}
        </Typography.Text>
        {estimatedEndText && (
          <Typography.Text size='small' style={{ color: 'rgba(255,255,255,0.8)', margin: 0 }}>
            {estimatedEndText}
          </Typography.Text>
        )}
      </div>
    </div>
  );
};

export const getActiveMaintenanceAnnouncement = (announcements = []) => {
  const now = Date.now();
  return [...announcements]
    .filter((item) => item?.maintenanceEnabled && item?.countdownTarget)
    .map((item) => ({
      ...item,
      countdownTime: new Date(item.countdownTarget).getTime(),
    }))
    .filter((item) => !Number.isNaN(item.countdownTime) && item.countdownTime >= now)
    .sort((a, b) => a.countdownTime - b.countdownTime)[0];
};

export default MaintenanceCountdownBanner;
