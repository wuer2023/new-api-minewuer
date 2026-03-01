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

import React, { useEffect, useState, useRef } from 'react';
import {
  Button,
  Col,
  Form,
  Row,
  Spin,
  Select,
  Space,
  Typography,
  InputNumber,
} from '@douyinfe/semi-ui';
import {
  compareObjects,
  API,
  showError,
  showSuccess,
  showWarning,
  verifyJSON,
} from '../../../helpers';
import { useTranslation } from 'react-i18next';

export default function RequestRateLimit(props) {
  const { t } = useTranslation();

  const [loading, setLoading] = useState(false);
  const [channelOptions, setChannelOptions] = useState([]);
  const [modelOptions, setModelOptions] = useState([]);
  const [groupOptions, setGroupOptions] = useState([]);
  const [selectedChannels, setSelectedChannels] = useState([]);
  const [selectedModels, setSelectedModels] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [channelRateLimitMap, setChannelRateLimitMap] = useState({});
  const [modelRateLimitMap, setModelRateLimitMap] = useState({});
  const [groupRateLimitMap, setGroupRateLimitMap] = useState({});

  const [inputs, setInputs] = useState({
    ModelRequestRateLimitEnabled: false,
    ModelRequestRateLimitCount: -1,
    ModelRequestRateLimitSuccessCount: 1000,
    ModelRequestRateLimitDurationMinutes: 1,
    ModelRequestRateLimitGroup: '',
    ModelRequestRateLimitChannel: '',
    ModelRequestRateLimitModel: '',
  });
  const refForm = useRef();
  const [inputsRow, setInputsRow] = useState(inputs);

  function parseRateLimitMap(raw) {
    if (!raw) return {};
    let parsed = raw;
    if (typeof raw === 'string') {
      try {
        parsed = JSON.parse(raw);
      } catch {
        return {};
      }
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    const normalized = {};
    Object.entries(parsed).forEach(([key, value]) => {
      if (!Array.isArray(value) || value.length < 2) return;
      const total = Number(value[0]);
      const success = Number(value[1]);
      if (!Number.isFinite(total) || !Number.isFinite(success)) return;
      normalized[String(key)] = [
        Math.max(0, Math.floor(total)),
        Math.max(1, Math.floor(success)),
      ];
    });
    return normalized;
  }

  function mapToJSONString(map) {
    return JSON.stringify(map, null, 2);
  }

  function syncGroupMap(nextMap) {
    const normalized = nextMap || {};
    setGroupRateLimitMap(normalized);
    setInputs((prev) => ({
      ...prev,
      ModelRequestRateLimitGroup: mapToJSONString(normalized),
    }));
  }

  function syncChannelMap(nextMap) {
    const normalized = nextMap || {};
    setChannelRateLimitMap(normalized);
    setInputs((prev) => ({
      ...prev,
      ModelRequestRateLimitChannel: mapToJSONString(normalized),
    }));
  }

  function syncModelMap(nextMap) {
    const normalized = nextMap || {};
    setModelRateLimitMap(normalized);
    setInputs((prev) => ({
      ...prev,
      ModelRequestRateLimitModel: mapToJSONString(normalized),
    }));
  }

  function onSubmit() {
    const updateArray = compareObjects(inputs, inputsRow);
    if (!updateArray.length) return showWarning(t('你似乎并没有修改什么'));
    const requestQueue = updateArray.map((item) => {
      let value = '';
      if (typeof inputs[item.key] === 'boolean') {
        value = String(inputs[item.key]);
      } else {
        value = inputs[item.key];
      }
      return API.put('/api/option/', {
        key: item.key,
        value,
      });
    });
    setLoading(true);
    Promise.all(requestQueue)
      .then((res) => {
        if (requestQueue.length === 1) {
          if (res.includes(undefined)) return;
        } else if (requestQueue.length > 1) {
          if (res.includes(undefined))
            return showError(t('部分保存失败，请重试'));
        }

        for (let i = 0; i < res.length; i++) {
          if (!res[i].data.success) {
            return showError(res[i].data.message);
          }
        }

        showSuccess(t('保存成功'));
        props.refresh();
      })
      .catch(() => {
        showError(t('保存失败，请重试'));
      })
      .finally(() => {
        setLoading(false);
      });
  }

  async function loadSelectOptions() {
    try {
      const [groupRes, channelRes, modelRes] = await Promise.all([
        API.get('/api/group/'),
        API.get('/api/channel/?p=0&page_size=1000'),
        API.get('/api/models/?p=0&page_size=1000'),
      ]);

      const groupData = groupRes?.data?.data;
      const groupItems = Array.isArray(groupData) ? groupData : [];
      setGroupOptions(
        groupItems
          .map((group) => String(group ?? '').trim())
          .filter(Boolean)
          .map((group) => ({ label: group, value: group })),
      );

      const channelData = channelRes?.data?.data;
      const channelItems = Array.isArray(channelData)
        ? channelData
        : Array.isArray(channelData?.items)
          ? channelData.items
          : [];
      const nextChannelOptions = channelItems
        .map((item) => {
          const id = String(item?.id ?? '').trim();
          if (!id) return null;
          const name = String(item?.name ?? '').trim();
          return {
            label: name ? `#${id} ${name}` : `#${id}`,
            value: id,
          };
        })
        .filter(Boolean);
      setChannelOptions(nextChannelOptions);

      const modelData = modelRes?.data?.data;
      const modelItems = Array.isArray(modelData)
        ? modelData
        : Array.isArray(modelData?.items)
          ? modelData.items
          : [];
      const nextModelOptions = modelItems
        .map((item) => String(item?.model_name ?? '').trim())
        .filter(Boolean)
        .map((name) => ({ label: name, value: name }));
      setModelOptions(nextModelOptions);
    } catch {
      showWarning(t('加载分组、渠道或模型列表失败，可继续手动填写 JSON'));
    }
  }

  useEffect(() => {
    loadSelectOptions();
  }, []);

  useEffect(() => {
    const currentInputs = {};
    for (let key in props.options) {
      if (Object.keys(inputs).includes(key)) {
        currentInputs[key] = props.options[key];
      }
    }

    const groupMap = parseRateLimitMap(
      currentInputs.ModelRequestRateLimitGroup,
    );
    const channelMap = parseRateLimitMap(
      currentInputs.ModelRequestRateLimitChannel,
    );
    const modelMap = parseRateLimitMap(
      currentInputs.ModelRequestRateLimitModel,
    );

    const mergedInputs = {
      ...currentInputs,
      ModelRequestRateLimitGroup: mapToJSONString(groupMap),
      ModelRequestRateLimitChannel: mapToJSONString(channelMap),
      ModelRequestRateLimitModel: mapToJSONString(modelMap),
    };

    setInputs(mergedInputs);
    setInputsRow(structuredClone(mergedInputs));
    setGroupRateLimitMap(groupMap);
    setChannelRateLimitMap(channelMap);
    setModelRateLimitMap(modelMap);
    setSelectedGroups(Object.keys(groupMap));
    setSelectedChannels(Object.keys(channelMap));
    setSelectedModels(Object.keys(modelMap));
    refForm.current.setValues(mergedInputs);
  }, [props.options]);

  return (
    <>
      <Spin spinning={loading}>
        <Form
          values={inputs}
          getFormApi={(formAPI) => (refForm.current = formAPI)}
          style={{ marginBottom: 15 }}
        >
          <Form.Section text={t('模型请求速率限制')}>
            <Row gutter={16}>
              <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                <Form.Switch
                  field={'ModelRequestRateLimitEnabled'}
                  label={t('启用用户模型请求速率限制（可能会影响高并发性能）')}
                  size='default'
                  checkedText='｜'
                  uncheckedText='〇'
                  onChange={(value) => {
                    setInputs({
                      ...inputs,
                      ModelRequestRateLimitEnabled: value,
                    });
                  }}
                />
              </Col>
            </Row>
            <Row>
              <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                <Form.InputNumber
                  label={t('限制周期')}
                  step={1}
                  min={0}
                  suffix={t('分钟')}
                  extraText={t('频率限制的周期（分钟）')}
                  field={'ModelRequestRateLimitDurationMinutes'}
                  onChange={(value) =>
                    setInputs({
                      ...inputs,
                      ModelRequestRateLimitDurationMinutes: String(value),
                    })
                  }
                />
              </Col>
            </Row>
            <Row>
              <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                <Form.InputNumber
                  label={t('用户每周期最多请求次数')}
                  step={1}
                  min={0}
                  max={100000000}
                  suffix={t('次')}
                  extraText={t('包括失败请求的次数，0代表不限制')}
                  field={'ModelRequestRateLimitCount'}
                  onChange={(value) =>
                    setInputs({
                      ...inputs,
                      ModelRequestRateLimitCount: String(value),
                    })
                  }
                />
              </Col>
              <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                <Form.InputNumber
                  label={t('用户每周期最多请求完成次数')}
                  step={1}
                  min={1}
                  max={100000000}
                  suffix={t('次')}
                  extraText={t('只包括请求成功的次数')}
                  field={'ModelRequestRateLimitSuccessCount'}
                  onChange={(value) =>
                    setInputs({
                      ...inputs,
                      ModelRequestRateLimitSuccessCount: String(value),
                    })
                  }
                />
              </Col>
            </Row>
            <Row>
              <Col xs={24} sm={24}>
                <Typography.Title heading={6} style={{ marginBottom: 8 }}>
                  {t('分组速率限制（可视化配置）')}
                </Typography.Title>
                <Select
                  multiple
                  filter
                  searchPosition='dropdown'
                  optionList={[
                    ...groupOptions,
                    ...selectedGroups
                      .filter(
                        (group) =>
                          !groupOptions.some(
                            (option) => option.value === group,
                          ),
                      )
                      .map((group) => ({ label: group, value: group })),
                  ]}
                  value={selectedGroups}
                  placeholder={t('选择要单独限速的分组')}
                  style={{ width: '100%', marginBottom: 12 }}
                  onChange={(value) => {
                    const selected = (value || []).map((v) => String(v));
                    setSelectedGroups(selected);
                    const nextMap = {};
                    selected.forEach((group) => {
                      nextMap[group] = groupRateLimitMap[group] || [0, 1000];
                    });
                    syncGroupMap(nextMap);
                  }}
                />

                <Space vertical align='start' style={{ width: '100%' }}>
                  {selectedGroups.map((groupName) => (
                    <Row key={groupName} gutter={12} style={{ width: '100%' }}>
                      <Col xs={24} sm={6}>
                        <Typography.Text>{groupName}</Typography.Text>
                      </Col>
                      <Col xs={12} sm={9}>
                        <InputNumber
                          min={0}
                          max={100000000}
                          value={groupRateLimitMap[groupName]?.[0] ?? 0}
                          suffix={t('次')}
                          style={{ width: '100%' }}
                          onChange={(value) => {
                            const total = Number(value);
                            const safeTotal = Number.isFinite(total)
                              ? Math.max(0, Math.floor(total))
                              : 0;
                            const success =
                              groupRateLimitMap[groupName]?.[1] ?? 1000;
                            const nextMap = {
                              ...groupRateLimitMap,
                              [groupName]: [safeTotal, success],
                            };
                            syncGroupMap(nextMap);
                          }}
                        />
                      </Col>
                      <Col xs={12} sm={9}>
                        <InputNumber
                          min={1}
                          max={100000000}
                          value={groupRateLimitMap[groupName]?.[1] ?? 1000}
                          suffix={t('成功次')}
                          style={{ width: '100%' }}
                          onChange={(value) => {
                            const success = Number(value);
                            const safeSuccess = Number.isFinite(success)
                              ? Math.max(1, Math.floor(success))
                              : 1;
                            const total =
                              groupRateLimitMap[groupName]?.[0] ?? 0;
                            const nextMap = {
                              ...groupRateLimitMap,
                              [groupName]: [total, safeSuccess],
                            };
                            syncGroupMap(nextMap);
                          }}
                        />
                      </Col>
                    </Row>
                  ))}
                </Space>

                <Form.TextArea
                  label={t('分组速率限制 JSON')}
                  placeholder={t(
                    '{\n  "default": [200, 100],\n  "vip": [0, 1000]\n}',
                  )}
                  field={'ModelRequestRateLimitGroup'}
                  autosize={{ minRows: 5, maxRows: 15 }}
                  trigger='blur'
                  stopValidateWithError
                  rules={[
                    {
                      validator: (rule, value) => verifyJSON(value),
                      message: t('不是合法的 JSON 字符串'),
                    },
                  ]}
                  extraText={
                    <div>
                      <p>{t('说明：')}</p>
                      <ul>
                        <li>
                          {t(
                            '使用 JSON 对象格式，格式为：{"组名": [最多请求次数, 最多请求完成次数]}',
                          )}
                        </li>
                        <li>
                          {t(
                            '示例：{"default": [200, 100], "vip": [0, 1000]}。',
                          )}
                        </li>
                        <li>
                          {t(
                            '[最多请求次数]必须大于等于0，[最多请求完成次数]必须大于等于1。',
                          )}
                        </li>
                        <li>
                          {t(
                            '[最多请求次数]和[最多请求完成次数]的最大值为2147483647。',
                          )}
                        </li>
                        <li>{t('分组速率配置优先级高于全局速率限制。')}</li>
                        <li>{t('限制周期统一使用上方配置的“限制周期”值。')}</li>
                      </ul>
                    </div>
                  }
                  onBlur={() => {
                    const parsed = parseRateLimitMap(
                      inputs.ModelRequestRateLimitGroup,
                    );
                    setSelectedGroups(Object.keys(parsed));
                    setGroupRateLimitMap(parsed);
                    setInputs((prev) => ({
                      ...prev,
                      ModelRequestRateLimitGroup: mapToJSONString(parsed),
                    }));
                  }}
                  onChange={(value) => {
                    setInputs({ ...inputs, ModelRequestRateLimitGroup: value });
                  }}
                />
              </Col>
            </Row>

            <Row>
              <Col xs={24} sm={24}>
                <Typography.Title heading={6} style={{ marginBottom: 8 }}>
                  {t('渠道速率限制（可视化配置）')}
                </Typography.Title>
                <Select
                  multiple
                  filter
                  searchPosition='dropdown'
                  optionList={channelOptions}
                  value={selectedChannels}
                  placeholder={t('选择要单独限速的渠道')}
                  style={{ width: '100%', marginBottom: 12 }}
                  onChange={(value) => {
                    const selected = (value || []).map((v) => String(v));
                    setSelectedChannels(selected);
                    const nextMap = {};
                    selected.forEach((id) => {
                      nextMap[id] = channelRateLimitMap[id] || [0, 1000];
                    });
                    syncChannelMap(nextMap);
                  }}
                />

                <Space vertical align='start' style={{ width: '100%' }}>
                  {selectedChannels.map((channelId) => (
                    <Row key={channelId} gutter={12} style={{ width: '100%' }}>
                      <Col xs={24} sm={6}>
                        <Typography.Text>{`#${channelId}`}</Typography.Text>
                      </Col>
                      <Col xs={12} sm={9}>
                        <InputNumber
                          min={0}
                          max={100000000}
                          value={channelRateLimitMap[channelId]?.[0] ?? 0}
                          suffix={t('次')}
                          style={{ width: '100%' }}
                          onChange={(value) => {
                            const total = Number(value);
                            const safeTotal = Number.isFinite(total)
                              ? Math.max(0, Math.floor(total))
                              : 0;
                            const success =
                              channelRateLimitMap[channelId]?.[1] ?? 1000;
                            const nextMap = {
                              ...channelRateLimitMap,
                              [channelId]: [safeTotal, success],
                            };
                            syncChannelMap(nextMap);
                          }}
                        />
                      </Col>
                      <Col xs={12} sm={9}>
                        <InputNumber
                          min={1}
                          max={100000000}
                          value={channelRateLimitMap[channelId]?.[1] ?? 1000}
                          suffix={t('成功次')}
                          style={{ width: '100%' }}
                          onChange={(value) => {
                            const success = Number(value);
                            const safeSuccess = Number.isFinite(success)
                              ? Math.max(1, Math.floor(success))
                              : 1;
                            const total =
                              channelRateLimitMap[channelId]?.[0] ?? 0;
                            const nextMap = {
                              ...channelRateLimitMap,
                              [channelId]: [total, safeSuccess],
                            };
                            syncChannelMap(nextMap);
                          }}
                        />
                      </Col>
                    </Row>
                  ))}
                </Space>

                <Form.TextArea
                  label={t('渠道速率限制 JSON')}
                  placeholder={t('{\n  "1": [100, 80],\n  "2": [0, 1000]\n}')}
                  field={'ModelRequestRateLimitChannel'}
                  autosize={{ minRows: 4, maxRows: 12 }}
                  trigger='blur'
                  stopValidateWithError
                  rules={[
                    {
                      validator: (rule, value) => verifyJSON(value),
                      message: t('不是合法的 JSON 字符串'),
                    },
                  ]}
                  onBlur={() => {
                    const parsed = parseRateLimitMap(
                      inputs.ModelRequestRateLimitChannel,
                    );
                    setSelectedChannels(Object.keys(parsed));
                    setChannelRateLimitMap(parsed);
                    setInputs((prev) => ({
                      ...prev,
                      ModelRequestRateLimitChannel: mapToJSONString(parsed),
                    }));
                  }}
                  onChange={(value) => {
                    setInputs({
                      ...inputs,
                      ModelRequestRateLimitChannel: value,
                    });
                  }}
                />
              </Col>
            </Row>

            <Row>
              <Col xs={24} sm={24}>
                <Typography.Title heading={6} style={{ marginBottom: 8 }}>
                  {t('模型速率限制（可视化配置）')}
                </Typography.Title>
                <Select
                  multiple
                  filter
                  searchPosition='dropdown'
                  optionList={modelOptions}
                  value={selectedModels}
                  placeholder={t('选择要单独限速的模型')}
                  style={{ width: '100%', marginBottom: 12 }}
                  onChange={(value) => {
                    const selected = (value || []).map((v) => String(v));
                    setSelectedModels(selected);
                    const nextMap = {};
                    selected.forEach((name) => {
                      nextMap[name] = modelRateLimitMap[name] || [0, 1000];
                    });
                    syncModelMap(nextMap);
                  }}
                />

                <Space vertical align='start' style={{ width: '100%' }}>
                  {selectedModels.map((modelName) => (
                    <Row key={modelName} gutter={12} style={{ width: '100%' }}>
                      <Col xs={24} sm={6}>
                        <Typography.Text>{modelName}</Typography.Text>
                      </Col>
                      <Col xs={12} sm={9}>
                        <InputNumber
                          min={0}
                          max={100000000}
                          value={modelRateLimitMap[modelName]?.[0] ?? 0}
                          suffix={t('次')}
                          style={{ width: '100%' }}
                          onChange={(value) => {
                            const total = Number(value);
                            const safeTotal = Number.isFinite(total)
                              ? Math.max(0, Math.floor(total))
                              : 0;
                            const success =
                              modelRateLimitMap[modelName]?.[1] ?? 1000;
                            const nextMap = {
                              ...modelRateLimitMap,
                              [modelName]: [safeTotal, success],
                            };
                            syncModelMap(nextMap);
                          }}
                        />
                      </Col>
                      <Col xs={12} sm={9}>
                        <InputNumber
                          min={1}
                          max={100000000}
                          value={modelRateLimitMap[modelName]?.[1] ?? 1000}
                          suffix={t('成功次')}
                          style={{ width: '100%' }}
                          onChange={(value) => {
                            const success = Number(value);
                            const safeSuccess = Number.isFinite(success)
                              ? Math.max(1, Math.floor(success))
                              : 1;
                            const total =
                              modelRateLimitMap[modelName]?.[0] ?? 0;
                            const nextMap = {
                              ...modelRateLimitMap,
                              [modelName]: [total, safeSuccess],
                            };
                            syncModelMap(nextMap);
                          }}
                        />
                      </Col>
                    </Row>
                  ))}
                </Space>

                <Form.TextArea
                  label={t('模型速率限制 JSON')}
                  placeholder={t(
                    '{\n  "gpt-4o": [200, 100],\n  "claude-3-5-sonnet": [0, 1000]\n}',
                  )}
                  field={'ModelRequestRateLimitModel'}
                  autosize={{ minRows: 4, maxRows: 12 }}
                  trigger='blur'
                  stopValidateWithError
                  rules={[
                    {
                      validator: (rule, value) => verifyJSON(value),
                      message: t('不是合法的 JSON 字符串'),
                    },
                  ]}
                  onBlur={() => {
                    const parsed = parseRateLimitMap(
                      inputs.ModelRequestRateLimitModel,
                    );
                    setSelectedModels(Object.keys(parsed));
                    setModelRateLimitMap(parsed);
                    setInputs((prev) => ({
                      ...prev,
                      ModelRequestRateLimitModel: mapToJSONString(parsed),
                    }));
                  }}
                  onChange={(value) => {
                    setInputs({ ...inputs, ModelRequestRateLimitModel: value });
                  }}
                />
              </Col>
            </Row>

            <Row>
              <Button size='default' onClick={onSubmit}>
                {t('保存模型速率限制')}
              </Button>
            </Row>
          </Form.Section>
        </Form>
      </Spin>
    </>
  );
}
