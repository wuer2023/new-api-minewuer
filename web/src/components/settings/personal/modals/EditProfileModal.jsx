import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Avatar, Button, Input, Modal, Typography } from '@douyinfe/semi-ui';
import { IconDelete, IconUpload, IconUser } from '@douyinfe/semi-icons';
import {
  showError,
  stringToColor,
  timestamp2string,
} from '../../../../helpers';

const AVATAR_CANVAS_SIZE = 256;
const AVATAR_OUTPUT_QUALITY = 0.82;

const EditProfileModal = ({
  t,
  visible,
  onCancel,
  onSubmit,
  user,
  saving,
}) => {
  const [displayName, setDisplayName] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [clearAvatar, setClearAvatar] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (visible) {
      setDisplayName(user?.display_name || '');
      setAvatarFile(null);
      setClearAvatar(false);
    }
  }, [visible, user?.display_name, user?.avatar_url]);

  const previewUrl = useMemo(() => {
    if (clearAvatar) {
      return '';
    }
    if (avatarFile?.fileInstance) {
      return URL.createObjectURL(avatarFile.fileInstance);
    }
    return user?.avatar_url || '';
  }, [avatarFile, clearAvatar, user?.avatar_url]);

  useEffect(() => {
    return () => {
      if (previewUrl && avatarFile?.fileInstance) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl, avatarFile]);

  const getPreviewText = () => {
    const source = displayName || user?.username || 'NA';
    return source.slice(0, 2).toUpperCase();
  };

  const createProcessedAvatarFile = async (file) => {
    const imageBitmap = await createImageBitmap(file);
    const cropSize = Math.min(imageBitmap.width, imageBitmap.height);
    const offsetX = (imageBitmap.width - cropSize) / 2;
    const offsetY = (imageBitmap.height - cropSize) / 2;
    const canvas = document.createElement('canvas');
    canvas.width = AVATAR_CANVAS_SIZE;
    canvas.height = AVATAR_CANVAS_SIZE;
    const context = canvas.getContext('2d');
    context.drawImage(
      imageBitmap,
      offsetX,
      offsetY,
      cropSize,
      cropSize,
      0,
      0,
      AVATAR_CANVAS_SIZE,
      AVATAR_CANVAS_SIZE,
    );
    imageBitmap.close();
    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', AVATAR_OUTPUT_QUALITY);
    });
    if (!blob) {
      throw new Error(t('头像处理失败'));
    }
    const nextFileName = `${(file.name || 'avatar').replace(/\.[^.]+$/, '')}.jpg`;
    return new File([blob], nextFileName, { type: 'image/jpeg' });
  };

  const handleSubmit = async () => {
    if (!displayName.trim()) {
      showError(t('请输入昵称'));
      return;
    }
    if (avatarFile?.fileInstance && avatarFile.fileInstance.size > 2 * 1024 * 1024) {
      showError(t('头像文件不能超过 2MB'));
      return;
    }
    let processedAvatarFile = avatarFile?.fileInstance || null;
    if (processedAvatarFile) {
      try {
        processedAvatarFile = await createProcessedAvatarFile(processedAvatarFile);
      } catch (error) {
        showError(error.message || t('头像处理失败'));
        return;
      }
    }
    await onSubmit({
      display_name: displayName.trim(),
      avatar_file: processedAvatarFile,
      clear_avatar: clearAvatar,
    });
  };

  const getCountdownText = (nextUpdateAt) => {
    const remainingMs = Math.max(nextUpdateAt * 1000 - Date.now(), 0);
    const remainingDays = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
    const remainingHours = Math.floor(
      (remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000),
    );
    return remainingMs > 0
      ? `${remainingDays}${t('天')}${remainingHours}${t('小时')}`
      : t('现在可修改');
  };

  const nicknameNextUpdateAt = user?.display_name_updated_at
    ? user.display_name_updated_at + 7 * 24 * 60 * 60
    : 0;
  const avatarNextUpdateAt = user?.avatar_updated_at
    ? user.avatar_updated_at + 7 * 24 * 60 * 60
    : 0;

  return (
    <Modal
      title={t('编辑个人资料')}
      visible={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      okText={t('保存')}
      cancelText={t('取消')}
      confirmLoading={saving}
      centered
      size='small'
    >
      <div className='space-y-4 py-2'>
        <div className='flex items-center gap-3'>
          {previewUrl ? (
            <Avatar size='large' src={previewUrl}>
              {getPreviewText()}
            </Avatar>
          ) : (
            <Avatar
              size='large'
              color={stringToColor(user?.username || displayName || 'NA')}
            >
              {getPreviewText()}
            </Avatar>
          )}
          <div>
            <Typography.Text strong>{user?.username}</Typography.Text>
            <Typography.Paragraph className='!mb-0' type='tertiary'>
              {t('昵称和头像分别按各自 7 天限制计算')}
            </Typography.Paragraph>
            {nicknameNextUpdateAt > 0 && (
              <Typography.Paragraph className='!mb-0' type='tertiary'>
                {t('昵称剩余时间')}：{getCountdownText(nicknameNextUpdateAt)}
              </Typography.Paragraph>
            )}
            {nicknameNextUpdateAt > 0 && (
              <Typography.Paragraph className='!mb-0' type='tertiary'>
                {t('昵称下次可修改时间')}：{timestamp2string(nicknameNextUpdateAt)}
              </Typography.Paragraph>
            )}
            {avatarNextUpdateAt > 0 && (
              <Typography.Paragraph className='!mb-0' type='tertiary'>
                {t('头像剩余时间')}：{getCountdownText(avatarNextUpdateAt)}
              </Typography.Paragraph>
            )}
            {avatarNextUpdateAt > 0 && (
              <Typography.Paragraph className='!mb-0' type='tertiary'>
                {t('头像下次可修改时间')}：{timestamp2string(avatarNextUpdateAt)}
              </Typography.Paragraph>
            )}
          </div>
        </div>
        <div>
          <Typography.Text strong className='block mb-2'>
            {t('昵称')}
          </Typography.Text>
          <Input
            prefix={<IconUser />}
            value={displayName}
            onChange={setDisplayName}
            placeholder={t('请输入昵称')}
            maxLength={20}
            showClear
            size='large'
          />
        </div>
        <div>
          <Typography.Text strong className='block mb-2'>
            {t('头像文件')}
          </Typography.Text>
          <div className='flex gap-2 items-center'>
            <Input
              prefix={<IconUpload />}
              value={avatarFile?.name || ''}
              placeholder={t('请选择头像文件，支持 JPG、PNG、GIF、WEBP')}
              readonly
              size='large'
            />
            <Button
              type='primary'
              theme='outline'
              onClick={() => fileInputRef.current?.click()}
            >
              {t('选择文件')}
            </Button>
            <input
              ref={fileInputRef}
              type='file'
              accept='image/png,image/jpeg,image/gif,image/webp'
              style={{ display: 'none' }}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) {
                  return;
                }
                setAvatarFile({
                  name: file.name,
                  fileInstance: file,
                });
                setClearAvatar(false);
                event.target.value = '';
              }}
            />
          </div>
        </div>
        <Button
          icon={<IconDelete />}
          theme='light'
          type='tertiary'
          block
          onClick={() => {
            setAvatarFile(null);
            setClearAvatar(true);
          }}
        >
          {t('清除头像，恢复默认字母头像')}
        </Button>
      </div>
    </Modal>
  );
};

export default EditProfileModal;
