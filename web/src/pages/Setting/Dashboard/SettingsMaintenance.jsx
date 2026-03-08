import React, { useEffect, useState } from 'react';
import { Button, Form, Radio, RadioGroup, Typography } from '@douyinfe/semi-ui';
import { API, showError, showSuccess } from '../../../helpers';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;

const toDateValue = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toISOStringValue = (value) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
};

const SettingsMaintenance = ({ options, refresh }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [inputs, setInputs] = useState({
    MaintenanceModeEnabled: false,
    MaintenanceAdminBypassEnabled: true,
    MaintenancePageTitle: '',
    MaintenancePageContent: '',
    MaintenanceCountdownTarget: '',
    MaintenanceEstimatedCompletionTime: '',
    MaintenanceIframeURL: '',
    MaintenancePageMode: 'default',
  });

  useEffect(() => {
    setInputs({
      MaintenanceModeEnabled: options.MaintenanceModeEnabled === 'true',
      MaintenanceAdminBypassEnabled:
        options.MaintenanceAdminBypassEnabled !== 'false',
      MaintenancePageTitle: options.MaintenancePageTitle || '站点维护中',
      MaintenancePageContent:
        options.MaintenancePageContent || '站点正在维护中，请稍后再试。',
      MaintenanceCountdownTarget: options.MaintenanceCountdownTarget || '',
      MaintenanceEstimatedCompletionTime:
        options.MaintenanceEstimatedCompletionTime || '',
      MaintenanceIframeURL: options.MaintenanceIframeURL || '',
      MaintenancePageMode: options.MaintenancePageMode || 'default',
    });
  }, [options]);

  const updateOption = async (key, value) => {
    const res = await API.put('/api/option/', { key, value });
    const { success, message } = res.data;
    if (!success) {
      throw new Error(message);
    }
  };

  const submit = async () => {
    try {
      setLoading(true);
      await updateOption('MaintenanceModeEnabled', inputs.MaintenanceModeEnabled);
      await updateOption(
        'MaintenanceAdminBypassEnabled',
        inputs.MaintenanceAdminBypassEnabled,
      );
      await updateOption('MaintenancePageTitle', inputs.MaintenancePageTitle);
      await updateOption('MaintenancePageContent', inputs.MaintenancePageContent);
      await updateOption(
        'MaintenanceCountdownTarget',
        inputs.MaintenanceCountdownTarget,
      );
      await updateOption(
        'MaintenanceEstimatedCompletionTime',
        inputs.MaintenanceEstimatedCompletionTime,
      );
      await updateOption('MaintenanceIframeURL', inputs.MaintenanceIframeURL);
      await updateOption('MaintenancePageMode', inputs.MaintenancePageMode);
      showSuccess(t('维护模式已更新'));
      refresh?.();
    } catch (error) {
      showError(error.message || t('维护模式更新失败'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className='mb-4'>
        <Text strong>{t('全局维护模式')}</Text>
        <div className='mt-1'>
          <Text type='tertiary'>
            {t('开启后普通用户访问站点会看到维护页，API 会返回维护中状态。')}
          </Text>
        </div>
      </div>
      <Form layout='vertical'>
        <div className='mb-4'>
          <div className='semi-form-field-label mb-2'>
            <div className='semi-form-field-label-text'>{t('启用全局维护')}</div>
          </div>
          <div className='flex items-center gap-3'>
            <Button
              theme={inputs.MaintenanceModeEnabled ? 'solid' : 'light'}
              type={inputs.MaintenanceModeEnabled ? 'danger' : 'tertiary'}
              onClick={() =>
                setInputs((prev) => ({
                  ...prev,
                  MaintenanceModeEnabled: !prev.MaintenanceModeEnabled,
                }))
              }
            >
              {inputs.MaintenanceModeEnabled ? t('维护中') : t('已关闭')}
            </Button>
            <Text type='tertiary'>
              {inputs.MaintenanceModeEnabled
                ? t('站点当前处于维护模式')
                : t('站点当前正常开放')}
            </Text>
          </div>
        </div>

        <div className='mb-4'>
          <div className='semi-form-field-label mb-2'>
            <div className='semi-form-field-label-text'>{t('允许管理员绕过')}</div>
          </div>
          <div className='flex items-center gap-3'>
            <Button
              theme={inputs.MaintenanceAdminBypassEnabled ? 'solid' : 'light'}
              type={inputs.MaintenanceAdminBypassEnabled ? 'primary' : 'tertiary'}
              onClick={() =>
                setInputs((prev) => ({
                  ...prev,
                  MaintenanceAdminBypassEnabled:
                    !prev.MaintenanceAdminBypassEnabled,
                }))
              }
            >
              {inputs.MaintenanceAdminBypassEnabled ? t('已允许') : t('已关闭')}
            </Button>
            <Text type='tertiary'>
              {t('开启后管理员登录状态下仍可进入后台。')}
            </Text>
          </div>
        </div>

        <Form.Input
          field='MaintenancePageTitle'
          label={t('维护页标题')}
          value={inputs.MaintenancePageTitle}
          onChange={(value) =>
            setInputs((prev) => ({ ...prev, MaintenancePageTitle: value }))
          }
        />
        <Form.TextArea
          field='MaintenancePageContent'
          label={t('维护页说明')}
          rows={4}
          value={inputs.MaintenancePageContent}
          onChange={(value) =>
            setInputs((prev) => ({ ...prev, MaintenancePageContent: value }))
          }
        />
        <Form.DatePicker
          field='MaintenanceCountdownTarget'
          label={t('维护开始时间')}
          type='dateTime'
          inputReadOnly={true}
          placeholder={t('请选择维护开始时间')}
          value={toDateValue(inputs.MaintenanceCountdownTarget)}
          onChange={(value) =>
            setInputs((prev) => ({
              ...prev,
              MaintenanceCountdownTarget: toISOStringValue(value),
            }))
          }
        />
        <Form.DatePicker
          field='MaintenanceEstimatedCompletionTime'
          label={t('预计恢复时间')}
          type='dateTime'
          inputReadOnly={true}
          placeholder={t('请选择预计恢复时间')}
          value={toDateValue(inputs.MaintenanceEstimatedCompletionTime)}
          onChange={(value) =>
            setInputs((prev) => ({
              ...prev,
              MaintenanceEstimatedCompletionTime: toISOStringValue(value),
            }))
          }
        />
        <div className='mb-4'>
          <div className='semi-form-field-label mb-2'>
            <div className='semi-form-field-label-text'>{t('维护页展示模式')}</div>
          </div>
          <RadioGroup
            type='button'
            value={inputs.MaintenancePageMode}
            onChange={(event) =>
              setInputs((prev) => ({
                ...prev,
                MaintenancePageMode: event.target.value,
              }))
            }
          >
            <Radio value='default'>{t('默认模板')}</Radio>
            <Radio value='iframe'>{t('iframe 嵌入')}</Radio>
            <Radio value='redirect'>{t('外链跳转')}</Radio>
          </RadioGroup>
        </div>
        <Form.Input
          field='MaintenanceIframeURL'
          label={
            inputs.MaintenancePageMode === 'redirect'
              ? t('维护页跳转地址')
              : t('维护页 iframe 地址')
          }
          placeholder='https://example.com/maintenance.html'
          value={inputs.MaintenanceIframeURL}
          onChange={(value) =>
            setInputs((prev) => ({ ...prev, MaintenanceIframeURL: value }))
          }
        />
        <Text type='tertiary'>
          {inputs.MaintenancePageMode === 'redirect'
            ? t('选择外链跳转后，用户访问站点会直接跳到这个地址。')
            : inputs.MaintenancePageMode === 'iframe'
              ? t('选择 iframe 嵌入后，维护页会优先加载该地址，不再显示系统默认模板。')
              : t('默认模板模式下会使用系统内置维护页，性能最稳定。')}
        </Text>
        <Button type='primary' loading={loading} onClick={submit}>
          {t('保存维护模式设置')}
        </Button>
      </Form>
    </div>
  );
};

export default SettingsMaintenance;
