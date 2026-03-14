import React, { useEffect, useState, useRef } from 'react';
import { Button, Col, Form, Row, Spin, Card } from '@douyinfe/semi-ui';
import {
  compareObjects,
  API,
  showError,
  showSuccess,
  showWarning,
} from '../../helpers';
import { useTranslation } from 'react-i18next';

export default function MonitorSetting() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [inputs, setInputs] = useState({
    'monitor_setting.channel_health_check_enabled': false,
    'monitor_setting.channel_health_check_interval': 900,
    'monitor_setting.channel_health_check_model': '',
  });
  const [modelOptions, setModelOptions] = useState([]);
  const refForm = useRef();
  const [inputsRow, setInputsRow] = useState(inputs);

  async function getOptions() {
    try {
      const res = await API.get('/api/option/');
      const { success, message, data } = res.data;
      if (success) {
        let newInputs = {};
        data.forEach((item) => {
          if (
            item.key === 'monitor_setting.channel_health_check_enabled' ||
            item.key === 'monitor_setting.channel_health_check_interval' ||
            item.key === 'monitor_setting.channel_health_check_model'
          ) {
            if (item.key === 'monitor_setting.channel_health_check_enabled') {
              newInputs[item.key] = item.value === 'true';
            } else if (item.key === 'monitor_setting.channel_health_check_interval') {
              newInputs[item.key] = parseInt(item.value);
            } else if (item.key === 'monitor_setting.channel_health_check_model') {
              newInputs[item.key] = item.value ? item.value.split(',') : [];
            } else {
              newInputs[item.key] = item.value;
            }
          }
        });
        
        // Merge with defaults if missing
        newInputs = { ...inputs, ...newInputs };
        
        setInputs(newInputs);
        setInputsRow(structuredClone(newInputs));
        refForm.current.setValues(newInputs);
      } else {
        showError(message);
      }
    } catch (error) {
      showError(t('获取设置失败'));
    }
  }

  async function getModels() {
    try {
      const res = await API.get('/api/channel/models_enabled');
      const { success, data } = res.data;
      if (success) {
        const options = data.map((model) => ({
          label: model,
          value: model,
        }));
        setModelOptions(options);
      }
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    getOptions();
    getModels();
  }, []);

  async function onSubmit() {
    const updateArray = compareObjects(inputs, inputsRow);
    if (!updateArray.length) return showWarning(t('你似乎并没有修改什么'));
    const requestQueue = updateArray.map((item) => {
      let value = '';
      if (typeof inputs[item.key] === 'boolean') {
        value = String(inputs[item.key]);
      } else {
        value = String(inputs[item.key]);
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
        showSuccess(t('保存成功'));
        setInputsRow(structuredClone(inputs));
      })
      .catch(() => {
        showError(t('保存失败，请重试'));
      })
      .finally(() => {
        setLoading(false);
      });
  }

  return (
    <Spin spinning={loading}>
      <Card>
        <Form
          values={inputs}
          getFormApi={(formAPI) => (refForm.current = formAPI)}
          style={{ marginBottom: 15 }}
        >
          <Form.Section text={t('模型可用性检测')}>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Switch
                  field={'monitor_setting.channel_health_check_enabled'}
                  label={t('启用模型可用性检测')}
                  size='default'
                  checkedText='｜'
                  uncheckedText='〇'
                  onChange={(value) => {
                    setInputs({
                      ...inputs,
                      'monitor_setting.channel_health_check_enabled': value,
                    });
                  }}
                />
              </Col>
              <Col span={8}>
                <Form.InputNumber
                  label={t('检测间隔（秒）')}
                  field={'monitor_setting.channel_health_check_interval'}
                  step={1}
                  min={0}
                  onChange={(value) =>
                    setInputs({
                      ...inputs,
                      'monitor_setting.channel_health_check_interval': value,
                    })
                  }
                />
              </Col>
              <Col span={8}>
                <Form.Select
                  label={t('需要检测的模型列表')}
                  field={'monitor_setting.channel_health_check_model'}
                  placeholder={t('请选择要监控的模型')}
                  optionList={modelOptions}
                  multiple
                  filter
                  onChange={(value) =>
                    setInputs({
                      ...inputs,
                      'monitor_setting.channel_health_check_model': value,
                    })
                  }
                />
              </Col>
            </Row>
            <Row>
              <Button size='default' onClick={onSubmit}>
                {t('保存测活设置')}
              </Button>
            </Row>
          </Form.Section>
        </Form>
      </Card>
    </Spin>
  );
}
