/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Table,
  Spin,
  Button,
  Typography,
  Empty,
  Input,
  Space,
} from '@douyinfe/semi-ui';
import {
  IllustrationNoResult,
  IllustrationNoResultDark,
} from '@douyinfe/semi-illustrations';
import { IconSearch } from '@douyinfe/semi-icons';
import { API, showError, showInfo, showSuccess, getLobeHubIcon } from '../../../../helpers';
import { MODEL_TABLE_PAGE_SIZE } from '../../../../constants';
import { useIsMobile } from '../../../../hooks/common/useIsMobile';

const MissingModelsModal = ({ visible, onClose, onConfigureModel, t }) => {
  const [loading, setLoading] = useState(false);
  const [missingModels, setMissingModels] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [batchVisible, setBatchVisible] = useState(false);
  const [batchSubmitting, setBatchSubmitting] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [batchVendorId, setBatchVendorId] = useState(undefined);
  const [vendorSearchKeyword, setVendorSearchKeyword] = useState('');
  const isMobile = useIsMobile();

  const fetchMissing = async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/models/missing');
      if (res.data.success) {
        const models = res.data.data || [];
        setMissingModels(models);
        setSelectedRowKeys((prev) =>
          prev.filter((key) => models.includes(key)),
        );
      } else {
        showError(res.data.message);
      }
    } catch (_) {
      showError(t('获取未配置模型失败'));
    }
    setLoading(false);
  };

  const fetchVendors = async () => {
    try {
      const res = await API.get('/api/vendors/?page_size=1000');
      if (res.data.success) {
        const items = res.data.data.items || res.data.data || [];
        setVendors(Array.isArray(items) ? items : []);
      }
    } catch (_) {}
  };

  useEffect(() => {
    if (visible) {
      fetchMissing();
      fetchVendors();
      setSearchKeyword('');
      setCurrentPage(1);
      setSelectedRowKeys([]);
      setBatchVisible(false);
      setBatchVendorId(undefined);
      setVendorSearchKeyword('');
    } else {
      setMissingModels([]);
      setSelectedRowKeys([]);
      setBatchVisible(false);
      setBatchVendorId(undefined);
      setVendorSearchKeyword('');
    }
  }, [visible]);

  const filteredModels = useMemo(
    () =>
      missingModels.filter((model) =>
        model.toLowerCase().includes(searchKeyword.toLowerCase()),
      ),
    [missingModels, searchKeyword],
  );

  const filteredVendors = useMemo(
    () =>
      vendors.filter((v) =>
        v.name.toLowerCase().includes(vendorSearchKeyword.toLowerCase()),
      ),
    [vendors, vendorSearchKeyword],
  );

  const dataSource = useMemo(() => {
    const start = (currentPage - 1) * MODEL_TABLE_PAGE_SIZE;
    const end = start + MODEL_TABLE_PAGE_SIZE;
    return filteredModels.slice(start, end).map((model) => ({
      model,
      key: model,
    }));
  }, [filteredModels, currentPage]);

  const selectedSet = useMemo(
    () => new Set(selectedRowKeys),
    [selectedRowKeys],
  );
  const isFilteredAllSelected =
    filteredModels.length > 0 &&
    filteredModels.every((model) => selectedSet.has(model));

  const handleSelectFiltered = () => {
    if (filteredModels.length === 0) return;
    if (isFilteredAllSelected) {
      const filteredSet = new Set(filteredModels);
      setSelectedRowKeys((prev) => prev.filter((key) => !filteredSet.has(key)));
      return;
    }
    setSelectedRowKeys((prev) =>
      Array.from(new Set([...prev, ...filteredModels])),
    );
  };

  const handleBatchConfigure = async () => {
    if (selectedRowKeys.length === 0) {
      showInfo(t('请先选择模型'));
      return;
    }
    if (!batchVendorId) {
      showError(t('请选择供应商'));
      return;
    }

    setBatchSubmitting(true);
    try {
      const queue = selectedRowKeys.map((name) =>
        API.post(
          '/api/models/',
          {
            model_name: name,
            description: '',
            icon: '',
            tags: '',
            vendor_id: batchVendorId,
            endpoints: '',
            name_rule: 0,
            status: 1,
            sync_official: 1,
          },
          { skipErrorHandler: true },
        ),
      );

      const settled = await Promise.allSettled(queue);
      let successCount = 0;
      let failCount = 0;

      settled.forEach((item) => {
        if (item.status === 'fulfilled' && item.value?.data?.success) {
          successCount += 1;
        } else {
          failCount += 1;
        }
      });

      if (successCount > 0) {
        showSuccess(t('已批量配置 {{count}} 个模型', { count: successCount }));
        setBatchVisible(false);
        await fetchMissing();
      }
      if (failCount > 0) {
        showError(t('有 {{count}} 个模型配置失败', { count: failCount }));
      }
    } catch (_) {
      showError(t('批量配置失败'));
    }
    setBatchSubmitting(false);
  };

  const columns = [
    {
      title: t('模型名称'),
      dataIndex: 'model',
      render: (text) => (
        <div className='flex items-center'>
          <Typography.Text strong>{text}</Typography.Text>
        </div>
      ),
    },
    {
      title: '',
      dataIndex: 'operate',
      fixed: 'right',
      width: 120,
      render: (text, record) => (
        <Button
          type='primary'
          size='small'
          onClick={() => onConfigureModel(record.model)}
        >
          {t('配置')}
        </Button>
      ),
    },
  ];

  return (
    <>
      <Modal
        title={
          <div className='flex flex-col gap-2 w-full'>
            <div className='flex items-center gap-2'>
              <Typography.Text
                strong
                className='!text-[var(--semi-color-text-0)] !text-base'
              >
                {t('未配置的模型列表')}
              </Typography.Text>
              <Typography.Text type='tertiary' size='small'>
                {t('共')} {missingModels.length} {t('个未配置模型')}
              </Typography.Text>
            </div>
          </div>
        }
        visible={visible}
        onCancel={onClose}
        footer={null}
        size={isMobile ? 'full-width' : 'medium'}
        className='!rounded-lg'
      >
        <Spin spinning={loading}>
          {missingModels.length === 0 && !loading ? (
            <Empty
              image={
                <IllustrationNoResult style={{ width: 150, height: 150 }} />
              }
              darkModeImage={
                <IllustrationNoResultDark style={{ width: 150, height: 150 }} />
              }
              description={t('暂无缺失模型')}
              style={{ padding: 30 }}
            />
          ) : (
            <div className='missing-models-content'>
              <div className='flex flex-wrap items-center justify-end gap-2 w-full mb-4'>
                <Input
                  placeholder={t('搜索模型...')}
                  value={searchKeyword}
                  onChange={(v) => {
                    setSearchKeyword(v);
                    setCurrentPage(1);
                  }}
                  className='!w-full sm:!flex-1'
                  prefix={<IconSearch />}
                  showClear
                />
                <Space>
                  <Button
                    size='small'
                    type='secondary'
                    disabled={filteredModels.length === 0}
                    onClick={handleSelectFiltered}
                  >
                    {isFilteredAllSelected
                      ? t('取消全选筛选结果')
                      : t('全选筛选结果')}
                  </Button>
                  <Button
                    size='small'
                    type='primary'
                    disabled={selectedRowKeys.length === 0}
                    onClick={() => setBatchVisible(true)}
                  >
                    {t('批量配置')} ({selectedRowKeys.length})
                  </Button>
                </Space>
              </div>

              {filteredModels.length > 0 ? (
                <Table
                  columns={columns}
                  dataSource={dataSource}
                  rowKey='key'
                  rowSelection={{
                    selectedRowKeys,
                    onChange: (keys) => setSelectedRowKeys(keys),
                  }}
                  pagination={{
                    currentPage: currentPage,
                    pageSize: MODEL_TABLE_PAGE_SIZE,
                    total: filteredModels.length,
                    showSizeChanger: false,
                    onPageChange: (page) => setCurrentPage(page),
                  }}
                />
              ) : (
                <Empty
                  image={
                    <IllustrationNoResult style={{ width: 100, height: 100 }} />
                  }
                  darkModeImage={
                    <IllustrationNoResultDark
                      style={{ width: 100, height: 100 }}
                    />
                  }
                  description={
                    searchKeyword ? t('未找到匹配的模型') : t('暂无缺失模型')
                  }
                  style={{ padding: 20 }}
                />
              )}
            </div>
          )}
        </Spin>
      </Modal>

      <Modal
        title={t('批量配置模型')}
        visible={batchVisible}
        onCancel={() => setBatchVisible(false)}
        onOk={handleBatchConfigure}
        confirmLoading={batchSubmitting}
        okText={t('确定')}
        cancelText={t('取消')}
        okButtonProps={{ disabled: selectedRowKeys.length === 0 || !batchVendorId }}
        size={isMobile ? 'full-width' : 'medium'}
      >
        <Space vertical align='start' style={{ width: '100%' }}>
          <Typography.Text>
            {t('已选择 {{count}} 个模型', { count: selectedRowKeys.length })}
          </Typography.Text>
          <Input
            placeholder={t('搜索供应商...')}
            value={vendorSearchKeyword}
            onChange={(v) => setVendorSearchKeyword(v)}
            prefix={<IconSearch />}
            showClear
            style={{ width: '100%' }}
          />
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: 8,
              width: '100%',
              maxHeight: 320,
              overflowY: 'auto',
              padding: 4,
            }}
          >
            {filteredVendors.map((vendor) => (
              <div
                key={vendor.id}
                onClick={() => setBatchVendorId(vendor.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  padding: '12px 8px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  border: batchVendorId === vendor.id
                    ? '2px solid var(--semi-color-primary)'
                    : '1px solid var(--semi-color-border)',
                  backgroundColor: batchVendorId === vendor.id
                    ? 'var(--semi-color-primary-light-default)'
                    : 'var(--semi-color-bg-2)',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {getLobeHubIcon(vendor.icon || 'Layers', 32)}
                </div>
                <Typography.Text
                  size='small'
                  ellipsis={{ showTooltip: true }}
                  style={{
                    maxWidth: '100%',
                    textAlign: 'center',
                    fontWeight: batchVendorId === vendor.id ? 600 : 400,
                  }}
                >
                  {vendor.name}
                </Typography.Text>
              </div>
            ))}
            {filteredVendors.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 20 }}>
                <Typography.Text type='tertiary'>
                  {vendorSearchKeyword ? t('未找到匹配的供应商') : t('暂无供应商')}
                </Typography.Text>
              </div>
            )}
          </div>
        </Space>
      </Modal>
    </>
  );
};

export default MissingModelsModal;
