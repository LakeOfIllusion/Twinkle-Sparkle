import { useState, useEffect } from 'react'
import { useToast } from '../Toast/Toast'
import styles from './SettingsWindow.module.css'

import keyIcon from '../../assets/settings/api_key_icon.svg'
import inputBox from '../../assets/settings/api_key_input_box.svg'
import folderIcon from '../../assets/settings/file_store_icon.svg'
import pathBox from '../../assets/settings/file_storage_path_box.svg'
import flashSvg from '../../assets/settings/flash.svg'
import flashSelectedSvg from '../../assets/settings/flash_selected.svg'
import proSvg from '../../assets/settings/pro.svg'
import proSelectedSvg from '../../assets/settings/pro_selected.svg'

interface Props {
  onClose: () => void
}

function SettingsWindow({ onClose }: Props) {
  const toast = useToast()
  const [apiKey, setApiKey] = useState('')
  const [storagePath, setStoragePath] = useState('')
  const [model, setModel] = useState<'flash' | 'pro'>('flash')

  useEffect(() => {
    window.electronAPI.getSettings().then(s => {
      setApiKey(s.apiKey)
      setStoragePath(s.storagePath)
      setModel(s.model)
    })
  }, [])

  const handleSave = () => {
    window.electronAPI.setSettings({ apiKey, storagePath, model }).then(() => {
      toast.show('设置已保存', 'success')
      onClose()
    })
  }

  const handleBrowse = async () => {
    const result = await window.electronAPI.selectFolder()
    if (result) setStoragePath(result)
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.window} onClick={e => e.stopPropagation()}>
        {/* API Key */}
        <div className={styles.section}>
          <div className={styles.icon}>
            <img src={keyIcon} alt="API Key" />
          </div>
          <div className={styles.inputWrapper}>
            <img className={styles.inputBg} src={inputBox} alt="" />
            <input
              className={styles.field}
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="输入 API Key"
            />
          </div>
        </div>

        {/* 文件存储路径 */}
        <div className={styles.section}>
          <div className={styles.icon}>
            <img src={folderIcon} alt="文件存储" />
          </div>
          <div className={styles.inputWrapper}>
            <img className={styles.inputBg} src={pathBox} alt="" />
            <input
              className={styles.field}
              value={storagePath}
              onChange={e => setStoragePath(e.target.value)}
              placeholder="选择文献存储路径"
              readOnly
            />
            <button className={styles.pathBtn} onClick={handleBrowse}>…</button>
          </div>
        </div>

        {/* 模型选择 */}
        <div className={styles.modelRow}>
          <button className={styles.modelBtn} onClick={() => setModel('flash')}>
            <img src={model === 'flash' ? flashSelectedSvg : flashSvg} alt="DeepSeek Flash" />
          </button>
          <button className={styles.modelBtn} onClick={() => setModel('pro')}>
            <img src={model === 'pro' ? proSelectedSvg : proSvg} alt="DeepSeek Pro" />
          </button>
        </div>

        {/* 按钮 */}
        <div className={styles.footer}>
          <button className={`${styles.btn} ${styles.cancelBtn}`} onClick={onClose}>取消</button>
          <button className={`${styles.btn} ${styles.saveBtn}`} onClick={handleSave}>保存</button>
        </div>
      </div>
    </div>
  )
}

export default SettingsWindow
